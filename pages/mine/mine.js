// 我的 —— 资料头卡 / 提醒 / 外观主题 / 数据 / 危险区（3 组 + 危险卡 + 页脚）
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var exporter = require('../../utils/export.js');
var share = require('../../utils/share.js');
var T = require('../../utils/time.js');

var THEME_NAME = { indigo: '靛蓝', mint: '晨雾青', sun: '暖阳橘', berry: '莓果粉' };

Page({
  data: {
    theme: 'indigo',
    dark: false,
    elder: false,
    sbH: 44,
    navH: 44,
    navBottom: 88,
    capsuleRight: 96,
    ic: {},
    profile: { name: '宝宝', meta: '', count: 0, days: 0, daily: 0 },
    themeName: '靛蓝',
    todoOpen: 0
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
        todo: icons.svg('calendar', c.pri, 19, 2),
        sliders: icons.svg('sliders', c.sleep, 19, 2),
        down: icons.svg('down', c.growth, 19, 2),
        up: icons.svg('up', c.pri, 19, 2),
        trash: icons.svg('trash', c.danger, 19, 2)
      }
    };
  },

  refresh: function () {
    var baby = storage.baby();
    var records = storage.records();
    var ms = statsMod.mineStats(records, baby.birthday);
    var gender = baby.gender === 'F' ? '女宝' : '男宝';
    var meta = gender + (baby.birthday ? ' · 出生 ' + baby.birthday + ' · ' + T.ageText(baby.birthday) : ' · 待完善资料');
    this.setData({
      profile: { name: baby.name || '宝宝', meta: meta, count: ms.count, days: ms.days, daily: ms.daily },
      themeName: THEME_NAME[getApp().globalData.theme] || '靛蓝',
      todoOpen: storage.todos().filter(function (t) { return !t.done; }).length
    });
  },

  /* ---------- 资料头卡 ---------- */
  goBaby: function () {
    wx.navigateTo({ url: '/pages/baby/baby' });
  },

  goStreak: function () {
    wx.navigateTo({ url: '/pages/streak/streak' });
  },

  goTodo: function () {
    wx.navigateTo({ url: '/pages/todo/todo' });
  },
  goSettings: function () {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /* ---------- 数据 ---------- */
  doExport: function () {
    exporter.exportData();
  },
  doExportCsv: function () {
    exporter.exportCsv();
  },
  doShare: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['今日摘要', '近 7 天摘要'],
      success: function (r) {
        if (that._sharing) { return; }
        that._sharing = true;
        that.setData({ sharing: true });
        var data = r.tapIndex === 1 ? share.weeklyData() : share.dailyData();
        // 不用原生 showLoading/hideLoading（与原生 toast 冲突会卡出残影），用按钮状态代替
        share.share(data, function (err) {
          that._sharing = false;
          that.setData({ sharing: false });
          var msg = err ? ((err && err.errMsg) || '生成失败') : '已生成摘要';
          var toast = that.selectComponent('#toast');
          if (toast) { toast.show(msg); }
        });
      }
    });
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
