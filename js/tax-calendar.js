/* 부동산 세금 달력 · 신고·납부 기한 계산기
   기한 규칙은 아래 상수에만 있다. 매년 초와 개정 시 확인. */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 기준 지방세법·소득세법·종합부동산세법';
  var ACQ_DEADLINE = { sale: { days: 60 }, inherit: { eomMonths: 6 }, gift: { eomMonths: 3 } }; // 취득세: 매매 60일, 상속 말일부터 6개월, 증여 말일부터 3개월
  var REGISTER_DAYS = 60;            // 소유권이전등기 신청 기한 (잔금일부터)
  var CGT_PRELIM_EOM_MONTHS = 2;     // 양도세 예정신고: 양도일이 속한 달 말일부터 2개월
  var CGT_FINAL = [5, 1, 5, 31];     // 확정신고 다음 해 5/1~5/31
  var PROPERTY_BASE = [6, 1];        // 재산세·종부세 과세기준일 6/1
  var PROPERTY_1ST = [7, 16, 7, 31]; // 재산세 1기: 주택 1/2, 건축물
  var PROPERTY_2ND = [9, 16, 9, 30]; // 재산세 2기: 주택 1/2, 토지
  var PROPERTY_SMALL = 200000;       // 주택분 세액 20만원 이하면 7월 일괄
  var CTAX = [12, 1, 12, 15];        // 종합부동산세 납부
  var RENTAL_STATUS = [2, 10];       // 주택임대 사업장현황신고
  var INCOME_TAX = [5, 1, 5, 31];    // 종합소득세

  // 'N월 말일부터 M개월' 기한 = M개월 뒤 달의 말일. 말일에 addMonths를 하면 30일·31일이 엇갈려 하루 당겨지거나 다음 달로 넘어간다
  function eomPlus(d, months) { return new Date(d.getFullYear(), d.getMonth() + months + 1, 0); }
  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
  function mk(y, m, d) { return new Date(y, m - 1, d); }
  function dday(from, to) { var d = S.daysBetween(from, to); return d === 0 ? '오늘' : (d > 0 ? 'D-' + d : d + '일 지남'); }
  function nextYearly(today, m, d) { var x = mk(today.getFullYear(), m, d); if (x < today) x = mk(today.getFullYear() + 1, m, d); return x; }

  function readInput() {
    return { acqDate: S.parseDate($('acqDate').value), acqCause: $('acqCause').value, saleDate: S.parseDate($('saleDate').value),
      owner: $('owner').checked, ctax: $('ctax').checked, rental: $('rental').checked };
  }
  var last = null;

  function build(i) {
    var today = S.today(), ev = [];
    if (i.acqDate) {
      var d;
      if (i.acqCause === 'inherit') d = eomPlus(i.acqDate, ACQ_DEADLINE.inherit.eomMonths);
      else if (i.acqCause === 'gift') d = eomPlus(i.acqDate, ACQ_DEADLINE.gift.eomMonths);
      else d = addDays(i.acqDate, ACQ_DEADLINE.sale.days);
      ev.push({ date: d, name: '취득세 신고·납부 마감', desc: i.acqCause === 'inherit' ? '상속개시일이 속한 달의 말일부터 6개월' : (i.acqCause === 'gift' ? '취득일이 속한 달의 말일부터 3개월' : '취득일(잔금일)부터 60일'), where: '위택스·구청 세무과', key: 'acq' });
      if (i.acqCause !== 'inherit') ev.push({ date: addDays(i.acqDate, REGISTER_DAYS), name: '소유권이전등기 신청 기한', desc: '잔금일부터 60일 (부동산등기특별조치법)', where: '등기소·법무사', key: 'reg' });
    }
    if (i.saleDate) {
      var p = eomPlus(i.saleDate, CGT_PRELIM_EOM_MONTHS);
      ev.push({ date: p, name: '양도소득세 예정신고·납부 마감', desc: '양도일이 속한 달의 말일부터 2개월. 지방소득세도 같이 신고', where: '홈택스', key: 'cgt' });
      ev.push({ date: mk(i.saleDate.getFullYear() + 1, CGT_FINAL[2], CGT_FINAL[3]), name: '양도소득세 확정신고 마감', desc: '다음 해 5월 31일. 같은 해 2건 이상 양도 등 합산이 필요할 때', where: '홈택스', key: 'cgtf' });
    }
    if (i.owner) {
      ev.push({ date: nextYearly(today, PROPERTY_BASE[0], PROPERTY_BASE[1]), name: '재산세·종부세 과세기준일', desc: '6월 1일 소유자에게 1년치 부과. 매매 잔금이 이 날 전후면 부담자가 바뀜', where: '—', key: 'base' });
      ev.push({ date: nextYearly(today, PROPERTY_1ST[2], PROPERTY_1ST[3]), name: '재산세 1기 납부 마감', desc: '7월 16~31일. 주택분 1/2과 건축물분. 주택분 세액 ' + S.fmtWon(PROPERTY_SMALL) + '원 이하면 7월에 전액', where: '위택스', key: 'p1' });
      ev.push({ date: nextYearly(today, PROPERTY_2ND[2], PROPERTY_2ND[3]), name: '재산세 2기 납부 마감', desc: '9월 16~30일. 주택분 나머지 1/2과 토지분', where: '위택스', key: 'p2' });
    }
    if (i.ctax) ev.push({ date: nextYearly(today, CTAX[2], CTAX[3]), name: '종합부동산세 납부 마감', desc: '12월 1~15일. 인별 주택 공시가격 합계가 기준을 넘는 경우', where: '홈택스', key: 'ctax' });
    if (i.rental) {
      ev.push({ date: nextYearly(today, RENTAL_STATUS[0], RENTAL_STATUS[1]), name: '주택임대 사업장현황신고', desc: '2월 10일까지. 임대수입 규모와 무관하게 신고', where: '홈택스', key: 'rs' });
      ev.push({ date: nextYearly(today, INCOME_TAX[2], INCOME_TAX[3]), name: '임대소득 종합소득세 신고 마감', desc: '5월 31일. 연 2,000만원 이하 분리과세 선택 가능', where: '홈택스', key: 'it' });
    }
    ev.sort(function (a, b) { return a.date - b.date; });
    return ev;
  }

  function render(i) {
    var today = S.today(), ev = build(i);
    var next = null;
    for (var k = 0; k < ev.length; k++) if (ev[k].date >= today) { next = ev[k]; break; }
    S.setText('out-big', next ? dday(today, next.date) : '—');
    S.setText('sticky-monthly', next ? dday(today, next.date) : '—');
    S.setText('out-next-name', next ? next.name : '해당 항목을 선택하거나 날짜를 입력하세요');
    S.setText('out-next-date', next ? S.fmtDate(next.date) : '—');
    S.setText('out-count', String(ev.length));
    var tb = $('event-body'); tb.innerHTML = '';
    if (!ev.length) tb.innerHTML = '<tr><td colspan="4" class="muted">취득일·양도일을 넣거나 보유 항목을 켜면 기한이 나옵니다.</td></tr>';
    ev.forEach(function (e) {
      var tr = document.createElement('tr');
      var passed = e.date < today;
      tr.innerHTML = '<th scope="row">' + S.fmtDate(e.date) + '</th><td>' + e.name + '<br><small class="muted">' + e.desc + '</small></td><td>' + e.where + '</td><td' + (passed ? ' class="na"' : '') + '>' + dday(today, e.date) + '</td>';
      tb.appendChild(tr);
    });
    S.setText('rules-date', RULES_DATE);
    last = { ev: ev, next: next };
  }

  S.ready(function () {
    S.wireCalc({
      key: 'tax-calendar',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { $('acqDate').value = ''; $('saleDate').value = ''; $('owner').checked = false; $('ctax').checked = false; $('rental').checked = false; return; }
        var t = S.today();
        if (name === 'buy') { $('acqDate').value = S.fmtDate(S.addMonths(t, -1)); $('acqCause').value = 'sale'; $('owner').checked = true; }
        if (name === 'sell') { $('saleDate').value = S.fmtDate(S.addMonths(t, -1)); }
      },
      share: function () { return { title: '부동산 세금 기한', text: '[세금 달력] 다음 기한 ' + (last.next ? last.next.name + ' ' + S.fmtDate(last.next.date) : '없음') }; },
      card: function () {
        return { file: 'tax-calendar', title: '부동산 세금 달력', kicker: last.next ? '다음 기한 · ' + last.next.name : '다음 기한', big: last.next ? dday(S.today(), last.next.date) : '—', unit: '',
          rows: last.ev.slice(0, 6).map(function (e) { return [e.name, S.fmtDate(e.date)]; }), note: RULES_DATE + '. 기한이 공휴일이면 다음 영업일까지. 참고용이며 최종 확인은 홈택스·위택스에서.' };
      }
    });
  });
})();
