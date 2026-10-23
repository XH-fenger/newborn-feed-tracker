// share.js —— 每日 / 每周图文摘要（canvas 绘制卡片 → 分享图片）
// 纯本地，无后端依赖。复用 stats 的计算能力，绘制一张可转发的摘要卡。
var storage = require('./storage.js');
var T = require('./time.js');
var stats = require('./stats.js');

var C = {
  bg: '#F3F5FB', card: '#FFFFFF', ink: '#1F2430', ink2: '#5B6472', ink3: '#9AA3B2',
  feed: '#4149C4', feedD: '#6A71E8', diaper: '#0A7A70', sleep: '#A8500F', temp: '#D93A3F', growth: '#0A7A70',
  feedS: '#EDEFFC', diaperS: '#E4F4F1', sleepS: '#FBF0E5', tempS: '#FCEBEB', growthS: '#E4F4F1',
  line: '#EDEFF4'
};

function ageLine() {
  var baby = storage.baby();
  var name = baby.name || '宝宝';
  var age = baby.birthday ? T.ageText(baby.birthday) : '待完善资料';
  return name + ' · ' + age;
}

// 今日摘要数据
function dailyData() {
  var records = storage.records();
  var t = stats.todayStats(records);
  var tt = stats.todayTempView(records);
  var gs = records.filter(function (r) { return r.type === 'growth'; }).sort(function (a, b) { return b.time - a.time; });
  var growth = '';
  if (gs.length) {
    var r = gs[0], p = [];
    if (r.weight > 0) { p.push(r.weight + 'kg'); }
    if (r.height > 0) { p.push(r.height + 'cm'); }
    if (r.headCirc > 0) { p.push(r.headCirc + 'cm'); }
    growth = p.join(' / ') || '已记录';
  } else if (storage.baby().birthWeight > 0) {
    growth = '出生 ' + storage.baby().birthWeight + 'kg';
  }
  // 今日 4 个时段的奶量分布
  var start = T.todayStart();
  var segs = [0, 0, 0, 0];
  records.forEach(function (r) {
    if (r.type !== 'feed' || r.time < start || !(r.amount > 0)) { return; }
    segs[Math.min(3, Math.floor(new Date(r.time).getHours() / 6))] += r.amount;
  });
  return {
    title: '今日喂养摘要',
    sub: T.fmtCNMD(Date.now()) + ' · 星期' + '日一二三四五六'.charAt(new Date(Date.now()).getDay()),
    baby: ageLine(),
    kpis: [
      { label: '今日奶量', v: t.feedMl, u: 'ml', c: C.feed, bg: C.feedS },
      { label: '喂养次数', v: t.feedCount, u: '次', c: C.diaper, bg: C.diaperS },
      { label: '睡眠时长', v: Math.round(t.sleepMin / 6) / 10, u: 'h', c: C.sleep, bg: C.sleepS }
    ],
    chartTitle: '今日分段奶量 (ml)',
    bars: [
      { label: '0-6点', v: segs[0] }, { label: '6-12点', v: segs[1] },
      { label: '12-18点', v: segs[2] }, { label: '18-24点', v: segs[3] }
    ],
    rows: [
      { k: '尿布', v: String(t.diaper), u: ' 次', sub: '今日更换', c: C.diaper, bg: C.diaperS },
      { k: '体温', v: (tt.am && !tt.am.empty ? tt.am.text : '—') + ' / ' + (tt.pm && !tt.pm.empty ? tt.pm.text : '—'), u: ' °C', sub: '早 / 晚', c: C.temp, bg: C.tempS },
      { k: '成长', v: growth, u: '', sub: '最近一次', c: C.growth, bg: C.growthS }
    ]
  };
}

