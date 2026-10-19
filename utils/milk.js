// 奶量与强化剂参考。数字来自公开指南的常用区间，供对照，不是医嘱。
// 母乳初乳：Academy of Breastfeeding Medicine Clinical Protocol #3, 2017。
// 纯母乳 1–6 月平均摄入：WHO 2002《Nutrient adequacy of exclusive breastfeeding》。
// 足月配方：AAP 约 2.5 oz/lb/天，折合约 165 ml/kg（区间取 150–180）。
// 早产足量肠内喂养：ESPGHAN 2022，多数稳定生长儿 150–180 ml/kg/天。
// 强化剂：雀巢 FM 85 / PreNAN 说明书，标准强化 4 g/100 ml（1 g/25 ml），可从 2 g/100 ml 起步。

var FORT = { half: 2, full: 4 };

function defaultFeeds(ageDays) {
  if (!(ageDays > 0)) { return 8; }
  if (ageDays <= 28) { return 8; }
  if (ageDays <= 183) { return 7; }
  if (ageDays <= 365) { return 5; }
  return 4;
}

function clampFeeds(n) {
  n = parseInt(n, 10);
  if (!(n >= 4)) { return 4; }
  if (n > 12) { return 12; }
  return n;
}

function latestWeight(records, baby) {
  var i, r;
  records = records || [];
  for (i = 0; i < records.length; i++) {
    r = records[i];
    if (r && r.type === 'growth' && r.weight > 0) {
      return { kg: r.weight, source: '最近一次生长记录' };
    }
  }
  var bw = parseFloat(baby && baby.birthWeight);
  if (bw > 0) { return { kg: Math.round(bw * 100) / 100, source: '出生体重' }; }
  return null;
}

function roundMl(n) { return Math.round(n); }
function roundG(n) { return Math.round(n * 10) / 10; }

function packPer(meta, perMin, perMid, perMax, feeds) {
  var out = {
    ok: true,
    needWeight: false,
    basis: meta.basis,
    source: meta.source,
    feeds: feeds,
    perMin: perMin,
    perMid: perMid,
    perMax: perMax,
    dayMin: perMin * feeds,
    dayMid: perMid * feeds,
    dayMax: perMax * feeds
  };
  return attachFort(out, meta);
}

function packDay(meta, dayMin, dayMid, dayMax, feeds) {
  var out = {
    ok: true,
    needWeight: false,
    basis: meta.basis,
    source: meta.source,
    feeds: feeds,
    dayMin: roundMl(dayMin),
    dayMid: roundMl(dayMid),
    dayMax: roundMl(dayMax),
    perMin: roundMl(dayMin / feeds),
    perMid: roundMl(dayMid / feeds),
    perMax: roundMl(dayMax / feeds)
  };
  return attachFort(out, meta);
}

function attachFort(out, meta) {
  var level = meta.fortify;
  if (meta.kind !== 'breast' || (level !== 'half' && level !== 'full')) {
    out.fort = null;
    return out;
  }
  var per100 = FORT[level];
  out.fort = {
    level: level,
    gPer100: per100,
    perG: roundG(out.perMid * per100 / 100),
    dayG: roundG(out.dayMid * per100 / 100),
    rateText: (level === 'half' ? '半量 ' : '全量 ') + per100 + ' g / 100 ml',
    caution: !meta.preterm,
    note: meta.preterm
      ? '按雀巢 FM 85 / PreNAN 说明书换算。半量是说明书里的起步量，全量是 1 g/25 ml。其他品牌不要套用这个克数。'
      : '足月健康儿通常不需要强化剂。下面的克数只是按说明书比例换算，须由医生决定加不加、加哪种。'
  };
  return out;
}

function need(feeds) {
  return { ok: false, needWeight: true, feeds: feeds, fort: null };
}

// ABM 2017：健康足月儿母乳每顿报告量
var ABM = {
  1: [2, 6, 10],
  2: [5, 10, 15],
  3: [15, 22, 30],
  4: [30, 45, 60]
};

