// 首页 —— 今日概览 / 距上次喂养 / 最近记录 / 提醒触发
var storage = require('../../utils/storage.js');
var stats = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

var METHOD_TXT = { breast: '母乳', formula: '奶粉', mixed: '混合' };
var SIDE_TXT = { left: '左侧', right: '右侧', both: '双侧' };
var DIAPER_TXT = { pee: '尿', poop: '便', both: '都有' };

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    ic: {},
    baby: { name: '宝宝' },
    heroMeta: '',
    dayChip: '第 1 天',
    today: { feedCount: 0, feedMl: 0, diaper: 0, sleepText: '0h 0m' },
    hasFeed: false,
    next: { since: 0, sub: '', nextHM: '--:--' },
    rows: [],
    empty: true
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark };
    var ic = this.buildIcons();
    patch.ic = ic.ic;
    this.setData(patch);

    if (typeof this.getTabBar === 'function') {
      var tb = this.getTabBar();
      if (tb) { tb.sync(g.theme, g.dark); tb.setSelected(0); }
    }
    theme.syncWindow(g.theme, g.dark);

    // hero 深色渐变 → 状态栏白字
    try { wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#4149C4' }); } catch (e) { }

    this.refresh();
    this.startTicker();
    this.checkAlarm();
  },

  onHide: function () { this.stopTicker(); },
  onUnload: function () { this.stopTicker(); },

  // 固定图标集（主题切换时由 theme.apply 触发重建）
  buildIcons: function () {
    var c = theme.current();
    return {
      ic: {
        sun: icons.svg('sun', '#FFFFFF', 13, 2.2),
        plus: icons.svg('plus', '#FFFFFF', 19, 2.6),
        baby: storage.baby().gender === 'F' ? '/assets/avatar-girl.png' : '/assets/avatar-boy.png',
        feed: icons.svg('feed', c.feed, 17, 2),
        bottle: icons.svg('bottle', c.feed, 17, 2),
        diaper: icons.svg('diaper', c.diaper, 17, 2),
        sleep: icons.svg('sleep', c.sleep, 17, 2),
        feed19: icons.svg('feed', c.feed, 19, 2),
        bottle19: icons.svg('bottle', c.feed, 19, 2),
        diaper19: icons.svg('diaper', c.diaper, 19, 2),
        sleep19: icons.svg('sleep', c.sleep, 19, 2),
        growth19: icons.svg('growth', c.growth, 19, 2),
        empty: icons.svg('list', c.ink3, 44, 1.6)
      }
    };
  },

  refresh: function () {
    var records = storage.records();
    var baby = storage.baby();
    var s = storage.settings();
    var t = stats.todayStats(records);

    var gender = baby.gender === 'F' ? '女宝' : '男宝';
    var bd = baby.birthday ? ' · 出生 ' + baby.birthday + ' · ' + T.ageText(baby.birthday) : '';
    var heroMeta = gender + bd;

    var feedRows = records.filter(function (r) { return r.type === 'feed'; });
    var lf = feedRows.length ? feedRows[0] : null;

    var patch = {
      baby: baby,
      heroMeta: heroMeta,
      dayChip: T.ageDayText(baby.birthday),
      today: {
        feedCount: t.feedCount,
        feedMl: t.feedMl,
        diaper: t.diaper,
        sleepText: Math.floor(t.sleepMin / 60) + 'h ' + (t.sleepMin % 60) + 'm'
      },
      hasFeed: !!lf,
      rows: this.buildRows(records.slice(0, 3)),
      empty: records.length === 0
    };
    this.setData(patch);
    this._interval = s.feedInterval;
    this._lastFeed = lf;
    this.refreshNext();
  },

  // 最近记录行（iconKey + icBg → 渲染时查 data.ic / CSS 变量，主题切换自动生效）
  buildRows: function (list) {
    return list.map(function (r) {
      var o = { key: r.id, hm: T.fmtHM(r.time), title: '', detail: '', iconKey: '', icBg: '' };
      if (r.type === 'feed') {
        var m = METHOD_TXT[r.feedMethod] || '喂养';
        o.title = r.feedMethod === 'breast' ? m + ' · ' + (SIDE_TXT[r.side] || '') : m;
        if (r.feedMethod === 'breast') {
          o.detail = ((r.duration || 0) > 0 ? '时长 ' + r.duration + ' 分钟' : '未记时长') +
            (r.amount > 0 ? ' · 瓶喂 ' + r.amount + ' ml' : '');
        }
        else { o.detail = '奶量 ' + (r.amount || 0) + ' ml'; }
        o.iconKey = r.feedMethod === 'breast' ? 'feed19' : 'bottle19';
        o.icBg = 'feedS';
      } else if (r.type === 'diaper') {
        o.title = '换尿布 · ' + (DIAPER_TXT[r.diaperType] || '');
        o.detail = r.note || '状态正常';
        o.iconKey = 'diaper19'; o.icBg = 'diaperS';
      } else if (r.type === 'sleep') {
        o.title = '睡眠';
        o.detail = T.fmtDur(r.duration || 0);
        o.iconKey = 'sleep19'; o.icBg = 'sleepS';
      } else if (r.type === 'growth') {
        o.title = '成长测量';
        var parts = [];
        if (r.weight > 0) { parts.push('体重 ' + r.weight + ' kg'); }
        if (r.height > 0) { parts.push('身高 ' + r.height + ' cm'); }
        o.detail = parts.join(' · ') || '已记录';
        o.iconKey = 'growth19'; o.icBg = 'growthS';
      }
      return o;
    });
  },

  // 距上次喂养（供 ticker 每分钟轻量刷新）
  refreshNext: function () {
    var lf = this._lastFeed;
    if (!lf) {
      this.setData({ 'next.since': 0, 'next.sub': '还没有喂养记录', 'next.nextHM': '--:--' });
      this.drawRing(0);
      return;
    }
    var interval = this._interval || 180;
    var sinceMin = Math.max(0, Math.round((Date.now() - lf.time) / 60000));
    var nextTs = lf.time + interval * 60000;
    var patch = {
      'next.since': sinceMin,
      'next.sub': '上次 ' + T.fmtHM(lf.time) + ' · 建议间隔 ' + Math.round(interval / 60) + ' 小时',
      'next.nextHM': T.fmtHM(nextTs)
    };
    this.setData(patch);
    this.drawRing(Math.min(1, sinceMin / interval));
  },

  startTicker: function () {
    this.stopTicker();
    var that = this;
    this._ticker = setInterval(function () { that.refreshNext(); }, 60000);
  },
  stopTicker: function () {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  },

  /* ---------- 环形进度（canvas 2d） ---------- */
  onReady: function () {
    var that = this;
    var q = this.createSelectorQuery();
    q.select('#ringCv').fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) { return; }
      var cv = res[0].node;
      var dpr = 2;
      try { dpr = wx.getWindowInfo().pixelRatio || 2; } catch (e) { }
      cv.width = 82 * dpr;
      cv.height = 82 * dpr;
      var ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      that._ringCtx = ctx;
      that._ringCv = cv;
      that.drawRing(that._ringPct || 0, true);
    });
  },

  drawRing: function (pct, animate) {
    if (!this._ringCtx) { this._ringPct = pct; return; }
    this._ringPct = pct;
    var ctx = this._ringCtx;
    var that = this;

    function paint(p) {
      ctx.clearRect(0, 0, 82, 82);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.26)';
      ctx.beginPath();
      ctx.arc(41, 41, 34, 0, Math.PI * 2);
      ctx.stroke();
      if (p > 0.005) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        var a = -Math.PI / 2;
        ctx.arc(41, 41, 34, a, a + Math.PI * 2 * Math.min(1, p));
        ctx.stroke();
      }
    }

    if (!animate) { paint(pct); return; }
    // 入场扫描动画（900ms ease-out）
    var t0 = null;
    function step(ts) {
      if (t0 === null) { t0 = ts; }
      var p = Math.min(1, (ts - t0) / 900);
      var eased = 1 - Math.pow(1 - p, 3);
      paint(pct * eased);
      if (p < 1 && that._ringCv) { that._ringCv.requestAnimationFrame(step); }
    }
    if (that._ringCv && that._ringCv.requestAnimationFrame) {
      that._ringCv.requestAnimationFrame(step);
    } else { paint(pct); }
  },

  /* ---------- 提醒检查（应用内全屏闹钟） ---------- */
  checkAlarm: function () {
    var s = storage.settings();
    if (!s.reminderEnabled) { return; }
    var lf = this._lastFeed;
    if (!lf) { return; }
    var now = Date.now();
    if (now < (s.alarmSnoozeUntil || 0)) { return; }
    // 用户点过「停止」：同一次喂养 1 小时内不再弹
    if (s.alarmDismissAt && s.alarmFeedId === lf.id && (now - s.alarmDismissAt) < 3600000) { return; }
    if ((now - lf.time) >= (s.feedInterval || 180) * 60000) {
      wx.navigateTo({ url: '/pages/alarm/alarm' });
    }
  },

  /* ---------- 跳转 ---------- */
  goAdd: function () {
    var app = getApp();
    app.globalData.pendingType = '';
    app.globalData.editingId = '';
    wx.switchTab({ url: '/pages/record/record' });
  },
  goHistory: function () {
    wx.navigateTo({ url: '/pages/history/history' });
  },
  onNextTap: function () {
    if (!this.data.hasFeed) { this.goAdd(); }
  }
});
