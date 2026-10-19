// repeat.js —— 「同上一次」：取最近一条同类记录，按当前时间生成一条新记录
// 只做数据构造，写入与提示由页面负责（记录页 / 首页共用）
var T = require('./time.js');
var rowsOf = require('./recordRow.js');

var SEG_NAME = { feed: '喂养', diaper: '尿布', sleep: '睡眠', growth: '成长', med: '补充剂', temp: '体温', bath: '洗澡' };
var FEED_NAME = { breast: '母乳', formula: '奶粉', mixed: '混合' };
var SIDE_NAME = { left: '左侧', right: '右侧', both: '双侧' };
var DIAPER_NAME = { pee: '尿', poop: '便', both: '尿+便' };
var MED_NAME = { k1: '维生素K1', vd: '维生素D', ad: '维生素AD', iron: '铁剂' };

// 最近一条同类记录（不依赖数组顺序，按 time 取最大）
function lastOf(records, seg) {
  if (!records || !records.length) { return null; }
  var best = null;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (r.type !== seg) { continue; }
    if (!best || r.time > best.time) { best = r; }
  }
  return best;
}

// 构造新记录（time = 当前时间）；成长类不做重复，返回 null
function build(last, now) {
  if (!last) { return null; }
  var t = now || Date.now();
  if (last.type === 'feed') {
    var rec = { type: 'feed', time: t, feedMethod: last.feedMethod || 'breast', note: '' };
    if (rec.feedMethod === 'mixed') {
      rec.side = last.side || 'right';
      rec.duration = last.duration > 0 ? last.duration : 15;
    }
    rec.amount = last.amount > 0 ? last.amount : 50;
    return rec;
  }
  if (last.type === 'diaper') {
    return { type: 'diaper', time: t, diaperType: last.diaperType || 'poop', note: '' };
  }
  if (last.type === 'sleep') {
    var dur = last.duration > 0 ? last.duration : 60;
    return { type: 'sleep', time: t - dur * 60000, start: t - dur * 60000, end: t, duration: dur, note: '' };
  }
  if (last.type === 'med') {
    return {
      type: 'med', time: t,
      medKey: last.medKey || 'vd', medName: last.medName || '', dose: last.dose || '', note: ''
    };
  }
  if (last.type === 'temp') {
    // 时段跟随当前时间（早上重复就记早测，晚上重复记晚测）
    return { type: 'temp', time: t, slot: rowsOf.tempSlot({ time: t }), celsius: last.celsius, note: '' };
  }
  if (last.type === 'bath') {
    return { type: 'bath', time: t, duration: last.duration > 0 ? last.duration : 10, note: '' };
  }
  return null;
}

// 一行摘要文案：「母乳 · 右侧 · 15 分钟 · 60 ml · 20:30」
function label(last) {
  if (!last) { return ''; }
  var hm = T.fmtHM(last.time);
  var p = [];
  if (last.type === 'feed') {
    p.push(FEED_NAME[last.feedMethod] || '母乳');
    if (last.feedMethod === 'mixed') {
      p.push(SIDE_NAME[last.side] || '右侧');
      if (last.duration > 0) { p.push(last.duration + ' 分钟'); }
    }
    if (last.amount > 0) { p.push(last.amount + ' ml'); }
  } else if (last.type === 'diaper') {
    p.push(DIAPER_NAME[last.diaperType] || '便');
  } else if (last.type === 'sleep') {
    p.push(T.fmtDur(last.duration || 0));
  } else if (last.type === 'med') {
    p.push(MED_NAME[last.medKey] || last.medName || '补充剂');
    if (last.dose) { p.push(last.dose); }
  } else if (last.type === 'temp') {
    p.push((last.celsius > 0 ? last.celsius : '—') + ' °C');
    p.push(rowsOf.tempSlot(last) === 'pm' ? '晚测' : '早测');
  } else if (last.type === 'bath') {
    p.push((last.duration > 0 ? last.duration : 10) + ' 分钟');
  }
  p.push(hm);
  return p.join(' · ');
}

function segName(seg) { return SEG_NAME[seg] || ''; }

module.exports = {
  lastOf: lastOf, build: build, label: label, segName: segName,
  SEG_NAME: SEG_NAME, FEED_NAME: FEED_NAME, DIAPER_NAME: DIAPER_NAME
};
