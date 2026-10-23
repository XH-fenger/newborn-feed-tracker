// export.js —— 数据导出 / 导入（本地文件 + 剪贴板兜底，无后端）
var storage = require('./storage.js');
var T = require('./time.js');

/* ---------- 导出 ---------- */
function exportData() {
  var d = storage.db();
  var json = JSON.stringify({
    baby: d.baby, records: d.records, todos: d.todos || [], settings: d.settings
  }, null, 2);
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
      // setClipboardData 会自动弹一个原生「内容已复制」success toast；
      // 开发者工具下该原生浮层容易残留卡死，这里立刻收掉，改用自己的说明弹窗。
      setTimeout(function () { try { wx.hideToast(); } catch (e) { } }, 50);
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
  if (obj.todos != null) {
    if (!Array.isArray(obj.todos)) { return false; }
    for (var j = 0; j < obj.todos.length; j++) {
      var t = obj.todos[j];
      if (!t || typeof t.title !== 'string' || typeof t.due !== 'number') { return false; }
    }
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
      wx.showToast({ title: '已导入 ' + cnt + ' 条', icon: 'none' });
      if (cb) { cb(mode, backup); }
    }
  });
}

/* ---------- 导出 CSV（可读表格，供家人 / 门诊查看） ---------- */
function csvCell(v) {
  var s = String(v == null ? '' : v);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportCsv() {
  var d = storage.db();
  var TYPE = { feed: '喂养', diaper: '尿布', sleep: '睡眠', growth: '成长', med: '补充', temp: '体温', bath: '洗澡' };
  var header = ['日期', '时间', '类型', '奶量(ml)', '喂养方式', '时长(分)', '尿布类型', '睡眠起止',
    '体重(kg)', '身高(cm)', '头围(cm)', '体温(℃)', '补充剂', '剂量', '备注'];
  var rows = [header];
  (d.records || []).forEach(function (r) {
    var row = [T.fmtYMD(r.time), T.fmtHM(r.time), TYPE[r.type] || r.type, '', '', '', '', '', '', '', '', '', '', '', r.note || ''];
    if (r.type === 'feed') { row[3] = r.amount || ''; row[4] = r.feedMethod || ''; row[5] = r.duration || ''; }
    else if (r.type === 'diaper') { row[6] = r.diaperType || ''; }
    else if (r.type === 'sleep') { row[7] = (r.start ? T.fmtHM(r.start) : '') + ' - ' + (r.end ? T.fmtHM(r.end) : ''); }
    else if (r.type === 'growth') { row[8] = r.weight || ''; row[9] = r.height || ''; row[10] = r.headCirc || ''; }
    else if (r.type === 'temp') { row[11] = r.celsius || ''; }
    else if (r.type === 'bath') { row[5] = r.duration || ''; }
    else if (r.type === 'med') { row[12] = r.medName || r.medKey || ''; row[13] = r.dose || ''; }
    rows.push(row);
  });
  var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  var fname = 'newborn-feed-backup-' + T.fmtYMD(Date.now()).replace(/-/g, '') + '.csv';
  var fs = wx.getFileSystemManager();
  var path = wx.env.USER_DATA_PATH + '/' + fname;
  fs.writeFile({
    filePath: path, data: csv, encoding: 'utf8',
    success: function () {
      wx.shareFileMessage({
        filePath: path, fileName: fname,
        success: function () {},
        fail: function (err) {
          if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) { return; }
          clipboardFallback(csv);
        }
      });
    },
    fail: function () { clipboardFallback(csv); }
  });
}

module.exports = { exportData: exportData, exportCsv: exportCsv, importData: importData, validateDb: validateDb };
