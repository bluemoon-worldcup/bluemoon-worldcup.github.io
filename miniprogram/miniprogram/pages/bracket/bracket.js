const fmt = require('../../utils/format.js')
const app = getApp()

Page({
  data: {
    loading: true,
    cols: []    // [{title, ties:[{tracked, lines:[{flag,name,tbd,score}], meta}]}]
  },

  onLoad() { this.load() },
  onPullDownRefresh() { this.load(true).then(() => wx.stopPullDownRefresh()) },

  async load(force) {
    const data = await app.getData(force)
    const tracked = fmt.trackedTeams(data)
    const kos = data.matches.filter(m => m.stage !== 'group')

    const cols = []
    fmt.STAGE_ORDER.forEach(st => {
      const ms = kos.filter(m => m.stage === st)
        .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))
      if (!ms.length) return
      cols.push({
        title: fmt.STAGE_LABEL[st],
        ties: ms.map(m => {
          const p = fmt.bjParts(m.utc)
          const line = (code, ph, score) => {
            const t = code && data.teams[code]
            return {
              flag: t ? t.flag : '▫️',
              name: t ? t.nameZh : (ph || '待定'),
              tbd: !t,
              score: m.status !== 'scheduled' && score != null ? score : ''
            }
          }
          return {
            tracked: !!(tracked[m.home] || tracked[m.away]),
            live: m.status === 'live',
            lines: [line(m.home, m.homeP, m.hScore), line(m.away, m.awayP, m.aScore)],
            meta: p.md + ' ' + p.time + ' 北京时间'
          }
        })
      })
    })
    this.setData({ loading: false, cols })
  },

  onShareAppMessage() {
    return { title: '世界杯淘汰赛对阵图', path: '/pages/bracket/bracket' }
  }
})
