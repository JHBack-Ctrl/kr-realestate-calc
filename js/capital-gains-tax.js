/* 양도소득세 계산기 — 부동산 전 유형 (주택·입주권·분양권·토지·상가·국외)
   세율·공제·유예 등 바뀌는 값은 아래 상수 블록에만 있다. 매년 초와 세법 개정 시 확인. */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // =================== 상수 (기준일 표시) ===================
  var RULES_DATE = '2026년 1월 기준 소득세법·조세특례제한법';
  // 기본 누진세율: [과세표준 상한, 세율%, 누진공제]
  var BRACKETS = [
    [14000000, 6, 0], [50000000, 15, 1260000], [88000000, 24, 5760000], [150000000, 35, 15440000],
    [300000000, 38, 19940000], [500000000, 40, 25940000], [1000000000, 42, 35940000], [Infinity, 45, 65940000]
  ];
  var SHORT_HOUSE = { under1: 70, under2: 60 };   // 주택·조합원입주권 보유 1년 미만 / 2년 미만
  var SHORT_RIGHT = { under1: 70, over1: 60 };    // 분양권 1년 미만 / 1년 이상
  var SHORT_LAND = { under1: 50, under2: 40 };    // 토지·건물(주택 외)
  var NONBUSINESS_LAND_ADD = 10;                  // 비사업용 토지 가산 %p
  var UNREGISTERED_RATE = 70;                     // 미등기 양도
  var HEAVY_ADD = { 2: 20, 3: 30 };               // 조정대상지역 다주택 중과 가산 %p (2주택 / 3주택 이상)
  var HEAVY_SUSPENDED_UNTIL = '2026-05-09';       // 다주택 중과 한시 배제 종료일. 2026-05-10부터 중과 재개 (2026-09 확인). 2027~28년 완화는 정부안 단계라 미반영
  var BASIC_DEDUCTION = 2500000;                  // 양도소득 기본공제 (연 1회)
  var HIGH_PRICE_CAP = 1200000000;                // 1세대 1주택 비과세 한도 (양도가액 12억)
  var LTD_GENERAL = { minYears: 3, perYear: 2, max: 30 };                       // 장기보유특별공제 표1
  var LTD_ONEHOME = { minHold: 3, minRes: 2, holdPerYear: 4, holdMax: 40, resPerYear: 4, resMax: 40, res2to3: 8 }; // 표2
  var LOCAL_TAX_RATE = 10;                        // 지방소득세 (양도소득세의 %)
  var RURAL_ON_REDUCTION = 20;                    // 감면세액에 대한 농어촌특별세 %
  var REDUCTION_CAP_YEAR = 100000000;             // 감면 종합한도 (연 1억, 5년 2억)
  var CARRYOVER_YEARS_NEW = 10, CARRYOVER_YEARS_OLD = 5, CARRYOVER_CUTOFF = '2023-01-01'; // 배우자·직계존비속 이월과세
  var ADJ_RESIDENCE_FROM = '2017-08-03';          // 이후 조정대상지역 취득 주택은 2년 거주 요건
  var TEMP_TWO_YEARS = 3;                         // 일시적 2주택: 신주택 취득 후 종전주택 처분 기한(년)
  var TEMP_TWO_GAP_YEARS = 1;                     // 종전주택 취득 후 1년 이상 지나 신주택 취득
  var ESTIMATED_EXPENSE_RATE = 3;                 // 환산취득가액 적용 시 필요경비 개산공제 (취득당시 기준시가의 %)
  var REDUCTIONS = {                               // 감면: [율%, 농특세 과세 여부]
    none: [0, false], farmland: [100, false], exp_cash: [10, true], exp_bond: [15, true], exp_bond3: [30, true], exp_bond5: [40, true], custom: [null, true]
  };
  var HOMETAX_URL = 'https://www.hometax.go.kr';

  // =================== 유틸 ===================
  function yearsBetween(a, b) { return S.monthsBetween(a, b) / 12; }
  function addYears(d, y) { var x = new Date(d.getTime()); x.setFullYear(x.getFullYear() + y); return x; }
  // 'N월 말일부터 M개월' 기한 = M개월 뒤 달의 말일. 말일에 addMonths를 하면 30일·31일이 엇갈려 하루 당겨지거나 다음 달로 넘어간다
  function endOfMonthPlus(d, months) { return new Date(d.getFullYear(), d.getMonth() + months + 1, 0); }
  function progressive(base, addPct) {
    if (base <= 0) return { tax: 0, rate: 0, deduct: 0 };
    for (var i = 0; i < BRACKETS.length; i++) if (base <= BRACKETS[i][0]) {
      var rate = BRACKETS[i][1] + (addPct || 0);
      return { tax: Math.max(0, base * rate / 100 - BRACKETS[i][2]), rate: rate, deduct: BRACKETS[i][2] };
    }
  }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function chk(id) { var el = $(id); return !!(el && el.checked); }

  // =================== 입력 ===================
  function readInput() {
    return {
      kind: val('kind'), dealType: val('dealType'), unregistered: chk('unregistered'), nonresident: chk('nonresident'), nonbusiness: chk('nonbusiness'),
      acqCause: val('acqCause'), acqDate: S.parseDate(val('acqDate')), acqPrice: S.parseMoney(val('acqPrice')),
      decedentDate: S.parseDate(val('decedentDate')), sameHousehold: chk('sameHousehold'),
      donorRel: val('donorRel'), donorDate: S.parseDate(val('donorDate')), donorPrice: S.parseMoney(val('donorPrice')), giftTax: S.parseMoney(val('giftTax')),
      useEstimated: chk('useEstimated'), stdAcq: S.parseMoney(val('stdAcq')), stdSale: S.parseMoney(val('stdSale')),
      saleDate: S.parseDate(val('saleDate')), salePrice: S.parseMoney(val('salePrice')),
      giftValue: S.parseMoney(val('giftValue')), debt: S.parseMoney(val('debt')),
      acqCost: S.parseMoney(val('acqCost')), capex: S.parseMoney(val('capex')), saleCost: S.parseMoney(val('saleCost')),
      homes: val('homes'), adjArea: chk('adjArea'), adjAcquired: chk('adjAcquired'), resMonths: Math.floor(S.parseNonNegative(val('resMonths'))),
      special: val('special'), newHomeDate: S.parseDate(val('newHomeDate')), heavyExcluded: chk('heavyExcluded'), heavySuspended: chk('heavySuspended'),
      mpDate: S.parseDate(val('mpDate')), mpValue: S.parseMoney(val('mpValue')),
      basicUsed: chk('basicUsed'), reduction: val('reduction'), reductionPct: S.parseNonNegative(val('reductionPct'))
    };
  }

  // =================== 계산 ===================
  function calc(i) {
    var notes = [], warns = [];
    var isHouse = i.kind === 'house' || i.kind === 'right_assoc';
    var isRight = i.kind === 'right_sale';
    var isLand = i.kind === 'land', isBuilding = i.kind === 'building', isOverseas = i.kind === 'overseas';
    var out = { ok: false, notes: notes, warns: warns };
    if (!i.acqDate || !i.saleDate || i.salePrice <= 0 && i.dealType !== 'gift_debt') { out.reason = '취득일, 양도일, 양도가액을 입력하세요.'; return out; }
    if (i.saleDate < i.acqDate) { out.reason = '양도일이 취득일보다 앞섭니다.'; return out; }

    // ---- 취득가액·기준일 (원인별) ----
    var acqPrice = i.acqPrice, expenses = i.acqCost + i.capex + i.saleCost;
    var rateFrom = i.acqDate, ltdFrom = i.acqDate, exemptFrom = i.acqDate, carryover = false;
    if (i.acqCause === 'inherit') {
      if (i.decedentDate && i.decedentDate < i.acqDate) { rateFrom = i.decedentDate; notes.push('상속: 세율 판정 보유기간은 피상속인 취득일(' + S.fmtDate(i.decedentDate) + ')부터, 장기보유특별공제는 상속개시일부터 셉니다.'); }
      if (i.sameHousehold && i.decedentDate) { exemptFrom = i.decedentDate; notes.push('동일세대 상속이라 비과세 보유·거주 기간에 피상속인 기간을 합산했습니다.'); }
    } else if (i.acqCause === 'gift') {
      var cutoff = S.parseDate(CARRYOVER_CUTOFF), yrs = i.acqDate >= cutoff ? CARRYOVER_YEARS_NEW : CARRYOVER_YEARS_OLD;
      if (i.donorRel === 'spouse_lineal' && i.donorDate && yearsBetween(i.acqDate, i.saleDate) < yrs) {
        carryover = true; acqPrice = i.donorPrice; expenses += i.giftTax; rateFrom = ltdFrom = exemptFrom = i.donorDate;
        notes.push('이월과세: 배우자·직계존비속에게 증여받은 뒤 ' + yrs + '년 안에 양도해 취득가액과 보유기간을 증여자 기준으로 보고, 납부한 증여세 ' + S.fmtWon(i.giftTax) + '원을 필요경비에 넣었습니다.');
      } else if (i.donorRel === 'spouse_lineal') notes.push('증여 후 ' + yrs + '년이 지나 이월과세는 적용하지 않습니다.');
    }
    if (i.useEstimated) {
      if (i.stdAcq > 0 && i.stdSale > 0) { acqPrice = i.salePrice * i.stdAcq / i.stdSale; expenses = i.stdAcq * ESTIMATED_EXPENSE_RATE / 100; notes.push('환산취득가액 = 양도가액 × 취득당시 기준시가 ÷ 양도당시 기준시가. 필요경비는 실제 지출 대신 개산공제 ' + ESTIMATED_EXPENSE_RATE + '%를 적용했습니다.'); }
      else warns.push('환산취득가액을 쓰려면 취득·양도 당시 기준시가가 모두 필요합니다.');
    }

    // ---- 양도가액 (부담부증여 안분) ----
    var salePrice = i.salePrice;
    if (i.dealType === 'gift_debt') {
      if (i.giftValue <= 0 || i.debt <= 0) { out.reason = '부담부증여는 증여재산가액과 인수 채무액이 필요합니다.'; return out; }
      var ratio = Math.min(1, i.debt / i.giftValue);
      salePrice = i.debt; acqPrice = acqPrice * ratio; expenses = expenses * ratio;
      notes.push('부담부증여: 수증자가 인수한 채무 ' + S.fmtWon(i.debt) + '원을 양도가액으로 보고, 취득가액과 필요경비는 채무 비율 ' + S.fmtPct(ratio * 100) + '%만큼만 반영했습니다.');
    }

    var holdRate = yearsBetween(rateFrom, i.saleDate), holdLtd = yearsBetween(ltdFrom, i.saleDate), holdExempt = yearsBetween(exemptFrom, i.saleDate);
    var resYears = i.resMonths / 12;
    var gain = salePrice - acqPrice - expenses;
    out.salePrice = salePrice; out.acqPrice = acqPrice; out.expenses = expenses; out.gain = gain;
    out.holdRate = holdRate; out.holdLtd = holdLtd; out.holdExempt = holdExempt;

    // ---- 비과세 판정 (1세대 1주택) ----
    var exempt = false, taxableGain = Math.max(0, gain), oneHome = false, exemptReason = '';
    var homes = parseInt(i.homes, 10) || 1;
    var effHomes = homes;
    if (isHouse && !isOverseas) {
      if (i.special === 'temp2') {
        if (i.newHomeDate && i.newHomeDate >= addYears(i.acqDate, TEMP_TWO_GAP_YEARS) && i.saleDate <= addYears(i.newHomeDate, TEMP_TWO_YEARS)) { effHomes = 1; notes.push('일시적 2주택: 종전주택 취득 ' + TEMP_TWO_GAP_YEARS + '년 후 신주택을 취득했고 신주택 취득 후 ' + TEMP_TWO_YEARS + '년 안에 양도해 1주택으로 봅니다.'); }
        else warns.push('일시적 2주택 요건(종전주택 취득 후 ' + TEMP_TWO_GAP_YEARS + '년 경과, 신주택 취득 후 ' + TEMP_TWO_YEARS + '년 내 양도)이 확인되지 않아 2주택으로 계산했습니다.');
      } else if (i.special !== 'none') { effHomes = 1; notes.push('특례(' + ({ inherit: '상속주택', marriage: '혼인 합가', care: '동거봉양 합가', rental: '거주주택 특례' })[i.special] + ') 요건을 충족한다고 보고 1주택으로 계산했습니다. 요건 충족 여부는 반드시 확인하세요.'); }
      oneHome = effHomes === 1;
      if (oneHome && !i.unregistered && !i.nonresident) {
        var needRes = i.adjAcquired && i.acqDate >= S.parseDate(ADJ_RESIDENCE_FROM);
        if (holdExempt >= 2 && (!needRes || resYears >= 2)) {
          exempt = true;
          if (salePrice <= HIGH_PRICE_CAP) { taxableGain = 0; exemptReason = '1세대 1주택 비과세 (양도가액 ' + S.fmtKorean(HIGH_PRICE_CAP) + ' 이하)'; }
          else { taxableGain = Math.max(0, gain) * (salePrice - HIGH_PRICE_CAP) / salePrice; exemptReason = '1세대 1주택 고가주택: 양도차익 중 ' + S.fmtKorean(HIGH_PRICE_CAP) + ' 초과분 비율 ' + S.fmtPct((salePrice - HIGH_PRICE_CAP) / salePrice * 100) + '%만 과세'; }
        } else {
          exemptReason = '1주택이지만 비과세 요건 미충족: ' + (holdExempt < 2 ? '보유 2년 미만' : '조정대상지역 취득 주택의 거주 2년 미만');
        }
      } else if (i.unregistered) exemptReason = '미등기 양도는 비과세·공제가 없습니다';
      else if (i.nonresident) exemptReason = '비거주자는 1세대 1주택 비과세를 받을 수 없습니다';
      else exemptReason = '세대 기준 ' + homes + '주택이라 비과세 대상이 아닙니다';
    }
    out.exempt = exempt; out.exemptReason = exemptReason; out.oneHome = oneHome; out.taxableGain = taxableGain;

    // ---- 중과 판정 ----
    var heavy = 0, heavyNote = '';
    if (isHouse && i.adjArea && !oneHome && !i.heavyExcluded && !i.unregistered) {
      var lvl = homes >= 3 ? 3 : (homes === 2 ? 2 : 0);
      if (lvl) {
        if (i.heavySuspended) heavyNote = '조정대상지역 ' + homes + '주택이지만 중과 한시 배제(유예)를 적용해 기본세율과 장기보유특별공제를 적용했습니다.';
        else { heavy = HEAVY_ADD[lvl]; heavyNote = '조정대상지역 ' + (lvl === 3 ? '3주택 이상' : '2주택') + ' 중과: 기본세율에 ' + heavy + '%p 가산, 장기보유특별공제 배제.'; }
      }
    }
    if (i.heavyExcluded && isHouse && i.adjArea && homes >= 2) heavyNote = '중과 배제 대상 주택으로 지정해 중과하지 않았습니다.';
    var suspendedUntil = S.parseDate(HEAVY_SUSPENDED_UNTIL);
    if (isHouse && i.adjArea && homes >= 2 && i.saleDate > suspendedUntil && i.heavySuspended) warns.push('양도일이 중과 유예 종료일(' + HEAVY_SUSPENDED_UNTIL + ') 이후입니다. 유예는 종료되어 원칙적으로 중과가 적용되며, 2026-05-09까지 계약 체결·계약금 지급이 증빙되는 경우에만 배제됩니다.');
    out.heavy = heavy; out.heavyNote = heavyNote;

    // ---- 장기보유특별공제 ----
    var ltdRate = 0, ltdAmount = 0, ltdTable = '없음', ltdBase = taxableGain;
    var ltdAllowed = !isRight && !isOverseas && !i.unregistered && heavy === 0 && holdLtd >= LTD_GENERAL.minYears && taxableGain > 0;
    if (i.kind === 'right_assoc') {
      // 입주권: 관리처분인가 전 주택 보유분 차익에만 공제
      if (i.mpDate && i.mpValue > 0 && i.mpDate > ltdFrom) { ltdBase = Math.min(taxableGain, Math.max(0, i.mpValue - acqPrice - i.acqCost)); holdLtd = yearsBetween(ltdFrom, i.mpDate); ltdAllowed = ltdAllowed && holdLtd >= LTD_GENERAL.minYears && ltdBase > 0; notes.push('입주권: 관리처분인가일까지 주택으로 보유한 기간(' + S.fmtNum(holdLtd, 1) + '년)과 그때까지의 차익 ' + S.fmtWon(ltdBase) + '원에만 장기보유특별공제를 적용했습니다.'); }
      else { ltdAllowed = false; notes.push('입주권은 관리처분인가일과 당시 평가액을 넣어야 주택 보유분에 장기보유특별공제를 적용할 수 있습니다.'); }
    }
    if (ltdAllowed) {
      if (isHouse && oneHome && exempt && !i.nonresident && holdLtd >= LTD_ONEHOME.minHold && resYears >= LTD_ONEHOME.minRes) {
        var h = Math.min(LTD_ONEHOME.holdMax, LTD_ONEHOME.holdPerYear * Math.floor(holdLtd));
        var r = resYears >= 3 ? Math.min(LTD_ONEHOME.resMax, LTD_ONEHOME.resPerYear * Math.floor(resYears)) : LTD_ONEHOME.res2to3;
        ltdRate = h + r; ltdTable = '표2 (1세대 1주택: 보유 ' + h + '% + 거주 ' + r + '%)';
      } else {
        ltdRate = Math.min(LTD_GENERAL.max, LTD_GENERAL.perYear * Math.floor(holdLtd)); ltdTable = '표1 (일반: 연 ' + LTD_GENERAL.perYear + '%, ' + Math.floor(holdLtd) + '년)';
      }
      ltdAmount = ltdBase * ltdRate / 100;
    } else if (taxableGain > 0) {
      ltdTable = isRight ? '분양권은 공제 없음' : isOverseas ? '국외 자산은 공제 없음' : i.unregistered ? '미등기는 공제 없음' : heavy ? '중과 대상은 공제 배제' : holdLtd < LTD_GENERAL.minYears ? '보유 3년 미만' : '없음';
    }
    out.ltdRate = ltdRate; out.ltdAmount = ltdAmount; out.ltdTable = ltdTable;

    // ---- 과세표준 ----
    var income = Math.max(0, taxableGain - ltdAmount);
    var basic = (income > 0 && !i.basicUsed) ? Math.min(BASIC_DEDUCTION, income) : 0;
    var base = Math.max(0, income - basic);
    out.income = income; out.basic = basic; out.base = base;

    // ---- 세율 (비교과세: 해당하는 세율 중 큰 세액) ----
    var cands = [];
    if (base > 0) {
      if (i.unregistered) cands.push({ label: '미등기 양도 ' + UNREGISTERED_RATE + '%', tax: base * UNREGISTERED_RATE / 100, rate: UNREGISTERED_RATE });
      else {
        var add = heavy + ((isLand && i.nonbusiness) ? NONBUSINESS_LAND_ADD : 0);
        var p = progressive(base, add);
        cands.push({ label: '기본 누진세율 ' + p.rate + '%' + (add ? ' (가산 ' + add + '%p 포함)' : '') + ', 누진공제 ' + S.fmtWon(p.deduct) + '원', tax: p.tax, rate: p.rate });
        if (!isOverseas) {
          var sr = null;
          if (isHouse) sr = holdRate < 1 ? SHORT_HOUSE.under1 : holdRate < 2 ? SHORT_HOUSE.under2 : null;
          else if (isRight) sr = holdRate < 1 ? SHORT_RIGHT.under1 : SHORT_RIGHT.over1;
          else sr = holdRate < 1 ? SHORT_LAND.under1 : holdRate < 2 ? SHORT_LAND.under2 : null;
          if (sr) cands.push({ label: '단기 보유 세율 ' + sr + '% (보유 ' + S.fmtNum(holdRate, 1) + '년)', tax: base * sr / 100, rate: sr });
        }
      }
    }
    var chosen = cands.length ? cands.reduce(function (a, b) { return b.tax > a.tax ? b : a; }) : { label: '과세표준 0', tax: 0, rate: 0 };
    if (cands.length > 1) notes.push('두 가지 세율이 모두 해당해 세액이 큰 쪽을 적용했습니다(비교과세).');
    var computed = chosen.tax;

    // ---- 감면 ----
    var red = REDUCTIONS[i.reduction] || REDUCTIONS.none;
    var redPct = red[0] === null ? Math.min(100, i.reductionPct) : red[0];
    var reduction = Math.min(computed * redPct / 100, REDUCTION_CAP_YEAR);
    var rural = red[1] ? reduction * RURAL_ON_REDUCTION / 100 : 0;
    if (reduction > 0) notes.push('감면 ' + redPct + '% 적용, 연 ' + S.fmtKorean(REDUCTION_CAP_YEAR) + ' 한도' + (red[1] ? ', 감면세액의 ' + RURAL_ON_REDUCTION + '%는 농어촌특별세.' : ' (자경농지 감면은 농어촌특별세 비과세).'));
    var determined = Math.max(0, computed - reduction);
    var local = determined * LOCAL_TAX_RATE / 100;
    var total = determined + local + rural;

    // ---- 신고기한 ----
    var due = endOfMonthPlus(i.saleDate, i.dealType === 'gift_debt' ? 3 : 2);

    out.ok = true; out.rateLabel = chosen.label; out.rate = chosen.rate; out.computed = computed; out.redPct = redPct; out.reduction = reduction;
    out.rural = rural; out.determined = determined; out.local = local; out.total = total; out.due = due;
    out.effective = gain > 0 ? total / gain * 100 : 0;
    return out;
  }

  // =================== 화면 ===================
  var last = null;
  function toggleFields(i) {
    $('inherit-fields').hidden = i.acqCause !== 'inherit'; $('gift-fields').hidden = i.acqCause !== 'gift';
    $('estimated-fields').hidden = !i.useEstimated; $('giftdebt-fields').hidden = i.dealType !== 'gift_debt';
    var isHouse = i.kind === 'house' || i.kind === 'right_assoc';
    $('house-fields').hidden = !isHouse; $('assoc-fields').hidden = i.kind !== 'right_assoc'; $('land-fields').hidden = i.kind !== 'land';
    $('newhome-field').hidden = i.special !== 'temp2'; $('custom-reduction').hidden = i.reduction !== 'custom';
  }
  function render(i) {
    toggleFields(i);
    var r = calc(i);
    S.setText('rules-date', RULES_DATE); S.setText('suspend-date', HEAVY_SUSPENDED_UNTIL);
    if (!r.ok) {
      S.setText('out-total', '0'); S.setText('sticky-monthly', '0원'); S.setText('out-note', r.reason);
      ['out-tax', 'out-local', 'out-gain', 'out-base'].forEach(function (id) { S.setText(id, '0'); });
      $('detail-body').innerHTML = ''; $('judge-list').innerHTML = ''; last = { i: i, r: r }; return;
    }
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', S.fmtWon(r.total) + '원');
    S.setText('out-tax', S.fmtWon(r.determined)); S.setText('out-local', S.fmtWon(r.local)); S.setText('out-gain', S.fmtWon(r.gain)); S.setText('out-base', S.fmtWon(r.base));
    var rows = [
      ['양도가액', r.salePrice], ['취득가액', -r.acqPrice], ['필요경비', -r.expenses], ['양도차익', r.gain, true],
      [r.exempt && r.taxableGain < r.gain ? '과세대상 양도차익 (비과세 안분 후)' : '과세대상 양도차익', r.taxableGain],
      ['장기보유특별공제 ' + r.ltdTable + (r.ltdRate ? ' ' + r.ltdRate + '%' : ''), -r.ltdAmount], ['양도소득금액', r.income, true],
      ['기본공제', -r.basic], ['과세표준', r.base, true], ['산출세액 · ' + r.rateLabel, r.computed],
      ['감면세액' + (r.redPct ? ' (' + r.redPct + '%)' : ''), -r.reduction], ['결정 양도소득세', r.determined, true],
      ['지방소득세 (' + LOCAL_TAX_RATE + '%)', r.local], ['농어촌특별세', r.rural], ['총 납부세액', r.total, true]
    ];
    $('detail-body').innerHTML = rows.map(function (x) {
      var v = x[1], neg = v < 0; return '<tr' + (x[2] ? ' class="total"' : '') + '><th scope="row">' + x[0] + '</th><td>' + (neg ? '−' : '') + S.fmtWon(Math.abs(v)) + '원</td></tr>';
    }).join('');
    var judges = [];
    if (r.exemptReason) judges.push(['비과세', r.exemptReason]);
    if (r.heavyNote) judges.push(['중과', r.heavyNote]);
    judges.push(['보유기간', '세율 판정 ' + S.fmtNum(r.holdRate, 1) + '년 · 공제 ' + S.fmtNum(r.holdLtd, 1) + '년 · 비과세 ' + S.fmtNum(r.holdExempt, 1) + '년' + (i.resMonths ? ' · 거주 ' + S.fmtNum(i.resMonths / 12, 1) + '년' : '')]);
    judges.push(['세율', r.rateLabel]);
    judges.push(['신고기한', '예정신고 ' + S.fmtDate(r.due) + ' (양도일이 속한 달 말일부터 ' + (i.dealType === 'gift_debt' ? '3' : '2') + '개월)']);
    r.notes.forEach(function (n) { judges.push(['참고', n]); });
    r.warns.forEach(function (w) { judges.push(['확인 필요', w]); });
    $('judge-list').innerHTML = judges.map(function (j) { return '<li><p class="t">' + j[0] + '</p><p class="d">' + j[1] + '</p></li>'; }).join('');
    S.setText('out-note', r.total === 0 && r.exempt ? '비과세로 납부할 양도소득세가 없습니다. 비과세라도 신고 의무가 있는 경우(고가주택 등)가 있으니 홈택스에서 확인하세요.'
      : '양도차익 ' + S.fmtKorean(r.gain) + ' 중 과세표준 ' + S.fmtKorean(r.base) + '에 ' + r.rate + '%를 적용했습니다. 실효세율 ' + S.fmtPct(r.effective) + '%. 참고용 추정이며 최종 확인은 홈택스 모의계산과 세무사 상담을 기준으로 하세요.');
    last = { i: i, r: r };
  }

  S.ready(function () {
    $('saleDate').value = S.fmtDate(S.today());
    // 유예 스위치 기본값: 양도일이 마지막 확인된 유예 종료일 이전이면 켬
    var recalc = S.wireCalc({
      key: 'capital-gains-tax',
      recalc: function () { render(readInput()); },
      onApply: function () { toggleFields(readInput()); },
      share: function () {
        var r = last.r; if (!r.ok) return { title: '양도세 계산', text: '입력을 완성하세요' };
        return { title: '양도소득세 계산 결과', text: '[양도세 추정] 양도 ' + S.fmtKorean(r.salePrice) + ' · 취득 ' + S.fmtKorean(r.acqPrice) + ' · 차익 ' + S.fmtKorean(r.gain) + '\n' + (r.exempt && r.taxableGain === 0 ? '1세대 1주택 비과세' : '양도세 ' + S.fmtWon(r.determined) + '원 + 지방소득세 ' + S.fmtWon(r.local) + '원 = ' + S.fmtWon(r.total) + '원 (참고용)') };
      },
      card: function () {
        var r = last.r; if (!r.ok) return { file: 'capital-gains-tax', title: '양도소득세 계산기', kicker: '입력을 완성하세요', big: '0', unit: '원', rows: [] };
        return { file: 'capital-gains-tax-result', title: '양도소득세 계산기', kicker: '예상 총 납부세액 (양도세 + 지방소득세' + (r.rural ? ' + 농특세' : '') + ')', big: S.fmtWon(r.total), unit: '원',
          rows: [['양도차익', S.fmtWon(r.gain) + '원'], ['장기보유특별공제', S.fmtWon(r.ltdAmount) + '원 (' + r.ltdRate + '%)'], ['과세표준', S.fmtWon(r.base) + '원'], ['적용 세율', r.rate + '%'], ['결정 양도소득세', S.fmtWon(r.determined) + '원'], ['지방소득세', S.fmtWon(r.local) + '원']],
          note: RULES_DATE + '. 참고용 추정이며 최종 확인은 홈택스 모의계산과 세무사 상담을 기준으로 하세요.' };
      }
    });
    // 양도일 바뀔 때 유예 스위치 기본값 갱신 (사용자가 직접 바꾼 뒤에는 유지)
    var touched = false;
    $('heavySuspended').addEventListener('change', function () { touched = true; });
    function syncSuspend() { if (touched) return; var d = S.parseDate($('saleDate').value); $('heavySuspended').checked = !!(d && d <= S.parseDate(HEAVY_SUSPENDED_UNTIL)); }
    $('saleDate').addEventListener('change', function () { syncSuspend(); recalc(); });
    if (!$('heavySuspended').checked) syncSuspend(); recalc();
    $('hometax-link').href = HOMETAX_URL;
  });
})();
