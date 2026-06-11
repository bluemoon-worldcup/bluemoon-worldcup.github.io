// app.js —— 全局数据加载：优先云数据库，失败回退内置数据
const fallback = require('./data/fallback.js')

App({
  globalData: {
    data: null,        // 当前生效的数据
    fromCloud: false
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        // TODO: 替换为你的云开发环境 ID（开通云开发后在控制台可见）
        env: 'YOUR_CLOUD_ENV_ID',
        traceUser: false
      })
    }
  },

  // 各页面通过 getData() 获取数据；force=true 强制从云端拉新
  async getData(force) {
    if (this.globalData.data && !force) return this.globalData.data
    try {
      const db = wx.cloud.database()
      const res = await db.collection('wcdata').doc('latest').get()
      if (res.data && res.data.payload && Array.isArray(res.data.payload.matches)) {
        this.globalData.data = res.data.payload
        this.globalData.fromCloud = true
        return this.globalData.data
      }
      throw new Error('云端数据格式不正确')
    } catch (e) {
      console.warn('云端数据获取失败，使用内置数据', e)
      if (!this.globalData.data) this.globalData.data = fallback
      return this.globalData.data
    }
  }
})
