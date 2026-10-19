// 首页 —— 今日概览 / 距上次喂养 / 最近记录 / 提醒触发
var storage = require('../../utils/storage.js');
var stats = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');
var schedule = require('../../utils/schedule.js');
var motion = require('../../utils/motion.js');

var rowsOf = require('../../utils/recordRow.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navBottom: 88,
    capsuleRight: 96,
    ic: {},
    baby: { name: '宝宝' },
    heroMeta: '',
    dayChip: '第 1 天',
    today: { feedCount: 0, feedMl: 0, diaper: 0, sleepText: '0h 0m' },
    todayTemp: {
      am: { empty: true, text: '待测', sub: '建议 8:00', hi: false, lo: false, id: '' },
      pm: { empty: true, text: '待测', sub: '建议 20:00', hi: false, lo: false, id: '' }
    },
    hasFeed: false,
    next: { hh: '00', mm: '00', sub: '', nextHM: '--:--' },
    rows: [],
    empty: true,
    openId: '',
    todoPreview: [],
    todoMore: 0
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark, elder: !!g.elder };
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
    this.checkTodoHint();
  },

  onHide: function () { this.stopTicker(); },
  onUnload: function () { this.stopTicker(); },

  // 固定图标集（主题切换时由 theme.apply 触发重建）
  buildIcons: function () {
    var c = theme.current();
    return {
      ic: {
        sun: icons.svg('sun', '#FFFFFF', 13, 2.2),
        sunBtn: icons.svg('sun', '#FFFFFF', 16, 2.2),
        moonBtn: icons.svg('moon', '#FFFFFF', 16, 2.2),
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
        med19: icons.svg('med', c.pri, 19, 2),
        temp19: icons.svg('temp', c.temp, 19, 2),
        todo19: icons.svg('calendar', c.pri, 19, 2),
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
      todayTemp: stats.todayTempView(records),
      hasFeed: !!lf,
      rows: this.buildRows(records.slice(0, 3)),
      empty: records.length === 0,
      openId: ''
    };
    var todo = this.buildTodoPreview();
    patch.todoPreview = todo.preview;
    patch.todoMore = todo.more;
    patch.vacCard = this.nextVaccine();
    patch.fever = this.feverInfo(records);
    this.setData(patch);
    this._interval = s.feedInterval;
    this._lastFeed = lf;
    this.refreshNext();
  },

  nextVaccine: function () {
    var start = T.todayStart();
    var best = null;
    storage.todos().forEach(function (t) {
      if (t.kind !== 'vaccine' || t.done) { return; }
      if (!best || t.due < best.due) { best = t; }
    });
    if (!best) { return null; }
    var diff = Math.round((best.due - start) / 86400000);
    var daysText;
    if (diff <= 0) { daysText = '已逾期 ' + (-diff) + ' 天'; }
    else if (diff === 1) { daysText = '明天'; }
    else { daysText = diff + ' 天后'; }
    return { title: best.title, when: T.fmtMD(best.due), daysText: daysText };
  },

  feverInfo: function (records) {
    var t = stats.todayTempView(records);
    if (t.am && t.am.hi) { return { slot: 'am' }; }
    if (t.pm && t.pm.hi) { return { slot: 'pm' }; }
    return null;
  },

  goMed: function () {
    var app = getApp();
    app.globalData.pendingType = 'med';
    app.globalData.pendingSlot = '';
    wx.switchTab({ url: '/pages/record/record' });
  },

  // 最近记录行（iconKey + icBg → 渲染时查 data.ic / CSS 变量，主题切换自动生效）
  buildRows: function (list) {
    return list.map(function (r) {
      var o = rowsOf.rowOf(r);
      o.key = r.id;
      o.hm = T.fmtHM(r.time);
      return o;
    });
  },

  buildTodoPreview: function () {
    var start = T.todayStart();
    var open = storage.todos().filter(function (t) { return !t.done; });
    open.sort(function (a, b) { return a.due - b.due; });
    var preview = open.slice(0, 2).map(function (t) {
      var checkup = t.kind === 'checkup';
      var other = t.kind === 'other';
      return {
        id: t.id,
        title: t.title,
        when: schedule.dueLabel(t.due),
        late: t.due < start,
        iconKey: checkup ? 'growth19' : (other ? 'todo19' : 'med19'),
        icBg: checkup ? 'growthS' : 'priSoft'
      };
    });
    return { preview: preview, more: Math.max(0, open.length - preview.length) };
  },

  checkTodoHint: function () {
    var app = getApp();
    var today = T.fmtYMD(Date.now());
    if (app.globalData.todoHintDay === today) { return; }
    var start = T.todayStart();
    var n = 0;
    storage.todos().forEach(function (t) {
      if (!t.done && t.due <= start) { n++; }
    });
    if (!n) { return; }
    app.globalData.todoHintDay = today;
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show(n + ' 件待办到了或已逾期'); }
  },

  // 夜间（22:00–07:00）自动放宽喂养间隔，减少半夜误触闹钟
  isNight: function () {
    var h = new Date().getHours();
    return h < 7 || h >= 22;
  },

  // 距上次喂养（供 ticker 每分钟轻量刷新）
  refreshNext: function () {
    var lf = this._lastFeed;
    if (!lf) {
      this.setData({ 'next.hh': '00', 'next.mm': '00', 'next.sub': '还没有喂养记录', 'next.nextHM': '--:--' });
      this.drawRing(0);
      return;
    }
    var s = storage.settings();
    var interval = this.isNight() ? (s.nightFeedInterval || 240) : (s.feedInterval || 180);
    var sinceMin = Math.max(0, Math.round((Date.now() - lf.time) / 60000));
    var nextTs = lf.time + interval * 60000;
    var patch = {
      'next.hh': T.pad2(Math.floor(sinceMin / 60)),
      'next.mm': T.pad2(sinceMin % 60),
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

    if (!animate || motion.reduced()) { paint(pct); return; }
    var seq = (this._ringSeq = (this._ringSeq || 0) + 1);
    var t0 = 0;
    function step() {
      if (seq !== that._ringSeq || !that._ringCtx) { return; }
      var now = Date.now();
      if (!t0) { t0 = now; }
      var p = Math.min(1, (now - t0) / 900);
      var eased = 1 - Math.pow(1 - p, 3);
      try { paint(pct * eased); } catch (e) { return; }
      if (p < 1 && that._ringCv && that._ringCv.requestAnimationFrame) {
        that._ringCv.requestAnimationFrame(step);
      }
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
    var interval = this.isNight() ? (s.nightFeedInterval || 240) : (s.feedInterval || 180);
    if ((now - lf.time) >= interval * 60000) {
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
  goHistory: function (e) {
    var type = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.type;
    var url = '/pages/history/history';
    if (type) { url += '?type=' + type; }
    wx.navigateTo({ url: url });
  },
  goTodo: function () {
    wx.navigateTo({ url: '/pages/todo/todo' });
  },
  goCalc: function () {
    wx.navigateTo({ url: '/pages/calc/calc' });
  },
  goNoise: function () {
    wx.navigateTo({ url: '/pages/noise/noise' });
  },
  toggleDark: function () {
    theme.manualToggle();
  },
  onPageScroll: function () {
    if (this.data.openId) { this.setData({ openId: '' }); }
  },
  onRecentTap: function (e) {
    if (this.data.openId === e.currentTarget.dataset.id) {
      this.setData({ openId: '' });
      return;
    }
    this.goHistory();
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
    if (!id) { return; }
    var that = this;
    require('../../utils/undo.js').request(this, {
      kind: 'record', id: id, msg: '已删除记录',
      refresh: function () { that.refresh(); }
    });
  },
  onNextTap: function () {
    if (!this.data.hasFeed) { this.goAdd(); }
  },
  onTempTap: function (e) {
    var slot = e.currentTarget.dataset.slot === 'pm' ? 'pm' : 'am';
    var cell = slot === 'pm' ? this.data.todayTemp.pm : this.data.todayTemp.am;
    var app = getApp();
    if (cell && cell.id) {
      app.globalData.editingId = cell.id;
      app.globalData.pendingType = '';
      app.globalData.pendingSlot = '';
    } else {
      app.globalData.editingId = '';
      app.globalData.pendingType = 'temp';
      app.globalData.pendingSlot = slot;
    }
    wx.switchTab({ url: '/pages/record/record' });
  }
});
