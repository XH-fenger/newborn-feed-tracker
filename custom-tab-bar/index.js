// custom-tab-bar —— 自绘 TabBar：凸起圆钮沿底栏滑动 + 主题联动
var icons = require('../utils/icons.js');
var theme = require('../utils/theme.js');

var TAB_KEYS = ['home', 'list', 'chart', 'user'];
var TAB_TEXT = ['首页', '记录', '统计', '我的'];
var TAB_URLS = ['/pages/index/index', '/pages/record/record', '/pages/stats/stats', '/pages/mine/mine'];
// 各 Tab 页各有一份底栏。滑块落定前都从这里出发，新页面才能接着滑，而不是跳过去。
var shown = 0;

Component({
  data: {
    selected: 0,
    glide: false,
    theme: 'indigo',
    dark: false,
    elder: false,
    tabs: [],
    currentIcon: ''
  },
  lifetimes: {
    attached: function () {
      var g = getApp().globalData;
      this.sync(g.theme, g.dark);
    }
  },
  methods: {
    // 主题/暗黑联动（页面 onShow 与 theme.apply 都会调用）
    sync: function (t, dark) {
      var c = theme.colors(t, dark);
      var tabs = TAB_KEYS.map(function (k, i) {
        return {
          icon: icons.svg(k, c.ink3, 24),
          iconOn: icons.svg(k, '#FFFFFF', 26),
          text: TAB_TEXT[i]
        };
      });
      var sel = this.data.selected;
      var elder = !!(getApp().globalData && getApp().globalData.elder);
      this.setData({
        theme: t,
        dark: !!dark,
        elder: elder,
        tabs: tabs,
        currentIcon: tabs[sel] ? tabs[sel].iconOn : ''
      });
    },
    setSelected: function (n) {
      n = +n;
      if (n !== n || n < 0 || n > 3) { return; }
      var tabs = this.data.tabs;
      var iconOf = function (i) {
        return (tabs[i] && tabs[i].iconOn) || '';
      };
      var from = shown;
      if (this._placed && this.data.selected === n && from === n) { return; }
      if (this._animTo === n) { return; }
      var self = this;
      var settle = function () {
        if (self._animTo === n) { shown = n; self._animTo = null; }
      };
      if (from === n) {
        this._placed = true;
        this._animTo = null;
        shown = n;
        this.setData({ selected: n, glide: false, currentIcon: iconOf(n) || this.data.currentIcon });
        wx.nextTick(function () { self.setData({ glide: true }); });
        return;
      }
      this._placed = true;
      this._animTo = n;
      this.setData({
        selected: from,
        glide: false,
        currentIcon: iconOf(from) || iconOf(n) || this.data.currentIcon
      });
      setTimeout(function () {
        self.setData({ glide: true });
        wx.nextTick(function () {
          self.setData({ selected: n, currentIcon: iconOf(n) || self.data.currentIcon });
          setTimeout(settle, 480);
        });
      }, 20);
    },
    onTap: function (e) {
      var n = +e.currentTarget.dataset.i;
      if (n === this.data.selected) { return; }
      this.setSelected(n);
      wx.switchTab({ url: TAB_URLS[n] });
    }
  }
});
