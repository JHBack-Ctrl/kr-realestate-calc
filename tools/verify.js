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
      return { bad, links, sw: document.documentElement.scrollWidth, text: document.body.innerText.length };
    });
    if (r.sw > 391) r.bad.push('overflow390=' + r.sw);
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
  console.log('  구조 검사 끝 (390px·320px)');

  // ------------------------------------------------------------ 계산기 값
  console.log('--- 계산기 ---');
  await fresh('renewal.html');
  await page.fill('#start', '2025-03-01'); await page.fill('#months', '24'); await type('deposit', '50000000'); await type('rent', '600000');
  expect('갱신 상태', await get('out-status'), '가능'); expect('갱신 만기', await get('out-end'), '2027-03-01');
  expect('갱신 시작', await get('out-wstart'), '2026-09-01'); expect('갱신 마감', await get('out-wend'), '2026-12-31');
  expect('갱신 D-day', await get('out-big'), dday(2026, 12, 31));
  expect('보증금 5%', await get('out-dep-cap'), '52,500,000'); expect('월세 5%', await get('out-rent-cap'), '630,000'); expect('환산 상한', await get('out-equiv-cap'), '203,700,000');

  await fresh('tax-calendar.html');
  await page.fill('#acqDate', '2026-08-15'); await page.fill('#saleDate', '2026-08-15');
  expect('세금달력 다음', await get('out-next-name'), '취득세 신고·납부 마감'); expect('세금달력 날짜', await get('out-next-date'), '2026-10-14');
  expect('세금달력 D', await get('out-big'), dday(2026, 10, 14)); expect('세금달력 건수', await get('out-count'), '4');
  const rows = await page.$$eval('#event-body tr th', ths => ths.map(t => t.textContent)); expect('양도세 예정신고', rows.includes('2026-10-31'), true);

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

  // guide-yield-vacancy.html 본문의 '반영 후' 값 — 계산기 PRESETS.small
  await fresh('yield.html');
  await page.click('.chip[data-preset="small"]');
  expect('상가 총투자', await get('out-cap'), '5.54'); expect('상가 자기자본', await get('out-coc'), '5.96'); expect('상가 순영업', await get('out-noi'), '25,500,000');

  // guide-prepayment.html 본문 표의 '1년' 행과 같은 값
  await fresh('prepayment.html');
  await type('amount', '100000000'); await page.fill('#feeRate', '1.2'); await page.fill('#period', '36');
  await page.fill('#start', '2025-09-21'); await page.fill('#pay', '2026-09-21');
  expect('중도상환 1년 비율', await get('out-ratio'), '66.70'); expect('중도상환 1년 수수료', await get('out-fee'), '800,365');

  await fresh('jeonse-insurance.html');
  await page.click('.chip[data-preset="ok"]'); expect('보증 ok', await get('out-big'), '가입 가능성 높음'); expect('보증 상한', await get('out-max'), '450,000,000');
  await page.click('.chip[data-preset="risky"]'); expect('보증 risky', await get('out-big'), '가입 어려움'); expect('보증 상한2', await get('out-max'), '350,000,000');

  await fresh('jeonse-fraud-check.html');
  await page.click('.chip[data-preset="risky"]'); expect('위험 전세가율', await get('out-ratio'), '100.00'); await toggle('r1'); expect('위험 점수', await get('out-score'), '60'); expect('위험 등급', await get('out-big'), '높음');

  // 요율 의존 — 1월에 요율을 바꾸면 아래 기대값도 바꿀 것
  await fresh('salary.html');
  await type('salary', '50000000');
  expect('연봉 국민연금', await get('out-pension'), '178,500'); expect('연봉 건강', await get('out-health'), '142,600'); expect('연봉 장기요양', await get('out-ltc'), '18,460'); expect('연봉 고용', await get('out-employ'), '35,700');
  expect('연봉 소득세', await get('out-tax'), '197,500'); expect('연봉 실수령', await get('out-net'), '3,574,157');
  expect('연봉 표 행수', await page.$$eval('#table-body tr', r => r.length), 14);

  await fresh('severance.html');
  await page.fill('#join', '2016-09-17'); await page.fill('#leave', '2026-09-17'); await type('monthly', '3500000');
  expect('퇴직 일수', await get('out-days'), '3,652일'); near('퇴직금', await get('out-sev'), 34257892, 2); expect('근속연수', await get('out-service-years'), '11년'); near('퇴직소득세', await get('out-tax'), 226189, 50);
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
