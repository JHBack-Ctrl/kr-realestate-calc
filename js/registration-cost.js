/* 등기비용 계산기 — 주택 매매 소유권이전등기: 국민주택채권 부담, 인지세, 등기신청수수료 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (주택도시기금법 시행령 별표, 인지세법, 등기사항증명서 등 수수료규칙. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 기준 (등기신청수수료는 2025년 8월 1일 인상분, 2026-10 확인)';
  // 제1종 국민주택채권 매입률 — 주택 소유권이전, 시가표준액(공시가격) 구간 [이상, 미만, 특별시·광역시 ‰, 그 밖 ‰]
  var BOND = [[20000000, 50000000, 13, 13], [50000000, 100000000, 19, 14], [100000000, 160000000, 21, 16], [160000000, 260000000, 23, 18], [260000000, 600000000, 26, 21], [600000000, Infinity, 31, 26]];
  // 인지세 — 부동산 소유권 이전 증서 기재금액 [초과, 이하, 세액]. 주택은 1억 이하 비과세
  var STAMP = [[10000000, 30000000, 20000], [30000000, 50000000, 40000], [50000000, 100000000, 70000], [100000000, 1000000000, 150000], [1000000000, Infinity, 350000]];
  var STAMP_FREE_HOUSE = 100000000;
  var FEE = { paper: 18000, eform: 15000, online: 10000 };   // 등기신청수수료 (부동산 1개)

  function bondRate(std, metro) { for (var k = 0; k < BOND.length; k++) if (std >= BOND[k][0] && std < BOND[k][1]) return metro ? BOND[k][2] : BOND[k][3]; return 0; }
  function bondAmount(x) {   // 1만원 미만 단수: 5천원 이상은 1만원, 미만은 버림
    var r = x % 10000; return x - r + (r >= 5000 ? 10000 : 0);
  }
  function stamp(price) {
    if (price <= STAMP_FREE_HOUSE) return 0;
    for (var k = 0; k < STAMP.length; k++) if (price > STAMP[k][0] && price <= STAMP[k][1]) return STAMP[k][2];
    return 0;
  }
  function calc(i) {
    var rate = bondRate(i.std, i.metro);
    var bond = bondAmount(Math.floor(i.std * rate / 1000));
    var bondCost = Math.floor(bond * i.discount / 100);
    var st = stamp(i.price), stMine = i.split ? st / 2 : st;
    var fee = FEE[i.method] || 0;
    var legal = bondCost + stMine + fee;
    return { rate: rate, bond: bond, bondCost: bondCost, stamp: st, stampMine: stMine, fee: fee, legal: legal, total: legal + i.acq + i.agent };
  }
  function readInput() {
    return { price: S.parseMoney($('price').value), std: S.parseMoney($('std').value), metro: $('region').value === 'metro', discount: Math.min(100, S.parseNonNegative($('discount').value)),
      method: $('method').value, split: $('split').checked, acq: S.parseMoney($('acq').value), agent: S.parseMoney($('agent').value) };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.price > 0 || i.std > 0;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-bond-cost', S.fmtWon(r.bondCost)); S.setText('out-stamp-mine', S.fmtWon(r.stampMine)); S.setText('out-fee', S.fmtWon(r.fee));
    S.setText('out-rate', r.rate); S.setText('out-bond', S.fmtWon(r.bond)); S.setText('out-bond-cost2', S.fmtWon(r.bondCost)); S.setText('out-stamp', S.fmtWon(r.stamp));
    S.setText('out-stamp-mine2', S.fmtWon(r.stampMine)); S.setText('out-fee2', S.fmtWon(r.fee)); S.setText('out-legal', S.fmtWon(r.legal)); S.setText('out-acq', S.fmtWon(i.acq)); S.setText('out-agent', S.fmtWon(i.agent));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '매매가격과 공시가격을 입력하면 바로 계산됩니다.' :
      (i.std > 0 && !r.rate ? '공시가격 2,000만원 미만은 국민주택채권을 사지 않습니다. ' : '공시가격 ' + S.fmtKorean(i.std) + '의 ' + r.rate + '/1,000인 ' + S.fmtKorean(r.bond) + '어치 채권을 사서 바로 팔면 할인율 ' + S.fmtRate(i.discount) + '%만큼 ' + S.fmtKorean(r.bondCost) + '을 부담합니다. ') +
      (r.stamp ? '인지세는 ' + (i.split ? '매도인과 반씩 내는 것으로 보았습니다. ' : '혼자 내는 것으로 보았습니다. ') : '매매가 1억원 이하 주택이라 인지세가 없습니다. ') +
      '할인율은 매일 바뀌니 등기하는 날 은행이나 주택도시기금 사이트에서 확인하세요.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('split').checked = true;
    S.wireCalc({
      key: 'registration-cost',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['price', 'std', 'acq', 'agent'].forEach(function (k) { $(k).value = ''; }); return; }
        var p = { s6: [600000000, 420000000, 'metro'], s9: [900000000, 630000000, 'metro'], l3: [300000000, 210000000, 'other'] }[name]; if (!p) return;
        S.setMoney('price', p[0]); S.setMoney('std', p[1]); $('region').value = p[2]; $('discount').value = '10'; $('method').value = 'eform'; $('split').checked = true; $('acq').value = ''; $('agent').value = '';
      },
      share: function () { return { title: '등기비용 계산 결과', text: '[등기비용] 매매 ' + S.fmtKorean(last.i.price) + ' · 공시 ' + S.fmtKorean(last.i.std) + '\n채권 부담 ' + S.fmtWon(last.r.bondCost) + '원 + 인지세 ' + S.fmtWon(last.r.stampMine) + '원 + 수수료 ' + S.fmtWon(last.r.fee) + '원' }; },
      card: function () {
        var r = last.r;
        return { file: 'registration-cost-result', title: '등기비용 계산기', kicker: '매매 ' + S.fmtKorean(last.i.price) + ' · 등기비용 합계', big: S.fmtWon(r.total), unit: '원',
          rows: [['국민주택채권 (' + r.rate + '/1,000)', S.fmtWon(r.bond) + '원 매입'], ['채권 할인 부담', S.fmtWon(r.bondCost) + '원'], ['인지세', S.fmtWon(r.stampMine) + '원'], ['등기신청수수료', S.fmtWon(r.fee) + '원']],
          note: RULES_DATE + '. 할인율은 매일 바뀝니다. 참고용입니다.' };
      }
    });
  });
})();
