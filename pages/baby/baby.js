// 宝宝资料 —— 昵称 / 性别 / 是否早产 / 出生日期 / 出生体重
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
    birthWeight: '',
    birthHeight: '',
    birthHead: '',
    preterm: false,
    today: '',
    ageText: '',
    nameErr: '',
    weightErr: '',
    heightErr: '',
    headErr: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    var baby = storage.baby();
    var weeks = parseInt(baby.gestWeeks, 10);
    var birthday = baby.birthday || T.nowYMD();
    this.setData({
      name: baby.name || '',
      gender: baby.gender || 'M',
      birthday: birthday,
      birthWeight: baby.birthWeight > 0 ? String(baby.birthWeight) : '',
      birthHeight: baby.birthHeight > 0 ? String(baby.birthHeight) : '',
      birthHead: baby.birthHead > 0 ? String(baby.birthHead) : '',
      preterm: !!baby.preterm || (weeks >= 22 && weeks < 37),
      today: T.nowYMD(),
      ageText: T.ageText(birthday)
    });
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark, elder: !!g.elder,
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

  onName: function (e) { this.setData({ name: e.detail.value, nameErr: '' }); },
  onGender: function (e) {
    this.setData({ gender: e.currentTarget.dataset.v });
  },
  onPreterm: function (e) {
    this.setData({ preterm: e.currentTarget.dataset.v === '1' });
  },
  onBirthday: function (e) {
    var birthday = e.detail.value;
    this.setData({ birthday: birthday, ageText: birthday ? T.ageText(birthday) : '' });
  },
  onWeight: function (e) { this.setData({ birthWeight: e.detail.value, weightErr: '' }); },
  onHeight: function (e) { this.setData({ birthHeight: e.detail.value, heightErr: '' }); },
  onHead: function (e) { this.setData({ birthHead: e.detail.value, headErr: '' }); },

  onSave: function () {
    var d = this.data;
    var name = (d.name || '').trim();
    var nameErr = name ? '' : '请填写昵称';
    var birthdayErr = d.birthday ? '' : '请选择出生日期';
    var w = parseFloat(d.birthWeight);
    var h = parseFloat(d.birthHeight);
    var hd = parseFloat(d.birthHead);
    var weightErr = (d.birthWeight && !(w > 0 && w < 10)) ? '请填 0–10' : '';
    var heightErr = (d.birthHeight && !(h > 0 && h < 120)) ? '请填 0–120' : '';
    var headErr = (d.birthHead && !(hd > 0 && hd < 80)) ? '请填 0–80' : '';
    if (nameErr || birthdayErr || weightErr || heightErr || headErr) {
      this.setData({ nameErr: nameErr, weightErr: weightErr, heightErr: heightErr, headErr: headErr });
      wx.showToast({ title: nameErr || birthdayErr || '出生测量超出范围', icon: 'none' });
      return;
    }
    storage.saveBaby({
      name: name,
      gender: d.gender,
      birthday: d.birthday,
      birthWeight: w > 0 ? Math.round(w * 100) / 100 : '',
      birthHeight: h > 0 ? Math.round(h * 10) / 10 : '',
      birthHead: hd > 0 ? Math.round(hd * 10) / 10 : '',
      preterm: !!d.preterm,
      gestWeeks: '',
      dueDate: ''
    });
    var toast = this.selectComponent('#toast');
    if (toast) { toast.show('已保存宝宝资料'); }
    setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 600);
  },

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
