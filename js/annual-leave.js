/* 연차휴가 계산기 — 입사일 기준 연차 개수, 다음 발생일, 미사용 연차수당 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (근로기준법 제60조. 거의 안 바뀜) ----
  var RULES_DATE = '근로기준법 제60조 기준, 입사일 기준 계산 (2026-10 확인)';
  var FIRST_YEAR_MAX = 11;      // 1년 미만: 1개월 개근마다 1일, 최대 11일
  var BASE_DAYS = 15;           // 1년 이상·80% 이상 출근: 15일
  var MAX_DAYS = 25;            // 3년 이상이면 2년마다 1일 더해 최대 25일
  var MONTH_HOURS = 209;        // 월 통상임금 → 시간급 (주 40시간)

  function won(n) { return Math.floor(n + 1e-6); }
  function daysForYear(y) { return y < 1 ? 0 : Math.min(MAX_DAYS, BASE_DAYS + Math.floor((y - 1) / 2)); }   // 근속 y년이 된 날 생기는 연차
  function fullYears(a, b) { var y = b.getFullYear() - a.getFullYear(); if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--; return Math.max(0, y); }
  function calc(i) {
    if (!i.join || !i.base || i.base < i.join) return null;
    var years = fullYears(i.join, i.base), months = S.monthsBetween(i.join, i.base);
    var now, kind, next, nextDays;
    if (years < 1) {
      now = Math.min(FIRST_YEAR_MAX, months); kind = '1년 미만 (한 달 개근마다 1일)';
      if (months < FIRST_YEAR_MAX) { next = S.addMonths(i.join, months + 1); nextDays = 1; } else { next = S.addMonths(i.join, 12); nextDays = BASE_DAYS; }
    } else {
      now = daysForYear(years); kind = '근속 ' + years + '년 (지난 1년 출근율 80% 이상)';
      next = S.addMonths(i.join, (years + 1) * 12); nextDays = daysForYear(years + 1);
    }
    var hourly = i.wage > 0 ? i.wage / MONTH_HOURS : 0, daily = won(hourly * i.hours);
    var unused = Math.min(i.unused, now);
    return { years: years, months: months, now: now, kind: kind, next: next, nextDays: nextDays, daily: daily, unused: unused, pay: daily * unused,
      firstTwo: FIRST_YEAR_MAX + BASE_DAYS };
  }
  function readInput() {
    return { join: S.parseDate($('join').value), base: S.parseDate($('base').value) || S.today(), wage: S.parseMoney($('wage').value),
      hours: Math.min(8, S.parseNonNegative($('hours').value)) || 8, unused: Math.floor(S.parseNonNegative($('unused').value)) };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = !!r;
    S.setText('out-now', has ? r.now : 0); S.setText('sticky-monthly', has ? r.now + '일' : '—');
    S.setText('out-service', has ? r.years + '년 ' + (r.months - r.years * 12) + '개월' : '—'); S.setText('out-next', has ? S.fmtDate(r.next) + ' · ' + r.nextDays + '일' : '—');
    S.setText('out-pay', S.fmtWon(has ? r.pay : 0)); S.setText('out-kind', has ? r.kind : '—'); S.setText('out-daily', S.fmtWon(has ? r.daily : 0)); S.setText('out-unused', has ? r.unused : 0);
    var tb = $('table-body');
    if (tb && !tb.childNodes.length) {
      [[1, 15], [3, 16], [5, 17], [7, 18], [9, 19], [11, 20], [13, 21], [15, 22], [17, 23], [19, 24], [21, 25]].forEach(function (x) {
        var tr = document.createElement('tr'); tr.innerHTML = '<th scope="row">' + x[0] + (x[0] === 21 ? '년 이상' : '~' + (x[0] + 1) + '년') + '</th><td>' + daysForYear(x[0]) + '일</td>'; tb.appendChild(tr);
      });
    }
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '입사일을 넣으면 바로 계산됩니다. 기준일을 비우면 오늘로 봅니다.' :
      (r.years < 1 ? '입사 1년이 안 되어 한 달 개근할 때마다 1일씩 생깁니다(최대 11일). 1년이 되는 날 15일이 따로 생겨 첫 2년 동안 최대 ' + r.firstTwo + '일입니다. '
        : '입사일로부터 ' + r.years + '년이 된 날 ' + r.now + '일이 생겼습니다. ') +
      (i.unused > 0 && i.wage > 0 ? '쓰지 못한 ' + r.unused + '일에 1일 통상임금 ' + S.fmtWon(r.daily) + '원을 곱한 연차수당은 ' + S.fmtKorean(r.pay) + '입니다. ' : '') +
      '지난 1년 출근율이 80%에 못 미치면 개근한 달마다 1일만 생깁니다. 회계연도(1월 1일) 기준으로 주는 회사는 개수가 다를 수 있고, 퇴사할 때는 입사일 기준보다 적으면 정산합니다. 5인 미만 사업장은 연차 규정이 적용되지 않습니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'annual-leave',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['join', 'base', 'wage', 'unused'].forEach(function (k) { $(k).value = ''; }); return; }
        var t = S.today(), back = { m6: -6, y3: -36, y10: -120 }[name]; if (back == null) return;
        $('join').value = S.fmtDate(S.addMonths(t, back)); $('base').value = S.fmtDate(t);
      },
      share: function () { var r = last.r; return { title: '연차 계산 결과', text: r ? '[연차] 입사 ' + S.fmtDate(last.i.join) + ' · 근속 ' + r.years + '년\n올해 연차 ' + r.now + '일 · 다음 발생 ' + S.fmtDate(r.next) + ' ' + r.nextDays + '일' : '연차 계산기' }; },
      card: function () {
        var r = last.r || { years: 0, now: 0, next: S.today(), nextDays: 0, pay: 0 };
        return { file: 'annual-leave-result', title: '연차휴가 계산기', kicker: '근속 ' + r.years + '년 · 지금 연차', big: String(r.now), unit: '일',
          rows: [['다음 발생', S.fmtDate(r.next) + ' · ' + r.nextDays + '일'], ['미사용 연차수당', S.fmtWon(r.pay) + '원']], note: RULES_DATE + '. 참고용입니다.' };
      }
    });
  });
})();
