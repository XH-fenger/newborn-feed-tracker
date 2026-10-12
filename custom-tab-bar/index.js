// custom-tab-bar —— 自绘 TabBar：凸起圆钮沿底栏滑动 + 主题联动
var icons = require('../utils/icons.js');
var theme = require('../utils/theme.js');

var TAB_KEYS = ['home', 'list', 'chart', 'user'];
var TAB_TEXT = ['首页', '记录', '统计', '我的'];
var TAB_URLS = ['/pages/index/index', '/pages/record/record', '/pages/stats/stats', '/pages/mine/mine'];

Component({
  data: {
    selected: 0,
    glide: false,
    theme: 'indigo',
    dark: false,
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
      this.setData({
        theme: t,
        dark: !!dark,
        tabs: tabs,
        currentIcon: tabs[sel] ? tabs[sel].iconOn : ''
      });
    },
    setSelected: function (n) {
      n = +n;
      if (n !== n || n < 0 || n > 3) { return; }
      var tabs = this.data.tabs;
      var icon = (tabs[n] && tabs[n].iconOn) || this.data.currentIcon;
      if (!this._placed) {
        this._placed = true;
        this.setData({ selected: n, glide: false, currentIcon: icon });
        var self = this;
        wx.nextTick(function () { self.setData({ glide: true }); });
        return;
      }
      if (this.data.selected === n) { return; }
      this.setData({ selected: n, currentIcon: icon });
    },
    onTap: function (e) {
      var n = +e.currentTarget.dataset.i;
      if (n === this.data.selected) { return; }
      this.setSelected(n);
      wx.switchTab({ url: TAB_URLS[n] });
    }
  }
});
