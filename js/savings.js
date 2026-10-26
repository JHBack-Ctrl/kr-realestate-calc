/* 예금·적금 이자 계산기 — 단리·월복리 이자, 이자소득세 15.4%, 세후 만기 수령액 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (소득세법. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '이자소득세 2026년 소득세법 기준 (2026-10 확인)';
  var INCOME_TAX = 14;            // 이자소득세 14%
  var LOCAL_TAX = 10;             // 지방소득세: 소득세의 10% (합계 15.4%)

  function won(n) { return Math.floor(n + 1e-6); }                  // 원 미만 버림(부동소수 오차 보정)
  function floor10(n) { return Math.floor(n / 10 + 1e-6) * 10; }   // 세금은 10원 미만 버림
  function interestOf(i) {
    var n = i.months, r = i.rate / 1200;
    if (i.kind === 'installment') {
      if (i.method === 'simple') return i.amount * i.rate * (n * (n + 1) / 2) / 1200;   // 매달 넣은 돈마다 남은 개월만큼 이자
      return r > 0 ? i.amount * ((1 + r) * (Math.pow(1 + r, n) - 1) / r - n) : 0;
    }
    if (i.method === 'simple') return i.amount * i.rate * n / 1200;
    return i.amount * (Math.pow(1 + r, n) - 1);
  }
  function calc(i) {
    var principal = i.kind === 'installment' ? i.amount * i.months : i.amount;
    var interest = won(interestOf(i));
    var incomeTax = i.taxed ? floor10(interest * INCOME_TAX / 100) : 0;
    var local = floor10(incomeTax * LOCAL_TAX / 100);
    var tax = incomeTax + local, net = interest - tax;
    return { principal: principal, interest: interest, incomeTax: incomeTax, local: local, tax: tax, net: net, maturity: principal + net,
      yieldPct: principal > 0 ? interest / principal * 100 : 0, netYieldPct: principal > 0 ? net / principal * 100 : 0 };
  }
  function radio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function readInput() {
    return { kind: radio('kind') || 'installment', method: radio('method') || 'simple', amount: S.parseMoney($('amount').value),
      months: Math.min(600, Math.floor(S.parseNonNegative($('months').value))), rate: S.parseNonNegative($('rate').value), taxed: $('taxKind').value !== 'none' };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.amount > 0 && i.months > 0, inst = i.kind === 'installment';
    var lab = document.querySelector('label[for="amount"]'); if (lab) lab.textContent = inst ? '월 납입액' : '예치 금액';
    S.setText('out-maturity', S.fmtWon(r.maturity)); S.setText('sticky-monthly', has ? S.fmtWon(r.maturity) + '원' : '—');
    S.setText('out-net', S.fmtWon(r.net)); S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-yield', S.fmtPct(r.netYieldPct));
    S.setText('out-principal', S.fmtWon(r.principal)); S.setText('out-interest', S.fmtWon(r.interest)); S.setText('out-income-tax', S.fmtWon(r.incomeTax));
    S.setText('out-local', S.fmtWon(r.local)); S.setText('out-net2', S.fmtWon(r.net)); S.setText('out-gross-yield', S.fmtPct(r.yieldPct));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? (inst ? '월 납입액과 기간, 금리를 입력하면 바로 계산됩니다.' : '예치 금액과 기간, 금리를 입력하면 바로 계산됩니다.') :
      (inst ? '적금은 첫 달에 넣은 돈만 ' + i.months + '개월 내내 이자가 붙고 마지막 달 돈은 한 달만 붙어, 연 ' + S.fmtRate(i.rate) + '%라도 원금 대비 이자는 ' + S.fmtPct(r.yieldPct) + '%입니다. '
        : '원금 ' + S.fmtKorean(i.amount) + '에 ' + i.months + '개월 동안 연 ' + S.fmtRate(i.rate) + '% ' + (i.method === 'simple' ? '단리' : '월복리') + ' 이자를 붙였습니다. ') +
      (i.taxed ? '이자소득세 14%와 지방소득세 1.4%를 뺐습니다. ' : '비과세로 계산했습니다. ') + '은행마다 원 단위 처리가 조금 다를 수 있습니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'savings',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('amount').value = ''; return; }
        var p = { m100: ['installment', 1000000, 12, 3], m50y3: ['installment', 500000, 36, 3.5], d10m: ['deposit', 10000000, 12, 3] }[name]; if (!p) return;
        document.querySelector('input[name="kind"][value="' + p[0] + '"]').checked = true;
        document.querySelector('input[name="method"][value="simple"]').checked = true;
        S.setMoney('amount', p[1]); $('months').value = String(p[2]); $('rate').value = String(p[3]); $('taxKind').value = 'general';
      },
      share: function () { return { title: '예금·적금 이자 계산 결과', text: '[' + (last.i.kind === 'installment' ? '적금' : '예금') + '] 원금 ' + S.fmtKorean(last.r.principal) + ' · 연 ' + S.fmtRate(last.i.rate) + '% · ' + last.i.months + '개월\n세후 이자 ' + S.fmtWon(last.r.net) + '원 · 만기 ' + S.fmtWon(last.r.maturity) + '원' }; },
      card: function () {
        var r = last.r, inst = last.i.kind === 'installment';
        return { file: 'savings-result', title: '예금·적금 이자 계산기', kicker: (inst ? '적금 월 ' + S.fmtKorean(last.i.amount) : '예금 ' + S.fmtKorean(last.i.amount)) + ' · ' + last.i.months + '개월 · 연 ' + S.fmtRate(last.i.rate) + '%', big: S.fmtWon(r.maturity), unit: '원',
          rows: [['원금', S.fmtWon(r.principal) + '원'], ['세전 이자', S.fmtWon(r.interest) + '원'], ['이자소득세 등', '−' + S.fmtWon(r.tax) + '원'], ['세후 이자', S.fmtWon(r.net) + '원']],
          note: RULES_DATE + '. 은행마다 원 단위 처리가 조금 다를 수 있습니다.' };
      }
    });
  });
})();
