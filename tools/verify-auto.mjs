// 验证"未来比赛会自动更新"：node tools/verify-auto.mjs
// 1) 列出基础数据里曼城相关、尚未结束的比赛
// 2) 对每场去 FotMob 实测：现在能否按队名解析到该场（=结束后客户端能否自动抓到）
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { resolveTeam } = require('./lib/data.cjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const d = JSON.parse(readFileSync(join(root, 'h5/data.json'), 'utf8'))
const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' }

const tracked = new Set()
d.players.forEach(p => { if (p.inSquad) tracked.add(p.team) })

const bj = iso => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
const dateKeysFor = utc => [0, -1, 1].map(off => new Date(Date.parse(utc) + off * 86400000).toISOString().slice(0, 10).replace(/-/g, ''))

const now = Date.now()
const upcoming = d.matches
  .filter(m => m.home && m.away && (tracked.has(m.home) || tracked.has(m.away)) && m.status !== 'finished')
  .filter(m => Date.parse(m.utc) - now < 48 * 3600 * 1000)   // 未来48小时内
  .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))

console.log(`未来48小时内曼城相关比赛：${upcoming.length} 场\n`)

const listCache = {}
async function getList(date) {
  if (!(date in listCache)) {
    try {
      const r = await fetch('https://www.fotmob.com/api/data/matches?date=' + date, { headers: h })
      const j = await r.json()
      listCache[date] = (j.leagues || []).flatMap(l => l.matches || [])
    } catch (e) { listCache[date] = null }
  }
  return listCache[date]
}

let allOk = true
for (const m of upcoming) {
  const cityPlayers = d.players.filter(p => p.inSquad && (p.team === m.home || p.team === m.away)).map(p => p.nameZh)
  let fm = null
  for (const date of dateKeysFor(m.utc)) {
    const fms = await getList(date)
    if (!fms) continue
    fm = fms.find(x => resolveTeam(x.home && x.home.name) === m.home && resolveTeam(x.away && x.away.name) === m.away)
    if (fm) break
  }
  const teamLine = `${d.teams[m.home].nameZh} vs ${d.teams[m.away].nameZh}  (${bj(m.utc)} 北京)`
  if (fm) {
    console.log(`✅ ${teamLine}\n   FotMob已就位 id=${fm.id} 状态=${fm.status && fm.status.finished ? '已结束' : (fm.status && fm.status.started ? '进行中' : '未开赛')} | 涉及: ${cityPlayers.join('、')}`)
  } else {
    allOk = false
    console.log(`❌ ${teamLine}\n   FotMob未解析到（结束后可能抓不到）| 涉及: ${cityPlayers.join('、')}`)
  }
}
console.log(`\n结论：${allOk ? '全部可自动抓取 ✅ —— 比赛结束后用户打开/刷新页面即自动更新，无需人工' : '有未解析项，需检查队名别名 ⚠️'}`)
