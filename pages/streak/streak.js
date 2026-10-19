// 已坚持 —— 连续记录天数、里程碑和当月有记录的日期
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var streakMod = require('../../utils/streak.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navH: 44,
    icBack: '',
    streak: 0,
    goalText: '',
    fillPct: 0,
    startOn: false,
    marks: [],
    title: '',
    cells: [],
    canNext: false,
    year: 2026,
    month: 1
  },

  onLoad: function () {
    var now = new Date();
    this.setData(require('../../utils/nav.js').metrics());
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark, elder: !!g.elder,
      icBack: icons.svg('back', c.priInk, 17, 2.6)
    });
    theme.syncWindow(g.theme, g.dark);
    try {
      wx.setNavigationBarColor({
        frontColor: g.dark ? '#ffffff' : '#000000',
        backgroundColor: g.dark ? '#121418' : '#F4F6FC'
      });
    } catch (e) { }
    this.paint();
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  prevMonth: function () {
    var y = this.year;
    var m = this.month - 1;
    if (m < 1) { m = 12; y--; }
    this.year = y;
    this.month = m;
    this.paint();
  },

  nextMonth: function () {
    if (!this.data.canNext) { return; }
    var y = this.year;
    var m = this.month + 1;
    if (m > 12) { m = 1; y++; }
    this.year = y;
    this.month = m;
    this.paint();
  },

  paint: function () {
    var map = streakMod.dayMap(storage.records());
    var streak = streakMod.streakCount(map);
    var goal = streakMod.nextGoal(streak);
    var now = new Date();
    var atNow = this.year > now.getFullYear() || (this.year === now.getFullYear() && this.month >= now.getMonth() + 1);
    if (this.year > now.getFullYear() || (this.year === now.getFullYear() && this.month > now.getMonth() + 1)) {
      this.year = now.getFullYear();
      this.month = now.getMonth() + 1;
      atNow = true;
    }
    this.setData({
      streak: streak,
      goalText: goal ? '连续记录满 ' + goal + ' 天' : '已连续记录 28 天',
      fillPct: Math.max(0, Math.min(100, Math.round(streak / 28 * 1000) / 10)),
      startOn: streak > 0,
      marks: streakMod.marks(streak),
      title: this.year + ' 年 ' + this.month + ' 月',
      cells: streakMod.monthGrid(this.year, this.month, map),
      canNext: !atNow
    });
  }
});
