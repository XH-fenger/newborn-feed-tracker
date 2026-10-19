// 全部记录 —— 按日分组 / 类型筛选 / 点击进编辑
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

var rowsOf = require('../../utils/recordRow.js');
var FILTERS = [
  { k: 'all', t: '全部' },
  { k: 'feed', t: '喂养' },
  { k: 'diaper', t: '尿布' },
  { k: 'sleep', t: '睡眠' },
  { k: 'med', t: '补充' },
  { k: 'temp', t: '体温' }
];
var FILTER_NAME = { all: '', feed: '喂养', diaper: '尿布', sleep: '睡眠', med: '补充', temp: '体温' };

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    filters: FILTERS,
    filter: 'all',
    emptyLabel: '',
    segIndex: 0,
    total: 0,
    groups: [],
    ic: {},
    icBack: '',
    openId: ''
  },

  onLoad: function (q) {
    this.setData(require('../../utils/nav.js').metrics());
    var type = q && q.type;
    for (var i = 0; i < FILTERS.length; i++) {
      if (FILTERS[i].k === type) {
        this.setData({ filter: type, segIndex: i });
        break;
      }
    }
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark, elder: !!g.elder };
    var ic = this.buildIcons();
    patch.ic = ic.ic;
    patch.icBack = ic.icBack;
    this.setData(patch);
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }
    this.refresh();
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
    if (sc && this.data.openId) { this.setData({ openId: '' }); }
  },

  buildIcons: function () {
    var c = theme.current();
    return {
      icBack: icons.svg('back', c.priInk, 17, 2.6),
      ic: {
        feed19: icons.svg('feed', c.feed, 19, 2),
        bottle19: icons.svg('bottle', c.feed, 19, 2),
        diaper19: icons.svg('diaper', c.diaper, 19, 2),
        sleep19: icons.svg('sleep', c.sleep, 19, 2),
        growth19: icons.svg('growth', c.growth, 19, 2),
        med19: icons.svg('med', c.pri, 19, 2),
        temp19: icons.svg('temp', c.temp, 19, 2),
        empty: icons.svg('list', c.ink3, 44, 1.6)
      }
    };
  },

  refresh: function () {
    var filter = this.data.filter;
    var records = storage.records();
    if (filter !== 'all') {
      records = records.filter(function (r) { return r.type === filter; });
    }
    var rows = records.map(function (r) {
      var o = rowsOf.rowOf(r);
      o.hm = T.fmtHM(r.time);
      return o;
    });
    // 按日分组（倒序）
    var groups = [];
    var map = {};
    rows.forEach(function (r) {
      var key = r.dayKey;
      if (!map[key]) {
        map[key] = { label: T.dayLabel(key), key: key, rows: [] };
        groups.push(map[key]);
      }
      map[key].rows.push(r);
    });
    this.setData({ groups: groups, total: records.length, emptyLabel: FILTER_NAME[filter] || '', openId: '' });
  },

  onSegTap: function (e) {
    var k = e.currentTarget.dataset.k;
    var i = e.currentTarget.dataset.i;
    if (k === this.data.filter) { return; }
    this.setData({ filter: k, segIndex: i });
    this.refresh();
  },

  onRowTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.openId === id) { this.setData({ openId: '' }); return; }
    var app = getApp();
    app.globalData.editingId = id;
    app.globalData.pendingType = '';
    wx.switchTab({ url: '/pages/record/record' });
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

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
