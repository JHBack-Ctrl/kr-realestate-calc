/* 연금저축·IRP 세액공제 계산기 — 납입액별 세액공제와 연말까지 남은 공제 한도 */
(function () {
  'use strict';
  var S = window.Site, $ = S.$;

  // ---- 상수 (소득세법 제59조의3. 개정 시 이 블록만 수정) ----
  var RULES_DATE = '2026년 소득세법 기준 (2026-10 확인)';
  var SAVING_CAP = 6000000;          // 연금저축 공제 대상 한도
  var TOTAL_CAP = 9000000;           // 연금저축 + IRP 합산 한도
  var ISA_RATE = 10, ISA_CAP = 3000000;   // ISA 만기 자금을 연금계좌로 옮기면 그 10%(최대 300만원) 추가
  var LINE = { salary: 55000000, income: 45000000 };   // 총급여 5,500만원(근로소득만) / 종합소득금액 4,500만원 이하면 높은 공제율
  var RATE_HIGH = 15, RATE_LOW = 12; // 소득세 공제율 (지방소득세 10%가 더해져 16.5%·13.2%)
  var LOCAL_RATE = 10;

  function won(n) { return Math.floor(n + 1e-6); }
  function calc(i) {
    var high = i.income <= (i.kind === 'salary' ? LINE.salary : LINE.income);
    var rate = high ? RATE_HIGH : RATE_LOW;
    var savingEligible = Math.min(i.saving, SAVING_CAP);
    var base = Math.min(TOTAL_CAP, savingEligible + i.irp);
    var isa = Math.min(ISA_CAP, won(i.isa * ISA_RATE / 100));
    var eligible = base + isa;
    var credit = won(eligible * rate / 100);
    var capped = i.taxLimit > 0 && credit > i.taxLimit;
    if (capped) credit = i.taxLimit;
    var local = won(credit * LOCAL_RATE / 100);
    var room = TOTAL_CAP - base;                    // 900만원까지 더 넣을 수 있는 금액
    var roomSaving = Math.max(0, Math.min(SAVING_CAP - savingEligible, room));
    return { rate: rate, effective: rate * (100 + LOCAL_RATE) / 100, savingEligible: savingEligible, base: base, isa: isa, eligible: eligible, credit: credit, local: local, total: credit + local,
      capped: capped, room: room, roomSaving: roomSaving, roomCredit: won(won(room * rate / 100) * (100 + LOCAL_RATE) / 100), over: Math.max(0, i.saving - SAVING_CAP) };
  }
  function readInput() {
    return { kind: $('kind').value, income: S.parseMoney($('income').value), saving: S.parseMoney($('saving').value), irp: S.parseMoney($('irp').value),
      isa: S.parseMoney($('isa').value), taxLimit: S.parseMoney($('taxLimit').value) };
  }
  var last = null;
  function render(i) {
    var r = calc(i), has = i.saving + i.irp + i.isa > 0;
    S.setText('out-total', S.fmtWon(r.total)); S.setText('sticky-monthly', has ? S.fmtWon(r.total) + '원' : '—');
    S.setText('out-rate', S.fmtRate(r.effective)); S.setText('out-eligible', S.fmtWon(r.eligible)); S.setText('out-room', S.fmtWon(r.room));
    S.setText('out-saving-eligible', S.fmtWon(r.savingEligible)); S.setText('out-base', S.fmtWon(r.base)); S.setText('out-isa', S.fmtWon(r.isa));
    S.setText('out-credit', S.fmtWon(r.credit)); S.setText('out-local', S.fmtWon(r.local)); S.setText('out-room-credit', S.fmtWon(r.roomCredit));
    S.setText('rules-date', RULES_DATE);
    S.setText('out-note', !has ? '올해 연금저축·IRP에 넣은(넣을) 금액을 입력하면 바로 계산됩니다.' :
      '공제 대상 ' + S.fmtKorean(r.eligible) + '에 ' + S.fmtRate(r.effective) + '%(지방소득세 포함)를 적용했습니다. ' +
      (r.over ? '연금저축은 ' + S.fmtKorean(SAVING_CAP) + '까지만 공제되어 ' + S.fmtKorean(r.over) + '은 빠졌습니다. ' : '') +
      (r.room > 0 ? '12월 31일까지 ' + (r.roomSaving < r.room ? 'IRP로 ' : '') + S.fmtKorean(r.room) + '을 더 넣으면 약 ' + S.fmtKorean(r.roomCredit) + '이 더 공제됩니다. ' : '합산 한도 900만원을 다 채웠습니다. ') +
      (r.capped ? '낼 세금(결정세액)보다 공제가 커서 결정세액까지만 줄었습니다. ' : '') + '55세 전에 해지하면 공제받은 금액에 기타소득세 16.5%를 다시 냅니다.');
    last = { i: i, r: r };
  }
  S.ready(function () {
    S.wireCalc({
      key: 'pension-tax-credit',
      recalc: function () { render(readInput()); },
      preset: function (name) {
        ['saving', 'irp', 'isa', 'taxLimit'].forEach(function (k) { $(k).value = ''; });
        if (name === 'clear') return;
        var p = { s6: [50000000, 6000000, 0], s9: [50000000, 6000000, 3000000], h9: [80000000, 6000000, 3000000] }[name]; if (!p) return;
        $('kind').value = 'salary'; S.setMoney('income', p[0]); S.setMoney('saving', p[1]); S.setMoney('irp', p[2]);
      },
      share: function () { return { title: '연금저축·IRP 세액공제 계산 결과', text: '[연금저축·IRP] 연금저축 ' + S.fmtKorean(last.i.saving) + ' + IRP ' + S.fmtKorean(last.i.irp) + '\n세액공제 ' + S.fmtWon(last.r.total) + '원 (지방소득세 포함)' }; },
      card: function () {
        var r = last.r;
        return { file: 'pension-tax-credit-result', title: '연금저축·IRP 세액공제 계산기', kicker: '공제 대상 ' + S.fmtKorean(r.eligible) + ' · ' + S.fmtRate(r.effective) + '%', big: S.fmtWon(r.total), unit: '원',
          rows: [['연금저축 (최대 600만원)', S.fmtWon(r.savingEligible) + '원'], ['연금저축 + IRP (최대 900만원)', S.fmtWon(r.base) + '원'], ['소득세 / 지방소득세', S.fmtWon(r.credit) + ' / ' + S.fmtWon(r.local) + '원'], ['900만원까지 남은 한도', S.fmtWon(r.room) + '원']],
          note: RULES_DATE + '. 실제 공제는 결정세액 범위 안에서 됩니다.' };
      }
    });
  });
})();