// 近 7 天摘要数据
function weeklyData() {
  var records = storage.records();
  var days = stats.dailyAgg(records, 7);
  var totalMl = 0, totalFeed = 0, totalDiaper = 0, active = 0;
  days.forEach(function (d) {
    totalMl += d.feedMl; totalFeed += d.feedCount; totalDiaper += d.diaper;
    if (d.feedCount > 0) { active++; }
  });
  var bars = days.map(function (d) {
    var dt = new Date(d.ts);
    return { label: (dt.getMonth() + 1) + '/' + dt.getDate(), v: d.feedMl, today: T.dayKey(d.ts) === T.dayKey(Date.now()) };
  });
  return {
    title: '近 7 天摘要',
    sub: T.fmtYMD(days[0].ts).replace(/-/g, '/') + ' - ' + T.fmtYMD(days[6].ts).replace(/-/g, '/'),
    baby: ageLine(),
    kpis: [
      { label: '日均奶量', v: Math.round(totalMl / 7), u: 'ml', c: C.feed, bg: C.feedS },
      { label: '总喂养', v: totalFeed, u: '次', c: C.diaper, bg: C.diaperS },
      { label: '总尿布', v: totalDiaper, u: '次', c: C.sleep, bg: C.sleepS }
    ],
    chartTitle: '近 7 天奶量 (ml)',
    bars: bars,
    rows: [
      { k: '日均喂养', v: String(Math.round(totalFeed / 7 * 10) / 10), u: ' 次/天', sub: '平均到每天', c: C.feed, bg: C.feedS },
      { k: '日均尿布', v: String(Math.round(totalDiaper / 7 * 10) / 10), u: ' 次/天', sub: '平均到每天', c: C.diaper, bg: C.diaperS },
      { k: '记录天数', v: String(active), u: ' / 7 天', sub: '有喂养记录', c: C.growth, bg: C.growthS }
    ]
  };
}

// 周报 / 月报长图（n = 7 或 30）
function reportData(n) {
  n = n === 30 ? 30 : 7;
  var records = storage.records();
  var days = stats.dailyAgg(records, n);
  var sum = { ml: 0, feed: 0, diaper: 0, sleepMin: 0 };
  var activeDays = 0;
  days.forEach(function (d) {
    sum.ml += d.feedMl; sum.feed += d.feedCount; sum.diaper += d.diaper; sum.sleepMin += d.sleepMin;
    if (d.feedCount > 0) { activeDays++; }
  });
  var cmp = stats.comparePeriods(records, days[0].ts, days[n - 1].ts);
  var chip = function (k, pct, cur, prev) {
    var dir = 'flat', txt = '持平';
    if (pct === null) { dir = 'up'; txt = '新增'; }
    else if (pct > 0) { dir = 'up'; txt = '↑ ' + pct + '%'; }
    else if (pct < 0) { dir = 'down'; txt = '↓ ' + Math.abs(pct) + '%'; }
    return { k: k, dir: dir, txt: txt, cur: cur, prev: prev };
  };
  var cmpItems = cmp.has ? [
    chip('日均奶量', cmp.pct.ml, cmp.avgCur.ml + 'ml', cmp.avgPrev.ml + 'ml'),
    chip('日均尿布', cmp.pct.diaper, cmp.avgCur.diaper + '次', cmp.avgPrev.diaper + '次'),
    chip('日均睡眠', cmp.pct.sleep, cmp.avgCur.sleepH + 'h', cmp.avgPrev.sleepH + 'h')
  ] : [];

  // 体温区间（最高 / 最低）
  var tds = stats.tempDays(records, n);
  var tvals = [];
  tds.forEach(function (d) {
    if (d.am) { tvals.push(d.am.celsius); }
    if (d.pm) { tvals.push(d.pm.celsius); }
  });
  var tmax = tvals.length ? Math.max.apply(null, tvals) : 0;
  var tmin = tvals.length ? Math.min.apply(null, tvals) : 0;

  // 最近一次成长
  var gs = records.filter(function (r) { return r.type === 'growth'; }).sort(function (a, b) { return b.time - a.time; });
  var growth = '暂无记录';
  if (gs.length) {
    var g = gs[0], p = [];
    if (g.weight > 0) { p.push(g.weight + 'kg'); }
    if (g.height > 0) { p.push(g.height + 'cm'); }
    if (g.headCirc > 0) { p.push(g.headCirc + 'cm'); }
    growth = p.join(' / ') || '已记录';
  } else if (storage.baby().birthWeight > 0) {
    growth = '出生 ' + storage.baby().birthWeight + 'kg';
  }

  var bars = days.map(function (d) {
    var dt = new Date(d.ts);
    return { label: (dt.getMonth() + 1) + '/' + dt.getDate(), v: d.feedMl, today: T.dayKey(d.ts) === T.dayKey(Date.now()) };
  });

  return {
    kind: 'report',
    title: n === 7 ? '这一周的成长记录' : '这一个月的成长记录',
    sub: T.fmtYMD(days[0].ts).replace(/-/g, '/') + ' - ' + T.fmtYMD(days[n - 1].ts).replace(/-/g, '/') +
      ' · 记录 ' + activeDays + '/' + n + ' 天',
    baby: ageLine(),
    kpis: [
      { label: '总奶量', v: sum.ml, u: 'ml', c: C.feed, bg: C.feedS },
      { label: '日均奶量', v: Math.round(sum.ml / n), u: 'ml', c: C.diaper, bg: C.diaperS },
      { label: '喂养次数', v: sum.feed, u: '次', c: C.sleep, bg: C.sleepS }
    ],
    chartTitle: '近 ' + n + ' 天奶量 (ml)',
    bars: bars,
    compareTitle: n === 7 ? '较上一周（日均）' : '较上一个月（日均）',
    compare: cmpItems,
    rows: [
      { k: '总尿布', v: String(sum.diaper), u: ' 次', sub: '日均 ' + (Math.round(sum.diaper / n * 10) / 10) + ' 次', c: C.diaper, bg: C.diaperS },
      { k: '睡眠时长', v: String(Math.round(sum.sleepMin / 60)), u: ' h', sub: '日均 ' + (Math.round(sum.sleepMin / 6 / n) / 10) + ' h', c: C.sleep, bg: C.sleepS },
      { k: '体温范围', v: tvals.length ? (tmin + '~' + tmax) : '—', u: tvals.length ? ' °C' : '', sub: tvals.length ? '共 ' + tvals.length + ' 次测量' : '未记录', c: C.temp, bg: C.tempS },
      { k: '成长', v: growth, u: '', sub: '最近一次', c: C.growth, bg: C.growthS }
    ]
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, style) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = style;
  ctx.fill();
}

