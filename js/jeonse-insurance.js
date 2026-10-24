/* 전세보증금 반환보증 가입 자가진단 — HUG 전세보증금반환보증 기준을 상수로 두고 요건별로 판정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 기준 HUG 전세보증금반환보증 안내';
  var DEPOSIT_CAP = { metro: 700000000, other: 500000000 }; // 보증금 한도: 수도권 7억, 그 외 5억
  var LTV_CAP = 90;            // 담보인정비율: 보증금 + 선순위채권 ≤ 주택가격 × 90%
  var SENIOR_CAP = 60;         // 선순위채권 ≤ 주택가격 × 60%
  var MIN_TERM_MONTHS = 12;    // 계약기간 1년 이상
  var APPLY_BEFORE_HALF = true; // 계약기간 1/2 경과 전 신청
  var HUG_URL = 'https://www.khug.or.kr';

  function readInput() {
    return { region: $('region').value, price: S.parseMoney($('price').value), deposit: S.parseMoney($('deposit').value), senior: S.parseMoney($('senior').value), multi: S.parseMoney($('multi').value),
      term: Math.floor(S.parseNonNegative($('term').value)) || 0, elapsed: Math.floor(S.parseNonNegative($('elapsed').value)) || 0,
      registered: $('registered').checked, broker: $('broker').checked, seizure: $('seizure').checked, owner: $('owner').checked };
  }
  var last = null;

  function render(i) {
    var items = [], fail = 0, warn = 0;
    function add(ok, name, desc) { items.push({ ok: ok, name: name, desc: desc }); if (ok === false) fail++; if (ok === null) warn++; }
    var cap = DEPOSIT_CAP[i.region] || DEPOSIT_CAP.other;
    add(i.deposit > 0 ? i.deposit <= cap : null, '보증금 한도 ' + S.fmtKorean(cap) + ' 이하', i.deposit > 0 ? '보증금 ' + S.fmtKorean(i.deposit) : '보증금을 입력하세요');
    var seniorAll = i.senior + i.multi;
    var maxDeposit = i.price > 0 ? Math.max(0, i.price * LTV_CAP / 100 - seniorAll) : 0;
    add(i.price > 0 && i.deposit > 0 ? i.deposit + seniorAll <= i.price * LTV_CAP / 100 : null, '보증금 + 선순위채권이 주택가격의 ' + LTV_CAP + '% 이내', i.price > 0 ? '가능 보증금 상한 약 ' + S.fmtWon(maxDeposit) + '원 (주택가격 ' + S.fmtKorean(i.price) + ' × ' + LTV_CAP + '% − 선순위 ' + S.fmtKorean(seniorAll) + ')' : '주택가격을 입력하세요');
    add(i.price > 0 ? seniorAll <= i.price * SENIOR_CAP / 100 : null, '선순위채권이 주택가격의 ' + SENIOR_CAP + '% 이내', '근저당 채권최고액과 다가구 선순위 보증금을 합해 ' + S.fmtKorean(seniorAll));
    add(i.term > 0 ? i.term >= MIN_TERM_MONTHS : null, '계약기간 ' + MIN_TERM_MONTHS / 12 + '년 이상', i.term > 0 ? i.term + '개월' : '계약기간을 입력하세요');
    add(i.term > 0 ? i.elapsed * 2 < i.term : null, '계약기간 절반이 지나기 전 신청', i.term > 0 ? '경과 ' + i.elapsed + '개월 / 계약 ' + i.term + '개월 (절반 ' + (i.term / 2) + '개월)' : '');
    add(i.registered ? true : false, '전입신고와 확정일자', i.registered ? '완료' : '잔금·입주 후 바로 하세요. 대항력이 있어야 가입할 수 있습니다');
    add(i.broker ? true : false, '공인중개사가 날인한 계약서', i.broker ? '충족' : '직거래 계약은 가입이 제한될 수 있습니다');
    add(i.seizure ? false : true, '등기부에 압류·가압류·가처분·경매 없음', i.seizure ? '권리침해가 있으면 가입할 수 없습니다' : '을구·갑구 확인 완료');
    add(i.owner ? false : true, '임대인이 보증 사고 이력·신용 제한 대상 아님', i.owner ? 'HUG 보증금지 임대인이면 가입 불가. 안심전세앱에서 조회' : '안심전세앱·HUG에서 임대인 조회 권장');
    // 주택가격·보증금을 넣기 전에는 판정하지 않는다(빈 화면에 '가입 어려움'이 뜨던 것)
    var verdict = !(i.price > 0 && i.deposit > 0) ? '—' : fail > 0 ? '가입 어려움' : (warn > 0 ? '확인 필요' : '가입 가능성 높음');
    S.setText('out-big', verdict); S.setText('sticky-monthly', verdict);
    S.setText('out-max', S.fmtWon(maxDeposit)); S.setText('out-fail', String(fail)); S.setText('out-warn', String(warn));
    var ul = $('judge-list'); ul.innerHTML = '';
    items.forEach(function (it) {
      var li = document.createElement('li');
      var mark = it.ok === true ? '<span class="ok-mark">충족</span>' : (it.ok === false ? '<span class="bad-mark">미충족</span>' : '<span class="warn-mark">확인</span>');
      li.innerHTML = '<p class="t">' + mark + ' ' + it.name + '</p><p class="d">' + it.desc + '</p>';
      ul.appendChild(li);
    });
    S.setText('out-note', fail > 0 ? '미충족 항목이 ' + fail + '개 있습니다. 보증금을 낮추거나 선순위 채권을 말소하는 조건을 계약 특약에 넣는 방법이 있습니다.' : (warn > 0 ? '입력하지 않은 항목이 있습니다. 모두 채우면 판정이 정확해집니다.' : '기본 요건은 갖춘 것으로 보입니다. 실제 심사는 HUG·SGI·HF 상품별로 다르니 신청 전 확인하세요.'));
    S.setText('rules-date', RULES_DATE);
    last = { i: i, items: items, verdict: verdict, maxDeposit: maxDeposit, fail: fail, warn: warn };
  }

  S.ready(function () {
    var link = $('hug-link'); if (link) link.href = HUG_URL;
    S.wireCalc({
      key: 'jeonse-insurance',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['price', 'deposit', 'senior', 'multi'].forEach(function (k) { S.setMoney(k, 0); }); $('term').value = ''; $('elapsed').value = ''; return; }
        S.setMoney('price', 500000000); S.setMoney('deposit', name === 'risky' ? 430000000 : 350000000); S.setMoney('senior', name === 'risky' ? 100000000 : 0); $('term').value = 24; $('elapsed').value = 1; $('registered').checked = true; $('broker').checked = true;
      },
      share: function () { return { title: '전세보증보험 자가진단', text: '[전세보증보험 자가진단] ' + last.verdict + ' · 가능 보증금 상한 약 ' + S.fmtWon(last.maxDeposit) + '원 · 미충족 ' + last.fail + '개' }; },
      card: function () {
        return { file: 'jeonse-insurance-result', title: '전세보증보험 자가진단', kicker: '가입 가능 여부 (참고)', big: last.verdict, unit: '',
          rows: last.items.slice(0, 6).map(function (it) { return [it.name, it.ok === true ? '충족' : (it.ok === false ? '미충족' : '확인 필요')]; }),
          note: RULES_DATE + '. 실제 가입 여부는 보증기관 심사로 정해집니다.' };
      }
    });
  });
})();
