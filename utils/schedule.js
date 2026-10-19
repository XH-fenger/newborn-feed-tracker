// schedule.js —— 待办日期文案，以及按出生日推算的常见接种 / 体检草稿
// 疫苗月龄对齐《国家免疫规划疫苗儿童免疫程序及说明（2021年版）》常规剂次
// （乙脑、甲肝取减毒活疫苗那一套）。这是提醒草稿，不是接种医嘱。
var T = require('./time.js');

var KINDS = [
  { k: 'vaccine', t: '疫苗' },
  { k: 'checkup', t: '体检' },
  { k: 'other', t: '其他' }
];

var KIND_NAME = { vaccine: '疫苗', checkup: '体检', other: '其他' };

var VACCINES = [
  { m: 0, title: '乙肝疫苗第1剂', dose: '第1剂' },
  { m: 0, title: '卡介苗', dose: '' },
  { m: 1, title: '乙肝疫苗第2剂', dose: '第2剂' },
  { m: 2, title: '脊灰灭活疫苗第1剂', dose: '第1剂' },
  { m: 3, title: '脊灰灭活疫苗第2剂', dose: '第2剂' },
  { m: 3, title: '百白破疫苗第1剂', dose: '第1剂' },
  { m: 4, title: '脊灰减毒活疫苗第3剂', dose: '第3剂' },
  { m: 4, title: '百白破疫苗第2剂', dose: '第2剂' },
  { m: 5, title: '百白破疫苗第3剂', dose: '第3剂' },
  { m: 6, title: '乙肝疫苗第3剂', dose: '第3剂' },
  { m: 6, title: 'A群流脑疫苗第1剂', dose: '第1剂' },
  { m: 8, title: '麻腮风疫苗第1剂', dose: '第1剂' },
  { m: 8, title: '乙脑减毒活疫苗第1剂', dose: '第1剂' },
  { m: 9, title: 'A群流脑疫苗第2剂', dose: '第2剂' },
  { m: 18, title: '百白破疫苗第4剂', dose: '第4剂' },
  { m: 18, title: '麻腮风疫苗第2剂', dose: '第2剂' },
  { m: 18, title: '甲肝减毒活疫苗', dose: '' },
  { m: 24, title: '乙脑减毒活疫苗第2剂', dose: '第2剂' },
  { m: 36, title: 'A群C群流脑疫苗第1剂', dose: '第1剂' },
  { m: 48, title: '脊灰减毒活疫苗第4剂', dose: '第4剂' },
  { m: 72, title: '白破疫苗', dose: '' },
  { m: 72, title: 'A群C群流脑疫苗第2剂', dose: '第2剂' }
];

var CHECKUPS = [
  { d: 42, title: '42天体检' },
  { m: 1, title: '满月体检' },
  { m: 3, title: '3月龄体检' },
  { m: 6, title: '6月龄体检' },
  { m: 8, title: '8月龄体检' },
  { m: 12, title: '12月龄体检' },
  { m: 18, title: '18月龄体检' },
  { m: 24, title: '2岁体检' },
  { m: 30, title: '2岁半体检' },
  { m: 36, title: '3岁体检' },
  { m: 48, title: '4岁体检' },
  { m: 60, title: '5岁体检' },
  { m: 72, title: '6岁体检' }
];

function addMonths(ymd, months) {
  var p = ymd.split('-');
  var y = parseInt(p[0], 10);
  var m = parseInt(p[1], 10) - 1;
  var d = parseInt(p[2], 10);
  var first = new Date(y, m + months, 1);
  var last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d, last)).getTime();
}

function addDays(ymd, days) {
  var p = ymd.split('-');
  var dt = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  dt.setDate(dt.getDate() + days);
  return dt.getTime();
}

function dueOf(birthday, item) {
  if (item.d) { return addDays(birthday, item.d); }
  return addMonths(birthday, item.m || 0);
}

function buildDraft(birthday) {
  var list = [];
  VACCINES.forEach(function (item) {
    list.push({ kind: 'vaccine', title: item.title, due: dueOf(birthday, item), note: '', dose: item.dose || '' });
  });
  CHECKUPS.forEach(function (item) {
    list.push({ kind: 'checkup', title: item.title, due: dueOf(birthday, item), note: '' });
  });
  return list;
}

function dueLabel(due) {
  var diff = Math.round((due - T.todayStart()) / 86400000);
  if (diff === 0) { return '今天'; }
  if (diff === 1) { return '明天'; }
  if (diff === 2) { return '后天'; }
  if (diff === -1) { return '逾期 1 天'; }
  if (diff < 0) { return '逾期 ' + (-diff) + ' 天'; }
  return diff + ' 天后';
}

function kindName(k) { return KIND_NAME[k] || '其他'; }

module.exports = {
  KINDS: KINDS,
  buildDraft: buildDraft,
  dueLabel: dueLabel,
  kindName: kindName
};
