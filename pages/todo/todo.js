// 待办 —— 疫苗 / 体检 / 其他。左滑删除，点按编辑，圆点标记完成。
var storage = require('../../utils/storage.js');
var theme = require('../../utils/theme.js');
var icons = require('../../utils/icons.js');
var T = require('../../utils/time.js');
var schedule = require('../../utils/schedule.js');

Page({
  data: {
    theme: 'indigo',
    dark: false,
    sbH: 44,
    navH: 44,
    kinds: schedule.KINDS,
    formOpen: false,
    formErr: false,
    form: { id: '', kind: 'vaccine', title: '', due: '', note: '' },
    groups: [],
    doneRows: [],
    doneCount: 0,
    openCount: 0,
    showDone: false,
    openId: '',
    icBack: '',
    icCal: '',
    icCheck: '',
    icEmpty: ''
  },

  onLoad: function () {
    this.setData(require('../../utils/nav.js').metrics());
  },

  onShow: function () {
    var g = getApp().globalData;
    var c = theme.current();
    this.setData({
      theme: g.theme,
      dark: g.dark,
      icBack: icons.svg('back', c.priInk, 17, 2.6),
      icCal: icons.svg('calendar', c.ink3, 17, 1.9),
      icCheck: icons.svg('check', '#FFFFFF', 13, 3),
      icEmpty: icons.svg('list', c.ink3, 44, 1.6)
    });
    theme.syncWindow(g.theme, g.dark);
    try { wx.setNavigationBarColor({ frontColor: g.dark ? '#ffffff' : '#000000', backgroundColor: g.dark ? '#121418' : '#F4F6FC' }); } catch (e) { }
    this.refresh();
  },

  onPageScroll: function (e) {
    var sc = e.scrollTop > 6;
    if (sc !== this.data.navSc) { this.setData({ navSc: sc }); }
    if (sc && this.data.openId) { this.setData({ openId: '' }); }
  },

  rowOf: function (t) {
    var start = T.todayStart();
    return {
      id: t.id,
      title: t.title,
      done: !!t.done,
      late: !t.done && t.due < start,
      due: T.fmtYMD(t.due),
      when: T.fmtMD(t.due),
      meta: schedule.kindName(t.kind) + ' · ' + (t.done ? '已完成' : schedule.dueLabel(t.due)) + (t.note ? ' · ' + t.note : '')
    };
  },

  refresh: function () {
    var list = storage.todos();
    var start = T.todayStart();
    var late = [];
    var soon = [];
    var doneSrc = [];
    var that = this;
    list.forEach(function (t) {
      if (t.done) { doneSrc.push(t); }
      else if (t.due < start) { late.push(that.rowOf(t)); }
      else { soon.push(that.rowOf(t)); }
    });
    doneSrc.sort(function (a, b) { return b.due - a.due; });
    var done = doneSrc.map(function (t) { return that.rowOf(t); });
    var groups = [];
    if (late.length) { groups.push({ key: 'late', label: '已逾期', rows: late }); }
    if (soon.length) { groups.push({ key: 'soon', label: '即将到来', rows: soon }); }
    this.setData({
      groups: groups,
      doneRows: done,
      doneCount: done.length,
      openCount: late.length + soon.length,
      openId: ''
    });
  },

  blankForm: function () {
    return { id: '', kind: 'vaccine', title: '', due: T.nowYMD(), note: '' };
  },

  onAdd: function () {
    this.setData({ formOpen: true, formErr: false, form: this.blankForm(), openId: '' });
  },

  onKind: function (e) {
    this.setData({ 'form.kind': e.currentTarget.dataset.k });
  },
  onTitle: function (e) { this.setData({ 'form.title': e.detail.value, formErr: false }); },
  onNote: function (e) { this.setData({ 'form.note': e.detail.value }); },
  onDue: function (e) { this.setData({ 'form.due': e.detail.value }); },

  onRowDue: function (e) {
    var id = e.currentTarget.dataset.id;
    var value = e.detail.value;
    if (!id || !value) { return; }
    storage.updateTodo(id, { due: T.tsOf(value, '00:00') });
    if (this.data.form.id === id) { this.setData({ 'form.due': value }); }
    wx.showToast({ title: '已改到 ' + value, icon: 'none' });
    this.refresh();
  },

  onFormCancel: function () {
    this.setData({ formOpen: false });
  },

  onFormSave: function () {
    var f = this.data.form;
    var title = (f.title || '').trim();
    if (!title) {
      this.setData({ formErr: true });
      return;
    }
    var due = T.tsOf(f.due || T.nowYMD(), '00:00');
    var patch = { kind: f.kind || 'other', title: title, due: due, note: (f.note || '').trim() };
    if (f.id) { storage.updateTodo(f.id, patch); }
    else { storage.addTodo(patch); }
    this.setData({ formOpen: false, formErr: false });
    wx.showToast({ title: '已保存', icon: 'none' });
    this.refresh();
  },

  onFormDelete: function () {
    var id = this.data.form.id;
    if (!id) { return; }
    var that = this;
    wx.showModal({
      title: '删除这条待办？',
      confirmText: '删除',
      confirmColor: '#D93A3F',
      success: function (r) {
        if (!r.confirm) { return; }
        storage.deleteTodo(id);
        that.setData({ formOpen: false });
        wx.showToast({ title: '已删除', icon: 'none' });
        that.refresh();
      }
    });
  },

  onRowTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.openId === id) { this.setData({ openId: '' }); return; }
    var list = storage.todos();
    var found = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { found = list[i]; } }
    if (!found) { return; }
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
    this.setData({
      formOpen: true,
      formErr: false,
      openId: '',
      form: {
        id: found.id,
        kind: found.kind || 'other',
        title: found.title,
        due: T.fmtYMD(found.due),
        note: found.note || ''
      }
    });
  },

  onToggle: function (e) {
    var id = e.currentTarget.dataset.id;
    var list = storage.todos();
    var found = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { found = list[i]; } }
    if (!found) { return; }
    var done = !found.done;
    storage.updateTodo(id, { done: done, doneAt: done ? Date.now() : 0 });
    this.refresh();
  },

  onToggleDoneList: function () {
    this.setData({ showDone: !this.data.showDone, openId: '' });
  },

  onDraft: function () {
    var baby = storage.baby();
    if (!baby.birthday) {
      wx.showModal({
        title: '先填写出生日期',
        content: '常见接种和体检按出生日推算。',
        confirmText: '去填写',
        success: function (r) {
          if (r.confirm) { wx.navigateTo({ url: '/pages/baby/baby' }); }
        }
      });
      return;
    }
    var that = this;
    wx.showModal({
      title: '生成常见日程',
      content: '按国家免疫规划（2021年版）和常规体检月龄，从出生日推算。这是提醒草稿，以接种门诊安排为准。已有同名待办会跳过。',
      confirmText: '生成',
      success: function (r) {
        if (!r.confirm) { return; }
        var n = storage.addTodos(schedule.buildDraft(baby.birthday));
        wx.showToast({ title: n ? ('已添加 ' + n + ' 件') : '没有新的事项', icon: 'none' });
        that.refresh();
      }
    });
  },

  onSwipeDrag: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.openId && this.data.openId !== id) { this.setData({ openId: '' }); }
  },
  onSwipeOpen: function (e) { this.setData({ openId: e.currentTarget.dataset.id }); },
  onSwipeClose: function (e) {
    if (this.data.openId === e.currentTarget.dataset.id) { this.setData({ openId: '' }); }
  },
  onSwipeDelete: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) { return; }
    storage.deleteTodo(id);
    if (this.data.form.id === id) { this.setData({ formOpen: false }); }
    wx.showToast({ title: '已删除', icon: 'none' });
    this.refresh();
  },

  onBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
