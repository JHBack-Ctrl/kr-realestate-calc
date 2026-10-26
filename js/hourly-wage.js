/* 시급·주휴수당 계산기 — 시급으로 주급·월급·연봉 환산, 최저임금 비교, 3.3% 공제 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (최저임금법·근로기준법. 매년 1월 최저임금 갱신) ----
  var RULES_DATE = '2026년 최저임금 기준 (2026-10 확인)';
  var MIN_WAGE = 10320, MIN_WAGE_YEAR = 2026;      // 올해 최저임금 (시간당)
  var NEXT_MIN_WAGE = 10700, NEXT_YEAR = 2027;     // 고시된 내년 최저임금. 1월에 위로 옮기고 비울 것
  var HOLIDAY_MIN_HOURS = 15;     // 주 15시간 이상이면 주휴수당
  var FULL_WEEK = 40;             // 주휴시간 = 주 소정근로시간 ÷ 40 × 8 (40시간 넘어도 8시간)
  var WEEKS_PER_MONTH = 365 / 7 / 12;   // 월 환산 주 수 (≈ 4.345). 주 40시간이면 209시간
  var OVERTIME = 1.5;             // 5인 이상 사업장 연장근로 가산
  var BIZ_TAX = 3, BIZ_LOCAL = 10;     // 3.3% = 소득세 3% + 지방소득세(소득세의 10%)

  function won(n) { return Math.floor(n + 1e-6); }
  function floor10(n) { return Math.floor(n / 10 + 1e-6) * 10; }
  function calc(i) {
    var week = i.daily * i.days;
    var regular = Math.min(week, FULL_WEEK), over = Math.max(0, week - FULL_WEEK);
    var holidayHours = i.holiday && week >= HOLIDAY_MIN_HOURS ? regular / FULL_WEEK * 8 : 0;
    var overMult = i.big ? OVERTIME : 1;
    var holidayPay = won(holidayHours * i.wage);
    var weekly = won((regular + over * overMult) * i.wage) + holidayPay;
    var monthHours = Math.round((regular + holidayHours) * WEEKS_PER_MONTH);       // 월 소정근로시간 + 주휴시간 (시간 단위 반올림)
    var overMonthHours = Math.round(over * WEEKS_PER_MONTH);
    var monthly = won(monthHours * i.wage + overMonthHours * overMult * i.wage);
    var incomeTax = i.biz ? floor10(monthly * BIZ_TAX / 100) : 0, local = floor10(incomeTax * BIZ_LOCAL / 100);
    return { week: week, over: over, holidayHours: holidayHours, holidayPay: holidayPay, weekly: weekly, monthHours: monthHours, overMonthHours: overMonthHours,
      monthly: monthly, yearly: monthly * 12, tax: incomeTax + local, net: monthly - incomeTax - local };
  }
  function readInput() {
    return { wage: S.parseMoney($('wage').value), daily: Math.min(24, S.parseNonNegative($('daily').value)), days: Math.min(7, Math.floor(S.parseNonNegative($('days').value))),
      holiday: $('holiday').checked, big: $('big').checked, biz: $('biz').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.wage > 0 && r.week > 0;
    S.setText('out-monthly', S.fmtWon(has ? r.monthly : 0)); S.setText('sticky-monthly', has ? S.fmtWon(r.monthly) + '원' : '—');
    S.setText('out-weekly', S.fmtWon(has ? r.weekly : 0)); S.setText('out-holiday', S.fmtWon(has ? r.holidayPay : 0)); S.setText('out-yearly', S.fmtWon(has ? r.yearly : 0));
    S.setText('out-week-hours', S.fmtNum(r.week, 1)); S.setText('out-holiday-hours', S.fmtNum(r.holidayHours, 1)); S.setText('out-month-hours', r.monthHours + (r.overMonthHours ? ' + 연장 ' + r.overMonthHours : ''));
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-net', S.fmtWon(has ? r.net : 0));
    S.setText('out-min', S.fmtWon(MIN_WAGE)); S.setText('out-next-min', S.fmtWon(NEXT_MIN_WAGE));
    S.setText('rules-date', RULES_DATE);
    var below = i.wage > 0 && i.wage < MIN_WAGE, belowNext = i.wage > 0 && !below && i.wage < NEXT_MIN_WAGE;
    S.setText('out-note', !has ? '시급과 근무시간을 입력하면 바로 계산됩니다.' :
      '주 ' + S.fmtNum(r.week, 1) + '시간 근무' + (r.holidayHours ? ', 주휴 ' + S.fmtNum(r.holidayHours, 1) + '시간' : (i.holiday ? ', 주 15시간 미만이라 주휴수당 없음' : '')) + '으로 월 ' + r.monthHours + '시간' +
      (r.overMonthHours ? '과 연장 ' + r.overMonthHours + '시간' : '') + '을 계산했습니다. ' +
      (below ? MIN_WAGE_YEAR + '년 최저임금 ' + S.fmtWon(MIN_WAGE) + '원보다 낮은 시급입니다. ' : '') +
      (belowNext ? NEXT_YEAR + '년 1월부터 최저임금은 ' + S.fmtWon(NEXT_MIN_WAGE) + '원입니다. ' : '') + '주휴수당은 그 주 소정근로일을 다 나왔을 때 받습니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('holiday').checked = true; $('big').checked = true;   // 기본: 주휴수당 포함, 5인 이상
    S.wireCalc({
      key: 'hourly-wage',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('wage').value = ''; return; }
        var p = { min40: [MIN_WAGE, 8, 5], min20: [MIN_WAGE, 5, 4], w12: [12000, 4, 3] }[name]; if (!p) return;
        S.setMoney('wage', p[0]); $('daily').value = String(p[1]); $('days').value = String(p[2]); $('holiday').checked = true; $('big').checked = true; $('biz').checked = false;
      },
      share: function () { return { title: '시급 월급 계산 결과', text: '[시급 ' + S.fmtWon(last.i.wage) + '원] 주 ' + S.fmtNum(last.r.week, 1) + '시간\n주급 ' + S.fmtWon(last.r.weekly) + '원 · 월급 ' + S.fmtWon(last.r.monthly) + '원 (주휴수당 포함)' }; },
      card: function () {
        var r = last.r;
        return { file: 'hourly-wage-result', title: '시급·주휴수당 계산기', kicker: '시급 ' + S.fmtWon(last.i.wage) + '원 · 주 ' + S.fmtNum(r.week, 1) + '시간 · 월급', big: S.fmtWon(r.monthly), unit: '원',
          rows: [['주휴수당 (주)', S.fmtWon(r.holidayPay) + '원'], ['주급', S.fmtWon(r.weekly) + '원'], ['월 환산 시간', r.monthHours + '시간'], ['연봉 환산', S.fmtWon(r.yearly) + '원']],
          note: RULES_DATE + '. 세전 금액입니다.' };
      }
    });
  });
})();
