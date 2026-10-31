/* 종합소득세 계산기 — 3.3%를 떼고 받은 사업소득(프리랜서·강사 등)의 5월 신고 환급액 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (2026년 귀속, 2027년 5월 신고. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 귀속(2027년 5월 신고) 기준 (2026-10 확인)';
  var BRACKETS = [[14000000, 6, 0], [50000000, 15, 1260000], [88000000, 24, 5760000], [150000000, 35, 15440000], [300000000, 38, 19940000], [500000000, 40, 25940000], [1000000000, 42, 35940000], [Infinity, 45, 65940000]];
  var PERSONAL = 1500000;                               // 기본공제 1인당
  var STANDARD_CREDIT = 70000;                          // 표준세액공제 (근로소득이 없는 종합소득자)
  var CHILD_CREDIT = [0, 250000, 550000], CHILD_CREDIT_EXTRA = 400000;   // 8세 이상 자녀: 1명 25만, 2명 55만, 3명째부터 40만씩 (js/year-end-tax.js와 같은 값)
  var PENSION_SAVING_CAP = 6000000, PENSION_TOTAL_CAP = 9000000, PENSION_LINE = 45000000, PENSION_HIGH = 15, PENSION_LOW = 12;   // 종합소득금액 4,500만원 이하 15%
  var WITHHOLD_RATE = 3, LOCAL_RATE = 10;               // 사업소득 원천징수 3% + 지방소득세 0.3%
  // 단순경비율: 업종코드마다 국세청이 해마다 3월에 고시. 기본값은 940909(기타자영업) 2024년 귀속 고시값.
  // 수입금액 4,000만원 초과분은 초과율을 쓴다. 직전 해 수입 3,600만원 미만(인적용역), 신규는 그해 7,500만원 미만일 때 쓸 수 있다
  var SIMPLE_RATE_DEFAULT = 64.1, SIMPLE_OVER_DEFAULT = 49.7, SIMPLE_OVER_LINE = 40000000, SIMPLE_NEW_CAP = 75000000;

  function won(n) { return Math.floor(n + 1e-6); }
  function floor10(n) { return Math.floor(n / 10 + 1e-6) * 10; }
  function trunc10(n) { return n < 0 ? -floor10(-n) : floor10(n); }
  function progressive(base) { if (base <= 0) return 0; for (var k = 0; k < BRACKETS.length; k++) if (base <= BRACKETS[k][0]) return base * BRACKETS[k][1] / 100 - BRACKETS[k][2]; }
  function childCredit(n) { return n <= 0 ? 0 : n <= 2 ? CHILD_CREDIT[n] : CHILD_CREDIT[2] + (n - 2) * CHILD_CREDIT_EXTRA; }
  function calc(i) {
    var expense = i.method === 'simple'
      ? won(Math.min(i.revenue, SIMPLE_OVER_LINE) * i.rateBase / 100 + Math.max(0, i.revenue - SIMPLE_OVER_LINE) * i.rateOver / 100)
      : Math.min(i.revenue, i.expense);
    var income = Math.max(0, i.revenue - expense);                       // 사업소득금액 (= 종합소득금액)
    var personal = PERSONAL * i.family;
    var taxBase = Math.max(0, income - personal - i.pension);
    var computed = won(progressive(taxBase));
    var pensionBase = Math.min(PENSION_TOTAL_CAP, Math.min(i.saving, PENSION_SAVING_CAP) + i.irp);
    var c = { child: childCredit(i.kids8), pension: won(pensionBase * (income <= PENSION_LINE ? PENSION_HIGH : PENSION_LOW) / 100), standard: STANDARD_CREDIT };
    var credits = c.child + c.pension + c.standard;
    var tax = Math.max(0, computed - credits);
    var local = won(tax * LOCAL_RATE / 100);
    var paid = i.paid > 0 ? i.paid : won(i.revenue * WITHHOLD_RATE / 100);
    var paidLocal = won(paid * LOCAL_RATE / 100);
    var diff = trunc10(paid - tax), diffLocal = trunc10(paidLocal - local);   // + 돌려받음, − 더 냄 (10원 미만 버림)
    return { expense: expense, expenseRate: i.revenue > 0 ? expense / i.revenue * 100 : 0, income: income, personal: personal, taxBase: taxBase, computed: computed, c: c,
      credits: Math.min(credits, computed), tax: tax, local: local, paid: paid, paidLocal: paidLocal, diff: diff, diffLocal: diffLocal, total: diff + diffLocal };
  }
  function m(id) { return S.parseMoney($(id).value); }
  function n(id, d) { var v = parseFloat($(id).value); return isNaN(v) ? d : v; }
  function readInput() {
    return { revenue: m('revenue'), method: $('method').value, rateBase: n('rateBase', SIMPLE_RATE_DEFAULT), rateOver: n('rateOver', SIMPLE_OVER_DEFAULT), expense: m('expense'),
      family: Math.max(1, Math.floor(S.parseNonNegative($('family').value)) || 1), kids8: Math.floor(S.parseNonNegative($('kids8').value)) || 0,
      pension: m('pension'), saving: m('saving'), irp: m('irp'), paid: m('paid') };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.revenue > 0, refund = r.total >= 0;
    $('simple-fields').hidden = i.method !== 'simple'; $('book-fields').hidden = i.method === 'simple';
    S.setText('out-kicker', !has ? '5월 신고 때 돌려받는 돈' : refund ? '5월 신고 때 돌려받는 돈' : '5월 신고 때 더 내는 돈');
    S.setText('out-total', S.fmtWon(has ? Math.abs(r.total) : 0));
    S.setText('sticky-monthly', !has ? '—' : (refund ? '환급 ' : '추가 납부 ') + S.fmtWon(Math.abs(r.total)) + '원');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-paid', S.fmtWon(has ? r.paid : 0)); S.setText('out-local', S.fmtWon(r.local));
    var set = function (id, v) { S.setText(id, S.fmtWon(v)); };
    set('out-revenue', i.revenue); set('out-expense', r.expense); S.setText('out-expense-rate', S.fmtRate(r.expenseRate)); set('out-income', r.income);
    set('out-personal', r.personal); set('out-pension-ins', i.pension); set('out-base', r.taxBase); set('out-computed', r.computed);
    set('out-c-child', r.c.child); set('out-c-pension', r.c.pension); set('out-c-standard', r.c.standard); set('out-tax2', r.tax);
    set('out-paid2', has ? r.paid : 0); set('out-paid-local', has ? r.paidLocal : 0); set('out-local2', r.local);
    S.setText('rules-date', RULES_DATE);
    var note;
    if (!has) note = '1년 동안 3.3%를 떼기 전 금액으로 받은 수입을 넣으면 바로 계산됩니다.';
    else {
      note = '수입 ' + S.fmtKorean(i.revenue) + '에서 ' + (i.method === 'simple' ? '단순경비율로 ' : '넣은 경비 ') + S.fmtKorean(r.expense) + '(수입의 ' + S.fmtRate(r.expenseRate) + '%)을 빼고 공제를 적용해 결정세액 ' + S.fmtKorean(r.tax) + '을 구했고, ' +
        (i.paid > 0 ? '이미 낸 ' : '수입의 3%로 계산한 ') + '기납부세액 ' + S.fmtKorean(r.paid) + '과 비교했습니다(지방소득세 10% 포함). ';
      if (i.method === 'simple' && i.revenue >= SIMPLE_NEW_CAP) note += '그해 수입이 7,500만원 이상이면 단순경비율을 쓸 수 없어 실제 세금은 이보다 클 수 있습니다. ';
      else if (i.method === 'simple' && i.revenue > SIMPLE_OVER_LINE) note += '4,000만원을 넘는 수입에는 초과율 ' + S.fmtRate(i.rateOver) + '%를 적용했습니다. 직전 해 수입이 3,600만원 이상이었다면 단순경비율 대상이 아닙니다. ';
      note += '근로소득 등 다른 소득이 있으면 합쳐서 세금이 달라집니다. 참고용 추정입니다.';
    }
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('rateBase').value = SIMPLE_RATE_DEFAULT; $('rateOver').value = SIMPLE_OVER_DEFAULT; $('family').value = '1'; $('kids8').value = '0';
    S.wireCalc({
      key: 'income-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        ['revenue', 'expense', 'pension', 'saving', 'irp', 'paid'].forEach(function (k) { $(k).value = ''; });
        $('method').value = 'simple'; $('rateBase').value = SIMPLE_RATE_DEFAULT; $('rateOver').value = SIMPLE_OVER_DEFAULT; $('family').value = '1'; $('kids8').value = '0';
        if (name === 'clear') return;
        var p = { r1: 10000000, r3: 30000000, r5: 50000000 }[name]; if (!p) return;
        S.setMoney('revenue', p);
      },
      share: function () { var r = last.r; return { title: '종합소득세 계산 결과', text: '[종합소득세 추정] 수입 ' + S.fmtKorean(last.i.revenue) + '\n' + (r.total >= 0 ? '환급 ' : '추가 납부 ') + S.fmtWon(Math.abs(r.total)) + '원 (결정세액 ' + S.fmtWon(r.tax) + '원, 참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'income-tax-result', title: '종합소득세 계산기', kicker: '수입 ' + S.fmtKorean(last.i.revenue) + ' · ' + (r.total >= 0 ? '예상 환급액' : '예상 추가 납부액'), big: S.fmtWon(Math.abs(r.total)), unit: '원',
          rows: [['필요경비', S.fmtWon(r.expense) + '원'], ['과세표준', S.fmtWon(r.taxBase) + '원'], ['결정세액', S.fmtWon(r.tax) + '원'], ['기납부세액 (3%)', S.fmtWon(r.paid) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 세액은 홈택스 신고 결과에 따릅니다.' };
      }
    });
  });
})();
