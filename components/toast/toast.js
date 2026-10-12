// toast —— 底部深色胶囊 Toast（主题色勾选图标 + 触觉确认）
var icons = require('../../utils/icons.js');
var theme = require('../../utils/theme.js');

Component({
  data: {
    show: false,
    msg: '',
    icon: ''
  },
  lifetimes: {
    attached: function () {
      this._timer = null;
    },
    detached: function () {
      if (this._timer) { clearTimeout(this._timer); }
    }
  },
  methods: {
    show: function (msg) {
      var that = this;
      var c = theme.current();
      this.setData({
        show: true,
        msg: msg,
        icon: icons.svg('check', c.pri2, 16, 3)
      });
      if (this._timer) { clearTimeout(this._timer); }
      this._timer = setTimeout(function () {
        that.setData({ show: false });
      }, 1500);
    }
  }
});
