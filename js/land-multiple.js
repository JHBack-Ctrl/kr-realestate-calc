/* 땅값 몇 배 계산기 — 같은 땅의 개별공시지가가 몇 배가 됐는지, 연평균 상승률, 평당 환산, 물가와 비교 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (개정 시 이 블록만 수정) ----
  var RULES_DATE = '공시지가 기준(시세 아님) · 물가는 통계청 소비자물가지수 연간(2020=100), 2026-11 확인';
  var PYEONG_M2 = 400 / 121;                 // 1평 = 3.305785㎡ (area.js와 같은 값)
  // 소비자물가지수 연간 총지수(2020=100). 출처: 통계청(국가데이터처) 소비자물가조사, e-나라지표.
  // 확인한 해만 넣었다. 비어 있는 해는 물가 비교를 하지 않고 화면에 그렇게 적는다.
  var CPI = { 2015: 94.9, 2016: 95.8, 2017: 97.6, 2018: 99.1, 2019: 99.5, 2020: 100.0, 2021: 102.5, 2022: 107.7, 2023: 111.6, 2024: 114.2, 2025: 116.6 };
  var CPI_FIRST = 2015, CPI_LAST = 2025;

  function calc(i) {
    var ok = i.then > 0 && i.now > 0, years = i.yearNow - i.yearThen;
    var multiple = ok ? i.now / i.then : 0;
    var cagr = ok && years > 0 ? (Math.pow(multiple, 1 / years) - 1) * 100 : null;
    var m2 = i.area > 0 ? (i.unit === 'py' ? i.area * PYEONG_M2 : i.area) : 0;
    var cpiThen = CPI[i.yearThen], cpiNow = CPI[i.yearNow];
    var cpiMultiple = cpiThen && cpiNow && years > 0 ? cpiNow / cpiThen : null;
    return { ok: ok, years: years, multiple: multiple, cagr: cagr, pyThen: i.then * PYEONG_M2, pyNow: i.now * PYEONG_M2,
      m2: m2, totalThen: i.then * m2, totalNow: i.now * m2, cpiMultiple: cpiMultiple, real: cpiMultiple && ok ? multiple / cpiMultiple : null };
  }
  function readInput() {
    var u = document.querySelector('input[name="areaUnit"]:checked');
    return { then: S.parseMoney($('priceThen').value), now: S.parseMoney($('priceNow').value),
      yearThen: Math.floor(S.parseNonNegative($('yearThen').value)) || 0, yearNow: Math.floor(S.parseNonNegative($('yearNow').value)) || 0,
      area: S.parseNonNegative($('area').value), unit: u ? u.value : 'm2' };
  }
  function times(n) { return S.fmtRate(n); }
  var last = null;
  function render(i) {
    var r = calc(i);
    S.setText('out-big', r.ok ? times(r.multiple) : '—');
    S.setText('sticky-monthly', r.ok ? times(r.multiple) + '배' : '—');
    S.setText('out-cagr', r.cagr == null ? '—' : S.fmtRate(r.cagr));
    S.setText('out-years', r.years > 0 ? String(r.years) : '—');
    S.setText('out-py-now', r.ok ? S.fmtWon(r.pyNow) : '—');
    S.setText('out-then-m2', S.fmtWon(i.then)); S.setText('out-now-m2', S.fmtWon(i.now));
    S.setText('out-then-py', S.fmtWon(r.pyThen)); S.setText('out-now-py', S.fmtWon(r.pyNow));
    $('area-rows').hidden = !(r.m2 > 0);
    S.setText('out-area-m2', S.fmtRate(r.m2)); S.setText('out-total-then', S.fmtWon(r.totalThen)); S.setText('out-total-now', S.fmtWon(r.totalNow)); S.setText('out-total-diff', S.fmtWon(r.totalNow - r.totalThen));
    S.setText('out-cpi', r.cpiMultiple ? times(r.cpiMultiple) + '배' : '—');
    S.setText('out-real', r.real ? times(r.real) + '배' : '—');
    S.setText('out-cpi-note', r.cpiMultiple ? '소비자물가지수 ' + i.yearThen + '년 ' + CPI[i.yearThen] + ' → ' + i.yearNow + '년 ' + CPI[i.yearNow] + '(2020=100). 공시지가 배수를 물가 배수로 나눈 값이 물가를 뺀 배수입니다.' :
      '물가 비교는 소비자물가지수가 들어 있는 해끼리만 합니다. 지금은 ' + CPI_FIRST + '~' + CPI_LAST + '년 연간값만 넣어 두었습니다.');
    S.setText('rules-date', RULES_DATE);
    var note;
    if (!r.ok) note = '그때와 지금의 공시지가(1㎡당)를 넣으면 바로 계산됩니다.';
    else {
      note = (r.years > 0 ? i.yearThen + '년 ' : '그때 ') + S.fmtKorean(i.then) + '/㎡이던 땅이 ' + (r.years > 0 ? i.yearNow + '년 ' : '지금 ') + S.fmtKorean(i.now) + '/㎡이면 ' +
        (r.years > 0 ? r.years + '년 동안 ' : '') + times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%씩 오른 셈입니다. ' : '가 됐습니다. ') +
        (r.years <= 0 ? '연도를 넣으면 연평균 상승률도 나옵니다. ' : '') + '공시지가 기준이며 시세가 아닙니다.';
    }
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
        if (name === 'ex') { S.setMoney('priceThen', 1000000); S.setMoney('priceNow', 20000000); }
      },
      share: function () { var r = last.r, i = last.i; return { title: '땅값 몇 배 계산 결과', text: '[땅값 몇 배] ' + (r.years > 0 ? i.yearThen + '→' + i.yearNow + '년 ' : '') + S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now) + ' (1㎡당)\n' + times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + ' · 공시지가 기준(시세 아님)' }; },
      card: function () {
        var r = last.r, i = last.i;
        var rows = [['그때 → 지금 (1㎡당)', S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%'], ['지금 평당 공시지가', S.fmtWon(r.pyNow) + '원']];
        if (r.real) rows.push(['물가를 뺀 배수', times(r.real) + '배']);
        return { file: 'land-multiple-result', title: '땅값 몇 배 계산기', kicker: (r.years > 0 ? i.yearThen + '년 → ' + i.yearNow + '년 · ' : '') + '공시지가 상승 배수', big: times(r.multiple), unit: '배', rows: rows,
          note: '공시지가 기준(시세 아님). 본 계산기는 참고용이며 금융·세무·법률 자문이 아닙니다.' };
      }
    });
  });
})();
