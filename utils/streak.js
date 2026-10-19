// 连续记录：某天至少有一条记录即算记录日。今天还没记时，连续从昨天往前数。
var T = require('./time.js');

var MARKS = [7, 14, 28];

function dayMap(records) {
  var map = {};
  records.forEach(function (r) {
    if (!r || !r.time) { return; }
    var k = T.dayKey(r.time);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function streakCount(map) {
  var ts = T.todayStart();
  if (!map[T.fmtYMD(ts)]) { ts -= 86400000; }
  var n = 0;
  while (map[T.fmtYMD(ts)]) {
    n++;
    ts -= 86400000;
    if (n > 4000) { break; }
  }
  return n;
}

function nextGoal(streak) {
  for (var i = 0; i < MARKS.length; i++) {
    if (streak < MARKS[i]) { return MARKS[i]; }
  }
  return 0;
}

function marks(streak) {
  return MARKS.map(function (n) {
    return { n: n, left: Math.round(n / 28 * 1000) / 10, on: streak >= n, label: n + '天' };
  });
}

function monthGrid(year, month, map) {
  var todayKey = T.fmtYMD(Date.now());
  var first = new Date(year, month - 1, 1);
  var pad = first.getDay();
  var daysIn = new Date(year, month, 0).getDate();
  var prevDays = new Date(year, month - 1, 0).getDate();
  var cells = [];
  var i;
  for (i = 0; i < pad; i++) {
    cells.push(cellOf(new Date(year, month - 2, prevDays - pad + 1 + i), true, map, todayKey));
  }
  for (i = 1; i <= daysIn; i++) {
    cells.push(cellOf(new Date(year, month - 1, i), false, map, todayKey));
  }
  var tail = 1;
  while (cells.length % 7 !== 0) {
    cells.push(cellOf(new Date(year, month, tail), true, map, todayKey));
    tail++;
  }
  return cells;
}

function cellOf(date, out, map, todayKey) {
  var key = T.fmtYMD(date.getTime());
  var hit = !!map[key];
  var today = key === todayKey;
  return {
    key: key,
    n: date.getDate(),
    out: out,
    hit: hit,
    today: today
  };
}

module.exports = {
  MARKS: MARKS,
  dayMap: dayMap,
  streakCount: streakCount,
  nextGoal: nextGoal,
  marks: marks,
  monthGrid: monthGrid
};
