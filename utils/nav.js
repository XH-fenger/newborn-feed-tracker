/* 自定义导航栏度量 —— 参考 TDesign Navbar / weapp 社区标准做法：
   1) 状态栏高度 statusBarHeight；
   2) 胶囊按钮 getMenuButtonBoundingClientRect 测量：
      navH     = 胶囊高 + 上下对称间距（标题行高度，通常 40~48px）
      navBottom= 胶囊底边 + 对称间距（页面内容的顶部安全起点）
   结果模块级缓存，全部页面共享。 */
var cache = null;

function metrics() {
  if (cache) return cache;
  var sbH = 44, navH = 44, navBottom = 92;
  try {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    sbH = info.statusBarHeight || 44;
    var rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (rect && rect.height && rect.top >= sbH) {
      var gap = rect.top - sbH;            // 胶囊与状态栏的间距
      navH = rect.height + gap * 2;
      navBottom = rect.bottom + gap;       // 胶囊底 + 对称间距
    }
  } catch (e) { /* 用兜底值 */ }
  if (!(navH >= 32 && navH <= 56)) navH = 44;
  if (!(navBottom > sbH + 32 && navBottom < sbH + 80)) navBottom = sbH + 48;
  cache = { sbH: sbH, navH: navH, navBottom: navBottom };
  return cache;
}

module.exports = { metrics: metrics };
