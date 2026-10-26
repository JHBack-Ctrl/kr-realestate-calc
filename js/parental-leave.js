/* 육아휴직 급여 계산기 — 월 통상임금과 사용 개월로 달마다 받는 급여, 6+6 부모육아휴직제 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (고용보험법 시행령. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2025년 1월 개편 기준, 2026년 적용 (2026-10 확인)';
  var NORMAL = [[3, 100, 2500000], [6, 100, 2000000], [Infinity, 80, 1600000]];   // [몇 개월째까지, 통상임금 %, 월 상한]
  var SIX_SIX = [2500000, 2500000, 3000000, 3500000, 4000000, 4500000];          // 6+6: 첫 6개월 통상임금 100%, 달마다 상한
  var FLOOR = 700000;                 // 월 하한
  var MAX_MONTHS = 18;                // 부모가 각각 3개월 이상 쓰면 1년 6개월까지

  function won(n) { return Math.floor(n + 1e-6); }
  function monthPay(wage, k, sixsix) {   // k: 1부터
    if (sixsix && k <= SIX_SIX.length) return { pay: Math.max(FLOOR, Math.min(wage, SIX_SIX[k - 1])), cap: SIX_SIX[k - 1], pct: 100 };
    for (var j = 0; j < NORMAL.length; j++) if (k <= NORMAL[j][0]) return { pay: Math.max(FLOOR, Math.min(won(wage * NORMAL[j][1] / 100), NORMAL[j][2])), cap: NORMAL[j][2], pct: NORMAL[j][1] };
  }
  function calc(i) {
    var rows = [], total = 0;
    for (var k = 1; k <= i.months; k++) { var m = monthPay(i.wage, k, i.sixsix); rows.push({ k: k, pay: m.pay, cap: m.cap, pct: m.pct }); total += m.pay; }
    return { rows: rows, total: total, first: rows.length ? rows[0].pay : 0, avg: rows.length ? won(total / rows.length) : 0 };
  }
  function readInput() {
    return { wage: S.parseMoney($('wage').value), months: Math.max(0, Math.min(MAX_MONTHS, Math.floor(S.parseNonNegative($('months').value)))), sixsix: $('sixsix').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.wage > 0 && i.months > 0;
    S.setText('out-total', S.fmtWon(has ? r.total : 0)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-first', S.fmtWon(has ? r.first : 0)); S.setText('out-avg', S.fmtWon(has ? r.avg : 0)); S.setText('out-months', i.months);
    var tb = $('table-body');
    if (tb) {
      tb.innerHTML = '';
      if (has) r.rows.forEach(function (x) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<th scope="row">' + x.k + '개월째</th><td>' + x.pct + '% · 상한 ' + S.fmtWon(x.cap / 10000) + '만</td><td>' + S.fmtWon(x.pay) + '원</td>';
        tb.appendChild(tr);
      });
    }
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '월 통상임금과 쓸 개월 수를 입력하면 바로 계산됩니다.' :
      i.months + '개월 동안 모두 ' + S.fmtKorean(r.total) + '을 받습니다. ' + (i.sixsix ? '6+6 부모육아휴직제로 첫 6개월 상한을 높여 계산했습니다(부모 각자 받는 금액). ' : '') +
      '2025년부터 사후지급금이 없어져 휴직 중에 매달 전액을 받습니다. 참고용 추정이며 실제 금액은 고용센터가 정합니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'parental-leave',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('wage').value = ''; return; }
        var p = { w300: [3000000, 12, false], w500: [5000000, 12, false], s66: [5000000, 6, true] }[name]; if (!p) return;
        S.setMoney('wage', p[0]); $('months').value = String(p[1]); $('sixsix').checked = p[2];
      },
      share: function () { return { title: '육아휴직 급여 계산 결과', text: '[육아휴직 급여] 통상임금 월 ' + S.fmtKorean(last.i.wage) + ' · ' + last.i.months + '개월\n합계 ' + S.fmtWon(last.r.total) + '원 (첫 달 ' + S.fmtWon(last.r.first) + '원)' }; },
      card: function () {
        var r = last.r, rows = r.rows.slice(0, 4).map(function (x) { return [x.k + '개월째', S.fmtWon(x.pay) + '원']; });
        if (r.rows.length > 4) rows.push([r.rows.length + '개월 평균', S.fmtWon(r.avg) + '원']);
        return { file: 'parental-leave-result', title: '육아휴직 급여 계산기', kicker: '통상임금 월 ' + S.fmtKorean(last.i.wage) + ' · ' + last.i.months + '개월 합계', big: S.fmtWon(r.total), unit: '원',
          rows: rows, note: RULES_DATE + '. 참고용 추정입니다.' };
      }
    });
  });
})();
