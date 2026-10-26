/* 주택임대소득세 계산기 — 과세 여부, 간주임대료, 수입 2천만원 이하 분리과세 세액 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (소득세법 제12조·제25조·제64조의2, 시행규칙 제23조. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 귀속(2027년 5월 신고) 기준 (2026-10 확인)';
  var HIGH_PRICE = 1200000000;          // 고가주택: 기준시가 12억원 초과 (1주택이어도 월세 과세)
  var DEEMED_FREE = 300000000;          // 간주임대료: 보증금 합계에서 3억원을 빼고
  var DEEMED_RATIO = 60;                // 60%에
  var DEEMED_RATE = 3.1;                // 정기예금이자율(매년 시행규칙으로 정함)을 곱한다
  var TWO_HIGH_LINE = 1200000000;       // 2026년 귀속부터: 고가주택 2주택자 보증금 합계 12억원 초과도 간주임대료 대상
  var SEPARATE_LINE = 20000000;         // 총수입 2천만원 이하면 분리과세 선택 가능
  var EXPENSE = { reg: 60, unreg: 50 }, BASIC = { reg: 4000000, unreg: 2000000 };   // 필요경비율, 기본공제(다른 종합소득금액 2천만원 이하일 때)
  var SEPARATE_RATE = 14, LOCAL_RATE = 10;

  function won(n) { return Math.floor(n + 1e-6); }
  function calc(i) {
    var rentTaxed = !(i.homes === 1 && !i.high);                // 1주택(고가 아님) 월세는 비과세
    var rentIncome = rentTaxed ? i.rent : 0;
    var deemedTarget = (i.homes >= 3 && i.deposit > DEEMED_FREE) || (i.homes === 2 && i.high && i.deposit > TWO_HIGH_LINE);
    var deemed = deemedTarget ? won((i.deposit - DEEMED_FREE) * DEEMED_RATIO / 100 * DEEMED_RATE / 100) : 0;
    var revenue = rentIncome + deemed;
    var separate = revenue > 0 && revenue <= SEPARATE_LINE;
    var kind = i.reg ? 'reg' : 'unreg';
    var expense = won(revenue * EXPENSE[kind] / 100);
    var basic = i.otherLow ? BASIC[kind] : 0;
    var taxBase = separate ? Math.max(0, revenue - expense - basic) : 0;
    var tax = won(taxBase * SEPARATE_RATE / 100), local = won(tax * LOCAL_RATE / 100);
    return { rentTaxed: rentTaxed, rentIncome: rentIncome, deemedTarget: deemedTarget, deemed: deemed, revenue: revenue, separate: separate, expense: expense, basic: basic,
      taxBase: taxBase, tax: tax, local: local, total: tax + local, expenseRate: EXPENSE[kind] };
  }
  function readInput() {
    return { homes: parseInt($('homes').value, 10) || 1, high: $('high').checked, rent: S.parseMoney($('rent').value) * 12, deposit: S.parseMoney($('deposit').value),
      reg: $('reg').checked, otherLow: $('otherLow').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.rent > 0 || i.deposit > 0;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', !has ? '—' : r.revenue > SEPARATE_LINE ? '종합과세 대상' : S.fmtWon(r.total) + '원');
    S.setText('out-revenue', S.fmtWon(r.revenue)); S.setText('out-deemed', S.fmtWon(r.deemed)); S.setText('out-kind', !has ? '—' : r.revenue === 0 ? '비과세' : r.separate ? '분리과세 선택 가능' : '종합과세');
    S.setText('out-rent-income', S.fmtWon(r.rentIncome)); S.setText('out-deemed2', S.fmtWon(r.deemed)); S.setText('out-revenue2', S.fmtWon(r.revenue));
    S.setText('out-expense-rate', r.expenseRate); S.setText('out-expense', S.fmtWon(r.expense)); S.setText('out-basic', S.fmtWon(r.basic)); S.setText('out-base', S.fmtWon(r.taxBase));
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-local', S.fmtWon(r.local));
    S.setText('rules-date', RULES_DATE);
    var msg;
    if (!has) msg = '보유 주택 수와 월세·보증금을 입력하면 바로 계산됩니다.';
    else if (r.revenue === 0) msg = (i.homes === 1 ? '기준시가 12억원 이하 1주택의 월세와 전세보증금은 세금이 없습니다. ' : '월세가 없고 보증금이 간주임대료 대상이 아니라 낼 세금이 없습니다. ') + '국외 주택은 1주택이어도 과세됩니다.';
    else if (!r.separate) msg = '총수입금액이 ' + S.fmtKorean(r.revenue) + '로 2,000만원을 넘어 다른 소득과 합쳐 종합과세됩니다. 세액은 다른 소득에 따라 달라 이 계산기로는 계산하지 않습니다.';
    else msg = '총수입금액 ' + S.fmtKorean(r.revenue) + '에서 필요경비 ' + r.expenseRate + '%' + (r.basic ? '와 기본공제 ' + S.fmtKorean(r.basic) : '') + '를 빼고 14%를 곱했습니다(지방소득세 1.4% 별도). ' +
      '분리과세와 종합과세 중 고를 수 있으니 다른 소득이 적으면 종합과세가 더 적을 수도 있습니다.';
    S.setText('out-note', msg + (r.deemed ? ' 간주임대료는 (보증금 합계 − 3억원) × 60% × ' + DEEMED_RATE + '%로 계산했습니다.' : ''));
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('otherLow').checked = true;
    S.wireCalc({
      key: 'rental-income-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('rent').value = ''; $('deposit').value = ''; return; }
        var p = { two: ['2', 1000000, 0, false], tworeg: ['2', 1000000, 0, true], three: ['3', 1000000, 800000000, false] }[name]; if (!p) return;
        $('homes').value = p[0]; S.setMoney('rent', p[1]); S.setMoney('deposit', p[2]); $('reg').checked = p[3]; $('high').checked = false; $('otherLow').checked = true;
      },
      share: function () { var r = last.r; return { title: '주택임대소득세 계산 결과', text: '[주택임대소득세] ' + last.i.homes + '주택 · 총수입 ' + S.fmtKorean(r.revenue) + '\n' + (r.separate ? '분리과세 ' + S.fmtWon(r.total) + '원 (지방소득세 포함)' : r.revenue ? '종합과세 대상' : '비과세') }; },
      card: function () {
        var r = last.r;
        return { file: 'rental-income-tax-result', title: '주택임대소득세 계산기', kicker: last.i.homes + '주택 · 분리과세 세액', big: S.fmtWon(r.total), unit: '원',
          rows: [['연 월세 (과세분)', S.fmtWon(r.rentIncome) + '원'], ['간주임대료', S.fmtWon(r.deemed) + '원'], ['총수입금액', S.fmtWon(r.revenue) + '원'], ['과세표준', S.fmtWon(r.taxBase) + '원']],
          note: RULES_DATE + '. 참고용 추정입니다.' };
      }
    });
  });
})();