// 柔和的背景装饰（大圆 + 细网格感）
function drawBackdrop(ctx, w, h) {
  var g = null;
  try { g = ctx.createLinearGradient(0, 0, w, h); } catch (e) { g = null; }
  ctx.fillStyle = g || C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(65,73,196,0.05)';
  ctx.beginPath(); ctx.arc(w - 60, 130, 150, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(10,122,112,0.045)';
  ctx.beginPath(); ctx.arc(40, h - 140, 170, 0, Math.PI * 2); ctx.fill();
}

function drawHeader(ctx, x, y, w, data) {
  var h = 200;
  var g = null;
  try { g = ctx.createLinearGradient(x, y, x + w, y + h); } catch (e) { g = null; }
  if (g) { g.addColorStop(0, C.feed); g.addColorStop(1, C.feedD); }
  fillRound(ctx, x, y, w, h, 24, g || C.feed);

  // 右侧装饰圆 + 月亮
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.arc(x + w - 56, y + 34, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.arc(x + w - 118, y + h - 8, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(x + w - 64, y + 84, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.feed;
  ctx.beginPath(); ctx.arc(x + w - 54, y + 76, 22, 0, Math.PI * 2); ctx.fill();

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(data.title, x + 32, y + 26);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '24px sans-serif';
  ctx.fillText(data.baby, x + 32, y + 84);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText(data.sub, x + 32, y + 126);
}

function drawKpis(ctx, x, y, w, kpis) {
  var gap = 18;
  var tw = (w - gap * (kpis.length - 1)) / kpis.length;
  var th = 148;
  kpis.forEach(function (k, i) {
    var tx = x + i * (tw + gap);
    fillRound(ctx, tx, y, tw, th, 20, k.bg);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = k.c;
    ctx.font = '22px sans-serif';
    ctx.fillText(k.label, tx + tw / 2, y + 22);

    var vs = String(k.v);
    var numSize = 44;
    ctx.font = 'bold ' + numSize + 'px sans-serif';
    var vw = ctx.measureText(vs).width;
    ctx.font = '22px sans-serif';
    var uText = k.u ? k.u : '';
    var uw = uText ? ctx.measureText(uText).width : 0;
    var gapU = uText ? 6 : 0;
    while (vw + uw + gapU > tw - 28 && numSize > 28) {
      numSize -= 2;
      ctx.font = 'bold ' + numSize + 'px sans-serif';
      vw = ctx.measureText(vs).width;
    }
    var startX = tx + tw / 2 - (vw + uw + gapU) / 2;
    var base = y + 118;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = 'bold ' + numSize + 'px sans-serif';
    ctx.fillText(vs, startX, base);
    if (uText) {
      ctx.fillStyle = C.ink2;
      ctx.font = '22px sans-serif';
      ctx.fillText(uText, startX + vw + gapU, base);
    }
  });
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  return th;
}

function drawChart(ctx, x, y, w, title, bars) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.ink;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x, y);
  var valueGap = 28;
  var top = y + 52 + valueGap;
  var areaH = 150;
  var base = top + areaH;
  var n = bars.length;
  var slotW = w / Math.max(1, n);
  var barW = Math.min(52, slotW * 0.5);
  var max = 1;
  bars.forEach(function (b) { if (b.v > max) { max = b.v; } });
  // 柱多时数字会叠在一起：大约每 7 根标一个，今天和最高值始终保留
  var step = n <= 8 ? 1 : Math.ceil(n / 7);
  var labelStep = n <= 10 ? 1 : Math.ceil(n / 6);

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base + 1);
  ctx.lineTo(x + w, base + 1);
  ctx.stroke();

  var lastVal = -99;
  var lastLab = -99;
  bars.forEach(function (b, i) {
    var cx = x + slotW * i + slotW / 2;
    var bh = Math.max(b.v > 0 ? 12 : 4, Math.round(b.v / max * areaH));
    var bx = cx - barW / 2;
    fillRound(ctx, bx, base - bh, barW, bh, 7, b.today ? C.feed : 'rgba(65,73,196,0.45)');
    var showVal = b.v > 0 && (i % step === 0 || b.today || b.v === max);
    if (showVal && i - lastVal < 2 && !(b.today || b.v === max)) { showVal = false; }
    if (showVal) {
      ctx.fillStyle = C.ink2;
      ctx.font = '19px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.v), cx, base - bh - valueGap);
      lastVal = i;
    }
    var showLab = i % labelStep === 0 || b.today;
    if (showLab && i - lastLab < 2 && !b.today) { showLab = false; }
    if (showLab) {
      ctx.fillStyle = b.today ? C.feed : C.ink3;
      ctx.font = b.today ? 'bold 19px sans-serif' : '19px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, cx, base + 14);
      lastLab = i;
    }
  });
  ctx.textAlign = 'left';
  return 52 + valueGap + areaH + 48;
}

function drawRows(ctx, x, y, w, rows) {
  ctx.textBaseline = 'top';
  var rh = 96;
  rows.forEach(function (r, i) {
    if (i > 0) {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + w - 8, y);
      ctx.stroke();
    }
    var cy = y + rh / 2;
    // 圆形彩色底 + 白点
    ctx.fillStyle = r.bg;
    ctx.beginPath(); ctx.arc(x + 24, cy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.c;
    ctx.beginPath(); ctx.arc(x + 24, cy, 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 27px sans-serif';
    ctx.fillText(r.k, x + 60, cy - 26);
    ctx.fillStyle = C.ink3;
    ctx.font = '21px sans-serif';
    ctx.fillText(r.sub, x + 60, cy + 6);

    var long = r.v.length > 12;
    var main = long ? (r.v.length > 18 ? r.v.slice(0, 18) + '…' : r.v) : r.v;
    var valueSize = long ? 23 : 32;
    ctx.font = '21px sans-serif';
    var uText = r.u ? String(r.u).replace(/^\s+/, '') : '';
    var uw = uText ? ctx.measureText(uText).width : 0;
    ctx.font = 'bold ' + valueSize + 'px sans-serif';
    var right = x + w - 8;
    var valueRight = right - (uText ? uw + 8 : 0);
    var valueTop = cy - valueSize / 2 - 4;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'right';
    ctx.fillText(main, valueRight, valueTop);
    if (uText) {
      ctx.fillStyle = C.ink2;
      ctx.font = '21px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(uText, valueRight + 8, valueTop + valueSize - 21);
    }
    ctx.textAlign = 'left';
    y += rh;
  });
  return rows.length * rh;
}

// 环比条（周报/月报）
function drawCompare(ctx, x, y, w, title, items) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.ink;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x, y);
  var py = y + 44, ph = 112;
  fillRound(ctx, x, py, w, ph, 16, '#F6F8FC');
  var n = Math.max(1, items.length);
  var cw = w / n;
  items.forEach(function (it, i) {
    var cx = x + cw * i + 16;
    var maxW = cw - 28;
    if (i > 0) {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cw * i, py + 16);
      ctx.lineTo(x + cw * i, py + ph - 16);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink3;
    ctx.font = '18px sans-serif';
    ctx.fillText(fitText(ctx, it.k, maxW), cx, py + 16);
    ctx.fillStyle = it.dir === 'up' ? '#C46A12' : (it.dir === 'down' ? '#2C6FE0' : C.ink2);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(fitText(ctx, it.txt, maxW), cx, py + 44);
    ctx.fillStyle = C.ink3;
    ctx.font = '16px sans-serif';
    ctx.fillText(fitText(ctx, it.prev + ' → ' + it.cur, maxW), cx, py + 78);
  });
  return 44 + ph;
}

