// 哄睡声：在本地生成一小段可循环的 PCM，不依赖网络音频。
// 白 / 粉 / 棕噪、雨声、约 72 次/分的心跳。

var SR = 22050;

function clamp(x) {
  if (x > 1) { return 1; }
  if (x < -1) { return -1; }
  return x;
}

function white() { return Math.random() * 2 - 1; }

function makePink(n) {
  var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  var out = new Float32Array(n);
  var i, w, p;
  for (i = 0; i < n; i++) {
    w = white();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    out[i] = clamp(p * 0.11);
  }
  return out;
}

function makeBrown(n) {
  var out = new Float32Array(n);
  var last = 0;
  var i, w;
  for (i = 0; i < n; i++) {
    w = white();
    last = (last + w * 0.02) * 0.996;
    if (last > 1) { last = 1; }
    if (last < -1) { last = -1; }
    out[i] = last * 0.85;
  }
  return out;
}

function makeWhite(n) {
  var out = new Float32Array(n);
  var i;
  for (i = 0; i < n; i++) { out[i] = white() * 0.35; }
  return out;
}

function makeRain(n) {
  var out = new Float32Array(n);
  var env = 0;
  var bed = 0;
  var i, w;
  for (i = 0; i < n; i++) {
    w = white();
    bed = bed * 0.985 + w * 0.015;
    if (Math.random() < 0.0015) { env = 0.35 + Math.random() * 0.65; }
    env *= 0.94;
    out[i] = clamp(bed * 1.4 + w * (0.08 + env * 0.55));
  }
  return out;
}

function thump(t, freq, amp) {
  if (t < 0 || t > 0.2) { return 0; }
  return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 26) * amp;
}

function makeToneBed(n, freq, harm, noiseMix, noisePole) {
  var out = new Float32Array(n);
  var lp = 0;
  var i, t, w, tone;
  for (i = 0; i < n; i++) {
    t = i / SR;
    w = white();
    lp = lp * noisePole + w * (1 - noisePole);
    tone = Math.sin(2 * Math.PI * freq * t) + harm * Math.sin(2 * Math.PI * freq * 2 * t);
    out[i] = clamp(tone * (1 - noiseMix) * 0.45 + lp * noiseMix);
  }
  return out;
}

function makeDryer(n) {
  return makeToneBed(n, 118, 0.35, 0.62, 0.72);
}

function makeFan(n) {
  return makeToneBed(n, 72, 0.22, 0.48, 0.9);
}

function makeRazor(n) {
  var out = new Float32Array(n);
  var prev = 0;
  var hp = 0;
  var i, t, w, buzz, gate;
  for (i = 0; i < n; i++) {
    t = i / SR;
    buzz = Math.sin(2 * Math.PI * 210 * t);
    buzz = buzz >= 0 ? 0.16 : -0.16;
    w = white();
    hp = (w - prev) + hp * 0.82;
    prev = w;
    gate = 0.72 + 0.28 * Math.sin(2 * Math.PI * 46 * t);
    out[i] = clamp((buzz + hp * 0.22) * gate);
  }
  return out;
}

function makeStream(n) {
  var out = new Float32Array(n);
  var bed = 0;
  var env = 0;
  var i, w;
  for (i = 0; i < n; i++) {
    w = white();
    bed = bed * 0.93 + w * 0.07;
    if (Math.random() < 0.01) { env = 0.25 + Math.random() * 0.55; }
    env *= 0.88;
    out[i] = clamp(bed * 0.9 + w * (0.1 + env * 0.62));
  }
  return out;
}

function makeWave(n) {
  var out = new Float32Array(n);
  var lp = 0;
  var i, w, env;
  for (i = 0; i < n; i++) {
    w = white();
    lp = lp * 0.97 + w * 0.03;
    env = 0.22 + 0.78 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    out[i] = clamp(lp * 3.2 * env);
  }
  return out;
}

function makeHeart(n) {
  var period = SR * 60 / 72;
  var out = new Float32Array(n);
  var i, t, beat;
  for (i = 0; i < n; i++) {
    beat = i % period;
    t = beat / SR;
    out[i] = clamp(thump(t, 58, 0.9) + thump(t - 0.16, 78, 0.55));
  }
  return out;
}

function seamless(samples) {
  var fade = Math.min(800, Math.floor(samples.length / 8));
  var i, w, mixed;
  var next = new Float32Array(samples.length - fade);
  for (i = 0; i < fade; i++) {
    w = i / fade;
    mixed = samples[i] * w + samples[samples.length - fade + i] * (1 - w);
    next[i] = mixed;
  }
  for (i = fade; i < next.length; i++) { next[i] = samples[i]; }
  return next;
}

function samplesOf(kind) {
  var seconds = 4;
  if (kind === 'heart') { seconds = (60 / 72) * 12; }
  else if (kind === 'wave') { seconds = 8; }
  var n = Math.round(SR * seconds);
  var raw;
  if (kind === 'pink') { raw = makePink(n); }
  else if (kind === 'brown') { raw = makeBrown(n); }
  else if (kind === 'rain') { raw = makeRain(n); }
  else if (kind === 'stream') { raw = makeStream(n); }
  else if (kind === 'dryer') { raw = makeDryer(n); }
  else if (kind === 'fan') { raw = makeFan(n); }
  else if (kind === 'razor') { raw = makeRazor(n); }
  else if (kind === 'wave') { raw = makeWave(n); }
  else if (kind === 'heart') { raw = makeHeart(n); }
  else { raw = makeWhite(n); }
  if (kind === 'heart' || kind === 'wave') { return raw; }
  return seamless(raw);
}

function wavOf(kind) {
  var samples = samplesOf(kind);
  var n = samples.length;
  var buffer = new ArrayBuffer(44 + n * 2);
  var view = new DataView(buffer);
  function str(offset, s) {
    var i;
    for (i = 0; i < s.length; i++) { view.setUint8(offset + i, s.charCodeAt(i)); }
  }
  str(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, n * 2, true);
  var offset = 44;
  var i, s;
  for (i = 0; i < n; i++) {
    s = samples[i];
    if (s > 1) { s = 1; }
    if (s < -1) { s = -1; }
    view.setInt16(offset, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
    offset += 2;
  }
  return buffer;
}

module.exports = { samplesOf: samplesOf, wavOf: wavOf, sampleRate: SR };
