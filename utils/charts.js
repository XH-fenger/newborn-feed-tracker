// charts.js —— canvas 2d 自绘图表（零依赖）：渐变圆角柱 + 入场生长动画 + 成长折线
function rgbaOf(hex, a) {
  var h = hex.replace('#', '');
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
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
    ctx.fillStyle = o.axl;
    ctx.font = '600 ' + Math.round(9 * sx) + 'px sans-serif';
    ctx.textAlign = 'center';
    bars.forEach(function (b) {
      ctx.fillText(b.label, b.x + barW / 2, 150 * sy);
    });
  }

  var t0 = null;
  var total = n * 60 + 420;
  function frame(ts) {
    if (t0 === null) { t0 = ts; }
    var el = ts - t0;
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
    if (el < total) {
      if (cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); }
    }
  }
  if (cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); } else { frame(0); frame(1000); }
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
    ctx.fillStyle = o.axl;
    ctx.font = '600 ' + Math.round(9 * sx) + 'px sans-serif';
    ctx.textAlign = 'center';
    pts.forEach(function (p, i) { ctx.fillText(p.label, xOf(i), 150 * sy); });
  }

  var t0 = null;
  function frame(ts) {
    if (t0 === null) { t0 = ts; }
    var p = Math.min(1, (ts - t0) / 800);
    var eased = 1 - Math.pow(1 - p, 3);
    var cutX = L + (R - L) * eased;

    ctx.clearRect(0, 0, w, h);
    drawGrid();

    // 面积 + 折线（clip 揭示）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cutX, h);
    ctx.clip();

    // 面积
    ctx.beginPath();
    ctx.moveTo(xOf(0), base);
    pts.forEach(function (pt, i) { ctx.lineTo(xOf(i), yOf(pt.v)); });
    ctx.lineTo(xOf(n - 1), base);
    ctx.closePath();
    ctx.fillStyle = rgbaOf(o.color, .2 * p);
    ctx.fill();

    // 折线
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

    // 白心数据点（揭示到该点后弹出）
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

    if (p < 1) {
      if (cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); }
    }
  }
  if (cv.requestAnimationFrame) { cv.requestAnimationFrame(frame); } else { frame(0); frame(1000); }
}

module.exports = { setupCanvas: setupCanvas, drawBar: drawBar, drawLine: drawLine, rgbaOf: rgbaOf };
