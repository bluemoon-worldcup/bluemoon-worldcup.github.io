// 球员数据抓取端到端测试：node tools/test-ratings.mjs
// 用近期已结束的真实比赛验证 FotMob 接口 + 名字匹配 + 字段提取
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { fetchStats, extractStats, normName } = require('./lib/ratings.cjs')
const { resolveTeam, PLAYERS } = require('./lib/data.cjs')

const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' }
async function fetchJson(url) {
  const r = await fetch(url, { headers: h })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

// 1) 名字归一化
console.log('--- 名字归一化 ---')
for (const [got, want] of [
  [normName('Nathan Aké'), 'nathan ake'],
  [normName("Nico O'Reilly"), 'nico o reilly'],
  [normName('Joško Gvardiol'), 'josko gvardiol'],
  [normName('Mateo Kovačić'), 'mateo kovacic']
]) console.log((got === want ? 'OK  ' : 'FAIL') + ` "${got}" (期望 "${want}")`)

// 2) 直接对 Belgium-Egypt(4667790) 验证字段提取
console.log('\n--- 直接提取 比利时1-1埃及 (Doku/KDB/Marmoush) ---')
const det = await fetchJson('https://www.fotmob.com/api/data/matchDetails?matchId=4667790')
const stats = extractStats(det, 'BEL', 'EGY')
for (const pid of Object.keys(stats)) {
  const pl = PLAYERS.find(p => p.id === pid)
  const s = stats[pid]
  console.log('  ' + (pl ? pl.nameZh : pid) + ': 评分' + (s.r ?? '-') + ' 分钟' + (s.min ?? '-') + ' 进球' + (s.g ?? 0) + ' 助攻' + (s.a ?? 0))
}

// 3) 全链路：扫近几日已结束、涉及追踪球队的真实比赛
console.log('\n--- 全链路 fetchStats（近几日真实比赛）---')
const tracked = {}; PLAYERS.forEach(p => { if (p.inSquad) tracked[p.team] = true })
const pseudo = []
for (const day of ['20260613','20260614','20260615','20260616']) {
  let list; try { list = await fetchJson('https://www.fotmob.com/api/data/matches?date=' + day) } catch { continue }
  for (const lg of list.leagues || []) for (const fm of lg.matches || []) {
    const hc = resolveTeam(fm.home && fm.home.name), ac = resolveTeam(fm.away && fm.away.name)
    if (fm.status && fm.status.finished && hc && ac && (tracked[hc] || tracked[ac])) {
      pseudo.push({ no: 9000 + pseudo.length, status: 'finished', home: hc, away: ac,
        utc: day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6)+'T18:00:00Z',
        _label: fm.home.name + ' ' + (fm.status.scoreStr||'') + ' ' + fm.away.name })
    }
  }
}
console.log('找到 ' + pseudo.length + ' 场：' + pseudo.map(m => m._label).join(' | '))
const all = await fetchStats(fetchJson, pseudo, msg => console.log('  [log] ' + msg))
for (const no of Object.keys(all)) {
  const m = pseudo.find(x => String(x.no) === String(no))
  console.log('  ' + (m ? m._label : no) + ':')
  for (const pid of Object.keys(all[no])) {
    const pl = PLAYERS.find(p => p.id === pid); const s = all[no][pid]
    console.log('    ' + (pl ? pl.nameZh : pid) + ' 评分' + (s.r ?? '-') + ' ' + (s.min ?? '-') + "' 球" + (s.g ?? 0) + ' 助' + (s.a ?? 0))
  }
}
