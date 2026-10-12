/* 自定义导航栏度量 —— 与 TDesign Navbar 同一做法：
   https://github.com/Tencent/tdesign-miniprogram
   1) 状态栏高度 statusBarHeight；
   2) 胶囊 getMenuButtonBoundingClientRect：
      navH         胶囊所在那一行的高度
      navBottom    这一行的底边
      capsuleRight 屏幕右缘到胶囊左缘的距离，内容停在胶囊左侧
   结果模块级缓存，全部页面共享。 */
var cache = null;

function metrics() {
  if (cache) return cache;
  var sbH = 44, navH = 44, navBottom = 92, capsuleRight = 96;
  try {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    sbH = info.statusBarHeight || 44;
    var winW = info.windowWidth || 375;
    var rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (rect && rect.height && rect.top >= sbH && rect.left) {
      var gap = rect.top - sbH;
      navH = rect.height + gap * 2;
      navBottom = rect.bottom + gap;
      capsuleRight = Math.round(winW - rect.left) + 8;
    }
  } catch (e) { /* 用兜底值 */ }
  if (!(navH >= 32 && navH <= 56)) navH = 44;
  if (!(navBottom > sbH + 32 && navBottom < sbH + 80)) navBottom = sbH + 48;
  if (!(capsuleRight >= 80 && capsuleRight <= 140)) capsuleRight = 96;
  cache = { sbH: sbH, navH: navH, navBottom: navBottom, capsuleRight: capsuleRight };
  return cache;
}

module.exports = { metrics: metrics };
