/* 연말정산 환급액 계산기 — 소득공제·세액공제를 넣어 결정세액을 구하고 기납부세액과 비교 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (2026년 귀속, 2027년 초 연말정산. 개정 시 이 블록만 수정) ----
  // 2026년 8월 세제개편안(월세 한도 1,200만원 등)은 국회 통과 전이고 2027년 귀속부터라 반영하지 않음
  var RULES_DATE = '2026년 귀속(2027년 1~2월 연말정산) 기준 (2026-10 확인)';
  // 4대보험(근로자 부담) — js/salary.js와 같은 값
  var PENSION_RATE = 4.75, PENSION_BASE_MIN = 410000, PENSION_BASE_MAX = 6590000, HEALTH_RATE = 3.595, LTC_RATE = 13.14, EMPLOY_RATE = 0.9;
  var BRACKETS = [[14000000, 6, 0], [50000000, 15, 1260000], [88000000, 24, 5760000], [150000000, 35, 15440000], [300000000, 38, 19940000], [500000000, 40, 25940000], [1000000000, 42, 35940000], [Infinity, 45, 65940000]];
  var EARNED_DEDUCTION = [[5000000, 70, 0], [15000000, 40, 3500000], [45000000, 15, 7500000], [100000000, 5, 12000000], [Infinity, 2, 14750000]], EARNED_DEDUCTION_CAP = 20000000;
  var PERSONAL = 1500000;                               // 기본공제 1인당
  function earnedCreditCap(g) {                         // 근로소득세액공제 한도 (소득세법 제59조)
    if (g <= 33000000) return 740000;
    if (g <= 70000000) return Math.max(660000, 740000 - (g - 33000000) * 8 / 1000);
    if (g <= 120000000) return Math.max(500000, 660000 - (g - 70000000) / 2);
    return Math.max(200000, 500000 - (g - 120000000) / 2);
  }
  var CHILD_CREDIT = [0, 250000, 550000], CHILD_CREDIT_EXTRA = 400000;   // 8세 이상 자녀: 1명 25만, 2명 55만, 3명째부터 40만씩
  var STANDARD_CREDIT = 130000;                         // 표준세액공제 (보험·의료·교육·기부·월세·주택자금을 안 받을 때)
  var MARRIAGE_CREDIT = 500000;                         // 혼인세액공제 (2024~2026년 혼인신고, 1회)
  // 신용카드 등: 총급여 25% 초과분. 공제율 신용 15%, 체크·현금 30%, 전통시장·대중교통 40%
  var CARD_MIN = 25, CARD_RATE = { credit: 15, debit: 30, market: 40 };
  var CARD_LIMIT = { low: 3000000, high: 2500000 }, CARD_CHILD = { low: 500000, high: 250000 }, CARD_CHILD_MAX = 2;   // 기본한도 + 자녀 1인당(최대 2명) — 2026년 사용분부터
  var CARD_EXTRA = { low: 3000000, high: 2000000 }, CARD_SALARY_LINE = 70000000;
  var SUBSCRIPTION_RATE = 40, SUBSCRIPTION_CAP = 3000000, SUBSCRIPTION_SALARY = 70000000;   // 주택청약종합저축: 납입 300만까지 40% (총급여 7천만 이하 무주택 세대주)
  var LEASE_RATE = 40, HOUSING_CAP = 4000000;           // 전세대출 원리금 40%, 청약과 합쳐 400만
  var INSURANCE_RATE = 12, INSURANCE_CAP = 1000000;
  var MEDICAL_RATE = 15, MEDICAL_MIN = 3, MEDICAL_OTHER_CAP = 7000000;
  var EDU_RATE = 15, DONATION_RATE = 15, DONATION_HIGH = 30, DONATION_LINE = 10000000;
  var RENT_SALARY = 80000000, RENT_HIGH_LINE = 55000000, RENT_HIGH = 17, RENT_LOW = 15, RENT_CAP = 10000000;
  var PENSION_SAVING_CAP = 6000000, PENSION_TOTAL_CAP = 9000000, PENSION_LINE = 55000000, PENSION_HIGH = 15, PENSION_LOW = 12;
  var LOCAL_RATE = 10;

  function won(n) { return Math.floor(n + 1e-6); }
  function floor10(n) { return Math.floor(n / 10 + 1e-6) * 10; }
  function trunc10(n) { return n < 0 ? -floor10(-n) : floor10(n); }
  function progressive(base) { if (base <= 0) return 0; for (var k = 0; k < BRACKETS.length; k++) if (base <= BRACKETS[k][0]) return base * BRACKETS[k][1] / 100 - BRACKETS[k][2]; }
  function earnedDeduction(g) { var prev = 0; for (var k = 0; k < EARNED_DEDUCTION.length; k++) { var r = EARNED_DEDUCTION[k]; if (g <= r[0]) return Math.min(EARNED_DEDUCTION_CAP, r[2] + (g - prev) * r[1] / 100); prev = r[0]; } }
  function insurance(g) {   // 1년 4대보험 (월 단위 10원 미만 버림 × 12)
    var m = g / 12;
    var pension = m > 0 ? Math.floor(Math.min(PENSION_BASE_MAX, Math.max(PENSION_BASE_MIN, m)) * PENSION_RATE / 1000) * 10 : 0;
    var health = Math.floor(m * HEALTH_RATE / 1000) * 10, ltc = Math.floor(health * LTC_RATE / 1000) * 10, employ = Math.floor(m * EMPLOY_RATE / 1000) * 10;
    return { pension: pension * 12, health: (health + ltc) * 12, employ: employ * 12 };
  }
  function cardDeduction(i) {
    var rem = i.salary * CARD_MIN / 100, parts = {};
    ['credit', 'debit', 'market'].forEach(function (k) { parts[k] = Math.max(0, i[k] - rem); rem = Math.max(0, rem - i[k]); });
    var ded = parts.credit * CARD_RATE.credit / 100 + parts.debit * CARD_RATE.debit / 100 + parts.market * CARD_RATE.market / 100;
    var low = i.salary <= CARD_SALARY_LINE;
    var limit = (low ? CARD_LIMIT.low : CARD_LIMIT.high) + (low ? CARD_CHILD.low : CARD_CHILD.high) * Math.min(CARD_CHILD_MAX, i.kids);
    var basic = Math.min(ded, limit);
    var extra = Math.min(Math.max(0, ded - limit), parts.market * CARD_RATE.market / 100, low ? CARD_EXTRA.low : CARD_EXTRA.high);
    return won(basic + extra);
  }
  function childCredit(n) { return n <= 0 ? 0 : n <= 2 ? CHILD_CREDIT[n] : CHILD_CREDIT[2] + (n - 2) * CHILD_CREDIT_EXTRA; }
  function medicalCredit(i) {
    var th = i.salary * MEDICAL_MIN / 100;
    var other = Math.min(MEDICAL_OTHER_CAP, Math.max(0, i.medOther - th));
    var special = Math.max(0, i.medSelf - Math.max(0, th - i.medOther));
    return won((other + special) * MEDICAL_RATE / 100);
  }
  // 기본 공제만 넣은 세금 — 기납부세액을 비웠을 때 회사가 1년 동안 뗀 세금 추정으로 쓴다
  function base(i) {
    var g = i.salary, ins = insurance(g), earned = g - earnedDeduction(g);
    return { ins: ins, earned: earned, deductCommon: PERSONAL * Math.max(1, i.family) + ins.pension + ins.health + ins.employ };
  }
  function decide(i, itemized) {
    var b = base(i), g = i.salary;
    var sub = g <= SUBSCRIPTION_SALARY ? Math.min(i.subscription, SUBSCRIPTION_CAP) * SUBSCRIPTION_RATE / 100 : 0;
    var lease = itemized ? i.lease * LEASE_RATE / 100 : 0;
    var housing = won(Math.min(HOUSING_CAP, sub + lease));
    var card = cardDeduction(i);
    var taxBase = Math.max(0, b.earned - b.deductCommon - housing - card);
    var computed = won(progressive(taxBase));
    var earnedCredit = won(Math.min(earnedCreditCap(g), computed <= 1300000 ? computed * 0.55 : 715000 + (computed - 1300000) * 0.3));
    var pensionBase = Math.min(PENSION_TOTAL_CAP, Math.min(i.saving, PENSION_SAVING_CAP) + i.irp);
    var c = { earned: earnedCredit, child: childCredit(i.kids8), pension: won(pensionBase * (g <= PENSION_LINE ? PENSION_HIGH : PENSION_LOW) / 100), marriage: i.marriage ? MARRIAGE_CREDIT : 0,
      insurance: 0, medical: 0, edu: 0, donation: 0, rent: 0, standard: 0 };
    if (itemized) {
      c.insurance = won(Math.min(i.insurance, INSURANCE_CAP) * INSURANCE_RATE / 100);
      c.medical = medicalCredit(i);
      c.edu = won(i.edu * EDU_RATE / 100);
      c.donation = won(Math.min(i.donation, DONATION_LINE) * DONATION_RATE / 100 + Math.max(0, i.donation - DONATION_LINE) * DONATION_HIGH / 100);
      c.rent = g <= RENT_SALARY ? won(Math.min(i.rent, RENT_CAP) * (g <= RENT_HIGH_LINE ? RENT_HIGH : RENT_LOW) / 100) : 0;
    } else c.standard = STANDARD_CREDIT;
    var credits = 0; for (var k in c) credits += c[k];
    var tax = Math.max(0, computed - credits);
    return { b: b, housing: housing, card: card, taxBase: taxBase, computed: computed, c: c, credits: Math.min(credits, computed), tax: tax };
  }
  function calc(i) {
    var a = decide(i, false), b = decide(i, true), r = b.tax <= a.tax ? b : a;
    r.itemized = r === b;
    var est = decide({ salary: i.salary, family: i.family, kids: 0, kids8: i.kids8, credit: 0, debit: 0, market: 0, subscription: 0, lease: 0, saving: 0, irp: 0, marriage: false }, false).tax;
    r.estimated = !(i.withheld > 0);
    r.withheld = r.estimated ? est : i.withheld;
    r.local = floor10(r.tax * LOCAL_RATE / 100);
    r.diff = trunc10(r.withheld - r.tax);               // + 돌려받음, − 더 냄 (10원 미만 버림)
    r.diffLocal = trunc10(r.diff * LOCAL_RATE / 100);
    r.total = r.diff + r.diffLocal;
    return r;
  }
  function m(id) { return S.parseMoney($(id).value); }
  function readInput() {
    return { salary: m('salary'), family: Math.max(1, Math.floor(S.parseNonNegative($('family').value)) || 1), kids: Math.floor(S.parseNonNegative($('kids').value)) || 0,
      kids8: Math.floor(S.parseNonNegative($('kids8').value)) || 0, withheld: m('withheld'), credit: m('credit'), debit: m('debit'), market: m('market'),
      subscription: m('subscription'), lease: m('lease'), insurance: m('insurance'), medSelf: m('medSelf'), medOther: m('medOther'), edu: m('edu'), donation: m('donation'),
      rent: m('rent'), saving: m('saving'), irp: m('irp'), marriage: $('marriage').checked };
  }
  var last = null;
  function openFilled() {   // 예시 버튼·공유 링크로 값이 들어간 묶음은 펼쳐서 보이게
    S.$$('#calc-form details').forEach(function (d) { if (S.$$('input', d).some(function (x) { return S.parseMoney(x.value) > 0; })) d.open = true; });
  }
  function render(i) {
    openFilled();
    var r = calc(i), has = i.salary > 0, refund = r.total >= 0;
    S.setText('out-kicker', !has ? '예상 환급액' : refund ? '예상 환급액 (돌려받는 돈)' : '예상 추가 납부액 (더 내는 돈)');
    S.setText('out-total', S.fmtWon(has ? Math.abs(r.total) : 0));
    S.setText('sticky-monthly', !has ? '—' : (refund ? '환급 ' : '추가 납부 ') + S.fmtWon(Math.abs(r.total)) + '원');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-withheld', S.fmtWon(has ? r.withheld : 0)); S.setText('out-local', S.fmtWon(r.local));
    var set = function (id, v) { S.setText(id, S.fmtWon(v)); };
    set('out-earned', r.b.earned); set('out-personal', PERSONAL * i.family); set('out-pension-ins', r.b.ins.pension); set('out-health-ins', r.b.ins.health + r.b.ins.employ);
    set('out-housing', r.housing); set('out-card', r.card); set('out-base', r.taxBase); set('out-computed', r.computed);
    set('out-c-earned', r.c.earned); set('out-c-child', r.c.child); set('out-c-pension', r.c.pension); set('out-c-insurance', r.c.insurance); set('out-c-medical', r.c.medical);
    set('out-c-edu', r.c.edu); set('out-c-donation', r.c.donation); set('out-c-rent', r.c.rent); set('out-c-marriage', r.c.marriage); set('out-c-standard', r.c.standard);
    set('out-tax2', r.tax); set('out-withheld2', has ? r.withheld : 0);
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '총급여를 입력하면 바로 계산됩니다. 공제 항목은 아는 것만 넣으세요.' :
      '결정세액 ' + S.fmtKorean(r.tax) + '에서 ' + (r.estimated ? '회사가 뗐을 것으로 추정한 ' : '이미 낸 ') + S.fmtKorean(r.withheld) + '을 비교했습니다(지방소득세 10% 포함). ' +
      (r.itemized ? '보험·의료·교육·기부·월세 공제를 받는 쪽이 세금이 적어 그쪽으로 계산했습니다. ' : '표준세액공제 13만원이 항목별 공제보다 커서 표준세액공제로 계산했습니다. ') +
      (r.estimated ? '기납부세액은 급여명세서나 원천징수영수증의 금액을 넣으면 더 정확합니다. ' : '') + '참고용 추정입니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('family').value = '1'; $('kids').value = '0'; $('kids8').value = '0';
    S.wireCalc({
      key: 'year-end-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        var all = ['salary', 'withheld', 'credit', 'debit', 'market', 'subscription', 'lease', 'insurance', 'medSelf', 'medOther', 'edu', 'donation', 'rent', 'saving', 'irp'];
        all.forEach(function (k) { $(k).value = ''; }); $('marriage').checked = false; $('family').value = '1'; $('kids').value = '0'; $('kids8').value = '0';
        if (name === 'clear') return;
        var p = { single: { salary: 40000000, credit: 15000000, debit: 5000000, rent: 7200000 }, family: { salary: 60000000, credit: 20000000, debit: 5000000, insurance: 1000000, medOther: 3000000, edu: 3000000, saving: 6000000 },
                  high: { salary: 80000000, credit: 25000000, saving: 6000000, irp: 3000000 } }[name]; if (!p) return;
        Object.keys(p).forEach(function (k) { S.setMoney(k, p[k]); });
        if (name === 'family') { $('family').value = '4'; $('kids').value = '2'; $('kids8').value = '2'; }
      },
      share: function () { var r = last.r; return { title: '연말정산 환급액 계산 결과', text: '[연말정산 추정] 총급여 ' + S.fmtKorean(last.i.salary) + '\n' + (r.total >= 0 ? '환급 ' : '추가 납부 ') + S.fmtWon(Math.abs(r.total)) + '원 (결정세액 ' + S.fmtWon(r.tax) + '원, 참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'year-end-tax-result', title: '연말정산 환급액 계산기', kicker: '총급여 ' + S.fmtKorean(last.i.salary) + ' · ' + (r.total >= 0 ? '예상 환급액' : '예상 추가 납부액'), big: S.fmtWon(Math.abs(r.total)), unit: '원',
          rows: [['과세표준', S.fmtWon(r.taxBase) + '원'], ['산출세액', S.fmtWon(r.computed) + '원'], ['세액공제 합계', '−' + S.fmtWon(r.credits) + '원'], ['결정세액', S.fmtWon(r.tax) + '원'], ['기납부세액' + (r.estimated ? ' (추정)' : ''), S.fmtWon(r.withheld) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 환급액은 회사 연말정산 결과에 따릅니다.' };
      }
    });
  });
})();
