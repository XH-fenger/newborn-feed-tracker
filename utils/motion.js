// 系统「减弱动态效果」。小程序逻辑层多数环境没有 matchMedia，命中时直接画终帧。
function reduced() {
  try {
    if (typeof matchMedia === 'function') {
      return !!matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  } catch (e) { }
  return false;
}

module.exports = { reduced: reduced };
