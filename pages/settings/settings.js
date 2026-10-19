// 设置 —— 提醒间隔 / 外观主题 / 深色与老年模式
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');

var THEME_LIST = [
  { k: 'indigo', name: '靛蓝', dot: 'linear-gradient(135deg,#4149C4,#6F79E8)' },
  { k: 'mint', name: '晨雾青', dot: 'linear-gradient(135deg,#0A7A70,#189F92)' },
  { k: 'sun', name: '暖阳橘', dot: 'linear-gradient(135deg,#A8500F,#D97427)' },
  { k: 'berry', name: '莓果粉', dot: 'linear-gradient(135deg,#B03A75,#DE6BA6)' }
];
var INTERVAL_OPTS = [90, 120, 150, 180, 210, 240];
var INTERVAL_TXT = ['1.5 小时', '2 小时', '2.5 小时', '3 小时', '3.5 小时', '4 小时'];
var NIGHT_OPTS = [180, 210, 240, 300, 360, 420];
var NIGHT_TXT = ['3 小时', '3.5 小时', '4 小时', '5 小时', '6 小时', '7 小时'];
var THEME_NAME = { indigo: '靛蓝', mint: '晨雾青', sun: '暖阳橘', berry: '莓果粉' };

Page({
  data: {
    theme: 'indigo',
    dark: false,
    elder: false,
    sbH: 44,
    navH: 44,
    icBack: '',
    ic: {},
    themes: THEME_LIST,
    themeName: '靛蓝',
    reminderEnabled: true,
    intervalTxt: '3 小时',
    nightIntervalTxt: '4 小时',
    darkAuto: true,
    darkStart: '19:00',
    darkEnd: '07:00',
    darkHint: '',
    darkRange: '19:00–次日 07:00'
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark,
      elder: !!g.elder,
      icBack: icons.svg('back', c.priInk, 17, 2.6)
    });
    theme.syncWindow(g.theme, g.dark);
    try {
      wx.setNavigationBarColor({
        frontColor: g.dark ? '#ffffff' : '#000000',
        backgroundColor: g.dark ? '#121418' : '#F4F6FC'
      });
    } catch (e) { }
    this.refresh();
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  onBack: function () { wx.navigateBack({ delta: 1 }); },

  buildIcons: function () {
    var c = theme.current();
    return {
      ic: {
        bell: icons.svg('bell', c.pri, 19, 2),
        clock: icons.svg('clock', c.diaper, 19, 2),
        moon: icons.svg('moon', c.pri, 19, 2),
        elder: icons.svg('user', c.pri, 19, 2),
        clockDark: icons.svg('clock', c.pri, 19, 2),
        check: icons.svg('check', c.pri, 14, 3.2)
      }
    };
  },

  refresh: function () {
    var s = storage.settings();
    var itv = s.feedInterval || 180;
    var niv = s.nightFeedInterval || 240;
    var g = getApp().globalData;
    var patch = this.buildIcons();
    patch.theme = g.theme;
    patch.themeName = THEME_NAME[g.theme] || '靛蓝';
    patch.reminderEnabled = !!s.reminderEnabled;
    patch.intervalTxt = (Math.round(itv / 60 * 10) / 10) + ' 小时';
    patch.nightIntervalTxt = (Math.round(niv / 60 * 10) / 10) + ' 小时';
    patch.darkAuto = !!s.darkAuto;
    patch.darkStart = s.darkStart || '19:00';
    patch.darkEnd = s.darkEnd || '07:00';
    patch.darkHint = theme.darkHint(s);
    patch.darkRange = theme.rangeText(s);
    this.setData(patch);
  },

  syncDarkMeta: function () { this.refresh(); },

  toggleReminder: function () {
    var v = !this.data.reminderEnabled;
    storage.saveSetting('reminderEnabled', v);
    this.setData({ reminderEnabled: v });
  },

  pickInterval: function () {
    var that = this;
    var cur = (storage.settings().feedInterval || 180) / 60;
    wx.showActionSheet({
      itemList: INTERVAL_TXT.map(function (t, i) {
        return INTERVAL_OPTS[i] / 60 === cur ? t + '（当前）' : t;
      }),
      success: function (r) {
        var v = INTERVAL_OPTS[r.tapIndex];
        storage.saveSetting('feedInterval', v);
        that.setData({ intervalTxt: (v / 60) + ' 小时' });
      }
    });
  },

  pickNightInterval: function () {
    var that = this;
    var cur = (storage.settings().nightFeedInterval || 240) / 60;
    wx.showActionSheet({
      itemList: NIGHT_TXT.map(function (t, i) {
        return NIGHT_OPTS[i] / 60 === cur ? t + '（当前）' : t;
      }),
      success: function (r) {
        var v = NIGHT_OPTS[r.tapIndex];
        storage.saveSetting('nightFeedInterval', v);
        that.setData({ nightIntervalTxt: (v / 60) + ' 小时' });
      }
    });
  },

  onThemePick: function (e) {
    var k = e.currentTarget.dataset.k;
    if (k === this.data.theme) { return; }
    theme.apply(k, this.data.dark);
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show('已切换 · ' + (THEME_NAME[k] || '')); }
    this.refresh();
  },

  toggleDark: function () {
    theme.manualToggle();
    this.syncDarkMeta();
  },

  toggleElder: function () {
    var on = !getApp().globalData.elder;
    theme.setElder(on);
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show(on ? '已开启老年模式' : '已关闭老年模式'); }
  },

  toggleDarkAuto: function () {
    var on = !this.data.darkAuto;
    this.setData({ darkAuto: on });
    theme.setAuto(on);
    this.syncDarkMeta();
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show(on ? '已开启定时暗黑' : '已关闭，保持当前外观'); }
  },

  onDarkStart: function (e) { this.saveDarkRange(e.detail.value, this.data.darkEnd); },
  onDarkEnd: function (e) { this.saveDarkRange(this.data.darkStart, e.detail.value); },

  saveDarkRange: function (start, end) {
    start = this.normHM(start);
    end = this.normHM(end);
    if (!start || !end) { return; }
    if (start === end) {
      var toast = this.selectComponent('#toast');
      if (toast) { toast.show('开始和结束不能相同'); }
      this.syncDarkMeta();
      return;
    }
    theme.setRange(start, end);
    this.syncDarkMeta();
  },

  normHM: function (v) {
    var m = /^(\d{1,2}):(\d{2})/.exec(v || '');
    if (!m) { return ''; }
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (h > 23 || min > 59) { return ''; }
    return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
  }
});
