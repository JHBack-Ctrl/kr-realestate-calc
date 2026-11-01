/* 땅값 몇 배 계산기 — 지역 지가지수 또는 같은 땅의 개별공시지가로 몇 배가 됐는지, 연평균 상승률, 물가와 비교 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (개정 시 이 블록만 수정) ----
  var PYEONG_M2 = 400 / 121;                 // 1평 = 3.305785㎡ (area.js와 같은 값)
  // 소비자물가지수 연간 총지수(2020=100). 출처: 통계청(국가데이터처) 소비자물가조사, e-나라지표.
  // 확인한 해만 넣었다. 비어 있는 해는 물가 비교를 하지 않고 화면에 그렇게 적는다.
  var CPI = { 2015: 94.9, 2016: 95.8, 2017: 97.6, 2018: 99.1, 2019: 99.5, 2020: 100.0, 2021: 102.5, 2022: 107.7, 2023: 111.6, 2024: 114.2, 2025: 116.6 };
  var CPI_FIRST = 2015, CPI_LAST = 2025;
  // 지역 지가지수: js/land-index-data.js(빌드가 tools/data/land_index.json에서 만듦). 자료가 없으면 null
  var IDX = window.LAND_INDEX || null;

  function firstYear(series) { var ys = Object.keys(series).map(Number).sort(function (a, b) { return a - b; }); return ys[0]; }
  function pair(i) {
    if (i.mode !== 'region') return { then: i.then, now: i.now };
    var s = IDX && i.region ? IDX.regions[i.region] : null;
    if (!s) return { then: 0, now: 0, missing: IDX ? 'region' : 'data' };
    var a = s[i.yearThen], b = s[i.yearNow];
    return { then: a || 0, now: b || 0, missing: a && b ? null : 'year', first: firstYear(s) };
  }
  function calc(i) {
    var p = pair(i), ok = p.then > 0 && p.now > 0, years = i.yearNow - i.yearThen;
    var multiple = ok ? p.now / p.then : 0;
    var cagr = ok && years > 0 ? (Math.pow(multiple, 1 / years) - 1) * 100 : null;
    var m2 = i.mode === 'direct' && i.area > 0 ? (i.unit === 'py' ? i.area * PYEONG_M2 : i.area) : 0;
    var cpiThen = CPI[i.yearThen], cpiNow = CPI[i.yearNow];
    var cpiMultiple = cpiThen && cpiNow && years > 0 ? cpiNow / cpiThen : null;
    return { p: p, ok: ok, years: years, multiple: multiple, cagr: cagr, pyThen: i.then * PYEONG_M2, pyNow: i.now * PYEONG_M2,
      m2: m2, totalThen: i.then * m2, totalNow: i.now * m2, cpiMultiple: cpiMultiple, real: cpiMultiple && ok ? multiple / cpiMultiple : null };
  }
  function readInput() {
    var u = document.querySelector('input[name="areaUnit"]:checked'), md = document.querySelector('input[name="mode"]:checked');
    return { mode: md ? md.value : 'region', region: $('region').value, then: S.parseMoney($('priceThen').value), now: S.parseMoney($('priceNow').value),
      yearThen: Math.floor(S.parseNonNegative($('yearThen').value)) || 0, yearNow: Math.floor(S.parseNonNegative($('yearNow').value)) || 0,
      area: S.parseNonNegative($('area').value), unit: u ? u.value : 'm2' };
  }
  function times(n) { return S.fmtRate(n); }
  function idx(n) { return n ? S.fmtRate(n) : '—'; }
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
    S.setText('out-years', r.years > 0 ? String(r.years) : '—');
    S.setText('out-s3-label', region ? '지금 지가지수' : '지금 평당 공시지가');
    S.setText('out-s3', region ? (r.ok ? idx(r.p.now) : '—') : (r.ok ? S.fmtWon(r.pyNow) : '—'));
    S.setText('out-s3-unit', region ? '' : '원');
    S.setText('out-then-m2', S.fmtWon(i.then)); S.setText('out-now-m2', S.fmtWon(i.now));
    S.setText('out-then-py', S.fmtWon(r.pyThen)); S.setText('out-now-py', S.fmtWon(r.pyNow));
    S.setText('out-region-name', i.region || '—'); S.setText('out-idx-then', idx(r.p.then)); S.setText('out-idx-now', idx(r.p.now));
    S.setText('out-idx-base', IDX ? IDX.base : '—');
    S.setText('out-area-m2', S.fmtRate(r.m2)); S.setText('out-total-then', S.fmtWon(r.totalThen)); S.setText('out-total-now', S.fmtWon(r.totalNow)); S.setText('out-total-diff', S.fmtWon(r.totalNow - r.totalThen));
    S.setText('out-cpi', r.cpiMultiple ? times(r.cpiMultiple) + '배' : '—');
    S.setText('out-real', r.real ? times(r.real) + '배' : '—');
    S.setText('out-cpi-note', r.cpiMultiple ? '소비자물가지수 ' + i.yearThen + '년 ' + CPI[i.yearThen] + ' → ' + i.yearNow + '년 ' + CPI[i.yearNow] + '(2020=100). 땅값 배수를 물가 배수로 나눈 값이 물가를 뺀 배수입니다.' :
      '물가 비교는 소비자물가지수가 들어 있는 해끼리만 합니다. 지금은 ' + CPI_FIRST + '~' + CPI_LAST + '년 연간값만 넣어 두었습니다.');
    S.setText('rules-date', basis(i) + ' · 물가는 통계청 소비자물가지수 연간(2020=100)');
    var note;
    if (region && r.p.missing === 'data') note = '지역별 지가지수 자료를 준비 중입니다. 지금은 「공시지가 직접 입력」으로 계산할 수 있습니다.';
    else if (region && r.p.missing === 'region') note = '지역을 고르면 바로 계산됩니다.';
    else if (region && r.p.missing === 'year') note = i.region + ' 자료는 ' + r.p.first + '년부터 ' + IDX.latest + '까지 있습니다. 그 안의 연도를 넣어 주세요.';
    else if (!r.ok) note = '그때와 지금의 공시지가(1㎡당)를 넣으면 바로 계산됩니다.';
    else if (region) note = i.region + ' 지가지수: ' + i.yearThen + '년 ' + idx(r.p.then) + ' → ' + i.yearNow + '년 ' + idx(r.p.now) + '. ' + (r.years > 0 ? r.years + '년 동안 ' : '') +
      times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + '입니다. 지역 평균이라 내 땅의 공시지가 배수와는 다를 수 있습니다.';
    else note = (r.years > 0 ? i.yearThen + '년 ' : '그때 ') + S.fmtKorean(i.then) + '/㎡이던 땅이 ' + (r.years > 0 ? i.yearNow + '년 ' : '지금 ') + S.fmtKorean(i.now) + '/㎡이면 ' +
      (r.years > 0 ? r.years + '년 동안 ' : '') + times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%씩 오른 셈입니다. ' : '가 됐습니다. ') +
      (r.years <= 0 ? '연도를 넣으면 연평균 상승률도 나옵니다. ' : '') + '공시지가 기준이며 시세가 아닙니다.';
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('yearThen').value = '1990'; $('yearNow').value = '2026';
    S.wireCalc({
      key: 'land-multiple',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        $('priceThen').value = ''; $('priceNow').value = ''; $('area').value = ''; $('yearThen').value = '1990'; $('yearNow').value = '2026';
        if (name === 'clear') return;
        if (name === 'ex') {
          var d = document.querySelector('input[name="mode"][value="direct"]'); if (d) d.checked = true;
          S.setMoney('priceThen', 1000000); S.setMoney('priceNow', 20000000);
        }
      },
      share: function () {
        var r = last.r, i = last.i, period = r.years > 0 ? i.yearThen + '→' + i.yearNow + '년 ' : '';
        return { title: '땅값 몇 배 계산 결과', text: '[땅값 몇 배] ' + (i.mode === 'region' ? i.region + ' ' + period + '지가지수 ' : period + S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now) + ' (1㎡당) ') + '\n' +
          times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + ' · ' + (i.mode === 'region' ? '지역 평균 지가지수 기준' : '공시지가 기준(시세 아님)') };
      },
      card: function () {
        var r = last.r, i = last.i, region = i.mode === 'region';
        var rows = region ? [['지역', i.region], ['지가지수 (그때 → 지금)', idx(r.p.then) + ' → ' + idx(r.p.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%']]
          : [['그때 → 지금 (1㎡당)', S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%'], ['지금 평당 공시지가', S.fmtWon(r.pyNow) + '원']];
        if (r.real) rows.push(['물가를 뺀 배수', times(r.real) + '배']);
        return { file: 'land-multiple-result', title: '땅값 몇 배 계산기', kicker: (r.years > 0 ? i.yearThen + '년 → ' + i.yearNow + '년 · ' : '') + (region ? '지역 땅값 지수 배수' : '공시지가 상승 배수'), big: times(r.multiple), unit: '배', rows: rows,
          note: (region ? '지역 평균 지가지수 기준(특정 필지 공시지가와 다름)' : '공시지가 기준(시세 아님)') + '. 본 계산기는 참고용이며 금융·세무·법률 자문이 아닙니다.' };
      }
    });
  });
})();
