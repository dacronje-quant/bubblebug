// Dev helper: drive the real game with simulated keys and grab screenshots.
//   node tools/playtest.js <outDir> [scenario]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [out = '.', scenario = 'intro'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const kb = page.keyboard;
  const hold = async (key, ms) => { await kb.down(key); await page.waitForTimeout(ms); await kb.up(key); };
  const shot = async name => page.screenshot({ path: `${out}/${scenario}_${name}.png` });
  const state = () => page.evaluate(() => ({ scene: BB.Main.name, room: BB.Play.room && BB.Play.room.id, x: BB.Play.pl && Math.round(BB.Play.pl.body.x), y: BB.Play.pl && Math.round(BB.Play.pl.body.y), stars: BB.Play.save && Object.keys(BB.Play.save.sparkles).length, friends: BB.Play.save && Object.keys(BB.Play.save.friends).length, st: BB.Play.pl && BB.Play.pl.state }));

  if (scenario === 'intro') {
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(600);
    await kb.press('Space'); await page.waitForTimeout(900);
    await shot('select');
    await kb.press('ArrowRight'); await page.waitForTimeout(300);
    await kb.press('Space'); await page.waitForTimeout(2000);
    await shot('start');
    console.log(await state());
    // run right hopping, collecting
    for (let i = 0; i < 6; i++) { await kb.down('ArrowRight'); await page.waitForTimeout(250); await hold('Space', 300); await page.waitForTimeout(200); await kb.up('ArrowRight'); }
    await shot('run');
    console.log(await state());
    await hold('ArrowRight', 1500);
    await page.waitForTimeout(800);
    console.log(await state());
    // blow bubbles at the ladybug
    for (let i = 0; i < 8; i++) { await kb.press('KeyX'); await page.waitForTimeout(260); }
    await shot('bubbles');
    await page.waitForTimeout(1200);
    await shot('friend');
    console.log(await state());
    await kb.press('Escape'); await page.waitForTimeout(500);
    await shot('pause');
    await kb.press('ArrowRight'); await kb.press('ArrowRight'); await kb.press('Space'); await page.waitForTimeout(500);
    await shot('map');
    await kb.press('Space'); await page.waitForTimeout(300); await kb.press('Escape'); await page.waitForTimeout(300);
    console.log(await state());
  } else {
    // scenario = room id: start there with all powers and wiggle about
    await page.goto('file://' + process.cwd() + '/index.html#play=pip&room=' + scenario + '&ab=all');
    await page.waitForTimeout(800);
    await shot('a');
    await hold('ArrowRight', 1200); await hold('Space', 400); await kb.press('KeyX');
    await page.waitForTimeout(600);
    await shot('b');
    console.log(await state());
  }
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
