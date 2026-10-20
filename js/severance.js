/* 퇴직금 계산기 — 평균임금 기준 법정 퇴직금과 예상 퇴직소득세
   공제표·세율 등 바뀌는 값은 아래 상수에만 있다. */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 기준 근로자퇴직급여보장법·소득세법';
  var MIN_DAYS = 365;                     // 1년 미만 근무는 법정 퇴직금 없음
  var SERVICE_DEDUCTION = [[5, 1000000, 0, 0], [10, 2000000, 5000000, 5], [20, 2500000, 15000000, 10], [Infinity, 3000000, 40000000, 20]]; // 근속연수공제 [상한, 연당, 기본, 기본연수]
  var CONVERTED_DEDUCTION = [[8000000, 100, 0, 0], [70000000, 60, 8000000, 8000000], [100000000, 55, 45200000, 70000000], [300000000, 45, 61700000, 100000000], [Infinity, 35, 151700000, 300000000]]; // 환산급여공제
  var BRACKETS = [[14000000, 6, 0], [50000000, 15, 1260000], [88000000, 24, 5760000], [150000000, 35, 15440000], [300000000, 38, 19940000], [500000000, 40, 25940000], [1000000000, 42, 35940000], [Infinity, 45, 65940000]];
  var LOCAL_TAX_RATE = 10;

  function progressive(base) { if (base <= 0) return 0; for (var i = 0; i < BRACKETS.length; i++) if (base <= BRACKETS[i][0]) return base * BRACKETS[i][1] / 100 - BRACKETS[i][2]; }
  function serviceDeduction(n) { for (var i = 0; i < SERVICE_DEDUCTION.length; i++) { var r = SERVICE_DEDUCTION[i]; if (n <= r[0]) return r[2] + (n - r[3]) * r[1]; } }
  function convertedDeduction(x) { for (var i = 0; i < CONVERTED_DEDUCTION.length; i++) { var r = CONVERTED_DEDUCTION[i]; if (x <= r[0]) return r[2] + (x - r[3]) * r[1] / 100; } }
  // 근속연수: 달력으로 꽉 찬 해를 세고, 1년 미만 끝수가 있으면 1년을 더한다(소득세법).
  // 일수 ÷ 365를 올림하면 윤일 때문에 정확히 10년 근무(퇴직일 = 입사 기념일)가 11년이 된다.
  function serviceYears(join, leave) {
    if (!join || !leave || leave <= join) return 1;
    var y = leave.getFullYear() - join.getFullYear();
    if (S.addMonths(join, 12 * y) > leave) y--;
    if (S.addMonths(join, 12 * y) < leave) y++;
    return Math.max(1, y);
  }

  function readInput() {
    return { join: S.parseDate($('join').value), leave: S.parseDate($('leave').value), monthly: S.parseMoney($('monthly').value), bonus: S.parseMoney($('bonus').value), leavePay: S.parseMoney($('leavePay').value), ordinary: S.parseMoney($('ordinary').value) };
  }
  var last = null;

  function render(i) {
    var days = i.join && i.leave ? S.daysBetween(i.join, i.leave) : 0;
    var period3 = i.leave ? S.daysBetween(S.addMonths(i.leave, -3), i.leave) : 91; // 퇴직 전 3개월 일수
    var wages3 = i.monthly * 3 + i.bonus * 3 / 12 + i.leavePay * 3 / 12;
    var avgDaily = period3 > 0 ? wages3 / period3 : 0;
    var ordDaily = i.ordinary > 0 ? i.ordinary / 30 : 0; // 통상임금 일급 (월 209시간 기준 대신 30일로 단순화)
    var usedDaily = Math.max(avgDaily, ordDaily), usedOrdinary = ordDaily > avgDaily;
    var eligible = days >= MIN_DAYS;
    var severance = eligible ? usedDaily * 30 * days / 365 : 0;
    // 퇴직소득세
    var years = serviceYears(i.join, i.leave);
    var sd = Math.min(severance, serviceDeduction(years));
    var converted = years > 0 ? (severance - sd) * 12 / years : 0;
    var cd = Math.min(converted, convertedDeduction(converted));
    var taxBase = Math.max(0, converted - cd);
    var tax = eligible ? progressive(taxBase) * years / 12 : 0;
    var local = tax * LOCAL_TAX_RATE / 100;
    var net = severance - tax - local;

    S.setText('out-sev', S.fmtWon(severance)); S.setText('sticky-monthly', S.fmtWon(severance) + '원');
    S.setText('out-days', days > 0 ? S.fmtNum(days) + '일' : '—'); S.setText('out-years', days > 0 ? (days / 365).toFixed(2) + '년' : '—');
    S.setText('out-avg', S.fmtWon(usedDaily)); S.setText('out-avg-kind', usedOrdinary ? '통상임금 (평균임금보다 높아 적용)' : '평균임금');
    S.setText('out-wages3', S.fmtWon(wages3)); S.setText('out-period3', period3 + '일');
    S.setText('out-tax', S.fmtWon(tax)); S.setText('out-local', S.fmtWon(local)); S.setText('out-net', S.fmtWon(net));
    S.setText('out-sd', S.fmtWon(sd)); S.setText('out-converted', S.fmtWon(converted)); S.setText('out-cd', S.fmtWon(cd)); S.setText('out-taxbase', S.fmtWon(taxBase)); S.setText('out-service-years', years + '년');
    S.setText('out-note', !i.join || !i.leave ? '입사일과 퇴직일, 월 임금을 입력하세요.' : (!eligible ? '재직일수가 1년 미만이라 법정 퇴직금 대상이 아닙니다. 회사 규정에 따라 지급될 수는 있습니다.' : '퇴직금 = 1일 평균임금 × 30일 × 재직일수 ÷ 365. 최근 3개월 실제 임금이 월 임금과 다르면 그 금액으로 넣으세요. 퇴직소득세는 퇴직연금(IRP)으로 받으면 이연됩니다.'));
    S.setText('rules-date', RULES_DATE);
    last = { i: i, days: days, severance: severance, avg: usedDaily, tax: tax, local: local, net: net, years: years };
  }

  S.ready(function () {
    $('leave').value = S.fmtDate(S.today());
    S.wireCalc({
      key: 'severance',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('join').value = ''; ['monthly', 'bonus', 'leavePay', 'ordinary'].forEach(function (k) { S.setMoney(k, 0); }); return; }
        var y = { y3: 3, y10: 10 }[name] || 5;
        $('join').value = S.fmtDate(S.addMonths(S.today(), -12 * y)); S.setMoney('monthly', 3500000); S.setMoney('bonus', 3000000); S.setMoney('leavePay', 500000);
      },
      share: function () { return { title: '퇴직금 계산 결과', text: '[퇴직금] 재직 ' + S.fmtNum(last.days) + '일 · 1일 평균임금 ' + S.fmtWon(last.avg) + '원 → 퇴직금 ' + S.fmtWon(last.severance) + '원 (세후 약 ' + S.fmtWon(last.net) + '원)' }; },
      card: function () {
        return { file: 'severance-result', title: '퇴직금 계산기', kicker: '예상 법정 퇴직금 (세전)', big: S.fmtWon(last.severance), unit: '원',
          rows: [['재직일수', S.fmtNum(last.days) + '일 (' + last.years + '년)'], ['1일 평균임금', S.fmtWon(last.avg) + '원'], ['예상 퇴직소득세 + 지방소득세', S.fmtWon(last.tax + last.local) + '원'], ['세후 예상 수령액', S.fmtWon(last.net) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 회사 규정·DC형 퇴직연금이면 다릅니다.' };
      }
    });
  });
})();
