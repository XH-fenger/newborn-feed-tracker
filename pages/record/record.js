// 记一笔 —— 喂养 / 尿布 / 睡眠 / 成长 / 补充 / 体温（新增 + 编辑共用）
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

var SEGS = [
  { k: 'feed', t: '喂养' },
  { k: 'diaper', t: '尿布' },
  { k: 'sleep', t: '睡眠' },
  { k: 'growth', t: '成长' },
  { k: 'med', t: '补充' },
  { k: 'temp', t: '体温' }
];

var rowsOf = require('../../utils/recordRow.js');
var MEDS = rowsOf.MEDS;
var DOSE_PH = {
  k1: '如 1 滴',
  vd: '如 1 滴 或 400 IU',
  ad: '如 1 滴',
  iron: '如 0.5 ml',
  other: '如 1 滴 / 1 ml'
};

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
      amt: 120,
      showSide: false,
      showDur: false,
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
    weight: '', height: '', headCirc: '',
    // —— 补充剂 ——
    meds: MEDS,
    medKey: 'vd',
    medName: '',
    dose: '',
    dosePh: DOSE_PH.vd,
    // —— 体温（默认早晚各一次：14 点前早测，之后晚测）——
    tempSlot: 'am',
    celsius: '36.5',
    tempHint: '',
    tempHi: false,
    fieldErr: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    this.initForm();
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark, elder: !!g.elder, navMeta: '今天 · ' + T.fmtCNMD(Date.now()) };
    var ic = this.buildIcons();
    patch.icCal = ic.icCal;
    patch.icClock = ic.icClock;
    this.setData(patch);

    if (typeof this.getTabBar === 'function') {
      var tb = this.getTabBar();
      if (tb) { tb.sync(g.theme, g.dark); tb.setSelected(1); }
    }
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }

    // Tab 页常驻：每次进入都是一笔新记录。从历史/统计点进来才载入编辑。
    var app = getApp();
    if (app.globalData.editingId) {
      this.loadForEdit(app.globalData.editingId);
      app.globalData.editingId = '';
    } else if (this.data.timing && this._startTs) {
      this.syncTimerNow();
    } else {
      var pending = app.globalData.pendingType;
      var pendingSlot = app.globalData.pendingSlot;
      this.initForm();
      if (pending) {
        this.switchSegByKey(pending);
        if (pending === 'temp' && (pendingSlot === 'am' || pendingSlot === 'pm')) {
          this.applyTempSlot(pendingSlot, true);
        }
        app.globalData.pendingType = '';
        app.globalData.pendingSlot = '';
      }
    }
  },

  onHide: function () {
    if (this.data.timing) { return; }
    this.initForm();
  },

  buildIcons: function () {
    var c = theme.current();
    return {
      icCal: icons.svg('calendar', c.ink3, 17, 1.9),
      icClock: icons.svg('clock', c.ink3, 17, 1.9)
    };
  },

  // 重置为「新增 · 当前时间」默认值
  initForm: function (keepSeg) {
    this._editId = '';
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
      amt: 120,
      showSide: false, showDur: false, showAmt: true,
      diaperType: 'poop',
      sDate: T.nowYMD(), sTime: T.nowHM(),
      eDate: T.nowYMD(), eTime: T.nowHM(),
      sleepDurTxt: '0 分',
      weight: '', height: '', headCirc: '',
      medKey: 'vd', medName: '', dose: '', dosePh: DOSE_PH.vd,
      tempSlot: new Date().getHours() < 14 ? 'am' : 'pm',
      celsius: '36.5',
      tempHint: '',
      fieldErr: ''
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
      patch.showSide = r.feedMethod === 'mixed';
      patch.showDur = r.feedMethod === 'mixed';
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
    } else if (r.type === 'med') {
      patch.medKey = r.medKey || 'vd';
      patch.medName = r.medName || '';
      patch.dose = r.dose || '';
      patch.dosePh = DOSE_PH[patch.medKey] || DOSE_PH.other;
    } else if (r.type === 'temp') {
      patch.tempSlot = rowsOf.tempSlot(r);
      patch.celsius = rowsOf.fmtC(r.celsius);
    }
    this.setData(patch);
    this._editId = id;
    if (r.type === 'temp') { this.refreshTempHint(); }
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
    this.setData({ seg: k, segIndex: i, fieldErr: '' });
    if (k === 'temp') { this.refreshTempHint(); this.refreshTempFever(); }
  },

  /* ---------- 行内分段 ---------- */
  onFeedMethod: function (e) {
    var v = e.currentTarget.dataset.v;
    if (v === this.data.feedMethod) { return; }
    // 母乳是解冻后按量瓶喂，和奶粉一样记毫升；只有混合才保留亲喂侧与时长
    var amt = this.data.amt;
    if (!(amt > 0)) { amt = 120; }
    this.setData({
      feedMethod: v,
      showSide: v === 'mixed',
      showDur: v === 'mixed',
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
    this.setData({ amt: this.stepBy(this.data.amt, e.currentTarget.dataset.op, 600), fieldErr: '' });
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
    if (raw === '') { this.setData({ amt: '', fieldErr: '' }); return; }
    this.setData({ amt: this.clampInt(raw, 600), fieldErr: '' });
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
  onDateChange: function (e) {
    this.setData({ dateStr: e.detail.value });
    this.refreshTempHint();
  },
  onTimeChange: function (e) { this.setData({ timeStr: e.detail.value }); },
  onSDate: function (e) { this.setData({ sDate: e.detail.value, fieldErr: '' }); this.calcSleep(); },
  onSTime: function (e) { this.setData({ sTime: e.detail.value, fieldErr: '' }); this.calcSleep(); },
  onEDate: function (e) { this.setData({ eDate: e.detail.value, fieldErr: '' }); this.calcSleep(); },
  onETime: function (e) { this.setData({ eTime: e.detail.value, fieldErr: '' }); this.calcSleep(); },
  calcSleep: function () {
    var s = T.tsOf(this.data.sDate, this.data.sTime);
    var e = T.tsOf(this.data.eDate, this.data.eTime);
    if (e < s) { this.setData({ sleepDurTxt: '结束需晚于开始' }); return; }
    this.setData({ sleepDurTxt: T.fmtDur((e - s) / 60000) });
  },

  /* ---------- 文本输入 ---------- */
  onNote: function (e) { this.setData({ note: e.detail.value }); },
  onWeight: function (e) { this.setData({ weight: e.detail.value, fieldErr: '' }); },
  onHeight: function (e) { this.setData({ height: e.detail.value, fieldErr: '' }); },
  onHead: function (e) { this.setData({ headCirc: e.detail.value, fieldErr: '' }); },
  onMed: function (e) {
    var k = e.currentTarget.dataset.v;
    this.setData({ medKey: k, dosePh: DOSE_PH[k] || DOSE_PH.other });
  },
  onMedName: function (e) { this.setData({ medName: e.detail.value, fieldErr: '' }); },
  onDose: function (e) { this.setData({ dose: e.detail.value, fieldErr: '' }); },

  applyTempSlot: function (slot, snapClock) {
    var patch = { tempSlot: slot === 'pm' ? 'pm' : 'am', fieldErr: '' };
    if (snapClock) { patch.timeStr = slot === 'pm' ? '20:00' : '08:00'; }
    this.setData(patch);
    this.refreshTempHint();
  },
  onTempSlot: function (e) {
    var slot = e.currentTarget.dataset.v;
    if (slot === this.data.tempSlot) { return; }
    this.applyTempSlot(slot, true);
  },
  clampTemp: function (raw) {
    var n = parseFloat(raw);
    if (n !== n) { return ''; }
    n = Math.round(n * 10) / 10;
    if (n < 34) { n = 34; }
    if (n > 42) { n = 42; }
    return n.toFixed(1);
  },
  stepTemp: function (e) {
    var n = parseFloat(this.data.celsius);
    if (n !== n) { n = 36.5; }
    n += e.currentTarget.dataset.op === 'dec' ? -0.1 : 0.1;
    this.setData({ celsius: this.clampTemp(n), fieldErr: '' });
    this.refreshTempFever();
  },
  onTempInput: function (e) {
    var raw = e.detail.value;
    if (raw === '' || raw === '.') { this.setData({ celsius: raw, fieldErr: '' }); return; }
    this.setData({ celsius: raw, fieldErr: '' });
    this.refreshTempFever();
  },
  onTempBlur: function () {
    var v = this.clampTemp(this.data.celsius);
    this.setData({ celsius: v || '36.5' });
    this.refreshTempFever();
  },
  refreshTempFever: function () {
    if (this.data.seg !== 'temp') {
      if (this.data.tempHi) { this.setData({ tempHi: false }); }
      return;
    }
    var c = parseFloat(this.data.celsius);
    var hi = (c >= 37.5);
    if (hi !== this.data.tempHi) { this.setData({ tempHi: hi }); }
  },
  goMedSeg: function () {
    this.switchSegByKey('med');
  },
  refreshTempHint: function () {
    if (this.data.seg !== 'temp') {
      if (this.data.tempHint) { this.setData({ tempHint: '' }); }
      return;
    }
    var day = this.data.dateStr;
    var slot = this.data.tempSlot;
    var rs = storage.records();
    var found = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.type !== 'temp' || !(r.celsius > 0)) { continue; }
      if (T.fmtYMD(r.time) !== day) { continue; }
      if (rowsOf.tempSlot(r) !== slot) { continue; }
      if (this._editId && r.id === this._editId) { continue; }
      found = r;
      break;
    }
    var hint = '';
    if (found) {
      var when = day === T.nowYMD() ? '今天' : day.slice(5);
      hint = when + (slot === 'pm' ? '晚测' : '早测') + '已有 ' + rowsOf.fmtC(found.celsius) + ' °C，保存会再记一笔';
    }
    this.setData({ tempHint: hint });
  },

  /* ---------- 保存 / 删除 ---------- */
  onSave: function () {
    var d = this.data;
    var rec = null;

    if (d.seg === 'feed') {
      var ts = T.tsOf(d.dateStr, d.timeStr);
      rec = { type: 'feed', time: ts, feedMethod: d.feedMethod, note: d.note };
      var durN = this.clampInt(d.dur, 240);
      var amtN = this.clampInt(d.amt, 600);
      if (d.feedMethod === 'mixed') {
        rec.side = d.side;
        rec.duration = durN;
      }
      if (!(amtN > 0)) {
        this.setData({ fieldErr: 'amt' }); return;
      }
      rec.amount = amtN;
    } else if (d.seg === 'diaper') {
      rec = { type: 'diaper', time: T.tsOf(d.dateStr, d.timeStr), diaperType: d.diaperType, note: d.note };
    } else if (d.seg === 'sleep') {
      var s = T.tsOf(d.sDate, d.sTime);
      var e2 = T.tsOf(d.eDate, d.eTime);
      if (e2 <= s) {
        this.setData({ fieldErr: 'sleep' }); return;
      }
      rec = { type: 'sleep', time: s, start: s, end: e2, duration: Math.round((e2 - s) / 60000), note: d.note };
    } else if (d.seg === 'growth') {
      var w = parseFloat(d.weight);
      var h = parseFloat(d.height);
      var hc = parseFloat(d.headCirc);
      if (!(w > 0) && !(h > 0) && !(hc > 0)) {
        this.setData({ fieldErr: 'growth' }); return;
      }
      rec = { type: 'growth', time: T.tsOf(d.dateStr, '12:00'), note: d.note };
      if (w > 0) { rec.weight = Math.round(w * 100) / 100; }
      if (h > 0) { rec.height = Math.round(h * 10) / 10; }
      if (hc > 0) { rec.headCirc = Math.round(hc * 10) / 10; }
    } else if (d.seg === 'med') {
      var name = (d.medName || '').trim();
      var dose = (d.dose || '').trim();
      if (d.medKey === 'other' && !name) {
        this.setData({ fieldErr: 'medName' }); return;
      }
      if (!dose) {
        this.setData({ fieldErr: 'dose' }); return;
      }
      rec = {
        type: 'med',
        time: T.tsOf(d.dateStr, d.timeStr),
        medKey: d.medKey,
        medName: d.medKey === 'other' ? name : '',
        dose: dose,
        note: d.note
      };
    } else if (d.seg === 'temp') {
      var c = parseFloat(d.celsius);
      if (!(c >= 34 && c <= 42)) {
        this.setData({ fieldErr: 'temp' }); return;
      }
      rec = {
        type: 'temp',
        time: T.tsOf(d.dateStr, d.timeStr),
        slot: d.tempSlot === 'pm' ? 'pm' : 'am',
        celsius: Math.round(c * 10) / 10,
        note: d.note
      };
    }

    if (!rec) { return; }
    if (this._editId) {
      storage.updateRecord(this._editId, rec);
      this._editId = '';
    } else {
      storage.addRecord(rec);
    }
    var segName = { feed: '喂养', diaper: '尿布', sleep: '睡眠', growth: '成长', med: '补充剂', temp: '体温' }[d.seg];
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
    var id = this._editId;
    if (!id) { return; }
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后 4 秒内可撤销',
      confirmText: '删除',
      confirmColor: '#D93A3F',
      success: function (r) {
        if (!r.confirm) { return; }
        require('../../utils/undo.js').request(that, {
          kind: 'record', id: id, msg: '已删除记录',
          refresh: function () { that._editId = ''; that.initForm(true); }
        });
      }
    });
  }
});
