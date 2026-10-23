var player = require('../../utils/noisePlayer.js');
var storage = require('../../utils/storage.js');
var icons = require('../../utils/icons.js');
var theme = require('../../utils/theme.js');

var place = {
  top: 0,
  side: 'right',
  inited: false
};

function bounds() {
  var info = {};
  try { info = wx.getSystemInfoSync() || {}; } catch (e) { info = {}; }
  var winH = info.windowHeight || 640;
  var winW = info.windowWidth || 375;
  var safeBottom = 0;
  if (info.safeArea && info.screenHeight) {
    safeBottom = Math.max(0, info.screenHeight - info.safeArea.bottom);
  }
  var min = (info.statusBarHeight || 20) + 56;
  var max = winH - 120 - safeBottom - 52;
  if (max < min) { max = min; }
  return { min: min, max: max, width: winW };
}

function clampTop(top) {
  var b = bounds();
  if (top < b.min) { return b.min; }
  if (top > b.max) { return b.max; }
  return top;
}

function ensurePlace() {
  if (place.inited) { return; }
  place.inited = true;
  var saved = {};
  try { saved = storage.settings() || {}; } catch (e) { saved = {}; }
  place.side = saved.noiseDockSide === 'left' ? 'left' : 'right';
  var b = bounds();
  var top = saved.noiseDockTop;
  if (typeof top !== 'number') { top = Math.round(b.min + (b.max - b.min) * 0.42); }
  place.top = clampTop(top);
}

Component({
  data: {
    show: false,
    open: false,
    playing: false,
    title: '哄睡',
    theme: 'indigo',
    dark: false,
    elder: false,
    top: 320,
    side: 'right',
    icNote: ''
  },

  lifetimes: {
    attached: function () {
      var that = this;
      ensurePlace();
      this.setData({ top: place.top, side: place.side });
      this.syncLook();
      this.paint();
      this._unsub = player.subscribe(function () { that.paint(); });
    },
    detached: function () {
      this.clearHide();
      if (this._unsub) { this._unsub(); this._unsub = null; }
    }
  },

  pageLifetimes: {
    show: function () {
      ensurePlace();
      this.clearHide();
      this.setData({ top: place.top, side: place.side, open: false });
      this.syncLook();
      player.tick();
      this.paint();
    }
  },

  methods: {
    syncLook: function () {
      var app = getApp();
      var g = (app && app.globalData) || {};
      var c = theme.current();
      this.setData({
        theme: g.theme || 'indigo',
        dark: !!g.dark,
        elder: !!g.elder,
        icNote: icons.svg('note', c.pri, 18, 2.2)
      });
    },

    onNoisePage: function () {
      var pages = getCurrentPages();
      var cur = pages[pages.length - 1];
      return !!(cur && (cur.route === 'pages/noise/noise' || cur.route === 'pages/alarm/alarm'));
    },

    paint: function () {
      var s = player.snapshot();
      this.setData({
        show: !!s.dock && !this.onNoisePage(),
        playing: !!s.playing,
        title: s.title || '哄睡'
      });
    },

    clearHide: function () {
      if (this._hideTimer) {
        clearTimeout(this._hideTimer);
        this._hideTimer = null;
      }
    },

    armHide: function () {
      var that = this;
      this.clearHide();
      this._hideTimer = setTimeout(function () {
        that._hideTimer = null;
        if (that.data.open) { that.setData({ open: false }); }
      }, 2800);
    },

    persist: function () {
      place.top = this.data.top;
      place.side = this.data.side;
      try {
        storage.saveSetting('noiseDockTop', place.top);
        storage.saveSetting('noiseDockSide', place.side);
      } catch (e) { }
    },

    onTouchStart: function (e) {
      var t = (e.touches && e.touches[0]) || {};
      this._sx = t.clientX || 0;
      this._sy = t.clientY || 0;
      this._top0 = this.data.top;
      this._moved = false;
      this._act = (e.target && e.target.dataset && e.target.dataset.act) || 'ear';
      this.clearHide();
    },

    onTouchMove: function (e) {
      var t = (e.touches && e.touches[0]) || {};
      var x = t.clientX || 0;
      var y = t.clientY || 0;
      if (Math.abs(x - this._sx) > 8 || Math.abs(y - this._sy) > 8) { this._moved = true; }
      if (!this._moved) { return; }
      var b = bounds();
      var side = x < b.width / 2 ? 'left' : 'right';
      this.setData({
        top: clampTop(this._top0 + (y - this._sy)),
        side: side
      });
    },

    onTouchEnd: function () {
      if (this._moved) {
        this.persist();
        if (this.data.open) { this.armHide(); }
        return;
      }
      if (!this.data.open || this._act === 'ear') {
        var open = !this.data.open;
        this.setData({ open: open });
        if (open) { this.armHide(); }
        return;
      }
      if (this._act === 'toggle') {
        this.onToggle();
        this.armHide();
        return;
      }
      if (this._act === 'page') {
        this.onOpen();
        return;
      }
      this.armHide();
    },

    onOpen: function () {
      if (this.onNoisePage()) { return; }
      wx.navigateTo({ url: '/pages/noise/noise' });
    },

    onToggle: function () {
      var s = player.snapshot();
      if (s.playing) { player.stop(); }
      else { player.play(s.kind, s.minutes); }
    }
  }
});
