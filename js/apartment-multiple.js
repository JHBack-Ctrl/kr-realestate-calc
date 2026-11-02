/* 아파트값 몇 배 계산기 — 지역 아파트 매매가격지수 또는 산 가격과 지금 시세로 몇 배가 됐는지, 연평균 상승률, 물가와 비교 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // 지역 아파트 매매가격지수와 소비자물가지수(2020=100, 연간): js/apt-index-data.js(빌드가 tools/data/apt_index.json에서 만듦).
  // 자료가 없으면 null — 지역 고르기와 물가 비교는 「자료 준비 중」으로 나온다
  var IDX = window.APT_INDEX || null;
  var PI = window.PriceIndex(IDX, { defaultThen: 2006 });   // 연도 목록·기간·물가 공통 (js/price-index.js)
  var AVG = (IDX && IDX.avg) || {};                          // 지역 평균 매매가(원, 최신 달)

  // 지역을 바꾸면 「지금 시세」에 그 지역 평균 매매가를 넣어 둔다. 사용자가 직접 넣은 값은 덮어쓰지 않고,
  // 칸을 비워도 같은 지역에서는 다시 채우지 않는다(지역을 바꿀 때만). 넣었으면 true
  var lastRegion = null;
  function autoFill(i) {
    if (i.mode !== 'region' || i.region === lastRegion) return false;
    lastRegion = i.region;
    var el = $('regionPrice'), mine = el.value !== '' && el.getAttribute('data-auto') !== '1';
    if (mine) return false;
    var avg = AVG[i.region];
    if (avg) { S.setMoney('regionPrice', roundEst(avg)); el.setAttribute('data-auto', '1'); }
    else { el.value = ''; el.removeAttribute('data-auto'); }
    return true;
  }

  function calc(i) {
    var region = i.mode === 'region';
    var p = PI.pair(i.region, i.yearThen, i.yearNow);           // 지역 지수(직접 입력에서는 비교용)
    var a = region ? p.then : i.then, b = region ? p.now : i.now, ok = a > 0 && b > 0;
    var years = i.yearNow - i.yearThen, mon = PI.months(i.yearThen, i.yearNow, region);
    var multiple = ok ? b / a : 0;
    var cagr = ok && mon > 0 ? (Math.pow(multiple, 12 / mon) - 1) * 100 : null;
    var cpiMultiple = PI.cpi(i.yearThen, i.yearNow);
    // 지역 고르기에서 지금 시세를 넣으면 같은 지수 비율로 그때 시세를 거꾸로 추정한다(지수는 가격이 아니라 변동 비율이라)
    var rp = region && ok && i.regionPrice > 0 ? { now: i.regionPrice, then: i.regionPrice * p.then / p.now } : null;
    // 직접 입력에서 지역을 고르면 같은 해의 지역 평균 배수
    var cmp = !region && i.region && !p.missing && years > 0 ? p.now / p.then : null;
    return { p: p, ok: ok, years: years, months: mon, multiple: multiple, cagr: cagr, rp: rp, cmp: cmp,
      cpiMultiple: cpiMultiple, real: cpiMultiple && ok && years > 0 ? multiple / cpiMultiple : null };
  }
  function readInput() {
    var md = document.querySelector('input[name="mode"]:checked');
    return { mode: md ? md.value : 'region', region: $('region').value, regionPrice: S.parseMoney($('regionPrice').value),
      auto: $('regionPrice').getAttribute('data-auto') === '1', then: S.parseMoney($('priceThen').value), now: S.parseMoney($('priceNow').value),
      yearThen: Math.floor(S.parseNonNegative($('yearThen').value)) || 0, yearNow: Math.floor(S.parseNonNegative($('yearNow').value)) || 0 };
  }
  function times(n) { return S.fmtRate(n); }
  function idx(n) { return n ? S.fmtRate(n) : '—'; }
  // 추정 금액은 끝자리를 떼어 보여 준다(1억 이상은 100만원, 1천만 이상은 10만원, 그 밑은 만원 단위).
  // 오른 금액은 보이는 두 값의 차이로 계산해 표 안에서 셈이 맞게 한다
  function roundEst(n) { var u = n >= 100000000 ? 1000000 : n >= 10000000 ? 100000 : 10000; return Math.round(n / u) * u; }
  function approx(n) { return S.fmtKorean(roundEst(n)); }
  function basis(i) {
    return i.mode === 'region' ? '지역 평균 아파트 매매가격지수 기준(' + (IDX ? IDX.source + ', ' + IDX.latest + '까지' : '자료 준비 중') + '). 특정 단지 시세와 다름'
      : '입력한 매매가 기준' + (IDX ? ' · 지역 평균은 ' + IDX.source : '');
  }
  var last = null;
  function render(i) {
    var r = calc(i), region = i.mode === 'region';
    $('region-fields').hidden = !region; $('direct-fields').hidden = region;
    $('region-rows').hidden = !region; $('direct-rows').hidden = region;
    $('region-price-rows').hidden = !(region && r.rp);
    $('cmp-row').hidden = region || !i.region;
    S.setText('out-kicker', region ? (i.region ? i.region + ' 아파트값 지수가 몇 배가 됐나' : '아파트값 지수가 몇 배가 됐나') : '우리 집 아파트값이 몇 배가 됐나');
    S.setText('out-big', r.ok ? times(r.multiple) : '—');
    S.setText('sticky-monthly', r.ok ? times(r.multiple) + '배' : '—');
    S.setText('out-cagr', r.cagr == null ? '—' : S.fmtRate(r.cagr));
    S.setText('out-years', r.months > 0 ? PI.period(r.months) : '—');
    var avgWord = i.auto ? '평균 ' : '';
    S.setText('out-s3-label', region ? (r.rp ? '그때 ' + avgWord + '시세 (추정)' : '지금 매매지수') : '오른 금액');
    S.setText('out-rp-then-label', '그때 ' + avgWord + '시세 (추정)'); S.setText('out-rp-now-label', i.auto ? '지금 평균 매매가' : '지금 시세');
    S.setText('region-price-help', i.auto && i.region ? i.region + ' 아파트 평균 매매가(' + (IDX.avgLabel || IDX.latest) + ')를 넣어 두었습니다. 우리 집 시세로 바꿔 넣으면 우리 집 기준으로 다시 계산합니다' :
      '지역을 고르면 그 지역 아파트 평균 매매가가 들어갑니다. 우리 집 시세로 바꿔 넣으면 지역 지수 비율로 그때 시세를 추정합니다');
    S.setText('out-s3', region ? (r.rp ? approx(r.rp.then) : r.ok ? idx(r.p.now) : '—') : (r.ok ? S.fmtKorean(i.now - i.then) : '—'));
    // 지역 고르기
    S.setText('out-region-name', i.region || '—'); S.setText('out-idx-then', region ? idx(r.p.then) : '—'); S.setText('out-idx-now', region ? idx(r.p.now) : '—');
    S.setText('out-idx-base', IDX ? IDX.base : '—');
    if (r.rp) { S.setText('out-rp-then', approx(r.rp.then)); S.setText('out-rp-now', S.fmtKorean(r.rp.now)); S.setText('out-rp-diff', S.fmtKorean(r.rp.now - roundEst(r.rp.then))); }
    // 직접 입력
    S.setText('out-then', i.then ? S.fmtKorean(i.then) : '—'); S.setText('out-now', i.now ? S.fmtKorean(i.now) : '—');
    S.setText('out-diff', r.ok ? S.fmtKorean(i.now - i.then) : '—');
    S.setText('out-cmp', r.cmp ? times(r.cmp) + '배' : '—');
    var cn = $('out-cmp-note'), cmpNote = '';
    if (!region && i.region) {
      if (r.p.missing === 'year') cmpNote = i.region + ' 지수는 ' + r.p.first + '년부터 ' + IDX.latest + '까지 있어 이 기간은 비교할 수 없습니다.';
      else if (r.cmp && r.ok) cmpNote = '같은 ' + i.yearThen + '→' + i.yearNow + '년 ' + i.region + ' 아파트 매매가격지수는 ' + times(r.cmp) + '배입니다' +
        (i.yearNow === (IDX && IDX.latestYear) ? '(올해는 ' + IDX.latestMonth + '월 지수)' : '') + '. 지역 평균이라 단지마다 다릅니다.';
    }
    cn.hidden = !cmpNote; S.setText('out-cmp-note', cmpNote);
    S.setText('out-cpi', r.cpiMultiple ? times(r.cpiMultiple) + '배' : '—');
    S.setText('out-real', r.real ? times(r.real) + '배' : '—');
    S.setText('out-cpi-note', PI.cpiNote(i.yearThen, i.yearNow, '아파트값'));
    S.setText('rules-date', basis(i) + ' · 물가는 통계청 소비자물가지수 연간(2020=100)' + (region && IDX ? ' · 지난해까지는 12월 지수, 올해는 ' + IDX.latest + ' 지수' : ''));
    var note;
    if (region && r.p.missing === 'data') note = '지역별 아파트 매매가격지수 자료를 준비 중입니다. 지금은 「매매가 직접 입력」으로 계산할 수 있습니다.';
    else if (region && r.p.missing === 'region') note = '지역을 고르면 바로 계산됩니다.';
    else if (region && r.p.missing === 'year') note = i.region + ' 자료는 ' + r.p.first + '년부터 ' + IDX.latest + '까지 있습니다. 그 안의 연도를 골라 주세요.';
    else if (!r.ok) note = '그때 산 가격과 지금 시세를 넣으면 바로 계산됩니다.';
    else if (r.months <= 0) note = '지금 연도를 그때 연도보다 뒤로 골라 주세요.';
    else if (region) note = i.region + ' 아파트 매매가격지수: ' + i.yearThen + '년 ' + idx(r.p.then) + ' → ' + i.yearNow + '년 ' + idx(r.p.now) + '. ' + PI.period(r.months) + ' 동안 ' +
      times(r.multiple) + '배, 연평균 ' + S.fmtRate(r.cagr) + '%입니다. ' +
      (r.rp ? (i.auto ? '지금 평균 매매가 ' + S.fmtKorean(r.rp.now) + ' 기준으로 ' + i.yearThen + '년 평균은 약 ' : '지금 시세가 ' + S.fmtKorean(r.rp.now) + '이면 같은 비율로 ' + i.yearThen + '년에는 약 ') +
          approx(r.rp.then) + '이었던 셈입니다. 지역 평균 변동으로 거꾸로 계산한 추정값입니다.'
        : '지역 평균이라 우리 아파트와는 다를 수 있습니다. 「지금 시세」를 넣으면 그때 시세를 추정해 보여 줍니다.');
    else note = i.yearThen + '년 ' + S.fmtKorean(i.then) + '에 산 아파트가 ' + i.yearNow + '년 ' + S.fmtKorean(i.now) + '이면 ' + r.years + '년 동안 ' + times(r.multiple) + '배, 연평균 ' +
      S.fmtRate(r.cagr) + '%씩 오른 셈입니다.' + (r.cmp ? ' 같은 기간 ' + i.region + ' 평균은 ' + times(r.cmp) + '배입니다.' : '') + ' 세금과 거래 비용은 빠져 있습니다.';
    if (region && r.p.first && r.p.first > PI.dataFirst() && !r.p.missing) note += ' 이 지역 자료는 ' + r.p.first + '년부터 있습니다.';
    S.setText('out-note', note);
    last = { i: i, r: r };
  }
  S.ready(function () {
    PI.init();   // 연도 고르는 것을 기억하는 처리를 계산보다 먼저 단다
    // 지역 자료가 아직 없으면 처음 화면을 매매가 직접 입력으로(공유 링크·저장된 값은 wireCalc가 그 뒤에 덮는다)
    if (!IDX) { var dm = document.querySelector('input[name="mode"][value="direct"]'); if (dm) dm.checked = true; }
    $('regionPrice').addEventListener('input', function () { $('regionPrice').removeAttribute('data-auto'); });   // 직접 고친 값은 내 값
    S.wireCalc({
      key: 'apartment-multiple',
      onApply: function () { PI.adopt(); },   // 공유 링크·저장된 값의 연도를 살린다
      recalc: function () {
        var i = readInput(), moved = PI.sync(i.region, i.mode === 'region', i.yearThen, i.yearNow);
        if (autoFill(i) || moved) i = readInput();
        render(i);
      },
      preset: function (name) {
        PI.reset();   // 지역에 맞춰 줄어든 목록이면 2006이 없을 수 있어 전체 목록부터
        $('priceThen').value = ''; $('priceNow').value = ''; $('regionPrice').value = ''; $('regionPrice').removeAttribute('data-auto');
        if (name === 'clear') return;
        if (name === 'ex') {
          var d = document.querySelector('input[name="mode"][value="direct"]'); if (d) d.checked = true;
          S.setMoney('priceThen', 300000000); S.setMoney('priceNow', 900000000);
        }
      },
      share: function () {
        var r = last.r, i = last.i, period = r.years > 0 ? i.yearThen + '→' + i.yearNow + '년 ' : '';
        return { title: '아파트값 몇 배 계산 결과', text: '[아파트값 몇 배] ' + (i.mode === 'region' ? i.region + ' ' + period + '아파트 매매가격지수 ' : period + S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now) + ' ') + '\n' +
          times(r.multiple) + '배' + (r.cagr != null ? ', 연평균 ' + S.fmtRate(r.cagr) + '%' : '') + (i.mode === 'region' ? ' · 지역 평균 지수 기준' : '') +
          (r.rp ? '\n' + (i.auto ? '평균 매매가' : '시세') + ' 약 ' + approx(r.rp.then) + ' → ' + S.fmtKorean(r.rp.now) + ' (지금 값으로 거꾸로 추정)' : '') +
          (r.cmp ? '\n같은 기간 ' + i.region + ' 평균 ' + times(r.cmp) + '배' : '') };
      },
      card: function () {
        var r = last.r, i = last.i, region = i.mode === 'region';
        var rows = region ? [['지역', i.region], ['매매지수 (그때 → 지금)', idx(r.p.then) + ' → ' + idx(r.p.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%']].concat(
            r.rp ? [[(i.auto ? '평균 매매가' : '시세') + ' (그때 추정 → 지금)', approx(r.rp.then) + ' → ' + S.fmtKorean(r.rp.now)]] : [])
          : [['그때 → 지금', S.fmtKorean(i.then) + ' → ' + S.fmtKorean(i.now)], ['연평균 상승률', r.cagr == null ? '—' : S.fmtRate(r.cagr) + '%'], ['오른 금액', S.fmtKorean(i.now - i.then)]].concat(
            r.cmp ? [['같은 기간 ' + i.region + ' 평균', times(r.cmp) + '배']] : []);
        if (r.real) rows.push(['물가를 뺀 배수', times(r.real) + '배']);
        return { file: 'apartment-multiple-result', title: '아파트값 몇 배 계산기', kicker: (r.years > 0 ? i.yearThen + '년 → ' + i.yearNow + '년 · ' : '') + (region ? '지역 아파트값 지수 배수' : '우리 집 아파트값 배수'),
          big: times(r.multiple), unit: '배', rows: rows,
          note: (region ? '지역 평균 아파트 매매가격지수 기준(특정 단지 시세와 다름)' : '입력한 매매가 기준, 세금·거래 비용 제외') + '. 본 계산기는 참고용이며 금융·세무·법률 자문이 아닙니다.' };
      }
    });
  });
})();
