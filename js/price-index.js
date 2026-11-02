/* 지수로 보는 「몇 배」 계산기 공통 (땅값 몇 배·아파트값 몇 배)
   지역별 연도 목록, 지역 지수 두 해 값, 기간(개월), 물가 배수. 자료는 빌드가 만든 js/*-index-data.js */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;
  function numSort(a, b) { return a - b; }

  // IDX: { regions: {이름: {연도: 지수}}, latestYear, latestMonth, latest, cpi } 또는 null(자료 준비 중)
  // opt.defaultThen: 처음 화면의 그때 연도. 지금 연도는 목록의 마지막 해
  window.PriceIndex = function (IDX, opt) {
    var CPI = (IDX && IDX.cpi) || {};
    var CPI_YEARS = Object.keys(CPI).map(Number).sort(numSort);
    var YEARS_ALL = [];                     // 빌드가 넣은 전체 연도(직접 입력·지역 고르기 전)
    var want = { then: 0, now: 0 };         // 사용자가 고른 연도. 자료가 짧은 지역 때문에 옮겨졌다가 다른 지역으로 바꾸면 이 해로 되돌린다

    function series(region) { return IDX && region ? IDX.regions[region] || null : null; }
    function yearsOf(s) { return Object.keys(s).map(Number).sort(numSort); }
    function yearLabel(y, region) { return y + '년' + (region && IDX && y === IDX.latestYear ? ' ' + IDX.latestMonth + '월' : ''); }
    function sig(years, region) { return years.join(',') + (region ? 'r' : ''); }
    function fill(sel, years, region) {
      var g = sig(years, region);
      if (sel.getAttribute('data-years') === g) return;
      var cur = sel.value;
      sel.innerHTML = years.map(function (y) { return '<option value="' + y + '">' + yearLabel(y, region) + '</option>'; }).join('');
      sel.setAttribute('data-years', g);
      if (years.indexOf(Number(cur)) >= 0) sel.value = cur;
    }
    function pick(ys, y, isThen) {
      if (ys.indexOf(y) >= 0) return y;
      if (!isThen || y > ys[ys.length - 1]) return ys[ys.length - 1];
      for (var k = 0; k < ys.length; k++) if (ys[k] >= y) return ys[k];
      return ys[0];
    }
    function lastYear() { return YEARS_ALL[YEARS_ALL.length - 1]; }

    return {
      CPI: CPI, CPI_YEARS: CPI_YEARS,
      // 자료가 있는 가장 이른 해(모든 지역 중). 이보다 늦게 시작하는 지역은 「자료는 ○년부터」를 붙인다
      dataFirst: function () {
        var f = 0;
        if (IDX) for (var k in IDX.regions) { var y = yearsOf(IDX.regions[k])[0]; if (!f || y < f) f = y; }
        return f;
      },
      // S.ready 안에서 계산을 달기 전에 부른다
      init: function () {
        YEARS_ALL = S.$$('#yearThen option').map(function (o) { return Number(o.value); }).sort(numSort);
        this.reset();
        ['yearThen', 'yearNow'].forEach(function (id) {
          $(id).addEventListener('change', function () { want[id === 'yearThen' ? 'then' : 'now'] = Number($(id).value); });
        });
      },
      // 예시·지우기: 전체 연도 목록과 처음 연도로
      reset: function () {
        fill($('yearThen'), YEARS_ALL, false); fill($('yearNow'), YEARS_ALL, false);
        $('yearThen').value = String(opt.defaultThen); $('yearNow').value = String(lastYear());
        want = { then: opt.defaultThen, now: lastYear() };
      },
      // 공유 링크나 저장된 값으로 칸이 채워진 뒤(wireCalc의 onApply) 그 연도를 사용자가 고른 해로 삼는다.
      // 값을 넣을 때는 change 이벤트가 나지 않아, 이걸 안 하면 첫 계산에서 처음 값(1990 등)으로 덮인다(2026-11 공유 링크 버그).
      // 목록에 없는 해가 들어와 칸이 비면 처음 값으로 둔다
      adopt: function () {
        if (!$('yearThen').value) $('yearThen').value = String(opt.defaultThen);
        if (!$('yearNow').value) $('yearNow').value = String(lastYear());
        want = { then: Number($('yearThen').value), now: Number($('yearNow').value) };
      },
      // 연도 목록을 지역에 맞춘다(useRegion이면 그 지역 자료가 있는 해만). 목록이 바뀌었으면 사용자가 고른 해
      // (없으면 그때 연도는 그다음 있는 해, 지금 연도는 가장 늦은 해)로 맞춘다. 값이 바뀌었으면 true
      sync: function (region, useRegion, yearThen, yearNow) {
        var s = useRegion ? series(region) : null, ys = s ? yearsOf(s) : YEARS_ALL;
        if (!ys.length || $('yearThen').getAttribute('data-years') === sig(ys, !!s)) return false;
        fill($('yearThen'), ys, !!s); fill($('yearNow'), ys, !!s);
        var t = pick(ys, want.then || yearThen, true), n = pick(ys, want.now || yearNow, false);
        $('yearThen').value = String(t); $('yearNow').value = String(n);
        return t !== yearThen || n !== yearNow;
      },
      // 지역 지수 두 해 값. missing: 'data'(자료 없음) | 'region'(지역 안 고름) | 'year'(그해 값 없음) | null
      pair: function (region, yearThen, yearNow) {
        var s = series(region);
        if (!s) return { then: 0, now: 0, missing: IDX ? 'region' : 'data' };
        var a = s[yearThen], b = s[yearNow];
        return { then: a || 0, now: b || 0, missing: a && b ? null : 'year', first: yearsOf(s)[0] };
      },
      // 기간(개월). 지역 지수의 올해 값은 최신 달(예: 9월) 값이라 그만큼 짧다. 지난해까지는 12월 값끼리 비교
      months: function (yearThen, yearNow, indexBased) {
        var m = (yearNow - yearThen) * 12;
        if (indexBased && IDX && yearNow === IDX.latestYear) m -= 12 - IDX.latestMonth;
        return m;
      },
      period: function (months) { return Math.floor(months / 12) + '년' + (months % 12 ? ' ' + (months % 12) + '개월' : ''); },
      // 같은 기간 소비자물가 배수(연간 지수가 있는 해끼리만)
      cpi: function (yearThen, yearNow) {
        var a = CPI[yearThen], b = CPI[yearNow];
        return a && b && yearNow > yearThen ? b / a : null;
      },
      cpiNote: function (yearThen, yearNow, what) {
        return this.cpi(yearThen, yearNow) ? '소비자물가지수(2020=100, 연간) ' + yearThen + '년 ' + CPI[yearThen] + ' → ' + yearNow + '년 ' + CPI[yearNow] + '. ' + what + ' 배수를 물가 배수로 나눈 값이 물가를 뺀 배수입니다.' :
          CPI_YEARS.length ? '물가 비교는 연간 소비자물가지수가 있는 ' + CPI_YEARS[0] + '~' + CPI_YEARS[CPI_YEARS.length - 1] + '년 사이에서만 합니다. 올해 연간 지수는 다음 해 1월에 나옵니다.' : '물가 자료를 준비 중입니다.';
      }
    };
  };
})();
