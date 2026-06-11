// ============================================================
// 数据更新脚本：node tools/update-data.mjs
// 拉取最新赛程 -> 生成 H5 与小程序的数据文件，并同步云函数的共享代码
// ============================================================
import { writeFileSync, copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildPayload } = require('./lib/build.cjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 手动评分覆盖（可选）
let ratingsOverride = {}
const overridePath = join(root, 'tools/ratings-override.json')
if (existsSync(overridePath)) {
  try {
    ratingsOverride = JSON.parse(readFileSync(overridePath, 'utf8'))
    delete ratingsOverride._doc
  } catch (e) { console.warn('ratings-override.json 解析失败，忽略：' + e.message) }
}

async function fetchJson(url) {
  let lastErr
  for (let i = 0; i < 2; i++) {   // 网络抖动重试一次
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return await r.json()
    } catch (e) { lastErr = e }
  }
  throw lastErr
}

const payload = await buildPayload(fetchJson, msg => console.log('  ' + msg), { ratingsOverride })
const json = JSON.stringify(payload, null, 1)

// H5：内置数据 + 可托管的纯 JSON
writeFileSync(join(root, 'h5/data.js'),
  '// 自动生成于 ' + payload.lastUpdated + '，运行 node tools/update-data.mjs 更新\n' +
  'window.WC_DATA = ' + json + ';\n')
writeFileSync(join(root, 'h5/data.json'), json)

// 小程序：内置兜底数据
writeFileSync(join(root, 'miniprogram/miniprogram/data/fallback.js'),
  '// 自动生成于 ' + payload.lastUpdated + '，运行 node tools/update-data.mjs 更新\n' +
  'module.exports = ' + json + '\n')

// 云函数：同步共享代码，保证云端转换逻辑与本地一致
const cfLib = join(root, 'miniprogram/cloudfunctions/updateData/lib')
mkdirSync(cfLib, { recursive: true })
copyFileSync(join(root, 'tools/lib/data.cjs'), join(cfLib, 'data.cjs'))
copyFileSync(join(root, 'tools/lib/build.cjs'), join(cfLib, 'build.cjs'))
copyFileSync(join(root, 'tools/lib/ratings.cjs'), join(cfLib, 'ratings.cjs'))

const inCup = payload.players.filter(p => p.inSquad).length
console.log('✅ 完成：' + payload.matches.length + ' 场比赛，' + inCup + ' 名追踪球员')
console.log('   数据来源：' + payload.source)
console.log('   已更新：h5/data.js, h5/data.json, 小程序 fallback.js, 云函数 lib/')