function fitText(ctx, text, maxW) {
  var s = String(text || '');
  if (ctx.measureText(s).width <= maxW) { return s; }
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) { s = s.slice(0, -1); }
  return s + '…';
}

// 周报 / 月报版式
function drawReport(ctx, w, h, data) {
  drawBackdrop(ctx, w, h);

  var pad = 32;
  var cardX = pad, cardY = pad, cardW = w - pad * 2, cardH = h - pad * 2;
  fillRound(ctx, cardX, cardY, cardW, cardH, 32, C.card);
  ctx.strokeStyle = 'rgba(31,36,48,0.05)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();

  var inX = cardX + 28, inW = cardW - 56;
  drawHeader(ctx, inX, cardY + 28, inW, data);

  var y = cardY + 28 + 200 + 26;
  drawKpis(ctx, inX, y, inW, data.kpis);
  y += 148 + 40;
  y += drawChart(ctx, inX, y, inW, data.chartTitle, data.bars) + 26;
  if (data.compare && data.compare.length) {
    y += drawCompare(ctx, inX, y, inW, data.compareTitle, data.compare) + 26;
  }
  drawRows(ctx, inX, y, inW, data.rows);

  ctx.fillStyle = C.ink3;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('小芽拾光记 · 数据仅存于本机', w / 2, cardY + cardH - 36);
  ctx.textAlign = 'left';
}

