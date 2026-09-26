// Dev helper: screenshot a page with Playwright.  node tools/shot.js <url> <out.png> [waitMs] [js-to-eval]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [url, out, wait = '800', evalJs] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' in {} ? undefined : undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.goto(url);
  if (evalJs) await page.evaluate(evalJs);
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  if (logs.length) console.log(logs.join('\n'));
  await browser.close();
})();
