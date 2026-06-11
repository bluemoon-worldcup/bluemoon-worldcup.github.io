// ============================================================
// 静态数据（单一数据源）：48支参赛队、曼城球员名单、英文名别名、球场中文名
// 同时被 tools/update-data.mjs（本地脚本）和云函数 updateData 使用
// 依据（2026-06-11 核实）：
//   - 分组：Wikipedia 2026 World Cup draw + ESPN standings API（两源一致）
//   - 名单：Wikipedia "2026 FIFA World Cup squads" + mancity.com/OneFootball
//   - 英格兰名单 2026-05-22 官宣：福登落选
// ============================================================

// 48支参赛队 + 意大利（仅用于未参赛球员展示）
const TEAMS = {
  // A组
  MEX: { nameZh: '墨西哥', nameEn: 'Mexico', flag: '🇲🇽', group: 'A' },
  RSA: { nameZh: '南非', nameEn: 'South Africa', flag: '🇿🇦', group: 'A' },
  KOR: { nameZh: '韩国', nameEn: 'South Korea', flag: '🇰🇷', group: 'A' },
  CZE: { nameZh: '捷克', nameEn: 'Czechia', flag: '🇨🇿', group: 'A' },
  // B组
  CAN: { nameZh: '加拿大', nameEn: 'Canada', flag: '🇨🇦', group: 'B' },
  BIH: { nameZh: '波黑', nameEn: 'Bosnia and Herzegovina', flag: '🇧🇦', group: 'B' },
  QAT: { nameZh: '卡塔尔', nameEn: 'Qatar', flag: '🇶🇦', group: 'B' },
  SUI: { nameZh: '瑞士', nameEn: 'Switzerland', flag: '🇨🇭', group: 'B' },
  // C组
  BRA: { nameZh: '巴西', nameEn: 'Brazil', flag: '🇧🇷', group: 'C' },
  MAR: { nameZh: '摩洛哥', nameEn: 'Morocco', flag: '🇲🇦', group: 'C' },
  HAI: { nameZh: '海地', nameEn: 'Haiti', flag: '🇭🇹', group: 'C' },
  SCO: { nameZh: '苏格兰', nameEn: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C' },
  // D组
  USA: { nameZh: '美国', nameEn: 'United States', flag: '🇺🇸', group: 'D' },
  PAR: { nameZh: '巴拉圭', nameEn: 'Paraguay', flag: '🇵🇾', group: 'D' },
  AUS: { nameZh: '澳大利亚', nameEn: 'Australia', flag: '🇦🇺', group: 'D' },
  TUR: { nameZh: '土耳其', nameEn: 'Türkiye', flag: '🇹🇷', group: 'D' },
  // E组
  GER: { nameZh: '德国', nameEn: 'Germany', flag: '🇩🇪', group: 'E' },
  CUW: { nameZh: '库拉索', nameEn: 'Curaçao', flag: '🇨🇼', group: 'E' },
  CIV: { nameZh: '科特迪瓦', nameEn: 'Ivory Coast', flag: '🇨🇮', group: 'E' },
  ECU: { nameZh: '厄瓜多尔', nameEn: 'Ecuador', flag: '🇪🇨', group: 'E' },
  // F组
  NED: { nameZh: '荷兰', nameEn: 'Netherlands', flag: '🇳🇱', group: 'F' },
  JPN: { nameZh: '日本', nameEn: 'Japan', flag: '🇯🇵', group: 'F' },
  SWE: { nameZh: '瑞典', nameEn: 'Sweden', flag: '🇸🇪', group: 'F' },
  TUN: { nameZh: '突尼斯', nameEn: 'Tunisia', flag: '🇹🇳', group: 'F' },
  // G组
  BEL: { nameZh: '比利时', nameEn: 'Belgium', flag: '🇧🇪', group: 'G' },
  EGY: { nameZh: '埃及', nameEn: 'Egypt', flag: '🇪🇬', group: 'G' },
  IRN: { nameZh: '伊朗', nameEn: 'Iran', flag: '🇮🇷', group: 'G' },
  NZL: { nameZh: '新西兰', nameEn: 'New Zealand', flag: '🇳🇿', group: 'G' },
  // H组
  ESP: { nameZh: '西班牙', nameEn: 'Spain', flag: '🇪🇸', group: 'H' },
  CPV: { nameZh: '佛得角', nameEn: 'Cape Verde', flag: '🇨🇻', group: 'H' },
  KSA: { nameZh: '沙特阿拉伯', nameEn: 'Saudi Arabia', flag: '🇸🇦', group: 'H' },
  URU: { nameZh: '乌拉圭', nameEn: 'Uruguay', flag: '🇺🇾', group: 'H' },
  // I组
  FRA: { nameZh: '法国', nameEn: 'France', flag: '🇫🇷', group: 'I' },
  SEN: { nameZh: '塞内加尔', nameEn: 'Senegal', flag: '🇸🇳', group: 'I' },
  IRQ: { nameZh: '伊拉克', nameEn: 'Iraq', flag: '🇮🇶', group: 'I' },
  NOR: { nameZh: '挪威', nameEn: 'Norway', flag: '🇳🇴', group: 'I' },
  // J组
  ARG: { nameZh: '阿根廷', nameEn: 'Argentina', flag: '🇦🇷', group: 'J' },
  ALG: { nameZh: '阿尔及利亚', nameEn: 'Algeria', flag: '🇩🇿', group: 'J' },
  AUT: { nameZh: '奥地利', nameEn: 'Austria', flag: '🇦🇹', group: 'J' },
  JOR: { nameZh: '约旦', nameEn: 'Jordan', flag: '🇯🇴', group: 'J' },
  // K组
  POR: { nameZh: '葡萄牙', nameEn: 'Portugal', flag: '🇵🇹', group: 'K' },
  COD: { nameZh: '民主刚果', nameEn: 'DR Congo', flag: '🇨🇩', group: 'K' },
  UZB: { nameZh: '乌兹别克斯坦', nameEn: 'Uzbekistan', flag: '🇺🇿', group: 'K' },
  COL: { nameZh: '哥伦比亚', nameEn: 'Colombia', flag: '🇨🇴', group: 'K' },
  // L组（曼城球员最多的小组：英格兰/克罗地亚/加纳都有）
  ENG: { nameZh: '英格兰', nameEn: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L' },
  CRO: { nameZh: '克罗地亚', nameEn: 'Croatia', flag: '🇭🇷', group: 'L' },
  GHA: { nameZh: '加纳', nameEn: 'Ghana', flag: '🇬🇭', group: 'L' },
  PAN: { nameZh: '巴拿马', nameEn: 'Panama', flag: '🇵🇦', group: 'L' },
  // 未晋级，仅用于展示
  ITA: { nameZh: '意大利', nameEn: 'Italy', flag: '🇮🇹', group: '' }
}

// 英文名 -> 队伍代码（覆盖 fixturedownload / ESPN / FIFA 的不同写法，统一小写匹配）
const ALIASES = {}
;(function () {
  for (const code of Object.keys(TEAMS)) ALIASES[TEAMS[code].nameEn.toLowerCase()] = code
  const extra = {
    'korea republic': 'KOR', 'south korea': 'KOR', 'republic of korea': 'KOR',
    'czech republic': 'CZE', 'czechia': 'CZE',
    'bosnia & herzegovina': 'BIH', 'bosnia-herzegovina': 'BIH', 'bosnia and herzegovina': 'BIH',
    'usa': 'USA', 'united states of america': 'USA', 'united states': 'USA',
    'turkey': 'TUR', 'turkiye': 'TUR', 'türkiye': 'TUR',
    "cote d'ivoire": 'CIV', "côte d'ivoire": 'CIV', 'ivory coast': 'CIV',
    'curacao': 'CUW', 'curaçao': 'CUW',
    'ir iran': 'IRN', 'iran': 'IRN',
    'cabo verde': 'CPV', 'cape verde': 'CPV', 'cape verde islands': 'CPV',
    'congo dr': 'COD', 'dr congo': 'COD', 'democratic republic of congo': 'COD',
    'democratic republic of the congo': 'COD', 'congo-kinshasa': 'COD',
    'netherlands': 'NED', 'holland': 'NED',
    'saudi arabia': 'KSA', 'scotland': 'SCO', 'new zealand': 'NZL'
  }
  Object.assign(ALIASES, extra)
})()

// 曼城球员（current=现役 / departed=今夏离队；inSquad=入选世界杯26人名单）
const PLAYERS = [
  { id: 'haaland',   name: 'Erling Haaland',     nameZh: '哈兰德',      pos: '前锋', club: 'current',  team: 'NOR', num: 9,  inSquad: true },
  { id: 'rodri',     name: 'Rodri',              nameZh: '罗德里',      pos: '中场', club: 'current',  team: 'ESP', num: 16, inSquad: true, note: '西班牙队长' },
  { id: 'doku',      name: 'Jérémy Doku',        nameZh: '多库',        pos: '前锋', club: 'current',  team: 'BEL', num: 11, inSquad: true },
  { id: 'marmoush',  name: 'Omar Marmoush',      nameZh: '马尔穆什',    pos: '前锋', club: 'current',  team: 'EGY', num: 22, inSquad: true },
  { id: 'cherki',    name: 'Rayan Cherki',       nameZh: '谢尔基',      pos: '中场', club: 'current',  team: 'FRA', num: 24, inSquad: true },
  { id: 'dias',      name: 'Rúben Dias',         nameZh: '鲁本·迪亚斯', pos: '后卫', club: 'current',  team: 'POR', num: 3,  inSquad: true },
  { id: 'nunes',     name: 'Matheus Nunes',      nameZh: '努内斯',      pos: '中场', club: 'current',  team: 'POR', num: 6,  inSquad: true },
  { id: 'ake',       name: 'Nathan Aké',         nameZh: '阿克',        pos: '后卫', club: 'current',  team: 'NED', num: 5,  inSquad: true },
  { id: 'reijnders', name: 'Tijjani Reijnders',  nameZh: '赖因德斯',    pos: '中场', club: 'current',  team: 'NED', num: 14, inSquad: true },
  { id: 'gvardiol',  name: 'Joško Gvardiol',     nameZh: '格瓦迪奥尔',  pos: '后卫', club: 'current',  team: 'CRO', num: 4,  inSquad: true },
  { id: 'kovacic',   name: 'Mateo Kovačić',      nameZh: '科瓦契奇',    pos: '中场', club: 'current',  team: 'CRO', num: 8,  inSquad: true },
  { id: 'aitnouri',  name: 'Rayan Aït-Nouri',    nameZh: '艾特-努里',   pos: '后卫', club: 'current',  team: 'ALG', num: 15, inSquad: true },
  { id: 'khusanov',  name: 'Abdukodir Khusanov', nameZh: '库萨诺夫',    pos: '后卫', club: 'current',  team: 'UZB', num: 2,  inSquad: true },
  { id: 'semenyo',   name: 'Antoine Semenyo',    nameZh: '塞门约',      pos: '前锋', club: 'current',  team: 'GHA', num: 11, inSquad: true, note: '2026年1月加盟' },
  { id: 'trafford',  name: 'James Trafford',     nameZh: '特拉福德',    pos: '门将', club: 'current',  team: 'ENG', num: 23, inSquad: true },
  { id: 'guehi',     name: 'Marc Guéhi',         nameZh: '格伊',        pos: '后卫', club: 'current',  team: 'ENG', num: 6,  inSquad: true, note: '2026年1月加盟' },
  { id: 'oreilly',   name: "Nico O'Reilly",      nameZh: '尼科·奥赖利', pos: '后卫', club: 'current',  team: 'ENG', num: 3,  inSquad: true },
  { id: 'stones',    name: 'John Stones',        nameZh: '斯通斯',      pos: '后卫', club: 'departed', clubNote: '今夏离队', team: 'ENG', num: 5,  inSquad: true },
  { id: 'bernardo',  name: 'Bernardo Silva',     nameZh: 'B席尔瓦',     pos: '中场', club: 'departed', clubNote: '今夏离队', team: 'POR', num: 10, inSquad: true },
  { id: 'kdb',       name: 'Kevin De Bruyne',    nameZh: '德布劳内',    pos: '中场', club: 'departed', clubNote: '现效力那不勒斯', team: 'BEL', num: 7, inSquad: true },

  { id: 'foden',      name: 'Phil Foden',           nameZh: '福登',          pos: '中场', club: 'current', team: 'ENG', num: null, inSquad: false, note: '落选英格兰26人名单' },
  { id: 'savinho',    name: 'Savinho',              nameZh: '萨维尼奥',      pos: '前锋', club: 'current', team: 'BRA', num: null, inSquad: false, note: '落选巴西26人名单' },
  { id: 'donnarumma', name: 'Gianluigi Donnarumma', nameZh: '多纳鲁马',      pos: '门将', club: 'current', team: 'ITA', num: null, inSquad: false, note: '意大利未晋级' },
  { id: 'bettinelli', name: 'Marcus Bettinelli',    nameZh: '贝蒂内利',      pos: '门将', club: 'current', team: 'ENG', num: null, inSquad: false, note: '未入选' },
  { id: 'lewis',      name: 'Rico Lewis',           nameZh: '里科·刘易斯',   pos: '后卫', club: 'current', team: 'ENG', num: null, inSquad: false, note: '未入选' },
  { id: 'nico',       name: 'Nico González',        nameZh: '尼科·冈萨雷斯', pos: '中场', club: 'current', team: 'ESP', num: null, inSquad: false, note: '未入选' },
  { id: 'nypan',      name: 'Sverre Nypan',         nameZh: '尼潘',          pos: '中场', club: 'current', team: 'NOR', num: null, inSquad: false, note: '未入选' }
]

// 球场中文名（按子串匹配，覆盖 FIFA 通用名和 ESPN 实名两套叫法）
const VENUES = [
  ['azteca', '阿兹特克体育场', '墨西哥城'], ['mexico city', '阿兹特克体育场', '墨西哥城'],
  ['akron', '阿克伦体育场', '瓜达拉哈拉'], ['guadalajara', '阿克伦体育场', '瓜达拉哈拉'],
  ['bbva', 'BBVA体育场', '蒙特雷'], ['monterrey', 'BBVA体育场', '蒙特雷'],
  ['sofi', 'SoFi体育场', '洛杉矶'], ['los angeles', 'SoFi体育场', '洛杉矶'], ['inglewood', 'SoFi体育场', '洛杉矶'],
  ["levi", '李维斯体育场', '旧金山湾区'], ['san francisco', '李维斯体育场', '旧金山湾区'], ['santa clara', '李维斯体育场', '旧金山湾区'],
  ['lumen', '流明球场', '西雅图'], ['seattle', '流明球场', '西雅图'],
  ['bc place', 'BC Place体育馆', '温哥华'], ['vancouver', 'BC Place体育馆', '温哥华'],
  ['bmo', 'BMO球场', '多伦多'], ['toronto', 'BMO球场', '多伦多'],
  ['arrowhead', '箭头体育场', '堪萨斯城'], ['kansas', '箭头体育场', '堪萨斯城'],
  ['at&t', 'AT&T体育场', '阿灵顿(达拉斯)'], ['dallas', 'AT&T体育场', '阿灵顿(达拉斯)'], ['arlington', 'AT&T体育场', '阿灵顿(达拉斯)'],
  ['nrg', 'NRG体育场', '休斯顿'], ['houston', 'NRG体育场', '休斯顿'],
  ['mercedes', '梅赛德斯-奔驰体育场', '亚特兰大'], ['atlanta', '梅赛德斯-奔驰体育场', '亚特兰大'],
  ['hard rock', '硬石体育场', '迈阿密'], ['miami', '硬石体育场', '迈阿密'],
  ['gillette', '吉列体育场', '波士顿(福克斯堡)'], ['boston', '吉列体育场', '波士顿(福克斯堡)'], ['foxborough', '吉列体育场', '波士顿(福克斯堡)'],
  ['lincoln', '林肯金融球场', '费城'], ['philadelphia', '林肯金融球场', '费城'],
  ['metlife', '大都会人寿体育场', '纽约(东卢瑟福)'], ['new york', '大都会人寿体育场', '纽约(东卢瑟福)'],
  ['new jersey', '大都会人寿体育场', '纽约(东卢瑟福)'], ['east rutherford', '大都会人寿体育场', '纽约(东卢瑟福)']
]

function venueZh(location) {
  if (!location) return { venue: '', city: '' }
  const lo = String(location).toLowerCase()
  for (const [key, venue, city] of VENUES) {
    if (lo.includes(key)) return { venue, city }
  }
  return { venue: String(location), city: '' }
}

// 解析占位写法 -> 中文（"1E"/"2A"/"3ABCDF"/"Group A 2nd Place"/"W73" 等）
function placeholderZh(s) {
  if (!s) return ''
  const t = String(s).trim()
  let m
  if ((m = t.match(/^([123])([A-L])$/))) return m[2] + '组第' + m[1]
  if ((m = t.match(/^3(?:rd)?[ /]?([A-L]{2,8})$/i))) return m[1].toUpperCase().split('').join('/') + '组第3'
  if ((m = t.match(/^W(\d+)$/i))) return '第' + m[1] + '场胜者'
  if ((m = t.match(/^L(\d+)$/i))) return '第' + m[1] + '场负者'
  if ((m = t.match(/group\s+([A-L])\s+(1st|2nd|3rd|winner|runner)/i))) {
    const map = { '1st': '1', winner: '1', '2nd': '2', runner: '2', '3rd': '3' }
    return m[1].toUpperCase() + '组第' + (map[m[2].toLowerCase()] || '?')
  }
  if ((m = t.match(/winner[^\d]*(\d+)/i))) return '第' + m[1] + '场胜者'
  if ((m = t.match(/loser[^\d]*(\d+)/i))) return '第' + m[1] + '场负者'
  if (/to be announced|to be confirmed|tbd|tba/i.test(t)) return '待定'
  return t
}

function resolveTeam(name) {
  if (!name) return null
  return ALIASES[String(name).trim().toLowerCase()] || null
}

module.exports = { TEAMS, ALIASES, PLAYERS, venueZh, placeholderZh, resolveTeam }
