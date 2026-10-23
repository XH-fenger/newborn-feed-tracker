// 奶量计算器 —— 按日龄 / 体重给出每次、每天参考量，并对照今天已记录的奶量
var storage = require('../../utils/storage.js');
var stats = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');
var milk = require('../../utils/milk.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navH: 44,
    icBack: '',
    weight: '',
    weightSrc: '',
    weightErr: false,
    feeds: 8,
    kind: 'breast',
    preterm: false,
    fortify: 'none',
    result: { ok: false },
    needWeight: false,
    todayMl: 0,
    gap: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    this._weightTouched = false;
    this._feedsTouched = false;
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

  goBaby: function () {
    wx.navigateTo({ url: '/pages/baby/baby' });
  },

  onWeight: function (e) {
    this._weightTouched = true;
    this.setData({ weight: e.detail.value, weightSrc: '' });
    this.paint();
  },

  onFeedDec: function () {
    if (this.data.feeds <= 4) { return; }
    this._feedsTouched = true;
    this.setData({ feeds: this.data.feeds - 1 });
    this.paint();
  },

  onFeedInc: function () {
    if (this.data.feeds >= 12) { return; }
    this._feedsTouched = true;
    this.setData({ feeds: this.data.feeds + 1 });
    this.paint();
  },

  onKind: function (e) {
    var k = e.currentTarget.dataset.k === 'formula' ? 'formula' : 'breast';
    this.data.kind = k;
    this.setData({ kind: k });
    this.paint();
  },

  onCohort: function (e) {
    var preterm = e.currentTarget.dataset.k === 'preterm';
    this.data.preterm = preterm;
    this.setData({ preterm: preterm });
    this.paint();
  },

  onFort: function (e) {
    var k = e.currentTarget.dataset.k;
    if (k !== 'half' && k !== 'full') { k = 'none'; }
    this.data.fortify = k;
    this.setData({ fortify: k });
    this.paint();
  },

  parseWeight: function (raw) {
    var s = String(raw || '').trim().replace(/,/g, '.');
    if (!s) { return { empty: true, kg: 0, bad: false }; }
    if (!/^\d+(\.\d+)?$/.test(s)) { return { empty: false, kg: 0, bad: true }; }
    var kg = Math.round(parseFloat(s) * 100) / 100;
    if (!(kg >= 0.5 && kg <= 20)) { return { empty: false, kg: 0, bad: true }; }
    return { empty: false, kg: kg, bad: false };
  },

  paint: function () {
    var baby = storage.baby();
    var records = storage.records();
    var age = T.ageDays(baby.birthday);
    var found = milk.latestWeight(records, baby);
    var weight = this.data.weight;
    var weightSrc = this.data.weightSrc;
    var feeds = this.data.feeds;

    if (!this._weightTouched && found) {
      weight = String(found.kg);
      weightSrc = found.source;
    }
    if (!this._feedsTouched) {
      feeds = milk.defaultFeeds(age);
    }

    var parsed = this.parseWeight(weight);
    var todayMl = stats.todayStats(records).feedMl;
    var result = { ok: false };
    var needWeight = false;
    var gap = '';

    if (parsed.bad) {
      needWeight = false;
    } else {
      result = milk.suggest({
        ageDays: age,
        weightKg: parsed.kg,
        feeds: feeds,
        kind: this.data.kind,
        preterm: this.data.preterm,
        fortify: this.data.kind === 'breast' ? this.data.fortify : 'none'
      });
      needWeight = !result.ok && !!result.needWeight;
      if (result.ok) { gap = milk.gapText(todayMl, result.dayMid); }
    }

    this.setData({
      weight: weight,
      weightSrc: this._weightTouched ? '' : weightSrc,
      weightErr: parsed.bad,
      feeds: feeds,
      result: result.ok ? result : { ok: false },
      needWeight: needWeight && !parsed.bad,
      todayMl: todayMl,
      gap: gap
    });
  }
});
