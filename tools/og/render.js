// 공유 카드 그리기: node tools/og/render.js <일감.json>  (tools/og/make_cards.py가 부른다)
// 일감.json = { "template": card.html 경로, "font": woff2 경로, "jobs": [{ "out": png 경로, "card": {...} }] }
const fs = require('fs'); const { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright가 필요합니다(tools/verify.js와 같음)'); process.exit(2); }
(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const tpl = fs.readFileSync(job.template, 'utf8').replace('FONT_URL', pathToFileURL(job.font).href);
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  let bad = 0;
  for (const j of job.jobs) {
    const html = tpl.replace('<script>', '<script>window.CARD = ' + JSON.stringify(j.card).replace(/</g, '\\u003c') + ';\n');
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForSelector('body[data-ready]', { timeout: 15000 });
    const st = await p.getAttribute('body', 'data-ready'); if (st !== 'ok') { bad++; console.log('넘침', j.out); }
    await p.screenshot({ path: j.out, type: 'jpeg', quality: 88 });   // 색이 적은 그림이라 JPEG 88이면 장당 50KB 안팎, 글자도 깨끗하다
  }
  await b.close(); console.log('그림', job.jobs.length, '장' + (bad ? ', 넘침 ' + bad : ''));
  process.exit(bad ? 1 : 0);
})();
