// charts.js —— canvas 2d 自绘图表（零依赖）：渐变圆角柱 + 入场生长动画 + 成长折线
function rgbaOf(hex, a) {
  var h = hex.replace('#', '');
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

var animSeq = 0;
var motion = require('./motion.js');

function schedule(cv, fn) {
  if (cv && cv.requestAnimationFrame) { cv.requestAnimationFrame(fn); }
}

// 横轴标签过密时抽稀：放得下就每天都标，放不下则跳着标，并始终保留首尾。
function labelIndexes(n, slot, labelWidth) {
  if (n <= 0) { return []; }
  if (n === 1) { return [0]; }
  var need = Math.max(8, labelWidth) + 4;
  var step = slot >= need ? 1 : Math.ceil(need / Math.max(slot, 1));
  var idx = [];
  var i;
  for (i = 0; i < n; i += step) { idx.push(i); }
  var last = idx[idx.length - 1];
  if (last !== n - 1) {
    if ((n - 1 - last) * slot < labelWidth && idx.length > 1) { idx[idx.length - 1] = n - 1; }
    else { idx.push(n - 1); }
  }
  return idx;
}

function roundedRect(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) { return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 获取 canvas 2d 节点（含 dpr 适配），cb(ctx, canvas, w, h)
function setupCanvas(page, id, cb) {
  var q = page.createSelectorQuery();
  q.select('#' + id).fields({ node: true, size: true }).exec(function (res) {
    if (!res || !res[0] || !res[0].node) { return; }
    var cv = res[0].node;
    var dpr = 2;
    try { dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2; } catch (e) { }
    var w = res[0].width || 320;
    var h = res[0].height || 158;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    cb(ctx, cv, w, h);
  });
}

/* ---------- 柱状图（渐变 + 圆角 + stagger 生长动画） ---------- */
// o: { values:[], labels:[], color, grid, axl }
function drawBar(ctx, cv, w, h, o) {
  var sx = w / 320;
  var sy = h / 158;
  var L = 34 * sx, R = w - 8 * sx;
  var base = 132.5 * sy;
  var top = 37 * sy;
  var n = o.values.length;
  var slot = (R - L) / Math.max(1, n);
  var barW = Math.min(26 * sx, slot * 0.72);
  var maxV = Math.max.apply(null, o.values);
  if (maxV <= 0) { maxV = 1; }
  var H = base - top;

  var bars = o.values.map(function (v, i) {
    return {
      x: L + slot * i + (slot - barW) / 2,
      hgt: (v / maxV) * H,
      v: v,
      label: o.labels[i]
    };
  });

  function drawGrid() {
    var ys = [base, 92.5 * sy, 52.5 * sy];
    ys.forEach(function (y, i) {
      ctx.strokeStyle = o.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 0 ? [] : [3, 5]);
      ctx.beginPath();
      ctx.moveTo(L, y + .5);
      ctx.lineTo(R, y + .5);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function drawAxes() {
    var fontPx = Math.round(12 * sx);
    ctx.fillStyle = o.axl;
    ctx.font = '600 ' + fontPx + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var lw = 0;
    bars.forEach(function (b) {
      if (!b.label) { return; }
      var wdt = ctx.measureText(b.label).width;
      if (wdt > lw) { lw = wdt; }
    });
    labelIndexes(bars.length, slot, lw).forEach(function (i) {
      var b = bars[i];
      if (b && b.label) { ctx.fillText(b.label, b.x + barW / 2, 150 * sy); }
    });
  }

  var seq = ++animSeq;
  var t0 = 0;
  var total = n * 60 + 420;
  function frame() {
    if (seq !== animSeq) { return; }
    var now = Date.now();
    if (!t0) { t0 = now; }
    var el = now - t0;
    try {
      ctx.clearRect(0, 0, w, h);
      drawGrid();
      bars.forEach(function (b, i) {
        var p = Math.min(1, Math.max(0, (el - i * 60) / 380));
        var eased = 1 - Math.pow(1 - p, 3);
        var bh = b.hgt * eased;
        if (bh < 1) { return; }
        var grad = ctx.createLinearGradient(0, base - bh, 0, base);
        grad.addColorStop(0, o.color);
        grad.addColorStop(1, rgbaOf(o.color, .28));
        ctx.fillStyle = grad;
        roundedRect(ctx, b.x, base - bh, barW, bh, 8 * sx);
        ctx.fill();
      });
      drawAxes();
    } catch (e) { return; }
    if (el < total) { schedule(cv, frame); }
  }
  if (motion.reduced()) { t0 = Date.now() - total; frame(); return; }
  if (cv && cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); }
  else { t0 = Date.now() - total; frame(); }
}

/* ---------- 成长折线图（渐变面积 + 描线揭示 + 白心数据点） ---------- */
// o: { points:[{label, v}], color, grid, axl, card }
function drawLine(ctx, cv, w, h, o) {
  var sx = w / 320;
  var sy = h / 158;
  var L = 34 * sx, R = w - 22 * sx;
  var base = 132.5 * sy;
  var top = 40 * sy;
  var pts = o.points;
  var n = pts.length;

  var vals = pts.map(function (p) { return p.v; });
  var minV = Math.min.apply(null, vals);
  var maxV = Math.max.apply(null, vals);
  if (maxV === minV) { maxV = minV + 1; }
  var pad = (maxV - minV) * 0.18;
  minV -= pad; maxV += pad;

  function xOf(i) {
    if (n === 1) { return (L + R) / 2; }
    return L + (R - L) * (i / (n - 1));
  }
  function yOf(v) {
    return base - ((v - minV) / (maxV - minV)) * (base - top);
  }

  function drawGrid() {
    var ys = [base, 92.5 * sy, 52.5 * sy];
    ys.forEach(function (y, i) {
      ctx.strokeStyle = o.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 0 ? [] : [3, 5]);
      ctx.beginPath();
      ctx.moveTo(L, y + .5);
      ctx.lineTo(R, y + .5);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  function drawAxes() {
    var fontPx = Math.round(12 * sx);
    var gap = n <= 1 ? (R - L) : (R - L) / (n - 1);
    ctx.fillStyle = o.axl;
    ctx.font = '600 ' + fontPx + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var lw = 0;
    pts.forEach(function (p) {
      if (!p.label) { return; }
      var wdt = ctx.measureText(p.label).width;
      if (wdt > lw) { lw = wdt; }
    });
    labelIndexes(n, gap, lw).forEach(function (i) {
      if (pts[i] && pts[i].label) { ctx.fillText(pts[i].label, xOf(i), 150 * sy); }
    });
  }

  var seq = ++animSeq;
  var t0 = 0;
  function frame() {
    if (seq !== animSeq) { return; }
    var now = Date.now();
    if (!t0) { t0 = now; }
    var p = Math.min(1, (now - t0) / 800);
    var eased = 1 - Math.pow(1 - p, 3);
    var cutX = L + (R - L) * eased;
    try {
      ctx.clearRect(0, 0, w, h);
      drawGrid();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cutX, h);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(xOf(0), base);
      pts.forEach(function (pt, i) { ctx.lineTo(xOf(i), yOf(pt.v)); });
      ctx.lineTo(xOf(n - 1), base);
      ctx.closePath();
      ctx.fillStyle = rgbaOf(o.color, .2 * p);
      ctx.fill();
      ctx.beginPath();
      pts.forEach(function (pt, i) {
        var x = xOf(i), y = yOf(pt.v);
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      });
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3 * sx;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      pts.forEach(function (pt, i) {
        var x = xOf(i);
        if (x > cutX + 1) { return; }
        ctx.beginPath();
        ctx.arc(x, yOf(pt.v), 4.5 * sx, 0, Math.PI * 2);
        ctx.fillStyle = o.card;
        ctx.fill();
        ctx.lineWidth = 3 * sx;
        ctx.strokeStyle = o.color;
        ctx.stroke();
      });
      drawAxes();
    } catch (e) { return; }
    if (p < 1) { schedule(cv, frame); }
  }
  if (motion.reduced()) { t0 = Date.now() - 800; frame(); return; }
  if (cv && cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); }
  else { t0 = Date.now() - 800; frame(); }
}

/* ---------- 成长对照图：WHO 百分位参考线 + 宝宝实测折线 ---------- */
// o: { babyPoints:[{m,v}], who:[{m,p3,p15,p50,p85,p97}], color, grid, axl, card, maxMonths, xLabels:[{m,t}] }
function drawGrowth(ctx, cv, w, h, o) {
  var sx = w / 320, sy = h / 158;
  var L = 34 * sx, R = w - 14 * sx;
  var base = 132.5 * sy, top = 22 * sy;
  var baby = o.babyPoints || [];
  var who = o.who || [];
  var maxM = o.maxMonths || 24;

  var allV = [];
  who.forEach(function (p) { if (p.p3 != null) { allV.push(p.p3, p.p97); } });
  baby.forEach(function (p) { if (p.v != null) { allV.push(p.v); } });
  if (!allV.length) { allV = [0, 1]; }
  var minV = Math.min.apply(null, allV);
  var maxV = Math.max.apply(null, allV);
  var pad = (maxV - minV) * 0.15; if (!(pad > 0)) { pad = 1; }
  minV -= pad; maxV += pad;

  function xOf(m) { return L + (R - L) * (Math.max(0, Math.min(maxM, m)) / maxM); }
  function yOf(v) { return base - ((v - minV) / (maxV - minV)) * (base - top); }

  function grid() {
    var ys = [base, 92.5 * sy, 52.5 * sy];
    ys.forEach(function (y, i) {
      ctx.strokeStyle = o.grid; ctx.lineWidth = 1;
      ctx.setLineDash(i === 0 ? [] : [3, 5]);
      ctx.beginPath(); ctx.moveTo(L, y + .5); ctx.lineTo(R, y + .5); ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  function axes() {
    ctx.fillStyle = o.axl; ctx.font = '600 ' + Math.round(11 * sx) + 'px sans-serif';
    ctx.textAlign = 'center';
    (o.xLabels || []).forEach(function (lb) { ctx.fillText(lb.t, xOf(lb.m), 150 * sy); });
  }
  function poly(getter, color, width, dash) {
    if (who.length < 2) { return; }
    ctx.strokeStyle = color; ctx.lineWidth = width * sx; ctx.lineJoin = 'round';
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    who.forEach(function (p, i) {
      var x = xOf(p.m), y = yOf(getter(p));
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  var seq = ++animSeq;
  var t0 = 0;
  function frame() {
    if (seq !== animSeq) { return; }
    var now = Date.now();
    if (!t0) { t0 = now; }
    var p = Math.min(1, (now - t0) / 700);
    var eased = 1 - Math.pow(1 - p, 3);
    var cutX = L + (R - L) * eased;
    try {
      ctx.clearRect(0, 0, w, h);
      grid();
      poly(function (pp) { return pp.p3; }, rgbaOf(o.color, .32), 1, [4, 4]);
      poly(function (pp) { return pp.p97; }, rgbaOf(o.color, .32), 1, [4, 4]);
      poly(function (pp) { return pp.p50; }, rgbaOf(o.color, .6), 1.6, [2, 3]);
      if (baby.length) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, cutX, h); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(xOf(baby[0].m), base);
        baby.forEach(function (pt) { ctx.lineTo(xOf(pt.m), yOf(pt.v)); });
        ctx.lineTo(xOf(baby[baby.length - 1].m), base);
        ctx.closePath();
        ctx.fillStyle = rgbaOf(o.color, .18 * p); ctx.fill();
        ctx.beginPath();
        baby.forEach(function (pt, i) {
          var x = xOf(pt.m), y = yOf(pt.v);
          if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        });
        ctx.strokeStyle = o.color; ctx.lineWidth = 3 * sx; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
        baby.forEach(function (pt) {
          var x = xOf(pt.m);
          if (x > cutX + 1) { return; }
          ctx.beginPath();
          ctx.arc(x, yOf(pt.v), 4 * sx, 0, Math.PI * 2);
          ctx.fillStyle = o.card; ctx.fill();
          ctx.lineWidth = 2.6 * sx; ctx.strokeStyle = o.color; ctx.stroke();
        });
      }
      axes();
    } catch (e) { return; }
    if (p < 1) { schedule(cv, frame); }
  }
  if (motion.reduced()) { t0 = Date.now() - 700; frame(); return; }
  if (cv && cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); }
  else { t0 = Date.now() - 700; frame(); }
}

module.exports = { setupCanvas: setupCanvas, drawBar: drawBar, drawLine: drawLine, drawGrowth: drawGrowth, rgbaOf: rgbaOf };
