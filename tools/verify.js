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
const TOOL_PAGES = PAGES.filter(f => fs.readFileSync(path.join(ROOT, f), 'utf8').includes('id="sticky-monthly"'));   // 하단 결과 막대가 있는 계산기
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
      // SVG 안의 <title>도 센다. 네이버 진단이 "<title> 요소가 2개 이상"으로 잡는다(rent.html 그래프, 2026-10)
      if (document.querySelectorAll('title').length !== 1) bad.push('title=' + document.querySelectorAll('title').length);
      if (!document.querySelector('#theme-toggle')) bad.push('theme-btn');
      if (!document.querySelector('link[rel=canonical]')) bad.push('canonical');
      const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && !/^(https?:|#|mailto:)/.test(h));
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dup.length) bad.push('dup-id:' + [...new Set(dup)].join(','));
      // 입력칸 오른쪽 단위(원/㎡, 개월 등)가 숫자와 겹치지 않는지: 오른쪽 여백 ≥ 단위 폭 + 오른쪽 12px + 간격 4px.
      // 숨은 칸도 재려고 단위 글자 폭은 같은 글꼴의 보이지 않는 span으로 잰다(site_core.fit_suffixes, 2026-11)
      document.querySelectorAll('.input-wrap .suffix').forEach(s => {
        const inp = s.parentNode.querySelector('input'); if (!inp || !s.textContent.trim()) return;
        const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:' + getComputedStyle(s).fontSize;
        probe.textContent = s.textContent; document.body.appendChild(probe);
        const need = probe.getBoundingClientRect().width + 12 + 4; probe.remove();
        if (parseFloat(getComputedStyle(inp).paddingRight) < need) bad.push('단위 겹침:' + (inp.id || '?') + '(' + s.textContent + ')');
      });
      const robots = document.querySelector('meta[name=robots]');
      const desc = document.querySelector('meta[name=description]');
      return { bad, links, noindex: !!(robots && /noindex/.test(robots.content)), sw: document.documentElement.scrollWidth, text: document.body.innerText.length, desc: desc ? desc.content.length : 0,
               relGuides: document.querySelectorAll('.related-guides .tool-card').length };
    });
    // 계산기 쪽마다 결과 아래 「함께 읽는 안내 글」이 있어야 한다(site_core.TOOL_GUIDES, 2026-10)
    if (TOOL_PAGES.includes(f) && !r.relGuides) r.bad.push('관련 안내 글 없음');
    if (r.sw > 391) r.bad.push('overflow390=' + r.sw);
    if (r.desc > 160) r.bad.push('description=' + r.desc + '자');   // 검색 결과에서 잘리지 않게 160자 이내
    // 사이트맵과 noindex가 엇갈리면 안 된다. 안내 글과 홈은 반드시 검색에 들어가야 한다.
    if (SITEMAP.has(f) === r.noindex) r.bad.push(r.noindex ? 'noindex인데 사이트맵에 있음' : '사이트맵에 없는데 noindex 아님');
    if ((f.startsWith('guide-') || f === 'index.html') && r.noindex) r.bad.push('안내 글·홈이 noindex');
    for (const l of new Set(r.links)) {
      const target = l.split('#')[0].split('?')[0];
      if (target !== '' && !fs.existsSync(path.join(ROOT, target))) r.bad.push('link:' + l);
    }
    if (r.bad.length) { fails++; console.log(`FAIL ${f.padEnd(34)} ${String(r.text).padStart(5)}자  ${r.bad.join(' ')}`); }
  }

  // 폰 폭 세 가지(320·360·412px)에서 페이지 전체가 옆으로 밀리는지, 표가 자기 상자 밖으로 잘리는지.
  // 표는 글자 칸 줄바꿈(site_core.fit_tables) → 좁은 글자(css) → 줄마다 세로로 풀기(common.js fitTables) 순서로 상자 안에 넣는다.
  // 2026-11: 「상자 안에서 옆으로 밀리면 통과」였을 때 표 76개가 폰에서 오른쪽이 잘려 있었다(사용자 제보, guide-officetel)
  const tableOver = () => page.evaluate(() => [...document.querySelectorAll('.table-wrap')].map((w, i) => ({ i, over: w.clientWidth ? w.scrollWidth - w.clientWidth : 0 })).filter(x => x.over > 1).map(x => '#' + x.i + '(+' + x.over + 'px)'));
  for (const w of [320, 360, 412]) {
    await page.setViewportSize({ width: w, height: 844 });
    for (const f of PAGES) {
      await page.goto(BASE + f);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w + 1) { fails++; console.log(`FAIL ${f.padEnd(34)} overflow${w}=${sw}`); }
      await page.waitForFunction(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));   // 계산기가 그린 표를 fitTables가 다시 잴 때까지
      const cut = await tableOver();
      if (cut.length) { fails++; console.log(`FAIL ${f.padEnd(34)} ${w}px에서 표가 잘림 ${cut.join(' ')}`); }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // 표 처리 방식이 실제로 먹는지: 글자 칸 줄바꿈, 세로로 풀기, 넓어지면 다시 표로
  await page.goto(BASE + 'guide-officetel.html');
  expect('표 글자 칸 줄바꿈(오피스텔 글)', await page.$eval('.table-wrap td.tx', e => getComputedStyle(e).whiteSpace), 'normal');
  expect('열 여섯인 표는 폰에서 세로로', await page.$$eval('.table-wrap table', ts => ts.filter(t => t.classList.contains('stack')).length >= 1), true);
  expect('세로로 푼 칸에 열 제목', await page.$eval('.tbl.stack td[data-th]', e => e.getAttribute('data-th').length > 0), true);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForFunction(() => !document.querySelector('.tbl.stack'));
  expect('넓은 화면에서는 다시 표', await page.$$eval('.tbl.stack', e => e.length), 0);
  await page.setViewportSize({ width: 360, height: 844 }); await page.goto(BASE + 'guide-salary-table.html');
  expect('표 숫자 칸은 한 줄(연봉 표 글, 360px)', await page.$$eval('.table-wrap table:not(.stack) td:not(.tx):not(.wr)', es => es.length > 40 && es.every(e => getComputedStyle(e).whiteSpace === 'nowrap')), true);
  expect('줄 많은 숫자 표는 360px에서도 표 그대로', await page.$$eval('.tbl.stack', e => e.length), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  console.log(`  구조 검사 끝 (390px·320px·360px·412px) — 검색 대상 ${SITEMAP.size}쪽, 검색 제외 ${PAGES.length - SITEMAP.size}쪽`);

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
  // guide-renewal-rent-increase.html — 기준금리 3%(전환율 5%)에서 보증금·월세를 섞어 바꿀 때의 환산 보증금
  await page.fill('#baseRate', '3');
  await type('rent', '62500'); expect('전세3억+월6.25만 환산', await get('out-equiv'), '315,000,000');
  await type('rent', '100000'); expect('전세3억+월10만 환산', await get('out-equiv'), '324,000,000');
  await type('deposit', '200000000'); await type('rent', '500000'); expect('2억/50만 환산', await get('out-equiv'), '320,000,000'); expect('2억/50만 환산 상한', await get('out-equiv-cap'), '336,000,000');
  for (const [d, r, want] of [['210000000', '525000', '336,000,000'], ['200000000', '566666', '335,999,840'], ['200000000', '570000', '336,800,000'], ['100000000', '983333', '335,999,920'], ['100000000', '1000000', '340,000,000']]) {
    await type('deposit', d); await type('rent', r); expect(`갱신 제안 ${d}/${r}`, await get('out-equiv'), want);
  }
  await type('deposit', '200000000'); await type('rent', '500000');
  for (const [br, eq, cap] of [['2.75', '326,315,789', '342,631,579'], ['3.25', '314,285,714', '330,000,000']]) { await page.fill('#baseRate', br); expect(`갱신 기준 ${br} 환산`, await get('out-equiv'), eq); expect(`갱신 기준 ${br} 상한`, await get('out-equiv-cap'), cap); }

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
  // guide-cgt-filing.html — 양도일별 예정·확정신고 기한(취득일을 비워 양도 쪽 날짜만 보이게), 매수인 취득세 60일
  await page.fill('#acqDate', '');
  for (const [sd, pre, fin] of [['2026-06-01', '2026-08-31', '2027-05-31'], ['2026-06-30', '2026-08-31', '2027-05-31'], ['2026-08-31', '2026-10-31', '2027-05-31'], ['2026-11-02', '2027-01-31', '2027-05-31'],
                                ['2026-12-31', '2027-02-28', '2027-05-31'], ['2027-01-01', '2027-03-31', '2028-05-31'], ['2027-12-15', '2028-02-29', '2028-05-31']]) {
    await page.fill('#saleDate', sd); expect(`신고기한 ${sd} → ${pre} / ${fin}`, (await evDates()).join(' '), `${pre} ${fin}`);
  }
  await page.fill('#saleDate', ''); await page.selectOption('#acqCause', 'sale'); await page.fill('#acqDate', '2026-11-02'); expect('매매 취득세 11/2 → 1/1', (await evDates()).includes('2027-01-01'), true);

  await fresh('moving.html');
  await page.fill('#moveDate', '2026-10-01');
  expect('이사 D', await get('out-big'), dday(2026, 10, 1)); expect('전입신고 기한', await get('out-report'), '2026-10-15'); expect('자동차', await get('out-car'), '2026-10-31');
  await page.check('#m1'); await page.check('#m2'); expect('이사 진행', (await get('out-done')).startsWith('2 /'), true);

  await fresh('rate-compare.html');
  await type('principal', '100000000'); await page.fill('#years', '10'); await page.fill('#fixedRate', '5'); await page.fill('#varRate', '5'); await page.fill('#varChange', '0');
  expect('고정 월상환', await get('out-fixed-pay'), '1,060,655'); expect('변동 첫달', await get('out-var-first'), '1,060,655'); expect('총이자 차이 0', await get('out-big'), '0');
  await page.fill('#varChange', '1'); expect('상승 시 고정 유리', (await get('out-kicker')).startsWith('고정'), true);

  // 8억 예시 버튼 — 취득세율을 8억 1주택 실효세율(2.56%)로 채워야 한다. 지우기는 기본값 1.1%로 되돌린다.
  await fresh('buy-vs-rent.html');
  await page.click('.chip[data-preset="flat"]');
  expect('8억 예시 취득세율', await page.inputValue('#acqRate'), '2.56');
  expect('매매 총비용', await get('out-buy-total'), '172,880,000'); expect('전세 총비용', await get('out-j-total'), '81,500,000'); expect('차이', await get('out-big'), '91,380,000'); expect('손익분기', await get('out-be'), '2.19%');
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

  // table-acquisition-tax.html 계산 예시
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
  await acq('취득세 8억 85이하', '800000000', 'one', false, false, '20,504,000'); const small = Number((await get('out-total')).replace(/,/g, ''));
  await acq('취득세 8억 85초과', '800000000', 'one', true, false, '22,104,000'); expect('85㎡ 농특세 차이', Number((await get('out-total')).replace(/,/g, '')) - small, 1600000);
  // guide-acquisition-6-9.html — 6~9억 세율은 %로 소수점 둘째 자리까지 반올림(지방세법 제11조 제1항 제8호 나목).
  // 반올림 없이 2.333…%를 곱하던 것(2026-10 수정) 회귀 방지. 6.7575억은 1.505% → 1.51%가 되는 경계
  for (const [v, want] of [['610000000', '7,179,700'], ['650000000', '9,509,500'], ['700000000', '12,859,000'], ['850000000', '24,964,500'], ['890000000', '28,684,700'], ['910000000', '30,030,000']]) await acq(`취득세 ${v}`, v, 'one', false, false, want);
  await acq('취득세 8억 세율', '800000000', 'one', false, false, '20,504,000'); expect('8억 취득세율', await get('out-tax-rate'), '2.33');
  await type('price', '675750000'); expect('6.7575억 취득세율', await get('out-tax-rate'), '1.51');
  await acq('취득세 7억 85초과', '700000000', 'one', true, false, '14,259,000');
  await acq('취득세 7억 생애최초', '700000000', 'one', false, true, '10,859,000');
  await acq('취득세 8억 생애최초', '800000000', 'one', false, true, '18,504,000');
  // guide-mixed-use-acquisition.html — 상가주택 12억(1주택, 주택 부분 85㎡ 이하) 주택 비율별, 주택 부분만 중과
  await fresh('acquisition-tax.html'); await radio('kind', 'mixed');
  for (const [sh, want] of [['30', '42,600,000'], ['50', '34,200,000'], ['60', '36,336,000'], ['70', '40,584,000'], ['90', '41,160,000'], ['100', '39,600,000']]) {
    await type('houseShare', sh); await acq(`상가주택 12억 주택 ${sh}%`, '1200000000', 'one', false, false, want);
  }
  await type('houseShare', '60'); await type('price', '1200000000');
  expect('상가주택 주택분', await get('out-house-sum'), '14,256,000'); expect('상가주택 상가분', await get('out-shop-sum'), '22,080,000');
  expect('상가주택 세율 표시', await get('out-tax-rate'), '1.8 / 4'); expect('상가주택 실효세율', await get('out-effective'), '3.03');
  await acq('상가주택 조정 2주택', '1200000000', 'adj2', false, false, '82,560,000'); expect('상가주택 조정2 주택분', await get('out-house-sum'), '60,480,000');
  await acq('상가주택 조정 3주택', '1200000000', 'adj3', false, false, '111,360,000'); expect('상가주택 조정3 주택분', await get('out-house-sum'), '89,280,000');
  await radio('kind', 'house'); await acq('주택 12억', '1200000000', 'one', false, false, '39,600,000');
  await radio('kind', 'nonhouse'); await type('price', '1200000000'); expect('상가 12억', await get('out-total'), '55,200,000');
  await page.click('.chip[data-preset="mixed12"]'); expect('상가주택 예시 버튼', await get('out-total'), '36,336,000');

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
  // guide-rent-credit-refund.html — 총급여·월세별 1년 공제액, 한도 1,000만원, 8천 초과, 7개월, 전입 안 함
  for (const [inc, r, want] of [['50000000', '400000', '816,000'], ['50000000', '900000', '1,700,000'], ['70000000', '600000', '1,080,000'], ['70000000', '900000', '1,500,000'], ['81000000', '600000', '0']]) {
    await type('income', inc); await type('rent', r); expect(`세액공제 ${inc}/${r}`, await get('out-credit'), want);
  }
  await type('income', '50000000'); await type('rent', '600000'); await page.fill('#months', '7'); expect('세액공제 7개월', await get('out-credit'), '714,000');
  await page.fill('#months', '12'); await toggle('moved'); expect('세액공제 전입 안 함', await get('out-credit'), '0');

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
  // guide-refinance.html — 3억, 실행 2025-03-01, 경과 6개월~2년 6개월
  for (const [fr, d, want] of [['1.2', '2025-09-01', '2,995,620'], ['1.2', '2026-09-01', '1,796,715'], ['1.2', '2027-03-01', '1,202,190'], ['1.2', '2027-09-01', '597,810'], ['0.6', '2026-09-01', '898,358'], ['0.6', '2027-09-01', '298,905']]) {
    await page.fill('#feeRate', fr); await page.fill('#pay', d); expect(`갈아타기 수수료 ${fr}% ${d}`, await get('out-fee'), want);
  }
  await type('amount', '200000000'); await page.fill('#feeRate', '1.2'); await page.fill('#pay', '2026-03-01'); expect('갈아타기 수수료 2억 1.2% 1년', await get('out-fee'), '1,600,730');

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
  // guide-jeonse-ratio.html — 시세 3억에서 10·20·30% 하락, 보증금 2.1·2.4·2.7억
  await type('senior', '0');
  for (const [pr, ratios] of [['300000000', ['70.00', '80.00', '90.00']], ['270000000', ['77.78', '88.89', '100.00']], ['240000000', ['87.50', '100.00', '112.50']], ['210000000', ['100.00', '114.29', '128.57']]]) {
    await type('price', pr); for (const [k, dep] of ['210000000', '240000000', '270000000'].entries()) { await type('deposit', dep); expect(`전세가율 ${pr}/${dep}`, await get('out-ratio'), ratios[k]); }
  }
  await type('price', '300000000'); await type('deposit', '210000000'); expect('전세가율 70% 점수', await get('out-score'), '15');
  await type('senior', '30000000'); expect('2.1억+근저당 3천', await get('out-ratio'), '80.00'); expect('전세가율 80% 점수', await get('out-score'), '35');
  await type('senior', '60000000'); expect('2.1억+근저당 6천', await get('out-ratio'), '90.00');
  await type('senior', '0'); await type('price', '252000000'); expect('공시 2억 빌라 2.1억', await get('out-ratio'), '83.33');
  await fresh('jeonse-insurance.html');
  await page.selectOption('#region', 'metro'); await type('price', '500000000'); await type('multi', '0'); await page.fill('#term', '24'); await page.fill('#elapsed', '0');
  for (const id of ['registered', 'broker']) if (!(await page.isChecked('#' + id))) await toggle(id);
  const ins = async (label, dep, sen, verdict, max) => { await type('deposit', dep); await type('senior', sen); expect(label + ' 판정', await get('out-big'), verdict); if (max) expect(label + ' 상한', await get('out-max'), max); };
  await ins('보험 근저당2.4억 보증금2억', '200000000', '240000000', '가입 가능성 높음', '210,000,000');
  await ins('보험 근저당2.4억 보증금2.5억', '250000000', '240000000', '가입 어려움');
  await ins('보험 근저당3.2억', '200000000', '320000000', '가입 어려움', '130,000,000');
  await ins('보험 4.5억', '450000000', '0', '가입 가능성 높음', '450,000,000');
  await ins('보험 4.6억', '460000000', '0', '가입 어려움');
  // guide-jeonse-ratio.html — 주택가격 3억 기준 상한, 집값 하락, 빌라 공시가격 2억 × 126%
  await type('price', '300000000');
  await ins('보험 3억 근저당0', '210000000', '0', '가입 가능성 높음', '270,000,000');
  await ins('보험 3억 2.8억', '280000000', '0', '가입 어려움');
  await ins('보험 3억 근저당3천', '240000000', '30000000', '가입 가능성 높음', '240,000,000');
  await ins('보험 3억 근저당6천', '210000000', '60000000', '가입 가능성 높음', '210,000,000');
  await ins('보험 3억 근저당1.9억', '100000000', '190000000', '가입 어려움'); expect('근저당1.9억 미충족 2', await get('out-fail'), '2');
  for (const [pr, max] of [['270000000', '243,000,000'], ['240000000', '216,000,000'], ['252000000', '226,800,000']]) { await type('price', pr); await ins(`보험 ${pr} 상한`, '210000000', '0', '가입 가능성 높음', max); }
  await ins('보험 빌라 2.3억', '230000000', '0', '가입 어려움');

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
  await cgt('양도세 차익1억 비조정', { homes: '2', adj: false, salePrice: '600000000' }, '14,124,000'); expect('차익1억 양도소득세', await get('out-tax'), '12,840,000');   // guide-cgt-filing.html 가산세·분납
  await cgt('양도세 차익1억 중과', { homes: '2', adj: true, salePrice: '600000000' }, '42,003,500');
  await cgt('양도세 차익1억 3주택', { homes: '3', adj: true, salePrice: '600000000' }, '52,728,500');
  await cgt('양도세 차익2억 비조정', { homes: '2', adj: false, salePrice: '700000000' }, '43,901,000'); expect('차익2억 양도소득세', await get('out-tax'), '39,910,000');
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
  // guide-temporary-two-homes.html — 기한을 넘긴 조정지역, 차익별, 12억 초과, 거주 요건, 보유 2년 미만
  const t2 = { homes: '2', special: 'temp2' };
  await cgt('일시적2 1년 지나 취득', { ...t2, adj: false, acq: '2024-01-01', newHome: '2025-01-02' }, '0');
  await cgt('일시적2 3년 안 조정', { ...t2, adj: true, newHome: '2024-06-01' }, '0');
  await cgt('일시적2 넘김 조정 중과', { ...t2, adj: true, newHome: '2023-06-01' }, '233,816,000');
  for (const [sp, a, want] of [['600000000', false, '14,124,000'], ['600000000', true, '42,003,500'], ['700000000', false, '43,901,000'], ['700000000', true, '104,071,000']]) await cgt(`일시적2 넘김 ${sp} ${a ? '조정' : '비조정'}`, { ...t2, adj: a, newHome: '2023-06-01', salePrice: sp }, want);
  await cgt('일시적2 15억 3년 안 거주0', { ...t2, adj: false, newHome: '2024-06-01', salePrice: '1500000000' }, '43,901,000');
  await cgt('일시적2 15억 3년 안 거주10년', { ...t2, adj: false, newHome: '2024-06-01', salePrice: '1500000000', res: '120' }, '4,801,500');
  await cgt('일시적2 15억 넘김', { ...t2, adj: false, newHome: '2023-06-01', salePrice: '1500000000' }, '328,911,000');
  await cgt('일시적2 조정취득 거주0', { ...t2, adj: true, adjAcq: true, acq: '2018-06-01', newHome: '2024-06-01' }, '118,206,000');
  await cgt('일시적2 조정취득 거주2년', { ...t2, adj: true, adjAcq: true, acq: '2018-06-01', newHome: '2024-06-01', res: '24' }, '0');
  await cgt('일시적2 종전 1.5년 보유', { ...t2, adj: false, acq: '2025-05-01', newHome: '2026-06-01' }, '262,350,000');

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

  // guide-mortgage-limit.html — 연봉별 DSR 한도 (4.5%, 30년, DSR 40%, LTV에 안 걸리게 시세 30억)
  await fresh('dsr.html');
  await type('value', '3000000000'); await page.fill('#ltv', '70'); await type('senior', '0'); await type('existing', '0'); await page.fill('#rate', '4.5'); await page.fill('#years', '30'); await page.fill('#dsr', '40');
  for (const [inc, s0, s15, mon] of [['40000000', '263,148,212', '222,388,819', '1,126,811'], ['50000000', '328,935,265', '277,986,024', '1,408,514'], ['60000000', '394,722,318', '333,583,229', '1,690,217'],
                                     ['80000000', '526,296,424', '444,777,638', '2,253,623'], ['100000000', '657,870,530', '555,972,048', '2,817,029']]) {
    await type('income', inc); await page.fill('#stress', '0'); expect(`연봉 ${inc} 가산0`, await get('out-dsr'), s0);
    await page.fill('#stress', '1.5'); expect(`연봉 ${inc} 가산1.5`, await get('out-dsr'), s15); expect(`연봉 ${inc} 월상환`, await get('out-monthly'), mon);
  }
  await type('income', '50000000'); await page.fill('#rate', '4'); expect('5천 금리4%', await get('out-dsr'), '293,536,272'); await page.fill('#rate', '4.5');
  await page.fill('#dsr', '50'); expect('5천 DSR50%', await get('out-dsr'), '347,482,530'); await page.fill('#dsr', '40');
  // guide-base-rate-change.html — 금리 ±0.25%p의 DSR 한도
  await page.fill('#rate', '4.25'); expect('5천 금리4.25 한도', await get('out-dsr'), '285,597,016');
  await page.fill('#rate', '4.75'); expect('5천 금리4.75 한도', await get('out-dsr'), '270,687,040');

  // 2025-10-15 대책 이후 가산: 지방 0.75%p, 수도권·규제지역 3.0%p. guide-mortgage-limit·guide-dsr-ltv·guide-base-rate-change·guide-refinance,
  // term-dsr·term-ltv·term-stress-dsr 본문 숫자. 1.5%p를 '현재'로 쓰던 것(2026-10 수정) 회귀 방지
  await page.fill('#rate', '4.5'); await page.fill('#years', '30'); await page.fill('#dsr', '40'); await type('existing', '0');
  for (const [inc, s075, s3, mon3] of [['40000000', '241,456,790', '190,690,170', '966,199'], ['50000000', '301,820,987', '238,362,712', '1,207,749'], ['60000000', '362,185,185', '286,035,255', '1,449,299'],
                                       ['80000000', '482,913,580', '381,380,340', '1,932,398'], ['100000000', '603,641,975', '476,725,424', '2,415,498']]) {
    await type('income', inc); await page.fill('#stress', '0.75'); expect(`연봉 ${inc} 지방`, await get('out-dsr'), s075);
    await page.fill('#stress', '3'); expect(`연봉 ${inc} 수도권`, await get('out-dsr'), s3); expect(`연봉 ${inc} 수도권 월상환`, await get('out-monthly'), mon3);
  }
  await type('income', '50000000');
  await page.fill('#years', '40'); expect('5천 수도권 40년', await get('out-dsr'), '253,265,583'); await page.fill('#years', '30');
  for (const [rt, want] of [['4', '250,512,613'], ['4.25', '244,316,127'], ['4.75', '232,640,728']]) { await page.fill('#rate', rt); expect(`5천 수도권 ${rt}%`, await get('out-dsr'), want); }
  await page.fill('#stress', '0.75'); await page.fill('#rate', '4'); expect('5천 지방 4%', await get('out-dsr'), '319,500,657'); await page.fill('#rate', '4.5'); await page.fill('#stress', '3');
  await page.fill('#dsr', '50'); expect('5천 수도권 DSR50', await get('out-dsr'), '297,953,390'); await page.fill('#dsr', '40');
  await type('existing', '6000000'); expect('5천 수도권 기존 600만', await get('out-dsr'), '166,853,899'); await type('existing', '0');
  // LTV가 먼저 걸리는 경우와 규제지역 LTV 40%
  await type('value', '600000000');
  await type('income', '100000000'); expect('6억 1억 수도권 → LTV', await get('out-limit'), '420,000,000'); expect('6억 1억 수도권 기준', (await get('out-binding')).startsWith('LTV'), true);
  await type('income', '80000000'); expect('6억 8천 수도권 → DSR', (await get('out-binding')).startsWith('DSR'), true);
  await page.fill('#stress', '0.75'); expect('6억 8천 지방 → LTV', (await get('out-binding')).startsWith('LTV'), true); await page.fill('#stress', '3');
  await page.fill('#ltv', '40'); expect('6억 규제지역 8천', await get('out-limit'), '240,000,000');
  await type('income', '60000000'); await type('value', '800000000'); expect('8억 규제지역 LTV', await get('out-ltv'), '320,000,000'); expect('8억 6천 수도권 DSR', await get('out-dsr'), '286,035,255');
  // 금액 상한 칸: 연봉 2억, 시가 20억, 상한 4억이면 상한이 한도
  await type('income', '200000000'); await type('value', '2000000000'); await type('cap', '400000000');
  expect('금액 상한 한도', await get('out-limit'), '400,000,000'); expect('금액 상한 기준', (await get('out-binding')).startsWith('금액 상한'), true); expect('연봉 2억 수도권 DSR', await get('out-dsr'), '953,450,849');
  await page.fill('#cap', ''); await page.fill('#ltv', '70');
  // 기본값과 예시 버튼
  await fresh('dsr.html'); expect('스트레스 기본값', await page.inputValue('#stress'), '3.0');
  await page.click('.chip[data-preset="local"]'); expect('지방 예시 가산', await page.inputValue('#stress'), '0.75'); expect('지방 예시 한도', await get('out-limit'), '316,912,037');
  await page.click('.chip[data-preset="reg"]'); expect('규제지역 예시 LTV', await page.inputValue('#ltv'), '40'); expect('규제지역 예시 상한', await page.inputValue('#cap'), '600,000,000'); expect('규제지역 예시 한도', await get('out-limit'), '381,380,340');

  // guide-base-rate-change.html — 30년 원리금균등 월 상환과 총이자, 만기일시 이자
  await fresh('loan.html');
  await radio('method', 'annuity'); await page.fill('#months', '360'); await page.fill('#grace', '0');
  for (const [pr, rows] of [['100000000', [['3.75', '463,116'], ['4', '477,415'], ['4.25', '491,940']]], ['300000000', [['3.75', '1,389,347'], ['4', '1,432,246'], ['4.25', '1,475,820']]], ['500000000', [['3.75', '2,315,578'], ['4', '2,387,076'], ['4.25', '2,459,699']]]]) {
    await type('principal', pr); for (const [rt, want] of rows) { await page.fill('#rate', rt); expect(`대출 ${pr} ${rt}% 월`, await get('c-an-first'), want); }
  }
  await type('principal', '300000000'); await page.fill('#rate', '4.25'); expect('3억 4.25% 총이자', await get('c-an-int'), '231,295,082');
  for (const [rt, want] of [['3.75', '937,500'], ['4', '1,000,000'], ['4.25', '1,062,500']]) { await page.fill('#rate', rt); expect(`만기일시 3억 ${rt}%`, await get('c-bu-first'), want); }

  // guide-refinance.html — 남은 원금 3억·348개월 원리금균등, 금리별 월 상환과 첫해 이자. 만기 30년으로 늘릴 때 총이자
  await radio('method', 'annuity'); await page.fill('#months', '348');
  for (const [rt, mon, y1] of [['4.5', '1,544,980', '13394743'], ['4.25', '1,501,127', '12646250'], ['4', '1,457,920', '11898131'], ['3.5', '1,373,493', '10403101']]) {
    await page.fill('#rate', rt); expect(`갈아타기 3억 ${rt}% 월`, await get('c-an-first'), mon); expect(`갈아타기 3억 ${rt}% 첫해 이자`, (await year1()).split('/')[0], y1);
  }
  await page.fill('#rate', '4'); expect('3억 4% 29년 총이자', await get('c-an-int'), '207,356,298');
  await page.fill('#months', '360'); expect('3억 4% 30년 총이자', await get('c-an-int'), '215,608,519');
  await type('principal', '200000000'); await page.fill('#months', '348');
  for (const [rt, mon] of [['4.5', '1,029,987'], ['4', '971,947']]) { await page.fill('#rate', rt); expect(`갈아타기 2억 ${rt}% 월`, await get('c-an-first'), mon); }

  // guide-base-rate-change.html — 기준금리별 전환 월세 상한
  await fresh('conversion.html');
  await type('jeonse', '300000000'); await type('deposit', '100000000');
  for (const [br, want] of [['2.75', '791,667'], ['3.25', '875,000']]) { await page.fill('#baseRate', br); expect(`전환 기준 ${br}%`, await get('out-big'), want); }

  // guide-cgt-high-price.html — 1주택 고가 양도, 거주 기간별
  const cgt3 = async (label, { sale, res, acq = '2016-06-01', acqPrice = '500000000', adj = false }, want) => {
    await fresh('capital-gains-tax.html');
    await page.selectOption('#kind', 'house'); await page.selectOption('#acqCause', 'buy');
    await page.fill('#acqDate', acq); await type('acqPrice', acqPrice); await page.fill('#saleDate', '2026-11-02'); await type('salePrice', sale);
    await page.selectOption('#homes', '1'); await page.fill('#resMonths', res);
    for (const id of ['adjArea', 'adjAcquired']) if ((await page.isChecked('#' + id)) !== adj) await page.evaluate(i => { const e = document.getElementById(i); e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); }, id);
    expect(label, await get('out-total'), want);
  };
  for (const [sale, rows] of [['1500000000', [['0', '43,901,000'], ['24', '22,093,500'], ['60', '14,124,000'], ['120', '4,801,500']]], ['2000000000', [['0', '181,566,000'], ['24', '107,646,000'], ['60', '77,341,000'], ['120', '28,253,500']]]]) {
    for (const [res, want] of rows) await cgt3(`고가 ${sale} 거주${res}`, { sale, res }, want);
  }
  await cgt3('고가 2021취득 5년', { sale: '1500000000', res: '60', acq: '2021-06-01', acqPrice: '1000000000' }, '8,844,000');
  await cgt3('고가 12억1천', { sale: '1210000000', res: '120' }, '0');
  await cgt3('고가 조정취득 거주0', { sale: '1500000000', res: '0', acq: '2018-06-01', adj: true }, '347,391,000');
  await cgt3('고가 조정취득 거주2년', { sale: '1500000000', res: '24', acq: '2018-06-01', adj: true }, '28,253,500');

  // guide-deposit-return.html — 날짜
  await fresh('renewal.html');
  await page.fill('#start', '2024-11-15'); await page.fill('#months', '24'); await type('deposit', '200000000'); await type('rent', '0');
  expect('만기 지난 계약 상태', await get('out-status'), '지남'); expect('묵시적 갱신 해지일', await get('out-terminate'), '2026-12-21');
  await fresh('moving.html'); await page.fill('#moveDate', '2027-03-01'); expect('2027-03-01 이사 전입기한', await get('out-report'), '2027-03-15');
  // guide-renewal-family.html — 2025-05-20 시작 2년의 거절 기간, 손해배상 예시(기준금리 3% → 전환율 5%), 전세 2.4억 중개보수
  await fresh('renewal.html'); await page.fill('#start', '2025-05-20'); await page.fill('#months', '24');
  expect('실거주 거절 만기', await get('out-end'), '2027-05-20'); expect('실거주 거절 시작', await get('out-wstart'), '2026-11-20'); expect('실거주 거절 마감', await get('out-wend'), '2027-03-19');
  await fresh('conversion.html'); await page.fill('#baseRate', '3'); await type('deposit', '0');
  for (const [j, want] of [['240000000', '1,000,000'], ['300000000', '1,250,000']]) { await type('jeonse', j); expect(`환산월차임 전세 ${j}`, await get('out-big'), want); }
  await fresh('fee.html'); await radio('deal', 'jeonse'); await type('price', '240000000'); expect('복비 전세 2.4억', await get('out-fee'), '720,000');

  // 요율 의존 — 1월에 요율을 바꾸면 아래 기대값도 바꿀 것
  await fresh('salary.html');
  await type('salary', '50000000');
  // 2026년: 국민연금 4.75%(상·하한 659만·41만, 2026.7~), 장기요양 건보료의 13.14%. 4.5%·12.95%로 계산하던 것(2026-10 수정) 회귀 방지
  expect('연봉 국민연금', await get('out-pension'), '188,410'); expect('연봉 건강', await get('out-health'), '142,600'); expect('연봉 장기요양', await get('out-ltc'), '18,730'); expect('연봉 고용', await get('out-employ'), '35,700');
  expect('연봉 소득세', await get('out-tax'), '195,970'); expect('연봉 실수령', await get('out-net'), '3,565,667');   // guide-salary-net.html
  expect('연봉 표 행수', await page.$$eval('#table-body tr', r => r.length), 14);
  // guide-salary-raise.html — 기본값(비과세 20만, 본인 1명)에서 연봉별 월 실수령과 인상분
  for (const [s, want] of [['40000000', '2,924,343'], ['43000000', '3,116,803'], ['45000000', '3,245,110'], ['53000000', '3,756,197'], ['55000000', '3,883,213'], ['60000000', '4,200,750'], ['63000000', '4,391,280'], ['65000000', '4,518,297'],
                           ['70000000', '4,835,853'], ['71000000', '4,899,347'], ['75000000', '5,133,240'], ['76000000', '5,189,703'], ['80000000', '5,415,607'], ['83000000', '5,589,447'], ['85000000', '5,708,223'],
                           ['100000000', '6,599,013'], ['103000000', '6,776,783'], ['105000000', '6,894,240'], ['110000000', '7,187,877']]) { await type('salary', s); expect(`실수령 ${s}`, await get('out-net'), want); }
  await type('salary', '53000000'); expect('5,300만 국민연금', await get('out-pension'), '200,290'); expect('5,300만 건강', await get('out-health'), '151,580'); expect('5,300만 소득세', await get('out-tax'), '227,950');
  await type('salary', '80000000'); expect('8,000만 국민연금', await get('out-pension'), '307,160'); expect('8,000만 소득세', await get('out-tax'), '566,090');   // 근로소득세액공제 한도 '× 1/2'(0.005로 잘못 넣었던 것 2026-10 수정)
  await type('salary', '83000000'); expect('8,300만 국민연금 상한', await get('out-pension'), '313,020'); expect('8,300만 소득세', await get('out-tax'), '618,700');
  await page.fill('#family', '4'); await type('salary', '50000000'); expect('5천 가족 4명 소득세', await get('out-tax'), '139,720'); await page.fill('#family', '1');   // guide-salary-net.html 「약 6만원」

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

  // ------------------------------------------------------------ 보유·증여 세금 (2026-10 추가)
  const setChk = async (id, on) => page.evaluate(([i, v]) => { const e = document.getElementById(i); if (e.checked !== v) { e.checked = v; e.dispatchEvent(new Event('change', { bubbles: true })); } }, [id, on]);
  // 재산세: 공정시장가액비율 43~45%(1주택)·60%, 특례세율(공시 9억 이하), 도시지역분 0.14%, 지방교육세 20%
  await fresh('property-tax.html');
  expect('재산세 빈 화면', await get('sticky-monthly'), '—'); expect('재산세 기본 1주택', await page.isChecked('#oneHome'), true);
  for (const [pr, one, urban, total] of [['300000000', true, true, '299,400'], ['500000000', true, true, '620,000'], ['600000000', true, true, '787,200'], ['900000000', true, true, '1,512,000'],
                                         ['1000000000', true, true, '2,034,000'], ['600000000', false, true, '1,476,000'], ['300000000', true, false, '118,800']]) {
    await setChk('oneHome', one); await setChk('urban', urban); await type('price', pr); expect(`재산세 ${pr} ${one ? '1주택' : '일반'}${urban ? '' : ' 비도시'}`, await get('out-total'), total);
  }
  await setChk('oneHome', true); await setChk('urban', true); await type('price', '300000000');
  expect('재산세 3억 7월 일괄', await get('out-july'), '299,400'); expect('재산세 3억 9월', await get('out-sept'), '0'); expect('재산세 3억 과표', await get('out-base'), '129,000,000');
  await type('price', '600000000'); expect('재산세 6억 7월', await get('out-july'), '393,600');
  // 종부세: 공제 12억·9억, 60%, 2주택 이하 0.5~2.7%, 3주택 이상 12억 초과 2.0~5.0%, 재산세 공제(약식), 1주택 세액공제 최대 80%, 농특세 20%
  await fresh('comprehensive-property-tax.html');
  expect('종부세 빈 화면', await get('sticky-monthly'), '—');
  for (const [pr, kind, age, hold, total] of [['1500000000', 'one', 'a0', 'h0', '691,200'], ['1500000000', 'two', 'a0', 'h0', '1,267,200'], ['3000000000', 'three', 'a0', 'h0', '9,331,200'], ['3000000000', 'two', 'a0', 'h0', '8,827,200'],
                                              ['2000000000', 'one', 'a65', 'h10', '682,560'], ['2000000000', 'one', 'a70', 'h15', '455,040'], ['1200000000', 'one', 'a0', 'h0', '0'], ['1000000000', 'two', 'a0', 'h0', '187,200']]) {
    await page.selectOption('#kind', kind); if (kind === 'one') { await page.selectOption('#age', age); await page.selectOption('#hold', hold); }
    await type('price', pr); expect(`종부세 ${pr} ${kind} ${age} ${hold}`, await get('out-total'), total);
  }
  await page.selectOption('#kind', 'two'); await type('price', '1500000000'); expect('종부세 2주택 15억 산출(부동소수 오차 없음)', await get('out-computed'), '1,920,000'); expect('1주택 칸 숨김', await page.isHidden('#one-fields'), true);
  // 증여세: 공제(배우자 6억, 성년 5천만, 미성년 2천만), 혼인·출산 1억, 10년 합산, 세대생략 30%, 신고세액공제 3%
  await fresh('gift-tax.html');
  expect('증여세 빈 화면', await get('sticky-monthly'), '—'); expect('증여세 기본 신고공제', await page.isChecked('#filing'), true);
  for (const [amt, rel, prior, marriage, skip, filing, want] of [['100000000', 'adult', '', false, false, true, '4,850,000'], ['100000000', 'minor', '', false, false, true, '7,760,000'], ['300000000', 'adult', '', false, false, true, '38,800,000'],
                                                                 ['700000000', 'spouse', '', false, false, true, '9,700,000'], ['100000000', 'adult', '', true, false, true, '0'], ['200000000', 'adult', '', true, false, true, '4,850,000'],
                                                                 ['100000000', 'adult', '', false, true, true, '6,305,000'], ['100000000', 'adult', '50000000', false, false, true, '9,700,000'], ['100000000', 'adult', '', false, false, false, '5,000,000'],
                                                                 ['30000000', 'adult', '', false, false, true, '0'], ['100000000', 'other', '', false, false, true, '9,700,000']]) {
    await page.selectOption('#rel', rel); await page.fill('#prior', ''); if (prior) await type('prior', prior); await setChk('marriage', marriage); await setChk('skip', skip); await setChk('filing', filing);
    await type('amount', amt); expect(`증여세 ${amt} ${rel}${prior ? ' 합산' + prior : ''}${marriage ? ' 혼인' : ''}${skip ? ' 세대생략' : ''}${filing ? '' : ' 무신고'}`, await get('out-tax'), want);
  }

  // ------------------------------------------------------------ 상속·전세대출·저축·실업급여·시급 (2026-10 추가). 계산기 본문 예시 숫자 포함
  // 상속세: 일괄 5억, 배우자 5억~30억(법정상속분 한도), 금융재산 20%, 장례비 500만 기본, 사전증여 합산, 신고세액공제 3%
  await fresh('inheritance-tax.html');
  expect('상속세 빈 화면', await get('sticky-monthly'), '—'); expect('상속세 기본 배우자', await page.isChecked('#spouse'), true);
  for (const [est, spouse, kids, fin, want] of [['1000000000', true, '2', '', '0'], ['1000000000', false, '2', '', '86,330,000'], ['2000000000', true, '2', '', '128,040,000'],
                                                 ['3000000000', true, '2', '500000000', '276,034,286'], ['1000000000', true, '0', '', '0']]) {
    await setChk('spouse', spouse); await type('kids', kids); await page.fill('#fin', ''); if (fin) await type('fin', fin);
    await type('estate', est); expect(`상속세 ${est} ${spouse ? '배우자+' : ''}자녀${kids}${fin ? ' 금융' + fin : ''}`, await get('out-tax'), want);
  }
  await setChk('spouse', true); await type('kids', '2'); await page.fill('#fin', ''); await type('estate', '2000000000');
  expect('상속세 20억 배우자공제(법정상속분, 1원 밀림 없음)', await get('out-spouse'), '855,000,000'); expect('상속세 20억 과표', await get('out-base'), '640,000,000');
  await setChk('spouse', false); await type('estate', '1000000000'); await type('prior', '300000000'); await type('priorTax', '38800000');
  expect('상속세 사전증여 3억 합산', await get('out-tax'), '135,509,000'); expect('사전증여 과세가액', await get('out-taxable'), '1,295,000,000');
  // 전세자금대출: 보증금 × 비율(상한), 만기일시 월 이자, 기회비용, 소득공제 40%(최대 400만)
  await fresh('jeonse-loan.html');
  expect('전세대출 빈 화면', await get('sticky-monthly'), '—');
  await type('deposit', '300000000'); expect('전세대출 3억 월 이자', await get('out-monthly'), '800,000'); expect('전세대출 2년 이자', await get('out-total'), '19,200,000');
  expect('전세대출 월 주거비', await get('out-housing'), '950,000'); expect('전세대출 소득공제 대상', await get('out-deduct'), '3,840,000');
  await type('cap', '200000000'); expect('전세대출 상한 2억 월 이자', await get('out-monthly'), '666,666'); expect('상한 2억 월 주거비', await get('out-housing'), '916,666');
  await page.fill('#cap', ''); await type('rate', '4.5'); expect('전세대출 4.5%', await get('out-monthly'), '900,000');
  // 예금·적금: 적금 단리 n(n+1)/2, 월복리, 이자소득세 14% + 지방 1.4%(10원 미만 버림)
  await fresh('savings.html');
  expect('예적금 빈 화면', await get('sticky-monthly'), '—');
  await type('amount', '1000000'); expect('적금 100만 1년 3% 만기', await get('out-maturity'), '12,164,970'); expect('적금 세금', await get('out-tax'), '30,030'); expect('적금 원금 대비', await get('out-gross-yield'), '1.63');
  await type('months', '36'); await type('rate', '3.5'); await type('amount', '500000'); expect('적금 50만 3년 3.5% 세후 이자', await get('out-net'), '821,690');
  await radio('kind', 'deposit'); await type('months', '12'); await type('rate', '3'); await type('amount', '10000000'); expect('예금 1천만 1년 세후 이자', await get('out-net'), '253,800');
  await radio('method', 'compound'); expect('예금 월복리 이자', await get('out-interest'), '304,159');
  // 실업급여: 평균임금 60%, 2026 상한 68,100·하한 66,048(8시간), 나이·가입기간별 120~270일
  await fresh('unemployment-benefit.html');
  expect('실업급여 빈 화면', await get('sticky-monthly'), '—');
  for (const [w, age, yrs, want] of [['2500000', 'under50', '1', '9,907,200'], ['3000000', 'under50', '2', '11,888,640'], ['4000000', 'over50', '4', '18,387,000']]) {
    await radio('age', age); await page.selectOption('#years', yrs); await type('wage', w); expect(`실업급여 월${Number(w) / 1e4}만 ${age} ${yrs}`, await get('out-total'), want);
  }
  await type('wage', '3400000'); expect('실업급여 상·하한 사이', await get('out-daily'), '67,252');
  await page.fill('#leave', '2026-05-31'); expect('실업급여 3개월 일수(5/31)', await get('out-d3'), '92'); await page.fill('#leave', '');
  // 시급·주휴수당: 주휴 = 주 시간 ÷ 40 × 8(15시간 이상), 월 = (주 + 주휴) × 365/7/12 반올림
  await fresh('hourly-wage.html');
  expect('시급 빈 화면', await get('sticky-monthly'), '—');
  await type('wage', '10320'); expect('최저임금 주 40시간 월급', await get('out-monthly'), '2,156,880'); expect('최저임금 주휴수당', await get('out-holiday'), '82,560');
  for (const [d, n, want] of [['5', '4', '1,073,280'], ['7', '2', '629,520'], ['3', '5', '804,960'], ['9', '5', '2,497,440']]) {
    await type('daily', d); await type('days', n); expect(`시급 10,320 ${d}시간×${n}일`, await get('out-monthly'), want);
  }

  // ------------------------------------------------------------ 연말정산·등기비용·연금계좌·육아휴직·연차·임대소득세 (2026-10 추가). 본문 예시 포함
  const openGroups = async () => page.evaluate(() => document.querySelectorAll('#calc-form details').forEach(d => { d.open = true; }));
  // 연말정산: 근로소득공제·기본공제·4대보험, 카드 25% 초과(15·30·40%, 한도 300만+자녀), 근로소득세액공제 한도 '× 1/2', 연금계좌 12·15%, 표준 13만 vs 항목별 중 작은 세금
  await fresh('year-end-tax.html');
  expect('연말정산 빈 화면', await get('sticky-monthly'), '—');
  await type('salary', '50000000'); expect('연말정산 5천 결정세액', await get('out-tax'), '2,658,716'); expect('연말정산 5천 환급 0', await get('out-total'), '0');
  await openGroups(); await type('credit', '15000000'); await type('debit', '5000000'); expect('연말정산 카드 공제', await get('out-card'), '1,875,000'); expect('연말정산 카드 환급', await get('out-total'), '309,370');
  await type('saving', '6000000'); expect('연말정산 연금저축 환급', await get('out-total'), '1,299,370');
  await type('withheld', '500000'); expect('연말정산 추가 납부', await get('sticky-monthly'), '추가 납부 1,075,200원');
  await page.click('[data-preset="family"]'); expect('연말정산 6천 4인 결정세액', await get('out-tax'), '1,035,452'); expect('연말정산 의료비(3% 초과)', await get('out-c-medical'), '180,000');
  await page.click('[data-preset="high"]'); expect('연말정산 8천 근로소득세액공제 한도', await get('out-c-earned'), '500,000'); expect('연말정산 8천 표준세액공제', await get('out-c-standard'), '130,000');
  // 등기비용: 국민주택채권(공시가격 × 1,000분의 13~31) × 할인율, 인지세 1억~10억 15만, 수수료 2025-08 인상분
  await fresh('registration-cost.html');
  expect('등기비용 빈 화면', await get('sticky-monthly'), '—');
  for (const [pr, total, bond] of [['s6', '1,182,000', '10,920,000'], ['s9', '2,043,000', '19,530,000'], ['l3', '468,000', '3,780,000']]) {
    await page.click(`[data-preset="${pr}"]`); expect(`등기비용 ${pr}`, await get('out-total'), total); expect(`채권 매입 ${pr}`, await get('out-bond'), bond);
  }
  // 연금저축·IRP: 600만·900만, 16.5%·13.2%
  await fresh('pension-tax-credit.html');
  expect('연금계좌 빈 화면', await get('sticky-monthly'), '—');
  for (const [pr, want] of [['s6', '990,000'], ['s9', '1,485,000'], ['h9', '1,188,000']]) { await page.click(`[data-preset="${pr}"]`); expect(`연금계좌 ${pr}`, await get('out-total'), want); }
  await page.click('[data-preset="s6"]'); expect('연금계좌 남은 한도 공제', await get('out-room-credit'), '495,000');
  // 육아휴직: 250·200·160만(80%), 하한 70만, 6+6 250·250·300·350·400·450
  await fresh('parental-leave.html');
  expect('육아휴직 빈 화면', await get('sticky-monthly'), '—');
  await page.click('[data-preset="w300"]'); expect('육아휴직 300만 1년', await get('out-total'), '23,100,000');
  await page.click('[data-preset="s66"]'); expect('육아휴직 6+6 500만', await get('out-total'), '20,000,000');
  await setChk('sixsix', false); await type('months', '12'); await type('wage', '1800000'); expect('육아휴직 180만 1년', await get('out-total'), '19,440,000');
  // 연차: 1년 미만 월 1일(최대 11), 15일 + 2년마다 1일(최대 25), 수당 = 월 통상임금 ÷ 209 × 8
  await fresh('annual-leave.html');
  expect('연차 빈 화면', await get('sticky-monthly'), '—');
  await page.fill('#join', '2023-09-21'); await page.fill('#base', '2026-09-21'); await type('wage', '3000000'); await type('unused', '5');
  expect('연차 3년', await get('out-now'), '16'); expect('연차수당 5일', await get('out-pay'), '574,160'); expect('연차 다음 발생', await get('out-next'), '2027-09-21 · 16일');
  await page.fill('#join', '2026-03-21'); expect('연차 6개월', await get('out-now'), '6');
  await page.fill('#join', '2005-01-01'); expect('연차 최대 25일', await get('out-now'), '25');
  // 주택임대소득세: 1주택 비과세, 분리과세 (수입 − 50·60% − 200·400만) × 14% + 1.4%, 간주임대료 (보증금 − 3억) × 60% × 3.1%
  await fresh('rental-income-tax.html');
  expect('임대소득세 빈 화면', await get('sticky-monthly'), '—');
  await page.click('[data-preset="two"]'); expect('임대소득세 2주택 미등록', await get('out-total'), '616,000');
  await page.click('[data-preset="tworeg"]'); expect('임대소득세 2주택 등록', await get('out-total'), '123,200');
  await page.click('[data-preset="three"]'); expect('간주임대료 8억', await get('out-deemed'), '9,300,000'); expect('3주택 종합과세', await get('sticky-monthly'), '종합과세 대상');
  await page.selectOption('#homes', '1'); expect('1주택 비과세', await get('out-kind'), '비과세');

  // ------------------------------------------------------------ 안내 글 4편 (2026-10) 본문 숫자
  // guide-jongbuse-threshold.html — 1주택 공시가격별, 세액공제, 2·3주택, 공동명의(각 9억), 같은 집 재산세
  await fresh('comprehensive-property-tax.html');
  for (const [kind, age, hold, pr, want] of [['one', 'a0', 'h0', '1300000000', '230,400'], ['one', 'a0', 'h0', '1800000000', '1,526,400'], ['one', 'a0', 'h0', '2000000000', '2,275,200'], ['one', 'a0', 'h0', '2500000000', '4,795,200'],
                                             ['one', 'a0', 'h0', '3000000000', '7,747,200'], ['one', 'a60', 'h5', '2000000000', '1,365,120'], ['one', 'a65', 'h10', '1800000000', '457,920'],
                                             ['two', 'a0', 'h0', '2000000000', '3,139,200'], ['three', 'a0', 'h0', '2000000000', '3,139,200'], ['two', 'a0', 'h0', '900000000', '0']]) {
    await page.selectOption('#kind', kind); if (kind === 'one') { await page.selectOption('#age', age); await page.selectOption('#hold', hold); }
    await type('price', pr); expect(`종부세 글 ${kind} ${age} ${hold} ${pr}`, await get('out-total'), want);
  }
  await fresh('property-tax.html'); await type('price', '1500000000'); expect('재산세 1주택 15억', await get('out-total'), '3,429,000');
  // guide-year-end-december.html — 총급여 5천·본인 1명, 기납부세액 추정
  await fresh('year-end-tax.html'); await openGroups(); await type('salary', '50000000');
  for (const [credit, debit, want] of [['20000000', '', '185,620'], ['', '20000000', '371,250'], ['12500000', '7500000', '371,250']]) {
    await page.fill('#credit', ''); await page.fill('#debit', ''); if (credit) await type('credit', credit); if (debit) await type('debit', debit);
    expect(`연말정산 글 카드 ${credit}/${debit}`, await get('out-total'), want);
  }
  await page.fill('#debit', ''); await type('credit', '15000000'); await type('debit', '5000000'); await type('saving', '6000000'); await type('irp', '3000000'); expect('연말정산 글 연금 900만', await get('out-total'), '1,794,370');
  await page.fill('#saving', ''); await page.fill('#irp', ''); await setChk('marriage', true); expect('연말정산 글 혼인', await get('out-total'), '859,370'); await setChk('marriage', false);
  await page.fill('#credit', ''); await page.fill('#debit', ''); await type('salary', '30000000'); expect('연말정산 글 3천 결정세액', await get('out-tax'), '371,860');
  await type('saving', '3000000'); expect('연말정산 글 3천 연금 300만', await get('out-total'), '409,040'); await type('saving', '6000000'); await type('irp', '3000000'); expect('연말정산 글 3천 연금 900만', await get('out-total'), '409,040');
  // guide-gift-vs-inheritance.html
  await fresh('gift-tax.html'); await type('amount', '1000000000'); expect('증여 글 10억 성년', await get('out-tax'), '218,250,000');
  await fresh('inheritance-tax.html');
  for (const [est, spouse, kids, prior, priorTax, want] of [['1300000000', false, '2', '', '', '173,145,000'], ['1000000000', false, '2', '300000000', '38800000', '135,509,000'], ['1000000000', false, '1', '', '', '86,330,000'], ['1300000000', true, '2', '', '', '36,860,000']]) {
    await setChk('spouse', spouse); await type('kids', kids); await page.fill('#prior', ''); await page.fill('#priorTax', ''); if (prior) { await type('prior', prior); await type('priorTax', priorTax); }
    await type('estate', est); expect(`상속 글 ${est} ${spouse ? '배우자' : ''} 자녀${kids}${prior ? ' 증여' + prior : ''}`, await get('out-tax'), want);
  }
  // guide-savings-real-rate.html — 단리, 15.4%
  await fresh('savings.html');
  for (const [kind, amt, m, r, method, id, want] of [['deposit', '12000000', '12', '3', 'simple', 'out-net', '304,560'], ['deposit', '6500000', '12', '3', 'simple', 'out-interest', '195,000'], ['installment', '100000', '12', '10', 'simple', 'out-net', '54,990'],
                                                     ['installment', '300000', '12', '7', 'simple', 'out-net', '115,480'], ['installment', '1000000', '24', '3', 'simple', 'out-interest', '750,000'], ['installment', '1000000', '36', '3', 'simple', 'out-interest', '1,665,000'],
                                                     ['installment', '1000000', '12', '3', 'compound', 'out-interest', '196,798'], ['deposit', '100000000', '12', '3', 'simple', 'out-net', '2,538,000']]) {
    await radio('kind', kind); await radio('method', method); await type('months', m); await type('rate', r); await type('amount', amt); expect(`적금 글 ${kind} ${amt} ${m}개월 ${r}% ${method}`, await get(id), want);
  }

  // ------------------------------------------------------------ 안내 글 7편 (2026-10 2차) 본문 숫자
  // guide-jeonse-loan-vs-rent.html — 전세 3억·80%·24개월·기회비용 3%, 월세 보증금 5천·100만, 연말정산 총급여 5천
  await fresh('jeonse-loan.html'); await type('deposit', '300000000');
  for (const [rate, want] of [['3.5', '850,000'], ['4.875', '1,125,000'], ['4', '950,000']]) { await type('rate', rate); expect(`전세대출 글 ${rate}%`, await get('out-housing'), want); }
  await fresh('rent.html'); await type('rent', '1000000'); await page.fill('#maint', ''); await type('deposit', '50000000'); await type('rate', '3');
  expect('전세대출 글 월세 월 실부담', await get('out-monthly'), '1,125,000'); expect('전세대출 글 월세 1년', await get('out-yearly'), '13,500,000');
  await fresh('year-end-tax.html'); await openGroups(); await type('salary', '50000000');
  await type('rent', '12000000'); expect('전세대출 글 월세 세액공제 환급', await get('out-total'), '1,727,000'); await page.fill('#rent', '');
  await type('lease', '9600000'); expect('전세대출 글 전세대출 소득공제 환급', await get('out-total'), '490,600');
  // guide-self-registration.html — 할인율·지역·집값별, 취득세 포함 합계
  await fresh('registration-cost.html'); await page.click('[data-preset="s6"]');
  for (const [d, want] of [['8', '873,600'], ['12', '1,310,400']]) { await type('discount', d); expect(`셀프등기 글 할인율 ${d}%`, await get('out-bond-cost'), want); }
  await type('discount', '10'); await type('acq', '6600000'); expect('셀프등기 글 6억 + 취득세', await get('out-total'), '7,782,000');
  await page.selectOption('#region', 'other'); await page.fill('#acq', ''); expect('셀프등기 글 그 밖 지역 4.2억', await get('out-bond-cost'), '882,000');
  await page.click('[data-preset="l3"]'); await type('acq', '3300000'); expect('셀프등기 글 지방 3억 + 취득세', await get('out-total'), '3,768,000');
  await page.selectOption('#region', 'metro'); await page.fill('#acq', ''); expect('셀프등기 글 광역시 2.1억', await get('out-bond-cost'), '483,000');
  await page.click('[data-preset="s9"]'); await type('acq', '29700000'); expect('셀프등기 글 9억 + 취득세', await get('out-total'), '31,743,000');
  await fresh('acquisition-tax.html'); await page.selectOption('#situation', 'one'); await type('price', '300000000'); expect('셀프등기 글 취득세 3억', await get('out-total'), '3,300,000');
  // guide-annual-leave-pay.html — 입사일 기준
  await fresh('annual-leave.html');
  for (const [join, base, wage, unused, now, pay] of [['2025-03-02', '2026-03-02', '2500000', '10', '15', '956,930'], ['2021-01-04', '2026-12-31', '4000000', '3', '17', '459,330'],
                                                      ['2016-01-04', '2026-12-31', '5000000', '7', '19', '1,339,709'], ['2026-03-02', '2026-12-31', '2500000', '0', '9', '0']]) {
    await page.fill('#join', join); await page.fill('#base', base); await type('wage', wage); await type('unused', unused);
    expect(`연차 글 ${join} 연차`, await get('out-now'), now); expect(`연차 글 ${join} 수당`, await get('out-pay'), pay);
  }
  // guide-minimum-wage-2027.html — 시급 칸에 10,700원·9,630원
  await fresh('hourly-wage.html');
  for (const [w, d, n, want] of [['10700', '8', '5', '2,236,300'], ['10700', '6', '5', '1,669,200'], ['10700', '5', '4', '1,112,800'], ['10700', '3', '5', '834,600'], ['10700', '7', '2', '652,700'], ['10700', '4', '3', '556,400'], ['9630', '8', '5', '2,012,670']]) {
    await type('wage', w); await type('daily', d); await type('days', n); expect(`최저임금 글 ${w} ${d}×${n}`, await get('out-monthly'), want);
  }
  await type('wage', '10700'); await type('daily', '8'); await type('days', '5'); await setChk('biz', true); expect('최저임금 글 3.3%', await get('out-net'), '2,162,520');
  // guide-rental-income-two-homes.html
  await fresh('rental-income-tax.html');
  for (const [homes, high, rent, dep, reg, other, want] of [['2', false, '500000', '', false, true, '154,000'], ['2', false, '500000', '', true, true, '0'], ['2', false, '1500000', '', false, true, '1,078,000'], ['2', false, '1500000', '', true, true, '492,800'],
                                                           ['2', false, '1660000', '', false, true, '1,225,840'], ['2', false, '1000000', '', false, false, '924,000'], ['2', true, '', '1300000000', false, true, '1,124,200'], ['1', true, '1000000', '', false, true, '616,000']]) {
    await page.selectOption('#homes', homes); await setChk('high', high); await page.fill('#rent', ''); await page.fill('#deposit', ''); if (rent) await type('rent', rent); if (dep) await type('deposit', dep); await setChk('reg', reg); await setChk('otherLow', other);
    expect(`임대소득 글 ${homes}주택${high ? ' 고가' : ''} ${rent || dep}${reg ? ' 등록' : ''}${other ? '' : ' 기본공제X'}`, await get('out-total'), want);
  }
  await page.selectOption('#homes', '2'); await setChk('high', false); await setChk('reg', false); await type('rent', '1700000'); expect('임대소득 글 월 170만 종합과세', await get('out-kind'), '종합과세');
  await page.fill('#rent', ''); await setChk('high', true); await type('deposit', '1500000000'); expect('임대소득 글 고가 2주택 15억 종합과세', await get('out-kind'), '종합과세');
  await type('deposit', '1200000000'); expect('임대소득 글 고가 2주택 12억 비과세', await get('out-kind'), '비과세');
  // income-tax.html 본문 + guide-freelancer-refund.html — 혼자, 단순경비율 940909(64.1%·초과 49.7%)
  await fresh('income-tax.html');
  for (const [v, want] of [['10000000', '269,060'], ['20000000', '362,120'], ['30000000', '455,180'], ['40000000', '548,240'], ['50000000', '161,150']]) { await type('revenue', v); expect(`종소세 수입 ${v} 환급`, await get('out-total'), want); }
  await type('revenue', '30000000'); expect('종소세 3천 경비', await get('out-expense'), '19,230,000'); expect('종소세 3천 과세표준', await get('out-base'), '9,270,000'); expect('종소세 3천 결정세액', await get('out-tax'), '486,200');
  await type('family', '3'); expect('종소세 3천 부양 2명', await get('out-total'), '653,180'); await type('family', '1');
  await openGroups(); await type('saving', '3000000'); expect('종소세 3천 연금저축 300만', await get('out-total'), '950,180'); await type('saving', '0');
  await page.selectOption('#method', 'book'); await type('expense', '5000000');
  expect('종소세 장부 경비 500만 결정세액', await get('out-tax'), '2,195,000'); expect('종소세 장부 추가 납부', await get('out-total'), '1,424,500'); expect('종소세 장부 추가 납부 문구', (await get('out-kicker')).includes('더 내는'), true);
  await fresh('income-tax.html'); await page.click('.chip[data-preset="r5"]'); expect('종소세 5천 예시 버튼', await get('out-total'), '161,150');
  // land-multiple.html — 예시 100만 → 2,000만원(1990→2026) 20배·연 8.68%, 같은 20배를 20년이면 16.16%, 물가는 2015~2025년만
  await fresh('land-multiple.html'); await page.click('.chip[data-preset="ex"]');
  expect('땅값 예시 배수', await get('out-big'), '20'); expect('땅값 예시 연평균', await get('out-cagr'), '8.68'); expect('땅값 예시 기간', await get('out-years'), '36년');
  expect('땅값 예시 평당', await get('out-s3'), '66,115,702'); expect('땅값 1990 물가 없음', await get('out-cpi'), '—');
  await page.selectOption('#yearThen', '2006'); expect('땅값 20배 20년 연평균', await get('out-cagr'), '16.16');
  await page.selectOption('#yearThen', '2015'); await page.selectOption('#yearNow', '2025'); await type('priceNow', '2000000');
  expect('땅값 2015→2025 물가 배수', await get('out-cpi'), '1.23배'); expect('땅값 물가 뺀 배수', await get('out-real'), '1.63배');
  await type('area', '100'); await radio('areaUnit', 'py');
  expect('땅값 100평 ㎡', await get('out-area-m2'), '330.58'); expect('땅값 100평 그때', await get('out-total-then'), '330,578,512'); expect('땅값 100평 지금', await get('out-total-now'), '661,157,025');
  // 지역 고르기 — 한국부동산원 지가지수(tools/data/land_index.json). 올해는 9월 지수라 기간이 9개월 짧다
  await fresh('land-multiple.html'); expect('땅값 지역 처음 빈 화면', await get('sticky-monthly'), '—');
  await page.selectOption('#region', '서울 강남구');
  // 본문 「지역 지수와 내 땅의 공시지가 배수」 절의 숫자도 여기서 확인 (강남구 1990→2026, 1987→2026, 전국 1990→2026)
  expect('땅값 강남구 1990→2026 배수', await get('out-big'), '2.53'); expect('땅값 강남구 연평균', await get('out-cagr'), '2.63'); expect('땅값 강남구 기간', await get('out-years'), '35년 9개월');
  // 「지금 1㎡당 가격」을 넣으면 그때 가격을 지수 비율로 거꾸로 추정 (FAQ: 강남구 1,000만원/㎡ → 1990년 약 395만원)
  await type('regionPrice', '10000000'); expect('땅값 강남구 그때 1㎡당 추정', await get('out-rp-then-m2'), '395만원'); expect('땅값 강남구 지금 평당', await get('out-rp-now-py'), '3,306만원'); expect('땅값 강남구 평당 오른 금액(보이는 값끼리 셈)', await get('out-rp-diff-py'), '2,000만원');
  expect('땅값 강남구 그때 평당 결과 칸', await get('out-s3'), '1,306만원'); await type('regionPrice', '');
  await page.selectOption('#yearThen', '1987'); expect('땅값 강남구 1987→2026 배수', await get('out-big'), '7.04'); await page.selectOption('#yearThen', '1990');
  await page.selectOption('#region', '전국'); expect('땅값 전국 1990→2026 배수', await get('out-big'), '1.93');
  await page.selectOption('#yearNow', '2025');
  expect('땅값 전국 1990→2025', await get('out-big'), '1.9'); expect('땅값 전국 물가 배수', await get('out-cpi'), '3.03배'); expect('땅값 전국 물가 뺀 배수', await get('out-real'), '0.63배');
  // 연도는 그 지역 자료가 있는 해만 고를 수 있다. 해운대는 1994년부터라 1990이 1994로 옮겨지고, 다른 지역으로 바꾸면 1990으로 돌아온다
  await page.selectOption('#region', '부산 해운대구'); expect('땅값 해운대 그때 연도 옮김', await page.inputValue('#yearThen'), '1994');
  expect('땅값 해운대 연도 목록 첫 해', await page.$eval('#yearThen option', o => o.value), '1994'); expect('땅값 해운대 안내', (await get('out-note')).includes('1994년부터'), true);
  await page.selectOption('#region', '서울 강남구'); expect('땅값 지역 바꾸면 고른 해로', await page.inputValue('#yearThen'), '1990');
  // 공유 링크의 연도가 살아야 한다(2026-11 버그: 그때 연도가 1990으로 돌아가 34년이 36년으로 계산됨). 지역 고르기·목록 밖 연도도
  await fresh('land-multiple.html?mode=direct&priceThen=10800000&priceNow=46220000&yearThen=1992&yearNow=2026');
  expect('땅값 공유 링크 그때 연도', await page.inputValue('#yearThen'), '1992'); expect('땅값 공유 링크 기간', await get('out-years'), '34년');
  expect('땅값 공유 링크 배수', await get('out-big'), '4.28'); expect('땅값 공유 링크 연평균', await get('out-cagr'), '4.37');
  await fresh('land-multiple.html?mode=region&region=' + encodeURIComponent('서울 강남구') + '&yearThen=1992&yearNow=2020');
  expect('땅값 공유 링크 지역 연도', (await page.inputValue('#yearThen')) + '→' + (await page.inputValue('#yearNow')), '1992→2020'); expect('땅값 공유 링크 지역 기간', await get('out-years'), '28년');
  await fresh('land-multiple.html?mode=direct&priceThen=1000000&priceNow=2000000&yearThen=1970&yearNow=2026');
  expect('땅값 목록 밖 연도는 처음 값', await page.inputValue('#yearThen'), '1990'); expect('땅값 목록 밖 연도 기간', await get('out-years'), '36년');
  // apartment-multiple.html — 예시 3억 → 9억(2006→2026) 3배·연 5.65%, 같은 3배를 10년이면 11.61% (FAQ·본문 숫자)
  // 지역 고르기(한국부동산원 아파트 매매가격지수)는 tools/data/apt_index.json이 들어오면 기대값을 더할 것
  await fresh('apartment-multiple.html'); expect('아파트 처음 빈 화면', await get('sticky-monthly'), '—');
  await page.click('.chip[data-preset="ex"]');
  expect('아파트 예시 배수', await get('out-big'), '3'); expect('아파트 예시 연평균', await get('out-cagr'), '5.65'); expect('아파트 예시 기간', await get('out-years'), '20년');
  expect('아파트 예시 오른 금액', await get('out-s3'), '6억원'); expect('아파트 예시 표 오른 금액', await get('out-diff'), '6억원');
  await page.selectOption('#yearThen', '2016'); expect('아파트 3배 10년 연평균', await get('out-cagr'), '11.61');
  // 지역 고르기 — 한국부동산원 아파트 매매가격지수(tools/data/apt_index.json, 2026년 9월까지). 본문 「지역 지수로 본 배수」 절·FAQ 숫자
  await fresh('apartment-multiple.html'); expect('아파트 지역 처음 빈 화면', await get('sticky-monthly'), '—');
  await page.selectOption('#region', '전국');
  expect('아파트 전국 2006→2026', await get('out-big'), '1.47'); expect('아파트 전국 연평균', await get('out-cagr'), '1.98'); expect('아파트 전국 기간', await get('out-years'), '19년 9개월');
  expect('아파트 전국 평균 매매가 자동', await page.inputValue('#regionPrice'), '523,000,000'); expect('아파트 전국 2006 시세 추정', await get('out-s3'), '3억 5,500만원');
  await page.selectOption('#yearNow', '2025'); expect('아파트 평균가는 최신 달 기준이라 2006 추정 그대로', await get('out-s3'), '3억 5,500만원');
  expect('아파트 전국 2006→2025 물가', await get('out-cpi'), '1.53배'); expect('아파트 전국 물가 뺀 배수', await get('out-real'), '0.93배'); await page.selectOption('#yearNow', '2026');
  await page.selectOption('#yearThen', '2012'); expect('아파트 전국 2012→2026', await get('out-big'), '1.22');
  await page.selectOption('#yearThen', '2003'); expect('아파트 전국 2003→2026', await get('out-big'), '1.76');
  await page.selectOption('#region', '서울 전체'); expect('아파트 서울 2003→2026', await get('out-big'), '2.24');
  await page.selectOption('#yearThen', '2006'); expect('아파트 서울 2006→2026', await get('out-big'), '1.68');
  await page.selectOption('#region', '세종 전체'); expect('아파트 세종은 2012년부터', await page.inputValue('#yearThen'), '2012');
  await page.fill('#regionPrice', '500000000'); await page.dispatchEvent('#regionPrice', 'input'); await page.selectOption('#region', '전국');
  expect('아파트 직접 넣은 시세는 지역을 바꿔도 그대로', await page.inputValue('#regionPrice'), '500,000,000');
  // 자료보다 이른 해를 고른 뒤 지역을 고르면 그 지역 첫 해로 옮기고 알려 준다(2026-11 「계산이 안 돼」 — 1992 → 수정구 2003)
  await fresh('apartment-multiple.html'); await page.selectOption('#yearThen', '1992'); await page.selectOption('#region', '경기 성남시 수정구');
  expect('아파트 수정구 1992 → 2003', await page.inputValue('#yearThen'), '2003'); expect('아파트 수정구 배수', await get('out-big'), '2.27');
  expect('아파트 연도 옮김 안내', (await get('out-note')).includes('1992년은 이 지역 자료가 없어'), true);
  // 지역 목록과 설명은 아파트 자료여야 한다(자료가 없을 때 땅값 목록이 들어간 적 있음)
  expect('아파트 지역 설명은 아파트 지수', (await page.textContent('#region-fields') + await page.evaluate(() => document.getElementById('region').parentNode.textContent)).includes('아파트 매매가격지수'), true);
  // 직접 입력 + 지역 비교: 3억 → 9억(2006→2026)은 3배, 같은 기간 전국 지수 1.47배
  await fresh('apartment-multiple.html'); await page.click('.chip[data-preset="ex"]'); await page.selectOption('#region', '전국');
  expect('아파트 직접 입력 지역 비교', await get('out-cmp'), '1.47배');
  await fresh('apartment-multiple.html?mode=direct&priceThen=300000000&priceNow=900000000&yearThen=2010&yearNow=2026');
  expect('아파트 공유 링크 연도', await page.inputValue('#yearThen'), '2010'); expect('아파트 공유 링크 기간', await get('out-years'), '16년'); expect('아파트 공유 링크 연평균', await get('out-cagr'), '7.11');
  // ------------------------------------------------------------ 안내 글 6편 (2026-11) 본문 숫자
  // guide-gift-tax-free.html — 신고세액공제 3% 넣음
  await fresh('gift-tax.html');
  for (const [amt, rel, prior, marriage, skip, want] of [['10000000', 'other', '', false, false, '970,000'], ['10000000', 'kin', '', false, false, '0'], ['50000000', 'adult', '50000000', false, false, '4,850,000'],
      ['150000000', 'adult', '', false, false, '9,700,000'], ['200000000', 'adult', '', false, false, '19,400,000'], ['500000000', 'adult', '', false, false, '77,600,000'],
      ['150000000', 'adult', '', true, false, '0'], ['300000000', 'adult', '', true, false, '19,400,000'], ['50000000', 'minor', '', false, false, '2,910,000'],
      ['800000000', 'spouse', '', false, false, '29,100,000'], ['1000000000', 'spouse', '', false, false, '67,900,000'], ['200000000', 'adult', '', false, true, '25,220,000']]) {
    await page.selectOption('#rel', rel); await page.fill('#prior', ''); if (prior) await type('prior', prior); await setChk('marriage', marriage); await setChk('skip', skip);
    await type('amount', amt); expect(`증여 면제 글 ${amt} ${rel}${prior ? ' 합산' + prior : ''}${marriage ? ' 혼인' : ''}${skip ? ' 세대생략' : ''}`, await get('out-tax'), want);
  }
  // guide-jongbuse-payment.html — 분납은 종부세(out-tax) 기준: 250만 초과~500만 이하는 250만 넘는 금액, 500만 초과는 절반. 농특세는 같은 비율
  await fresh('comprehensive-property-tax.html');
  for (const [kind, age, hold, pr, tax, rural] of [['one', 'a0', 'h0', '2000000000', '1,896,000', '379,200'], ['one', 'a0', 'h0', '2500000000', '3,996,000', '799,200'], ['one', 'a0', 'h0', '3000000000', '6,456,000', '1,291,200'],
      ['two', 'a0', 'h0', '2000000000', '2,616,000', '523,200'], ['two', 'a0', 'h0', '3000000000', '7,356,000', '1,471,200'], ['one', 'a60', 'h10', '2000000000', '758,400', '151,680']]) {
    await page.selectOption('#kind', kind); if (kind === 'one') { await page.selectOption('#age', age); await page.selectOption('#hold', hold); }
    await type('price', pr); expect(`종부세 납부 글 ${kind} ${age} ${hold} ${pr} 종부세`, await get('out-tax'), tax); expect(`종부세 납부 글 ${kind} ${pr} 농특세`, await get('out-rural'), rural);
  }
  // guide-apartment-multiple.html — 시·도별 2006·2012·2020년부터 배수와 평균 매매가(자동으로 넣는 값)
  await fresh('apartment-multiple.html');
  for (const [r, a06, a12, a20, avg] of [['전국', '1.47', '1.22', '1.04', '523,000,000'], ['서울 전체', '1.68', '1.57', '1.21', '1,370,000,000'], ['부산 전체', '1.65', '1.07', '0.94', '370,000,000'],
      ['대구 전체', '1.28', '1.12', '0.79', '322,000,000'], ['인천 전체', '1.58', '1.28', '1.05', '387,000,000'], ['광주 전체', '1.52', '1.12', '0.95', '270,000,000'], ['대전 전체', '1.64', '1.28', '0.95', '336,000,000'],
      ['울산 전체', '1.47', '1.04', '1.02', '317,000,000'], ['세종 전체', '', '1.16', '0.74', '529,000,000'], ['경기 전체', '1.43', '1.41', '1.11', '599,000,000'], ['강원 전체', '1.34', '1.06', '1.07', '188,000,000'],
      ['충북 전체', '1.43', '1.05', '1.09', '214,000,000'], ['충남 전체', '1.28', '1.03', '1.02', '199,000,000'], ['전북 전체', '1.58', '1.04', '1.09', '202,000,000'], ['전남 전체', '1.5', '0.97', '0.93', '178,000,000'],
      ['경북 전체', '1.2', '1.01', '1.01', '168,000,000'], ['경남 전체', '1.35', '0.89', '0.99', '230,000,000'], ['제주 전체', '1.78', '1.21', '1.05', '286,000,000']]) {
    await page.selectOption('#region', r); expect(`아파트 표 ${r} 평균 매매가`, await page.inputValue('#regionPrice'), avg);
    for (const [y, want] of [['2006', a06], ['2012', a12], ['2020', a20]]) { if (!want) continue; await page.selectOption('#yearThen', y); expect(`아파트 표 ${r} ${y}→2026`, await get('out-big'), want); }
  }
  for (const [r, want] of [['전국', '0.91'], ['서울 전체', '1.12'], ['대구 전체', '0.73'], ['세종 전체', '0.75']]) { await page.selectOption('#region', r); await page.selectOption('#yearThen', '2021'); expect(`아파트 글 ${r} 2021→2026`, await get('out-big'), want); }
  for (const [r, want] of [['부산 전체', '1.54'], ['서울 전체', '1.07']]) {   // 세종(2012년부터) 다음이라 지역을 먼저 고른다
    await page.selectOption('#region', r); await page.selectOption('#yearThen', '2006'); await page.selectOption('#yearNow', '2012'); expect(`아파트 글 ${r} 2006→2012`, await get('out-big'), want);
  }
  await page.selectOption('#region', '전국'); await page.selectOption('#yearNow', '2025'); expect('아파트 글 전국 2006→2025', await get('out-big'), '1.43');
  // guide-land-price-lookup.html — 직접 입력 30만 → 120만(2006→2026), 330㎡, 지역 고르기 전국
  await fresh('land-multiple.html'); await radio('mode', 'direct'); await type('priceThen', '300000'); await type('priceNow', '1200000'); await page.selectOption('#yearThen', '2006');
  expect('공시지가 글 4배', await get('out-big'), '4'); expect('공시지가 글 연평균', await get('out-cagr'), '7.18'); expect('공시지가 글 지금 평당', await get('out-s3'), '3,966,942');
  await type('area', '330'); expect('공시지가 글 330㎡ 그때', await get('out-total-then'), '99,000,000'); expect('공시지가 글 330㎡ 지금', await get('out-total-now'), '396,000,000'); expect('공시지가 글 늘어난 금액', await get('out-total-diff'), '297,000,000');
  await page.selectOption('#yearNow', '2025'); expect('공시지가 글 물가', await get('out-cpi'), '1.53배'); expect('공시지가 글 물가 뺀 배수', await get('out-real'), '2.61배');
  await fresh('land-multiple.html'); await page.selectOption('#yearThen', '2006'); await page.selectOption('#region', '전국');
  expect('공시지가 글 전국 지가 2006→2026', await get('out-big'), '1.57'); expect('공시지가 글 전국 연평균', await get('out-cagr'), '2.32');
  await type('regionPrice', '1200000'); expect('공시지가 글 120만 → 2006 추정', await get('out-rp-then-m2'), '76만 3,400원');
  // guide-inheritance-threshold.html — 자녀 2명, 장례비 기본 500만
  await fresh('inheritance-tax.html');
  for (const [est, spouse, kids, fin, want] of [['500000000', false, '2', '', '0'], ['505000000', false, '2', '', '0'], ['510000000', false, '2', '', '485,000'], ['1500000000', false, '2', '', '231,345,000'],
      ['2000000000', false, '2', '', '424,860,000'], ['3000000000', false, '2', '', '812,860,000'], ['1500000000', true, '2', '', '59,031,429'], ['3000000000', true, '2', '', '314,834,286'],
      ['1000000000', false, '3', '', '86,330,000'], ['1370000000', false, '2', '', '193,515,000'], ['1370000000', true, '2', '', '44,620,000'], ['1500000000', false, '2', '300000000', '213,885,000']]) {
    await setChk('spouse', spouse); await type('kids', kids); await page.fill('#fin', ''); await page.fill('#prior', ''); await page.fill('#priorTax', ''); if (fin) await type('fin', fin);
    await type('estate', est); expect(`상속 기준 글 ${est} ${spouse ? '배우자+' : ''}자녀${kids}${fin ? ' 금융' + fin : ''}`, await get('out-tax'), want);
  }
  await setChk('spouse', true); await type('kids', '2'); await page.fill('#fin', ''); await type('estate', '1500000000'); expect('상속 기준 글 15억 배우자공제', await get('out-spouse'), '640,714,285');
  // guide-deposit-100m.html — 정기예금 단리, 15.4%
  await fresh('savings.html');
  for (const [amt, m, r, method, id, want] of [['100000000', '12', '2.5', 'simple', 'out-net', '2,115,000'], ['100000000', '12', '3', 'simple', 'out-tax', '462,000'], ['100000000', '12', '3.5', 'simple', 'out-net', '2,961,000'],
      ['100000000', '12', '4', 'simple', 'out-net', '3,384,000'], ['100000000', '6', '3', 'simple', 'out-net', '1,269,000'], ['100000000', '24', '3', 'simple', 'out-net', '5,076,000'],
      ['100000000', '12', '3', 'compound', 'out-interest', '3,041,595'], ['50000000', '12', '3', 'simple', 'out-net', '1,269,000'], ['300000000', '12', '3', 'simple', 'out-net', '7,614,000'],
      ['667000000', '12', '3', 'simple', 'out-interest', '20,010,000']]) {
    await radio('kind', 'deposit'); await radio('method', method); await type('months', m); await type('rate', r); await type('amount', amt); expect(`예금 글 ${amt} ${m}개월 ${r}% ${method}`, await get(id), want);
  }
  // ------------------------------------------------------------ 땅값·아파트값 글 4편 (2026-11) 본문 숫자
  const pick = async (r, y, z) => { await page.selectOption('#region', r); await page.selectOption('#yearThen', String(y)); await page.selectOption('#yearNow', String(z)); };
  // guide-seoul-apartment-gu.html — 구별 2006·2012·2020·2021년부터 배수와 평균가(자동으로 넣는 값)
  await fresh('apartment-multiple.html');
  for (const [r, a06, a12, a20, a21, avg] of [['서울 전체', '1.68', '1.57', '1.21', '1.12', '1,370,000,000'], ['서울 종로구', '1.65', '1.36', '1.12', '1.07', '1,130,000,000'],
      ['서울 중구', '1.51', '1.44', '1.14', '1.08', '1,235,000,000'], ['서울 용산구', '1.61', '1.51', '1.29', '1.19', '2,191,000,000'], ['서울 성동구', '1.91', '1.88', '1.41', '1.35', '1,870,000,000'],
      ['서울 광진구', '1.54', '1.56', '1.24', '1.19', '1,494,000,000'], ['서울 동대문구', '1.81', '1.44', '1.13', '1.07', '989,000,000'], ['서울 중랑구', '1.7', '1.26', '1.08', '1.02', '692,000,000'],
      ['서울 성북구', '1.71', '1.41', '1.14', '1.07', '945,000,000'], ['서울 강북구', '1.8', '1.26', '1.01', '0.96', '669,000,000'], ['서울 도봉구', '1.52', '1.19', '0.99', '0.91', '631,000,000'],
      ['서울 노원구', '1.86', '1.39', '1.08', '0.97', '710,000,000'], ['서울 은평구', '1.46', '1.32', '1.07', '1', '843,000,000'], ['서울 서대문구', '1.74', '1.42', '1.12', '1.07', '1,036,000,000'],
      ['서울 마포구', '1.87', '1.75', '1.31', '1.2', '1,481,000,000'], ['서울 양천구', '1.49', '1.67', '1.25', '1.18', '1,514,000,000'], ['서울 강서구', '1.56', '1.54', '1.14', '1.06', '960,000,000'],
      ['서울 구로구', '1.69', '1.47', '1.13', '1.06', '752,000,000'], ['서울 금천구', '1.56', '1.26', '1.01', '0.96', '649,000,000'], ['서울 영등포구', '1.76', '1.67', '1.26', '1.18', '1,423,000,000'],
      ['서울 동작구', '1.67', '1.72', '1.25', '1.15', '1,322,000,000'], ['서울 관악구', '1.58', '1.46', '1.12', '1.05', '822,000,000'], ['서울 서초구', '1.68', '1.78', '1.39', '1.25', '2,782,000,000'],
      ['서울 강남구', '1.59', '1.86', '1.31', '1.18', '2,782,000,000'], ['서울 송파구', '1.74', '2.07', '1.47', '1.32', '2,357,000,000'], ['서울 강동구', '1.58', '1.77', '1.26', '1.16', '1,234,000,000']]) {
    for (const [y, want] of [[2006, a06], [2012, a12], [2020, a20], [2021, a21]]) { await pick(r, y, 2026); expect(`서울 구 글 ${r} ${y}→2026`, await get('out-big'), want); }
    expect(`서울 구 글 ${r} 평균가`, await page.inputValue('#regionPrice'), avg);
  }
  await pick('서울 전체', 2006, 2026); expect('서울 구 글 서울 연평균', await get('out-cagr'), '2.68');
  await pick('서울 노원구', 2006, 2012); expect('서울 구 글 노원 2006→2012', await get('out-big'), '1.34'); await pick('서울 강남구', 2006, 2012); expect('서울 구 글 강남 2006→2012', await get('out-big'), '0.86');
  await page.selectOption('#yearNow', '2026'); expect('서울 구 글 강남 평당', await get('out-avg-py'), '9,790만원 (2026년 9월)'); await page.selectOption('#region', '서울 도봉구'); expect('서울 구 글 도봉 평당', await get('out-avg-py'), '2,920만원 (2026년 9월)');
  // guide-apartment-vs-land.html (아파트 쪽) — 구·시 2006년부터, 2012년부터 뒤집히는 곳
  for (const [r, want] of [['서울 강남구', '1.59'], ['서울 서초구', '1.68'], ['서울 송파구', '1.74'], ['서울 용산구', '1.61'], ['서울 마포구', '1.87'], ['서울 성동구', '1.91'], ['서울 노원구', '1.86'], ['서울 강서구', '1.56'],
      ['부산 해운대구', '2.07'], ['대구 수성구', '1.57'], ['경기 성남시 분당구', '1.59'], ['경기 과천시', '1.37'], ['경기 화성시', '1.43'], ['경기 김포시', '1.03'], ['인천 연수구', '1.63'], ['대전 유성구', '1.53']]) {
    await pick(r, 2006, 2026); expect(`아파트vs땅 글 아파트 ${r}`, await get('out-big'), want);
  }
  for (const [r, want] of [['경기 성남시 분당구', '2.05'], ['서울 송파구', '2.07'], ['경기 과천시', '1.85'], ['부산 전체', '1.07']]) { await pick(r, 2012, 2026); expect(`아파트vs땅 글 아파트 ${r} 2012`, await get('out-big'), want); }
  // guide-real-price-multiple.html (아파트 쪽) — 2006→2025 배수와 물가 뺀 배수, 2012→2025
  for (const [r, m, real] of [['전국', '1.43', '0.93'], ['서울 전체', '1.56', '1.01'], ['부산 전체', '1.65', '1.08'], ['대구 전체', '1.29', '0.84'], ['인천 전체', '1.57', '1.02'], ['광주 전체', '1.53', '1배'],
      ['대전 전체', '1.64', '1.07'], ['울산 전체', '1.42', '0.93'], ['경기 전체', '1.36', '0.89'], ['강원 전체', '1.34', '0.87'], ['충북 전체', '1.41', '0.92'], ['충남 전체', '1.29', '0.84'],
      ['전북 전체', '1.53', '1배'], ['전남 전체', '1.48', '0.97'], ['경북 전체', '1.21', '0.79'], ['경남 전체', '1.34', '0.87'], ['제주 전체', '1.82', '1.19']]) {
    await pick(r, 2006, 2025); expect(`물가 글 아파트 ${r} 배수`, await get('out-big'), m); expect(`물가 글 아파트 ${r} 물가 뺀`, await get('out-real'), real.endsWith('배') ? real : real + '배');
  }
  expect('물가 글 2006→2025 물가', await get('out-cpi'), '1.53배');
  await pick('서울 전체', 2012, 2025); expect('물가 글 서울 아파트 2012', await get('out-big'), '1.45'); expect('물가 글 서울 아파트 2012 물가 뺀', await get('out-real'), '1.14배'); expect('물가 글 2012→2025 물가', await get('out-cpi'), '1.27배');
  await pick('경남 전체', 2012, 2025); expect('물가 글 경남 아파트 2012', await get('out-big'), '0.88'); expect('물가 글 경남 아파트 2012 물가 뺀', await get('out-real'), '0.69배');
  await fresh('apartment-multiple.html'); await page.click('.chip[data-preset="ex"]'); await page.selectOption('#yearNow', '2025'); expect('물가 글 3억→9억 2006→2025 물가 뺀', await get('out-real'), '1.96배');
  // guide-land-index-sido.html — 시·도 1987·1990·2006·2012·2020년부터(자료 없는 해는 건너뜀)
  await fresh('land-multiple.html');
  for (const [r, l87, l90, l06, l12, l20] of [['전국', '3.92', '1.93', '1.57', '1.46', '1.15'], ['서울 전체', '5.07', '2.26', '1.77', '1.64', '1.22'], ['부산 전체', '', '', '1.61', '1.5', '1.11'],
      ['대구 전체', '', '', '1.59', '1.48', '1.1'], ['인천 전체', '', '', '1.52', '1.37', '1.12'], ['광주 전체', '', '', '1.45', '1.4', '1.09'], ['대전 전체', '', '', '1.51', '1.43', '1.12'],
      ['울산 전체', '', '', '1.34', '1.26', '1.07'], ['세종 전체', '', '', '', '1.88', '1.17'], ['경기 전체', '4.97', '2.25', '1.58', '1.44', '1.16'], ['강원 전체', '2.81', '1.65', '1.43', '1.34', '1.09'],
      ['충북 전체', '2.6', '1.77', '1.35', '1.31', '1.1'], ['충남 전체', '3.07', '1.86', '1.32', '1.26', '1.09'], ['전북 전체', '2.7', '1.47', '1.35', '1.27', '1.06'], ['전남 전체', '3.07', '1.53', '1.44', '1.36', '1.08'],
      ['경북 전체', '2.43', '1.46', '1.37', '1.3', '1.07'], ['경남 전체', '2.44', '1.43', '1.31', '1.22', '1.05'], ['제주 전체', '', '', '1.39', '1.32', '1.01']]) {
    for (const [y, want] of [[1987, l87], [1990, l90], [2006, l06], [2012, l12], [2020, l20]]) { if (!want) continue; await pick(r, y, 2026); expect(`땅값 시·도 글 ${r} ${y}→2026`, await get('out-big'), want); }
  }
  await pick('전국', 1987, 1990); expect('땅값 시·도 글 전국 1987→1990', await get('out-big'), '2.03'); expect('땅값 시·도 글 1987→1990 연평균', await get('out-cagr'), '26.58');
  await pick('서울 전체', 1987, 1990); expect('땅값 시·도 글 서울 1987→1990', await get('out-big'), '2.24');
  // guide-apartment-vs-land.html·guide-land-index-sido.html (땅값 쪽) — 구·시 2006년부터, 2012년부터
  for (const [r, want] of [['서울 강남구', '2.03'], ['서울 서초구', '1.89'], ['서울 송파구', '1.83'], ['서울 용산구', '1.98'], ['서울 마포구', '1.86'], ['서울 성동구', '2'], ['서울 노원구', '1.54'], ['서울 강서구', '1.71'],
      ['부산 해운대구', '1.86'], ['대구 수성구', '1.76'], ['경기 성남시 분당구', '1.56'], ['경기 과천시', '1.67'], ['경기 화성시', '1.7'], ['경기 김포시', '1.51'], ['인천 연수구', '1.55'], ['대전 유성구', '1.66']]) {
    await pick(r, 2006, 2026); expect(`아파트vs땅 글 땅값 ${r}`, await get('out-big'), want);
  }
  for (const [r, want] of [['경기 성남시 분당구', '1.48'], ['서울 송파구', '1.69'], ['경기 과천시', '1.62'], ['부산 전체', '1.5']]) { await pick(r, 2012, 2026); expect(`아파트vs땅 글 땅값 ${r} 2012`, await get('out-big'), want); }
  // guide-real-price-multiple.html (땅값 쪽) — 2006→2025, 2012→2025 세종, 1990→2025
  for (const [r, real] of [['전국', '1.01'], ['서울 전체', '1.12'], ['부산 전체', '1.04'], ['대구 전체', '1.03'], ['인천 전체', '0.98'], ['광주 전체', '0.94'], ['대전 전체', '0.97'], ['울산 전체', '0.87'],
      ['경기 전체', '1.01'], ['강원 전체', '0.93'], ['충북 전체', '0.87'], ['충남 전체', '0.86'], ['전북 전체', '0.88'], ['전남 전체', '0.94'], ['경북 전체', '0.89'], ['경남 전체', '0.85'], ['제주 전체', '0.91']]) {
    await pick(r, 2006, 2025); expect(`물가 글 땅값 ${r} 물가 뺀`, await get('out-real'), real + '배');
  }
  await pick('전국', 2006, 2025); expect('물가 글 땅값 전국 2006→2025', await get('out-big'), '1.54');
  await pick('세종 전체', 2012, 2025); expect('물가 글 세종 땅값 2012', await get('out-big'), '1.86'); expect('물가 글 세종 땅값 2012 물가 뺀', await get('out-real'), '1.46배');
  for (const [r, real] of [['서울 전체', '0.72'], ['경기 전체', '0.73'], ['경남 전체', '0.47']]) { await pick(r, 1990, 2025); expect(`물가 글 땅값 ${r} 1990 물가 뺀`, await get('out-real'), real + '배'); }
  await fresh('land-multiple.html'); await radio('mode', 'direct'); await type('priceThen', '1000000'); await type('priceNow', '3000000'); await page.selectOption('#yearThen', '1990'); await page.selectOption('#yearNow', '2025');
  expect('물가 글 공시지가 100만→300만 1990→2025 물가 뺀', await get('out-real'), '0.99배');
  // guide-year-end-dependents.html — 기납부 비움, 공제 없음. 결정세액
  for (const [sal, fam, want] of [['30000000', '1', '371,860'], ['30000000', '2', '270,610'], ['40000000', '1', '1,430,480'], ['40000000', '2', '1,205,480'], ['50000000', '1', '2,658,716'], ['50000000', '2', '2,433,716'],
                                  ['60000000', '1', '3,937,952'], ['60000000', '2', '3,712,952'], ['80000000', '1', '7,294,790'], ['80000000', '2', '6,934,790']]) {
    await fresh('year-end-tax.html'); await type('family', fam); await type('salary', sal); expect(`부양가족 글 ${sal} ${fam}명`, await get('out-tax'), want);
  }
  for (const [fam, k, want] of [['3', '1', '3,237,952'], ['4', '2', '2,712,952']]) {
    await fresh('year-end-tax.html'); await type('family', fam); await type('kids', k); await type('kids8', k); await type('salary', '60000000'); expect(`부양가족 글 6천 자녀 ${k}명`, await get('out-tax'), want);
  }
  // guide-year-end-result.html — 총급여 5천, 신용 1,500만·체크 500만, 기납부세액만 바꿈
  for (const [w, want, add] of [['3000000', '684,780', false], ['2500000', '134,780', false], ['2000000', '415,200', true]]) {
    await fresh('year-end-tax.html'); await openGroups(); await type('credit', '15000000'); await type('debit', '5000000'); await type('withheld', w); await type('salary', '50000000');
    expect(`결과 글 기납부 ${w}`, await get('out-total'), want); expect(`결과 글 기납부 ${w} 결정세액`, await get('out-tax'), '2,377,466'); expect(`결과 글 기납부 ${w} 추가 납부 여부`, (await get('out-kicker')).includes('더 내는'), add);
  }
  await fresh('year-end-tax.html'); await type('withheld', '2000000'); await type('salary', '50000000'); expect('결과 글 카드 없이 추가 납부', await get('out-total'), '724,580');
  // guide-year-end-medical.html — 1인, 기납부 비움. 의료비 공제가 표준세액공제 13만원보다 작으면 결정세액 그대로
  const ye = async (sal, fields) => { await fresh('year-end-tax.html'); await openGroups(); for (const [k, v] of fields) await type(k, v); await type('salary', sal); };
  for (const [label, sal, fields, tax, total] of [
    ['본인 200만', '50000000', [['medSelf', '2000000']], '2,658,716', '0'], ['본인 200만+보험 100만', '50000000', [['medSelf', '2000000'], ['insurance', '1000000']], '2,593,716', '71,500'],
    ['부모 500만', '50000000', [['medOther', '5000000']], '2,263,716', '434,500'], ['부모 1,000만', '50000000', [['medOther', '10000000']], '1,738,716', '1,012,000'],
    ['본인 1,000만', '50000000', [['medSelf', '10000000']], '1,513,716', '1,259,500'],
    ['3천 부양 300만', '30000000', [['medOther', '3000000']], '186,860', '203,500'], ['4천 부양 300만', '40000000', [['medOther', '3000000']], '1,290,480', '154,000'],
    ['6천 부양 300만', '60000000', [['medOther', '3000000']], '3,887,952', '55,000']]) {
    await ye(sal, fields); expect(`의료비 글 ${label} 결정세액`, await get('out-tax'), tax); expect(`의료비 글 ${label} 환급`, await get('out-total'), total);
  }
  // guide-year-end-job-change.html — 6월 퇴사 총급여 2,500만원(회사 정산 = 기납부 비움), 이직 두 곳 합산 5,000만원
  for (const [label, sal, fields, tax, total] of [
    ['퇴사 2,500만', '25000000', [], '195,913', '0'], ['퇴사 신용 1,000만', '25000000', [['credit', '10000000']], '180,725', '16,690'],
    ['퇴사 체크 1,000만', '25000000', [['debit', '10000000']], '165,538', '33,400'], ['퇴사 신용+연금저축', '25000000', [['credit', '10000000'], ['saving', '3000000']], '0', '215,500'],
    ['이직 합산 5,000만', '50000000', [], '2,658,716', '0']]) {
    await ye(sal, fields); expect(`퇴사 글 ${label} 결정세액`, await get('out-tax'), tax); expect(`퇴사 글 ${label} 환급`, await get('out-total'), total);
  }
  // guide-parental-leave-pay.html
  await fresh('parental-leave.html');
  for (const [w, m, six, want] of [['800000', '12', false, '9,000,000'], ['1500000', '12', false, '16,200,000'], ['2000000', '12', false, '21,600,000'], ['2500000', '12', false, '23,100,000'], ['5000000', '12', false, '23,100,000'],
                                   ['3000000', '6', false, '13,500,000'], ['3000000', '6', true, '17,000,000'], ['2000000', '6', true, '12,000,000'], ['3000000', '18', false, '32,700,000'], ['3000000', '12', true, '26,600,000'], ['3000000', '18', true, '36,200,000']]) {
    await setChk('sixsix', six); await type('months', m); await type('wage', w); expect(`육아휴직 글 ${w} ${m}개월${six ? ' 6+6' : ''}`, await get('out-total'), want);
  }
  // guide-unemployment-floor.html — 퇴직일 비움(91일), 8시간
  await fresh('unemployment-benefit.html');
  for (const [w, age, yrs, hours, want] of [['2000000', 'under50', '1', '8', '9,907,200'], ['3400000', 'under50', '2', '8', '12,105,360'], ['3500000', 'under50', '2', '8', '12,258,000'],
                                            ['3000000', 'under50', '4', '8', '15,851,520'], ['3000000', 'over50', '4', '8', '17,832,960'], ['1500000', 'under50', '0', '4', '3,962,880']]) {
    await radio('age', age); await page.selectOption('#years', yrs); await type('hours', hours); await type('wage', w); expect(`실업급여 글 ${w} ${age} ${yrs} ${hours}h`, await get('out-total'), want);
  }

  // ------------------------------------------------------------ 안내 글 5편 (2026-11) 본문 숫자
  // guide-salary-table.html — 기본값(비과세 20만, 본인 1명). 요율이 바뀌면 표 전체를 다시 뽑을 것
  await fresh('salary.html');
  for (const [s, net, ded, ratio] of [['24000000', '1,813,480', '186,520', '90.67'], ['28000000', '2,106,973', '226,360', '90.30'], ['30000000', '2,253,610', '246,390', '90.14'], ['32000000', '2,394,777', '271,890', '89.80'],
      ['35000000', '2,603,297', '313,370', '89.26'], ['38000000', '2,796,057', '370,610', '88.30'], ['40000000', '2,924,343', '408,990', '87.73'], ['42000000', '3,052,660', '447,340', '87.22'],
      ['45000000', '3,245,110', '504,890', '86.54'], ['48000000', '3,438,630', '561,370', '85.97'], ['50000000', '3,565,667', '601,000', '85.58'], ['55000000', '3,883,213', '700,120', '84.72'],
      ['60000000', '4,200,750', '799,250', '84.02'], ['65000000', '4,518,297', '898,370', '83.41'], ['70000000', '4,835,853', '997,480', '82.90'], ['75000000', '5,133,240', '1,116,760', '82.13'],
      ['80000000', '5,415,607', '1,251,060', '81.23'], ['85000000', '5,708,223', '1,375,110', '80.59'], ['90000000', '6,005,160', '1,494,840', '80.07'], ['95000000', '6,302,087', '1,614,580', '79.61'],
      ['100000000', '6,599,013', '1,734,320', '79.19']]) {
    await type('salary', s); expect(`연봉 표 글 ${s} 실수령`, await get('out-net'), net); expect(`연봉 표 글 ${s} 공제`, await get('out-deduct'), ded); expect(`연봉 표 글 ${s} 비율`, await get('out-ratio'), ratio);
  }
  await type('salary', '40000000');
  for (const [id, want] of [['out-pension', '148,830'], ['out-health', '112,640'], ['out-ltc', '14,800'], ['out-employ', '28,200'], ['out-tax', '95,020'], ['out-local', '9,500']]) expect(`연봉 표 글 4천 ${id}`, await get(id), want);
  await type('salary', '24000000'); expect('연봉 표 글 2,400만 소득세', await get('out-tax'), '10,560');
  await type('salary', '85000000'); expect('연봉 표 글 8,500만 국민연금', await get('out-pension'), '313,020');
  await type('salary', '100000000'); expect('연봉 표 글 1억 국민연금', await get('out-pension'), '313,020'); expect('연봉 표 글 1억 소득세', await get('out-tax'), '924,810');
  for (const [fam, kids, s, want] of [['2', '0', '40000000', '2,944,973'], ['2', '0', '60000000', '4,221,370'], ['4', '2', '40000000', '3,028,863'], ['4', '2', '60000000', '4,313,040'], ['4', '2', '80000000', '5,565,027'], ['4', '2', '100000000', '6,748,443']]) {
    await fresh('salary.html'); await type('family', fam); await type('children', kids); await type('salary', s); expect(`연봉 표 글 ${s} 가족${fam} 자녀${kids}`, await get('out-net'), want);
  }
  await fresh('salary.html'); await type('family', '4'); await type('children', '2'); await type('salary', '40000000'); expect('연봉 표 글 4천 4인 소득세 0', await get('out-tax'), '0');
  // guide-subscription-deduction.html — 1인, 기납부 비움(청약 없을 때 세금). 줄어드는 세금 = out-total
  for (const [sal, fields, want] of [['30000000', [['subscription', '1200000']], '35,640'], ['30000000', [['subscription', '2400000']], '71,280'], ['30000000', [['subscription', '3000000']], '89,100'],
      ['30000000', [['subscription', '6000000']], '89,100'], ['40000000', [['subscription', '1200000']], '79,200'], ['40000000', [['subscription', '2400000']], '158,400'],
      ['40000000', [['subscription', '3000000']], '198,000'], ['70000000', [['subscription', '3000000']], '198,000'], ['70000000', [['subscription', '6000000']], '198,000'], ['70100000', [['subscription', '3000000']], '0'],
      ['50000000', [['subscription', '3000000']], '198,000'], ['50000000', [['lease', '7000000']], '319,000'], ['50000000', [['subscription', '3000000'], ['lease', '5000000']], '385,000'],
      ['50000000', [['subscription', '3000000'], ['lease', '7000000']], '517,000'], ['50000000', [['lease', '10000000']], '517,000'], ['50000000', [['subscription', '3000000'], ['lease', '10000000']], '517,000']]) {
    await ye(sal, fields); expect(`청약 공제 글 ${sal} ${fields.map(f => f.join(' ')).join(' + ')}`, await get('out-total'), want);
  }
  await ye('30000000', [['subscription', '3000000']]); expect('청약 공제 글 3천 결정세액', await get('out-tax'), '290,860'); expect('청약 공제 글 3천 기납부(청약 없을 때)', await get('out-withheld'), '371,860');
  // guide-first-home-acquisition.html — 1주택, 생애최초 켜고 끔(취득세 + 지방교육세, 85㎡ 초과는 농특세 포함)
  await fresh('acquisition-tax.html');
  for (const [p, before, after] of [['100000000', '1,100,000', '100,000'], ['150000000', '1,650,000', '150,000'], ['200000000', '2,200,000', '200,000'], ['300000000', '3,300,000', '1,300,000'],
      ['400000000', '4,400,000', '2,400,000'], ['500000000', '5,500,000', '3,500,000'], ['600000000', '6,600,000', '4,600,000'], ['700000000', '12,859,000', '10,859,000'],
      ['800000000', '20,504,000', '18,504,000'], ['900000000', '29,700,000', '27,700,000'], ['1000000000', '33,000,000', '31,000,000'], ['1200000000', '39,600,000', '37,600,000'], ['1210000000', '39,930,000', '39,930,000']]) {
    await acq(`생애최초 글 ${p} 감면 전`, p, 'one', false, false, before); await acq(`생애최초 글 ${p} 감면 후`, p, 'one', false, true, after);
  }
  await acq('생애최초 글 3억 실효', '300000000', 'one', false, true, '1,300,000'); expect('생애최초 글 3억 실효세율', await get('out-effective'), '0.43');
  await acq('생애최초 글 9억 실효', '900000000', 'one', false, true, '27,700,000'); expect('생애최초 글 9억 실효세율', await get('out-effective'), '3.08');
  await acq('생애최초 글 5억 85초과', '500000000', 'one', true, true, '4,500,000'); await acq('생애최초 글 9억 85초과', '900000000', 'one', true, true, '29,500,000');

  // ------------------------------------------------------------ 안내 글 5편 (2026-11, 2차) 본문 숫자
  // guide-pension-tax-credit.html — 근로소득, ISA 없음(마지막 두 줄만 ISA 3,000만원)
  for (const [inc, sav, irp, isa, want] of [['50000000', '1200000', '0', '', '198,000'], ['50000000', '2400000', '0', '', '396,000'], ['50000000', '4800000', '0', '', '792,000'], ['50000000', '6000000', '0', '', '990,000'],
      ['50000000', '6000000', '3000000', '', '1,485,000'], ['50000000', '0', '9000000', '', '1,485,000'], ['50000000', '9000000', '0', '', '990,000'], ['55000000', '6000000', '3000000', '', '1,485,000'],
      ['55100000', '6000000', '3000000', '', '1,188,000'], ['80000000', '1200000', '0', '', '158,400'], ['80000000', '2400000', '0', '', '316,800'], ['80000000', '4800000', '0', '', '633,600'],
      ['80000000', '6000000', '0', '', '792,000'], ['80000000', '6000000', '3000000', '', '1,188,000'], ['50000000', '6000000', '3000000', '30000000', '1,980,000'], ['80000000', '6000000', '3000000', '30000000', '1,584,000']]) {
    await fresh('pension-tax-credit.html'); await page.selectOption('#kind', 'salary'); await type('income', inc); await type('saving', sav); await type('irp', irp); if (isa) await type('isa', isa);
    expect(`연금저축 글 ${inc} 저축${sav} IRP${irp}${isa ? ' ISA' + isa : ''}`, await get('out-total'), want);
  }
  for (const [sal, six, nine] of [['25000000', '215,500', '215,500'], ['30000000', '409,040', '409,040'], ['35000000', '908,440', '908,440'], ['40000000', '990,000', '1,485,000'],
      ['50000000', '990,000', '1,485,000'], ['60000000', '792,000', '1,188,000'], ['100000000', '792,000', '1,188,000']]) {
    await ye(sal, [['saving', '6000000']]); expect(`연금저축 글 연말정산 ${sal} 600만`, await get('out-total'), six);
    await ye(sal, [['saving', '6000000'], ['irp', '3000000']]); expect(`연금저축 글 연말정산 ${sal} 900만`, await get('out-total'), nine);
  }
  await ye('40000000', [['saving', '6000000'], ['irp', '3000000']]); expect('연금저축 글 4천 900만 남는 결정세액', await get('out-tax'), '80,480');
  // guide-property-tax-table.html — 도시지역, 1세대 1주택 켜고 끔
  await fresh('property-tax.html');
  for (const [pr, one, other] of [['100000000', '86,000', '156,000'], ['200000000', '187,600', '348,000'], ['300000000', '299,400', '576,000'], ['400000000', '452,800', '840,000'], ['500000000', '620,000', '1,104,000'],
      ['600000000', '787,200', '1,476,000'], ['700000000', '1,008,000', '1,848,000'], ['800000000', '1,260,000', '2,220,000'], ['900000000', '1,512,000', '2,592,000'], ['1000000000', '2,034,000', '2,964,000'],
      ['1200000000', '2,592,000', '3,708,000'], ['1500000000', '3,429,000', '4,824,000']]) {
    await setChk('urban', true); await setChk('oneHome', true); await type('price', pr); expect(`재산세 표 글 ${pr} 1주택`, await get('out-total'), one);
    await setChk('oneHome', false); await type('price', pr); expect(`재산세 표 글 ${pr} 그 밖`, await get('out-total'), other);
  }
  await setChk('oneHome', true); await type('price', '600000000');
  for (const [id, want] of [['out-base', '264,000,000'], ['out-tax', '348,000'], ['out-urban', '369,600'], ['out-edu', '69,600']]) expect(`재산세 표 글 6억 ${id}`, await get(id), want);
  await type('price', '400000000'); expect('재산세 표 글 4억 본세', await get('out-tax'), '172,000'); expect('재산세 표 글 4억 7월 한 번', await get('out-sept'), '0');
  await type('price', '500000000'); expect('재산세 표 글 5억 7월', await get('out-july'), '310,000'); expect('재산세 표 글 5억 9월', await get('out-sept'), '310,000');
  await setChk('urban', false); expect('재산세 표 글 5억 도시지역 아님', await get('out-total'), '312,000'); await setChk('urban', true);
  await setChk('oneHome', false); await type('price', '300000000'); expect('재산세 표 글 3억 그 밖 9월', await get('out-sept'), '288,000');
  // guide-loan-30-vs-40.html — 원리금균등·원금균등, DSR(LTV 넉넉, 상한 비움)
  for (const [method, pr, r, m, first, interest] of [['annuity', '300000000', '4', '360', '1,432,246', '215,608,519'], ['annuity', '300000000', '4', '480', '1,253,815', '301,831,396'],
      ['annuity', '500000000', '4', '360', '2,387,076', '359,347,532'], ['annuity', '500000000', '4', '480', '2,089,692', '503,052,327'], ['annuity', '300000000', '3.5', '360', '1,347,134', '184,968,263'],
      ['annuity', '300000000', '3.5', '480', '1,162,173', '257,842,983'], ['annuity', '300000000', '4.5', '360', '1,520,056', '247,220,135'], ['annuity', '300000000', '4.5', '480', '1,348,689', '347,370,486'],
      ['principal', '300000000', '4', '360', '1,833,333', '180,500,000'], ['principal', '300000000', '4', '480', '1,625,000', '240,500,000']]) {
    await fresh('loan.html'); await radio('method', method); await type('rate', r); await type('months', m); await type('principal', pr);
    expect(`30vs40 글 ${method} ${pr} ${r}% ${m}개월 월`, await get('out-first'), first); expect(`30vs40 글 ${method} ${pr} ${r}% ${m}개월 이자`, await get('out-interest'), interest);
  }
  for (const [inc, yrs, stress, want] of [['50000000', '30', '0', '349,102,067'], ['50000000', '40', '0', '398,782,785'], ['50000000', '30', '0.75', '319,500,657'], ['50000000', '40', '0.75', '357,839,733'],
      ['50000000', '30', '1.5', '293,536,272'], ['50000000', '40', '1.5', '323,141,276'], ['50000000', '30', '3', '250,512,613'], ['70000000', '30', '0', '488,742,894'], ['70000000', '40', '0', '558,295,899']]) {
    await fresh('dsr.html'); await type('rate', '4'); await type('years', yrs); await type('stress', stress); await type('ltv', '70'); await page.fill('#cap', ''); await type('value', '2000000000'); await type('income', inc);
    expect(`30vs40 글 DSR ${inc} ${yrs}년 가산${stress}`, await get('out-limit'), want);
  }
  // guide-annual-leave-days.html — 입사일·기준일
  const leave = async (join, base) => { await fresh('annual-leave.html'); await page.fill('#base', base); await page.dispatchEvent('#base', 'input'); await page.fill('#join', join); await page.dispatchEvent('#join', 'input'); };
  for (const [join, base, now, next] of [['2026-03-02', '2026-11-10', '8', '2026-12-02 · 1일'], ['2025-11-10', '2026-11-10', '15', '2027-11-10 · 15일'], ['2025-11-10', '2026-11-09', '11', '2026-11-10 · 15일'],
      ['2024-11-10', '2026-11-10', '15', '2027-11-10 · 16일'], ['2023-11-10', '2026-11-10', '16', null], ['2021-11-10', '2026-11-10', '17', null], ['2016-11-10', '2026-11-10', '19', null], ['2005-11-10', '2026-11-10', '25', null], ['2000-11-10', '2026-11-10', '25', null]]) {
    await leave(join, base); expect(`연차 글 ${join}→${base} 연차`, await get('out-now'), now); if (next) expect(`연차 글 ${join}→${base} 다음`, await get('out-next'), next);
  }
  expect('연차 글 근속 표', await page.$$eval('#table-body tr', r => r.map(x => x.textContent).join('/')), '1~2년15일/3~4년16일/5~6년17일/7~8년18일/9~10년19일/11~12년20일/13~14년21일/15~16년22일/17~18년23일/19~20년24일/21년 이상25일');
  await leave('2016-11-10', '2026-11-10'); await type('wage', '3000000'); await type('unused', '5'); expect('연차 글 1일 통상임금', await get('out-daily'), '114,832'); expect('연차 글 5일 수당', await get('out-pay'), '574,160');
  // guide-weekly-holiday-pay.html — 주휴 포함, 3.3% 끔
  const hw = async (w, d, n, big) => { await fresh('hourly-wage.html'); await setChk('holiday', true); await setChk('big', big); await setChk('biz', false); await type('daily', d); await type('days', n); await type('wage', w); };
  for (const [w, d, n, holiday, weekly] of [['10320', '7', '2', '0', '144,480'], ['10320', '3', '5', '30,960', '185,760'], ['10320', '4', '5', '41,280', '247,680'], ['10320', '5', '5', '51,600', null], ['10320', '6', '5', '61,920', null],
      ['10320', '7', '5', '72,240', null], ['10320', '8', '5', '82,560', '495,360'], ['10320', '9', '5', '82,560', '572,760'], ['10700', '3', '5', '32,100', null], ['10700', '4', '5', '42,800', null], ['10700', '5', '5', '53,500', null],
      ['10700', '6', '5', '64,200', null], ['10700', '7', '5', '74,900', null], ['10700', '8', '5', '85,600', '513,600'], ['10700', '9', '5', '85,600', null], ['12000', '8', '5', '96,000', null], ['12000', '4', '5', '48,000', null]]) {
    await hw(w, d, n, true); expect(`주휴 글 ${w} ${d}h×${n} 주휴`, await get('out-holiday'), holiday); if (weekly) expect(`주휴 글 ${w} ${d}h×${n} 주급`, await get('out-weekly'), weekly);
  }
  await hw('10320', '9', '5', false); expect('주휴 글 5인 미만 9h×5 주급', await get('out-weekly'), '546,960'); expect('주휴 글 5인 미만 주휴', await get('out-holiday'), '82,560');

  // ------------------------------------------------------------ 빈 입력 상태·즐겨찾기·금액 읽기 (2026-10)
  // 처음 열었을 때 음수 금액이나 '유리'·'가입 어려움' 같은 판정이 보이면 안 된다
  for (const t of TOOL_PAGES) {
    await fresh(t); const s = await get('sticky-monthly');
    if (/^[-−]/.test(s) || /유리|어려움/.test(s)) { fails++; console.log(`FAIL 빈 화면 ${t}: ${s}`); }
  }
  await fresh('salary.html'); expect('연봉 빈 화면 0원', await get('sticky-monthly'), '0원');
  await type('salary', '350000000'); expect('금액 읽기 도움말', await page.$eval('.money-hint', e => e.textContent), '3억 5,000만원');
  await page.click('.fav-btn'); expect('즐겨찾기 버튼', await page.getAttribute('.fav-btn', 'aria-pressed'), 'true');
  await page.goto(BASE + 'index.html'); expect('홈 즐겨찾기 타일', await page.$$eval('#fav-tiles .tile', t => t.map(x => x.getAttribute('href')).join(',')), 'salary.html');
  expect('홈 즐겨찾기 안내 숨김', await page.isHidden('#fav-empty'), true);
  await page.evaluate(() => localStorage.clear());

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
