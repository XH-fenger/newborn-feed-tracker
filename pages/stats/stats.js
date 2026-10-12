// 统计 —— 喂养 / 尿布 / 睡眠 / 成长 四段（canvas 自绘 + 明细列表）
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var charts = require('../../utils/charts.js');
var T = require('../../utils/time.js');

var SEGS = [
  { k: 'feed', t: '喂养' },
  { k: 'diaper', t: '尿布' },
  { k: 'sleep', t: '睡眠' },
  { k: 'growth', t: '成长' }
];

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navMeta: '',
    segs: SEGS,
    seg: 'feed',
    segIndex: 0,
    feed: { avg: 0, kpis: [], rows: [], has: false },
    diaper: { avg: 0, kpis: [], rows: [], has: false },
    sleep: { avg: 0, kpis: [], rows: [], has: false },
    growth: { chip: '', kpis: [], rows: [], has: false, points: [] }
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    this.setData({ theme: g.theme, dark: g.dark });
    if (typeof this.getTabBar === 'function') {
      var tb = this.getTabBar();
      if (tb) { tb.sync(g.theme, g.dark); tb.setSelected(2); }
    }
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }
    this.refresh();
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  refresh: function () {
    var records = storage.records();
    var days = statsMod.dailyAgg(records, 7);
    var navMeta = '近 7 天 · ' + T.fmtMD(days[0].ts) + ' - ' + T.fmtMD(days[6].ts);

    /* —— 喂养 —— */
    var mlArr = days.map(function (d) { return d.feedMl; });
    var hasFeed = mlArr.some(function (v) { return v > 0; });
    var maxMl = Math.max.apply(null, mlArr), minMl = Math.min.apply(null, mlArr);
    if (minMl === maxMl) { minMl = 0; }
    var feed = {
      has: hasFeed,
      avg: statsMod.avg(mlArr),
      kpis: [
        { v: maxMl, u: 'ml', k: '最高' },
        { v: statsMod.avg(mlArr), u: 'ml', k: '平均' },
        { v: minMl, u: 'ml', k: '最低' }
      ],
      rows: days.map(function (d) {
        return { d: T.fmtMD(d.ts), p: maxMl > 0 ? Math.round(d.feedMl / maxMl * 100) : 0, v: d.feedMl, u: 'ml' };
      })
    };

    /* —— 尿布 —— */
    var dArr = days.map(function (d) { return d.diaper; });
    var hasDiaper = dArr.some(function (v) { return v > 0; });
    var maxD = Math.max.apply(null, dArr), minD = Math.min.apply(null, dArr);
    if (minD === maxD) { minD = 0; }
    var diaper = {
      has: hasDiaper,
      avg: statsMod.avg(dArr),
      kpis: [
        { v: maxD, u: '次', k: '最高' },
        { v: statsMod.avg(dArr), u: '次', k: '平均' },
        { v: minD, u: '次', k: '最低' }
      ],
      rows: days.map(function (d) {
        return { d: T.fmtMD(d.ts), p: maxD > 0 ? Math.round(d.diaper / maxD * 100) : 0, v: d.diaper, u: '次' };
      })
    };

    /* —— 睡眠 —— */
    var sArr = days.map(function (d) { return T.hoursOf(d.sleepMin); });
    var hasSleep = days.some(function (d) { return d.sleepMin > 0; });
    var maxS = Math.max.apply(null, sArr), minS = Math.min.apply(null, sArr);
    if (minS === maxS) { minS = 0; }
    var sleep = {
      has: hasSleep,
      avg: statsMod.avg(sArr),
      kpis: [
        { v: maxS, u: 'h', k: '最长' },
        { v: statsMod.avg(sArr), u: 'h', k: '平均' },
        { v: minS, u: 'h', k: '最短' }
      ],
      rows: days.map(function (d, i) {
        return { d: T.fmtMD(d.ts), p: maxS > 0 ? Math.round(sArr[i] / maxS * 100) : 0, v: sArr[i], u: 'h' };
      })
    };

    /* —— 成长（体重折线） —— */
    var baby = storage.baby();
    var gs = records.filter(function (r) { return r.type === 'growth' && r.weight > 0; });
    gs.sort(function (a, b) { return a.time - b.time; });
    var points = [];
    if (baby.birthWeight > 0) { points.push({ label: '出生', v: baby.birthWeight }); }
    gs.forEach(function (r) { points.push({ label: T.fmtMD(r.time), v: r.weight }); });
    var hasGrowth = points.length >= 2;
    var firstV = points.length ? points[0].v : 0;
    var lastV = points.length ? points[points.length - 1].v : 0;
    var gain = Math.round((lastV - firstV) * 100) / 100;
    var wks = points.length > 1 ? Math.max(1, T.weeksDays(T.ageDays(baby.birthday)).w || Math.round((gs[gs.length - 1].time - (gs[0] ? gs[0].time : Date.now())) / 604800000)) : 0;
    var growth = {
      has: hasGrowth,
      chip: gain >= 0 ? '+' + gain + ' kg' : gain + ' kg',
      kpis: [
        { v: lastV, u: 'kg', k: '当前体重' },
        { v: (gain >= 0 ? '+' : '') + gain, u: 'kg', k: '累计增长' },
        { v: wks > 0 ? Math.round(gain / wks * 100) / 100 : 0, u: 'kg/w', k: '周均' }
      ],
      rows: points.map(function (p) {
        var minV = Math.min.apply(null, points.map(function (x) { return x.v; }));
        var maxV = Math.max.apply(null, points.map(function (x) { return x.v; }));
        return { d: p.label, p: maxV > minV ? Math.round((p.v - minV) / (maxV - minV) * 100) : 100, v: p.v, u: 'kg' };
      }),
      points: points
    };

    this.setData({
      navMeta: navMeta, feed: feed, diaper: diaper, sleep: sleep, growth: growth
    });
    this.drawChart();
  },

  onSegTap: function (e) {
    var k = e.currentTarget.dataset.k;
    var i = e.currentTarget.dataset.i;
    if (k === this.data.seg) { return; }
    this.setData({ seg: k, segIndex: i });
    var that = this;
    // wx:if 重建 canvas 节点后异步绘制
    setTimeout(function () { that.drawChart(); }, 60);
  },

  drawChart: function () {
    var c = theme.current();
    var that = this;
    charts.setupCanvas(this, 'chCv', function (ctx, cv, w, h) {
      var seg = that.data.seg;
      var o = { color: c.feed, grid: c.grid, axl: c.axl, card: c.card };
      if (seg === 'feed') {
        o.values = that.data.feed.rows.map(function (r) { return r.v; });
        o.labels = that.data.feed.rows.map(function (r) { return r.d; });
        charts.drawBar(ctx, cv, w, h, o);
      } else if (seg === 'diaper') {
        o.color = c.diaper;
        o.values = that.data.diaper.rows.map(function (r) { return r.v; });
        o.labels = that.data.diaper.rows.map(function (r) { return r.d; });
        charts.drawBar(ctx, cv, w, h, o);
      } else if (seg === 'sleep') {
        o.color = c.sleep;
        o.values = that.data.sleep.rows.map(function (r) { return r.v; });
        o.labels = that.data.sleep.rows.map(function (r) { return r.d; });
        charts.drawBar(ctx, cv, w, h, o);
      } else if (seg === 'growth') {
        o.color = c.growth;
        o.points = that.data.growth.points;
        charts.drawLine(ctx, cv, w, h, o);
      }
    });
  }
});