function draw(ctx, w, h, data) {
  if (data && data.kind === 'report') { drawReport(ctx, w, h, data); return; }
  drawBackdrop(ctx, w, h);

  var pad = 32;
  var cardX = pad, cardY = pad, cardW = w - pad * 2, cardH = h - pad * 2;
  fillRound(ctx, cardX, cardY, cardW, cardH, 32, C.card);

  // 阴影描边
  ctx.strokeStyle = 'rgba(31,36,48,0.05)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();

  var inX = cardX + 28, inW = cardW - 56;
  drawHeader(ctx, inX, cardY + 28, inW, data);

  var y = cardY + 28 + 200 + 26;
  drawKpis(ctx, inX, y, inW, data.kpis);
  y += 148 + 40;
  y += drawChart(ctx, inX, y, inW, data.chartTitle, data.bars) + 26;
  drawRows(ctx, inX, y, inW, data.rows);

  ctx.fillStyle = C.ink3;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('小芽拾光记 · 数据仅存于本机', w / 2, cardY + cardH - 36);
  ctx.textAlign = 'left';
}

// 卡片总高：pad*2 + header(28+200) + kpi(26+148) + gap40 + chart(52+150+44) + gap26 + rows*96 + footer余量
function layoutHeight(data) {
  var chartH = 52 + 28 + 150 + 48;
  var cmpH = data && data.kind === 'report' && data.compare && data.compare.length ? (44 + 112 + 26) : 0;
  return 64 + 228 + 174 + 40 + chartH + 26 + cmpH + data.rows.length * 96 + 72;
}

