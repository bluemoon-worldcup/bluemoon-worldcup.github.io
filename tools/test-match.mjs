// 验证名字匹配修复：node tools/test-match.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { matchTier, bestMatch, minutesFromPerf } = require('./lib/ratings.cjs')

const rodri = { id: 'rodri', name: 'Rodri', num: 16 }
let pass = 0, fail = 0
const t = (desc, got, want) => {
  const ok = got === want;
  console.log((ok ? 'OK  ' : 'FAIL') + ` ${desc}: got ${got}, want ${want}`);
  ok ? pass++ : fail++;
}

// Rodri 应匹配自己（含 FotMob 常见全名），不应匹配 Rodrigo / Rodríguez
t('Rodri==Rodri', matchTier({ name: 'Rodri', shirtNumber: '16' }, rodri), 0)
t('Rodri==Rodri Hernández(词元)', matchTier({ name: 'Rodri Hernández', shirtNumber: '16' }, rodri), 2)
t('Rodri≠Rodrigo', matchTier({ name: 'Rodrigo', shirtNumber: '11' }, rodri), Infinity)
t('Rodri≠Rodrigo Riquelme', matchTier({ name: 'Rodrigo Riquelme', shirtNumber: '7' }, rodri), Infinity)
t('Rodri≠Sergio Rodríguez', matchTier({ name: 'Sergio Rodríguez', shirtNumber: '5' }, rodri), Infinity)
t('Rodri≠Pedri', matchTier({ name: 'Pedri', shirtNumber: '8' }, rodri), Infinity)

// bestMatch：即使 Rodrigo 排在前面，也只会选到真正的 Rodri（Rodrigo 根本不匹配）
const pool = [{ id: 1001, name: 'Rodrigo', shirtNumber: '11' }, { id: 1002, name: 'Rodri Hernández', shirtNumber: '16' }]
const hit = bestMatch(pool, rodri)
t('bestMatch 选到真 Rodri(1002)', hit && hit.id, 1002)

// 同档优先号码一致
const pool2 = [{ id: 2001, name: 'Rodri Hernández', shirtNumber: '9' }, { id: 2002, name: 'Rodri Hernández', shirtNumber: '16' }]
t('同名优先号码16', bestMatch(pool2, rodri).id, 2002)

// 其他球员全名精确
t('Haaland==0', matchTier({ name: 'Erling Haaland', shirtNumber: '9' }, { name: 'Erling Haaland', num: 9 }), 0)
t("O'Reilly 词元规整", matchTier({ name: "Nico O'Reilly", shirtNumber: '3' }, { name: "Nico O'Reilly", num: 3 }), 0)

// 分钟推算：首发85'被换下 -> 85；67'替补登场(常规90) -> 23
t('subOut85 -> 85', minutesFromPerf({ performance: { substitutionEvents: [{ time: 85, type: 'subOut' }] } }, 90), 85)
t('subIn67 -> 23', minutesFromPerf({ performance: { substitutionEvents: [{ time: 67, type: 'subIn' }] } }, 90), 23)
t('首发踢满 -> 90', minutesFromPerf({ performance: { substitutionEvents: [] } }, 90), 90)

console.log(`\n${pass} 通过, ${fail} 失败`)
if (fail) process.exit(1)
