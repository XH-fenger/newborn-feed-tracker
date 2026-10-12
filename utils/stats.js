// stats.js —— 统计计算（今日概览 / 近 7 天聚合 / 成长曲线 / 我的页数据条）
var T = require('./time.js');

// —— 今日概览（首页 2×2 数据卡）——
function todayStats(records) {
  var start = T.todayStart();
  var feedCount = 0, feedMl = 0, diaper = 0, sleepMin = 0;
  records.forEach(function (r) {
    if (r.time < start) { return; }
    if (r.type === 'feed') {
      feedCount++;
      if (r.amount > 0) { feedMl += r.amount; }
    } else if (r.type === 'diaper') {
      diaper++;
    } else if (r.type === 'sleep') {
      if (r.duration > 0) { sleepMin += r.duration; }
    }
  });
  return { feedCount: feedCount, feedMl: feedMl, diaper: diaper, sleepMin: sleepMin };
}

// —— 最近一次喂养 ——
function lastFeed(records) {
  for (var i = 0; i < records.length; i++) {
    if (records[i].type === 'feed') { return records[i]; }
  }
  return null;
}

// —— 最近 N 条（已倒序）——
function lastN(records, n) { return records.slice(0, n); }

// —— 近 N 天每日聚合（含今天），返回按时间升序数组 ——
function dailyAgg(records, n) {
  var start = T.daysAgoStart(n - 1);
  var days = [];
  for (var i = 0; i < n; i++) {
    days.push({ ts: T.daysAgoStart(n - 1 - i), feedCount: 0, feedMl: 0, diaper: 0, sleepMin: 0 });
  }
  var idx = {};
  days.forEach(function (d, i) { idx[T.dayKey(d.ts)] = i; });
  records.forEach(function (r) {
    if (r.time < start) { return; }
    var i = idx[T.dayKey(r.time)];
    if (i === undefined) { return; }
    if (r.type === 'feed') {
      days[i].feedCount++;
      if (r.amount > 0) { days[i].feedMl += r.amount; }
    } else if (r.type === 'diaper') {
      days[i].diaper++;
    } else if (r.type === 'sleep') {
      if (r.duration > 0) { days[i].sleepMin += r.duration; }
    }
  });
  return days;
}

function avg(arr) {
  if (!arr.length) { return 0; }
  var s = 0;
  arr.forEach(function (v) { s += v; });
  return Math.round(s / arr.length * 10) / 10;
}

// —— 成长序列（按时间升序；出生体重放在首位） ——
function growthSeries(records, birthWeight) {
  var gs = records.filter(function (r) { return r.type === 'growth' && r.weight > 0; });
  gs.sort(function (a, b) { return a.time - b.time; });
  var out = [];
  if (birthWeight > 0) {
    var b = records.length ? null : null;
    // 出生日期由外部传入更准确，这里以首条成长记录前 41 天近似不可靠 → 仅当有生日时在 baby 页组装
    out.push({ label: '出生', weight: birthWeight, time: 0 });
  }
  gs.forEach(function (r, i) {
    out.push({ label: '第 ' + (i + 1) + ' 次', weight: r.weight, time: r.time });
  });
  return out;
}

// —— 我的页数据条 ——
function mineStats(records, birthday) {
  var count = records.length;
  if (count === 0) { return { count: 0, days: 0, daily: 0 }; }
  var first = records[records.length - 1].time;
  var now = Date.now();
  // 坚持天数 = 记录跨度天数（至少 1 天）
  var span = Math.round((T.todayStart() - new Date(T.fmtYMD(first) + 'T00:00:00').getTime()) / 86400000) + 1;
  if (span < 1) { span = 1; }
  var daily = Math.round(count / span * 10) / 10;
  return { count: count, days: span, daily: daily };
}

module.exports = {
  todayStats: todayStats, lastFeed: lastFeed, lastN: lastN,
  dailyAgg: dailyAgg, avg: avg, growthSeries: growthSeries, mineStats: mineStats
};