// 生成临时图片（回调：cb(err, tempFilePath)，保证有且仅有一次回调）
function render(data, cb) {
  var w = 750, h = layoutHeight(data);
  var done = false;
  function once(err, path) {
    if (done) { return; }
    done = true;
    cb(err, path);
  }
  // 兜底：底层 API 既不 success 也不 fail 时 10 秒后强制回调，避免 loading 卡死
  var guard = setTimeout(function () { once(new Error('生成超时'), null); }, 10000);
  function finish(err, path) { clearTimeout(guard); once(err, path); }

  var cv, ctx;
  try {
    cv = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
  } catch (e) { cv = null; }
  if (!cv || !cv.getContext) {
    finish(new Error('当前基础库不支持离屏画布'));
    return;
  }
  try {
    ctx = cv.getContext('2d');
    draw(ctx, w, h, data);
  } catch (e) {
    finish(new Error('绘制摘要卡失败'));
    return;
  }
  wx.canvasToTempFilePath({
    canvas: cv,
    width: w, height: h, destWidth: w * 2, destHeight: h * 2,
    success: function (res) { finish(null, res.tempFilePath); },
    fail: function (err) { finish(err || new Error('生成图片失败')); }
  });
}

// 是否运行在微信开发者工具（模拟器）里
function isDevtools() {
  try {
    var info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync();
    return (info.platform || '') === 'devtools';
  } catch (e) { return false; }
}

// 生成并分享：优先调起微信「发给好友」图片菜单，失败则存相册
// 开发者工具不支持 showShareImageMenu / saveImageToPhotosAlbum，
// 且这两个接口在模拟器里会自己弹原生提示层（容易卡成残影），所以模拟器内直接预览图片。
function share(data, cb) {
  var done = false;
  function once(err, path) {
    if (done) { return; }
    done = true;
    cb(err, path);
  }
  // 兜底：分享层接口既不 success 也不 fail 时，避免页面 sharing 态永久锁死
  var guard = setTimeout(function () { once({ errMsg: '分享超时' }, null); }, 12000);
  function fin(err, path) { clearTimeout(guard); once(err, path); }

  render(data, function (err, path) {
    if (err || !path) { fin(err || { errMsg: '生成失败' }, null); return; }
    if (isDevtools()) {
      wx.previewImage({
        urls: [path],
        success: function () { fin(null, path); },
        fail: function (e) { fin({ errMsg: (e && e.errMsg) || '预览失败' }, null); }
      });
      return;
    }
    if (typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path: path,
        success: function () { fin(null, path); },
        fail: function (e) {
          // 用户主动取消不算失败，也不能顺手把图存进相册
          if (/cancel/i.test((e && e.errMsg) || '')) { fin({ errMsg: '已取消分享' }, null); return; }
          saveAlbum(path, fin);
        }
      });
    } else {
      saveAlbum(path, fin);
    }
  });
}

function saveAlbum(path, cb) {
  wx.saveImageToPhotosAlbum({
    filePath: path,
    success: function () { cb(null, path); },
    fail: function (err) {
      var msg = (err && err.errMsg) || '';
      var friendly = /auth|deny|denied/i.test(msg) ? '没有相册权限，可在系统设置里开启' : '保存失败';
      cb({ errMsg: friendly }, null);
    }
  });
}

module.exports = {
  dailyData: dailyData,
  weeklyData: weeklyData,
  reportData: reportData,
  render: render,
  share: share
};
