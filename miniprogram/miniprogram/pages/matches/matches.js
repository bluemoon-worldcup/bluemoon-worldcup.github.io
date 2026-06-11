const fmt = require('../../utils/format.js')
const app = getApp()

Page({
  data: {
    loading: true,
    placeholder: false,
    updatedText: '',
    filter: 'tracked',     // tracked | all | 球队代码
    chips: [],             // [{key, label}]
    sections: []           // [{dateLabel, isToday, items:[匹配视图模型]}]
  },

  onLoad() { this.load(false) },
  onPullDownRefresh() { this.load(true).then(() => wx.stopPullDownRefresh()) },
  onShow() {
    // 从球员页跳转过来时可能带了筛选
    const f = app.globalData.pendingFilter
    if (f) {
      app.globalData.pendingFilter = null
      this.setData({ filter: f }, () => this.rebuild())
    }
  },

  async load(force) {
    const data = await app.getData(force)
    this._data = data
    const up = fmt.bjParts(data.lastUpdated)
    this.setData({
      loading: false,
      placeholder: !!data.placeholder,
      updatedText: '数据更新于 ' + up.md + ' ' + up.time + '（北京时间）' + (app.globalData.fromCloud ? '' : ' · 离线数据')
    })
    this.rebuild()
    if (force) wx.showToast({ title: app.globalData.fromCloud ? '已更新' : '云端不可用', icon: 'none' })
  },

  onRefreshTap() { this.load(true) },

  onChipTap(e) {
    this.setData({ filter: e.currentTarget.dataset.key }, () => this.rebuild())
  },

  rebuild() {
    const data = this._data
    if (!data) return
    const tracked = fmt.trackedTeams(data)

    // 筛选 chips
    const chips = [{ key: 'tracked', label: '⭐ 曼城相关' }]
    Object.keys(tracked)
      .sort((a, b) => ((data.teams[a].group || 'Z') + a).localeCompare((data.teams[b].group || 'Z') + b))
      .forEach(c => chips.push({ key: c, label: data.teams[c].flag + ' ' + data.teams[c].nameZh }))
    chips.push({ key: 'all', label: '全部比赛' })

    // 筛选比赛
    const f = this.data.filter
    let ms = data.matches.slice()
    if (f === 'tracked') ms = ms.filter(m => tracked[m.home] || tracked[m.away])
    else if (f !== 'all') ms = ms.filter(m => m.home === f || m.away === f)
    ms.sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))

    // 按北京时间日期分组并构造视图模型
    const tKey = fmt.todayKeyBJ()
    const sections = []
    let cur = null
    ms.forEach(m => {
      const p = fmt.bjParts(m.utc)
      if (!cur || cur.key !== p.dateKey) {
        cur = { key: p.dateKey, dateLabel: p.dateLabel, isToday: p.dateKey === tKey, items: [] }
        sections.push(cur)
      }
      const ht = m.home && data.teams[m.home]
      const at = m.away && data.teams[m.away]
      const showScore = m.status !== 'scheduled'
      cur.items.push({
        no: m.no,
        stageText: fmt.stageText(m),
        status: m.status,
        homeFlag: ht ? ht.flag : '▫️', homeName: ht ? ht.nameZh : (m.homeP || '待定'), homeTbd: !ht,
        awayFlag: at ? at.flag : '▫️', awayName: at ? at.nameZh : (m.awayP || '待定'), awayTbd: !at,
        hScore: showScore && m.hScore != null ? m.hScore : '',
        aScore: showScore && m.aScore != null ? m.aScore : '',
        hLoser: m.status === 'finished' && m.hScore != null && m.hScore < m.aScore,
        aLoser: m.status === 'finished' && m.aScore != null && m.aScore < m.hScore,
        time: p.time, md: p.md,
        venueText: m.venue ? '📍 ' + m.venue + (m.city ? ' · ' + m.city : '') : '',
        chips: data.players
          .filter(pl => pl.inSquad && (pl.team === m.home || pl.team === m.away))
          .map(pl => ({ nameZh: pl.nameZh, departed: pl.club === 'departed' }))
      })
    })
    this.setData({ chips, sections })
  },

  onShareAppMessage() {
    return { title: '蓝月亮看世界杯 · 曼城球员赛程', path: '/pages/matches/matches' }
  }
})
