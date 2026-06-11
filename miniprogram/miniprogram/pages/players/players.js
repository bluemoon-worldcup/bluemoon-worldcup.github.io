const fmt = require('../../utils/format.js')
const app = getApp()

Page({
  data: {
    loading: true,
    groups: [],     // [{code, flag, nameZh, group, players:[]}]
    notInCup: []
  },

  onLoad() { this.load() },

  async load() {
    const data = await app.getData(false)
    const tracked = fmt.trackedTeams(data)

    const codes = Object.keys(tracked).sort((a, b) =>
      ((data.teams[a].group || 'Z') + a).localeCompare((data.teams[b].group || 'Z') + b))

    const groups = codes.map(code => {
      const t = data.teams[code]
      return {
        code,
        flag: t.flag,
        nameZh: t.nameZh,
        group: t.group && t.group !== '?' ? t.group : '',
        players: data.players
          .filter(p => p.inSquad && p.team === code)
          .map(p => ({
            nameZh: p.nameZh, name: p.name, pos: p.pos,
            num: p.num != null ? p.num : '–',
            departed: p.club === 'departed',
            clubNote: p.clubNote || '今夏离队'
          }))
      }
    })

    const notInCup = data.players.filter(p => !p.inSquad).map(p => ({
      nameZh: p.nameZh, name: p.name, pos: p.pos,
      flag: p.team && data.teams[p.team] ? data.teams[p.team].flag : '',
      note: p.note || '未入选',
      departed: p.club === 'departed',
      clubNote: p.clubNote || '今夏离队'
    }))

    this.setData({ loading: false, groups, notInCup })
  },

  // 点击球员 -> 跳到赛程页并按其国家队筛选
  onPlayerTap(e) {
    app.globalData.pendingFilter = e.currentTarget.dataset.team
    wx.switchTab({ url: '/pages/matches/matches' })
  },

  onShareAppMessage() {
    return { title: '曼城球员都在哪支国家队？世界杯名单一览', path: '/pages/players/players' }
  }
})
