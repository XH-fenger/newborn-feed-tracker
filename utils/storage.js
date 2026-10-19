// storage.js —— 本地数据层（wx.setStorageSync，无任何后端）
// 存储键与数据模型严格对齐设计方案 §5
var KEY = 'newborn_feed_v1';

function defaultDb() {
  return {
    baby: { name: '宝宝', gender: 'M', birthday: '', birthWeight: '' },
    records: [],
    todos: [],
    settings: { theme: 'indigo', dark: false, darkAuto: true, darkStart: '19:00', darkEnd: '07:00',
      darkHold: '', darkHoldZone: '', elder: false,
      reminderEnabled: true, feedInterval: 180, nightFeedInterval: 240,
      alarmSnoozeUntil: 0, alarmDismissAt: 0, alarmFeedId: '' }
  };
}

function db() {
  var v;
  try { v = wx.getStorageSync(KEY); } catch (e) { v = ''; }
  if (!v || typeof v !== 'object' || !Array.isArray(v.records)) {
    return defaultDb();
  }
  if (!v.settings) { v.settings = defaultDb().settings; }
  if (!v.baby) { v.baby = defaultDb().baby; }
  if (!Array.isArray(v.todos)) { v.todos = []; }
  return v;
}

function saveDb(d) { wx.setStorageSync(KEY, d); }

