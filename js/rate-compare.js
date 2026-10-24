/* 고정금리 vs 변동금리 비교 계산기 — 원리금균등 기준, 변동금리는 6개월마다 재산정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;
  var RESET_MONTHS = 6;          // 변동금리 재산정 주기
  var RATE_FLOOR = 0.5;          // 하락 시나리오에서 금리 하한 (%)
  var PRESET = { up: 0.5, flat: 0, down: -0.5 };

  function readInput() {
    return { principal: S.parseMoney($('principal').value), years: Math.floor(S.parseNonNegative($('years').value)) || 0,
      fixed: S.parseNonNegative($('fixedRate').value), varRate: S.parseNonNegative($('varRate').value), change: S.parseNumber($('varChange').value) || 0 };
  }
  function annuity(P, r, n) { if (n <= 0) return 0; if (r === 0) return P / n; var k = Math.pow(1 + r, n); return P * r * k / (k - 1); }

  // 변동금리: 6개월마다 금리를 change/2 만큼 바꾸고 남은 원금·기간으로 월 상환액 재계산
  function simulateVar(P, n, startRate, annualChange) {
    var bal = P, rate = startRate, interest = 0, pay = 0, first = 0, max = 0, minPay = Infinity, yearly = [];
    for (var m = 0; m < n; m++) {
      if (m % RESET_MONTHS === 0) {
        if (m > 0) rate = Math.max(RATE_FLOOR, rate + annualChange * RESET_MONTHS / 12);
        pay = annuity(bal, rate / 1200, n - m);
      }
      var it = bal * rate / 1200, pr = pay - it;
      if (m === n - 1) { pr = bal; pay = pr + it; }
      interest += it; bal -= pr;
      if (m === 0) first = pay;
      if (pay > max) max = pay; if (pay < minPay) minPay = pay;
      if (m % 12 === 0) yearly.push({ year: m / 12 + 1, rate: rate, pay: pay });
    }
    return { interest: interest, first: first, max: max, min: minPay, yearly: yearly };
  }
  function simulateFixed(P, n, rate) {
    var pay = annuity(P, rate / 1200, n);
    return { interest: pay * n - P, pay: pay };
  }
  var last = null;

  function render(i) {
    var n = i.years * 12, ok = i.principal > 0 && n > 0;
    var fx = ok ? simulateFixed(i.principal, n, i.fixed) : { interest: 0, pay: 0 };
    var vr = ok ? simulateVar(i.principal, n, i.varRate, i.change) : { interest: 0, first: 0, max: 0, min: 0, yearly: [] };
    var diff = fx.interest - vr.interest; // 양수면 변동이 유리
    // 손익분기: 변동금리가 매년 몇 %p 올라야 고정과 총이자가 같아지나 (이분법)
    var be = null;
    if (ok) {
      var lo = -5, hi = 10;
      var f = function (c) { return simulateVar(i.principal, n, i.varRate, c).interest - fx.interest; };
      if (f(lo) < 0 && f(hi) > 0) { for (var k = 0; k < 40; k++) { var mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; } be = (lo + hi) / 2; }
    }
    S.setText('out-big', ok ? S.fmtWon(Math.abs(diff)) : '0');
    S.setText('out-kicker', !ok ? '총 이자 차이' : (diff >= 0 ? '변동금리가 총 이자를 이만큼 아낍니다' : '고정금리가 총 이자를 이만큼 아낍니다'));
    S.setText('sticky-monthly', ok ? (diff >= 0 ? '변동 유리 ' : '고정 유리 ') + S.fmtWon(Math.abs(diff)) + '원' : '—');
    S.setText('out-fixed-int', S.fmtWon(fx.interest)); S.setText('out-var-int', S.fmtWon(vr.interest));
    S.setText('out-fixed-pay', S.fmtWon(fx.pay)); S.setText('out-var-first', S.fmtWon(vr.first));
    S.setText('out-var-max', S.fmtWon(vr.max)); S.setText('out-var-min', S.fmtWon(ok ? vr.min : 0));
    S.setText('out-be', be === null ? '—' : (be >= 0 ? '+' : '') + be.toFixed(2) + '%p');
    S.setText('out-note', ok ? (be === null ? '이 조건에서는 연 -5~+10%p 범위 안에 손익분기점이 없습니다.' : '변동금리가 매년 ' + (be >= 0 ? '+' : '') + be.toFixed(2) + '%p씩 ' + (be >= 0 ? '오르면' : '내리면') + ' 두 방식의 총 이자가 같아집니다. 그보다 더 오르면 고정, 덜 오르면 변동이 유리합니다.') : '대출금액, 기간, 두 금리를 입력하세요.');
    var tb = $('year-body'); tb.innerHTML = '';
    vr.yearly.forEach(function (y) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<th scope="row">' + y.year + '년차</th><td>' + S.fmtRate(y.rate) + '%</td><td>' + S.fmtWon(y.pay) + '원</td><td>' + S.fmtWon(fx.pay) + '원</td>';
      tb.appendChild(tr);
    });
    last = { i: i, fx: fx, vr: vr, diff: diff, be: be };
  }

  S.ready(function () {
    S.wireCalc({
      key: 'rate-compare',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { S.setMoney('principal', 0); return; }
        if (PRESET.hasOwnProperty(name)) { $('varChange').value = PRESET[name]; if (S.parseMoney($('principal').value) === 0) { S.setMoney('principal', 300000000); $('years').value = 30; $('fixedRate').value = '4.2'; $('varRate').value = '3.8'; } }
      },
      share: function () { return { title: '고정 vs 변동금리 비교', text: '[고정 vs 변동] ' + S.fmtWon(last.i.principal) + '원 ' + last.i.years + '년 · 고정 ' + S.fmtRate(last.i.fixed) + '% 총이자 ' + S.fmtWon(last.fx.interest) + '원 / 변동 ' + S.fmtRate(last.i.varRate) + '%(연 ' + last.i.change + '%p) 총이자 ' + S.fmtWon(last.vr.interest) + '원' }; },
      card: function () {
        return { file: 'rate-compare-result', title: '고정금리 vs 변동금리', kicker: last.diff >= 0 ? '변동금리가 아끼는 총 이자' : '고정금리가 아끼는 총 이자', big: S.fmtWon(Math.abs(last.diff)), unit: '원',
          rows: [['대출 조건', S.fmtWon(last.i.principal) + '원 · ' + last.i.years + '년'], ['고정 ' + S.fmtRate(last.i.fixed) + '% 총 이자', S.fmtWon(last.fx.interest) + '원'], ['변동 ' + S.fmtRate(last.i.varRate) + '% (연 ' + (last.i.change >= 0 ? '+' : '') + last.i.change + '%p) 총 이자', S.fmtWon(last.vr.interest) + '원'], ['변동 월 상환 최저~최고', S.fmtWon(last.vr.min) + ' ~ ' + S.fmtWon(last.vr.max) + '원'], ['손익분기 연 변동폭', last.be === null ? '—' : (last.be >= 0 ? '+' : '') + last.be.toFixed(2) + '%p']],
          note: '원리금균등, 변동금리는 6개월마다 재산정 가정. 실제 금리 경로는 알 수 없으며 참고용입니다.' };
      }
    });
  });
})();
