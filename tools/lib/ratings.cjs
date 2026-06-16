// ============================================================
// 赛后球员数据抓取（FotMob 公开接口）
// 每名球员一条：评分(r) / 出场分钟(min) / 进球(g) / 助攻(a)
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
function tokens(s) { return normName(s).split(' ').filter(Boolean) }

// 匹配档位：0=全名精确，1=姓氏+号码，2=词元包含（短名按整词匹配，避免 Rodri~Rodrigo 误配），Infinity=不匹配
function matchTier(x, our) {
  const xn = normName(x.name || ((x.firstName || '') + ' ' + (x.lastName || '')))
  const on = normName(our.name)
  if (!xn || !on) return Infinity
  if (xn === on) return 0
  const xt = xn.split(' ').filter(Boolean), ot = on.split(' ').filter(Boolean)
  const num = x.shirtNumber != null ? Number(x.shirtNumber) : null
  if (xt.length && ot.length && xt[xt.length - 1] === ot[ot.length - 1] && our.num != null && num === our.num) return 1
  // 词元包含：较短一方的每个整词都在另一方里（"rodri" 命中 "rodri hernandez"，但不命中 "rodrigo"）
  const subset = (a, b) => a.length && a.every(t => b.includes(t))
  if ((ot.length <= xt.length && subset(ot, xt)) || (xt.length <= ot.length && subset(xt, ot))) return 2
  return Infinity
}

// 在一队阵容里为某球员挑最佳匹配：档位最小者胜，同档优先号码一致
function bestMatch(pool, our) {
  let best = null, bestTier = Infinity, bestNumOk = false
  for (const x of pool) {
    const t = matchTier(x, our)
    if (t === Infinity) continue
    const numOk = x.shirtNumber != null && our.num != null && Number(x.shirtNumber) === our.num
    if (t < bestTier || (t === bestTier && numOk && !bestNumOk)) { best = x; bestTier = t; bestNumOk = numOk }
  }
  return best
}

// 从 playerStats[id] 的 "Top stats" 分组里取某个 key 的数值
function topStat(ps, label) {
  if (!ps || !Array.isArray(ps.stats)) return null
  const grp = ps.stats.find(g => g && g.title === 'Top stats') || ps.stats[0]
  const cell = grp && grp.stats && grp.stats[label]
  const v = cell && cell.stat && cell.stat.value
  return v == null ? null : Number(v)
}

// playerStats 缺"出场分钟"时，用阵容里的换人事件推算（full=该场满场分钟，常规90/淘汰赛120）
function minutesFromPerf(hit, full) {
  const evs = (hit.performance && hit.performance.substitutionEvents) || []
  const subIn = evs.find(e => e.type === 'subIn')
  const subOut = evs.find(e => e.type === 'subOut')
  if (subIn && subOut) return Math.max(0, subOut.time - subIn.time)
  if (subIn) return Math.max(0, full - subIn.time)
  if (subOut) return Math.max(0, subOut.time)
  return full   // 首发且未被换下 -> 踢满
}

// 从一场 matchDetails 提取我们球员的完整数据 {playerId: {r,min,g,a}}
// opts.full: 该场满场分钟（默认90）
function extractStats(details, homeCode, awayCode, opts) {
  const content = details && details.content
  const lineup = content && content.lineup
  if (!lineup) return {}
  const full = (opts && opts.full) || 90
  const playerStats = content.playerStats || {}
  const out = {}
  const sides = [[lineup.homeTeam, homeCode], [lineup.awayTeam, awayCode]]
  for (const [tl, code] of sides) {
    if (!tl || !code) continue
    const pool = [].concat(tl.starters || [], tl.subs || [])
    for (const our of PLAYERS.filter(p => p.inSquad && p.team === code)) {
      const hit = bestMatch(pool, our)
      if (!hit) continue
      const ps = playerStats[String(hit.id)]
      let r = topStat(ps, 'FotMob rating')
      if (r == null && hit.performance && hit.performance.rating != null) r = Number(hit.performance.rating)
      let min = topStat(ps, 'Minutes played')
      const g = topStat(ps, 'Goals')
      const a = topStat(ps, 'Assists')
      // 该球员有上场（有评分或有分钟）才记录；纯未登场替补不记
      if (r == null && min == null) continue
      if (min == null && r != null) min = minutesFromPerf(hit, full)   // 有评分却缺分钟 -> 推算
      const rec = {}
      if (r != null) rec.r = Math.round(r * 10) / 10
      if (min != null) rec.min = Math.round(min)
      if (g != null) rec.g = Math.round(g)
      if (a != null) rec.a = Math.round(a)
      out[our.id] = rec
    }
  }
  return out
}

// 比赛 UTC 时间对应的 FotMob 日期桶候选：当天、前一天、后一天（跨时区兜底）
function dateKeysFor(utc) {
  const t = Date.parse(utc)
  return [0, -1, 1].map(off =>
    new Date(t + off * 86400000).toISOString().slice(0, 10).replace(/-/g, ''))
}

// 主入口：返回 { <场次编号>: {playerId: {r,min,g,a}} }
async function fetchStats(fetchJson, matches, log) {
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
    const full = m.stage && m.stage !== 'group' ? 120 : 90
    const stats = extractStats(det, m.home, m.away, { full })
    if (Object.keys(stats).length) out[m.no] = stats
  }
  return out
}

module.exports = { fetchStats, extractStats, matchTier, bestMatch, minutesFromPerf, normName, dateKeysFor }
