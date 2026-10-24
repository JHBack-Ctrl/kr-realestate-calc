/* 재산세 계산기 (주택) — 공시가격으로 재산세·도시지역분·지방교육세 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (지방세법. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 지방세법 기준 (주택, 2026-10 확인)';
  var FMV_GENERAL = 60;                                  // 공정시장가액비율 (일반)
  var FMV_ONEHOME = [[300000000, 43], [600000000, 44], [Infinity, 45]]; // 1세대 1주택 특례 (공시가격 구간별, 2026년 유지)
  // 표준세율: [과세표준 상한, 세율%, 누진공제]. 6천만 이하 0.1%, 1.5억 이하 6만+0.15%, 3억 이하 19.5만+0.25%, 초과 57만+0.4%
  var RATES = [[60000000, 0.1, 0], [150000000, 0.15, 30000], [300000000, 0.25, 180000], [Infinity, 0.4, 630000]];
  // 1세대 1주택 특례세율(공시가격 9억 이하): 표준세율에서 구간마다 0.05%p 낮춤
  var RATES_ONEHOME = [[60000000, 0.05, 0], [150000000, 0.1, 30000], [300000000, 0.2, 180000], [Infinity, 0.35, 630000]];
  var ONEHOME_RATE_PRICE_CAP = 900000000;
  var URBAN_RATE = 0.14;                                 // 도시지역분: 과세표준 × 0.14%
  var EDU_RATE = 20;                                     // 지방교육세: 재산세(도시지역분 제외)의 20%
  var JULY_ONLY_CAP = 200000;                            // 주택분 재산세가 20만원 이하면 7월에 한 번에

  function floor10(n) { return Math.floor(n / 10 + 1e-6) * 10; }   // 지방세는 10원 미만 버림. 1e-6은 0.1%×금액 같은 곱셈의 부동소수 오차로 한 단위 내려가는 것을 막는다
  function progressive(base, table) {
    if (base <= 0) return { tax: 0, rate: 0 };
    for (var k = 0; k < table.length; k++) if (base <= table[k][0]) return { tax: Math.max(0, base * table[k][1] / 100 - table[k][2]), rate: table[k][1] };
  }
  function fmvRatio(price, oneHome) {
    if (!oneHome) return FMV_GENERAL;
    for (var k = 0; k < FMV_ONEHOME.length; k++) if (price <= FMV_ONEHOME[k][0]) return FMV_ONEHOME[k][1];
  }
  function calc(i) {
    var ratio = fmvRatio(i.price, i.oneHome);
    var base = floor10(i.price * ratio / 100);
    var special = i.oneHome && i.price <= ONEHOME_RATE_PRICE_CAP;
    var p = progressive(base, special ? RATES_ONEHOME : RATES);
    var tax = floor10(p.tax), urban = i.urban ? floor10(base * URBAN_RATE / 100) : 0, edu = floor10(tax * EDU_RATE / 100);
    var total = tax + urban + edu;
    var julyOnly = tax <= JULY_ONLY_CAP;
    return { ratio: ratio, base: base, special: special, rate: p.rate, tax: tax, urban: urban, edu: edu, total: total, julyOnly: julyOnly,
      july: julyOnly ? total : floor10(total / 2), sept: julyOnly ? 0 : total - floor10(total / 2), effective: i.price > 0 ? total / i.price * 100 : 0 };
  }
  function readInput() { return { price: S.parseMoney($('price').value), oneHome: $('oneHome').checked, urban: $('urban').checked }; }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.price > 0;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-july', S.fmtWon(r.july)); S.setText('out-sept', S.fmtWon(r.sept)); S.setText('out-effective', S.fmtPct(r.effective));
    S.setText('out-ratio', r.ratio); S.setText('out-base', S.fmtWon(r.base)); S.setText('out-rate-kind', r.special ? '1세대 1주택 특례세율' : '표준세율');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-urban', S.fmtWon(r.urban)); S.setText('out-edu', S.fmtWon(r.edu));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', has ? '공시가격 ' + S.fmtKorean(i.price) + ' × 공정시장가액비율 ' + r.ratio + '% = 과세표준 ' + S.fmtKorean(r.base) + '. ' + (r.special ? '공시가격 9억원 이하 1세대 1주택이라 특례세율을 적용했습니다. ' : (i.oneHome ? '공시가격 9억원을 넘어 비율 특례만 받고 표준세율을 적용했습니다. ' : '')) +
      (r.julyOnly ? '재산세가 20만원 이하라 7월에 한 번에 냅니다.' : '7월과 9월에 절반씩 냅니다.') + ' 세부담상한·감면·지역자원시설세는 반영하지 않은 참고용 추정입니다.' : '주택 공시가격을 입력하면 바로 계산됩니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('oneHome').checked = true; $('urban').checked = true;   // 기본: 1세대 1주택, 도시지역
    S.wireCalc({
      key: 'property-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('price').value = ''; return; }
        S.setMoney('price', { p3: 300000000, p6: 600000000, p9: 900000000 }[name] || 0); $('oneHome').checked = true; $('urban').checked = true;
      },
      share: function () { return { title: '재산세 계산 결과', text: '[재산세 추정] 공시가격 ' + S.fmtKorean(last.i.price) + (last.i.oneHome ? ' · 1세대 1주택' : '') + '\n재산세 ' + S.fmtWon(last.r.tax) + '원 + 도시지역분 ' + S.fmtWon(last.r.urban) + '원 + 지방교육세 ' + S.fmtWon(last.r.edu) + '원 = ' + S.fmtWon(last.r.total) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'property-tax-result', title: '재산세 계산기', kicker: '공시가격 ' + S.fmtKorean(last.i.price) + ' · 연 재산세 합계', big: S.fmtWon(r.total), unit: '원',
          rows: [['과세표준 (공정시장가액비율 ' + r.ratio + '%)', S.fmtWon(r.base) + '원'], ['재산세 (' + (r.special ? '특례세율' : '표준세율') + ')', S.fmtWon(r.tax) + '원'], ['도시지역분', S.fmtWon(r.urban) + '원'], ['지방교육세', S.fmtWon(r.edu) + '원'], ['7월 / 9월', S.fmtWon(r.july) + ' / ' + S.fmtWon(r.sept) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 고지서와 다를 수 있습니다.' };
      }
    });
  });
})();
