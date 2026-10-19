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
    ctx.textAlign = 'center';
    ctx.fillStyle = k.c;
    ctx.font = '22px sans-serif';
    ctx.fillText(k.label, tx + tw / 2, y + 26);
    ctx.fillStyle = C.ink;
    ctx.font = 'bold 44px sans-serif';
    var vs = String(k.v);
    var vw = ctx.measureText(vs).width;
    var uw = k.u ? ctx.measureText(' ' + k.u).width : 0;
    var startX = tx + tw / 2 - (vw + uw) / 2;
    ctx.textAlign = 'left';
    ctx.fillText(vs, startX, y + 68);
    if (k.u) {
      ctx.fillStyle = C.ink2;
      ctx.font = '22px sans-serif';
      ctx.fillText(' ' + k.u, startX + vw, y + 90);
    }
  });
  ctx.textAlign = 'left';
  return th;
}

function drawChart(ctx, x, y, w, title, bars) {
  ctx.fillStyle = C.ink;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x, y);
  var top = y + 52;
  var areaH = 150;
  var base = top + areaH;
  var n = bars.length;
  var slotW = w / n;
  var barW = Math.min(52, slotW * 0.5);
  var max = 1;
  bars.forEach(function (b) { if (b.v > max) { max = b.v; } });

  // 基线
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base + 1);
  ctx.lineTo(x + w, base + 1);
  ctx.stroke();

  bars.forEach(function (b, i) {
    var cx = x + slotW * i + slotW / 2;
    var bh = Math.max(b.v > 0 ? 12 : 4, Math.round(b.v / max * areaH));
    var bx = cx - barW / 2;
    fillRound(ctx, bx, base - bh, barW, bh, 7, b.today ? C.feed : 'rgba(65,73,196,0.45)');
    if (b.v > 0) {
      ctx.fillStyle = C.ink2;
      ctx.font = '19px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.v), cx, base - bh - 28);
    }
    ctx.fillStyle = b.today ? C.feed : C.ink3;
    ctx.font = b.today ? 'bold 19px sans-serif' : '19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, cx, base + 12);
  });
  ctx.textAlign = 'left';
  return 52 + areaH + 44; // 图表块总高
}

function drawRows(ctx, x, y, w, rows) {
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
    var uw = r.u ? ctx.measureText(' ' + r.u).width : 0;
    ctx.fillStyle = C.ink;
    ctx.font = long ? 'bold 23px sans-serif' : 'bold 32px sans-serif';
    ctx.textAlign = 'right';
    var rx = x + w - 24 - uw;
    ctx.fillText(main, rx, cy - (long ? 12 : 18));
    if (r.u) {
      ctx.fillStyle = C.ink2;
      ctx.font = '21px sans-serif';
      ctx.fillText(' ' + r.u, rx, cy - (long ? 6 : 6));
    }
    ctx.textAlign = 'left';
    y += rh;
  });
  return rows.length * rh;
}

function draw(ctx, w, h, data) {
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
  drawChart(ctx, inX, y, inW, data.chartTitle, data.bars);
  y += 52 + 150 + 44 + 26;
  drawRows(ctx, inX, y, inW, data.rows);

  ctx.fillStyle = C.ink3;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('新生儿喂养记录 · 数据仅存于本机', w / 2, cardY + cardH - 36);
  ctx.textAlign = 'left';
}

// 卡片总高：pad*2 + header(28+200) + kpi(26+148) + gap40 + chart(52+150+44) + gap26 + rows*96 + footer余量
function layoutHeight(data) {
  return 64 + 228 + 174 + 40 + 246 + 26 + data.rows.length * 96 + 60;
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
  render(data, function (err, path) {
    if (err || !path) { cb(err || new Error('生成失败'), null); return; }
    if (isDevtools()) {
      wx.previewImage({
        urls: [path],
        success: function () { cb(null, path); },
        fail: function () { cb(null, path); }
      });
      return;
    }
    if (typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path: path,
        success: function () { cb(null, path); },
        fail: function (e) {
          // 用户取消或失败 → 退回存相册
          saveAlbum(path, cb);
        }
      });
    } else {
      saveAlbum(path, cb);
    }
  });
}

function saveAlbum(path, cb) {
  wx.saveImageToPhotosAlbum({
    filePath: path,
    success: function () { cb(null, path); },
    fail: function (err) { cb(err || new Error('保存失败'), null); }
  });
}

module.exports = {
  dailyData: dailyData,
  weeklyData: weeklyData,
  render: render,
  share: share
};
