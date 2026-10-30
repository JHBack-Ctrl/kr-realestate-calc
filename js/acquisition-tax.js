/* 취득세 계산기 — 유상 매매 기준 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 세율표 (상수. 지방세법 개정 시 이 블록만 수정) ----
  var RATE_DATE = '2026년 지방세법 기준 (유상 취득, 개인)';
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
  function won(n) { return Math.floor(n + 1e-6); }
  // 주택 부분 세율. 상가주택(겸용)은 주택 부분 가액으로 1~3% 구간을 정한다(지자체 해석에 따라 다를 수 있어 화면에 적음).
  function houseRates(price, i) {
    var cat = SITUATION[i.situation] || 'std';
    if (cat === 'std') { var t = stdRate(price); return { taxRate: t, eduRate: t * EDU_STD_FACTOR, ruralRate: i.large ? RURAL_STD : 0 }; }
    if (cat === 'heavy8') return { taxRate: HEAVY8, eduRate: EDU_HEAVY, ruralRate: i.large ? RURAL_HEAVY8 : 0 };
    return { taxRate: HEAVY12, eduRate: EDU_HEAVY, ruralRate: i.large ? RURAL_HEAVY12 : 0 };
  }
  function part(price, r) { return { price: price, taxRate: r.taxRate, eduRate: r.eduRate, ruralRate: r.ruralRate, tax: price * r.taxRate / 100, edu: price * r.eduRate / 100, rural: price * r.ruralRate / 100 }; }
  function calc(i) {
    // 상가주택은 취득가액을 주택 부분과 상가 부분으로 나눠 주택은 주택 세율, 상가는 주택 외 4%(+0.4%+0.2%)로 따로 계산해 더한다
    var housePrice = i.kind === 'house' ? i.price : i.kind === 'mixed' ? won(i.price * Math.min(100, Math.max(0, i.share)) / 100) : 0;
    var h = part(housePrice, houseRates(housePrice, i));
    var n = part(i.price - housePrice, { taxRate: NONHOUSE.tax, eduRate: NONHOUSE.edu, ruralRate: NONHOUSE.rural });
    var out = { house: h, shop: n, tax: h.tax + n.tax, edu: h.edu + n.edu, rural: h.rural + n.rural };
    out.taxRate = i.kind === 'nonhouse' ? n.taxRate : h.taxRate; out.eduRate = i.kind === 'nonhouse' ? n.eduRate : h.eduRate; out.ruralRate = i.kind === 'nonhouse' ? n.ruralRate : h.ruralRate;
    if (i.kind === 'nonhouse') out.kind = '주택 외 (토지·상가·업무용 오피스텔)';
    else if (i.kind === 'mixed') out.kind = '상가주택 · 주택 부분 ' + SITUATION_LABEL[i.situation];
    else out.kind = '주택 · ' + SITUATION_LABEL[i.situation];
    out.reduction = 0;
    if (i.kind !== 'nonhouse' && i.firstHome && housePrice > 0 && housePrice <= FIRST_HOME_PRICE_CAP && SITUATION[i.situation] === 'std') out.reduction = Math.min(h.tax, FIRST_HOME_CAP);
    out.total = out.tax - out.reduction + out.edu + out.rural;
    out.effective = i.price > 0 ? out.total / i.price * 100 : 0;
    return out;
  }
  function readInput() {
    var k = document.querySelector('input[name="kind"]:checked');
    var sh = parseFloat($('houseShare').value);
    return { kind: k ? k.value : 'house', price: S.parseMoney($('price').value), share: isNaN(sh) ? 0 : sh, large: $('large').checked, situation: $('situation').value, firstHome: $('firstHome').checked };
  }
  var last = null;
  function rateText(i, r, key) {
    // 상가주택은 주택 부분과 상가 부분 세율을 나란히 적는다 (예: 1.8 / 4)
    return i.kind === 'mixed' ? S.fmtRate(r.house[key]) + ' / ' + S.fmtRate(r.shop[key]) : S.fmtRate(r[key]);
  }
  function render(i) {
    var r = calc(i), mixed = i.kind === 'mixed';
    $('house-fields').hidden = i.kind === 'nonhouse';
    $('mixed-fields').hidden = !mixed; $('mixed-card').hidden = !mixed;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', S.fmtWon(r.total) + '원');
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('out-tax-rate', rateText(i, r, 'taxRate')); S.setText('out-edu', S.fmtWon(r.edu)); S.setText('out-edu-rate', rateText(i, r, 'eduRate'));
    S.setText('out-rural', S.fmtWon(r.rural)); S.setText('out-rural-rate', rateText(i, r, 'ruralRate'));
    S.setText('out-tax-d', S.fmtWon(r.tax)); S.setText('out-edu-d', S.fmtWon(r.edu)); S.setText('out-rural-d', S.fmtWon(r.rural)); S.setText('out-reduction', S.fmtWon(r.reduction)); S.setText('out-effective', S.fmtPct(r.effective));
    $('reduction-row').hidden = r.reduction <= 0;
    S.setText('out-kind', r.kind); S.setText('rate-date', RATE_DATE);
    [['house', r.house], ['shop', r.shop]].forEach(function (p) {
      var x = p[1];
      S.setText('out-' + p[0] + '-price', S.fmtWon(x.price)); S.setText('out-' + p[0] + '-rate', S.fmtRate(x.taxRate + x.eduRate + x.ruralRate)); S.setText('out-' + p[0] + '-sum', S.fmtWon(x.tax + x.edu + x.rural));
    });
    var note;
    if (!(i.price > 0)) note = '취득가액을 입력하면 바로 계산됩니다.';
    else if (mixed) note = '취득가액 ' + S.fmtKorean(i.price) + '을 주택 부분 ' + S.fmtKorean(r.house.price) + '(' + S.fmtRate(Math.min(100, Math.max(0, i.share))) + '%)과 상가 부분 ' + S.fmtKorean(r.shop.price) + '으로 나눴습니다. 주택 부분 취득세율 ' + S.fmtRate(r.house.taxRate) + '%는 주택 부분 가액으로 정했고, 상가 부분은 주택 수와 관계없이 4%입니다. 합계 실효세율 ' + S.fmtPct(r.effective) + '%.';
    else note = '취득가액 ' + S.fmtKorean(i.price) + ', ' + r.kind + ' 기준 취득세율 ' + S.fmtRate(r.taxRate) + '%. 합계 실효세율 ' + S.fmtPct(r.effective) + '%.';
    if (i.kind !== 'nonhouse' && i.firstHome && (r.house.price > FIRST_HOME_PRICE_CAP || SITUATION[i.situation] !== 'std')) note += ' 생애최초 감면은 12억 이하 주택을 표준세율로 취득할 때만 적용해 여기서는 반영하지 않았습니다.';
    if (i.kind !== 'nonhouse' && !i.large) note += mixed ? ' 주택 부분이 전용 85㎡ 이하라 주택분 농어촌특별세는 비과세입니다.' : ' 전용 85㎡ 이하라 농어촌특별세는 비과세입니다.';
    note += ' 참고용 추정이며 실제 세액은 위택스 신고 화면과 세무사 확인이 기준입니다.';
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'acquisition-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('price').value = ''; return; }
        var p = { house7: ['house', 700000000, 50], mixed12: ['mixed', 1200000000, 60] }[name]; if (!p) return;
        var radio = document.querySelector('input[name="kind"][value="' + p[0] + '"]'); if (radio) radio.checked = true;
        S.setMoney('price', p[1]); $('houseShare').value = p[2]; $('situation').value = 'one'; $('large').checked = false; $('firstHome').checked = false;
      },
      share: function () { return { title: '취득세 계산 결과', text: '[취득세 추정] ' + S.fmtKorean(last.i.price) + ' · ' + last.r.kind + (last.i.kind === 'mixed' ? ' (주택 ' + S.fmtKorean(last.r.house.price) + ' · 상가 ' + S.fmtKorean(last.r.shop.price) + ')' : '') + '\n취득세 ' + S.fmtWon(last.r.tax) + '원 + 지방교육세 ' + S.fmtWon(last.r.edu) + '원 + 농특세 ' + S.fmtWon(last.r.rural) + '원' + (last.r.reduction ? ' − 감면 ' + S.fmtWon(last.r.reduction) + '원' : '') + ' = ' + S.fmtWon(last.r.total) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        var i = last.i;
        var rows = [['취득세 (' + rateText(i, r, 'taxRate') + '%)', S.fmtWon(r.tax) + '원'], ['지방교육세 (' + rateText(i, r, 'eduRate') + '%)', S.fmtWon(r.edu) + '원'], ['농어촌특별세 (' + rateText(i, r, 'ruralRate') + '%)', S.fmtWon(r.rural) + '원']];
        if (i.kind === 'mixed') rows.unshift(['주택 부분 / 상가 부분', S.fmtKorean(r.house.price) + ' / ' + S.fmtKorean(r.shop.price)]);
        if (r.reduction) rows.push(['생애최초 감면', '−' + S.fmtWon(r.reduction) + '원']);
        rows.push(['실효세율', S.fmtPct(r.effective) + '%']);
        return { file: 'acquisition-tax-result', title: '취득세 계산기', kicker: '예상 취득 관련 세금 합계 · ' + r.kind, big: S.fmtWon(r.total), unit: '원', rows: rows, note: RATE_DATE + '. 참고용 추정이며 실제 세액은 신고 화면과 세무사 확인이 기준입니다.' };
      }
    });
  });
})();
