// who.js —— WHO 儿童生长标准（2006）参考曲线
// 数据：0-24 月龄男孩/女孩 体重(kg)/身长(cm)/头围(cm) 中位数(P50) 与离散度(S/L)
// 依据 WHO Child Growth Standards 公共参考值；仅供参考，不替代儿保医生评估。
// 任意月龄用关键月 P50 线性插值，再按 LMS 公式推导 P3/P15/P50/P85/P97。

var MEDIANS = {
  boy: {
    weight: { 0: 3.3, 1: 4.5, 2: 5.6, 3: 6.4, 4: 7.0, 5: 7.5, 6: 7.9, 8: 8.6, 10: 9.2, 12: 9.6, 15: 10.3, 18: 10.9, 21: 11.5, 24: 12.2 },
    height: { 0: 49.9, 1: 54.7, 2: 58.4, 3: 61.4, 4: 63.9, 5: 65.9, 6: 67.6, 8: 70.6, 10: 73.3, 12: 75.7, 15: 79.1, 18: 82.3, 21: 85.1, 24: 87.1 },
    head: { 0: 34.5, 1: 37.6, 2: 39.6, 3: 41.0, 4: 42.1, 5: 43.0, 6: 43.7, 8: 44.9, 10: 45.8, 12: 46.5, 15: 47.4, 18: 48.1, 21: 48.7, 24: 49.2 }
  },
  girl: {
    weight: { 0: 3.2, 1: 4.2, 2: 5.1, 3: 5.8, 4: 6.4, 5: 6.9, 6: 7.3, 8: 8.0, 10: 8.5, 12: 8.9, 15: 9.6, 18: 10.2, 21: 10.8, 24: 11.5 },
    height: { 0: 49.1, 1: 53.7, 2: 57.1, 3: 59.8, 4: 62.1, 5: 64.0, 6: 65.7, 8: 68.8, 10: 71.5, 12: 74.0, 15: 77.5, 18: 80.7, 21: 83.4, 24: 85.7 },
    head: { 0: 33.9, 1: 36.8, 2: 38.7, 3: 40.0, 4: 41.0, 5: 41.9, 6: 42.5, 8: 43.6, 10: 44.5, 12: 45.2, 15: 46.0, 18: 46.6, 21: 47.1, 24: 47.6 }
  }
};

// LMS 参数：L 偏度，S 变异系数；z 分值对应百分位见 Z
var PARAM = {
  weight: { L: 0.3, S: 0.09 },
  height: { L: 1, S: 0.035 },
  head: { L: 1, S: 0.025 }
};

// z 分值 → 百分位（对应 P3/P15/P50/P85/P97）
var Z = { p3: -1.881, p15: -1.036, p50: 0, p85: 1.036, p97: 1.881 };

var MAX_MONTH = 24; // 参考曲线覆盖到 24 月龄

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }

function genderKey(g) { return (g === 'F' || g === 'girl') ? 'girl' : 'boy'; }
function metricKey(m) { return (m === 'height') ? 'height' : (m === 'head' ? 'head' : 'weight'); }

function interp(table, m) {
  var keys = Object.keys(table).map(Number).sort(function (a, b) { return a - b; });
  if (m <= keys[0]) { return table[keys[0]]; }
  if (m >= keys[keys.length - 1]) { return table[keys[keys.length - 1]]; }
  for (var i = 0; i < keys.length - 1; i++) {
    var a = keys[i], b = keys[i + 1];
    if (m >= a && m <= b) {
      var t = (m - a) / (b - a);
      return table[a] + (table[b] - table[a]) * t;
    }
  }
  return table[keys[keys.length - 1]];
}

function lms(M, L, S, z) {
  if (L === 0) { return M * (1 + S * z); }
  return M * Math.pow(1 + L * S * z, 1 / L);
}

// 标准正态累积分布（Abramowitz-Stegun 近似）
function normCdf(z) {
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// 月龄（天 / 30.4375）
function monthsFromDays(days) { return days / 30.4375; }

// 返回 0..24 月曲线数组 [{m, p3, p15, p50, p85, p97}]
function curve(gender, metric) {
  var gk = genderKey(gender);
  var mk = metricKey(metric);
  var p = PARAM[mk];
  var Mtable = MEDIANS[gk][mk];
  var out = [];
  for (var m = 0; m <= MAX_MONTH; m++) {
    var M = interp(Mtable, m);
    out.push({
      m: m,
      p3: round1(lms(M, p.L, p.S, Z.p3)),
      p15: round1(lms(M, p.L, p.S, Z.p15)),
      p50: round1(M),
      p85: round1(lms(M, p.L, p.S, Z.p85)),
      p97: round1(lms(M, p.L, p.S, Z.p97))
    });
  }
  return out;
}

// 评估宝宝某指标当前月龄的百分位与区间
// gender: 'M'/'F'；metric: 'weight'/'height'/'head'；months: 月龄；value: 实测值
function assess(gender, metric, months, value) {
  var gk = genderKey(gender);
  var mk = metricKey(metric);
  var p = PARAM[mk];
  var M = interp(MEDIANSp(gk, mk), months);
  if (!(value > 0) || !(M > 0)) { return null; }
  var z = (p.L === 0) ? (value - M) / (M * p.S) : (Math.pow(value / M, p.L) - 1) / (p.L * p.S);
  var pct = Math.max(1, Math.min(99, Math.round(normCdf(z) * 100)));
  var zone = '正常';
  if (z <= Z.p3) { zone = '偏低'; }
  else if (z >= Z.p97) { zone = '偏高'; }
  else if (z < Z.p15) { zone = '偏低风险'; }
  else if (z > Z.p85) { zone = '偏高风险'; }
  return { z: round2(z), pct: pct, zone: zone, M: round1(M) };
}

function MEDIANSp(gk, mk) { return MEDIANS[gk][mk]; }

function inRange(months) { return months >= 0 && months <= MAX_MONTH; }

module.exports = {
  MAX_MONTH: MAX_MONTH,
  monthsFromDays: monthsFromDays,
  curve: curve,
  assess: assess,
  inRange: inRange
};
