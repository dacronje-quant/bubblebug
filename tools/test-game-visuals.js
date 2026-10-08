'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'test-output/release-audit/visuals');
fs.mkdirSync(out, { recursive: true });
const issues = [], errors = [], cases = [];
async function shot(page, name) {
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(out, name + '.png') });
  const result = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { id: el.id, x: r.x, y: r.y, w: r.width, h: r.height }; };
    const buttons = [...document.querySelectorAll('.tbtn, #pause-btn, #map-btn')].filter(el => el.checkVisibility()).map(rect);
    const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
    const overlaps = buttons.flatMap((a, i) => buttons.slice(i + 1).filter(b => overlap(a, b)).map(b => a.id + '/' + b.id));
    const clipped = buttons.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > innerWidth + 1 || b.y + b.h > innerHeight + 1).map(b => b.id);
    const v = BB.G.view;
    const coveredMenus = BB.Main.name === 'play' && BB.Play.wardrobe ? Array.from({ length: BB.Play.wardrobeTabs() }, (_, i) => ({ x: v.x + (BB.Play.wardrobeTabX(i) - 32) * v.w / 960, y: v.y + 56 * v.h / 540, w: 64 * v.w / 960, h: 64 * v.h / 540 })).flatMap((target, i) => buttons.filter(b => overlap(b, target)).map(b => b.id + '/wardrobe-tab-' + i)) : [];
    const maze = BB.Play.maze ? { x: 74, y: 57, w: 812, h: 420 } : BB.Play.cloud ? { x: 130, y: 56, w: 700, h: 420 } : BB.Play.mini ? { x: 180, y: 92, w: 600, h: 360 } : null;
    const map = maze && { x: v.x + maze.x * v.w / 960, y: v.y + maze.y * v.h / 540, w: maze.w * v.w / 960, h: maze.h * v.h / 540 };
    const coveredMaze = map && BB.Main.name === 'play' && !document.body.classList.contains('menu-open') ? buttons.filter(b => b.id.startsWith('t-') && overlap(b, map)).map(b => b.id) : [];
    return { overlaps, clipped, coveredMaze, coveredMenus, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
  });
  cases.push({ name, ...result });
  for (const key of ['overlaps', 'clipped', 'coveredMaze', 'coveredMenus']) if (result[key]?.length) issues.push(name + ': ' + key + ' ' + result[key].join(', '));
  if (result.overflow) issues.push(name + ': page overflow');
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER, headless: true });
  try {
    for (const [width, height] of [[320,568],[360,800],[390,844],[568,320],[640,360],[844,390],[1024,768],[1280,720]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.waitForFunction(() => BB.Title.t > 16);
      const prefix = `${width}x${height}-`;
      await shot(page, prefix + 'title');
      await page.evaluate(() => BB.Main.set('select'));
      await shot(page, prefix + 'select');
      // A fresh document boots the demo instead of only changing the current hash.
      await page.goto('about:blank');
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '#play=phoebe&room=hm&demo=rewards');
      await page.waitForFunction(() => window.BB?.Play?.pl && BB.Play.t > 60);
      await page.evaluate(() => { BB.Play.intro = null; BB.Play.iris = null; BB.Play.zoneCard = 0; });
      await shot(page, prefix + 'home');
      // All held pointers must be discarded on a pause or loss of focus.
      const pad = await page.locator('#t-left').boundingBox();
      await page.dispatchEvent('#t-left', 'pointerdown', { pointerId: 51, pointerType: 'touch', clientX: pad.x + pad.width / 2, clientY: pad.y + pad.height / 2 });
      await page.evaluate(() => { BB.Input.clearAll(); });
      const stuck = await page.evaluate(() => document.querySelector('.tbtn.down') !== null);
      if (stuck) issues.push(prefix + 'touch stays visually held after input reset');
      await page.dispatchEvent('#touch', 'pointerup', { pointerId: 51, pointerType: 'touch' });
      await page.evaluate(() => BB.Main.go('pause'));
      await shot(page, prefix + 'pause');
      await page.evaluate(() => BB.Pause.activate(2));
      await shot(page, prefix + 'map');
      await page.evaluate(() => { BB.Pause.leave(); BB.Main.go('play-resume'); BB.Play.openWardrobe(); });
      await shot(page, prefix + 'wardrobe');
      await page.evaluate(() => { BB.Play.closeWardrobe(); BB.Play.openMaze(); });
      assert.equal(await page.evaluate(() => !!BB.Play.maze), true, 'hedge maze opens');
      await shot(page, prefix + 'hedge-maze');
      await page.evaluate(() => { BB.Play.closeMaze(); BB.Play.save.mazeSolved = true; BB.Play.save.rainbowUnlocked = true; BB.RAINBOW_KIN.filter(id => id !== 'rbMama').forEach(id => { BB.Play.save.kin[id] = 1; }); BB.Play.openCloud(); });
      assert.equal(await page.evaluate(() => !!BB.Play.cloud), true, 'Cloud Maze opens');
      await shot(page, prefix + 'cloud-maze');
      await page.evaluate(() => BB.Play.closeCloud());
      for (const id of ['rbGrandpa','rbPapa','rbGranny','rbSplash','rbPumpkin','rbTwinkle']) {
        await page.evaluate(id => { const th = Object.values(BB.Play.ents).flatMap(e => e.things).find(th => th.type === 'kin' && th.kin === id); BB.Play.openMini(th || { kin: id }); }, id);
        assert.equal(await page.evaluate(() => !!BB.Play.mini), true, 'relative maze opens');
        await shot(page, prefix + id);
        await page.evaluate(() => BB.Play.closeMini(false));
      }
      await context.close();
      console.log('Inspected ' + prefix);
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ cases, issues, errors }, null, 2));
    console.log(issues.join('\n'));
    assert.deepEqual(errors, [], 'no runtime exceptions');
    assert.deepEqual(issues, [], 'no overlapping/clipped controls, covered mazes or stuck touches');
    console.log(`${cases.length} visual cases passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
