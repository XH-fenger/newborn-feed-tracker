// 统计 —— 喂养 / 尿布 / 睡眠 / 成长 / 体温（canvas 自绘 + 明细列表）
// 区间：近 7 天 / 近 30 天 / 自定义（影响 feed/diaper/sleep/temp 聚合）
// 成长：体重 / 身高 / 头围 三指标，叠加 WHO 儿童生长标准（0-24 月）百分位对照
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var charts = require('../../utils/charts.js');
var rowsOf = require('../../utils/recordRow.js');
var who = require('../../utils/who.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');
var share = require('../../utils/share.js');

var SEGS = [
  { k: 'feed', t: '喂养' },
  { k: 'diaper', t: '尿布' },
  { k: 'sleep', t: '睡眠' },
  { k: 'growth', t: '成长' },
  { k: 'temp', t: '体温' }
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
    growth: { chip: '', metricName: '体重', kpis: [], rows: [], has: false, points: [] },
    temp: { chip: '', kpis: [], rows: [], has: false, points: [] },
    chartRows: [],
    dayOn: false,
    dayKey: '',
    dayTitle: '',
    dayRows: [],
    ic: {},
    openId: '',
    rangeMode: '7',
    rangeOpts: [{ k: '7', t: '近 7 天' }, { k: '30', t: '近 30 天' }, { k: 'custom', t: '自定义' }],
    rangeStart: '',
    rangeEnd: '',
    showRange: false,
    growthMetric: 'weight',
    growthWho: [],
    growthShowWho: false,
    growthMaxM: 24
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
        med19: icons.svg('med', c.pri, 19, 2),
        temp19: icons.svg('temp', c.temp, 19, 2)
      }
    };
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) {
      this.setData({ navSc: sc });
    }
    if (this.data.openId) { this.setData({ openId: '' }); }
  },

  refresh: function () {
    var records = storage.records();
    var days, navMeta, rm = this.data.rangeMode;
    if (rm === '30') {
      days = statsMod.dailyAgg(records, 30);
      navMeta = '近 30 天 · ' + T.fmtMD(days[0].ts) + ' - ' + T.fmtMD(days[days.length - 1].ts);
    } else if (rm === 'custom' && this.data.rangeStart && this.data.rangeEnd) {
      days = statsMod.dailyAggBetween(records, T.tsOf(this.data.rangeStart, '00:00'), T.tsOf(this.data.rangeEnd, '23:59'));
      navMeta = this.data.rangeStart.replace(/-/g, '/') + ' - ' + this.data.rangeEnd.replace(/-/g, '/');
    } else {
      days = statsMod.dailyAgg(records, 7);
      navMeta = '近 7 天 · ' + T.fmtMD(days[0].ts) + ' - ' + T.fmtMD(days[6].ts);
    }

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
      has: hasDiaper, avg: statsMod.avg(dArr),
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
      has: hasSleep, avg: statsMod.avg(sArr),
      kpis: [
        { v: maxS, u: 'h', k: '最长' },
        { v: statsMod.avg(sArr), u: 'h', k: '平均' },
        { v: minS, u: 'h', k: '最短' }
      ],
      rows: days.map(function (d, i) {
        return { key: T.dayKey(d.ts), d: T.fmtMD(d.ts), p: maxS > 0 ? Math.round(sArr[i] / maxS * 100) : 0, v: sArr[i], u: 'h' };
      })
    };

    /* —— 成长（按指标对照 WHO 百分位） —— */
    var baby = storage.baby();
    var metric = this.data.growthMetric;
    var metricName = metric === 'height' ? '身高' : (metric === 'head' ? '头围' : '体重');
    var metricUnit = (metric === 'height' || metric === 'head') ? 'cm' : 'kg';
    var birthVal = metric === 'weight' ? baby.birthWeight : (metric === 'height' ? baby.birthHeight : baby.birthHead);
    var gs = statsMod.growthSeriesMetric(records, metric, birthVal > 0 ? birthVal : 0);
    var babyPoints = gs.map(function (p) {
      var m = (p.key === 'birth') ? 0 : who.monthsFromDays(T.ageDays(baby.birthday, p.time));
      return { m: m, v: p.v, key: p.key, time: p.time };
    });
    var whoCurve = who.curve(baby.gender, metric);
    var lastP = babyPoints.length ? babyPoints[babyPoints.length - 1] : null;
    var inRng = !!(lastP && baby.birthday && who.inRange(lastP.m));
    var assess = inRng ? who.assess(baby.gender, metric, lastP.m, lastP.v) : null;
    var pctText = assess ? ('约 P' + assess.pct + ' · ' + assess.zone)
      : (lastP && baby.birthday ? '超出参考范围（0-24月）' : '');
    var growth = {
      has: babyPoints.length >= 1,
      metric: metric, metricName: metricName,
      chip: lastP ? (lastP.v + ' ' + metricUnit) : '',
      pctText: pctText,
      kpis: [
        { v: lastP ? lastP.v : '-', u: metricUnit, k: '当前' + metricName },
        { v: assess ? 'P' + assess.pct : '-', u: '', k: '百分位' },
        { v: assess ? assess.zone : '-', u: '', k: '区间' }
      ],
      rows: babyPoints.map(function (p) {
        var minV = Math.min.apply(null, babyPoints.map(function (x) { return x.v; }));
        var maxV = Math.max.apply(null, babyPoints.map(function (x) { return x.v; }));
        return {
          key: p.key,
          d: (p.key === 'birth' ? '出生' : T.fmtMD(p.time)),
          p: maxV > minV ? Math.round((p.v - minV) / (maxV - minV) * 100) : 100,
          v: p.v, u: metricUnit
        };
      }),
      points: babyPoints
    };

    /* —— 体温（近 N 天早 / 晚） —— */
    var td = statsMod.tempDays(records, days.length);
    var vals = [];
    td.forEach(function (d) {
      if (d.am) { vals.push(d.am.celsius); }
      if (d.pm) { vals.push(d.pm.celsius); }
    });
    var hasTemp = vals.length > 0;
    var maxT = hasTemp ? Math.max.apply(null, vals) : 0;
    var minT = hasTemp ? Math.min.apply(null, vals) : 0;
    var points = td.map(function (d) {
      var parts = [];
      if (d.am) { parts.push(d.am.celsius); }
      if (d.pm) { parts.push(d.pm.celsius); }
      var avgV = 0;
      parts.forEach(function (v) { avgV += v; });
      avgV = Math.round(avgV / parts.length * 10) / 10;
      return { label: T.fmtMD(d.ts), v: avgV, key: d.key };
    });
    var temp = {
      has: hasTemp,
      chip: hasTemp ? vals.length + ' 次' : '',
      kpis: [
        { v: hasTemp ? rowsOf.fmtC(maxT) : '0', u: '°C', k: '最高' },
        { v: hasTemp ? rowsOf.fmtC(statsMod.avg(vals)) : '0', u: '°C', k: '平均' },
        { v: hasTemp ? rowsOf.fmtC(minT) : '0', u: '°C', k: '最低' }
      ],
      rows: td.map(function (d) {
        var am = d.am ? rowsOf.fmtC(d.am.celsius) : '—';
        var pm = d.pm ? rowsOf.fmtC(d.pm.celsius) : '—';
        var top = 0;
        if (d.am) { top = d.am.celsius; }
        if (d.pm && d.pm.celsius > top) { top = d.pm.celsius; }
        return {
          key: d.key,
          d: T.fmtMD(d.ts),
          p: top > 35 ? Math.max(8, Math.min(100, Math.round((top - 35) / 3 * 100))) : 8,
          v: '早' + am + ' 晚' + pm,
          u: ''
        };
      }).reverse(),
      points: points
    };

    var chartRows = { feed: feed.rows, diaper: diaper.rows, sleep: sleep.rows, growth: growth.rows, temp: temp.points }[this.data.seg] || [];
    this.setData({
      navMeta: navMeta, feed: feed, diaper: diaper, sleep: sleep, growth: growth, temp: temp, chartRows: chartRows,
      growthWho: whoCurve, growthShowWho: inRng
    });
    if (this.data.dayOn && this.data.dayKey) { this.openDay(this.data.dayKey); }
    this.drawChart();
  },

  /* ---------- 区间切换（#6） ---------- */
  onRangeTap: function (e) {
    var k = e.currentTarget.dataset.k;
    if (k === 'custom') {
      this.setData({
        rangeMode: 'custom',
        rangeStart: this.data.rangeStart || T.fmtYMD(Date.now() - 6 * 86400000),
        rangeEnd: this.data.rangeEnd || T.nowYMD()
      });
    } else {
      this.setData({ rangeMode: k });
    }
    this.refresh();
  },
  onRangeStart: function (e) {
    var v = e.detail.value;
    var patch = { rangeStart: v };
    if (this.data.rangeEnd && v > this.data.rangeEnd) { patch.rangeEnd = v; }
    this.setData(patch);
    this.refresh();
  },
  onRangeEnd: function (e) {
    var v = e.detail.value;
    var patch = { rangeEnd: v };
    if (this.data.rangeStart && v < this.data.rangeStart) { patch.rangeStart = v; }
    this.setData(patch);
    this.refresh();
  },

  /* ---------- 成长指标切换（#7） ---------- */
  onGrowthMetric: function (e) {
    var k = e.currentTarget.dataset.k;
    if (k === this.data.growthMetric) { return; }
    this.setData({ growthMetric: k });
    this.refresh();
    var that = this;
    setTimeout(function () { that.drawChart(); }, 60);
  },

  onSegTap: function (e) {
    var k = e.currentTarget.dataset.k;
    var i = e.currentTarget.dataset.i;
    if (k === this.data.seg) { return; }
    var rows = { feed: this.data.feed.rows, diaper: this.data.diaper.rows, sleep: this.data.sleep.rows, growth: this.data.growth.rows, temp: this.data.temp.points }[k] || [];
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
    var that = this;
    require('../../utils/undo.js').request(this, {
      kind: 'record', id: id, msg: '已删除记录',
      refresh: function () { that.refresh(); }
    });
  },

  // 生成并分享今日摘要卡片（#3）
  // 不用原生 showToast / showLoading：开发者工具里会卡成无标题成功勾残影。
  genShare: function () {
    var that = this;
    if (this._sharing) { return; }
    this._sharing = true;
    this.setData({ sharing: true });
    share.share(share.dailyData(), function (err) {
      that._sharing = false;
      that.setData({ sharing: false });
      var msg = err ? ((err && err.errMsg) || '生成失败') : '已生成摘要';
      var toast = that.selectComponent('#toast');
      if (toast) { toast.show(msg); }
    });
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
        o.who = that.data.growthShowWho ? that.data.growthWho : [];
        o.babyPoints = that.data.growth.points || [];
        o.maxMonths = that.data.growthMaxM || 24;
        o.xLabels = [{ m: 0, t: '0' }, { m: 6, t: '6月' }, { m: 12, t: '12月' }, { m: 18, t: '18月' }, { m: 24, t: '24月' }];
        charts.drawGrowth(ctx, cv, w, h, o);
      } else if (seg === 'temp' && that.data.temp.points.length >= 2) {
        o.color = c.temp;
        o.points = that.data.temp.points;
        charts.drawLine(ctx, cv, w, h, o);
      }
    });
  }
});
