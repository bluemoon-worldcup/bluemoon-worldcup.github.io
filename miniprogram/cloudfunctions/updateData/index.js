// 云函数 updateData：定时拉取最新赛程，写入云数据库 wcdata/latest
// 小程序端不直接访问外网（无需备案域名），全部走这里中转
const cloud = require('wx-server-sdk')
const axios = require('axios')
const { buildPayload } = require('./lib/build.cjs')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function fetchJson(url) {
  let lastErr
  for (let i = 0; i < 2; i++) {
    try {
      const r = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      return r.data
    } catch (e) { lastErr = e }
  }
  throw lastErr
}

exports.main = async () => {
  const payload = await buildPayload(fetchJson, console.log)
  const db = cloud.database()
  try {
    await db.collection('wcdata').doc('latest').set({ data: { payload } })
  } catch (e) {
    // 集合不存在时自动创建后重试
    if (e.errCode === -502005) {
      await db.createCollection('wcdata')
      await db.collection('wcdata').doc('latest').set({ data: { payload } })
    } else throw e
  }
  return {
    ok: true,
    matches: payload.matches.length,
    source: payload.source,
    lastUpdated: payload.lastUpdated
  }
}
