/* 증여세 계산기 — 관계별 증여재산공제와 10년 합산으로 증여세 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (상속세 및 증여세법. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 상속세 및 증여세법 기준 (2026-10 확인)';
  // 증여재산공제(10년 합산 한도): 배우자 6억, 직계존속→성년 자녀 5천만(미성년 2천만), 직계비속→부모 5천만, 기타친족 1천만
  var DEDUCT = { spouse: 600000000, adult: 50000000, minor: 20000000, parent: 50000000, kin: 10000000, other: 0 };
  var MARRIAGE_BIRTH = 100000000;    // 혼인·출산 증여재산공제: 직계존속에게 받을 때 최대 1억 추가
  // 세율 [과세표준 상한, 세율%, 누진공제]
  var RATES = [[100000000, 10, 0], [500000000, 20, 10000000], [1000000000, 30, 60000000], [3000000000, 40, 160000000], [Infinity, 50, 460000000]];
  var MIN_BASE = 500000;             // 과세표준 50만원 미만이면 과세하지 않음
  var SKIP_ADD = 30, SKIP_ADD_BIG = 40, SKIP_BIG = 2000000000; // 세대생략 할증 30% (미성년자가 20억 넘게 받으면 40%)
  var FILING_CREDIT = 3;             // 신고세액공제 3% (기한 안에 신고할 때)

  function won(n) { return Math.floor(n + 1e-6); }   // 원 미만 버림(부동소수 오차 보정)
  function progressive(base) {
    if (base <= 0) return { tax: 0, rate: 0 };
    for (var k = 0; k < RATES.length; k++) if (base <= RATES[k][0]) return { tax: Math.max(0, base * RATES[k][1] / 100 - RATES[k][2]), rate: RATES[k][1] };
  }
  function calc(i) {
    var total = i.amount + i.prior;
    var fromParent = i.rel === 'adult' || i.rel === 'minor';
    var deduct = Math.min(total, (DEDUCT[i.rel] || 0) + (fromParent && i.marriage ? MARRIAGE_BIRTH : 0));
    var base = total - deduct; if (base < MIN_BASE) base = 0;
    var p = progressive(base);
    var computed = won(p.tax);
    var skipRate = i.skip && fromParent ? (i.rel === 'minor' && total > SKIP_BIG ? SKIP_ADD_BIG : SKIP_ADD) : 0;
    var surcharge = won(computed * skipRate / 100);
    var priorCredit = Math.min(i.priorTax, computed + surcharge);
    var beforeFiling = computed + surcharge - priorCredit;
    var filing = i.filing ? won(beforeFiling * FILING_CREDIT / 100) : 0;
    var tax = Math.max(0, beforeFiling - filing);
    return { total: total, deduct: deduct, base: base, rate: p.rate, computed: computed, skipRate: skipRate, surcharge: surcharge, priorCredit: priorCredit, filing: filing, tax: tax,
      effective: i.amount > 0 ? tax / i.amount * 100 : 0, net: i.amount - tax };
  }
  function readInput() {
    return { amount: S.parseMoney($('amount').value), prior: S.parseMoney($('prior').value), priorTax: S.parseMoney($('priorTax').value), rel: $('rel').value,
      marriage: $('marriage').checked, skip: $('skip').checked, filing: $('filing').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.amount > 0, fromParent = i.rel === 'adult' || i.rel === 'minor';
    $('parent-fields').hidden = !fromParent;
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('sticky-monthly', has ? S.fmtWon(r.tax) + '원' : '—');
    S.setText('out-effective', S.fmtPct(r.effective)); S.setText('out-net', S.fmtWon(r.net)); S.setText('out-rate', r.rate);
    S.setText('out-total', S.fmtWon(r.total)); S.setText('out-deduct', S.fmtWon(r.deduct)); S.setText('out-base', S.fmtWon(r.base));
    S.setText('out-computed', S.fmtWon(r.computed)); S.setText('out-surcharge', S.fmtWon(r.surcharge)); S.setText('out-prior-credit', S.fmtWon(r.priorCredit)); S.setText('out-filing', S.fmtWon(r.filing));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '증여받는 금액과 관계를 입력하면 바로 계산됩니다.' : r.base <= 0
      ? '10년 합산 ' + S.fmtKorean(r.total) + '이 증여재산공제 ' + S.fmtKorean(r.deduct) + ' 안이라 낼 증여세가 없습니다. 신고는 해 두는 것이 나중에 취득자금 소명에 도움이 됩니다.'
      : '10년 합산 ' + S.fmtKorean(r.total) + '에서 공제 ' + S.fmtKorean(r.deduct) + '을 뺀 과세표준 ' + S.fmtKorean(r.base) + '에 세율 ' + r.rate + '%를 적용했습니다. ' +
        (r.skipRate ? '세대생략 할증 ' + r.skipRate + '%를 더했습니다. ' : '') + (i.filing ? '증여일이 속한 달의 말일부터 3개월 안에 신고하면 3% 공제를 받습니다. ' : '') + '참고용 추정입니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('filing').checked = true;   // 기본: 기한 안에 신고
    S.wireCalc({
      key: 'gift-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['amount', 'prior', 'priorTax'].forEach(function (k) { $(k).value = ''; }); return; }
        var p = { child1: [100000000, 'adult'], child3: [300000000, 'adult'], spouse7: [700000000, 'spouse'] }[name]; if (!p) return;
        S.setMoney('amount', p[0]); $('rel').value = p[1]; $('prior').value = ''; $('priorTax').value = ''; $('marriage').checked = false; $('skip').checked = false; $('filing').checked = true;
      },
      share: function () { return { title: '증여세 계산 결과', text: '[증여세 추정] ' + S.fmtKorean(last.i.amount) + ' 증여 · 공제 ' + S.fmtKorean(last.r.deduct) + '\n예상 증여세 ' + S.fmtWon(last.r.tax) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'gift-tax-result', title: '증여세 계산기', kicker: S.fmtKorean(last.i.amount) + ' 증여 · 예상 증여세', big: S.fmtWon(r.tax), unit: '원',
          rows: [['10년 합산 증여재산', S.fmtWon(r.total) + '원'], ['증여재산공제', '−' + S.fmtWon(r.deduct) + '원'], ['과세표준', S.fmtWon(r.base) + '원'], ['산출세액 (' + r.rate + '%)', S.fmtWon(r.computed) + '원'], ['신고세액공제', '−' + S.fmtWon(r.filing) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 세액은 신고 내용에 따라 다릅니다.' };
      }
    });
  });
})();
