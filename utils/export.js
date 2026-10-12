// export.js —— 数据导出 / 导入（本地文件 + 剪贴板兜底，无后端）
var storage = require('./storage.js');
var T = require('./time.js');

/* ---------- 导出 ---------- */
function exportData() {
  var d = storage.db();
  var json = JSON.stringify({ baby: d.baby, records: d.records, settings: d.settings }, null, 2);
  var fname = 'newborn-feed-backup-' + T.fmtYMD(Date.now()).replace(/-/g, '') + '.json';
  var fs = wx.getFileSystemManager();
  var path = wx.env.USER_DATA_PATH + '/' + fname;

  fs.writeFile({
    filePath: path,
    data: json,
    encoding: 'utf8',
    success: function () {
      wx.shareFileMessage({
        filePath: path,
        fileName: fname,
        success: function () { /* 已唤起转发 */ },
        fail: function (err) {
          // 开发者工具 / 不支持 shareFileMessage 的环境 → 剪贴板兜底
          if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) { return; }
          clipboardFallback(json);
        }
      });
    },
    fail: function () { clipboardFallback(json); }
  });
}

function clipboardFallback(json) {
  wx.setClipboardData({
    data: json,
    success: function () {
      wx.showModal({
        title: '已复制到剪贴板',
        content: '当前环境不支持文件转发，备份 JSON 已复制。可粘贴到备忘录 / 文件传输助手保存。',
        showCancel: false,
        confirmText: '知道了'
      });
    },
    fail: function () {
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  });
}

/* ---------- 导入 ---------- */
// 校验：仅接受本程序结构（records 数组 + baby 对象）
function validateDb(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { return false; }
  if (!Array.isArray(obj.records)) { return false; }
  for (var i = 0; i < obj.records.length; i++) {
    var r = obj.records[i];
    if (!r || typeof r !== 'object' || !r.type || !r.time) { return false; }
  }
  return true;
}

function importData(cb) {
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['json'],
    success: function (res) {
      var f = res.tempFiles && res.tempFiles[0];
      if (!f) { return; }
      if (f.size > 2 * 1024 * 1024) {
        wx.showToast({ title: '文件过大（>2MB）', icon: 'none' });
        return;
      }
      wx.getFileSystemManager().readFile({
        filePath: f.path,
        encoding: 'utf8',
        success: function (r2) {
          var obj = null;
          try { obj = JSON.parse(r2.data); } catch (e) { obj = null; }
          if (!validateDb(obj)) {
            wx.showToast({ title: '文件格式不正确', icon: 'none' });
            return;
          }
          askMode(obj, cb);
        },
        fail: function () { wx.showToast({ title: '读取文件失败', icon: 'none' }); }
      });
    },
    fail: function () { /* 用户取消 */ }
  });
}

function askMode(obj, cb) {
  wx.showActionSheet({
    itemList: ['合并导入（推荐）', '覆盖现有数据'],
    success: function (r) {
      var mode = r.tapIndex === 1 ? 'overwrite' : 'merge';
      var backup = JSON.parse(JSON.stringify(storage.db()));
      storage.importDb(obj, mode);
      var cnt = (obj.records || []).length;
      wx.showToast({ title: '已导入 ' + cnt + ' 条', icon: 'success' });
      if (cb) { cb(mode, backup); }
    }
  });
}

module.exports = { exportData: exportData, importData: importData, validateDb: validateDb };
