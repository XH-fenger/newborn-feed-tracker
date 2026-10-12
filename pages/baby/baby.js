// 宝宝资料 —— 昵称 / 性别 / 出生日期 / 出生体重
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    icBack: '',
    icCal: '',
    name: '',
    gender: 'M',
    birthday: '',
    birthWeight: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    var baby = storage.baby();
    this.setData({
      name: baby.name || '',
      gender: baby.gender || 'M',
      birthday: baby.birthday || T.nowYMD(),
      birthWeight: baby.birthWeight > 0 ? String(baby.birthWeight) : ''
    });
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark,
      icBack: icons.svg('back', c.priInk, 17, 2.6),
      icCal: icons.svg('calendar', c.ink3, 17, 1.9)
    });
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  onName: function (e) { this.setData({ name: e.detail.value }); },
  onGender: function (e) {
    this.setData({ gender: e.currentTarget.dataset.v });
  },
  onBirthday: function (e) { this.setData({ birthday: e.detail.value }); },
  onWeight: function (e) { this.setData({ birthWeight: e.detail.value }); },

  onSave: function () {
    var d = this.data;
    var name = (d.name || '').trim();
    if (!name) { wx.showToast({ title: '请填写昵称', icon: 'none' }); return; }
    if (!d.birthday) { wx.showToast({ title: '请选择出生日期', icon: 'none' }); return; }
    var w = parseFloat(d.birthWeight);
    if (d.birthWeight && !(w > 0 && w < 10)) {
      wx.showToast({ title: '出生体重请在 0-10 kg 之间', icon: 'none' }); return;
    }
    storage.saveBaby({
      name: name,
      gender: d.gender,
      birthday: d.birthday,
      birthWeight: w > 0 ? Math.round(w * 100) / 100 : ''
    });
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show('已保存宝宝资料'); }
    setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 600);
  },

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
