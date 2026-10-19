// app.js —— 全局入口：主题初始化 + Tab 参数中转
const storage = require('./utils/storage.js');

App({
  globalData: {
    theme: 'indigo',   // 当前主题：indigo | mint | sun | berry
    dark: false,       // 暗黑模式（与主题正交）
    elder: false,      // 老年模式：更大的字和按钮，仅手动开关
    pendingType: '',   // record 页待消费的记录类型（Tab 页无法带参，走 globalData）
    pendingSlot: '',   // 体温待记时段：am 早测 / pm 晚测
    editingId: ''      // record 页待编辑的记录 id
  },
  onLaunch() {
    const s = storage.settings();
    let dark = s.dark;
    if (typeof dark !== 'boolean') {
      if (s.darkAuto) {
        dark = false;
      } else {
        try {
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          dark = info.theme === 'dark';
        } catch (e) { dark = false; }
      }
    }
    this.globalData.theme = s.theme || 'indigo';
    this.globalData.dark = !!dark;
    this.globalData.elder = !!s.elder;
    storage.saveSetting('dark', !!dark);
    this.blockNativeToast();
    require('./utils/theme.js').boot(this);
  },
  onShow() {
    require('./utils/theme.js').boot(this);
    require('./utils/noisePlayer.js').resume();
  },
  onHide() {
    require('./utils/theme.js').disarm();
  },
  // 开发者工具里 showToast / showLoading / hideToast 共用同一原生浮层。
  // 空 hide、或 loading 与 toast 混用，会留下「无标题成功勾」残影（统计页截图那种）。
  // 创建类接口全部改走页面自定义 toast；hide* 留给 setClipboardData 等系统自动浮层。
  blockNativeToast() {
    wx.showToast = function (opt) {
      try {
        const pages = getCurrentPages();
        const p = pages && pages.length ? pages[pages.length - 1] : null;
        const t = p && p.selectComponent && p.selectComponent('#toast');
        if (t && opt && opt.title) { t.show(String(opt.title)); }
      } catch (e) { /* 自定义 toast 不可用时宁可静默，也不创建原生层 */ }
    };
    wx.showLoading = function () { };
  }
});
