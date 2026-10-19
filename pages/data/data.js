// 数据 —— 导出、导入、分享摘要、清空
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var exporter = require('../../utils/export.js');
var share = require('../../utils/share.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    elder: false,
    sbH: 44,
    navH: 44,
    navSc: false,
    icBack: '',
    ic: {},
    sharing: false
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark, elder: !!g.elder };
    var ic = this.buildIcons();
    patch.ic = ic.ic;
    patch.icBack = ic.icBack;
    this.setData(patch);
    theme.syncWindow(g.theme, g.dark);
    try {
      wx.setNavigationBarColor({
        frontColor: g.dark ? '#ffffff' : '#000000',
        backgroundColor: g.dark ? '#121418' : '#F4F6FC'
      });
    } catch (e) { }
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  onBack: function () { wx.navigateBack({ delta: 1 }); },

  buildIcons: function () {
    var c = theme.current();
    return {
      icBack: icons.svg('back', c.priInk, 17, 2.6),
      ic: {
        down: icons.svg('down', c.growth, 19, 2),
        up: icons.svg('up', c.pri, 19, 2),
        trash: icons.svg('trash', c.danger, 19, 2)
      }
    };
  },

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
    exporter.importData(function () {});
  },

  doClear: function () {
    var that = this;
    wx.showModal({
      title: '清空全部记录？',
      content: '共 ' + storage.records().length + ' 条喂养等记录将被删除，不可恢复。待办会保留。建议先导出备份。',
      confirmText: '清空',
      confirmColor: '#D93A3F',
      success: function (r) {
        if (!r.confirm) { return; }
        storage.clearRecords();
        var toast = that.selectComponent('#toast');
        if (toast) { toast.show('已清空全部数据'); }
      }
    });
  }
});
