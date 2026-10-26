/* 월세 실부담 계산기 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (수정 쉽게 한곳에) ----
  var DEFAULT_DEPOSIT_RATE = 3.0;   // 예금금리 모드 기본 연금리 (%)
  var DEFAULT_LOAN_RATE = 4.5;      // 대출금리 모드 기본 연금리 (%)
  var DEFAULT_JEONSE_RATE = 3.0;    // 전세 기회비용 기본 연금리 (%)
  var DEFAULT_MONTHS = 24;
  var MONTHS_PER_YEAR = 12;
  var PRESETS = {
    oneroom:   { rent: 500000,  maint: 70000,  extra: 0, deposit: 5000000,  jeonse: 100000000 },
    officetel: { rent: 800000,  maint: 120000, extra: 0, deposit: 10000000, jeonse: 180000000 },
    apt:       { rent: 1200000, maint: 200000, extra: 0, deposit: 50000000, jeonse: 400000000 }
  };

  function calcRent(rent, maint, extra, deposit, rate) {
    var f = rate / MONTHS_PER_YEAR / 100;
    var fixed = rent + maint + extra, opp = deposit * f, monthly = fixed + opp;
    return { fixed: fixed, opp: opp, monthly: monthly, yearly: monthly * MONTHS_PER_YEAR };
  }

  function readInput() {
    var modeEl = document.querySelector('input[name="mode"]:checked');
    return {
      rent: S.parseMoney($('rent').value), maint: S.parseMoney($('maint').value), extra: S.parseMoney($('extra').value),
      deposit: S.parseMoney($('deposit').value), mode: modeEl ? modeEl.value : 'deposit',
      rate: S.parseNonNegative($('rate').value), jeonse: S.parseMoney($('jeonse').value),
      jeonseRate: S.parseNonNegative($('jeonseRate').value),
      months: Math.floor(S.parseNonNegative($('months').value)) || DEFAULT_MONTHS,
      ab: $('ab-toggle').checked,
      bRent: S.parseMoney($('b-rent').value), bMaint: S.parseMoney($('b-maint').value),
      bExtra: S.parseMoney($('b-extra').value), bDeposit: S.parseMoney($('b-deposit').value)
    };
  }

  var last = null;

  function render(i) {
    var a = calcRent(i.rent, i.maint, i.extra, i.deposit, i.rate);
    var modeName = i.mode === 'loan' ? '대출금리' : '예금금리';
    var cum = a.monthly * i.months;
    $('ab-body').hidden = !i.ab;

    S.setText('out-monthly', S.fmtWon(a.monthly)); S.setText('sticky-monthly', S.fmtWon(a.monthly));
    S.setText('out-yearly', S.fmtWon(a.yearly)); S.setText('out-term-k', i.months + '개월'); S.setText('out-cum', S.fmtWon(cum));
    S.setText('out-korean', a.monthly > 0 ? '월 ' + S.fmtKorean(a.monthly) + ' · 연 ' + S.fmtKorean(a.yearly) : '값을 입력하면 바로 계산됩니다.');
    S.setText('bd-rent', S.fmtWon(i.rent)); S.setText('bd-maint', S.fmtWon(i.maint)); S.setText('bd-extra', S.fmtWon(i.extra));
    S.setText('bd-opp', S.fmtWon(a.opp)); S.setText('bd-total', S.fmtWon(a.monthly));
    S.setText('bd-rate-label', '(' + modeName + ' ' + S.fmtRate(i.rate) + '%)');
    var tot = a.monthly || 1;
    $('bar-rent').style.width = (i.rent / tot * 100) + '%'; $('bar-maint').style.width = (i.maint / tot * 100) + '%';
    $('bar-extra').style.width = (i.extra / tot * 100) + '%'; $('bar-opp').style.width = (a.opp / tot * 100) + '%';

    var jf = i.jeonseRate / MONTHS_PER_YEAR / 100, jeonseAsRent = i.jeonse * jf, jeonseFixed = i.maint + i.extra;
    S.setText('cv-rent-deposit', S.fmtWon(i.deposit)); S.setText('cv-jeonse-deposit', S.fmtWon(i.jeonse));
    S.setText('cv-rent-rent', S.fmtWon(i.rent)); S.setText('cv-rent-opp', S.fmtWon(a.opp)); S.setText('cv-jeonse-opp', S.fmtWon(jeonseAsRent));
    S.setText('cv-rent-fixed', S.fmtWon(jeonseFixed)); S.setText('cv-jeonse-fixed', S.fmtWon(jeonseFixed));
    S.setText('cv-rent-total', S.fmtWon(a.monthly)); S.setText('cv-jeonse-total', S.fmtWon(jeonseFixed + jeonseAsRent));
    S.setText('cv-jeonse-as-rent', S.fmtWon(jeonseAsRent));
    var wrap = $('cv-needed-jeonse-wrap');
    if (jf > 0) {
      var needed = Math.max(0, (a.monthly - i.maint - i.extra) / jf);
      wrap.innerHTML = '<span id="cv-needed-jeonse">' + S.fmtWon(needed) + '</span>원'; wrap.classList.remove('na');
      S.setText('cv-note', '월세 조건 기회비용은 ' + modeName + ' ' + S.fmtRate(i.rate) + '%, 전세 조건 환산은 전세 기회비용 연금리 ' + S.fmtRate(i.jeonseRate) + '%를 사용했습니다.');
    } else {
      wrap.innerHTML = '<span id="cv-needed-jeonse">—</span>'; wrap.classList.add('na');
      S.setText('cv-note', '전세 기회비용 연금리가 0이면 필요 전세금을 환산할 수 없습니다. 금리를 입력하세요.');
    }

    var b = calcRent(i.bRent, i.bMaint, i.bExtra, i.bDeposit, i.rate);
    var d = function (x, y) { var v = x - y; return (v < 0 ? '−' : '') + S.fmtWon(Math.abs(v)); };
    S.setText('ab-a-rent', S.fmtWon(i.rent)); S.setText('ab-b-rent', S.fmtWon(i.bRent)); S.setText('ab-d-rent', d(i.rent, i.bRent));
    S.setText('ab-a-fixed', S.fmtWon(i.maint + i.extra)); S.setText('ab-b-fixed', S.fmtWon(i.bMaint + i.bExtra)); S.setText('ab-d-fixed', d(i.maint + i.extra, i.bMaint + i.bExtra));
    S.setText('ab-a-opp', S.fmtWon(a.opp)); S.setText('ab-b-opp', S.fmtWon(b.opp)); S.setText('ab-d-opp', d(a.opp, b.opp));
    S.setText('ab-a-total', S.fmtWon(a.monthly)); S.setText('ab-b-total', S.fmtWon(b.monthly)); S.setText('ab-d-total', d(a.monthly, b.monthly));
    S.setText('ab-a-cum', S.fmtWon(cum)); S.setText('ab-b-cum', S.fmtWon(b.monthly * i.months)); S.setText('ab-d-cum', d(cum, b.monthly * i.months));

    drawChart(a.monthly, i.months, i.ab ? b.monthly : null);
    last = { i: i, a: a, b: b, cum: cum };
  }

  function drawChart(monthlyA, months, monthlyB) {
    var svg = $('chart'), W = 360, H = 180, padL = 8, padR = 60, padT = 14, padB = 26, iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max(monthlyA * months, (monthlyB || 0) * months, 1);
    var x = function (m) { return padL + iw * (m / months); }, y = function (v) { return padT + ih * (1 - v / maxV); };
    var parts = [];
    for (var g = 0; g <= 4; g++) { var gy = padT + ih * g / 4; parts.push('<line class="grid" x1="' + padL + '" y1="' + gy + '" x2="' + (padL + iw) + '" y2="' + gy + '"/>'); }
    parts.push('<line class="axis" x1="' + padL + '" y1="' + (padT + ih) + '" x2="' + (padL + iw) + '" y2="' + (padT + ih) + '"/>');
    function series(monthly, cls, labelText, labelShift) {
      var pts = [];
      for (var m = 0; m <= months; m++) pts.push(x(m).toFixed(1) + ',' + y(monthly * m).toFixed(1));
      var area = 'M' + x(0) + ',' + (padT + ih) + ' L' + pts.join(' L') + ' L' + x(months) + ',' + (padT + ih) + ' Z';
      parts.push('<path class="area" d="' + area + '"' + (cls ? ' style="opacity:.06"' : '') + '/>');
      parts.push('<polyline class="line' + (cls ? ' ' + cls : '') + '" points="' + pts.join(' ') + '"' + (cls ? ' style="stroke:var(--ink-3);stroke-dasharray:4 4"' : '') + '/>');
      parts.push('<circle class="dot" cx="' + x(months) + '" cy="' + y(monthly * months) + '" r="3.5"' + (cls ? ' style="fill:var(--ink-3)"' : '') + '/>');
      parts.push('<text class="end-label" x="' + (x(months) + 6) + '" y="' + (y(monthly * months) + 4 + (labelShift || 0)) + '"' + (cls ? ' style="fill:var(--ink-3)"' : '') + '>' + labelText + '</text>');
    }
    var shiftA = 0, shiftB = 0;
    if (monthlyB != null) { var gap = y(monthlyB * months) - y(monthlyA * months); if (Math.abs(gap) < 14) { if (gap >= 0) shiftB = 14 - gap; else shiftA = 14 + gap; } }
    series(monthlyA, '', shortWon(monthlyA * months), shiftA);
    if (monthlyB != null) series(monthlyB, 'b', shortWon(monthlyB * months), shiftB);
    var ticks = months <= 12 ? [0, Math.round(months / 2), months] : [0, 12, 24, 36].filter(function (t) { return t <= months; });
    if (ticks[ticks.length - 1] !== months) ticks.push(months);
    ticks.forEach(function (t) { parts.push('<text class="label" x="' + x(t) + '" y="' + (H - 8) + '" text-anchor="' + (t === 0 ? 'start' : 'middle') + '">' + t + '개월</text>'); });
    svg.innerHTML = parts.join('');   // 그래프 이름은 <svg aria-label>에. <title>을 넣으면 네이버가 쪽 제목이 둘이라고 본다
    S.setText('chart-hint', monthlyB != null ? 'A(실선)와 B(점선)의 월별 누적 실부담. 계약기간 ' + months + '개월 기준.' : '월 실부담이 계약기간 ' + months + '개월 동안 쌓이는 모습입니다.');
  }
  function shortWon(n) {
    if (n >= 100000000) return (Math.round(n / 1000000) / 100) + '억';
    if (n >= 10000) return Math.round(n / 10000).toLocaleString('ko-KR') + '만';
    return S.fmtWon(n);
  }

  function resultText() {
    if (!last) return '';
    var i = last.i, a = last.a;
    var lines = ['[월세 실부담 계산]',
      '월세 ' + S.fmtWon(i.rent) + '원 / 관리비 ' + S.fmtWon(i.maint) + '원 / 기타 ' + S.fmtWon(i.extra) + '원',
      '보증금 ' + S.fmtWon(i.deposit) + '원 (' + (i.mode === 'loan' ? '대출금리' : '예금금리') + ' ' + S.fmtRate(i.rate) + '%)',
      '월 실부담 ' + S.fmtWon(a.monthly) + '원 · 연 ' + S.fmtWon(a.yearly) + '원 · ' + i.months + '개월 누적 ' + S.fmtWon(last.cum) + '원'];
    if (i.ab) lines.push('B 매물 월 실부담 ' + S.fmtWon(last.b.monthly) + '원');
    lines.push('※ 참고용 계산이며 금융·세무·법률 자문이 아닙니다.');
    return lines.join('\n');
  }

  S.ready(function () {
    $('rate').value = DEFAULT_DEPOSIT_RATE.toFixed(1); $('jeonseRate').value = DEFAULT_JEONSE_RATE.toFixed(1); $('months').value = DEFAULT_MONTHS;
    var recalc = S.wireCalc({
      key: 'rent',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['rent', 'maint', 'deposit', 'jeonse'].forEach(function (id) { $(id).value = ''; }); $('extra').value = '0'; return; }
        var p = PRESETS[name]; S.setMoney('rent', p.rent); S.setMoney('maint', p.maint); S.setMoney('extra', p.extra); S.setMoney('deposit', p.deposit); S.setMoney('jeonse', p.jeonse);
      },
      share: function () { return { title: '월세 실부담 계산 결과', text: resultText() }; },
      card: function () {
        var i = last.i, a = last.a;
        return { file: 'rent-result', title: '월세 실부담 계산기', kicker: '월 실부담', big: S.fmtWon(a.monthly), unit: '원',
          rows: [['월세', S.fmtWon(i.rent) + '원'], ['관리비 + 기타', S.fmtWon(i.maint + i.extra) + '원'], ['보증금 기회비용 (' + (i.mode === 'loan' ? '대출' : '예금') + ' ' + S.fmtRate(i.rate) + '%)', S.fmtWon(a.opp) + '원'], ['연 실부담', S.fmtWon(a.yearly) + '원'], [i.months + '개월 누적', S.fmtWon(last.cum) + '원']],
          note: '보증금 ' + S.fmtKorean(i.deposit) + ' 기준. 보증금 기회비용 = 보증금 × 연금리 ÷ 12.' };
      }
    });
    S.$$('input[name="mode"]').forEach(function (el) {
      el.addEventListener('change', function () { $('rate').value = (el.value === 'loan' ? DEFAULT_LOAN_RATE : DEFAULT_DEPOSIT_RATE).toFixed(1); recalc(); });
    });
    $('copy-btn').addEventListener('click', function () {
      S.copyText(resultText()).then(function () { S.toast('결과를 복사했습니다'); }).catch(function () { S.toast('복사에 실패했습니다'); });
    });
  });
})();
