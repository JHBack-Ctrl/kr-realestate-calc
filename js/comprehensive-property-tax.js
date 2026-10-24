/* 종합부동산세(주택) 계산기 — 공시가격 합계로 종부세·농특세 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (종합부동산세법. 개정 시 이 블록만 수정) ----
  // 2026년 8월 세제개편안(공정시장가액비율 70~80%, 실거주 1주택 공제 등)은 국회 통과 전이라 반영하지 않음
  var RULES_DATE = '2026년 종합부동산세법 기준 (주택·개인, 2026-10 확인)';
  var DEDUCT = { one: 1200000000, other: 900000000 };   // 기본공제: 1세대 1주택 12억, 그 외 9억
  var FMV = 60;                                         // 공정시장가액비율
  // 세율 [과세표준 상한, 세율%, 누진공제]. 2주택 이하
  var RATES = [[300000000, 0.5, 0], [600000000, 0.7, 600000], [1200000000, 1.0, 2400000], [2500000000, 1.3, 6000000],
               [5000000000, 1.5, 11000000], [9400000000, 2.0, 36000000], [Infinity, 2.7, 101800000]];
  // 3주택 이상: 과세표준 12억 초과 구간을 무겁게
  var RATES_HEAVY = [[300000000, 0.5, 0], [600000000, 0.7, 600000], [1200000000, 1.0, 2400000], [2500000000, 2.0, 14400000],
                     [5000000000, 3.0, 39400000], [9400000000, 4.0, 89400000], [Infinity, 5.0, 183400000]];
  var PROP_TAX_TOP_RATE = 0.4;                          // 재산세 공제(약식)에 쓰는 재산세 표준세율 최고 구간 %
  var PROP_FMV = { one: 45, other: 60 };                // 재산세 공정시장가액비율 (1주택은 공시가격 6억 초과 특례 45%)
  var AGE_CREDIT = { a0: 0, a60: 20, a65: 30, a70: 40 };     // 1세대 1주택 고령자 세액공제 %
  var HOLD_CREDIT = { h0: 0, h5: 20, h10: 40, h15: 50 };     // 1세대 1주택 장기보유 세액공제 %
  var CREDIT_CAP = 80;                                  // 두 공제 합계 한도 %
  var RURAL_RATE = 20;                                  // 농어촌특별세: 종부세의 20%

  function won(n) { return Math.floor(n + 1e-6); }   // 원 미만 버림. 0.7%×금액 같은 곱셈의 부동소수 오차로 1원 내려가는 것을 막는다
  function progressive(base, table) {
    if (base <= 0) return { tax: 0, rate: 0 };
    for (var k = 0; k < table.length; k++) if (base <= table[k][0]) return { tax: Math.max(0, base * table[k][1] / 100 - table[k][2]), rate: table[k][1] };
  }
  function calc(i) {
    var one = i.kind === 'one', heavy = i.kind === 'three';
    var deduct = one ? DEDUCT.one : DEDUCT.other;
    var base = Math.max(0, won((i.price - deduct) * FMV / 100));
    var p = progressive(base, heavy ? RATES_HEAVY : RATES);
    var computed = won(p.tax);
    var propCredit = Math.min(computed, won(base * (one ? PROP_FMV.one : PROP_FMV.other) / 100 * PROP_TAX_TOP_RATE / 100));
    var afterProp = computed - propCredit;
    var creditRate = one ? Math.min(CREDIT_CAP, (AGE_CREDIT[i.age] || 0) + (HOLD_CREDIT[i.hold] || 0)) : 0;
    var credit = won(afterProp * creditRate / 100);
    var tax = afterProp - credit, rural = won(tax * RURAL_RATE / 100);
    return { deduct: deduct, base: base, rate: p.rate, heavy: heavy, computed: computed, propCredit: propCredit, creditRate: creditRate, credit: credit,
      tax: tax, rural: rural, total: tax + rural, effective: i.price > 0 ? (tax + rural) / i.price * 100 : 0 };
  }
  function readInput() { return { price: S.parseMoney($('price').value), kind: $('kind').value, age: $('age').value, hold: $('hold').value }; }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.price > 0, one = i.kind === 'one';
    $('one-fields').hidden = !one;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-rural', S.fmtWon(r.rural)); S.setText('out-effective', S.fmtPct(r.effective));
    S.setText('out-deduct', S.fmtWon(r.deduct)); S.setText('out-base', S.fmtWon(r.base)); S.setText('out-rate', S.fmtRate(r.rate));
    S.setText('out-computed', S.fmtWon(r.computed)); S.setText('out-prop-credit', S.fmtWon(r.propCredit));
    S.setText('out-credit-rate', r.creditRate); S.setText('out-credit', S.fmtWon(r.credit));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '주택 공시가격 합계를 입력하면 바로 계산됩니다.' : r.base <= 0
      ? '공시가격 합계가 기본공제 ' + S.fmtKorean(r.deduct) + ' 이하라 종합부동산세가 없습니다.'
      : '공시가격 합계에서 ' + S.fmtKorean(r.deduct) + '을 빼고 ' + FMV + '%를 곱한 과세표준 ' + S.fmtKorean(r.base) + '에 ' + (r.heavy ? '3주택 이상 ' : '') + '세율 ' + S.fmtRate(r.rate) + '%를 적용했습니다. ' +
        (one && r.creditRate ? '고령자·장기보유 세액공제 ' + r.creditRate + '%를 뺐습니다. ' : '') + '재산세 공제는 약식이고 세부담상한은 반영하지 않은 참고용 추정입니다. 12월 1~15일에 냅니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'comprehensive-property-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('price').value = ''; return; }
        var p = { one15: [1500000000, 'one'], two15: [1500000000, 'two'], three30: [3000000000, 'three'] }[name]; if (!p) return;
        S.setMoney('price', p[0]); $('kind').value = p[1]; $('age').value = 'a0'; $('hold').value = 'h0';
      },
      share: function () { return { title: '종합부동산세 계산 결과', text: '[종부세 추정] 공시가격 합계 ' + S.fmtKorean(last.i.price) + '\n종부세 ' + S.fmtWon(last.r.tax) + '원 + 농특세 ' + S.fmtWon(last.r.rural) + '원 = ' + S.fmtWon(last.r.total) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'comprehensive-property-tax-result', title: '종합부동산세 계산기', kicker: '공시가격 합계 ' + S.fmtKorean(last.i.price) + ' · 종부세 + 농특세', big: S.fmtWon(r.total), unit: '원',
          rows: [['과세표준', S.fmtWon(r.base) + '원'], ['산출세액 (' + S.fmtRate(r.rate) + '%)', S.fmtWon(r.computed) + '원'], ['재산세 공제 (약식)', '−' + S.fmtWon(r.propCredit) + '원'], ['세액공제 ' + r.creditRate + '%', '−' + S.fmtWon(r.credit) + '원'], ['종부세 / 농특세', S.fmtWon(r.tax) + ' / ' + S.fmtWon(r.rural) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 고지서와 다를 수 있습니다.' };
      }
    });
  });
})();
