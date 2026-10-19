// 哄睡 —— 白噪音 / 粉噪 / 棕噪 / 雨声 / 心跳，可定时停止
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var player = require('../../utils/noisePlayer.js');

var KINDS = [
  { k: 'white', t: '白噪音' },
  { k: 'pink', t: '粉噪音' },
  { k: 'brown', t: '棕噪音' },
  { k: 'dryer', t: '吹风机' },
  { k: 'razor', t: '剃须刀' },
  { k: 'fan', t: '风扇' },
  { k: 'stream', t: '流水' },
  { k: 'rain', t: '雨声' },
  { k: 'wave', t: '海浪' },
  { k: 'heart', t: '心跳' }
];
var TIMERS = [
  { m: 15, t: '15 分钟' },
  { m: 30, t: '30 分钟' },
  { m: 45, t: '45 分钟' },
  { m: 60, t: '60 分钟' },
  { m: 0, t: '不停' }
];

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navH: 44,
    icBack: '',
    kinds: KINDS,
    timers: TIMERS,
    kind: 'white',
    kindName: '白噪音',
    minutes: 30,
    volume: 60,
    pri: '#5A67E8',
    sliderBg: '#E4E8F2',
    playing: false,
    status: '选一种声音，再点开始',
    error: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark, elder: !!g.elder,
      pri: c.pri,
      sliderBg: c.fill,
      icBack: icons.svg('back', c.priInk, 17, 2.6)
    });
    theme.syncWindow(g.theme, g.dark);
    try {
      wx.setNavigationBarColor({
        frontColor: g.dark ? '#ffffff' : '#000000',
        backgroundColor: g.dark ? '#121418' : '#F4F6FC'
      });
    } catch (e) { }
    var that = this;
    this._unsub = player.subscribe(function () { that.paint(); });
    player.tick();
    this.paint();
    this._clock = setInterval(function () {
      player.tick();
      that.paint();
    }, 1000);
  },

  onHide: function () {
    if (this._clock) { clearInterval(this._clock); this._clock = null; }
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  onUnload: function () { this.onHide(); },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
  },

  onBack: function () { wx.navigateBack({ delta: 1 }); },

  paint: function () {
    var s = player.snapshot();
    var kind = s.playing ? s.kind : this.data.kind;
    var status = '选一种声音，再点开始';
    if (s.playing) {
      if (!s.until) { status = '不自动停止'; }
      else {
        var left = Math.max(0, s.until - Date.now());
        var min = Math.ceil(left / 60000);
        status = min < 1 ? '不到 1 分钟后停止' : '剩余 ' + min + ' 分钟';
      }
    }
    var patch = {
      kind: kind,
      kindName: player.TITLES[kind] || '白噪音',
      minutes: s.playing ? s.minutes : this.data.minutes,
      playing: s.playing,
      status: status,
      error: s.error || ''
    };
    if (!this._volTouch) { patch.volume = s.volume; }
    this.setData(patch);
  },

  onVolume: function (e) {
    this._volTouch = true;
    player.setVolume(e.detail.value);
    this.setData({ volume: player.snapshot().volume });
  },

  onVolumeEnd: function (e) {
    this._volTouch = false;
    player.setVolume(e.detail.value);
    this.setData({ volume: player.snapshot().volume });
  },

  onToggle: function () {
    if (player.snapshot().playing) {
      player.stop();
      this.paint();
      return;
    }
    player.play(this.data.kind, this.data.minutes);
    this.setData({ playing: true, status: '正在准备声音…', error: '' });
  },

  onKind: function (e) {
    var k = e.currentTarget.dataset.k;
    if (!player.TITLES[k]) { return; }
    this.setData({ kind: k });
    if (player.snapshot().playing) { player.play(k, this.data.minutes); }
  },

  onTimer: function (e) {
    var m = parseInt(e.currentTarget.dataset.m, 10);
    if (m !== 0 && !(m > 0)) { return; }
    this.setData({ minutes: m });
    var s = player.snapshot();
    if (s.playing) { player.play(s.kind, m); }
  }
});
