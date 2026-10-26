/* 전세자금대출 이자 계산기 — 대출 가능 금액, 월 이자, 자기자금 기회비용을 더한 월 주거비 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (개정 시 이 블록만 수정) ----
  var RULES_DATE = '주택임차차입금 소득공제 2026년 소득세법 기준 (2026-10 확인)';
  var DEDUCT_RATE = 40;           // 주택임차차입금 원리금상환액 소득공제율 %
  var DEDUCT_CAP = 4000000;       // 연 한도 (주택청약종합저축 공제와 합산 400만원)

  function won(n) { return Math.floor(n + 1e-6); }   // 원 미만 버림(부동소수 오차 보정)
  function calc(i) {
    var byRatio = won(i.deposit * i.ratio / 100);
    var loan = i.cap > 0 ? Math.min(byRatio, i.cap) : byRatio;
    loan = Math.min(loan, i.deposit);
    var own = i.deposit - loan;
    var monthly = won(loan * i.rate / 1200);             // 만기일시상환: 매달 이자만
    var total = monthly * i.months;
    var fee = won(loan * i.fee / 1200);                  // 보증료(연 %)를 월로
    var opp = won(own * i.save / 1200);                  // 자기자금을 예금에 두었을 때 이자
    var yearly = monthly * 12;
    return { byRatio: byRatio, loan: loan, own: own, monthly: monthly, total: total, fee: fee, opp: opp, housing: monthly + fee + opp,
      yearly: yearly, deduct: Math.min(DEDUCT_CAP, won(yearly * DEDUCT_RATE / 100)), capped: i.cap > 0 && i.cap < byRatio };
  }
  function readInput() {
    return { deposit: S.parseMoney($('deposit').value), ratio: Math.min(100, S.parseNonNegative($('ratio').value)), cap: S.parseMoney($('cap').value),
      rate: S.parseNonNegative($('rate').value), months: Math.floor(S.parseNonNegative($('months').value)), fee: S.parseNonNegative($('fee').value),
      save: S.parseNonNegative($('save').value) };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.deposit > 0;
    S.setText('out-monthly', S.fmtWon(r.monthly)); S.setText('sticky-monthly', has ? S.fmtWon(r.monthly) + '원' : '—');
    S.setText('out-loan', S.fmtWon(r.loan)); S.setText('out-own', S.fmtWon(r.own)); S.setText('out-total', S.fmtWon(r.total));
    S.setText('out-monthly2', S.fmtWon(r.monthly)); S.setText('out-total2', S.fmtWon(r.total));
    S.setText('out-by-ratio', S.fmtWon(r.byRatio)); S.setText('out-months', i.months); S.setText('out-fee', S.fmtWon(r.fee)); S.setText('out-opp', S.fmtWon(r.opp));
    S.setText('out-housing', S.fmtWon(r.housing)); S.setText('out-yearly', S.fmtWon(r.yearly)); S.setText('out-deduct', S.fmtWon(r.deduct));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '전세 보증금을 입력하면 바로 계산됩니다.' :
      '보증금 ' + S.fmtKorean(i.deposit) + '의 ' + S.fmtRate(i.ratio) + '%' + (r.capped ? '가 상한 ' + S.fmtKorean(i.cap) + '을 넘어 상한까지' : '') + ' 빌려 ' + S.fmtKorean(r.loan) +
      ', 연 ' + S.fmtRate(i.rate) + '%로 매달 이자만 내고 만기에 원금을 갚는 방식으로 계산했습니다. 실제 한도는 소득·보증기관·은행 심사로 정해집니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'jeonse-loan',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['deposit', 'cap'].forEach(function (k) { $(k).value = ''; }); return; }
        var p = { d2: [200000000, ''], d3: [300000000, ''], d3cap: [300000000, 200000000] }[name]; if (!p) return;
        S.setMoney('deposit', p[0]); S.setMoney('cap', p[1]); $('ratio').value = '80'; $('rate').value = '4'; $('months').value = '24'; $('fee').value = ''; $('save').value = '3';
      },
      share: function () { return { title: '전세자금대출 이자 계산 결과', text: '[전세대출] 보증금 ' + S.fmtKorean(last.i.deposit) + ' · 대출 ' + S.fmtKorean(last.r.loan) + ' (연 ' + S.fmtRate(last.i.rate) + '%)\n월 이자 ' + S.fmtWon(last.r.monthly) + '원 · ' + last.i.months + '개월 총 이자 ' + S.fmtWon(last.r.total) + '원' }; },
      card: function () {
        var r = last.r;
        return { file: 'jeonse-loan-result', title: '전세자금대출 이자 계산기', kicker: '대출 ' + S.fmtKorean(r.loan) + ' · 연 ' + S.fmtRate(last.i.rate) + '% · 월 이자', big: S.fmtWon(r.monthly), unit: '원',
          rows: [['전세 보증금', S.fmtWon(last.i.deposit) + '원'], ['자기자금', S.fmtWon(r.own) + '원'], [last.i.months + '개월 총 이자', S.fmtWon(r.total) + '원'], ['월 주거비 (이자+보증료+기회비용)', S.fmtWon(r.housing) + '원']],
          note: '만기일시상환 기준. 실제 대출 한도와 금리는 은행 심사로 정해집니다.' };
      }
    });
  });
})();
