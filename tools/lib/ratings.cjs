// ============================================================
// 赛后球员评分抓取（FotMob 公开接口，0-10 分）
// 只抓已结束且涉及追踪球队的场次；接口失效时静默跳过，不影响赛程数据
// ============================================================
const { PLAYERS, resolveTeam } = require('./data.cjs')

const FM_MATCHES = 'https://www.fotmob.com/api/data/matches?date='      // + YYYYMMDD
const FM_DETAILS = 'https://www.fotmob.com/api/data/matchDetails?matchId='

// 名字归一化：小写、去音调符号（NFD分解后去掉 U+0300-U+036F 组合符）、去标点
function normName(s) {
  return String(s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ')
    .replace(/ +/g, ' ').trim()
}

// FotMob 阵容球员 与 我们的球员 匹配：全名 > 姓氏+号码 > 包含关系
function playerMatch(x, our) {
  const xn = normName(x.name || ((x.firstName || '') + ' ' + (x.lastName || '')))
  const on = normName(our.name)
  if (!xn || !on) return false
  if (xn === on) return true
  const num = x.shirtNumber != null ? Number(x.shirtNumber) : null
  if (xn.split(' ').pop() === on.split(' ').pop() && our.num != null && num === our.num) return true
  if (xn.length >= 5 && on.length >= 5 && (xn.includes(on) || on.includes(xn))) return true
  return false
}

// 从一场 matchDetails 提取我们球员的评分 {playerId: rating}
function extractRatings(details, homeCode, awayCode) {
  const lineup = details && details.content && details.content.lineup
  if (!lineup) return {}
  const ratings = {}
  const sides = [[lineup.homeTeam, homeCode], [lineup.awayTeam, awayCode]]
  for (const [tl, code] of sides) {
    if (!tl || !code) continue
    const pool = [].concat(tl.starters || [], tl.subs || [])
    for (const our of PLAYERS.filter(p => p.inSquad && p.team === code)) {
      const hit = pool.find(x => playerMatch(x, our))
      const r = hit && hit.performance && hit.performance.rating
      if (r != null && !isNaN(Number(r))) ratings[our.id] = Math.round(Number(r) * 10) / 10
    }
  }
  return ratings
}

// 比赛 UTC 时间对应的 FotMob 日期桶候选：当天、前一天、后一天（跨时区兜底）
function dateKeysFor(utc) {
  const t = Date.parse(utc)
  return [0, -1, 1].map(off =>
    new Date(t + off * 86400000).toISOString().slice(0, 10).replace(/-/g, ''))
}

// 主入口：返回 { <场次编号>: {playerId: rating} }
async function fetchRatings(fetchJson, matches, log) {
  log = log || (() => {})
  const tracked = {}
  PLAYERS.forEach(p => { if (p.inSquad) tracked[p.team] = true })

  const targets = matches.filter(m =>
    m.status === 'finished' && m.home && m.away && (tracked[m.home] || tracked[m.away]))
  if (!targets.length) return {}

  const listCache = {}
  async function getMatchList(date) {
    if (!(date in listCache)) {
      try {
        const list = await fetchJson(FM_MATCHES + date)
        listCache[date] = (list && list.leagues ? list.leagues : []).reduce((a, l) => a.concat(l.matches || []), [])
      } catch (e) { log('FotMob 列表失败 ' + date + ': ' + e.message); listCache[date] = null }
    }
    return listCache[date]
  }

  const out = {}
  for (const m of targets) {
    let fm = null
    for (const date of dateKeysFor(m.utc)) {
      const fms = await getMatchList(date)
      if (!fms) continue
      fm = fms.find(x =>
        resolveTeam(x.home && x.home.name) === m.home &&
        resolveTeam(x.away && x.away.name) === m.away)
      if (fm) break
    }
    if (!fm) { log('FotMob 未匹配到 第' + m.no + '场 ' + m.home + '-' + m.away); continue }
    let det
    try { det = await fetchJson(FM_DETAILS + fm.id) } catch (e) { continue }
    const ratings = extractRatings(det, m.home, m.away)
    if (Object.keys(ratings).length) out[m.no] = ratings
  }
  return out
}

module.exports = { fetchRatings, extractRatings, playerMatch, normName }
