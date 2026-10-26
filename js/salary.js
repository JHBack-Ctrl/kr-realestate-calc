/* 연봉 실수령액 계산기 — 4대보험·소득세·지방소득세를 빼고 월 실수령액 추정
   요율·공제 등 바뀌는 값은 아래 상수에만 있다. 매년 초 확인. */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 기준 (국민연금 9.5%, 기준소득월액 상·하한은 2026.7~2027.6 적용분)';
  var PENSION_RATE = 4.75;                      // 국민연금 근로자 부담 % (2026년 보험료율 9.5%의 절반. 2033년 13%까지 매년 0.5%p씩 오름)
  var PENSION_BASE_MIN = 410000, PENSION_BASE_MAX = 6590000; // 기준소득월액 하한·상한 (2026.7~2027.6. 매년 7월 바뀜)
  var HEALTH_RATE = 3.595;                      // 건강보험 근로자 부담 % (2026년 요율 7.19%의 절반)
  var LTC_RATE = 13.14;                         // 장기요양보험: 건강보험료의 % (2026년, 소득 대비 0.9448%)
  var EMPLOY_RATE = 0.9;                        // 고용보험 근로자 부담 %
  var MEAL_EXEMPT_DEFAULT = 200000;             // 비과세 식대 월 한도
  var BRACKETS = [[14000000, 6, 0], [50000000, 15, 1260000], [88000000, 24, 5760000], [150000000, 35, 15440000], [300000000, 38, 19940000], [500000000, 40, 25940000], [1000000000, 42, 35940000], [Infinity, 45, 65940000]];
  var EARNED_DEDUCTION = [[5000000, 70, 0], [15000000, 40, 3500000], [45000000, 15, 7500000], [100000000, 5, 12000000], [Infinity, 2, 14750000]]; // 근로소득공제 [상한, 율, 기본액]
  var EARNED_DEDUCTION_CAP = 20000000;
  var PERSONAL_DEDUCTION = 1500000;             // 인적공제 1인당
  var EARNED_CREDIT = { low: 1300000, lowRate: 55, highRate: 30, highBase: 715000 }; // 근로소득세액공제
  var EARNED_CREDIT_CAP = function (gross) {    // 세액공제 한도
    if (gross <= 33000000) return 740000;
    if (gross <= 70000000) return Math.max(660000, 740000 - (gross - 33000000) * 0.008);
    if (gross <= 120000000) return Math.max(500000, 660000 - (gross - 70000000) / 2);   // 법 조문이 '× 1/2'. 0.005로 잘못 넣어 7천만 초과 세금이 적게 나오던 것(2026-10 수정)
    return Math.max(200000, 500000 - (gross - 120000000) / 2);
  };
  var CHILD_CREDIT = [0, 250000, 550000];       // 자녀세액공제 1명, 2명
  var CHILD_CREDIT_EXTRA = 400000;              // 3명째부터 1인당
  var STANDARD_CREDIT = 130000;                 // 표준세액공제
  var LOCAL_TAX_RATE = 10;                      // 지방소득세 (소득세의 %)
  var TABLE_ROWS = [24000000, 30000000, 36000000, 40000000, 45000000, 50000000, 60000000, 70000000, 80000000, 90000000, 100000000, 120000000, 150000000, 200000000];

  function progressive(base) { if (base <= 0) return 0; for (var i = 0; i < BRACKETS.length; i++) if (base <= BRACKETS[i][0]) return base * BRACKETS[i][1] / 100 - BRACKETS[i][2]; }
  function earnedDeduction(gross) {
    var prev = 0;
    for (var i = 0; i < EARNED_DEDUCTION.length; i++) { var r = EARNED_DEDUCTION[i]; if (gross <= r[0]) return Math.min(EARNED_DEDUCTION_CAP, r[2] + (gross - prev) * r[1] / 100); prev = r[0]; }
  }

  // 연 단위 계산 → 월로 나눔. 간이세액표(원천징수)와는 차이가 있을 수 있음
  function calc(salary, exempt, family, children, includeSeverance) {
    var annualPay = includeSeverance ? salary * 12 / 13 : salary;  // 퇴직금 포함 연봉이면 13분의 1은 퇴직금
    var gross = Math.max(0, annualPay - exempt * 12);              // 과세 급여
    var monthlyTaxable = gross / 12;
    // 하한은 소득이 있을 때만. 연봉을 비워 둔 상태에서 하한 보험료가 빠져 실수령액이 음수로 보이던 것(2026-10 수정)
    var pensionBase = monthlyTaxable > 0 ? Math.min(PENSION_BASE_MAX, Math.max(PENSION_BASE_MIN, monthlyTaxable)) : 0;
    var pension = Math.floor(pensionBase * PENSION_RATE / 100 / 10) * 10;
    var health = Math.floor(monthlyTaxable * HEALTH_RATE / 100 / 10) * 10;
    var ltc = Math.floor(health * LTC_RATE / 100 / 10) * 10;
    var employ = Math.floor(monthlyTaxable * EMPLOY_RATE / 100 / 10) * 10;
    var insuranceYear = (pension + health + ltc + employ) * 12;
    var earnedIncome = gross - earnedDeduction(gross);
    var taxBase = Math.max(0, earnedIncome - PERSONAL_DEDUCTION * Math.max(1, family) - pension * 12 - (health + ltc + employ) * 12);
    var computed = progressive(taxBase);
    var earnedCredit = Math.min(EARNED_CREDIT_CAP(gross), computed <= EARNED_CREDIT.low ? computed * EARNED_CREDIT.lowRate / 100 : EARNED_CREDIT.highBase + (computed - EARNED_CREDIT.low) * EARNED_CREDIT.highRate / 100);
    var childCredit = children <= 0 ? 0 : (children <= 2 ? CHILD_CREDIT[children] : CHILD_CREDIT[2] + (children - 2) * CHILD_CREDIT_EXTRA);
    var incomeTax = Math.max(0, computed - earnedCredit - childCredit - STANDARD_CREDIT);
    var localTax = incomeTax * LOCAL_TAX_RATE / 100;
    var taxMonth = Math.floor(incomeTax / 12 / 10) * 10, localMonth = Math.floor(localTax / 12 / 10) * 10;
    var deductMonth = pension + health + ltc + employ + taxMonth + localMonth;
    var netMonth = annualPay / 12 - deductMonth;
    return { annualPay: annualPay, gross: gross, pension: pension, health: health, ltc: ltc, employ: employ, taxMonth: taxMonth, localMonth: localMonth, deductMonth: deductMonth, netMonth: netMonth,
      netYear: netMonth * 12, taxBase: taxBase, computed: computed, earnedCredit: earnedCredit, childCredit: childCredit, incomeTax: incomeTax, insuranceYear: insuranceYear };
  }

  function readInput() {
    return { salary: S.parseMoney($('salary').value), exempt: S.parseMoney($('exempt').value), family: Math.floor(S.parseNonNegative($('family').value)) || 1,
      children: Math.floor(S.parseNonNegative($('children').value)) || 0, includeSeverance: $('includeSeverance').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i.salary, i.exempt, i.family, i.children, i.includeSeverance);
    S.setText('out-net', S.fmtWon(r.netMonth)); S.setText('sticky-monthly', S.fmtWon(r.netMonth) + '원');
    S.setText('out-net-year', S.fmtWon(r.netYear)); S.setText('out-deduct', S.fmtWon(r.deductMonth)); S.setText('out-ratio', i.salary > 0 ? S.fmtPct(r.netYear / r.annualPay * 100) : '0.00');
    S.setText('out-gross-month', S.fmtWon(r.annualPay / 12));
    [['pension', r.pension], ['health', r.health], ['ltc', r.ltc], ['employ', r.employ], ['tax', r.taxMonth], ['local', r.localMonth]].forEach(function (x) { S.setText('out-' + x[0], S.fmtWon(x[1])); S.setText('out-' + x[0] + '-y', S.fmtWon(x[1] * 12)); });
    S.setText('out-taxbase', S.fmtWon(r.taxBase)); S.setText('out-computed', S.fmtWon(r.computed)); S.setText('out-credit', S.fmtWon(r.earnedCredit + r.childCredit + STANDARD_CREDIT)); S.setText('out-income-tax', S.fmtWon(r.incomeTax));
    S.setText('out-note', i.salary > 0 ? '연 단위로 계산한 결정세액을 12로 나눈 값입니다. 회사가 매달 떼는 간이세액표 원천징수액과는 다를 수 있고 차이는 연말정산에서 정산됩니다.' : '연봉을 입력하세요.');
    S.setText('rules-date', RULES_DATE);
    // 연봉별 표 (부양가족·비과세는 입력값 기준)
    var tb = $('table-body'); if (tb) {
      tb.innerHTML = '';
      TABLE_ROWS.forEach(function (s) {
        var x = calc(s, i.exempt, i.family, i.children, i.includeSeverance), tr = document.createElement('tr');
        if (Math.abs(s - i.salary) < 1) tr.className = 'total';
        tr.innerHTML = '<th scope="row">' + S.fmtKorean(s) + '</th><td>' + S.fmtWon(x.netMonth) + '원</td><td>' + S.fmtWon(x.deductMonth) + '원</td><td>' + S.fmtWon(x.netYear) + '원</td>';
        tb.appendChild(tr);
      });
    }
    last = { i: i, r: r };
  }

  S.ready(function () {
    S.setMoney('exempt', MEAL_EXEMPT_DEFAULT); $('family').value = 1; $('children').value = 0;
    S.wireCalc({
      key: 'salary',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { S.setMoney('salary', 0); return; }
        S.setMoney('salary', { s3000: 30000000, s5000: 50000000, s8000: 80000000, s1: 100000000 }[name] || 0);
      },
      share: function () { return { title: '연봉 실수령액', text: '[연봉 실수령액] 연봉 ' + S.fmtKorean(last.i.salary) + ' → 월 ' + S.fmtWon(last.r.netMonth) + '원 (공제 ' + S.fmtWon(last.r.deductMonth) + '원)' }; },
      card: function () {
        var r = last.r;
        return { file: 'salary-result', title: '연봉 실수령액 계산기', kicker: '연봉 ' + S.fmtKorean(last.i.salary) + ' · 월 실수령액', big: S.fmtWon(r.netMonth), unit: '원',
          rows: [['월 세전', S.fmtWon(r.annualPay / 12) + '원'], ['국민연금 · 건강 · 장기요양 · 고용', S.fmtWon(r.pension) + ' · ' + S.fmtWon(r.health) + ' · ' + S.fmtWon(r.ltc) + ' · ' + S.fmtWon(r.employ)], ['소득세 + 지방소득세', S.fmtWon(r.taxMonth + r.localMonth) + '원'], ['월 공제 합계', S.fmtWon(r.deductMonth) + '원'], ['연 실수령액', S.fmtWon(r.netYear) + '원']],
          note: RULES_DATE + '. 부양가족 ' + last.i.family + '명, 비과세 월 ' + S.fmtWon(last.i.exempt) + '원 기준. 원천징수액과 다를 수 있습니다.' };
      }
    });
  });
})();
