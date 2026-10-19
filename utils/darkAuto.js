// 定时暗黑：判断当前是否落在时间段内，并算出下一次切换还要等多久。
// 跨夜时段（19:00–07:00）从开始一直覆盖到次日结束。

function parseHM(str, fallback) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(str || '');
  if (!m) { return fallback; }
  var h = parseInt(m[1], 10);
  var min = parseInt(m[2], 10);
  if (h > 23 || min > 59) { return fallback; }
  return h * 60 + min;
}

function fmtHM(mins) {
  mins = ((mins % 1440) + 1440) % 1440;
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function isHM(str) {
  return parseHM(str, -1) >= 0;
}

function startMin(s) { return parseHM(s && s.darkStart, 19 * 60); }
function endMin(s) { return parseHM(s && s.darkEnd, 7 * 60); }

function inWindow(now, s) {
  var start = startMin(s);
  var end = endMin(s);
  if (start === end) { return false; }
  var d = new Date(now);
  var cur = d.getHours() * 60 + d.getMinutes();
  if (start < end) { return cur >= start && cur < end; }
  return cur >= start || cur < end;
}

function zone(now, s) {
  return inWindow(now, s) ? 'in' : 'out';
}

// 手动开关在当前这段里优先，跨过开始或结束点后交回时间表
function desired(s, now) {
  if (!s || !s.darkAuto) {
    return { dark: !!(s && s.dark), clearHold: false };
  }
  var z = zone(now, s);
  var held = s.darkHold === 'on' || s.darkHold === 'off';
  if (held && s.darkHoldZone === z) {
    return { dark: s.darkHold === 'on', clearHold: false };
  }
  return { dark: z === 'in', clearHold: held };
}

function rangeText(s) {
  var start = startMin(s);
  var end = endMin(s);
  var a = fmtHM(start);
  var b = fmtHM(end);
  if (start === end) { return a + '–' + b; }
  if (start > end) { return a + '–次日 ' + b; }
  return a + '–' + b;
}

function nextBoundaryText(s, now) {
  var start = startMin(s);
  var end = endMin(s);
  return fmtHM(inWindow(now, s) ? end : start);
}

function darkHint(s, now) {
  if (!s || !s.darkAuto) { return '夜间柔光，呵护眼睛'; }
  if (s.darkHold === 'on' || s.darkHold === 'off') {
    return '已手动调整，保持到 ' + nextBoundaryText(s, now);
  }
  return rangeText(s) + ' 自动开启';
}

function msUntilNext(now, s) {
  var start = startMin(s);
  var end = endMin(s);
  if (start === end) { return 60 * 60000; }
  var d = new Date(now);
  var cur = d.getHours() * 60 + d.getMinutes();
  var passed = d.getSeconds() * 1000 + d.getMilliseconds();
  function wait(target) {
    var diffMin = target - cur;
    if (diffMin < 0) { diffMin += 1440; }
    var ms = diffMin * 60000 - passed;
    if (ms <= 500) { ms += 1440 * 60000; }
    return ms;
  }
  return Math.min(wait(start), wait(end));
}

module.exports = {
  parseHM: parseHM,
  fmtHM: fmtHM,
  isHM: isHM,
  inWindow: inWindow,
  zone: zone,
  desired: desired,
  rangeText: rangeText,
  darkHint: darkHint,
  msUntilNext: msUntilNext
};
