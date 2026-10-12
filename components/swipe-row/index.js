Component({
  properties: {
    line: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    open: { type: Boolean, value: false }
  },
  methods: {
    onDrag: function () { this.triggerEvent('drag'); },
    onOpened: function () { this.triggerEvent('open'); },
    onClosed: function () { this.triggerEvent('close'); },
    onDel: function () { this.triggerEvent('delete'); }
  }
});
