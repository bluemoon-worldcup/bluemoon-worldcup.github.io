// 评分抓取端到端测试：node tools/test-ratings.mjs
// 用近期已结束的比赛（世界杯前热身赛）验证 FotMob 接口 + 名字匹配
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { fetchRatings, normName } = require('./lib/ratings.cjs')
const { resolveTeam, PLAYERS } = require('./lib/data.cjs')

// 1) 名字归一化
const namesOk = [
  [normName('Nathan Aké'), 'nathan ake'],
  [normName("Nico O'Reilly"), 'nico o reilly'],
  [normName('Joško Gvardiol'), 'josko gvardiol'],
  [normName('Mateo Kovačić'), 'mateo kovacic'],
  [normName('Rayan Aït-Nouri'), 'rayan ait nouri']
]
namesOk.forEach(([got, want]) => {
  console.log((got === want ? 'OK  ' : 'FAIL') + ` normName => "${got}" (期望 "${want}")`)
})

// 2) 端到端：扫描 6月4-9日 已结束、涉及追踪球队的真实比赛
async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

const tracked = {}
PLAYERS.forEach(p => { if (p.inSquad) tracked[p.team] = true })

const pseudo = []
for (const day of ['20260604', '20260605', '20260606', '20260607', '20260608', '20260609']) {
  const list = await fetchJson('https://www.fotmob.com/api/data/matches?date=' + day)
  for (const lg of list.leagues || []) {
    for (const fm of lg.matches || []) {
      const h = resolveTeam(fm.home && fm.home.name)
      const a = resolveTeam(fm.away && fm.away.name)
      if (fm.status && fm.status.finished && h && a && (tracked[h] || tracked[a])) {
        pseudo.push({
          no: 9000 + pseudo.length, stage: 'group', status: 'finished',
          home: h, away: a,
          utc: day.slice(0, 4) + '-' + day.slice(4, 6) + '-' + day.slice(6) + 'T12:00:00Z',
          _label: fm.home.name + ' ' + (fm.status.scoreStr || '') + ' ' + fm.away.name
        })
      }
    }
  }
}
console.log('\n找到 ' + pseudo.length + ' 场涉及追踪球队的已结束比赛：')
pseudo.forEach(m => console.log('  第' + m.no + '场(虚拟) ' + m._label))

const ratings = await fetchRatings(fetchJson, pseudo, msg => console.log('  [log] ' + msg))
console.log('\n评分结果：')
for (const no of Object.keys(ratings)) {
  const m = pseudo.find(x => String(x.no) === String(no))
  console.log('  ' + (m ? m._label : no) + ':')
  for (const pid of Object.keys(ratings[no])) {
    const pl = PLAYERS.find(p => p.id === pid)
    console.log('    ' + (pl ? pl.nameZh : pid) + ' = ' + ratings[no][pid])
  }
}
if (!Object.keys(ratings).length) console.log('  （无 —— 若上面找到了比赛但无评分，说明匹配有问题，需检查）')
