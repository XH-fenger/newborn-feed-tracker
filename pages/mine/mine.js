// 我的 —— 资料头卡 / 提醒 / 外观主题 / 数据 / 危险区（3 组 + 危险卡 + 页脚）
var storage = require('../../utils/storage.js');
var statsMod = require('../../utils/stats.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');
var changelog = require('../../utils/changelog.js');

var THEME_NAME = { indigo: '靛蓝', mint: '晨雾青', sun: '暖阳橘', berry: '莓果粉' };
var THANKS_AD = 'adunit-1e19b139e4d2d47a';
// var CODE_IMG = '/assets/mp-code.png';
var FB_WX = 'chanEr131027';
var FB_MAIL = 'fengger1102@gmail.com';

function cnLogDate(iso) {
  var p = (iso || '').split('-');
  if (p.length < 3) { return iso || ''; }
  return Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日';
}

function maskMid(s) {
  if (!s || s.length <= 4) { return '****'; }
  return s.slice(0, 3) + '****' + s.slice(-3);
}

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
    todoOpen: 0,
    fbOpen: false,
    fbWxMask: maskMid(FB_WX),
    fbMailMask: maskMid(FB_MAIL),
    // shareOpen: false,
    // codeImg: CODE_IMG,
    // codeMissing: false,
    logHint: changelog.length ? '最近更新 ' + cnLogDate(changelog[0].date) : '暂无记录'
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
    this.prepareThanksAd();
  },

  onUnload: function () {
    if (this._thanksAd && this._thanksAd.destroy) {
      try { this._thanksAd.destroy(); } catch (e) { }
    }
    this._thanksAd = null;
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
        records: icons.svg('list', c.feed, 19, 2),
        todo: icons.svg('calendar', c.pri, 19, 2),
        sliders: icons.svg('sliders', c.sleep, 19, 2),
        down: icons.svg('down', c.growth, 19, 2),
        heart: icons.svg('heart', c.temp, 19, 2),
        chat: icons.svg('chat', c.pri, 19, 2),
        // share: icons.svg('share', c.sleep, 19, 2),
        log: icons.svg('clock', c.growth, 19, 2)
      }
    };
  },

  refresh: function () {
    var baby = storage.baby();
    var records = storage.records();
    var ms = statsMod.mineStats(records, baby.birthday);
    var gender = baby.gender === 'F' ? '女宝' : '男宝';
    var meta = gender + (baby.preterm ? ' · 早产' : '') + (baby.birthday ? ' · 出生 ' + baby.birthday + ' · ' + T.ageText(baby.birthday) : ' · 待完善资料');
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

  goHistory: function () {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goTodo: function () {
    wx.navigateTo({ url: '/pages/todo/todo' });
  },
  goSettings: function () {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  // 推荐给朋友：入口和弹窗先停用，恢复时与 wxml 一起打开
  // onShareAppMessage: function () {
  //   return {
  //     title: '新生儿喂养记录，喂奶、尿布和睡眠都记在这里',
  //     path: '/pages/index/index'
  //   };
  // },
  // openShare: function () { this.setData({ shareOpen: true }); },
  // closeShare: function () { this.setData({ shareOpen: false }); },
  // onCodeError: function () { this.setData({ codeMissing: true }); },
  // saveCode: function () {
  //   var toast = this.selectComponent('#toast');
  //   if (this.data.codeMissing) {
  //     if (toast) { toast.show('还没有小程序码图片'); }
  //     return;
  //   }
  //   var run = function () {
  //     wx.saveImageToPhotosAlbum({
  //       filePath: CODE_IMG,
  //       success: function () { if (toast) { toast.show('已保存到相册'); } },
  //       fail: function () {
  //         wx.showModal({
  //           title: '需要相册权限',
  //           content: '请允许保存到相册，才能把小程序码发给朋友。',
  //           confirmText: '去设置',
  //           success: function (r) { if (r.confirm) { wx.openSetting(); } }
  //         });
  //       }
  //     });
  //   };
  //   wx.getSetting({
  //     success: function (res) {
  //       if (res.authSetting['scope.writePhotosAlbum']) { run(); return; }
  //       wx.authorize({
  //         scope: 'scope.writePhotosAlbum',
  //         success: run,
  //         fail: function () {
  //           wx.showModal({
  //             title: '需要相册权限',
  //             content: '请允许保存到相册，才能把小程序码发给朋友。',
  //             confirmText: '去设置',
  //             success: function (r) { if (r.confirm) { wx.openSetting(); } }
  //           });
  //         }
  //       });
  //     }
  //   });
  // },

  goData: function () {
    wx.navigateTo({ url: '/pages/data/data' });
  },

  prepareThanksAd: function () {
    if (!wx.createInterstitialAd) { return; }
    var ad = wx.createInterstitialAd({ adUnitId: THANKS_AD });
    ad.onError(function () {});
    this._thanksAd = ad;
  },

  goLog: function () {
    wx.navigateTo({ url: '/pages/changelog/changelog' });
  },

  openFeedback: function () { this.setData({ fbOpen: true }); },
  closeFeedback: function () { this.setData({ fbOpen: false }); },
  noop: function () {},

  copyFeedback: function (e) {
    var k = e.currentTarget.dataset.k;
    var text = k === 'mail' ? FB_MAIL : FB_WX;
    var label = k === 'mail' ? '邮箱' : '微信号';
    var toast = this.selectComponent('#toast');
    wx.setClipboardData({
      data: text,
      success: function () {
        try { wx.hideToast(); } catch (err) { }
        if (toast) { toast.show(label + '已复制'); }
      }
    });
  },

  onThanks: function () {
    var that = this;
    var toast = this.selectComponent('#toast');
    var ad = this._thanksAd;
    if (!ad) {
      if (toast) { toast.show('当前环境暂不支持广告'); }
      return;
    }
    var fail = function () {
      if (toast) { toast.show('广告暂时没有内容'); }
    };
    ad.show().catch(function () {
      ad.load().then(function () { return ad.show(); }).catch(fail);
    });
  }
});