function suggest(input) {
  input = input || {};
  var ageDays = parseInt(input.ageDays, 10) || 0;
  var weightKg = input.weightKg;
  var feeds = clampFeeds(input.feeds);
  var kind = input.kind === 'formula' ? 'formula' : 'breast';
  var preterm = !!input.preterm;
  var fortify = input.fortify === 'half' || input.fortify === 'full' ? input.fortify : 'none';
  var hasW = weightKg > 0;
  var months = ageDays > 0 ? (ageDays - 1) / 30.437 : 0;
  var meta = { kind: kind, preterm: preterm, fortify: fortify, basis: '', source: '' };

  if (preterm) {
    if (!hasW) { return need(feeds); }
    meta.basis = '早产或低体重、已能足量肠内喂养时，按 ESPGHAN 2022：多数稳定生长儿液体量 150–180 ml/kg/天。开奶最初几天以医院医嘱为准，不要自行加到这个量。';
    meta.source = 'ESPGHAN 2022';
    return packDay(meta, weightKg * 150, weightKg * 165, weightKg * 180, feeds);
  }

  if (kind === 'breast' && ageDays >= 1 && ageDays <= 4) {
    var row = ABM[ageDays];
    meta.basis = '出生第 ' + ageDays + ' 天母乳：ABM 临床方案 #3（2017）报告的健康足月儿每顿摄入大约在这个范围。母乳按需喂，这不是必须喝完的目标。';
    meta.source = 'ABM Protocol #3, 2017';
    return packPer(meta, row[0], row[1], row[2], feeds);
  }

  if (kind === 'formula' && ageDays >= 1 && ageDays <= 4) {
    var early = { 1: [10, 20, 30], 2: [20, 35, 45], 3: [30, 45, 60], 4: [45, 60, 75] }[ageDays];
    meta.basis = '出生第 ' + ageDays + ' 天配方奶：AAP 所述最初几天每顿大约 1–2 盎司（30–60 ml）还在往上加，这里给出更早几天的过渡区间。';
    meta.source = 'AAP';
    return packPer(meta, early[0], early[1], early[2], feeds);
  }

  if (kind === 'breast' && ageDays > 28 && months < 6) {
    meta.basis = '纯母乳约 1–6 个月：WHO 2002 汇总的平均摄入约 780 ml/天，常见大约 600–900 ml。吃到这个范围即可，不必按体重往上加。';
    meta.source = 'WHO 2002';
    return packDay(meta, 600, 780, 900, feeds);
  }

  if (kind === 'breast' && months >= 6 && months < 12) {
    meta.basis = '6–12 个月继续母乳：WHO 建议加辅食后仍喂母乳。奶量因辅食而下降，常见大约 400–700 ml/天，没有统一的必须目标。';
    meta.source = 'WHO 辅食喂养';
    return packDay(meta, 400, 550, 700, feeds);
  }

  if (kind === 'breast' && months >= 12) {
    meta.basis = '1 岁以后母乳可继续喂。国际指南不再规定每天必须的母乳毫升数，下面只是常见的大致范围。';
    meta.source = 'WHO';
    return packDay(meta, 300, 400, 500, feeds);
  }

  if (kind === 'formula' && months >= 6 && months < 12) {
    meta.basis = '6–12 个月配方奶：辅食增加后，一天配方奶常见大约 600–900 ml，不必再按体重线性加量。';
    meta.source = 'AAP';
    return packDay(meta, 600, 750, 900, feeds);
  }

  if (kind === 'formula' && months >= 12) {
    meta.basis = '1 岁后 AAP 建议全脂奶大约每天 16–24 盎司（约 480–710 ml），作为饮食的一部分，不是全部。';
    meta.source = 'AAP';
    return packDay(meta, 480, 590, 710, feeds);
  }

  if (!hasW) { return need(feeds); }

  if (kind === 'formula') {
    meta.basis = (ageDays > 0 ? '' : '未填写出生日期。') + '足月配方奶按 AAP：约每磅体重 2.5 盎司/天，折合中位 165 ml/kg，区间取 150–180 ml/kg。';
    meta.source = 'AAP';
    return packDay(meta, weightKg * 150, weightKg * 165, weightKg * 180, feeds);
  }

  meta.basis = (ageDays > 0 ? '出生第 ' + ageDays + ' 天，' : '未填写出生日期。') + '母乳泌乳建立阶段按体重约 120–180 ml/kg 估算一天总量，中位 150。母乳仍按需喂。';
  meta.source = '临床常用区间';
  return packDay(meta, weightKg * 120, weightKg * 150, weightKg * 180, feeds);
}

function gapText(todayMl, dayMid) {
  todayMl = Math.round(todayMl || 0);
  dayMid = Math.round(dayMid || 0);
  if (!(dayMid > 0)) { return ''; }
  var d = todayMl - dayMid;
  if (d === 0) { return '和一天参考持平'; }
  if (d < 0) { return '距一天参考还差 ' + (-d) + ' ml'; }
  return '比一天参考多 ' + d + ' ml';
}

module.exports = {
  defaultFeeds: defaultFeeds,
  clampFeeds: clampFeeds,
  latestWeight: latestWeight,
  suggest: suggest,
  gapText: gapText
};
