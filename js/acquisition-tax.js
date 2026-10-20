/* 취득세 계산기 — 유상 매매 기준 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 세율표 (상수. 지방세법 개정 시 이 블록만 수정) ----
  var RATE_DATE = '2025년 지방세법 기준 (유상 취득, 개인)';
  var STD_LOW = 1.0, STD_HIGH = 3.0;              // 주택 표준세율: 6억 이하 1%, 9억 초과 3%, 6~9억은 비례
  var STD_LOW_CAP = 600000000, STD_HIGH_FLOOR = 900000000;
  var HEAVY8 = 8.0, HEAVY12 = 12.0;              // 중과세율
  var EDU_STD_FACTOR = 0.1;                       // 지방교육세: 표준세율의 10% (0.1~0.3%)
  var EDU_HEAVY = 0.4;                            // 중과 시 지방교육세
  var RURAL_STD = 0.2, RURAL_HEAVY8 = 0.6, RURAL_HEAVY12 = 1.0; // 농어촌특별세 (전용 85㎡ 초과 시)
  var NONHOUSE = { tax: 4.0, edu: 0.4, rural: 0.2 }; // 토지·상가·업무용 오피스텔
  var FIRST_HOME_CAP = 2000000;                   // 생애최초 감면 한도 (취득세)
  var FIRST_HOME_PRICE_CAP = 1200000000;          // 생애최초 감면 대상 가액 (12억 이하)

  var SITUATION = { one: 'std', nonadj2: 'std', adj2: 'heavy8', nonadj3: 'heavy8', adj3: 'heavy12', nonadj4: 'heavy12', corp: 'heavy12' };
  var SITUATION_LABEL = { one: '1주택 (또는 일시적 2주택)', nonadj2: '비조정지역 2주택', adj2: '조정대상지역 2주택', nonadj3: '비조정지역 3주택', adj3: '조정대상지역 3주택 이상', nonadj4: '비조정지역 4주택 이상', corp: '법인' };

  function stdRate(price) {
    if (price <= STD_LOW_CAP) return STD_LOW;
    if (price > STD_HIGH_FLOOR) return STD_HIGH;
    // 6억 초과 9억 이하: (취득가액 × 2/3억 − 3) / 100. 지방세법 제11조 제1항 제8호 나목에 따라
    // 소수점 이하 다섯째 자리에서 반올림해 넷째 자리까지 → %로는 둘째 자리(8억 = 2.33%).
    // %×100 = 취득가액 ÷ 150만 − 300 으로 계산해 .5 경계에서 부동소수 오차로 내림되지 않게 한다.
    return Math.round(price / 1500000 - 300 + 1e-9) / 100;
  }
  function calc(i) {
    var out = { taxRate: 0, eduRate: 0, ruralRate: 0, kind: '' };
    if (i.kind === 'nonhouse') { out.taxRate = NONHOUSE.tax; out.eduRate = NONHOUSE.edu; out.ruralRate = NONHOUSE.rural; out.kind = '주택 외 (토지·상가·업무용 오피스텔)'; }
    else {
      var cat = SITUATION[i.situation] || 'std';
      if (cat === 'std') { out.taxRate = stdRate(i.price); out.eduRate = out.taxRate * EDU_STD_FACTOR; out.ruralRate = i.large ? RURAL_STD : 0; }
      else if (cat === 'heavy8') { out.taxRate = HEAVY8; out.eduRate = EDU_HEAVY; out.ruralRate = i.large ? RURAL_HEAVY8 : 0; }
      else { out.taxRate = HEAVY12; out.eduRate = EDU_HEAVY; out.ruralRate = i.large ? RURAL_HEAVY12 : 0; }
      out.kind = '주택 · ' + SITUATION_LABEL[i.situation];
    }
    out.tax = i.price * out.taxRate / 100; out.edu = i.price * out.eduRate / 100; out.rural = i.price * out.ruralRate / 100;
    out.reduction = 0;
    if (i.kind === 'house' && i.firstHome && i.price <= FIRST_HOME_PRICE_CAP && SITUATION[i.situation] === 'std') out.reduction = Math.min(out.tax, FIRST_HOME_CAP);
    out.total = out.tax - out.reduction + out.edu + out.rural;
    out.effective = i.price > 0 ? out.total / i.price * 100 : 0;
    return out;
  }
  function readInput() {
    var k = document.querySelector('input[name="kind"]:checked');
    return { kind: k ? k.value : 'house', price: S.parseMoney($('price').value), large: $('large').checked, situation: $('situation').value, firstHome: $('firstHome').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i);
    $('house-fields').hidden = i.kind !== 'house';
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', S.fmtWon(r.total) + '원');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-tax-rate', S.fmtRate(r.taxRate)); S.setText('out-edu', S.fmtWon(r.edu)); S.setText('out-edu-rate', S.fmtRate(r.eduRate));
    S.setText('out-rural', S.fmtWon(r.rural)); S.setText('out-rural-rate', S.fmtRate(r.ruralRate));
    S.setText('out-tax-d', S.fmtWon(r.tax)); S.setText('out-edu-d', S.fmtWon(r.edu)); S.setText('out-rural-d', S.fmtWon(r.rural)); S.setText('out-reduction', S.fmtWon(r.reduction)); S.setText('out-effective', S.fmtPct(r.effective));
    $('reduction-row').hidden = r.reduction <= 0;
    S.setText('out-kind', r.kind); S.setText('rate-date', RATE_DATE);
    var note = i.price > 0 ? '취득가액 ' + S.fmtKorean(i.price) + ', ' + r.kind + ' 기준 취득세율 ' + S.fmtRate(r.taxRate) + '%. 합계 실효세율 ' + S.fmtPct(r.effective) + '%.' : '취득가액을 입력하면 바로 계산됩니다.';
    if (i.kind === 'house' && i.firstHome && (i.price > FIRST_HOME_PRICE_CAP || SITUATION[i.situation] !== 'std')) note += ' 생애최초 감면은 12억 이하 주택을 표준세율로 취득할 때만 적용해 여기서는 반영하지 않았습니다.';
    if (i.kind === 'house' && !i.large) note += ' 전용 85㎡ 이하라 농어촌특별세는 비과세입니다.';
    note += ' 참고용 추정이며 실제 세액은 위택스 신고 화면과 세무사 확인이 기준입니다.';
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'acquisition-tax',
      recalc: function () { render(readInput()); },
      share: function () { return { title: '취득세 계산 결과', text: '[취득세 추정] ' + S.fmtKorean(last.i.price) + ' · ' + last.r.kind + '\n취득세 ' + S.fmtWon(last.r.tax) + '원 + 지방교육세 ' + S.fmtWon(last.r.edu) + '원 + 농특세 ' + S.fmtWon(last.r.rural) + '원' + (last.r.reduction ? ' − 감면 ' + S.fmtWon(last.r.reduction) + '원' : '') + ' = ' + S.fmtWon(last.r.total) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        var rows = [['취득세 (' + S.fmtRate(r.taxRate) + '%)', S.fmtWon(r.tax) + '원'], ['지방교육세 (' + S.fmtRate(r.eduRate) + '%)', S.fmtWon(r.edu) + '원'], ['농어촌특별세 (' + S.fmtRate(r.ruralRate) + '%)', S.fmtWon(r.rural) + '원']];
        if (r.reduction) rows.push(['생애최초 감면', '−' + S.fmtWon(r.reduction) + '원']);
        rows.push(['실효세율', S.fmtPct(r.effective) + '%']);
        return { file: 'acquisition-tax-result', title: '취득세 계산기', kicker: '예상 취득 관련 세금 합계 · ' + r.kind, big: S.fmtWon(r.total), unit: '원', rows: rows, note: RATE_DATE + '. 참고용 추정이며 실제 세액은 신고 화면과 세무사 확인이 기준입니다.' };
      }
    });
  });
})();
