/* 전월세 전환율 계산기 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (기준일 표시. 기준금리는 한국은행 발표 시 갱신) ----
  var BASE_RATE_DEFAULT = 3.25;      // 한국은행 기준금리 (%) — 화면에서 수정 가능
  var BASE_RATE_DATE = '2026년 11월 26일 결정';
  var LEGAL_SPREAD = 2.0;            // 주택임대차보호법 시행령: 기준금리 + 2%p
  var LEGAL_CAP = 10.0;              // 연 10% 상한
  var MARKET_RATE_DEFAULT = 5.5;     // 시장 전환율 예시 (%) — 참고용

  function legalRate(base) { return Math.min(LEGAL_CAP, base + LEGAL_SPREAD); }

  function readInput() {
    var m = document.querySelector('input[name="mode"]:checked');
    return { mode: m ? m.value : 'j2m', jeonse: S.parseMoney($('jeonse').value), deposit: S.parseMoney($('deposit').value), rent: S.parseMoney($('rent').value),
      base: S.parseNonNegative($('baseRate').value), market: S.parseNonNegative($('marketRate').value) };
  }
  function convert(i, rate) {
    var f = rate / 100;
    if (i.mode === 'j2m') { var diff = Math.max(0, i.jeonse - i.deposit); return { rent: diff * f / 12, jeonse: null, diff: diff }; }
    if (f <= 0) return { rent: null, jeonse: null };
    return { rent: null, jeonse: i.deposit + i.rent * 12 / f };
  }
  var last = null;
  function render(i) {
    var lr = legalRate(i.base), L = convert(i, lr), M = convert(i, i.market);
    $('j2m-fields').hidden = i.mode !== 'j2m'; $('m2j-fields').hidden = i.mode !== 'm2j';
    S.setText('out-legal-rate', S.fmtRate(lr)); S.setText('out-market-rate', S.fmtRate(i.market));
    S.setText('legal-formula', '기준금리 ' + S.fmtRate(i.base) + '% + ' + S.fmtRate(LEGAL_SPREAD) + '%p = ' + S.fmtRate(i.base + LEGAL_SPREAD) + '%' + (i.base + LEGAL_SPREAD > LEGAL_CAP ? ' → 상한 ' + LEGAL_CAP + '% 적용' : ''));
    if (i.mode === 'j2m') {
      S.setText('out-kicker', '법정 전환율로 환산한 월세 (월)');
      S.setText('out-big', S.fmtWon(L.rent)); S.setText('out-unit', '원'); S.setText('sticky-monthly', S.fmtWon(L.rent) + '원');
      S.setText('out-legal', S.fmtWon(L.rent) + '원 / 월'); S.setText('out-market', S.fmtWon(M.rent) + '원 / 월');
      S.setText('out-diff', '전환 대상 금액 ' + S.fmtKorean(L.diff) + ' (전세보증금 − 월세보증금)');
      S.setText('out-note', i.jeonse > 0 ? '전세보증금 ' + S.fmtKorean(i.jeonse) + ' 중 ' + S.fmtKorean(i.deposit) + '를 보증금으로 남기고 나머지를 월세로 바꿀 때의 금액입니다. 법정 전환율은 기존 계약을 갱신하며 전세를 월세로 바꿀 때 적용되는 상한이며, 신규 계약에는 강제되지 않습니다.' : '전세보증금과 남길 월세보증금을 입력하세요.');
    } else {
      S.setText('out-kicker', '법정 전환율로 환산한 전세보증금');
      S.setText('out-big', L.jeonse == null ? '—' : S.fmtWon(L.jeonse)); S.setText('out-unit', '원'); S.setText('sticky-monthly', (L.jeonse == null ? '—' : S.fmtWon(L.jeonse)) + '원');
      S.setText('out-legal', L.jeonse == null ? '—' : S.fmtWon(L.jeonse) + '원'); S.setText('out-market', M.jeonse == null ? '—' : S.fmtWon(M.jeonse) + '원');
      S.setText('out-diff', '월세 연 ' + S.fmtKorean(i.rent * 12) + '를 전환율로 나눈 금액에 보증금을 더했습니다');
      S.setText('out-note', i.rent > 0 ? '월세 ' + S.fmtWon(i.rent) + '원과 보증금 ' + S.fmtKorean(i.deposit) + '를 전세로 바꾸면 얼마인지 역산한 값입니다. 전환율이 낮을수록 전세금이 커집니다.' : '월세와 보증금을 입력하세요.');
    }
    last = { i: i, lr: lr, L: L, M: M };
  }
  S.ready(function () {
    $('baseRate').value = BASE_RATE_DEFAULT.toFixed(2); $('marketRate').value = MARKET_RATE_DEFAULT.toFixed(1);
    S.setText('base-date', BASE_RATE_DATE);
    S.wireCalc({
      key: 'conversion',
      recalc: function () { render(readInput()); },
      share: function () {
        var i = last.i, L = last.L;
        return { title: '전월세 전환 계산 결과', text: i.mode === 'j2m' ? '[전월세 전환] 전세 ' + S.fmtKorean(i.jeonse) + ' → 보증금 ' + S.fmtKorean(i.deposit) + ' + 월세 ' + S.fmtWon(L.rent) + '원 (법정 ' + S.fmtRate(last.lr) + '%)' : '[전월세 전환] 보증금 ' + S.fmtKorean(i.deposit) + ' + 월세 ' + S.fmtWon(i.rent) + '원 → 전세 ' + (L.jeonse == null ? '—' : S.fmtKorean(L.jeonse)) + ' (법정 ' + S.fmtRate(last.lr) + '%)' };
      },
      card: function () {
        var i = last.i, L = last.L, M = last.M;
        return { file: 'conversion-result', title: '전월세 전환율 계산기', kicker: i.mode === 'j2m' ? '법정 전환율 적용 월세' : '법정 전환율 적용 전세보증금',
          big: i.mode === 'j2m' ? S.fmtWon(L.rent) : (L.jeonse == null ? '—' : S.fmtWon(L.jeonse)), unit: '원',
          rows: [['법정 전환율', S.fmtRate(last.lr) + '% (기준금리 ' + S.fmtRate(i.base) + '% + 2%p)'], ['시장 전환율 ' + S.fmtRate(i.market) + '% 적용 시', i.mode === 'j2m' ? S.fmtWon(M.rent) + '원 / 월' : (M.jeonse == null ? '—' : S.fmtWon(M.jeonse) + '원')]],
          note: '법정 전환율은 계약 갱신 시 전세→월세 전환 상한입니다. 신규 계약에는 적용되지 않습니다.' };
      }
    });
  });
})();
