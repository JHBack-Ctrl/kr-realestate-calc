// 사이트 전체 검증 — 커밋 전에 돌린다.
//
//   node tools/verify.js              저장소 루트를 검사
//   node tools/verify.js <사이트폴더>   다른 폴더(예: 배포 재현본)를 검사
//   --shots <폴더>   스크린샷 저장 위치 (기본: 시스템 임시 폴더)
//   --no-shots      스크린샷 생략
//
// 스크린샷은 검사 대상 폴더 안에 저장하지 않는다. 한 번 저장소에 떨어져서 커밋되고
// 사이트에까지 올라간 적이 있다(2026-09). 폴더 안을 가리키면 거부한다.
//
// 날짜: 브라우저 시계를 REF_DATE로 고정해서 돌린다. D-day·"다음 기한"처럼 오늘에 따라
// 바뀌는 값이 있어서, 고정하지 않으면 날짜가 지나면서 사이트는 멀쩡한데 실패가 뜬다.
//
// 기대값: 연봉·퇴직금은 js/salary.js·js/severance.js의 요율로 계산한 값이다.
// 1월에 요율 상수를 바꾸면 여기 기대값도 새 요율로 다시 뽑아서 바꿔야 한다.
//
// 종료 코드: 실패가 있으면 1, Playwright가 없으면 2.

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* 로컬에 없으면 전역 설치를 찾는다 */ }
  try {
    const root = require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require(path.join(root, 'playwright'));
  } catch (e) {
    console.error('Playwright를 찾을 수 없습니다. `npm i -g playwright` 후 `npx playwright install chromium`을 실행하세요.');
    process.exit(2);
  }
}

// ---------------------------------------------------------------- 인자
const args = process.argv.slice(2);
let shots = path.join(os.tmpdir(), 'site-verify-shots');
let rootArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--no-shots') shots = null;
  else if (args[i] === '--shots') shots = path.resolve(args[++i]);
  else rootArg = args[i];
}
const ROOT = path.resolve(rootArg || path.join(__dirname, '..'));
if (shots && (shots === ROOT || shots.startsWith(ROOT + path.sep))) {
  console.error('스크린샷 폴더가 검사 대상 안에 있습니다: ' + shots + '\n다른 폴더를 --shots로 주거나 --no-shots를 쓰세요.');
  process.exit(2);
}
if (shots) fs.mkdirSync(shots, { recursive: true });

