// undo.js —— 删除撤销管理器（配合 toast 组件 showUndo）
// 行为：调用即「立即真删」（与旧逻辑一致），但保留一条内存中的待恢复快照，
// 顶部弹出「撤销」提示；4 秒内点撤销可恢复，否则快照清除（数据已删，符合现有行为）。
// 注意：撤销是会话内的，App 被杀无法恢复；仅作为误删的缓冲，不替代备份导出。
var storage = require('./storage.js');

var _pending = null;

function clearTimer() {
  if (_pending && _pending.timer) { clearTimeout(_pending.timer); _pending.timer = null; }
}

function finish() {
  clearTimer();
  _pending = null;
}

// page: 当前页面实例（含 selectComponent('#toast')）
// opts: { kind:'record'|'todo', id, msg, refresh }
function request(page, opts) {
  if (!opts || !opts.id) { return; }
  // 上一条还没处理完，先落定（真正删除）
  if (_pending) { finish(); }

  var kind = opts.kind === 'todo' ? 'todo' : 'record';
  var id = opts.id;

  // 立即真删（保持现有「删完即刷新」视觉）
  if (kind === 'todo') { storage.deleteTodo(id); }
  else { storage.deleteRecord(id); }
  if (typeof opts.refresh === 'function') { opts.refresh(); }

  var toast = page && page.selectComponent ? page.selectComponent('#toast') : null;

  var p = { kind: kind, id: id, timer: null };
  _pending = p;

  if (toast && typeof toast.showUndo === 'function') {
    toast.showUndo(opts.msg || '已删除', function () {
      // 撤销：恢复被删项
      finish();
      var rs = storage.records();
      var found = null;
      for (var i = 0; i < rs.length; i++) { if (rs[i].id === id) { found = rs[i]; break; } }
      if (!found) {
        if (kind === 'todo') {
          var ts = storage.todos();
          for (var j = 0; j < ts.length; j++) { if (ts[j].id === id) { found = ts[j]; break; } }
        }
      }
      if (!found) {
        // 记录已被并发改动，不再恢复（避免重复）
        return;
      }
      if (kind === 'todo') { storage.addTodo(found); }
      else { storage.addRecord(found); }
      if (typeof opts.refresh === 'function') { opts.refresh(); }
    });
  }

  p.timer = setTimeout(function () { finish(); }, 4000);
}

module.exports = { request: request };
