/* 실업급여(구직급여) 계산기 — 평균임금 60%에 상·하한, 나이·가입기간별 받는 날수 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (고용보험법·시행령. 개정 시 이 블록만 수정) ----
  // 2027년 최저임금 10,700원이면 하한(68,480원)이 지금 상한을 넘으므로 2027년 1월에 상한 개정을 확인할 것
  var RULES_DATE = '2026년 1월 1일 이후 이직자 기준 (2026-10 확인)';
  var DAILY_MAX = 68100;          // 1일 상한액 (기초일액 상한 113,500원의 60%)
  var MIN_WAGE = 10320;           // 2026년 최저임금 (시간당)
  var FLOOR_RATE = 80;            // 하한액 = 최저임금 × 80% × 1일 소정근로시간
  var BENEFIT_RATE = 60;          // 구직급여 = 평균임금 × 60%
  var DEFAULT_DAYS3 = 91;         // 퇴직일을 비웠을 때 3개월 일수
  // 소정급여일수 [가입기간 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상]
  var DAYS = { under50: [120, 150, 180, 210, 240], over50: [120, 180, 210, 240, 270] };

  function won(n) { return Math.floor(n + 1e-6); }   // 원 미만 버림(부동소수 오차 보정)
  function days3(leave) {   // 퇴직일(마지막 근무일)까지 3개월 일수
    if (!leave) return DEFAULT_DAYS3;
    var next = new Date(leave.getTime()); next.setDate(next.getDate() + 1);
    return S.daysBetween(S.addMonths(next, -3), next);
  }
  function calc(i) {
    var d3 = days3(i.leave);
    var avg = d3 > 0 ? i.wage * 3 / d3 : 0;
    var raw = won(avg * BENEFIT_RATE / 100);
    var floor = won(MIN_WAGE * FLOOR_RATE / 100 * i.hours);
    var daily = Math.max(floor, Math.min(raw, DAILY_MAX)), kind = raw > DAILY_MAX ? '상한액' : raw < floor ? '하한액' : '평균임금의 60%';
    var days = (DAYS[i.age] || DAYS.under50)[i.years] || 0;
    return { d3: d3, avg: avg, raw: raw, floor: floor, daily: daily, kind: kind, days: days, total: daily * days, monthly: daily * 30 };
  }
  function radio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function readInput() {
    return { wage: S.parseMoney($('wage').value), hours: Math.min(8, S.parseNonNegative($('hours').value)) || 8, leave: S.parseDate($('leave').value),
      age: radio('age') || 'under50', years: parseInt($('years').value, 10) || 0 };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.wage > 0;
    S.setText('out-total', S.fmtWon(has ? r.total : 0)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-daily', S.fmtWon(has ? r.daily : 0)); S.setText('out-days', r.days); S.setText('out-month', S.fmtWon(has ? r.monthly : 0));
    S.setText('out-d3', r.d3); S.setText('out-avg', S.fmtWon(won(r.avg))); S.setText('out-raw', S.fmtWon(r.raw)); S.setText('out-floor', S.fmtWon(r.floor));
    S.setText('out-max', S.fmtWon(DAILY_MAX)); S.setText('out-kind', has ? r.kind : '—'); S.setText('out-days2', r.days);
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '퇴직 전 월 임금을 입력하면 바로 계산됩니다.' :
      '1일 평균임금 ' + S.fmtWon(won(r.avg)) + '원의 60%는 ' + S.fmtWon(r.raw) + '원이라 ' + (r.kind === '상한액' ? '상한 ' + S.fmtWon(DAILY_MAX) + '원' : r.kind === '하한액' ? '하한 ' + S.fmtWon(r.floor) + '원' : '그 금액') +
      '을 하루치로 ' + r.days + '일 동안 받습니다. 비자발적 퇴사이고 퇴직 전 18개월 동안 고용보험 가입일수가 180일 이상이어야 하며, 실업 인정을 받은 날만큼 나옵니다. 참고용 추정입니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'unemployment-benefit',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('wage').value = ''; $('leave').value = ''; return; }
        var p = { w250: [2500000, 'under50', 1], w300: [3000000, 'under50', 2], w400: [4000000, 'over50', 4] }[name]; if (!p) return;
        S.setMoney('wage', p[0]); $('hours').value = '8'; $('leave').value = '';
        document.querySelector('input[name="age"][value="' + p[1] + '"]').checked = true; $('years').value = String(p[2]);
      },
      share: function () { return { title: '실업급여 계산 결과', text: '[실업급여 추정] 월 임금 ' + S.fmtKorean(last.i.wage) + '\n하루 ' + S.fmtWon(last.r.daily) + '원 × ' + last.r.days + '일 = ' + S.fmtWon(last.r.total) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'unemployment-benefit-result', title: '실업급여 계산기', kicker: '월 임금 ' + S.fmtKorean(last.i.wage) + ' · 총 예상 수급액', big: S.fmtWon(r.total), unit: '원',
          rows: [['1일 평균임금', S.fmtWon(won(r.avg)) + '원'], ['1일 구직급여 (' + r.kind + ')', S.fmtWon(r.daily) + '원'], ['받는 기간', r.days + '일'], ['30일 기준', S.fmtWon(r.monthly) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 금액은 고용센터 결정에 따릅니다.' };
      }
    });
  });
})();
