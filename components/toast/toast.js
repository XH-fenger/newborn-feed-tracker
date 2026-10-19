// toast —— 底部深色胶囊 Toast（主题色勾选图标 + 触觉确认）
var icons = require('../../utils/icons.js');
var theme = require('../../utils/theme.js');

Component({
  data: {
    show: false,
    msg: '',
    icon: '',
    undo: false
  },
  lifetimes: {
    attached: function () {
      this._timer = null;
      this._onUndo = null;
    },
    detached: function () {
      if (this._timer) { clearTimeout(this._timer); }
    }
  },
  methods: {
    show: function (msg) {
      this._hide();
      var that = this;
      var c = theme.current();
      this.setData({
        show: true,
        msg: msg,
        icon: icons.svg('check', c.pri2, 16, 3),
        undo: false
      });
      if (this._timer) { clearTimeout(this._timer); }
      this._timer = setTimeout(function () {
        that.setData({ show: false });
      }, 1500);
    },
    showUndo: function (msg, onUndo) {
      this._hide();
      var that = this;
      var c = theme.current();
      this._onUndo = onUndo || null;
      this.setData({
        show: true,
        msg: msg,
        icon: icons.svg('check', c.pri2, 16, 3),
        undo: true
      });
      this._timer = setTimeout(function () {
        that.setData({ show: false, undo: false });
      }, 4000);
    },
    _hide: function () {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      this._onUndo = null;
    },
    onUndoTap: function () {
      var cb = this._onUndo;
      this._hide();
      this.setData({ show: false, undo: false });
      if (cb) { cb(); }
    }
  }
});
