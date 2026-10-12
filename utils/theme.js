// theme.js —— 主题/暗黑管理（CSS 变量走 theme.wxss；此处供 JS 侧：canvas 图表、SVG 图标、窗口底色）
var storage = require('./storage.js');

var THEMES = {
  indigo: { name: '靛蓝', pri: '#5A67E8', pri2: '#8B96FF', priInk: '#3A46B8', priSoft: '#EAEDFE',
    g1: '#4149C4', g2: '#6F79E8', bg: '#F4F6FC', bgRgb: '244,246,252', feed: '#5A67E8' },
  mint: { name: '晨雾青', pri: '#0C9185', pri2: '#23C0AE', priInk: '#0A7568', priSoft: '#E1F6F3',
    g1: '#0A7A70', g2: '#189F92', bg: '#F3F8F7', bgRgb: '243,248,247', feed: '#0C9185' },
  sun: { name: '暖阳橘', pri: '#CE6514', pri2: '#FFA95C', priInk: '#A8500F', priSoft: '#FFF0E1',
    g1: '#A8500F', g2: '#D97427', bg: '#FCF8F4', bgRgb: '252,248,244', feed: '#CE6514' },
  berry: { name: '莓果粉', pri: '#D04E8F', pri2: '#F58BC1', priInk: '#AE3676', priSoft: '#FDEAF3',
    g1: '#B03A75', g2: '#DE6BA6', bg: '#FCF7FA', bgRgb: '252,247,250', feed: '#D04E8F' }
};

// 语义类别色（亮色，四主题一致）
var SEM = { diaper: '#BE7210', sleep: '#6A57EE', growth: '#2C6FE0', danger: '#D93A3F' };
// 暗黑提亮色（四主题一致，主色渐变头图保留）
var DARKLIFT = { pri: '#3FD3C1', pri2: '#5FE0D2', priInk: '#7FE9DC', feed: '#3FD6C6',
  diaper: '#F2B24A', sleep: '#A99BFF', growth: '#6FB0FF', danger: '#FF6B6F' };
// 图表网格线 / 轴标签
var INK = { light: { grid: 'rgba(14,26,25,.07)', axl: '#6B7674' },
  dark: { grid: 'rgba(255,255,255,.08)', axl: '#8E97A0' } };

function colors(theme, dark) {
  var t = THEMES[theme] || THEMES.indigo;
  var c = {
    name: t.name, pri: t.pri, pri2: t.pri2, priInk: t.priInk, priSoft: t.priSoft,
    g1: t.g1, g2: t.g2, bg: t.bg, bgRgb: t.bgRgb, feed: t.feed,
    diaper: SEM.diaper, sleep: SEM.sleep, growth: SEM.growth, danger: SEM.danger,
    card: dark ? '#1C1E23' : '#FFFFFF', fill: dark ? '#272A30' : '#F1F5F4',
    ink: dark ? '#ECEEF1' : '#0E1A19', ink2: dark ? '#A7B0B6' : '#5B6B69', ink3: dark ? '#8E97A0' : '#6B7674',
    grid: dark ? INK.dark.grid : INK.light.grid, axl: dark ? INK.dark.axl : INK.light.axl
  };
  if (dark) { for (var k in DARKLIFT) { c[k] = DARKLIFT[k]; } }
  return c;
}

function current() {
  var g = getApp().globalData;
  return colors(g.theme, g.dark);
}

// 切换主题/暗黑：持久化 + 通知页面栈 + TabBar + 窗口背景
function apply(theme, dark) {
  var app = getApp();
  app.globalData.theme = theme;
  app.globalData.dark = dark;
  storage.saveSetting('theme', theme);
  storage.saveSetting('dark', dark);

  var pages = getCurrentPages();
  pages.forEach(function (p) {
    var patch = { theme: theme, dark: dark };
    if (typeof p.buildIcons === 'function') {
      var extra = p.buildIcons();
      for (var k in extra) { patch[k] = extra[k]; }
    }
    p.setData(patch);
  });

  // 当前页 TabBar 主题联动（其余页在其 onShow 时自行同步）
  var cur = pages[pages.length - 1];
  if (cur && typeof cur.getTabBar === 'function') {
    var tb = cur.getTabBar();
    if (tb) { tb.sync(theme, dark); }
  }

  syncWindow(theme, dark);
}

function syncWindow(theme, dark) {
  var c = colors(theme, dark);
  try {
    wx.setBackgroundColor({ backgroundColor: c.bg });
  } catch (e) { /* 低版本忽略 */ }
}

module.exports = { THEMES: THEMES, colors: colors, current: current, apply: apply, syncWindow: syncWindow };
