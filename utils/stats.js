// stats.js —— 统计计算（今日概览 / 近 7 天聚合 / 成长曲线 / 我的页数据条）
var T = require('./time.js');
var rowsOf = require('./recordRow.js');

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

// —— 今日早测 / 晚测（各取该时段最新一笔）——
function todayTemp(records) {
  var start = T.todayStart();
  var am = null, pm = null;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (r.type !== 'temp' || !(r.celsius > 0) || r.time < start) { continue; }
    var slot = rowsOf.tempSlot(r);
    if (slot === 'am' && (!am || r.time > am.time)) { am = r; }
    if (slot === 'pm' && (!pm || r.time > pm.time)) { pm = r; }
  }
  return { am: am, pm: pm };
}

function slotView(rec, emptySub) {
  if (!rec) {
    return { empty: true, text: '待测', sub: emptySub, hi: false, lo: false, id: '' };
  }
  var flag = rowsOf.tempFlag(rec.celsius);
  return {
    empty: false,
    text: rowsOf.fmtC(rec.celsius),
    sub: T.fmtHM(rec.time) + (flag ? ' · ' + flag : ''),
    hi: flag === '偏高',
    lo: flag === '偏低',
    id: rec.id
  };
}

function todayTempView(records) {
  var t = todayTemp(records);
  return { am: slotView(t.am, '建议 8:00'), pm: slotView(t.pm, '建议 20:00') };
}

// —— 近 N 天体温：每天早、晚各保留最新一笔 ——
function tempDays(records, n) {
  var start = T.daysAgoStart(n - 1);
  var map = {};
  records.forEach(function (r) {
    if (r.type !== 'temp' || !(r.celsius > 0) || r.time < start) { return; }
    var key = T.dayKey(r.time);
    if (!map[key]) { map[key] = { key: key, ts: new Date(key + 'T00:00:00').getTime(), am: null, pm: null }; }
    var slot = rowsOf.tempSlot(r);
    var cur = map[key][slot];
    if (!cur || r.time > cur.time) { map[key][slot] = r; }
  });
  return Object.keys(map).sort().map(function (k) { return map[k]; });
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
  todayStats: todayStats, todayTemp: todayTemp, todayTempView: todayTempView, tempDays: tempDays,
  lastFeed: lastFeed, lastN: lastN,
  dailyAgg: dailyAgg, avg: avg, growthSeries: growthSeries, mineStats: mineStats
};
