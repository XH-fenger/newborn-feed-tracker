// 全部记录 —— 按日分组 / 类型筛选 / 点击进编辑
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

var FILTERS = [
  { k: 'all', t: '全部' },
  { k: 'feed', t: '喂养' },
  { k: 'diaper', t: '尿布' },
  { k: 'sleep', t: '睡眠' }
];

var METHOD_TXT = { breast: '母乳', formula: '奶粉', mixed: '混合' };
var SIDE_TXT = { left: '左侧', right: '右侧', both: '双侧' };
var DIAPER_TXT = { pee: '尿', poop: '便', both: '都有' };

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    filters: FILTERS,
    filter: 'all',
    segIndex: 0,
    total: 0,
    groups: [],
    ic: {},
    icBack: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var patch = { theme: g.theme, dark: g.dark };
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
    var rows = records.map(rowOf);
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
    this.setData({ groups: groups, total: records.length });
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
    var app = getApp();
    app.globalData.editingId = id;
    app.globalData.pendingType = '';
    wx.switchTab({ url: '/pages/record/record' });
  },

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});

function rowOf(r) {
  var o = { id: r.id, dayKey: T.dayKey(r.time), hm: T.fmtHM(r.time), title: '', detail: '', iconKey: '', icBg: '' };
  if (r.type === 'feed') {
    var m = METHOD_TXT[r.feedMethod] || '喂养';
    o.title = r.feedMethod === 'breast' ? m + ' · ' + (SIDE_TXT[r.side] || '') : m;
    if (r.feedMethod === 'breast') {
      o.detail = (r.duration > 0 ? r.duration + ' 分钟' : '未记时长') +
        (r.amount > 0 ? ' · 瓶喂 ' + r.amount + ' ml' : '') +
        (r.start && r.end ? ' · ' + T.fmtHM(r.start) + ' - ' + T.fmtHM(r.end) : '');
    } else {
      o.detail = '奶量 ' + (r.amount || 0) + ' ml';
    }
    o.iconKey = r.feedMethod === 'breast' ? 'feed19' : 'bottle19';
    o.icBg = 'feedS';
  } else if (r.type === 'diaper') {
    o.title = '换尿布 · ' + (DIAPER_TXT[r.diaperType] || '');
    o.detail = r.note || '状态正常';
    o.iconKey = 'diaper19'; o.icBg = 'diaperS';
  } else if (r.type === 'sleep') {
    o.title = '睡眠';
    o.detail = T.fmtDur(r.duration || 0) +
      (r.start && r.end ? ' · ' + T.fmtHM(r.start) + ' - ' + T.fmtHM(r.end) : '');
    o.iconKey = 'sleep19'; o.icBg = 'sleepS';
  } else if (r.type === 'growth') {
    o.title = '成长测量';
    var parts = [];
    if (r.weight > 0) { parts.push('体重 ' + r.weight + ' kg'); }
    if (r.height > 0) { parts.push('身高 ' + r.height + ' cm'); }
    if (r.headCirc > 0) { parts.push('头围 ' + r.headCirc + ' cm'); }
    o.detail = parts.join(' · ') || '已记录';
    o.iconKey = 'growth19'; o.icBg = 'growthS';
  }
  return o;
}
