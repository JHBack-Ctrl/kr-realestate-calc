/* 상속세 계산기 — 일괄·배우자·금융재산 공제와 10년 사전증여 합산으로 상속세 참고용 추정 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (상속세 및 증여세법. 개정 시 이 블록만 수정) ----
  // 자녀공제 5억 상향·유산취득세 전환 등 개편안은 국회 통과 전이라 반영하지 않음
  var RULES_DATE = '2026년 상속세 및 증여세법 기준 (2026-10 확인)';
  var LUMP = 500000000;                  // 일괄공제 5억 (배우자 단독 상속이면 쓸 수 없음)
  var BASIC = 200000000;                 // 기초공제 2억
  var CHILD = 50000000;                  // 자녀공제 1인당 5천만
  var SPOUSE_MIN = 500000000, SPOUSE_MAX = 3000000000;   // 배우자공제 최소 5억, 최대 30억
  var SPOUSE_SHARE = 1.5;                // 법정상속분: 배우자 1.5, 자녀 1인당 1
  var FIN_ALL = 20000000, FIN_FLAT = 100000000, FIN_RATE = 20, FIN_MAX = 200000000;   // 금융재산공제: 2천만 이하 전액, 1억 이하 2천만, 그 위 20%(최대 2억)
  var FUNERAL_MIN = 5000000, FUNERAL_MAX = 10000000;     // 장례비: 증빙 없어도 500만, 최대 1,000만 (봉안시설 500만 별도는 미반영)
  var GIFT_DEDUCT = 50000000;            // 사전증여 공제한도 계산에 쓰는 증여재산공제(성년 자녀 기준)
  // 세율 [과세표준 상한, 세율%, 누진공제] — 증여세와 같다
  var RATES = [[100000000, 10, 0], [500000000, 20, 10000000], [1000000000, 30, 60000000], [3000000000, 40, 160000000], [Infinity, 50, 460000000]];
  var MIN_BASE = 500000;                 // 과세표준 50만원 미만이면 과세하지 않음
  var FILING_CREDIT = 3;                 // 신고세액공제 3%

  function won(n) { return Math.floor(n + 1e-6); }   // 원 미만 버림(부동소수 오차 보정)
  function progressive(base) {
    if (base <= 0) return { tax: 0, rate: 0 };
    for (var k = 0; k < RATES.length; k++) if (base <= RATES[k][0]) return { tax: Math.max(0, base * RATES[k][1] / 100 - RATES[k][2]), rate: RATES[k][1] };
  }
  function finDeduct(fin) {
    if (fin <= FIN_ALL) return fin;
    if (fin <= FIN_FLAT) return FIN_ALL;
    return Math.min(FIN_MAX, won(fin * FIN_RATE / 100));
  }
  function calc(i) {
    var funeral = Math.min(Math.max(i.funeral, FUNERAL_MIN), FUNERAL_MAX);
    var taxable = Math.max(0, i.estate + i.prior - i.debt - funeral);      // 상속세 과세가액
    var spouseOnly = i.spouse && i.kids === 0;
    var basicPlus = BASIC + CHILD * i.kids;
    var lump = spouseOnly ? 0 : LUMP;
    var basicDed = Math.max(lump, basicPlus), basicKind = basicDed === lump && lump > 0 ? '일괄공제' : '기초·자녀공제';
    var legal = !i.spouse ? 0 : i.kids > 0 ? won(taxable * SPOUSE_SHARE / (SPOUSE_SHARE + i.kids)) : taxable;   // 곱한 뒤 나눠야 20억 같은 금액이 1원 밀리지 않는다
    var spouseDed = 0;
    if (i.spouse) {
      var received = i.spouseAmt > 0 ? i.spouseAmt : legal;
      spouseDed = Math.max(SPOUSE_MIN, Math.min(received, legal, SPOUSE_MAX));
    }
    var finDed = finDeduct(Math.min(i.fin, i.estate));
    var dedSum = basicDed + spouseDed + finDed;
    var priorBase = Math.max(0, i.prior - GIFT_DEDUCT);
    var cap = Math.max(0, taxable - priorBase);                            // 공제적용 한도
    var ded = Math.min(dedSum, cap), capped = dedSum > cap;
    var base = taxable - ded; if (base < MIN_BASE) base = 0;
    var p = progressive(base), computed = won(p.tax);
    var priorCredit = base > 0 ? Math.min(i.priorTax, won(computed * Math.min(1, priorBase / base))) : 0;
    var filing = i.filing ? won((computed - priorCredit) * FILING_CREDIT / 100) : 0;
    var tax = Math.max(0, computed - priorCredit - filing);
    return { funeral: funeral, taxable: taxable, basicDed: basicDed, basicKind: basicKind, spouseOnly: spouseOnly, legal: legal, spouseDed: spouseDed,
      finDed: finDed, dedSum: dedSum, ded: ded, capped: capped, base: base, rate: p.rate, computed: computed, priorCredit: priorCredit, filing: filing, tax: tax,
      effective: i.estate > 0 ? tax / i.estate * 100 : 0 };
  }
  function readInput() {
    return { estate: S.parseMoney($('estate').value), fin: S.parseMoney($('fin').value), debt: S.parseMoney($('debt').value), funeral: S.parseMoney($('funeral').value),
      spouse: $('spouse').checked, kids: Math.min(20, Math.floor(S.parseNonNegative($('kids').value))), spouseAmt: S.parseMoney($('spouseAmt').value),
      prior: S.parseMoney($('prior').value), priorTax: S.parseMoney($('priorTax').value), filing: $('filing').checked };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.estate > 0;
    $('spouse-fields').hidden = !i.spouse;
    S.setText('out-tax', S.fmtWon(r.tax)); S.setText('sticky-monthly', has ? S.fmtWon(r.tax) + '원' : '—');
    S.setText('out-ded', S.fmtWon(r.ded)); S.setText('out-rate', r.rate); S.setText('out-effective', S.fmtPct(r.effective));
    S.setText('out-taxable', S.fmtWon(r.taxable)); S.setText('out-funeral', S.fmtWon(r.funeral));
    S.setText('out-basic-kind', r.basicKind); S.setText('out-basic', S.fmtWon(r.basicDed)); S.setText('out-spouse', S.fmtWon(r.spouseDed)); S.setText('out-fin', S.fmtWon(r.finDed));
    S.setText('out-base', S.fmtWon(r.base)); S.setText('out-computed', S.fmtWon(r.computed)); S.setText('out-prior-credit', S.fmtWon(r.priorCredit)); S.setText('out-filing', S.fmtWon(r.filing));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '상속재산과 상속인을 입력하면 바로 계산됩니다.' : (r.base <= 0
      ? '공제 합계 ' + S.fmtKorean(r.ded) + '가 과세가액 ' + S.fmtKorean(r.taxable) + '을 넘어 낼 상속세가 없습니다. '
      : '과세가액 ' + S.fmtKorean(r.taxable) + '에서 공제 ' + S.fmtKorean(r.ded) + '을 뺀 과세표준 ' + S.fmtKorean(r.base) + '에 세율 ' + r.rate + '%를 적용했습니다. ') +
      (r.spouseOnly ? '배우자 혼자 상속받으면 일괄공제 5억원을 쓸 수 없어 기초공제 2억원으로 계산했습니다(부모가 살아 있으면 함께 상속인이 됩니다). ' : '') +
      (i.spouse && i.kids > 0 && !(i.spouseAmt > 0) ? '배우자가 법정상속분(' + S.fmtKorean(r.legal) + ')만큼 받는다고 보았습니다. ' : '') +
      (r.capped ? '사전증여 때문에 공제 한도에 걸려 공제가 줄었습니다. ' : '') + '상속개시일이 속한 달의 말일부터 6개월 안에 신고합니다. 참고용 추정입니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    $('spouse').checked = true; $('filing').checked = true;   // 기본: 배우자 있음, 기한 안에 신고
    S.wireCalc({
      key: 'inheritance-tax',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        if (name === 'clear') { ['estate', 'fin', 'debt', 'funeral', 'spouseAmt', 'prior', 'priorTax'].forEach(function (k) { $(k).value = ''; }); return; }
        var p = { s10: [1000000000, true], s20: [2000000000, true], k10: [1000000000, false] }[name]; if (!p) return;
        S.setMoney('estate', p[0]); $('spouse').checked = p[1]; $('kids').value = '2';
        ['fin', 'debt', 'funeral', 'spouseAmt', 'prior', 'priorTax'].forEach(function (k) { $(k).value = ''; }); $('filing').checked = true;
      },
      share: function () { return { title: '상속세 계산 결과', text: '[상속세 추정] 상속재산 ' + S.fmtKorean(last.i.estate) + ' · 공제 ' + S.fmtKorean(last.r.ded) + '\n예상 상속세 ' + S.fmtWon(last.r.tax) + '원 (참고용)' }; },
      card: function () {
        var r = last.r;
        return { file: 'inheritance-tax-result', title: '상속세 계산기', kicker: '상속재산 ' + S.fmtKorean(last.i.estate) + ' · 예상 상속세', big: S.fmtWon(r.tax), unit: '원',
          rows: [['과세가액', S.fmtWon(r.taxable) + '원'], [r.basicKind, '−' + S.fmtWon(r.basicDed) + '원'], ['배우자공제', '−' + S.fmtWon(r.spouseDed) + '원'], ['과세표준', S.fmtWon(r.base) + '원'], ['산출세액 (' + r.rate + '%)', S.fmtWon(r.computed) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 실제 세액은 재산 평가와 신고 내용에 따라 다릅니다.' };
      }
    });
  });
})();
