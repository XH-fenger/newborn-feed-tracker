// 提醒闹钟页 —— 全屏 iOS 风格闹钟（震动循环 + 贪睡 9 分钟）
// 进入来源：首页 checkAlarm 超时触发（真实提醒，操作会落库）
// 保留 preview=1 演示分支（纯预览不落库），当前无入口，供调试直达使用
var storage = require('../../utils/storage.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

var SNOOZE_MIN = 9; // 贪睡 9 分钟

function lastFeed() {
  var rs = storage.records();
  for (var i = 0; i < rs.length; i++) { if (rs[i].type === 'feed') { return rs[i]; } }
  return null;
}

Page({
  data: {
    sbH: 44,
    preview: false,
    clock: '--:--',
    bell: '',
    vibe: '',
    sub: ''
  },

  onLoad: function (options) {
    this.setData(require('../../utils/nav.js').metrics());

    var preview = options && options.preview === '1';
    var lf = lastFeed();

    // 副标题：距上次喂养已超过 X 小时 Y 分钟（无记录时给模拟文案）
    var sub = '距上次喂养已超过 3 小时';
    if (lf) {
      var min = Math.max(0, Math.round((Date.now() - lf.time) / 60000));
      var h = Math.floor(min / 60);
      var m = min % 60;
      sub = '距上次喂养已超过 ' + (h > 0 ? h + ' 小时' + (m > 0 ? ' ' + m + ' 分钟' : '') : m + ' 分钟');
    }

    this.setData({
      preview: preview,
      bell: icons.svg('bell', '#FFFFFF', 30, 1.8),
      vibe: icons.svg('vibe', '#ff9f9f', 14, 2),
      sub: sub
    });
  },

  onShow: function () {
    this._resolved = false;   // 是否已通过按钮结账（决定 onHide 是否自动贪睡）
    this.startClock();
    this.startVibe();
  },
  onHide: function () { this.leave(); },
  onUnload: function () { this.leave(); },

  /* ---------- 离开页面：停震动；未通过按钮离开 → 自动贪睡，避免回首页立即重弹 ---------- */
  leave: function () {
    this.stopAll();
    if (!this._resolved && !this.data.preview) {
      storage.saveSetting('alarmSnoozeUntil', Date.now() + SNOOZE_MIN * 60 * 1000);
    }
  },

  /* ---------- 时钟每秒刷新 ---------- */
  startClock: function () {
    var that = this;
    var tick = function () { that.setData({ clock: T.fmtHM(Date.now()) }); };
    tick();
    this._clockTimer = setInterval(tick, 1000);
  },

  /* ---------- 震动循环（近似原型 [300,120,300] 每 1.2s） ---------- */
  startVibe: function () {
    var that = this;
    var pulse = function () {
      wx.vibrateLong({ fail: function () { } });
      that._vt1 = setTimeout(function () {
        wx.vibrateLong({ fail: function () { } });
        that._vt2 = setTimeout(function () {
          wx.vibrateLong({ fail: function () { } });
        }, 450);
      }, 500);
    };
    pulse();
    this._vibeTimer = setInterval(pulse, 1600);
  },
  stopVibe: function () {
    if (this._vibeTimer) { clearInterval(this._vibeTimer); this._vibeTimer = null; }
    if (this._vt1) { clearTimeout(this._vt1); this._vt1 = null; }
    if (this._vt2) { clearTimeout(this._vt2); this._vt2 = null; }
  },
  stopAll: function () {
    this.stopVibe();
    if (this._clockTimer) { clearInterval(this._clockTimer); this._clockTimer = null; }
  },

  /* ---------- 稍后提醒：9 分钟内不再提醒 ---------- */
  onSnooze: function () {
    this._resolved = true;
    this.stopAll();
    if (!this.data.preview) {
      storage.saveSetting('alarmSnoozeUntil', Date.now() + SNOOZE_MIN * 60 * 1000);
    }
    wx.navigateBack();
    wx.showToast({ title: SNOOZE_MIN + ' 分钟后再提醒', icon: 'none' });
  },

  /* ---------- 停止：同一次喂养 1 小时静默 ---------- */
  onStop: function () {
    this._resolved = true;
    this.stopAll();
    if (!this.data.preview) {
      var lf = lastFeed();
      storage.saveSetting('alarmDismissAt', Date.now());
      storage.saveSetting('alarmFeedId', lf ? lf.id : '');
    }
    wx.navigateBack();
    wx.showToast({ title: '已停止提醒', icon: 'none' });
  }
});
