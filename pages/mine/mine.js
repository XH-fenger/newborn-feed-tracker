// 我的 —— 资料头卡 / 提醒 / 外观主题 / 数据 / 危险区（3 组 + 危险卡 + 页脚）
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var exporter = require('../../utils/export.js');
var T = require('../../utils/time.js');

var THEME_LIST = [
  { k: 'indigo', name: '靛蓝', dot: 'linear-gradient(135deg,#4149C4,#6F79E8)' },
  { k: 'mint', name: '晨雾青', dot: 'linear-gradient(135deg,#0A7A70,#189F92)' },
  { k: 'sun', name: '暖阳橘', dot: 'linear-gradient(135deg,#A8500F,#D97427)' },
  { k: 'berry', name: '莓果粉', dot: 'linear-gradient(135deg,#B03A75,#DE6BA6)' }
];
var INTERVAL_OPTS = [90, 120, 150, 180, 210, 240];
var INTERVAL_TXT = ['1.5 小时', '2 小时', '2.5 小时', '3 小时', '3.5 小时', '4 小时'];

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navH: 44,
    navBottom: 88,
    capsuleRight: 96,
    ic: {},
    themes: THEME_LIST,
    profile: { name: '宝宝', meta: '', count: 0, days: 0, daily: 0 },
    reminderEnabled: true,
    intervalH: 3,
    intervalTxt: '3 小时',
    todoOpen: 0
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
      if (tb) { tb.sync(g.theme, g.dark); tb.setSelected(3); }
    }
    theme.syncWindow(g.theme, g.dark);
    this.paintBar(!!this.data.navSc);
    this.refresh();
  },

  paintBar: function (scrolled) {
    var light = scrolled && !this.data.dark;
    try {
      wx.setNavigationBarColor({
        frontColor: light ? '#000000' : '#ffffff',
        backgroundColor: light ? '#F4F6FC' : '#121418'
      });
    } catch (e) { }
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) {
      this.setData({ navSc: sc });
      this.paintBar(sc);
    }
  },

  buildIcons: function () {
    var c = theme.current();
    return {
      ic: {
        baby: storage.baby().gender === 'F' ? '/assets/avatar-girl.png' : '/assets/avatar-boy.png',
        pen: icons.svg('pen', c.pri, 12, 2.5),
        bell: icons.svg('bell', c.pri, 19, 2),
        clock: icons.svg('clock', c.diaper, 19, 2),
        todo: icons.svg('calendar', c.pri, 19, 2),
        sleep: icons.svg('sleep', c.sleep, 19, 2),
        moon: icons.svg('moon', c.pri, 19, 2),
        down: icons.svg('down', c.growth, 19, 2),
        up: icons.svg('up', c.pri, 19, 2),
        trash: icons.svg('trash', c.danger, 19, 2),
        check: icons.svg('check', c.pri, 14, 3.2)
      }
    };
  },

  refresh: function () {
    var baby = storage.baby();
    var records = storage.records();
    var s = storage.settings();
    var ms = statsMod.mineStats(records, baby.birthday);
    var gender = baby.gender === 'F' ? '女宝' : '男宝';
    var meta = gender + (baby.birthday ? ' · 出生 ' + baby.birthday + ' · ' + T.ageText(baby.birthday) : ' · 待完善资料');
    var itv = s.feedInterval || 180;
    this.setData({
      profile: { name: baby.name || '宝宝', meta: meta, count: ms.count, days: ms.days, daily: ms.daily },
      reminderEnabled: !!s.reminderEnabled,
      intervalH: Math.round(itv / 60),
      intervalTxt: (Math.round(itv / 60 * 10) / 10) + ' 小时',
      todoOpen: storage.todos().filter(function (t) { return !t.done; }).length
    });
  },

  /* ---------- 资料头卡 ---------- */
  goBaby: function () {
    wx.navigateTo({ url: '/pages/baby/baby' });
  },

  /* ---------- 提醒 ---------- */
  toggleReminder: function (e) {
    var v = !this.data.reminderEnabled;
    storage.saveSetting('reminderEnabled', v);
    this.setData({ reminderEnabled: v });
  },
  pickInterval: function () {
    var that = this;
    var cur = (storage.settings().feedInterval || 180) / 60;
    var txts = INTERVAL_TXT.map(function (t, i) {
      return INTERVAL_OPTS[i] / 60 === cur ? t + '（当前）' : t;
    });
    wx.showActionSheet({
      itemList: txts,
      success: function (r) {
        var v = INTERVAL_OPTS[r.tapIndex];
        storage.saveSetting('feedInterval', v);
        that.setData({ intervalH: v / 60, intervalTxt: (v / 60) + ' 小时' });
      }
    });
  },
  goTodo: function () {
    wx.navigateTo({ url: '/pages/todo/todo' });
  },
  /* ---------- 外观主题 ---------- */
  onThemePick: function (e) {
    var k = e.currentTarget.dataset.k;
    if (k === this.data.theme) { return; }
    theme.apply(k, this.data.dark);
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show('已切换 · ' + theme.THEMES[k].name); }
  },
  toggleDark: function () {
    theme.apply(this.data.theme, !this.data.dark);
  },

  /* ---------- 数据 ---------- */
  doExport: function () {
    exporter.exportData();
  },
  doImport: function () {
    var that = this;
    exporter.importData(function () { that.refresh(); });
  },
  doClear: function () {
    var that = this;
    wx.showModal({
      title: '清空全部记录？',
      content: '共 ' + storage.records().length + ' 条喂养等记录将被删除，不可恢复。待办会保留。建议先导出备份。',
      confirmText: '清空',
      confirmColor: '#D93A3F',
      success: function (r) {
        if (r.confirm) {
          storage.clearRecords();
          var toast = that.selectComponent('#toast');
          if (toast) { toast.show('已清空全部数据'); }
          that.refresh();
        }
      }
    });
  }
});
