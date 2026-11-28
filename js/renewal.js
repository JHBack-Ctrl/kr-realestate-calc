/* 계약 갱신 청구권 · 임대료 5% 상한 계산기
   법정 기간·상한 등 바뀌는 값은 아래 상수에만 있다. */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 기준 주택임대차보호법';
  var WINDOW_START_MONTHS = 6;   // 만기 6개월 전부터 갱신 요구 가능
  var WINDOW_END_MONTHS_NEW = 2; // 만기 2개월 전까지 (2020-12-10 이후 체결·갱신된 계약)
  var WINDOW_END_MONTHS_OLD = 1; // 만기 1개월 전까지 (그 전 계약)
  var WINDOW_CUTOFF = '2020-12-10';
  var RAISE_CAP = 5;             // 갱신 시 증액 상한 %
  var DEFAULT_MONTHS = 24;       // 기본 계약 기간
  var BASE_RATE_DEFAULT = 3.25, CONV_ADD = 2.0, CONV_CAP = 10; // 법정 전환율 = 기준금리 + 2%p (상한 10%)
  var TENANT_TERMINATE_MONTHS = 3; // 묵시적 갱신 후 임차인 해지 통지 → 3개월 뒤 효력

  function readInput() {
    return { start: S.parseDate($('start').value), months: Math.floor(S.parseNonNegative($('months').value)) || 0,
      deposit: S.parseMoney($('deposit').value), rent: S.parseMoney($('rent').value), baseRate: S.parseNonNegative($('baseRate').value) };
  }
  function dday(from, to) { var d = S.daysBetween(from, to); return d === 0 ? 'D-day' : (d > 0 ? 'D-' + d : 'D+' + (-d)); }
  var last = null;

  function render(i) {
    var today = S.today();
    var end = null, wStart = null, wEnd = null, status = '', statusText = '', endMonths = WINDOW_END_MONTHS_NEW;
    if (i.start && i.months > 0) {
      end = S.addMonths(i.start, i.months);
      if (S.fmtDate(i.start) < WINDOW_CUTOFF) endMonths = WINDOW_END_MONTHS_OLD;
      wStart = S.addMonths(end, -WINDOW_START_MONTHS);
      wEnd = S.addMonths(end, -endMonths); wEnd = new Date(wEnd.getTime() - 86400000); // 만기 2개월 전 "전날"까지
      if (today < wStart) { status = '아직'; statusText = '갱신 요구 기간 전입니다. ' + S.fmtDate(wStart) + '부터 요구할 수 있습니다.'; }
      else if (today <= wEnd) { status = '가능'; statusText = '지금 갱신을 요구할 수 있는 기간입니다. 문자·내용증명 등 기록이 남는 방법으로 통지하세요.'; }
      else if (today < end) { status = '지남'; statusText = '갱신 요구 기간이 지났습니다. 임대인도 이 기간에 아무 통지를 하지 않았다면 같은 조건으로 묵시적 갱신됩니다.'; }
      else { status = '만기'; statusText = '만기가 지났습니다. 그 사이 양쪽 다 통지가 없었다면 묵시적 갱신 상태로 봅니다.'; }
    }
    var convRate = Math.min(CONV_CAP, i.baseRate + CONV_ADD);
    var depCap = i.deposit * (1 + RAISE_CAP / 100), rentCap = i.rent * (1 + RAISE_CAP / 100);
    var equiv = i.deposit + (convRate > 0 ? i.rent * 12 / (convRate / 100) : 0); // 환산보증금
    var equivCap = equiv * (1 + RAISE_CAP / 100);

    S.setText('out-big', wEnd ? dday(today, wEnd) : '—');
    S.setText('sticky-monthly', wEnd ? dday(today, wEnd) : '—');
    S.setText('out-status', status || '—');
    S.setText('out-end', end ? S.fmtDate(end) : '—');
    S.setText('out-wstart', wStart ? S.fmtDate(wStart) : '—');
    S.setText('out-wend', wEnd ? S.fmtDate(wEnd) : '—');
    S.setText('out-note', statusText || '계약 시작일과 계약 기간을 입력하세요.');
    S.setText('out-window-rule', '만기 ' + WINDOW_START_MONTHS + '개월 전부터 ' + endMonths + '개월 전까지' + (endMonths === WINDOW_END_MONTHS_OLD ? ' (2020-12-10 이전 계약 기준 1개월)' : ''));
    S.setText('out-dep-cap', S.fmtWon(depCap)); S.setText('out-dep-up', S.fmtWon(depCap - i.deposit));
    S.setText('out-rent-cap', S.fmtWon(rentCap)); S.setText('out-rent-up', S.fmtWon(rentCap - i.rent));
    S.setText('out-conv', S.fmtRate(convRate));
    S.setText('out-equiv', S.fmtWon(equiv)); S.setText('out-equiv-cap', S.fmtWon(equivCap));
    S.setText('out-terminate', end ? S.fmtDate(S.addMonths(today, TENANT_TERMINATE_MONTHS)) : '—');
    S.setText('rules-date', RULES_DATE);
    last = { i: i, end: end, wStart: wStart, wEnd: wEnd, status: status, depCap: depCap, rentCap: rentCap, convRate: convRate, equivCap: equivCap };
  }

  S.ready(function () {
    $('months').value = DEFAULT_MONTHS; $('baseRate').value = BASE_RATE_DEFAULT.toFixed(2);
    S.wireCalc({
      key: 'renewal',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('start').value = ''; S.setMoney('deposit', 0); S.setMoney('rent', 0); return; }
        var t = S.today();
        var s = name === 'soon' ? S.addMonths(t, -20) : S.addMonths(t, -8);
        $('start').value = S.fmtDate(s); $('months').value = 24; S.setMoney('deposit', 50000000); S.setMoney('rent', 600000);
      },
      share: function () { return { title: '계약 갱신 청구 기간', text: '[갱신 청구권] 만기 ' + (last.end ? S.fmtDate(last.end) : '—') + ' · 요구 가능 ' + (last.wStart ? S.fmtDate(last.wStart) + ' ~ ' + S.fmtDate(last.wEnd) : '—') + ' · 5% 상한 보증금 ' + S.fmtWon(last.depCap) + '원 / 월세 ' + S.fmtWon(last.rentCap) + '원' }; },
      card: function () {
        return { file: 'renewal-result', title: '계약 갱신 청구권 계산기', kicker: '갱신 요구 마감까지', big: last.wEnd ? dday(S.today(), last.wEnd) : '—', unit: '',
          rows: [['계약 만기일', last.end ? S.fmtDate(last.end) : '—'], ['갱신 요구 가능 기간', last.wStart ? S.fmtDate(last.wStart) + ' ~ ' + S.fmtDate(last.wEnd) : '—'], ['보증금 5% 상한', S.fmtWon(last.depCap) + '원'], ['월세 5% 상한', S.fmtWon(last.rentCap) + '원'], ['환산보증금 기준 상한', S.fmtWon(last.equivCap) + '원']],
          note: RULES_DATE + '. 갱신 요구권은 1회, 증액은 5% 이내. 통지는 기록이 남는 방법으로.' };
      }
    });
  });
})();
