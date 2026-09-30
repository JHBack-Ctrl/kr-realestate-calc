/* 매매 vs 전세 총비용 비교 계산기 — 보유기간 동안 나가는 돈을 같은 기준으로 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;
  var DEFAULT_YEARS = 5, DEFAULT_OPP = 3.0, DEFAULT_ACQ_RATE = 1.1, DEFAULT_BUY_FEE = 0.4, DEFAULT_JEONSE_FEE = 0.3, DEFAULT_PROP_TAX = 0.15; // % 단위 기본값
  var JEONSE_TERM_YEARS = 2; // 전세 계약 단위 (갱신 시 중개보수 재발생 가정 안 함)
  // 예시 버튼(8억)의 취득세율. acquisition-tax.html에 8억·1주택·85㎡ 이하를 넣은 실효세율
  // (취득세 2.33% + 지방교육세). 기본값 1.1%는 6억 이하 세율이라 8억 예시에는 맞지 않는다.
  // 취득세율이 바뀌면 이 값도 취득세 계산기로 다시 뽑을 것. 기준 2026-09.
  var PRESET_ACQ_RATE = 2.57;

  function pct(id) { return S.parseNonNegative($(id).value); }
  function readInput() {
    return { price: S.parseMoney($('price').value), loan: S.parseMoney($('loan').value), loanRate: pct('loanRate'), years: Math.floor(pct('years')) || 0,
      acqRate: pct('acqRate'), buyFee: pct('buyFee'), propTax: pct('propTax'), growth: S.parseNumber($('growth').value) || 0,
      jeonse: S.parseMoney($('jeonse').value), jLoan: S.parseMoney($('jLoan').value), jRate: pct('jRate'), jFee: pct('jFee'), opp: pct('opp') };
  }
  function calc(i, growth) {
    var y = i.years;
    var loan = Math.min(i.loan, i.price), own = i.price - loan;
    var buyInterest = loan * i.loanRate / 100 * y;
    var buyOpp = own * i.opp / 100 * y;
    var acq = i.price * i.acqRate / 100;
    var fees = i.price * i.buyFee / 100 * 2; // 살 때 + 팔 때
    var prop = i.price * i.propTax / 100 * y;
    var gain = i.price * (Math.pow(1 + growth / 100, y) - 1);
    var buyTotal = buyInterest + buyOpp + acq + fees + prop - gain;
    var jl = Math.min(i.jLoan, i.jeonse), jown = i.jeonse - jl;
    var jInterest = jl * i.jRate / 100 * y;
    var jOpp = jown * i.opp / 100 * y;
    var jFee = i.jeonse * i.jFee / 100;
    var jTotal = jInterest + jOpp + jFee;
    return { buyInterest: buyInterest, buyOpp: buyOpp, acq: acq, fees: fees, prop: prop, gain: gain, buyTotal: buyTotal, jInterest: jInterest, jOpp: jOpp, jFee: jFee, jTotal: jTotal };
  }
  var last = null;

  function render(i) {
    var ok = i.price > 0 && i.years > 0;
    var r = ok ? calc(i, i.growth) : null;
    var diff = r ? r.jTotal - r.buyTotal : 0; // 양수면 매매가 덜 든다
    var be = null;
    if (ok) { // 손익분기 연 상승률: 매매 총비용 = 전세 총비용
      var lo = -20, hi = 30, f = function (g) { return calc(i, g).buyTotal - r.jTotal; };
      if (f(lo) > 0 && f(hi) < 0) { for (var k = 0; k < 50; k++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; } be = (lo + hi) / 2; }
    }
    S.setText('out-big', ok ? S.fmtWon(Math.abs(diff)) : '0');
    S.setText('out-kicker', !ok ? i.years + '년 총비용 차이' : (diff >= 0 ? i.years + '년 기준 매매가 이만큼 덜 듭니다' : i.years + '년 기준 전세가 이만큼 덜 듭니다'));
    S.setText('sticky-monthly', (diff >= 0 ? '매매 유리 ' : '전세 유리 ') + S.fmtWon(Math.abs(diff)) + '원');
    S.setText('out-buy-total', S.fmtWon(r ? r.buyTotal : 0)); S.setText('out-j-total', S.fmtWon(r ? r.jTotal : 0));
    S.setText('out-buy-month', S.fmtWon(r ? r.buyTotal / (i.years * 12) : 0)); S.setText('out-j-month', S.fmtWon(r ? r.jTotal / (i.years * 12) : 0));
    var rows = r ? [['대출이자', r.buyInterest, r.jInterest], ['자기자본 기회비용', r.buyOpp, r.jOpp], ['취득세 등', r.acq, 0], ['중개보수', r.fees, r.jFee], ['재산세 등 보유세', r.prop, 0], ['가격 변동 (이익은 −)', -r.gain, 0]] : [];
    var tb = $('detail-body'); tb.innerHTML = '';
    rows.forEach(function (x) { var tr = document.createElement('tr'); tr.innerHTML = '<th scope="row">' + x[0] + '</th><td>' + S.fmtWon(x[1]) + '원</td><td>' + (x[2] === 0 && x[0] !== '대출이자' && x[0] !== '자기자본 기회비용' && x[0] !== '중개보수' ? '<span class="na">—</span>' : S.fmtWon(x[2]) + '원') + '</td>'; tb.appendChild(tr); });
    if (r) { var tr = document.createElement('tr'); tr.className = 'total'; tr.innerHTML = '<th scope="row">합계</th><td>' + S.fmtWon(r.buyTotal) + '원</td><td>' + S.fmtWon(r.jTotal) + '원</td>'; tb.appendChild(tr); }
    S.setText('out-be', be === null ? '—' : be.toFixed(2) + '%');
    S.setText('out-note', ok ? (be === null ? '연 -20~+30% 범위에서 손익분기 상승률이 없습니다. 입력을 확인하세요.' : '집값이 매년 ' + be.toFixed(2) + '% 오르면 두 선택의 총비용이 같아집니다. 그보다 더 오르면 매매, 덜 오르면 전세가 덜 듭니다. 대출이자는 이자만 내는 기준이라 원리금 상환 시 실제 이자는 이보다 적습니다.') : '매매가, 전세금, 보유기간을 입력하세요.');
    last = { i: i, r: r, diff: diff, be: be };
  }

  S.ready(function () {
    $('years').value = DEFAULT_YEARS; $('opp').value = DEFAULT_OPP.toFixed(1); $('acqRate').value = DEFAULT_ACQ_RATE.toFixed(1); $('buyFee').value = DEFAULT_BUY_FEE.toFixed(1); $('jFee').value = DEFAULT_JEONSE_FEE.toFixed(1); $('propTax').value = DEFAULT_PROP_TAX.toFixed(2); $('growth').value = '0';
    S.wireCalc({
      key: 'buy-vs-rent',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['price', 'loan', 'jeonse', 'jLoan'].forEach(function (k) { S.setMoney(k, 0); }); $('acqRate').value = DEFAULT_ACQ_RATE.toFixed(1); return; }
        S.setMoney('price', 800000000); S.setMoney('loan', 400000000); $('loanRate').value = '4.0'; S.setMoney('jeonse', 500000000);
        $('acqRate').value = PRESET_ACQ_RATE.toFixed(2);
        S.setMoney('jLoan', 200000000); $('jRate').value = '3.5'; $('growth').value = name === 'up' ? '3' : '0';
      },
      share: function () { return { title: '매매 vs 전세 비교', text: '[매매 vs 전세] ' + last.i.years + '년 · 매매 ' + S.fmtWon(last.r ? last.r.buyTotal : 0) + '원 / 전세 ' + S.fmtWon(last.r ? last.r.jTotal : 0) + '원 · 손익분기 상승률 ' + (last.be === null ? '—' : last.be.toFixed(2) + '%') }; },
      card: function () {
        var r = last.r || {};
        return { file: 'buy-vs-rent-result', title: '매매 vs 전세 비교', kicker: last.diff >= 0 ? last.i.years + '년 기준 매매가 덜 드는 금액' : last.i.years + '년 기준 전세가 덜 드는 금액', big: S.fmtWon(Math.abs(last.diff)), unit: '원',
          rows: [['매매 ' + S.fmtWon(last.i.price) + '원 총비용', S.fmtWon(r.buyTotal || 0) + '원'], ['전세 ' + S.fmtWon(last.i.jeonse) + '원 총비용', S.fmtWon(r.jTotal || 0) + '원'], ['가정한 연 가격 변동', last.i.growth + '%'], ['손익분기 연 상승률', last.be === null ? '—' : last.be.toFixed(2) + '%']],
          note: '대출이자는 이자만 내는 기준, 기회비용 연 ' + S.fmtRate(last.i.opp) + '%. 세금·중개보수는 입력한 비율. 참고용입니다.' };
      }
    });
  });
})();
