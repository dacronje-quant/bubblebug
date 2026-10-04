// Rainbow beams: Rainbow starts out casting rainbows from her paw, the other
// kittens can pick them at the mirror, each kitten keeps her own choice, and
// one beam cheers up a sad boss.  node tools/test-rainbow-beams.js [shot-dir]
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = (() => {
  try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); }
})();
const ROOT = path.join(__dirname, '..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const out = process.argv[2];

async function place(page, id, col, floor) {
  await page.evaluate(({ id, col, floor }) => {
    const P = BB.Play, r = BB.World.byId[id];
    if (P.room !== r) P.leaveRoom(P.room);
    P.room = r; P.prevRoom = null; P.enterZone(r.zone);
    P.wardrobe = null; P.pl.state = 'play'; P.intro = null; P.iris = null; P.traveling = null; P.linkLock = null;
    P.pl.body = BB.Physics.newBody((r.x + col) * 32 + 6, (r.y + floor) * 32 - 24);
    P.pl.body.grounded = true; P.pl.body.groundKind = 1;
    P.checkpoint = { x: P.pl.body.x, y: P.pl.body.y }; P.pendingCP = false;
    BB.Camera.snap(r, P.pl.body);
  }, { id, col, floor });
}
async function shot(page, name) { if (out) await page.screenshot({ path: path.join(out, name + '.png') }); }

(async () => {
  if (out) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.waitForFunction(() => BB.Title.t > 16);
    await page.evaluate(() => {
      BB.World.build();
      const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1; s.rainbowUnlocked = 1;
      Object.keys(s.abilities).forEach(k => { s.abilities[k] = 1; });
      BB.Main.set('play', { cat: 'rainbow' });
    });
    await page.waitForFunction(() => BB.Play.pl && BB.Play.pl.cat === 'rainbow');

    // Rainbow casts beams by default; Marshmallow and Phoebe keep their bubbles
    assert.deepEqual(await page.evaluate(() => [
      BB.Cosmetics.bubbleFor(BB.Play.save, 'rainbow'), BB.Cosmetics.bubbleFor(BB.Play.save, 'marshmallow'), BB.Cosmetics.bubbleFor(BB.Play.save, 'phoebe'),
    ]), ['beam', 'classic', 'classic']);

    // find the Mushroom Ring boss and stand a little way off, facing it
    const boss = await page.evaluate(() => {
      const r = BB.World.byId.m7, b = BB.Play.ents.m7.bosses[0];
      return { col: Math.floor(b.homeX / 32) - r.x, floor: Math.round(b.floorY / 32) - r.y, state: b.state };
    });
    assert.equal(boss.state, 'wait');
    // in the clear gap between the boss and the first mushroom stump
    const floor = boss.floor, side = boss.col < 15 ? 1 : -1, standCol = boss.col + side * 3;
    await place(page, 'm7', standCol, floor);
    await page.evaluate(f => { BB.Play.pl.body.facing = f; }, -side);

    await page.waitForTimeout(300);
    await page.evaluate(() => { const blow = BB.Bubbles.blow; BB.Bubbles.blow = (...a) => { window.lastBlow = a[5]; window.blows = (window.blows || 0) + 1; return blow(...a); }; });
    // a beam at an awake boss cheers it right up (its intro still plays first)
    await page.keyboard.press('KeyX');
    await page.waitForTimeout(40);
    const mid = await page.evaluate(() => ({ style: window.lastBlow, cast: BB.Play.pl.cast }));
    assert.equal(mid.style, 'beam'); assert.ok(mid.cast > 0, 'the paw is forward');
    await shot(page, 'beam-cast');
    await page.waitForFunction(() => BB.Play.ents.m7.bosses[0].state !== 'wait', null, { timeout: 5000 });
    let fired = 1;
    for (let i = 0; i < 40 && !(await page.evaluate(() => !!BB.Play.save.bosses.m7)); i++) {
      await page.evaluate(f => { BB.Play.pl.invuln = 120; BB.Play.pl.body.facing = f; }, -side);
      await page.keyboard.press('KeyX'); fired++;
      if (fired === 3) { await page.waitForTimeout(150); await shot(page, 'beam-flight'); }
      await page.waitForTimeout(250);
    }
    const blows = await page.evaluate(() => window.blows);
    const won = await page.evaluate(() => ({ saved: !!BB.Play.save.bosses.m7, state: BB.Play.ents.m7.bosses[0].state, clouds: BB.Play.ents.m7.bosses[0].clouds }));
    assert.deepEqual(won, { saved: true, state: 'happy', clouds: 0 });
    // (walking up wakes the boss by itself, so the very first beam can already do it)
    assert.ok(blows >= 1 && blows <= 2, 'one beam cheers it up once it is awake (' + blows + ')');
    await page.waitForTimeout(150); await shot(page, 'boss-happy');
    console.log(`✓ Rainbow's beams stream from her paw; one beam made the boss happy (${blows} fired)`);

    // the mirror: a Rainbow beams choice, saved per kitten
    const mirror = await page.evaluate(() => BB.Home.MIRROR_COL);
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe && BB.Play.wardrobe.t > 8);
    await page.evaluate(() => { const P = BB.Play; P.wardrobe.tab = 3; P.wardrobe.sel = P.wardrobeItems().findIndex(i => i.id === 'bubble-beam'); P.wardrobe.focus = 'items'; });
    await page.waitForTimeout(200); await shot(page, 'mirror-beams');
    const picks = await page.evaluate(() => {
      const P = BB.Play, items = P.wardrobeItems(), classic = items.findIndex(i => i.id === 'bubble-classic');
      P.toggleOutfit(classic);
      const asRainbow = [P.save.cosmetics.rainbowBubble, P.save.cosmetics.bubble];
      P.pl.cat = 'marshmallow';
      P.toggleOutfit(items.findIndex(i => i.id === 'bubble-beam'));
      return { asRainbow, asMarsh: [P.save.cosmetics.rainbowBubble, P.save.cosmetics.bubble], forMarsh: BB.Cosmetics.bubbleFor(P.save, 'marshmallow') };
    });
    assert.deepEqual(picks, { asRainbow: ['classic', 'classic'], asMarsh: ['classic', 'beam'], forMarsh: 'beam' });
    await page.evaluate(() => { BB.Play.closeWardrobe(); window.lastBlow = null; });

    // Marshmallow with beams: also from the paw
    await place(page, 'm7', standCol, floor);
    await page.waitForTimeout(300);
    await page.evaluate(f => { BB.Play.pl.body.facing = f; }, -side);
    await page.keyboard.press('KeyX'); await page.waitForTimeout(110);
    assert.deepEqual(await page.evaluate(() => [BB.Play.pl.cast > 0, window.lastBlow]), [true, 'beam']);
    await shot(page, 'marshmallow-beam');
    // and the choice survives a reload of the save
    const reloaded = await page.evaluate(() => { BB.Save.write(); BB.Save.load(); return [BB.Save.data.cosmetics.bubble, BB.Save.data.cosmetics.rainbowBubble]; });
    assert.deepEqual(reloaded, ['beam', 'classic']);
    console.log('✓ the mirror offers Rainbow beams; each kitten keeps her own choice, through a reload; Marshmallow casts from her paw too');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