function genId() {
  return 'r_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

function genTodoId() {
  return 't_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

/* ---------- 记录 CRUD ---------- */
// 返回副本（浅拷贝数组），避免调用方持有内部数组的活引用——
// 否则后续增删后旧引用会把已删记录「复活」进导入合并等写路径
function records() { return db().records.slice(); }

// 按 time 倒序插入（保持数组有序，取最近 N 条无需反复排序）
function addRecord(rec) {
  var d = db();
  rec.id = rec.id || genId();
  d.records.push(rec);
  d.records.sort(function (a, b) { return b.time - a.time; });
  // 新喂养写入 → 清除提醒挂起状态
  if (rec.type === 'feed') {
    d.settings.alarmSnoozeUntil = 0;
    d.settings.alarmDismissAt = 0;
    d.settings.alarmFeedId = '';
  }
  saveDb(d);
  return rec;
}

function getRecord(id) {
  var rs = db().records;
  for (var i = 0; i < rs.length; i++) { if (rs[i].id === id) { return rs[i]; } }
  return null;
}

function updateRecord(id, patch) {
  var d = db();
  for (var i = 0; i < d.records.length; i++) {
    if (d.records[i].id === id) {
      var merged = {};
      for (var k in d.records[i]) { merged[k] = d.records[i][k]; }
      for (var k2 in patch) { merged[k2] = patch[k2]; }
      merged.id = id;
      d.records[i] = merged;
      break;
    }
  }
  d.records.sort(function (a, b) { return b.time - a.time; });
  saveDb(d);
}

function deleteRecord(id) {
  var d = db();
  d.records = d.records.filter(function (r) { return r.id !== id; });
  saveDb(d);
}

/* ---------- 待办（疫苗 / 体检 / 其他，与喂养记录分开） ---------- */
function byDue(a, b) {
  if (a.due !== b.due) { return a.due - b.due; }
  return String(a.id).localeCompare(String(b.id));
}

function todos() { return db().todos.slice(); }

function addTodo(todo) {
  var d = db();
  todo.id = todo.id || genTodoId();
  todo.done = !!todo.done;
  todo.doneAt = todo.doneAt || 0;
  todo.note = todo.note || '';
  d.todos.push(todo);
  d.todos.sort(byDue);
  saveDb(d);
  return todo;
}

// 按标题去重插入，返回实际新增条数（生成日程时跳过已有同名事项）
function addTodos(list) {
  var d = db();
  var exist = {};
  d.todos.forEach(function (t) { exist[t.title] = 1; });
  var n = 0;
  list.forEach(function (t) {
    if (!t || !t.title || exist[t.title]) { return; }
    d.todos.push({
      id: genTodoId(),
      kind: t.kind || 'other',
      title: t.title,
      due: t.due,
      note: t.note || '',
      dose: t.dose || '',
      done: false,
      doneAt: 0
    });
    exist[t.title] = 1;
    n++;
  });
  d.todos.sort(byDue);
  if (n) { saveDb(d); }
  return n;
}

function updateTodo(id, patch) {
  var d = db();
  for (var i = 0; i < d.todos.length; i++) {
    if (d.todos[i].id === id) {
      var merged = {};
      for (var k in d.todos[i]) { merged[k] = d.todos[i][k]; }
      for (var k2 in patch) { merged[k2] = patch[k2]; }
      merged.id = id;
      d.todos[i] = merged;
      break;
    }
  }
  d.todos.sort(byDue);
  saveDb(d);
}

function deleteTodo(id) {
  var d = db();
  d.todos = d.todos.filter(function (t) { return t.id !== id; });
  saveDb(d);
}

/* ---------- 宝宝档案 ---------- */
function baby() { return db().baby; }
function saveBaby(b) {
  var d = db();
  for (var k in b) { d.baby[k] = b[k]; }
  saveDb(d);
}

/* ---------- 设置 ---------- */
function isHM(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str || '');
}

function settings() {
  var d = db();
  var s = d.settings || {};
  var dirty = false;
  if (typeof s.darkAuto !== 'boolean') { s.darkAuto = true; dirty = true; }
  if (!isHM(s.darkStart)) { s.darkStart = '19:00'; dirty = true; }
  if (!isHM(s.darkEnd)) { s.darkEnd = '07:00'; dirty = true; }
  if (s.darkHold !== 'on' && s.darkHold !== 'off' && s.darkHold) { s.darkHold = ''; dirty = true; }
  if (s.darkHoldZone !== 'in' && s.darkHoldZone !== 'out' && s.darkHoldZone) { s.darkHoldZone = ''; dirty = true; }
  if (typeof s.elder !== 'boolean') { s.elder = false; dirty = true; }
  if (dirty) { d.settings = s; saveDb(d); }
  return d.settings;
}
function saveSetting(k, v) {
  var d = db();
  d.settings[k] = v;
  saveDb(d);
}

/* ---------- 导入 / 清空 ---------- */
function importDb(obj, mode) {
  // mode: 'overwrite' 覆盖 | 'merge' 合并（按 id 去重，导入数据优先）
  if (mode === 'merge') {
    var d = db();
    var exist = {};
    d.records.forEach(function (r) { exist[r.id] = 1; });
    obj.records.forEach(function (r) {
      if (!r.id || !exist[r.id]) {
        if (!r.id) { r.id = genId(); }
        d.records.push(r);
      }
    });
    d.records.sort(function (a, b) { return b.time - a.time; });
    if (obj.baby) { d.baby = obj.baby; }
    mergeTodos(d, obj.todos);
    if (obj.settings) {
      var s = obj.settings;
      // 主题/暗黑是设备偏好，不随导入数据走（与 overwrite 模式口径一致）
      d.settings.reminderEnabled = (typeof s.reminderEnabled === 'boolean') ? s.reminderEnabled : d.settings.reminderEnabled;
      d.settings.feedInterval = s.feedInterval || d.settings.feedInterval;
    }
    saveDb(d);
    return;
  }
  var fresh = defaultDb();
  fresh.baby = obj.baby || fresh.baby;
  fresh.settings = obj.settings || fresh.settings;
  // 保留本机当前外观选择（主题/暗黑是设备偏好，不随数据走）
  var keep = settings();
  fresh.settings.theme = keep.theme;
  fresh.settings.dark = keep.dark;
  fresh.settings.darkAuto = !!keep.darkAuto;
  fresh.settings.darkStart = keep.darkStart;
  fresh.settings.darkEnd = keep.darkEnd;
  fresh.settings.darkHold = keep.darkHold || '';
  fresh.settings.darkHoldZone = keep.darkHoldZone || '';
  fresh.settings.elder = !!keep.elder;
  fresh.records = (obj.records || []).map(function (r) {
    var n = { id: r.id || genId() };
    for (var k in r) { n[k] = r[k]; }
    return n;
  });
  fresh.records.sort(function (a, b) { return b.time - a.time; });
  fresh.todos = [];
  mergeTodos(fresh, obj.todos);
  saveDb(fresh);
}

function mergeTodos(d, list) {
  if (!Array.isArray(list)) { return; }
  if (!Array.isArray(d.todos)) { d.todos = []; }
  var exist = {};
  d.todos.forEach(function (t) { if (t.id) { exist[t.id] = 1; } });
  list.forEach(function (t) {
    if (!t || typeof t.title !== 'string' || typeof t.due !== 'number') { return; }
    if (t.id && exist[t.id]) { return; }
    d.todos.push({
      id: t.id || genTodoId(),
      kind: t.kind || 'other',
      title: t.title,
      due: t.due,
      note: t.note || '',
      done: !!t.done,
      doneAt: t.doneAt || 0
    });
  });
  d.todos.sort(byDue);
}

function clearRecords() {
  var d = db();
  d.records = [];
  d.settings.alarmSnoozeUntil = 0;
  d.settings.alarmDismissAt = 0;
  d.settings.alarmFeedId = 0;
  saveDb(d);
}

module.exports = {
  db: db, saveDb: saveDb, genId: genId,
  records: records, addRecord: addRecord, getRecord: getRecord,
  updateRecord: updateRecord, deleteRecord: deleteRecord,
  todos: todos, addTodo: addTodo, addTodos: addTodos,
  updateTodo: updateTodo, deleteTodo: deleteTodo,
  baby: baby, saveBaby: saveBaby,
  settings: settings, saveSetting: saveSetting,
  importDb: importDb, clearRecords: clearRecords
};
