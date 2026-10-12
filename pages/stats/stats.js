// 统计 —— 喂养 / 尿布 / 睡眠 / 成长 四段（canvas 自绘 + 明细列表）
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var charts = require('../../utils/charts.js');
var rowsOf = require('../../utils/recordRow.js');
var icons = require('../../utils/icons.js');
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
    growth: { chip: '', kpis: [], rows: [], has: false, points: [] },
    chartRows: [],
    dayOn: false,
    dayKey: '',
    dayTitle: '',
    dayRows: [],
    ic: {},
    openId: ''
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
    var ic = this.buildIcons();
    this.setData({ ic: ic.ic });
    this.refresh();
  },

  buildIcons: function () {
    var c = theme.current();
    return {
      ic: {
        feed19: icons.svg('feed', c.feed, 19, 2),
        bottle19: icons.svg('bottle', c.feed, 19, 2),
        diaper19: icons.svg('diaper', c.diaper, 19, 2),
        sleep19: icons.svg('sleep', c.sleep, 19, 2),
        growth19: icons.svg('growth', c.growth, 19, 2),
        med19: icons.svg('med', c.pri, 19, 2)
      }
    };
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
    if (this.data.openId) { this.setData({ openId: '' }); }
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
        return { key: T.dayKey(d.ts), d: T.fmtMD(d.ts), p: maxMl > 0 ? Math.round(d.feedMl / maxMl * 100) : 0, v: d.feedMl, u: 'ml' };
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
        return { key: T.dayKey(d.ts), d: T.fmtMD(d.ts), p: maxD > 0 ? Math.round(d.diaper / maxD * 100) : 0, v: d.diaper, u: '次' };
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
        return { key: T.dayKey(d.ts), d: T.fmtMD(d.ts), p: maxS > 0 ? Math.round(sArr[i] / maxS * 100) : 0, v: sArr[i], u: 'h' };
      })
    };

    /* —— 成长（体重折线） —— */
    var baby = storage.baby();
    var gs = records.filter(function (r) { return r.type === 'growth' && r.weight > 0; });
    gs.sort(function (a, b) { return a.time - b.time; });
    var points = [];
    if (baby.birthWeight > 0) { points.push({ label: '出生', v: baby.birthWeight, key: 'birth' }); }
    gs.forEach(function (r) { points.push({ label: T.fmtMD(r.time), v: r.weight, key: r.id }); });
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
        return { key: p.key, d: p.label, p: maxV > minV ? Math.round((p.v - minV) / (maxV - minV) * 100) : 100, v: p.v, u: 'kg' };
      }),
      points: points
    };

    var chartRows = { feed: feed.rows, diaper: diaper.rows, sleep: sleep.rows, growth: growth.rows }[this.data.seg] || [];
    this.setData({
      navMeta: navMeta, feed: feed, diaper: diaper, sleep: sleep, growth: growth, chartRows: chartRows
    });
    if (this.data.dayOn && this.data.dayKey) { this.openDay(this.data.dayKey); }
    this.drawChart();
  },

  onSegTap: function (e) {
    var k = e.currentTarget.dataset.k;
    var i = e.currentTarget.dataset.i;
    if (k === this.data.seg) { return; }
    var rows = { feed: this.data.feed.rows, diaper: this.data.diaper.rows, sleep: this.data.sleep.rows, growth: this.data.growth.rows }[k] || [];
    this.setData({ seg: k, segIndex: i, chartRows: rows, dayOn: false, dayKey: '', dayRows: [] });
    var that = this;
    // wx:if 重建 canvas 节点后异步绘制
    setTimeout(function () { that.drawChart(); }, 60);
  },

  onDayTap: function (e) {
    var key = e.currentTarget.dataset.key;
    if (!key) { return; }
    if (key === this.data.dayKey) {
      this.setData({ dayOn: false, dayKey: '', dayRows: [], dayTitle: '' });
      return;
    }
    this.openDay(key);
  },

  openDay: function (key) {
    var seg = this.data.seg;
    var records = storage.records();
    var title = '';
    var list = [];
    if (seg === 'growth') {
      if (key === 'birth') {
        var baby = storage.baby();
        title = '出生体重';
        list = [{ id: 'birth', hm: '', title: '宝宝资料', detail: (baby.birthWeight || 0) + ' kg', iconKey: 'growth19', icBg: 'growthS' }];
      } else {
        records.forEach(function (r) {
          if (r.id !== key) { return; }
          var o = rowsOf.rowOf(r);
          o.hm = T.fmtHM(r.time);
          list.push(o);
          title = T.dayLabel(T.dayKey(r.time)) + ' 测量';
        });
      }
    } else {
      title = T.dayLabel(key);
      records.forEach(function (r) {
        if (r.type !== seg) { return; }
        if (T.dayKey(r.time) !== key) { return; }
        var o = rowsOf.rowOf(r);
        o.hm = T.fmtHM(r.time);
        list.push(o);
      });
    }
    this.setData({ dayOn: true, dayKey: key, dayTitle: title, dayRows: list });
  },

  onDayRow: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.openId === id) { this.setData({ openId: '' }); return; }
    if (!id || id === 'birth') { return; }
    var app = getApp();
    app.globalData.editingId = id;
    app.globalData.pendingType = '';
    wx.switchTab({ url: '/pages/record/record' });
  },

  onSwipeDrag: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.openId && this.data.openId !== id) { this.setData({ openId: '' }); }
  },
  onSwipeOpen: function (e) { this.setData({ openId: e.currentTarget.dataset.id }); },
  onSwipeClose: function (e) {
    if (this.data.openId === e.currentTarget.dataset.id) { this.setData({ openId: '' }); }
  },
  onSwipeDelete: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id || id === 'birth') { return; }
    storage.deleteRecord(id);
    this.setData({ openId: '' });
    wx.showToast({ title: '已删除', icon: 'none' });
    this.refresh();
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
