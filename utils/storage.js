// storage.js —— 本地数据层（wx.setStorageSync，无任何后端）
// 存储键与数据模型严格对齐设计方案 §5
var KEY = 'newborn_feed_v1';

function defaultDb() {
  return {
    baby: { name: '宝宝', gender: 'M', birthday: '', birthWeight: '' },
    records: [],
    settings: { theme: 'indigo', dark: false, reminderEnabled: true, feedInterval: 180,
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
  return v;
}

function saveDb(d) { wx.setStorageSync(KEY, d); }

function genId() {
  return 'r_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
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

/* ---------- 宝宝档案 ---------- */
function baby() { return db().baby; }
function saveBaby(b) {
  var d = db();
  for (var k in b) { d.baby[k] = b[k]; }
  saveDb(d);
}

/* ---------- 设置 ---------- */
function settings() { return db().settings; }
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
  fresh.settings.theme = settings().theme;
  fresh.settings.dark = settings().dark;
  fresh.records = (obj.records || []).map(function (r) {
    var n = { id: r.id || genId() };
    for (var k in r) { n[k] = r[k]; }
    return n;
  });
  fresh.records.sort(function (a, b) { return b.time - a.time; });
  saveDb(fresh);
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
  baby: baby, saveBaby: saveBaby,
  settings: settings, saveSetting: saveSetting,
  importDb: importDb, clearRecords: clearRecords
};
