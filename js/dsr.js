/* DSR·LTV 대출 한도 계산기 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 기본값 (규제는 자주 바뀌므로 화면에서 모두 수정 가능) ----
  // 스트레스 가산 기본값은 수도권·규제지역 변동금리 주담대 기준(2025-10-15 대책으로 하한 3.0%p). 지방은 1.5%p × 50% = 0.75%p (2026년 하반기)
  var DEFAULT_LTV = 70, DEFAULT_DSR = 40, DEFAULT_STRESS = 3.0, DEFAULT_RATE = 4.5, DEFAULT_YEARS = 30;
  var PRESETS = {   // 예시 버튼. 규제지역 LTV 40%·금액 상한(시가 15억 이하 6억, 25억 이하 4억, 초과 2억)은 2025-10-15 대책 기준
    local: { income: 60000000, value: 600000000, ltv: 70, stress: 0.75, cap: 0, existing: 3000000 },
    reg: { income: 80000000, value: 1000000000, ltv: 40, stress: 3.0, cap: 600000000, existing: 0 }
  };

  // 원리금균등: 원금 1원당 월 상환액
  function pmtPerWon(annualRate, months) {
    var r = annualRate / 12 / 100;
    if (months <= 0) return 0;
    if (r <= 0) return 1 / months;
    return r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  }

  function readInput() {
    return { income: S.parseMoney($('income').value), value: S.parseMoney($('value').value), ltv: S.parseNonNegative($('ltv').value), senior: S.parseMoney($('senior').value),
      existing: S.parseMoney($('existing').value), rate: S.parseNonNegative($('rate').value), years: Math.floor(S.parseNonNegative($('years').value)) || 0,
      stress: S.parseNonNegative($('stress').value), dsr: S.parseNonNegative($('dsr').value), cap: S.parseMoney($('cap').value) };
  }
  var last = null;
  function render(i) {
    var months = i.years * 12;
    var ltvLimit = Math.max(0, i.value * i.ltv / 100 - i.senior);
    var allowedAnnual = Math.max(0, i.income * i.dsr / 100 - i.existing);
    var kStress = pmtPerWon(i.rate + i.stress, months);
    var dsrLimit = kStress > 0 ? allowedAnnual / (12 * kStress) : 0;
    var capLimit = i.cap > 0 ? i.cap : Infinity;   // 금액 상한: 비우면 적용하지 않는다
    var limit = Math.min(ltvLimit, dsrLimit, capLimit);
    var binding = capLimit < Math.min(ltvLimit, dsrLimit) ? '금액 상한' : (ltvLimit <= dsrLimit ? 'LTV' : 'DSR');
    var monthlyActual = limit * pmtPerWon(i.rate, months);
    var dsrAfter = i.income > 0 ? (i.existing + 12 * limit * kStress) / i.income * 100 : 0;

    S.setText('out-limit', S.fmtWon(limit)); S.setText('sticky-monthly', S.fmtWon(limit) + '원');
    S.setText('out-ltv', S.fmtWon(ltvLimit)); S.setText('out-dsr', S.fmtWon(dsrLimit));
    S.setText('out-monthly', S.fmtWon(monthlyActual)); S.setText('out-dsr-after', S.fmtPct(dsrAfter));
    S.setText('out-binding', i.value > 0 || i.income > 0 ? binding + ' 기준이 더 낮아 한도를 결정합니다' : '');
    S.setText('bd-ltv-formula', S.fmtKorean(i.value) + ' × ' + S.fmtRate(i.ltv) + '% − 선순위 ' + S.fmtKorean(i.senior));
    S.setText('bd-dsr-formula', '연소득 ' + S.fmtKorean(i.income) + ' × ' + S.fmtRate(i.dsr) + '% − 기존 연 상환 ' + S.fmtKorean(i.existing) + ' = 신규 연 상환 여력 ' + S.fmtKorean(allowedAnnual));
    S.setText('bd-cap', i.cap > 0 ? S.fmtKorean(i.cap) + (binding === '금액 상한' ? ' — LTV·DSR 한도보다 낮아 이 금액이 한도입니다' : ' — LTV·DSR 한도가 더 낮아 영향 없음') : '입력하지 않음 (수도권·규제지역 주담대는 집값에 따라 6억·4억·2억 상한)');
    S.setText('bd-stress', '스트레스 금리 ' + S.fmtRate(i.rate + i.stress) + '% (실제 ' + S.fmtRate(i.rate) + '% + 가산 ' + S.fmtRate(i.stress) + '%p), ' + i.years + '년 원리금균등 가정');
    S.setText('out-note', i.income > 0 && i.value > 0 ? '한도 중 가장 낮은 ' + S.fmtKorean(limit) + '까지 가능한 것으로 계산됩니다. 실제 금리 ' + S.fmtRate(i.rate) + '% 기준 월 상환액은 약 ' + S.fmtWon(monthlyActual) + '원이며, 이때 DSR은 ' + S.fmtPct(dsrAfter) + '%입니다. 은행별 심사 기준, 신용도, 지역 규제에 따라 실제 한도는 달라집니다.' : '연소득과 담보 시세를 입력하면 바로 계산됩니다.');
    last = { i: i, limit: limit, ltvLimit: ltvLimit, dsrLimit: dsrLimit, monthlyActual: monthlyActual, dsrAfter: dsrAfter, binding: binding };
  }
  S.ready(function () {
    $('ltv').value = DEFAULT_LTV; $('dsr').value = DEFAULT_DSR; $('stress').value = DEFAULT_STRESS.toFixed(1); $('rate').value = DEFAULT_RATE.toFixed(1); $('years').value = DEFAULT_YEARS;
    S.wireCalc({
      key: 'dsr',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['income', 'value', 'cap'].forEach(function (id) { $(id).value = ''; }); ['senior', 'existing'].forEach(function (id) { $(id).value = '0'; }); $('ltv').value = DEFAULT_LTV; $('stress').value = DEFAULT_STRESS.toFixed(1); return; }
        var p = PRESETS[name]; if (!p) return;
        S.setMoney('income', p.income); S.setMoney('value', p.value); $('ltv').value = p.ltv; $('stress').value = p.stress; S.setMoney('senior', 0); S.setMoney('existing', p.existing);
        if (p.cap) S.setMoney('cap', p.cap); else $('cap').value = '';
      },
      share: function () { return { title: '대출 한도 계산 결과', text: '[DSR·LTV 한도] 연소득 ' + S.fmtKorean(last.i.income) + ' · 담보 ' + S.fmtKorean(last.i.value) + '\nLTV 한도 ' + S.fmtKorean(last.ltvLimit) + ' · DSR 한도 ' + S.fmtKorean(last.dsrLimit) + ' → 예상 한도 ' + S.fmtKorean(last.limit) }; },
      card: function () {
        return { file: 'dsr-result', title: 'DSR·LTV 대출 한도 계산기', kicker: '예상 대출 한도 (' + last.binding + ' 기준)', big: S.fmtWon(last.limit), unit: '원',
          rows: [['LTV 한도', S.fmtWon(last.ltvLimit) + '원'], ['DSR 한도', S.fmtWon(last.dsrLimit) + '원'], ['월 상환액 (실제 금리)', S.fmtWon(last.monthlyActual) + '원'], ['대출 후 DSR', S.fmtPct(last.dsrAfter) + '%']],
          note: '입력한 LTV·DSR 비율과 스트레스 가산에 따른 산술 결과입니다. 실제 한도는 은행 심사에 따라 다릅니다.' };
      }
    });
  });
})();
