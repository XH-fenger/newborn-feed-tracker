// 记录行文案（首页 / 历史 / 统计明细共用）
var T = require('./time.js');

var METHOD_TXT = { breast: '母乳', formula: '奶粉', mixed: '混合' };
var SIDE_TXT = { left: '左侧', right: '右侧', both: '双侧' };
var DIAPER_TXT = { pee: '尿', poop: '便', both: '都有' };

var MEDS = [
  { k: 'k1', t: '维生素K1' },
  { k: 'vd', t: '维生素D' },
  { k: 'ad', t: '维生素AD' },
  { k: 'iron', t: '铁剂' },
  { k: 'other', t: '其他' }
];

function tempSlot(r) {
  if (!r) { return 'am'; }
  if (r.slot === 'pm' || r.slot === 'am') { return r.slot; }
  return new Date(r.time).getHours() < 14 ? 'am' : 'pm';
}

function tempFlag(c) {
  if (!(c > 0)) { return ''; }
  if (c >= 37.5) { return '偏高'; }
  if (c < 36) { return '偏低'; }
  return '';
}

function fmtC(n) {
  return (Math.round(Number(n) * 10) / 10).toFixed(1);
}

function medLabel(r) {
  if (!r) { return '补充剂'; }
  if (r.medKey === 'other') { return r.medName || '其他补充剂'; }
  for (var i = 0; i < MEDS.length; i++) {
    if (MEDS[i].k === r.medKey) { return MEDS[i].t; }
  }
  return r.medName || '补充剂';
}

function rowOf(r) {
  var o = { id: r.id, dayKey: T.dayKey(r.time), title: '', detail: '', iconKey: 'list', icBg: 'priSoft' };
  if (r.type === 'feed') {
    var m = METHOD_TXT[r.feedMethod] || '喂养';
    o.title = (r.feedMethod === 'mixed' && r.side) ? m + ' · ' + (SIDE_TXT[r.side] || '') : m;
    if (r.feedMethod === 'breast' && !(r.amount > 0) && (r.duration || 0) > 0) {
      o.detail = '时长 ' + r.duration + ' 分钟';
    } else if (r.feedMethod === 'mixed' && r.duration > 0) {
      o.detail = '奶量 ' + (r.amount || 0) + ' ml · ' + r.duration + ' 分钟';
    } else {
      o.detail = '奶量 ' + (r.amount || 0) + ' ml';
    }
    o.iconKey = r.feedMethod === 'breast' ? 'feed19' : 'bottle19';
    o.icBg = 'feedS';
  } else if (r.type === 'diaper') {
    o.title = '换尿布 · ' + (DIAPER_TXT[r.diaperType] || '');
    o.detail = r.note || '状态正常';
    o.iconKey = 'diaper19';
    o.icBg = 'diaperS';
  } else if (r.type === 'sleep') {
    o.title = '睡眠';
    o.detail = T.fmtDur(r.duration || 0) +
      (r.start && r.end ? ' · ' + T.fmtHM(r.start) + ' - ' + T.fmtHM(r.end) : '');
    o.iconKey = 'sleep19';
    o.icBg = 'sleepS';
  } else if (r.type === 'growth') {
    o.title = '成长测量';
    var parts = [];
    if (r.weight > 0) { parts.push('体重 ' + r.weight + ' kg'); }
    if (r.height > 0) { parts.push('身高 ' + r.height + ' cm'); }
    if (r.headCirc > 0) { parts.push('头围 ' + r.headCirc + ' cm'); }
    o.detail = parts.join(' · ') || '已记录';
    o.iconKey = 'growth19';
    o.icBg = 'growthS';
  } else if (r.type === 'med') {
    o.title = medLabel(r);
    o.detail = (r.dose ? r.dose : '已服用') + (r.note ? ' · ' + r.note : '');
    o.iconKey = 'med19';
    o.icBg = 'priSoft';
  } else if (r.type === 'temp') {
    var slotName = tempSlot(r) === 'pm' ? '晚测' : '早测';
    var flag = tempFlag(r.celsius);
    o.title = '体温 · ' + slotName;
    o.detail = fmtC(r.celsius) + ' °C' + (flag ? ' · ' + flag : '') + (r.note ? ' · ' + r.note : '');
    o.iconKey = 'temp19';
    o.icBg = 'tempS';
  }
  return o;
}

module.exports = {
  MEDS: MEDS, medLabel: medLabel, rowOf: rowOf,
  tempSlot: tempSlot, tempFlag: tempFlag, fmtC: fmtC
};
