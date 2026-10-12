// 记一笔 —— 喂养 / 尿布 / 睡眠 / 成长 四类表单（新增 + 编辑共用）
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
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
    editing: false,
    editTitle: '',
    // —— 公共 ——
    dateStr: '',
    timeStr: '',
    note: '',
    // —— 喂养 ——
    feedMethod: 'breast',
    side: 'right',
    dur: 15,
    amt: 0,
    showSide: true,
    showDur: true,
    showAmt: true,
    // 计时器
    timing: false,
    timerTxt: '00:00',
    // —— 尿布 ——
    diaperType: 'poop',
    // —— 睡眠 ——
    sDate: '', sTime: '', eDate: '', eTime: '',
    sleepDurTxt: '--',
    // —— 成长 ——
    weight: '', height: '', headCirc: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    this.initForm();
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark, navMeta: '今天 · ' + T.fmtCNMD(Date.now()) };
    var ic = this.buildIcons();
    patch.icBack = ic.icBack;
    patch.icCal = ic.icCal;
    patch.icClock = ic.icClock;
    this.setData(patch);

    if (typeof this.getTabBar === 'function') {
      var tb = this.getTabBar();
      if (tb) { tb.sync(g.theme, g.dark); tb.setSelected(1); }
    }
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }

    // Tab 页无法带参：从 globalData 消费「待新增类型 / 待编辑记录」
    var app = getApp();
    if (app.globalData.editingId) {
      this.loadForEdit(app.globalData.editingId);
      app.globalData.editingId = '';
    } else if (app.globalData.pendingType) {
      this.switchSegByKey(app.globalData.pendingType);
      app.globalData.pendingType = '';
    }

    // 计时器跨页恢复（Tab 页常驻，仅校准显示）
    if (this.data.timing && this._startTs) {
      this.syncTimerNow();
    }
  },

  onHide: function () { /* 页面常驻，计时器基于时间戳，无需处理 */ },

  // 主题相关图标（返回箭头 / 日历 / 时钟）
  buildIcons: function () {
    var c = theme.current();
    return {
      icBack: icons.svg('back', c.priInk, 17, 2.6),
      icCal: icons.svg('calendar', c.ink3, 17, 1.9),
      icClock: icons.svg('clock', c.ink3, 17, 1.9)
    };
  },

  // 重置为「新增 · 当前时间」默认值
  initForm: function (keepSeg) {
    this.setData({
      seg: keepSeg ? this.data.seg : 'feed',
      segIndex: keepSeg ? this.data.segIndex : 0,
      editing: false,
      editTitle: '',
      dateStr: T.nowYMD(),
      timeStr: T.nowHM(),
      note: '',
      feedMethod: 'breast',
      side: 'right',
      dur: 15,
      amt: 0,
      showSide: true, showDur: true, showAmt: true,
      diaperType: 'poop',
      sDate: T.nowYMD(), sTime: T.nowHM(),
      eDate: T.nowYMD(), eTime: T.nowHM(),
      sleepDurTxt: '0 分',
      weight: '', height: '', headCirc: ''
    });
    this.stopTimer(true);
  },

  // —— 编辑模式：载入既有记录 ——
  loadForEdit: function (id) {
    var r = storage.getRecord(id);
    if (!r) { this.initForm(); return; }
    var patch = {
      editing: true,
      editTitle: '编辑记录',
      seg: r.type,
      segIndex: SEGS.findIndex(function (s) { return s.k === r.type; }),
      dateStr: T.fmtYMD(r.time),
      timeStr: T.fmtHM(r.time),
      note: r.note || ''
    };
    if (r.type === 'feed') {
      patch.feedMethod = r.feedMethod || 'breast';
      patch.side = r.side || 'right';
      patch.dur = r.duration || 0;
      patch.amt = r.amount || 0;
      patch.showSide = r.feedMethod === 'breast' || r.feedMethod === 'mixed';
      patch.showDur = r.feedMethod === 'breast' || r.feedMethod === 'mixed';
      patch.showAmt = true;
    } else if (r.type === 'diaper') {
      patch.diaperType = r.diaperType || 'poop';
    } else if (r.type === 'sleep') {
      patch.sDate = T.fmtYMD(r.start || r.time);
      patch.sTime = T.fmtHM(r.start || r.time);
      patch.eDate = T.fmtYMD(r.end || r.time);
      patch.eTime = T.fmtHM(r.end || r.time);
      patch.sleepDurTxt = T.fmtDur(r.duration || 0);
    } else if (r.type === 'growth') {
      patch.weight = r.weight > 0 ? String(r.weight) : '';
      patch.height = r.height > 0 ? String(r.height) : '';
      patch.headCirc = r.headCirc > 0 ? String(r.headCirc) : '';
    }
    this.setData(patch);
    this._editId = id;
  },

  /* ---------- 分段切换 ---------- */
  switchSegByKey: function (k) {
    var i = SEGS.findIndex(function (s) { return s.k === k; });
    if (i < 0) { return; }
    this.setData({ seg: k, segIndex: i });
  },
  onSegTap: function (e) {
    var k = e.currentTarget.dataset.k;
    var i = e.currentTarget.dataset.i;
    if (k === this.data.seg) { return; }
    this.setData({ seg: k, segIndex: i });
  },

  /* ---------- 行内分段 ---------- */
  onFeedMethod: function (e) {
    var v = e.currentTarget.dataset.v;
    if (v === this.data.feedMethod) { return; }
    // 母乳：奶量可选（吸出瓶喂场景），默认清 0；奶粉/混合：奶量必填，0 时给常用值
    var amt = this.data.amt;
    if (v === 'breast') { amt = 0; }
    else if (!(amt > 0)) { amt = 120; }
    this.setData({
      feedMethod: v,
      showSide: v === 'breast' || v === 'mixed',
      showDur: v === 'breast' || v === 'mixed',
      showAmt: true,
      amt: amt
    });
  },
  onSide: function (e) { this.setData({ side: e.currentTarget.dataset.v }); },
  onDiaperType: function (e) { this.setData({ diaperType: e.currentTarget.dataset.v }); },

  /* ---------- 步进器（步长 1，不小于 0；负号不走 dataset，避免被解析成 null） ---------- */
  clampInt: function (raw, max) {
    if (raw === '' || raw == null) { return 0; }
    var n = parseInt(raw, 10);
    if (n !== n || n < 0) { return 0; }
    if (n > max) { return max; }
    return n;
  },
  stepBy: function (cur, op, max) {
    var n = this.clampInt(cur, max);
    if (op === 'dec') { n -= 1; }
    else { n += 1; }
    return this.clampInt(n, max);
  },
  stepDur: function (e) {
    if (this.data.timing) { return; }
    this.setData({ dur: this.stepBy(this.data.dur, e.currentTarget.dataset.op, 240) });
  },
  stepAmt: function (e) {
    this.setData({ amt: this.stepBy(this.data.amt, e.currentTarget.dataset.op, 600) });
  },
  onDurInput: function (e) {
    var raw = e.detail.value;
    if (raw === '') { this.setData({ dur: '' }); return; }
    this.setData({ dur: this.clampInt(raw, 240) });
  },
  onDurBlur: function () {
    this.setData({ dur: this.clampInt(this.data.dur, 240) });
  },
  onAmtInput: function (e) {
    var raw = e.detail.value;
    if (raw === '') { this.setData({ amt: '' }); return; }
    this.setData({ amt: this.clampInt(raw, 600) });
  },
  onAmtBlur: function () {
    this.setData({ amt: this.clampInt(this.data.amt, 600) });
  },

  /* ---------- 母乳计时器（时间戳驱动，切后台回来自动校准） ---------- */
  toggleTimer: function () {
    if (this.data.timing) {
      // 结束 → 写入时长
      this.stopTimer(false);
    } else {
      this._startTs = Date.now();
      this.setData({ timing: true, timerTxt: '00:00' });
      this._timer = setInterval((function () { this.syncTimerNow(); }).bind(this), 500);
    }
  },
  syncTimerNow: function () {
    var sec = Math.max(0, Math.round((Date.now() - this._startTs) / 1000));
    var m = T.pad2(Math.floor(sec / 60));
    var s = T.pad2(sec % 60);
    this.setData({ timerTxt: m + ':' + s, dur: Math.floor(sec / 60) });
  },
  stopTimer: function (silent) {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (!silent && this._startTs) {
      var min = Math.round((Date.now() - this._startTs) / 60000);
      this.setData({ dur: min });
    }
    this._startTs = 0;
    this.setData({ timing: false });
  },

  /* ---------- picker ---------- */
  onDateChange: function (e) { this.setData({ dateStr: e.detail.value }); },
  onTimeChange: function (e) { this.setData({ timeStr: e.detail.value }); },
  onSDate: function (e) { this.setData({ sDate: e.detail.value }); this.calcSleep(); },
  onSTime: function (e) { this.setData({ sTime: e.detail.value }); this.calcSleep(); },
  onEDate: function (e) { this.setData({ eDate: e.detail.value }); this.calcSleep(); },
  onETime: function (e) { this.setData({ eTime: e.detail.value }); this.calcSleep(); },
  calcSleep: function () {
    var s = T.tsOf(this.data.sDate, this.data.sTime);
    var e = T.tsOf(this.data.eDate, this.data.eTime);
    if (e < s) { this.setData({ sleepDurTxt: '结束需晚于开始' }); return; }
    this.setData({ sleepDurTxt: T.fmtDur((e - s) / 60000) });
  },

  /* ---------- 文本输入 ---------- */
  onNote: function (e) { this.setData({ note: e.detail.value }); },
  onWeight: function (e) { this.setData({ weight: e.detail.value }); },
  onHeight: function (e) { this.setData({ height: e.detail.value }); },
  onHead: function (e) { this.setData({ headCirc: e.detail.value }); },

  /* ---------- 保存 / 删除 ---------- */
  onSave: function () {
    var d = this.data;
    var rec = null;

    if (d.seg === 'feed') {
      var ts = T.tsOf(d.dateStr, d.timeStr);
      rec = { type: 'feed', time: ts, feedMethod: d.feedMethod, note: d.note };
      var durN = this.clampInt(d.dur, 240);
      var amtN = this.clampInt(d.amt, 600);
      if (d.feedMethod !== 'formula') {
        rec.side = d.side;
        rec.duration = durN;
      }
      if (d.feedMethod === 'formula' && !(amtN > 0)) {
        wx.showToast({ title: '请输入奶量', icon: 'none' }); return;
      }
      if (amtN > 0) { rec.amount = amtN; } // 母乳可选（吸出瓶喂），奶粉/混合必填
    } else if (d.seg === 'diaper') {
      rec = { type: 'diaper', time: T.tsOf(d.dateStr, d.timeStr), diaperType: d.diaperType, note: d.note };
    } else if (d.seg === 'sleep') {
      var s = T.tsOf(d.sDate, d.sTime);
      var e2 = T.tsOf(d.eDate, d.eTime);
      if (e2 <= s) {
        wx.showToast({ title: '结束时间需晚于开始', icon: 'none' }); return;
      }
      rec = { type: 'sleep', time: s, start: s, end: e2, duration: Math.round((e2 - s) / 60000), note: d.note };
    } else if (d.seg === 'growth') {
      var w = parseFloat(d.weight);
      var h = parseFloat(d.height);
      var hc = parseFloat(d.headCirc);
      if (!(w > 0) && !(h > 0) && !(hc > 0)) {
        wx.showToast({ title: '至少填写一项测量值', icon: 'none' }); return;
      }
      rec = { type: 'growth', time: T.tsOf(d.dateStr, '12:00'), note: d.note };
      if (w > 0) { rec.weight = Math.round(w * 100) / 100; }
      if (h > 0) { rec.height = Math.round(h * 10) / 10; }
      if (hc > 0) { rec.headCirc = Math.round(hc * 10) / 10; }
    }

    if (!rec) { return; }
    if (this._editId) {
      storage.updateRecord(this._editId, rec);
      this._editId = '';
    } else {
      storage.addRecord(rec);
    }
    var segName = { feed: '喂养', diaper: '尿布', sleep: '睡眠', growth: '成长' }[d.seg];
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show('已保存' + segName + '记录'); }
    var that = this;
    setTimeout(function () {
      that.initForm(true);
      wx.switchTab({ url: '/pages/index/index' });
    }, 600);
  },

  onDelete: function () {
    var that = this;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#D93A3F',
      success: function (r) {
        if (r.confirm && that._editId) {
          storage.deleteRecord(that._editId);
          that._editId = '';
          var toast = that.selectComponent('#toast');
          if (toast) { toast.show('已删除记录'); }
          setTimeout(function () {
            that.initForm(true);
            wx.switchTab({ url: '/pages/index/index' });
          }, 600);
        }
      }
    });
  },

  onBack: function () {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
