// ============================================================
// 数据构建：拉取赛程 -> 统一为 app 数据结构
// 骨架：fixturedownload.com（104场全赛程+淘汰赛占位，国内可达）
// 增强：ESPN 非官方API（实时比分/比赛状态/真实球场，尽力而为）
// ============================================================
const { TEAMS, PLAYERS, venueZh, placeholderZh, resolveTeam, ALIASES } = require('./data.cjs')
const { fetchRatings } = require('./ratings.cjs')

const FD_URL = 'https://fixturedownload.com/feed/json/fifa-world-cup-2026'
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200'

// RoundNumber -> stage（103/104场单独区分季军赛/决赛）
function stageOf(roundNumber, matchNumber) {
  if (roundNumber <= 3) return 'group'
  if (roundNumber === 4) return 'r32'
  if (roundNumber === 5) return 'r16'
  if (roundNumber === 6) return 'qf'
  if (roundNumber === 7) return 'sf'
  return matchNumber === 104 ? 'final' : 'third'
}

function utcMinute(iso) {
  return Math.floor(Date.parse(iso) / 60000)
}

// fixturedownload -> 比赛骨架
function fromFixtureDownload(rows) {
  return rows.map(r => {
    const utc = String(r.DateUtc).replace(' ', 'T').replace(/Z?$/, 'Z')
    const home = resolveTeam(r.HomeTeam)
    const away = resolveTeam(r.AwayTeam)
    const stage = stageOf(r.RoundNumber, r.MatchNumber)
    const v = venueZh(r.Location)
    const finished = r.HomeTeamScore != null && r.AwayTeamScore != null
    return {
      no: r.MatchNumber,
      stage,
      group: stage === 'group' ? (home && TEAMS[home] ? TEAMS[home].group : '') : '',
      round: stage === 'group' ? r.RoundNumber : 0,
      home, away,
      homeP: home ? '' : placeholderZh(r.HomeTeam),
      awayP: away ? '' : placeholderZh(r.AwayTeam),
      hScore: finished ? Number(r.HomeTeamScore) : null,
      aScore: finished ? Number(r.AwayTeamScore) : null,
      status: finished ? 'finished' : 'scheduled',
      utc,
      venue: v.venue, city: v.city
    }
  })
}

// ESPN 增强：实时状态/比分、淘汰赛球队确定后回填、真实球场名
function overlayESPN(matches, espn) {
  if (!espn || !Array.isArray(espn.events)) return 0
  let applied = 0
  const byKey = {}     // "utcMin|CODE1|CODE2"（已确定双方的场次）
  const byTime = {}    // utcMin -> [未完全确定双方的场次]
  matches.forEach(m => {
    const t = utcMinute(m.utc)
    if (m.home && m.away) byKey[t + '|' + [m.home, m.away].sort().join('|')] = m
    else (byTime[t] = byTime[t] || []).push(m)
  })

  espn.events.forEach(ev => {
    try {
      const comp = ev.competitions && ev.competitions[0]
      if (!comp || !Array.isArray(comp.competitors)) return
      const homeC = comp.competitors.find(c => c.homeAway === 'home')
      const awayC = comp.competitors.find(c => c.homeAway === 'away')
      if (!homeC || !awayC) return
      const hCode = resolveTeam(homeC.team && homeC.team.displayName)
      const aCode = resolveTeam(awayC.team && awayC.team.displayName)
      if (!hCode || !aCode) return   // 占位场次（球队未定）跳过

      const t = utcMinute(ev.date)
      let m = byKey[t + '|' + [hCode, aCode].sort().join('|')]
      if (!m) {
        // 骨架中该时间点还挂着占位 -> 淘汰赛球队已确定，回填
        const cands = byTime[t] || []
        if (cands.length === 1) m = cands[0]
        if (m) {
          m.home = hCode; m.away = aCode; m.homeP = ''; m.awayP = ''
        }
      }
      if (!m) return

      const st = ev.status && ev.status.type && ev.status.type.state
      if (st === 'in') m.status = 'live'
      else if (st === 'post') m.status = 'finished'
      else if (st === 'pre') m.status = 'scheduled'
      if (st === 'in' || st === 'post') {
        const hs = parseInt(homeC.score, 10), as2 = parseInt(awayC.score, 10)
        if (!isNaN(hs)) m.hScore = hs
        if (!isNaN(as2)) m.aScore = as2
      }
      if (comp.venue && comp.venue.fullName) {
        const v = venueZh(comp.venue.fullName)
        if (v.city) { m.venue = v.venue; m.city = v.city }
      }
      applied++
    } catch (e) { /* 单场解析失败不影响整体 */ }
  })
  return applied
}

// 主入口：fetchJson(url) 由调用方提供（本地脚本用 fetch，云函数用 axios）
// opts.ratingsOverride: 手动评分覆盖 { "<场次编号>": {playerId: rating} }
async function buildPayload(fetchJson, log, opts) {
  log = log || (() => {})
  opts = opts || {}
  const rows = await fetchJson(FD_URL)
  if (!Array.isArray(rows) || rows.length < 100) {
    throw new Error('fixturedownload 返回数据异常: ' + (Array.isArray(rows) ? rows.length + ' 场' : typeof rows))
  }
  const matches = fromFixtureDownload(rows)
  log('骨架: ' + matches.length + ' 场比赛')

  let espnApplied = 0
  try {
    const espn = await fetchJson(ESPN_URL)
    espnApplied = overlayESPN(matches, espn)
    log('ESPN 增强: 覆盖 ' + espnApplied + ' 场')
  } catch (e) {
    log('ESPN 不可达，跳过增强: ' + e.message)
  }

  // 赛后评分（FotMob，失败不影响赛程）+ 手动覆盖
  let ratingsMap = {}
  try {
    ratingsMap = await fetchRatings(fetchJson, matches, log)
    log('FotMob 评分: ' + Object.keys(ratingsMap).length + ' 场')
  } catch (e) {
    log('FotMob 评分失败: ' + e.message)
  }
  const override = opts.ratingsOverride || {}
  matches.forEach(m => {
    const r = Object.assign({}, ratingsMap[m.no], override[m.no] || override[String(m.no)])
    if (Object.keys(r).length) m.ratings = r
  })

  return {
    placeholder: false,
    lastUpdated: new Date().toISOString(),
    source: 'fixturedownload.com' + (espnApplied ? ' + ESPN' : ''),
    teams: TEAMS,
    players: PLAYERS,
    aliases: ALIASES,
    matches
  }
}

module.exports = { buildPayload, overlayESPN, fromFixtureDownload }
