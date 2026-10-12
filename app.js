// app.js —— 全局入口：主题初始化 + Tab 参数中转
const storage = require('./utils/storage.js');

App({
  globalData: {
    theme: 'indigo',   // 当前主题：indigo | mint | sun | berry
    dark: false,       // 暗黑模式（与主题正交）
    pendingType: '',   // record 页待消费的记录类型（Tab 页无法带参，走 globalData）
    pendingSlot: '',   // 体温待记时段：am 早测 / pm 晚测
    editingId: ''      // record 页待编辑的记录 id
  },
  onLaunch() {
    const s = storage.settings();
    let dark = s.dark;
    if (typeof dark !== 'boolean') {
      // 首次启动跟随系统主题
      try {
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        dark = info.theme === 'dark';
      } catch (e) { dark = false; }
    }
    this.globalData.theme = s.theme || 'indigo';
    this.globalData.dark = dark;
    storage.saveSetting('dark', dark);
  }
});
