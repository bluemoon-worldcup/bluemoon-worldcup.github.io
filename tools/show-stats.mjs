import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const d = JSON.parse(readFileSync(join(root, 'h5/data.json'), 'utf8'))
const n = {}; d.players.forEach(p => n[p.id] = p.nameZh)
d.matches.filter(m => m.stats).forEach(m => {
  let l = d.teams[m.home].nameZh + ' ' + m.hScore + '-' + m.aScore + ' ' + d.teams[m.away].nameZh + ':'
  for (const id in m.stats) {
    const s = m.stats[id]
    l += ` [${n[id]} ${s.r ?? '-'}分 ${s.min ?? 0}'${s.g ? ' 进' + s.g : ''}${s.a ? ' 助' + s.a : ''}]`
  }
  console.log(l)
})
