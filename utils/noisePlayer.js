// 哄睡播放：优先走后台音频，锁屏和离开页面后仍循环；失败时退回页内播放。
var noise = require('./noise.js');

var storage = require('./storage.js');

var TITLES = {
  white: '白噪音',
  pink: '粉噪音',
  brown: '棕噪音',
  dryer: '吹风机',
  razor: '剃须刀',
  fan: '风扇',
  stream: '流水',
  rain: '雨声',
  wave: '海浪',
  heart: '心跳'
};

function initialVolume() {
  var v = 60;
  try { v = storage.settings().noiseVolume; } catch (e) { v = 60; }
  if (typeof v !== 'number' || v < 0 || v > 100) { return 60; }
  return Math.round(v);
}

var state = {
  playing: false,
  kind: 'white',
  minutes: 30,
  until: 0,
  path: '',
  mode: '',
  error: '',
  volume: initialVolume(),
  dock: false
};

var bgm = null;
var inner = null;
var watchers = [];
var hooked = false;

function emit() {
  var i;
  for (i = 0; i < watchers.length; i++) {
    try { watchers[i](snapshot()); } catch (e) { }
  }
}

function snapshot() {
  return {
    playing: state.playing,
    kind: state.kind,
    minutes: state.minutes,
    until: state.until,
    mode: state.mode,
    error: state.error,
    volume: state.volume,
    title: TITLES[state.kind] || '哄睡',
    dock: state.dock
  };
}

function subscribe(fn) {
  watchers.push(fn);
  return function () {
    watchers = watchers.filter(function (f) { return f !== fn; });
  };
}

function expired() {
  return !!(state.until && Date.now() >= state.until);
}

function hookBgm(player) {
  if (hooked) { return; }
  hooked = true;
  player.onPlay(function () {
    if (state.mode !== 'bgm') { return; }
    state.playing = true;
    state.error = '';
    emit();
  });
  player.onPause(function () {
    if (state.mode !== 'bgm') { return; }
    state.playing = false;
    emit();
  });
  player.onStop(function () {
    if (state.mode !== 'bgm') { return; }
    state.playing = false;
    emit();
  });
  player.onEnded(function () {
    if (state.mode !== 'bgm' || !state.playing) { return; }
    if (expired()) { stop(); return; }
    startSrc(player);
  });
  player.onError(function () {
    if (state.mode === 'bgm' && state.playing && state.path) {
      playInner(state.path);
      return;
    }
    state.playing = false;
    state.error = '播放失败';
    emit();
  });
}

function startSrc(player) {
  player.title = TITLES[state.kind] || '哄睡';
  player.epname = '哄睡';
  player.singer = '新生儿记录';
  player.src = state.path;
}

function playInner(path) {
  state.mode = 'inner';
  if (bgm) {
    try { bgm.stop(); } catch (e) { }
  }
  if (!inner) {
    inner = wx.createInnerAudioContext();
    inner.loop = false;
    inner.obeyMuteSwitch = false;
    inner.onEnded(function () {
      if (expired()) { stop(); return; }
      if (state.playing) {
        try { inner.play(); } catch (e) { }
      }
    });
    inner.onError(function () {
      state.playing = false;
      state.error = '播放失败';
      emit();
    });
  }
  inner.volume = state.volume / 100;
  inner.src = path;
  inner.play();
  state.playing = true;
  state.error = '';
  emit();
}

function filePath(kind) {
  return wx.env.USER_DATA_PATH + '/soothe-v1-' + kind + '.wav';
}

function ensureFile(kind, cb) {
  var path = filePath(kind);
  var fs = wx.getFileSystemManager();
  fs.access({
    path: path,
    success: function () { cb(null, path); },
    fail: function () {
      try {
        fs.writeFile({
          filePath: path,
          data: noise.wavOf(kind),
          success: function () { cb(null, path); },
          fail: function (err) { cb(err || new Error('write')); }
        });
      } catch (e) { cb(e); }
    }
  });
}

function play(kind, minutes) {
  state.kind = TITLES[kind] ? kind : 'white';
  state.minutes = minutes > 0 ? minutes : 0;
  state.until = state.minutes ? Date.now() + state.minutes * 60000 : 0;
  state.error = '';
  state.dock = true;
  state.playing = true;
  emit();
  ensureFile(state.kind, function (err, path) {
    if (err) {
      state.playing = false;
      state.error = '生成声音失败';
      emit();
      return;
    }
    state.path = path;
    state.playing = true;
    playInner(path);
  });
}

function setVolume(v) {
  v = Math.round(v);
  if (v < 0) { v = 0; }
  if (v > 100) { v = 100; }
  state.volume = v;
  try { storage.saveSetting('noiseVolume', v); } catch (e) { }
  if (inner) { inner.volume = v / 100; }
  if (state.playing && state.mode === 'bgm' && state.path) { playInner(state.path); }
  emit();
}

function resume() {
  tick();
  if (state.playing && state.mode === 'inner' && inner) {
    try { inner.play(); } catch (e) { }
  }
}

function stop() {
  state.playing = false;
  state.until = 0;
  state.path = '';
  try { if (bgm) { bgm.stop(); } } catch (e) { }
  try { if (inner) { inner.stop(); } } catch (e2) { }
  emit();
}

function tick() {
  if (state.playing && expired()) { stop(); }
}

module.exports = {
  play: play,
  stop: stop,
  setVolume: setVolume,
  resume: resume,
  tick: tick,
  snapshot: snapshot,
  subscribe: subscribe,
  TITLES: TITLES
};
