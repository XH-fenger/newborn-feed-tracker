// 更新日志 —— 按日期排成时间线，内容来自 utils/changelog.js
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var changelog = require('../../utils/changelog.js');

function cnDate(iso) {
  var p = (iso || '').split('-');
  if (p.length < 3) { return iso || ''; }
  return Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日';
}

function groupsOf(list) {
  var groups = [];
  var map = {};
  list.forEach(function (item, i) {
    var key = item.date;
    if (!map[key]) {
      map[key] = { date: cnDate(key), items: [] };
      groups.push(map[key]);
    }
    map[key].items.push({
      hash: item.hash,
      lines: item.lines || [],
      latest: i === 0,
      last: false
    });
  });
  groups.forEach(function (g) {
    if (g.items.length) { g.items[g.items.length - 1].last = true; }
  });
  return groups;
}

Page({
  data: {
    theme: 'indigo',
    dark: false,
    elder: false,
    sbH: 44,
    navH: 44,
    navSc: false,
    icBack: '',
    groups: [],
    latest: ''
  },

  onLoad: function () {
    var groups = groupsOf(changelog);
    this.setData(Object.assign(require('../../utils/nav.js').metrics(), {
      groups: groups,
      latest: groups.length ? groups[0].date : ''
    }));
  },

  onShow: function () {
    var g = getApp().globalData;
    this.setData({
      theme: g.theme,
      dark: g.dark,
      elder: !!g.elder,
      icBack: icons.svg('back', theme.current().priInk, 17, 2.6)
    });
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

  onBack: function () { wx.navigateBack({ delta: 1 }); }
});
