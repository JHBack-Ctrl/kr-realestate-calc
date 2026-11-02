/* 땅값 몇 배 계산기 — 지역 지가지수 또는 같은 땅의 개별공시지가로 몇 배가 됐는지, 연평균 상승률, 물가와 비교 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (개정 시 이 블록만 수정) ----
  var PYEONG_M2 = 400 / 121;                 // 1평 = 3.305785㎡ (area.js와 같은 값)
  // 지역 지가지수와 소비자물가지수(2020=100, 연간): js/land-index-data.js(빌드가 tools/data/land_index.json에서 만듦).
  // 자료가 없으면 null — 지역 고르기와 물가 비교는 「자료 준비 중」으로 나온다
  var IDX = window.LAND_INDEX || null;
  var PI = window.PriceIndex(IDX, { defaultThen: 1990 });   // 연도 목록·기간·물가 공통 (js/price-index.js)

  function pair(i) { return i.mode === 'region' ? PI.pair(i.region, i.yearThen, i.yearNow) : { then: i.then, now: i.now }; }
  function calc(i) {
    var p = pair(i), ok = p.then > 0 && p.now > 0, years = i.yearNow - i.yearThen, mon = PI.months(i.yearThen, i.yearNow, i.mode === 'region');
    var multiple = ok ? p.now / p.then : 0;
    var cagr = ok && mon > 0 ? (Math.pow(multiple, 12 / mon) - 1) * 100 : null;
    var m2 = i.mode === 'direct' && i.area > 0 ? (i.unit === 'py' ? i.area * PYEONG_M2 : i.area) : 0;
    var cpiMultiple = PI.cpi(i.yearThen, i.yearNow);
    // 지역 고르기에서 지금 1㎡당 가격을 넣으면, 같은 지수 비율로 그때 가격을 거꾸로 추정한다(지수는 가격이 아니라 변동 비율이라)
    var rp = i.mode === 'region' && ok && i.regionPrice > 0 ? { nowM2: i.regionPrice, thenM2: i.regionPrice * p.then / p.now } : null;
    if (rp) { rp.nowPy = rp.nowM2 * PYEONG_M2; rp.thenPy = rp.thenM2 * PYEONG_M2; }
    return { p: p, ok: ok, years: years, months: mon, multiple: multiple, cagr: cagr, rp: rp, pyThen: i.then * PYEONG_M2, pyNow: i.now * PYEONG_M2,
      m2: m2, totalThen: i.then * m2, totalNow: i.now * m2, cpiMultiple: cpiMultiple, real: cpiMultiple && ok ? multiple / cpiMultiple : null };
  }
  function readInput() {
    var u = document.querySelector('input[name="areaUnit"]:checked'), md = document.querySelector('input[name="mode"]:checked');
    return { mode: md ? md.value : 'region', region: $('region').value, regionPrice: S.parseMoney($('regionPrice').value), then: S.parseMoney($('priceThen').value), now: S.parseMoney($('priceNow').value),
      yearThen: Math.floor(S.parseNonNegative($('yearThen').value)) || 0, yearNow: Math.floor(S.parseNonNegative($('yearNow').value)) || 0,
      area: S.parseNonNegative($('area').value), unit: u ? u.value : 'm2' };
  }
  function times(n) { return S.fmtRate(n); }
  function period(r) { return PI.period(r.months); }
  function idx(n) { return n ? S.fmtRate(n) : '—'; }
  // 추정 금액은 끝자리를 떼어 보여 준다(100만원 이상은 만원 단위). 오른 금액은 보이는 두 값의 차이로 계산해 표 안에서 셈이 맞게 한다
  function roundEst(n) { var u = n >= 1000000 ? 10000 : n >= 10000 ? 100 : 1; return Math.round(n / u) * u; }
  function approx(n) { return S.fmtKorean(roundEst(n)); }
  function basis(i) {
    return i.mode === 'region' ? '지역 평균 지가지수 기준(' + (IDX ? IDX.source + ', ' + IDX.latest + '까지' : '자료 준비 중') + '). 특정 필지의 공시지가와 다름'
      : '공시지가 기준(시세 아님)';
  }
  var last = null;
  function render(i) {
    var r = calc(i), region = i.mode === 'region';
    $('region-fields').hidden = !region; $('direct-fields').hidden = region;
    $('region-rows').hidden = !region; $('direct-rows').hidden = region; $('area-rows').hidden = !(r.m2 > 0);
    S.setText('out-kicker', region ? (i.region ? i.region + ' 땅값 지수가 몇 배가 됐나' : '땅값 지수가 몇 배가 됐나') : '공시지가가 몇 배가 됐나');
    S.setText('out-big', r.ok ? times(r.multiple) : '—');
    S.setText('sticky-monthly', r.ok ? times(r.multiple) + '배' : '—');
    S.setText('out-cagr', r.cagr == null ? '—' : S.fmtRate(r.cagr));
    S.setText('out-years', r.months > 0 ? period(r) : '—');
    S.setText('out-s3-label', region ? (r.rp ? '그때 평당 (추정)' : '지금 지가지수') : '지금 평당 공시지가');
    S.setText('out-s3', region ? (r.rp ? approx(r.rp.thenPy) : r.ok ? idx(r.p.now) : '—') : (r.ok ? S.fmtWon(r.pyNow) : '—'));
    S.setText('out-s3-unit', region ? '' : '원');
    $('region-price-rows').hidden = !(region && r.rp);
    if (r.rp) {
      S.setText('out-rp-then-m2', approx(r.rp.thenM2)); S.setText('out-rp-then-py', approx(r.rp.thenPy));
      S.setText('out-rp-now-m2', S.fmtKorean(r.rp.nowM2)); S.setText('out-rp-now-py', approx(r.rp.nowPy)); S.setText('out-rp-diff-py', S.fmtKorean(roundEst(r.rp.nowPy) - roundEst(r.rp.thenPy)));
    }
    S.setText('out-then-m2', S.fmtWon(i.then)); S.setText('out-now-m2', S.fmtWon(i.now));
    S.setText('out-then-py', S.fmtWon(r.pyThen)); S.setText('out-now-py', S.fmtWon(r.pyNow));
    S.setText('out-region-name', i.region || '—'); S.setText('out-idx-then', idx(r.p.then)); S.setText('out-idx-now', idx(r.p.now));
    S.setText('out-idx-base', IDX ? IDX.base : '—');
    S.setText('out-area-m2', S.fmtRate(r.m2)); S.setText('out-total-then', S.fmtWon(r.totalThen)); S.setText('out-total-now', S.fmtWon(r.totalNow)); S.setText('out-total-diff', S.fmtWon(r.totalNow - r.totalThen));
    S.setText('out-cpi', r.cpiMultiple ? times(r.cpiMultiple) + '배' : '—');
    S.setText('out-real', r.real ? times(r.real) + '배' : '—');
    S.setText('out-cpi-note', PI.cpiNote(i.yearThen, i.yearNow, '땅값'));
    S.setText('rules-date', basis(i) + ' · 물가는 통계청 소비자물가지수 연간(2020=100)' + (i.mode === 'region' && IDX ? ' · 지난해까지는 12월 지수, 올해는 ' + IDX.latest + ' 지수' : ''));
    var note;
    if (region && r.p.missing === 'data') note = '지역별 지가지수 자료를 준비 중입니다. 지금은 「공시지가 직접 입력」으로 계산할 수 있습니다.';
    else if (region && r.p.missing === 'region') note = '지역을 고르면 바로 계산됩니다.';
    else if (region && r.p.missing === 'year') note = i.region + ' 자료는 ' + r.p.first + '년부터 ' + IDX.latest + '까지 있습니다. 그 안의 연도를 골라 주세요.';
    else if (!r.ok) note = '그때와 지금의 공시지가(1㎡당)를 넣으면 바로 계산됩니다.';
    else if (r.months <= 0) note = '지금 연도를 그때 연도보다 뒤로 골라 주세요.';
    else if (region) note = i.region + ' 지가지수: ' + i.yearThen + '년 ' + idx(r.p.then) + ' → ' + i.yearNow + '년 ' + idx(r.p.now) + '. ' + (r.months > 0 ? period(r) + ' 동안 ' : '') +
      times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + '입니다. ' +
      (r.rp ? '지금 1㎡당 ' + S.fmtKorean(r.rp.nowM2) + '이면 같은 비율로 ' + i.yearThen + '년에는 1㎡당 약 ' + approx(r.rp.thenM2) + '(평당 약 ' + approx(r.rp.thenPy) + ')이었던 셈입니다. 지역 평균 변동으로 거꾸로 계산한 추정값입니다.'
        : '지역 평균이라 내 땅의 공시지가 배수와는 다를 수 있습니다. 「지금 1㎡당 가격」을 넣으면 그때 가격을 추정해 보여 줍니다.');
    else note = (r.years > 0 ? i.yearThen + '년 ' : '그때 ') + S.fmtKorean(i.then) + '/㎡이던 땅이 ' + (r.years > 0 ? i.yearNow + '년 ' : '지금 ') + S.fmtKorean(i.now) + '/㎡이면 ' +
      (r.years > 0 ? r.years + '년 동안 ' : '') + times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%씩 오른 셈입니다. ' : '가 됐습니다. ') +
      (r.years <= 0 ? '연도를 넣으면 연평균 상승률도 나옵니다. ' : '') + '공시지가 기준이며 시세가 아닙니다.';
    var moved = region && !r.p.missing ? PI.movedFrom(i.yearThen) : 0;
    if (moved) note += ' ' + moved + '년은 이 지역 자료가 없어 자료가 있는 ' + i.yearThen + '년부터 계산했습니다.';   // 연도가 저절로 옮겨진 걸 알 수 있게
    else if (region && r.p.first && r.p.first > PI.dataFirst()) note += ' 이 지역 자료는 ' + r.p.first + '년부터 있습니다.';
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    PI.init();   // 연도 고르는 것을 기억하는 처리를 계산보다 먼저 단다
    S.wireCalc({
      key: 'land-multiple',
      onApply: function () { PI.adopt(); },   // 공유 링크·저장된 값의 연도를 살린다
      recalc: function () { var i = readInput(); if (PI.sync(i.region, i.mode === 'region', i.yearThen, i.yearNow)) i = readInput(); render(i); },
      preset: function (name) {
        PI.reset();   // 지역에 맞춰 줄어든 목록이면 1990이 없을 수 있어 전체 목록부터
        $('priceThen').value = ''; $('priceNow').value = ''; $('area').value = ''; $('regionPrice').value = '';
        if (name === 'clear') return;
        if (name === 'ex') {
          var d = document.querySelector('input[name="mode"][value="direct"]'); if (d) d.checked = true;
          S.setMoney('priceThen', 1000000); S.setMoney('priceNow', 20000000);
        }
      },
      share: function () {
        var r = last.r, i = last.i, period = r.years > 0 ? i.yearThen + '→' + i.yearNow + '년 ' : '';
        return { title: '땅값 몇 배 계산 결과', text: '[땅값 몇 배] ' + (i.mode === 'region' ? i.region + ' ' + period + '지가지수 ' : period + S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now) + ' (1㎡당) ') + '\n' +
          times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + ' · ' + (i.mode === 'region' ? '지역 평균 지가지수 기준' : '공시지가 기준(시세 아님)') +
          (r.rp ? '\n평당 약 ' + approx(r.rp.thenPy) + ' → ' + approx(r.rp.nowPy) + ' (지금 가격으로 거꾸로 추정)' : '') };
      },
      card: function () {
        var r = last.r, i = last.i, region = i.mode === 'region';
        var rows = region ? [['지역', i.region], ['지가지수 (그때 → 지금)', idx(r.p.then) + ' → ' + idx(r.p.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%']].concat(
            r.rp ? [['평당 (그때 추정 → 지금)', approx(r.rp.thenPy) + ' → ' + approx(r.rp.nowPy)]] : [])
          : [['그때 → 지금 (1㎡당)', S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%'], ['지금 평당 공시지가', S.fmtWon(r.pyNow) + '원']];
        if (r.real) rows.push(['물가를 뺀 배수', times(r.real) + '배']);
        return { file: 'land-multiple-result', title: '땅값 몇 배 계산기', kicker: (r.years > 0 ? i.yearThen + '년 → ' + i.yearNow + '년 · ' : '') + (region ? '지역 땅값 지수 배수' : '공시지가 상승 배수'), big: times(r.multiple), unit: '배', rows: rows,
          note: (region ? '지역 평균 지가지수 기준(특정 필지 공시지가와 다름)' : '공시지가 기준(시세 아님)') + '. 본 계산기는 참고용이며 금융·세무·법률 자문이 아닙니다.' };
      }
    });
  });
})();
