// 时间与文案工具（小程序端不依赖 Intl，手动换算北京时间）
const STAGE_LABEL = { r32: '1/16决赛', r16: '1/8决赛', qf: '1/4决赛', sf: '半决赛', third: '季军赛', final: '决赛' }
const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'third', 'final']
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(n) { return n < 10 ? '0' + n : '' + n }

// UTC ISO 字符串 -> 北京时间各部分
function bjParts(iso) {
  const d = new Date(Date.parse(iso) + 8 * 3600 * 1000)
  return {
    dateKey: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()),
    dateLabel: (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日 ' + WEEK[d.getUTCDay()],
    time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()),
    md: pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate())
  }
}

function todayKeyBJ() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
}

function stageText(m) {
  if (m.stage === 'group') return '小组赛 ' + m.group + '组 · 第' + m.round + '轮'
  return STAGE_LABEL[m.stage] || m.stage
}

function trackedTeams(data) {
  const s = {}
  data.players.forEach(p => { if (p.inSquad && p.team) s[p.team] = true })
  return s
}

module.exports = { STAGE_LABEL, STAGE_ORDER, bjParts, todayKeyBJ, stageText, trackedTeams }
