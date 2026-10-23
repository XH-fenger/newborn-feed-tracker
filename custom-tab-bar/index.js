// custom-tab-bar —— 自绘 TabBar：凸起圆钮沿底栏滑动 + 落地轻弹 + 主题联动
var icons = require('../utils/icons.js');
var theme = require('../utils/theme.js');

var TAB_KEYS = ['home', 'list', 'chart', 'user'];
var TAB_TEXT = ['首页', '记录', '统计', '我的'];
var TAB_URLS = ['/pages/index/index', '/pages/record/record', '/pages/stats/stats', '/pages/mine/mine'];
// 各 Tab 页各有一份底栏。滑块落定前都从这里出发，新页面才能接着滑，而不是跳过去。
var shown = 0;

function spanClassOf(dist) {
  if (dist >= 3) { return 'span3'; }
  if (dist === 2) { return 'span2'; }
  return '';
}

function spanMs(dist) {
  if (dist >= 3) { return 540; }
  if (dist === 2) { return 460; }
  return 380;
}

Component({
  data: {
    selected: 0,
    glide: false,
    pop: false,
    spanClass: '',
    pressed: -1,
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
    },
    detached: function () {
      if (this._popTimer) { clearTimeout(this._popTimer); this._popTimer = null; }
      if (this._settleTimer) { clearTimeout(this._settleTimer); this._settleTimer = null; }
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
      var dist = Math.abs(n - from);
      var spanClass = spanClassOf(dist);
      var ms = spanMs(dist);

      if (this._popTimer) { clearTimeout(this._popTimer); this._popTimer = null; }
      if (this._settleTimer) { clearTimeout(this._settleTimer); this._settleTimer = null; }

      var settle = function () {
        if (self._animTo === n) { shown = n; self._animTo = null; }
      };

      // 同 Tab 落位：不弹跳，只启用过渡以便下次滑动连贯
      if (from === n) {
        this._placed = true;
        this._animTo = null;
        shown = n;
        this.setData({
          selected: n,
          glide: false,
          pop: false,
          spanClass: '',
          currentIcon: iconOf(n) || this.data.currentIcon
        });
        wx.nextTick(function () { self.setData({ glide: true }); });
        return;
      }

      this._placed = true;
      this._animTo = n;
      // 先钉在起点、关掉过渡，再开过渡滑到目标 + 落地轻弹
      this.setData({
        selected: from,
        glide: false,
        pop: false,
        spanClass: spanClass,
        currentIcon: iconOf(n) || iconOf(from) || this.data.currentIcon
      });
      wx.nextTick(function () {
        self.setData({ glide: true });
        wx.nextTick(function () {
          self.setData({ selected: n, pop: true });
          self._popTimer = setTimeout(function () {
            self._popTimer = null;
            if (self.data.pop) { self.setData({ pop: false }); }
          }, 500);
          self._settleTimer = setTimeout(settle, ms + 40);
        });
      });
    },
    onPressStart: function (e) {
      var n = +e.currentTarget.dataset.i;
      if (n !== n) { return; }
      this.setData({ pressed: n });
    },
    onPressEnd: function () {
      if (this.data.pressed !== -1) { this.setData({ pressed: -1 }); }
    },
    onTap: function (e) {
      var n = +e.currentTarget.dataset.i;
      if (n === this.data.selected) {
        this.setData({ pressed: -1 });
        return;
      }
      this.setData({ pressed: -1 });
      this.setSelected(n);
      wx.switchTab({ url: TAB_URLS[n] });
    }
  }
});