const BASE = pathToFileURL(ROOT).href + '/';
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
// 사이트맵에 있는 쪽 = 검색에 넣는 쪽. 나머지는 noindex여야 한다 (site_core.is_noindex 한 곳에서 정함)
const SITEMAP = new Set((fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').match(/<loc>[^<]+<\/loc>/g) || [])
  .map(l => l.replace(/<\/?loc>/g, '').replace(/^https?:\/\/[^/]+\//, '') || 'index.html'));

// 기대값을 만든 날. 브라우저의 "오늘"이 이 날로 고정된다.
const REF_DATE = new Date(2026, 8, 21);                       // 2026-09-21
const dday = (y, m, d) => 'D-' + Math.round((new Date(y, m - 1, d) - REF_DATE) / 86400000);

let fails = 0;
function expect(label, got, want) {
  const ok = String(got).trim() === String(want); if (!ok) fails++;
  console.log(`${ok ? '  ok ' : '  FAIL'} ${label}: ${got}${ok ? '' : '  (기대값 ' + want + ')'}`);
}
function near(label, got, want, tol) {
  const g = Number(String(got).replace(/[^\d.-]/g, '')); const ok = Math.abs(g - want) <= tol; if (!ok) fails++;
  console.log(`${ok ? '  ok ' : '  FAIL'} ${label}: ${got}${ok ? '' : '  (기대값 약 ' + want + ')'}`);
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.clock.setFixedTime(new Date(2026, 8, 21, 9, 0, 0));
  await ctx.route('**cdn.jsdelivr.net/**', r => r.abort());   // 웹폰트 — 검사와 무관, 오프라인에서도 돌게
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(page.url().split('/').pop() + ': ' + e.message));
  const get = async id => (await page.textContent('#' + id)).trim();
  const type = async (id, v) => { await page.fill('#' + id, ''); await page.type('#' + id, v); };
  const toggle = async id => page.click(`#${id} ~ .knob`);
  // 라디오는 숨겨진 input이라 page.check({force})가 가끔 다른 요소를 눌러 실패한다(#40에서 한 번 겪음). 값을 직접 바꾸고 change를 보낸다.
  const radio = async (name, value) => page.evaluate(([n, v]) => { const r = document.querySelector(`input[name="${n}"][value="${v}"]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, [name, value]);
  const fresh = async p => { await page.goto(BASE + p); await page.evaluate(() => localStorage.clear()); await page.goto(BASE + p); };

  console.log(`검사 대상: ${ROOT}`);
  console.log(`기준일: 2026-09-21 (브라우저 시계 고정)`);

  // ------------------------------------------------------------ 구조
  console.log('--- 페이지 구조 (' + PAGES.length + '쪽) ---');
  for (const f of PAGES) {
    await page.goto(BASE + f);
    const r = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { JSON.parse(s.textContent); } catch (e) { bad.push('JSON-LD'); } });
      if (document.querySelectorAll('h1').length !== 1) bad.push('h1=' + document.querySelectorAll('h1').length);
      if (!document.querySelector('#theme-toggle')) bad.push('theme-btn');
      if (!document.querySelector('link[rel=canonical]')) bad.push('canonical');
      const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && !/^(https?:|#|mailto:)/.test(h));
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dup.length) bad.push('dup-id:' + [...new Set(dup)].join(','));
      const robots = document.querySelector('meta[name=robots]');
      return { bad, links, noindex: !!(robots && /noindex/.test(robots.content)), sw: document.documentElement.scrollWidth, text: document.body.innerText.length };
    });
    if (r.sw > 391) r.bad.push('overflow390=' + r.sw);
    // 사이트맵과 noindex가 엇갈리면 안 된다. 안내 글과 홈은 반드시 검색에 들어가야 한다.
    if (SITEMAP.has(f) === r.noindex) r.bad.push(r.noindex ? 'noindex인데 사이트맵에 있음' : '사이트맵에 없는데 noindex 아님');
    if ((f.startsWith('guide-') || f === 'index.html') && r.noindex) r.bad.push('안내 글·홈이 noindex');
    for (const l of new Set(r.links)) {
      const target = l.split('#')[0].split('?')[0];
      if (target !== '' && !fs.existsSync(path.join(ROOT, target))) r.bad.push('link:' + l);
    }
    if (r.bad.length) { fails++; console.log(`FAIL ${f.padEnd(34)} ${String(r.text).padStart(5)}자  ${r.bad.join(' ')}`); }
  }

  // 가장 좁은 폰(320px)에서 페이지 전체가 옆으로 밀리는지. 표는 자기 상자 안에서만 스크롤되면 된다.
  await page.setViewportSize({ width: 320, height: 844 });
  for (const f of PAGES) {
    await page.goto(BASE + f);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 321) { fails++; console.log(`FAIL ${f.padEnd(34)} overflow320=${sw}`); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  console.log(`  구조 검사 끝 (390px·320px) — 검색 대상 ${SITEMAP.size}쪽, 검색 제외 ${PAGES.length - SITEMAP.size}쪽`);

  // ------------------------------------------------------------ 계산기 값
  console.log('--- 계산기 ---');
  await fresh('renewal.html');
  await page.fill('#start', '2025-03-01'); await page.fill('#months', '24'); await type('deposit', '50000000'); await type('rent', '600000');
  expect('갱신 상태', await get('out-status'), '가능'); expect('갱신 만기', await get('out-end'), '2027-03-01');
  expect('갱신 시작', await get('out-wstart'), '2026-09-01'); expect('갱신 마감', await get('out-wend'), '2026-12-31');
  expect('갱신 D-day', await get('out-big'), dday(2026, 12, 31));
  expect('보증금 5%', await get('out-dep-cap'), '52,500,000'); expect('월세 5%', await get('out-rent-cap'), '630,000'); expect('환산 상한', await get('out-equiv-cap'), '203,700,000');
  expect('환산 보증금', await get('out-equiv'), '194,000,000');   // term-gaesinyogugwon.html
  expect('묵시적 갱신 해지 효력일', await get('out-terminate'), '2026-12-21');   // term-muksijeokgaesin.html (시계 9/21 + 3개월)
  await type('deposit', '10000000'); await type('rent', '500000'); expect('갱신 월세 50만 상한', await get('out-rent-cap'), '525,000');   // term-gwallibi.html
  await type('deposit', '300000000'); await type('rent', '0'); expect('전세 3억 갱신 상한', await get('out-dep-cap'), '315,000,000');

  await fresh('tax-calendar.html');
  await page.fill('#acqDate', '2026-08-15'); await page.fill('#saleDate', '2026-08-15');
  expect('세금달력 다음', await get('out-next-name'), '취득세 신고·납부 마감'); expect('세금달력 날짜', await get('out-next-date'), '2026-10-14');
  expect('세금달력 D', await get('out-big'), dday(2026, 10, 14)); expect('세금달력 건수', await get('out-count'), '4');
  const rows = await page.$$eval('#event-body tr th', ths => ths.map(t => t.textContent)); expect('양도세 예정신고', rows.includes('2026-10-31'), true);
  // '말일부터 N개월'은 N개월 뒤 달의 말일. 말일에 월을 더하면 30·31일이 엇갈려 틀리던 것(2026-10 수정) 회귀 방지
  const evDates = async () => page.$$eval('#event-body tr th', ths => ths.map(t => t.textContent));
  await page.fill('#saleDate', '2026-06-15'); expect('예정신고 6월 양도 → 8/31', (await evDates()).includes('2026-08-31'), true);
  await page.fill('#saleDate', '2026-11-02'); expect('예정신고 11월 양도 → 1/31', (await evDates()).includes('2027-01-31'), true);
  await page.fill('#saleDate', '2026-12-10'); expect('예정신고 12월 양도 → 2/28', (await evDates()).includes('2027-02-28'), true);
  await page.selectOption('#acqCause', 'gift'); await page.fill('#acqDate', '2026-08-15'); expect('증여 취득세 8월 → 11/30', (await evDates()).includes('2026-11-30'), true);
  await page.selectOption('#acqCause', 'inherit'); await page.fill('#acqDate', '2026-08-15'); expect('상속 취득세 8월 → 2/28', (await evDates()).includes('2027-02-28'), true);

  await fresh('moving.html');
  await page.fill('#moveDate', '2026-10-01');
  expect('이사 D', await get('out-big'), dday(2026, 10, 1)); expect('전입신고 기한', await get('out-report'), '2026-10-15'); expect('자동차', await get('out-car'), '2026-10-31');
  await page.check('#m1'); await page.check('#m2'); expect('이사 진행', (await get('out-done')).startsWith('2 /'), true);

  await fresh('rate-compare.html');
  await type('principal', '100000000'); await page.fill('#years', '10'); await page.fill('#fixedRate', '5'); await page.fill('#varRate', '5'); await page.fill('#varChange', '0');
  expect('고정 월상환', await get('out-fixed-pay'), '1,060,655'); expect('변동 첫달', await get('out-var-first'), '1,060,655'); expect('총이자 차이 0', await get('out-big'), '0');
  await page.fill('#varChange', '1'); expect('상승 시 고정 유리', (await get('out-kicker')).startsWith('고정'), true);

  // 8억 예시 버튼 — 취득세율을 8억 1주택 실효세율(2.57%)로 채워야 한다. 지우기는 기본값 1.1%로 되돌린다.
  await fresh('buy-vs-rent.html');
  await page.click('.chip[data-preset="flat"]');
  expect('8억 예시 취득세율', await page.inputValue('#acqRate'), '2.57');
  expect('매매 총비용', await get('out-buy-total'), '172,960,000'); expect('전세 총비용', await get('out-j-total'), '81,500,000'); expect('차이', await get('out-big'), '91,460,000'); expect('손익분기', await get('out-be'), '2.19%');
  await page.click('.chip[data-preset="clear"]');
  expect('지우기 후 취득세율', await page.inputValue('#acqRate'), '1.1');

  // guide-buy-vs-rent.html 본문 숫자 — 6억 매매 / 4억 전세, 나머지는 기본 비율
  await fresh('buy-vs-rent.html');
  await type('price', '600000000'); await type('loan', '300000000'); await page.fill('#loanRate', '4.0');
  await type('jeonse', '400000000'); await type('jLoan', '160000000'); await page.fill('#jRate', '3.5');
  expect('6억 매매 총비용', await get('out-buy-total'), '120,900,000'); expect('4억 전세 총비용', await get('out-j-total'), '65,200,000'); expect('6억/4억 손익분기', await get('out-be'), '1.79%');

  // guide-deposit-vs-rent.html 본문 숫자 — 두 매물 비교, 대출금리 4.5%에서 두 값이 같아짐
  await fresh('rent.html');
  if (!(await page.isChecked('#ab-toggle'))) await toggle('ab-toggle');
  await type('rent', '700000'); await type('maint', '100000'); await type('deposit', '10000000');
  await type('b-rent', '550000'); await type('b-maint', '100000'); await type('b-deposit', '50000000');
  await page.fill('#months', '24');
  await radio('mode', 'loan'); await page.fill('#rate', '4.5');
  expect('보증금 A 4.5%', await get('ab-a-total'), '837,500'); expect('보증금 B 4.5%', await get('ab-b-total'), '837,500');
  await page.fill('#rate', '3');
  expect('보증금 A 3%', await get('ab-a-total'), '825,000'); expect('보증금 B 3%', await get('ab-b-total'), '775,000'); expect('보증금 2년 차이', await get('ab-d-cum'), '1,200,000');

  // guide-jeonse-vs-monthly.html 본문 표 — 전세 2억 vs 보증금 2천/월세 60만, 관리비 10만. 4%에서 같아짐
  await fresh('rent.html');
  await type('rent', '600000'); await type('maint', '100000'); await type('deposit', '20000000'); await type('jeonse', '200000000');
  for (const [r, j, m] of [['2', '433,333', '733,333'], ['3', '600,000', '750,000'], ['4', '766,667', '766,667'], ['5', '933,333', '783,333']]) {
    await page.fill('#rate', r); await page.fill('#jeonseRate', r);
    expect(`전세vs월세 ${r}% 전세`, await get('cv-jeonse-total'), j); expect(`전세vs월세 ${r}% 월세`, await get('cv-rent-total'), m);
  }
  await page.fill('#rate', '3'); await page.fill('#jeonseRate', '3'); expect('같아지는 전세금 3%', await get('cv-needed-jeonse'), '260,000,000');
  await page.fill('#jeonseRate', '3.75'); expect('혼합 금리 전세', await get('cv-jeonse-total'), '725,000');
  await type('rent', '498000'); await page.fill('#rate', '3.32'); await page.fill('#jeonseRate', '3.32');
  expect('세액공제 반영 갈림길 3.32% 전세', await get('cv-jeonse-total'), '653,333'); expect('세액공제 반영 갈림길 3.32% 월세', await get('cv-rent-total'), '653,333');

  // guide-conversion.html 본문 표 — 전세 3억 → 보증금 1억, 기준금리별 법정 상한
  await fresh('conversion.html');
  await type('jeonse', '300000000'); await type('deposit', '100000000'); await page.fill('#marketRate', '6');
  for (const [br, want] of [['2.5', '750,000'], ['3', '833,333'], ['3.5', '916,667']]) { await page.fill('#baseRate', br); expect(`전환 기준 ${br}% 법정`, await get('out-big'), want); }
  await page.fill('#baseRate', '3'); expect('전환 시장 6%', (await get('out-market')).replace(/\s/g, ''), '1,000,000원/월');
  await radio('mode', 'm2j'); await type('rent', '900000');
  expect('역전환 5%', await get('out-big'), '316,000,000');
  await page.fill('#marketRate', '6'); expect('역전환 시장 6%', (await get('out-market')).replace(/[^\d,]/g, ''), '280,000,000');

  // guide-brokerage.html 본문 — 구간 경계, 70배 환산, 오피스텔
  await fresh('fee.html');
  for (const [v, want] of [['600000000', '2,400,000'], ['890000000', '3,560,000'], ['900000000', '4,500,000'], ['1200000000', '7,200,000'], ['1500000000', '10,500,000']]) { await type('price', v); expect(`복비 매매 ${v}`, await get('out-fee'), want); }
  await radio('deal', 'jeonse');
  for (const [v, want] of [['400000000', '1,200,000'], ['600000000', '2,400,000']]) { await type('price', v); expect(`복비 전세 ${v}`, await get('out-fee'), want); }
  await radio('deal', 'monthly'); await type('deposit', '5000000'); await type('rent', '400000');
  expect('복비 월세 70배', await get('out-fee'), '165,000');
  await radio('kind', 'officetel'); await radio('deal', 'sale'); await type('price', '300000000');
  expect('복비 오피스텔 3억', await get('out-fee'), '1,500,000');
  // guide-buying-costs.html — 주택 매매 상한과 부가세
  await radio('kind', 'house'); await radio('deal', 'sale');
  for (const [v, fee, vat] of [['600000000', '2,400,000', '240,000'], ['750000000', '3,000,000', '300,000'], ['900000000', '4,500,000', '450,000']]) { await type('price', v); expect(`복비 ${v}`, await get('out-fee'), fee); expect(`복비 부가세 ${v}`, await get('out-vat'), vat); }
  // table-brokerage-fee.html 계산 예시 중 한도액 행
  await radio('kind', 'house'); await type('price', '45000000'); expect('복비 매매 4,500만 한도', await get('out-fee'), '250,000');
  await type('price', '150000000'); expect('복비 매매 1.5억', await get('out-fee'), '750,000');
  await radio('deal', 'jeonse'); await type('price', '80000000'); expect('복비 전세 8천 한도', await get('out-fee'), '300,000');

  // table-acquisition-tax.html 계산 예시 — 6~9억 구간은 반올림이 필요 없는 7.5억만 쓴다
  await fresh('acquisition-tax.html');
  const acq = async (label, price, sit, large, first, want) => {
    await page.selectOption('#situation', sit);
    if ((await page.isChecked('#large')) !== large) await toggle('large');
    if ((await page.isChecked('#firstHome')) !== first) await toggle('firstHome');
    await type('price', price); expect(label, await get('out-total'), want);
  };
  await acq('취득세 6억', '600000000', 'one', false, false, '6,600,000');
  await acq('취득세 7.5억', '750000000', 'one', false, false, '16,500,000');
  await acq('취득세 9억', '900000000', 'one', false, false, '29,700,000');
  await acq('취득세 10억 85초과', '1000000000', 'one', true, false, '35,000,000');
  await acq('취득세 8억 조정2', '800000000', 'adj2', false, false, '67,200,000');
  await acq('취득세 8억 조정3', '800000000', 'adj3', false, false, '99,200,000');
  await acq('취득세 3억 생애최초', '300000000', 'one', false, true, '1,300,000');
  // term-jojeongdaesangjiyeok.html — 6억 두 번째 집
  await acq('취득세 6억 비조정 2주택', '600000000', 'nonadj2', false, false, '6,600,000');
  await acq('취득세 6억 조정 2주택', '600000000', 'adj2', false, false, '50,400,000');
  // guide-buying-costs.html
  await acq('취득세 9억 85초과', '900000000', 'one', true, false, '31,500,000');
  await acq('취득세 6억 생애최초', '600000000', 'one', false, true, '4,600,000');
  await acq('취득세 4억 생애최초', '400000000', 'one', false, true, '2,400,000');
  // term-jeonyongmyeonjeok.html — 85㎡ 초과 농특세 0.2% (8억이면 160만원 차이)
  await acq('취득세 8억 85이하', '800000000', 'one', false, false, '20,533,333'); const small = Number((await get('out-total')).replace(/,/g, ''));
  await acq('취득세 8억 85초과', '800000000', 'one', true, false, '22,133,333'); expect('85㎡ 농특세 차이', Number((await get('out-total')).replace(/,/g, '')) - small, 1600000);

  // guide-repayment.html 본문 — 30년 3억, 거치 1년
  await fresh('loan.html');
  await type('principal', '300000000'); await page.fill('#rate', '4'); await page.fill('#months', '360'); await page.fill('#grace', '0');
  expect('30년 원리금 첫달', await get('c-an-first'), '1,432,246'); expect('30년 원금 첫달', await get('c-pr-first'), '1,833,333'); expect('30년 원금 총이자', await get('c-pr-int'), '180,500,000');
  // term-wonrigeum-gyundeung.html — 상환 스케줄의 잔액
  const sched = async n => page.$$eval('#schedule tr', (rs, n) => { const r = rs.find(r => r.children[0] && r.children[0].textContent.trim() === String(n)); return r ? [...r.children].map(c => c.textContent.trim()) : []; }, n);
  await radio('method', 'annuity'); expect('원리금 60회 잔액', (await sched(60))[4], '271,342,539'); expect('원리금 120회 잔액', (await sched(120))[4], '236,351,878'); expect('원리금 120회 이자', (await sched(120))[3], '789,980');
  await radio('method', 'principal'); expect('원금 60회 잔액', (await sched(60))[4], '250,000,000'); expect('원금 120회 납입', (await sched(120))[1], '1,502,778');
  expect('만기일시 총이자', await get('c-bu-int'), '360,000,000');
  // guide-buying-costs.html — 상환 스케줄 1~12회 합계
  const year1 = async () => page.$$eval('#schedule tr', rs => { let i = 0, pay = 0; for (const r of rs) { const c = r.children; const k = parseInt(c[0] && c[0].textContent); if (k >= 1 && k <= 12) { i += Number(c[3].textContent.replace(/,/g, '')); pay += Number(c[1].textContent.replace(/,/g, '')); } } return i + '/' + pay; });
  await radio('method', 'annuity'); expect('첫해 원리금균등 이자/납입', await year1(), '11903842/17186952');
  await radio('method', 'principal'); expect('첫해 원금균등 이자/납입', await year1(), '11816666/21816667');
  await radio('method', 'bullet'); expect('첫해 만기일시', await year1(), '12000000/12000000');
  await radio('method', 'annuity');
  await type('principal', '420000000'); expect('4.2억 월 상환', await get('c-an-first'), '2,005,144'); expect('4.2억 첫해 이자', (await year1()).split('/')[0], '16665378');
  await type('principal', '300000000');
  // term-geochigigan.html — 3억 4% 30년 거치 1년·3년
  await page.fill('#grace', '12'); expect('거치1년 후 상환', await get('c-an-last'), '1,457,920'); expect('거치1년 총이자', await get('c-an-int'), '219,356,298');
  await page.fill('#grace', '36'); expect('거치3년 후 상환', await get('c-an-last'), '1,515,625'); expect('거치3년 총이자', await get('c-an-int'), '227,062,355');
  await page.fill('#grace', '0');
  await radio('method', 'annuity');
  await type('principal', '100000000'); await page.fill('#rate', '4.5'); await page.fill('#months', '120'); await page.fill('#grace', '12');
  expect('거치 후 원리금', await get('c-an-last'), '1,127,759'); expect('거치 총이자', await get('c-an-int'), '26,298,000');

  // guide-area-84.html 본문 — 같은 단지 59㎡·84㎡ 평당가, 오피스텔 전용 42㎡
  await fresh('area.html');
  await radio('priceUnit', 'sqm');
  await type('price', '600000000'); await page.fill('#area', '59'); near('59㎡ 6억 평당', await get('out-per-pyeong'), 33618153, 1);
  await type('price', '800000000'); await page.fill('#area', '84'); near('84㎡ 8억 평당', await get('out-per-pyeong'), 31483667, 1);
  await page.fill('#sqm', '42'); expect('42㎡ 평', await get('out-pyeong'), '12.71');
  // term-jeonyongmyeonjeok.html
  for (const [m2, py] of [['59', '17.85'], ['84', '25.41'], ['114', '34.49']]) { await page.fill('#sqm', m2); expect(`${m2}㎡ 평`, await get('out-pyeong'), py); }
  await radio('priceUnit', 'pyeong'); await type('price', '800000000'); await page.fill('#area', '34'); near('8억 공급34평 평당', await get('out-per-pyeong'), 23529412, 1);

  // term-gwallibi.html — 월세·관리비 나누기: 실부담은 같고 세액공제는 다름
  await fresh('rent.html');
  for (const [r, m] of [['600000', '100000'], ['500000', '200000']]) { await type('rent', r); await type('maint', m); await type('deposit', '10000000'); await page.fill('#rate', '3'); expect(`실부담 ${r}+${m}`, await get('out-monthly'), '725,000'); }
  await fresh('rent-tax-credit.html');
  for (const id of ['homeless', 'housing', 'moved']) if (!(await page.isChecked('#' + id))) await page.evaluate(i => { const e = document.getElementById(i); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }, id);
  await type('income', '50000000'); await page.fill('#months', '12');
  await type('rent', '600000'); expect('세액공제 월세 60만', await get('out-credit'), '1,224,000');
  await type('rent', '500000'); expect('세액공제 월세 50만', await get('out-credit'), '1,020,000');

  // guide-subscription-notice-date.html 본문 숫자 — 공고일만 바꿔 점수 변화
  await fresh('subscription.html');
  await page.fill('#birth', '1994-11-15'); await page.fill('#dependents', '0'); await page.fill('#account', '2019-11-20');
  await page.fill('#notice', '2026-11-10'); expect('청약 11/10 총점', await get('out-total'), '17');
  await page.fill('#notice', '2026-11-15'); expect('청약 11/15 무주택', await get('out-homeless'), '6');
  await page.fill('#notice', '2026-11-20'); expect('청약 11/20 총점', await get('out-total'), '20');
  await page.fill('#notice', '2039-11-15'); expect('청약 혼자 최대', await get('out-total'), '54');
  if (!(await page.isChecked('#married'))) await toggle('married');
  await page.fill('#marriage', '2022-11-15'); await page.fill('#dependents', '1'); await page.fill('#notice', '2026-11-20');
  expect('청약 28세 혼인 무주택', await get('out-homeless'), '10'); expect('청약 28세 혼인 총점', await get('out-total'), '29');
  // table-subscription-points.html 계산 예시 — 30세 전 혼인, 부양가족 3명
  await page.fill('#birth', '1986-03-10'); await page.fill('#marriage', '2014-05-20'); await page.fill('#dependents', '3'); await page.fill('#account', '2014-06-01');
  await page.fill('#notice', '2026-11-20'); expect('가점표 예시 무주택', await get('out-homeless'), '26'); expect('가점표 예시 통장', await get('out-account'), '14'); expect('가점표 예시 총점', await get('out-total'), '60');
  await page.fill('#notice', '2027-06-01'); expect('가점표 예시 반년 뒤', await get('out-total'), '63');

  // guide-yield-vacancy.html 본문의 '반영 후' 값 — 계산기 PRESETS.small
  await fresh('yield.html');
  await page.click('.chip[data-preset="small"]');
  expect('상가 총투자', await get('out-cap'), '5.54'); expect('상가 자기자본', await get('out-coc'), '5.96'); expect('상가 순영업', await get('out-noi'), '25,500,000');

  // guide-prepayment.html 본문 표의 '1년' 행과 같은 값
  await fresh('prepayment.html');
  await type('amount', '100000000'); await page.fill('#feeRate', '1.2'); await page.fill('#period', '36');
  await page.fill('#start', '2025-09-21'); await page.fill('#pay', '2026-09-21');
  expect('중도상환 1년 비율', await get('out-ratio'), '66.70'); expect('중도상환 1년 수수료', await get('out-fee'), '800,365');
  // term-jungdosanghwan.html 계산 예시 — 3억, 0.6%, 3년, 2025-03-01 실행
  await type('amount', '300000000'); await page.fill('#feeRate', '0.6'); await page.fill('#start', '2025-03-01');
  for (const [d, want] of [['2025-09-01', '1,497,810'], ['2026-03-01', '1,200,547'], ['2027-03-01', '601,095'], ['2028-02-01', '47,628'], ['2028-03-01', '0']]) { await page.fill('#pay', d); expect(`중도상환 3억 ${d}`, await get('out-fee'), want); }
  await page.fill('#feeRate', '1.2'); await page.fill('#pay', '2026-03-01'); expect('중도상환 3억 1.2% 1년', await get('out-fee'), '2,401,095');

  await fresh('jeonse-insurance.html');
  await page.click('.chip[data-preset="ok"]'); expect('보증 ok', await get('out-big'), '가입 가능성 높음'); expect('보증 상한', await get('out-max'), '450,000,000');
  await page.click('.chip[data-preset="risky"]'); expect('보증 risky', await get('out-big'), '가입 어려움'); expect('보증 상한2', await get('out-max'), '350,000,000');

  await fresh('jeonse-fraud-check.html');
  await page.click('.chip[data-preset="risky"]'); expect('위험 전세가율', await get('out-ratio'), '100.00'); await toggle('r1'); expect('위험 점수', await get('out-score'), '60'); expect('위험 등급', await get('out-big'), '높음');

  // term-jeonsegayul.html 계산 예시
  await fresh('jeonse-fraud-check.html');
  await type('price', '300000000'); await type('deposit', '240000000'); await type('senior', '0'); expect('전세가율 80', await get('out-ratio'), '80.00');
  await type('senior', '30000000'); expect('전세가율 선순위 포함', await get('out-ratio'), '90.00');
  await type('senior', '0'); await type('price', '270000000'); expect('전세가율 집값 하락', await get('out-ratio'), '88.89');
  // term-kkangtongjeonse.html · term-geunjeodanggwon.html
  await type('price', '300000000'); await type('deposit', '280000000'); expect('깡통 93.33', await get('out-ratio'), '93.33');
  await type('price', '250000000'); expect('깡통 112', await get('out-ratio'), '112.00');
  await type('price', '500000000'); await type('deposit', '200000000'); await type('senior', '240000000'); expect('근저당 88', await get('out-ratio'), '88.00');
  await fresh('jeonse-insurance.html');
  await page.selectOption('#region', 'metro'); await type('price', '500000000'); await type('multi', '0'); await page.fill('#term', '24'); await page.fill('#elapsed', '0');
  for (const id of ['registered', 'broker']) if (!(await page.isChecked('#' + id))) await toggle(id);
  const ins = async (label, dep, sen, verdict, max) => { await type('deposit', dep); await type('senior', sen); expect(label + ' 판정', await get('out-big'), verdict); if (max) expect(label + ' 상한', await get('out-max'), max); };
  await ins('보험 근저당2.4억 보증금2억', '200000000', '240000000', '가입 가능성 높음', '210,000,000');
  await ins('보험 근저당2.4억 보증금2.5억', '250000000', '240000000', '가입 어려움');
  await ins('보험 근저당3.2억', '200000000', '320000000', '가입 어려움', '130,000,000');
  await ins('보험 4.5억', '450000000', '0', '가입 가능성 높음', '450,000,000');
  await ins('보험 4.6억', '460000000', '0', '가입 어려움');

  // term-dsr.html · term-ltv.html 숫자 — 연소득 5천, 시세 6억, LTV 70%, 4.5%, 30년, DSR 40%
  await fresh('dsr.html');
  await type('income', '50000000'); await type('value', '600000000'); await page.fill('#ltv', '70'); await type('senior', '0'); await type('existing', '0');
  await page.fill('#rate', '4.5'); await page.fill('#years', '30'); await page.fill('#dsr', '40');
  await page.fill('#stress', '0'); expect('DSR 스트레스 0', await get('out-dsr'), '328,935,265');
  for (const [st, want] of [['0.38', '314,755,367'], ['0.75', '301,820,987'], ['1.2', '287,158,070']]) { await page.fill('#stress', st); expect(`DSR 스트레스 ${st}`, await get('out-dsr'), want); }   // term-stress-dsr.html
  await page.fill('#stress', '1.5'); expect('DSR 스트레스 1.5', await get('out-dsr'), '277,986,024'); expect('DSR 월 상환', await get('out-monthly'), '1,408,514');
  await page.fill('#years', '40'); expect('DSR 40년', await get('out-dsr'), '302,912,640'); await page.fill('#years', '30');
  await type('existing', '6000000'); expect('DSR 기존 대출', await get('out-dsr'), '194,590,217'); await type('existing', '0');
  await type('value', '397000000'); expect('경계 아래 LTV', (await get('out-binding')).startsWith('LTV'), true);
  await type('value', '398000000'); expect('경계 위 DSR', (await get('out-binding')).startsWith('DSR'), true);
  await type('value', '600000000'); await type('income', '80000000'); expect('연8천 한도', await get('out-limit'), '420,000,000'); expect('연8천 DSR', await get('out-dsr'), '444,777,638');
  await type('income', '100000000'); await type('senior', '50000000'); expect('선순위 5천', await get('out-limit'), '370,000,000');
  await type('senior', '0'); await page.fill('#ltv', '50'); expect('LTV 50%', await get('out-limit'), '300,000,000');

  // guide-cgt-heavy.html 본문 숫자 — 2016-06-01 취득 5억, 2026-11-02 양도. 중과 가산·유예 종료일이 바뀌면 여기와 글을 같이 고칠 것
  const cgt = async (label, { homes, adj, salePrice = '900000000', acq = '2016-06-01', res = '0', adjAcq = false, special = 'none', newHome = '' }, want) => {
    await fresh('capital-gains-tax.html');
    await page.selectOption('#kind', 'house'); await page.selectOption('#dealType', 'sale'); await page.selectOption('#acqCause', 'buy');
    await page.fill('#acqDate', acq); await type('acqPrice', '500000000'); await page.fill('#saleDate', '2026-11-02'); await type('salePrice', salePrice);
    await page.selectOption('#homes', homes); await page.fill('#resMonths', res);
    await page.selectOption('#special', special); if (newHome) await page.fill('#newHomeDate', newHome);
    if ((await page.isChecked('#adjAcquired')) !== adjAcq) await page.evaluate(() => { const e = document.getElementById('adjAcquired'); e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); });
    if ((await page.isChecked('#adjArea')) !== adj) await page.evaluate(() => { const e = document.getElementById('adjArea'); e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(label, await get('out-total'), want);
  };
  await cgt('양도세 비조정 2주택 차익4억', { homes: '2', adj: false }, '111,166,000');
  expect('양도세 예정신고 기한 11/2 양도', (await page.textContent('#judge-list')).includes('2027-01-31'), true);
  await cgt('양도세 조정 2주택 중과', { homes: '2', adj: true }, '233,816,000');
  await cgt('양도세 조정 3주택 중과', { homes: '3', adj: true }, '277,541,000');
  await cgt('양도세 1주택 비과세', { homes: '1', adj: false }, '0');
  await cgt('양도세 차익1억 비조정', { homes: '2', adj: false, salePrice: '600000000' }, '14,124,000');
  await cgt('양도세 차익1억 중과', { homes: '2', adj: true, salePrice: '600000000' }, '42,003,500');
  await cgt('양도세 차익1억 3주택', { homes: '3', adj: true, salePrice: '600000000' }, '52,728,500');
  await cgt('양도세 차익2억 비조정', { homes: '2', adj: false, salePrice: '700000000' }, '43,901,000');
  await cgt('양도세 차익2억 중과', { homes: '2', adj: true, salePrice: '700000000' }, '104,071,000');
  await cgt('양도세 차익2억 3주택', { homes: '3', adj: true, salePrice: '700000000' }, '125,796,000');
  await cgt('양도세 5년 보유 비조정', { homes: '2', adj: false, acq: '2021-06-01' }, '128,766,000');
  await cgt('양도세 5년 보유 중과', { homes: '2', adj: true, acq: '2021-06-01' }, '233,816,000');
  // term-jangteukgongje.html — 15억 1주택 고가주택, 거주 기간별
  await cgt('장특공 표2 거주10년', { homes: '1', adj: false, salePrice: '1500000000', res: '120' }, '4,801,500');
  await cgt('장특공 표2 거주2년', { homes: '1', adj: false, salePrice: '1500000000', res: '24' }, '22,093,500');
  await cgt('장특공 거주없음 표1', { homes: '1', adj: false, salePrice: '1500000000', res: '0' }, '43,901,000');
  await cgt('장특공 2주택 15억', { homes: '2', adj: false, salePrice: '1500000000' }, '328,911,000');
  // term-ilsegae-iljutaek.html · term-ilsijeok-2jutaek.html
  await cgt('비과세 보유 1.5년', { homes: '1', adj: false, acq: '2025-05-01' }, '262,350,000');
  await cgt('비과세 조정취득 거주0', { homes: '1', adj: true, adjAcq: true, acq: '2018-06-01' }, '118,206,000');
  await cgt('비과세 조정취득 거주2년', { homes: '1', adj: true, adjAcq: true, acq: '2018-06-01', res: '24' }, '0');
  await cgt('일시적2 3년 안', { homes: '2', adj: false, special: 'temp2', newHome: '2024-06-01' }, '0');
  await cgt('일시적2 3년 넘음', { homes: '2', adj: false, special: 'temp2', newHome: '2023-06-01' }, '111,166,000');
  await cgt('일시적2 1년 안 지나 취득', { homes: '2', adj: false, acq: '2024-01-01', special: 'temp2', newHome: '2024-06-01' }, '146,366,000');

  // term-budambujeungyeo · term-iwolgwase · term-ipjugwon-bunyanggwon — 부담부증여·증여 취득·분양권
  const cgt2 = async (label, o, want) => {
    await fresh('capital-gains-tax.html');
    await page.selectOption('#kind', o.kind || 'house'); await page.selectOption('#dealType', o.deal || 'sale'); await page.selectOption('#acqCause', o.cause || 'buy');
    await page.fill('#acqDate', o.acq); await type('acqPrice', o.acqPrice); await page.fill('#saleDate', '2026-11-02'); await type('salePrice', o.salePrice);
    if (o.deal === 'gift_debt') { await type('giftValue', o.giftValue); await type('debt', o.debt); }
    if (o.cause === 'gift') { await page.selectOption('#donorRel', o.rel); await page.fill('#donorDate', o.donorDate); await type('donorPrice', o.donorPrice); }
    if (!o.kind) await page.selectOption('#homes', '2');
    expect(label, await get('out-total'), want);
  };
  await cgt2('일반 매매 10억', { acq: '2016-06-01', acqPrice: '500000000', salePrice: '1000000000' }, '146,366,000');
  await cgt2('부담부증여 채무 4억', { deal: 'gift_debt', acq: '2016-06-01', acqPrice: '500000000', salePrice: '1000000000', giftValue: '1000000000', debt: '400000000' }, '43,901,000');
  expect('부담부증여 신고기한 3개월', (await page.textContent('#judge-list')).includes('2027-02-28'), true);
  await cgt2('이월과세 배우자', { cause: 'gift', acq: '2024-06-01', acqPrice: '600000000', salePrice: '900000000', rel: 'spouse_lineal', donorDate: '2018-06-01', donorPrice: '300000000' }, '192,159,000');
  await cgt2('이월과세 아님', { cause: 'gift', acq: '2024-06-01', acqPrice: '600000000', salePrice: '900000000', rel: 'other', donorDate: '2018-06-01', donorPrice: '300000000' }, '102,421,000');
  await cgt2('분양권 10개월', { kind: 'right_sale', acq: '2026-01-10', acqPrice: '500000000', salePrice: '600000000' }, '75,075,000');
  await cgt2('분양권 1년10개월', { kind: 'right_sale', acq: '2025-01-10', acqPrice: '500000000', salePrice: '600000000' }, '64,350,000');

  // 요율 의존 — 1월에 요율을 바꾸면 아래 기대값도 바꿀 것
  await fresh('salary.html');
  await type('salary', '50000000');
  expect('연봉 국민연금', await get('out-pension'), '178,500'); expect('연봉 건강', await get('out-health'), '142,600'); expect('연봉 장기요양', await get('out-ltc'), '18,460'); expect('연봉 고용', await get('out-employ'), '35,700');
  expect('연봉 소득세', await get('out-tax'), '197,500'); expect('연봉 실수령', await get('out-net'), '3,574,157');
  expect('연봉 표 행수', await page.$$eval('#table-body tr', r => r.length), 14);

  await fresh('severance.html');
  await page.fill('#join', '2016-09-17'); await page.fill('#leave', '2026-09-17'); await type('monthly', '3500000');
  expect('퇴직 일수', await get('out-days'), '3,652일'); near('퇴직금', await get('out-sev'), 34257892, 2); expect('근속연수', await get('out-service-years'), '10년'); near('퇴직소득세', await get('out-tax'), 302189, 50);   // 정확히 10년(퇴직일 = 입사 기념일)은 10년. 윤일로 11년이 되던 버그(2026-10) 회귀 방지
  // guide-severance-tax.html — 퇴직일은 입사 기념일(정확히 N년)
  for (const [join, m, want] of [['2021-09-17', '3500000', '211,095'], ['2006-09-17', '3500000', '364,604'], ['1996-09-17', '3500000', '306,793'],
                                 ['2021-09-17', '7000000', '1,031,158'], ['2016-09-17', '7000000', '1,760,947'], ['2011-09-17', '7000000', '2,342,546'], ['2023-09-17', '3000000', '91,497']]) {
    await page.fill('#join', join); await page.fill('#leave', '2026-09-17'); await type('monthly', m); expect(`퇴직소득세 ${join.slice(0, 4)} 월${Number(m) / 1e4}만`, await get('out-tax'), want);
  }
  await page.fill('#leave', '2026-09-18'); await page.fill('#join', '2016-09-17'); expect('10년 하루 더 → 11년', await get('out-service-years'), '11년');
  await type('monthly', '3500000');
  await page.fill('#join', '2026-03-01'); expect('1년 미만', await get('out-sev'), '0');

  // ------------------------------------------------------------ 서식·이미지
  console.log('--- 서식·이미지 ---');
  await page.goto(BASE + 'form-rent-receipt.html'); await page.fill('#payee', '홍길동'); await type('amount', '600000');
  expect('영수증 금액', await page.textContent('#receipt [data-from="amount"]'), '600,000원'); expect('영수증 한글', await get('amount-korean'), '(60만원)');
  await page.goto(BASE + 'form-special-terms.html'); expect('특약 복사 버튼', await page.$$eval('[data-copy]', b => b.length) > 15, true);
  await page.goto(BASE + 'salary.html?salary=60000000');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#image-btn')]);
  expect('연봉 이미지 저장', dl ? dl.suggestedFilename() : 'none', 'salary-result.png');
  if (dl && shots) await dl.saveAs(path.join(shots, 'salary-img.png'));

  // ------------------------------------------------------------ 스크린샷 (눈으로 확인용, 판정 없음)
  if (shots) {
    const shot = async (p, w, name) => {
      const pg = await ctx.newPage(); await pg.setViewportSize({ width: w, height: 900 });
      await pg.goto(BASE + p); await pg.waitForTimeout(300);
      await pg.screenshot({ path: path.join(shots, name), fullPage: true }); await pg.close();
    };
    await shot('index.html', 1440, 'home.png');
    await shot('renewal.html?start=2025-03-01&months=24&deposit=50000000&rent=600000', 390, 'renewal.png');
    await shot('salary.html?salary=50000000', 1440, 'salary.png');
    await shot('moving.html?moveDate=2026-10-01', 390, 'moving.png');
    await shot('glossary.html', 390, 'glossary.png');
    await shot('term-daehangryeok.html', 390, 'term.png');
    await shot('form-rent-receipt.html', 1440, 'receipt.png');
    await shot('table-acquisition-tax.html', 390, 'table.png');
    await shot('jeonse-insurance.html', 390, 'insurance.png');
    console.log('--- 스크린샷: ' + shots + ' ---');
  }

  console.log('JS 오류:', errors.length ? errors : '없음', '| 실패:', fails);
  await browser.close();
  process.exitCode = fails ? 1 : 0;
})();
