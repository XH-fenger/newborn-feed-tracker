// time.js —— 时间格式化与日龄计算
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function fmtHM(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function fmtYMD(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function fmtMD(ts) { var d = new Date(ts); return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function fmtCNMD(ts) { var d = new Date(ts); return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'; }

function dayKey(ts) { return fmtYMD(ts); }

// 今天零点
function todayStart() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysAgoStart(n) {
  return todayStart() - n * 86400000;
}

// 分组标题：今天 / 昨天 / M月D日
function dayLabel(key) {
  if (key === fmtYMD(Date.now())) { return '今天'; }
  if (key === fmtYMD(Date.now() - 86400000)) { return '昨天'; }
  var p = key.split('-');
  return parseInt(p[1], 10) + ' 月 ' + parseInt(p[2], 10) + ' 日';
}

// 日龄（出生第 1 天记为第 1 天）
function ageDays(birthday, now) {
  if (!birthday) { return 0; }
  var b = new Date(birthday + 'T00:00:00');
  if (isNaN(b.getTime())) { return 0; }
  now = now || Date.now();
  var n = new Date(now);
  var b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  var n0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.max(0, Math.round((n0 - b0) / 86400000)) + 1;
}

function weeksDays(dayN) {
  // 出生当天为第 1 天 → 满 7 天为「1 周」
  var w = Math.floor(Math.max(0, dayN - 1) / 7);
  var d = Math.max(0, dayN - 1) % 7;
  return { w: w, d: d };
}

// 首页 chip：第 N 天
function ageDayText(birthday) { return '第 ' + ageDays(birthday) + ' 天'; }

// hero 副标题：6 周 / 6 周 3 天 / 5 天
function ageText(birthday) {
  var dayN = ageDays(birthday);
  var wd = weeksDays(dayN);
  if (dayN <= 0) { return '出生日期未设置'; }
  if (wd.w <= 0) { return wd.d + ' 天'; }
  if (wd.d === 0) { return wd.w + ' 周'; }
  return wd.w + ' 周 ' + wd.d + ' 天';
}

// 时长（分钟）→「2 小时 10 分」「45 分」
function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (h <= 0) { return m + ' 分'; }
  if (m === 0) { return h + ' 小时'; }
  return h + ' 小时 ' + m + ' 分';
}

// 小时展示（保留 1 位小数）：14.3
function hoursOf(min) { return Math.round(min / 6) / 10; }

// picker 默认值
function nowHM() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function nowYMD() { return fmtYMD(Date.now()); }

// 'YYYY-MM-DD' + 'HH:mm' → 时间戳
function tsOf(dateStr, hmStr) {
  var d = new Date(dateStr + 'T' + (hmStr || '00:00') + ':00');
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

// 相对天数（-1=昨天），供统计 x 轴
function dateNdaysAgo(n) { return daysAgoStart(n); }

module.exports = {
  pad2: pad2, fmtHM: fmtHM, fmtYMD: fmtYMD, fmtMD: fmtMD, fmtCNMD: fmtCNMD,
  dayKey: dayKey, todayStart: todayStart, daysAgoStart: daysAgoStart, dayLabel: dayLabel,
  ageDays: ageDays, weeksDays: weeksDays, ageDayText: ageDayText, ageText: ageText,
  fmtDur: fmtDur, hoursOf: hoursOf, nowHM: nowHM, nowYMD: nowYMD, tsOf: tsOf,
  dateNdaysAgo: dateNdaysAgo
};
