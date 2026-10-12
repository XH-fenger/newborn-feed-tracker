// icons.js —— 全站 SVG 图标库（data URI，颜色参数化，随主题即时重生成）
// 小程序 WXML 不支持 <svg> 标签，矢量图标统一由此生成 data URI 交给 <image> 渲染。
var P = {
  feed: '<path d="M10 2.5h4v3.2l1.6 2.6V20a1.4 1.4 0 0 1-1.4 1.4h-4.4A1.4 1.4 0 0 1 8.4 20V8.3L10 5.7z"/><path d="M8.6 12.6h6.8"/>',
  bottle: '<path d="M4 15.5h16M6.5 15.5V19a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-3.5"/><path d="M12 3.5v9M9 6.5h6"/>',
  diaper: '<path d="M12 3.2s5.2 5.4 5.2 9.3a5.2 5.2 0 0 1-10.4 0c0-3.9 5.2-9.3 5.2-9.3z"/>',
  sleep: '<path d="M20.5 13.4A8.6 8.6 0 1 1 11 3.6a6.6 6.6 0 0 0 9.5 9.8z"/>',
  growth: '<path d="M4 19.4h16M7.4 19.4V11M12 19.4V5.6M16.6 19.4v-6"/>',
  bell: '<path d="M12 3.2a6 6 0 0 0-6 6c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4a6 6 0 0 0-6-6z"/><path d="M10.2 19.4a2 2 0 0 0 3.6 0"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  baby: '<circle cx="12" cy="8" r="3.6"/><path d="M4.6 20.2c.5-3.7 3.7-6.2 7.4-6.2s6.9 2.5 7.4 6.2"/>',
  babyBoy: '<circle cx="12" cy="8" r="3.6"/><path d="M9.2 3.4l.9 1.5M14.8 3.4l-.9 1.5M12 2.6v1.9"/><path d="M4.6 20.2c.5-3.7 3.7-6.2 7.4-6.2s6.9 2.5 7.4 6.2"/>',
  babyGirl: '<circle cx="12" cy="8" r="3.6"/><circle cx="5.4" cy="6.2" r="1.5"/><circle cx="18.6" cy="6.2" r="1.5"/><path d="M8.2 6.8L6.9 6.4M15.8 6.8l1.3-.4"/><path d="M4.6 20.2c.5-3.7 3.7-6.2 7.4-6.2s6.9 2.5 7.4 6.2"/>',
  sun: '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="3.6"/>',
  pen: '<path d="M4.5 19.5h3.6L19.4 8.2a2.1 2.1 0 0 0-3-3L5.1 16.5l-.6 3z"/>',
  down: '<path d="M12 3.6v11M7.6 10.2L12 14.6l4.4-4.4"/><path d="M4.4 17.4v1.6a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-1.6"/>',
  up: '<path d="M12 14.6V3.6M7.6 8L12 3.6 16.4 8"/><path d="M4.4 17.4v1.6a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-1.6"/>',
  trash: '<path d="M4.6 6.6h14.8M9.4 6.6V4.4h5.2v2.2"/><path d="M6.6 6.6l.9 12.4a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.4"/>',
  moon: '<path d="M21 12.8A8.6 8.6 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  home: '<path d="M3.4 11.2L12 4.2l8.6 7"/><path d="M5.6 9.8v9.4a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9.8"/>',
  list: '<rect x="4" y="3.6" width="16" height="16.8" rx="2.6"/><path d="M8 8.6h8M8 12.4h8M8 16.2h5"/>',
  chart: '<path d="M4 3.6v16.8h16.4"/><path d="M8.2 17V12M12.4 17V7.4M16.6 17v-3.6"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.6 20.2c.5-3.7 3.7-6.2 7.4-6.2s6.9 2.5 7.4 6.2"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  vibe: '<path d="M4 8v8M8 5v14M12 8.5v7M16 4.5v15M20 9v6"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M8 3v4M16 3v4M3.5 10.4h17"/>',
  timer: '<circle cx="12" cy="13.2" r="7.8"/><path d="M12 9.4v3.8l2.6 1.6M9.4 2.6h5.2"/>',
  med: '<rect x="8" y="3.2" width="8" height="17.6" rx="4"/><path d="M8 12h8"/>',
  temp: '<path d="M14 14.6V5.4a2 2 0 1 0-4 0v9.2a3.6 3.6 0 1 0 4 0z"/><path d="M12 11.2V7.2"/>'
};

// 生成 data URI。sw 为描边宽度，原型非默认值处调用时单独传
function svg(name, color, size, sw) {
  var p = P[name] || '';
  size = size || 24;
  sw = sw || 2;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
}

// 主题色卡渐变圆点（纯 CSS 可用 background 直写，此处供 JS 生成用）
var THEME_DOTS = {
  indigo: 'linear-gradient(135deg,#4149C4,#6F79E8)',
  mint: 'linear-gradient(135deg,#0A7A70,#189F92)',
  sun: 'linear-gradient(135deg,#A8500F,#D97427)',
  berry: 'linear-gradient(135deg,#B03A75,#DE6BA6)'
};

module.exports = { svg: svg, P: P, THEME_DOTS: THEME_DOTS };
