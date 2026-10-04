#!/usr/bin/env node
// Optional real-browser checks. Requires Playwright and its Chromium,
// or BUBBLEPAWS_BROWSER pointing to a compatible browser executable.
// node tools/test-browser.js [screenshot-directory]
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = (() => {
  try { return require('playwright'); }
  catch (e) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
    return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  }
})();
const ROOT = path.resolve(__dirname, '..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const out = process.argv[2] && path.resolve(process.argv[2]);
const pause = page => page.waitForTimeout(120);
async function tap(page, x, y, touch = false) {
  const p = await page.evaluate(({ x, y }) => ({
    x: BB.G.view.x + x / BB.G.W * BB.G.view.w,
    y: BB.G.view.y + y / BB.G.H * BB.G.view.h,
  }), { x, y });
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await pause(page);
}
async function hover(page, x, y) {
  const p = await page.evaluate(({ x, y }) => ({ x: BB.G.view.x + x / BB.G.W * BB.G.view.w, y: BB.G.view.y + y / BB.G.H * BB.G.view.h }), { x, y });
  await page.mouse.move(p.x, p.y); await pause(page);
}
async function category(page, i, touch = false) {
  await tap(page, await page.evaluate(i => BB.Play.wardrobeTabX(i), i), 88, touch);
  assert.equal(await page.evaluate(() => BB.Play.wardrobe.tab), i);
}
async function wardrobeItem(page, id, touch = false) {
  const index = await page.evaluate(id => BB.Play.wardrobeItems().findIndex(item => item.id === id), id);
  assert.ok(index >= 0, id + ' is available in its category');
  await tap(page, 505 + index % 4 * 88, 178 + Math.floor(index / 4) * 96, touch);
}
async function barColor(page, x) {
  return page.evaluate(x => Array.from(BB.G.ctx.getImageData(Math.round(x * BB.G.scale), Math.round(418 * BB.G.scale), 1, 1).data).slice(0, 3), x);
}
async function place(page, id, col, floor) {
  await page.evaluate(({ id, col, floor }) => {
    const P = BB.Play, r = BB.World.byId[id];
    if (P.room !== r) P.leaveRoom(P.room);
    P.room = r; P.prevRoom = null; P.enterZone(r.zone);
    P.wardrobe = null; P.gardenChoice = null; P.gardenHold = 0; P.portalChoice = null;
    P.maze = null; P.journeyLock = null; P.journeyHold = 0;
    document.body.classList.remove('in-maze');
    P.pl.state = 'play'; P.intro = null; P.iris = null; P.traveling = null; P.linkLock = null;
    P.pl.body = BB.Physics.newBody((r.x + col) * 32 + 6, (r.y + floor) * 32 - 24);
    P.pl.body.grounded = true; P.pl.body.groundKind = 1;
    P.checkpoint = { x: P.pl.body.x, y: P.pl.body.y }; P.pendingCP = false;
    P.invuln = 60; BB.Camera.snap(r, P.pl.body);
  }, { id, col, floor });
}
async function shot(page, name) {
  if (out) await page.screenshot({ path: path.join(out, name + '.png') });
}

async function walkMaze(page, target) {
  const route = await page.evaluate(target => {
    const P = BB.Play, M = BB.GardenMaze, queue = [{ x: P.maze.x, y: P.maze.y, steps: [] }], seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i], key = n.x + ',' + n.y;
      if (seen.has(key)) continue; seen.add(key);
      if (n.x === target.x && n.y === target.y) return n.steps;
      for (const [code, dx, dy] of [['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1],['ArrowDown',0,1]]) {
        const x = n.x + dx, y = n.y + dy;
        if (M.walkable(x, y, P.save)) queue.push({ x, y, steps: [...n.steps, { code, x, y }] });
      }
    }
  }, target);
  assert.ok(route, 'a route exists through the currently open arches');
  for (const step of route) {
    // A real key event buffers exactly one cell turn, even between frames.
    await page.keyboard.press(step.code);
    await page.waitForFunction(({ x, y }) => BB.Play.maze?.x === x && BB.Play.maze?.y === y && !BB.Play.maze?.moving, step);
  }
}

(async () => {
  if (out) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const errors = [];
  const watch = page => page.on('pageerror', e => errors.push(e.message));
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    const page = await context.newPage(); watch(page);
    await page.goto(URL); await page.waitForFunction(() => BB.Title.t > 16);
    await hover(page, 600, 330); assert.equal(await page.evaluate(() => BB.Title.focus), 1);
    await shot(page, 'new-game-paw');
    await page.keyboard.press('ArrowLeft'); await pause(page); assert.equal(await page.evaluate(() => BB.Title.focus), 0);
    await page.waitForTimeout(300); assert.equal(await page.evaluate(() => BB.Title.focus), 0);
    await hover(page, 868, 466); assert.equal(await page.evaluate(() => BB.Title.modeFocus), 2);
    assert.equal(await page.evaluate(() => BB.Settings.difficulty), 'easy');
    await shot(page, 'difficulty-paw');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight'); await pause(page);
    await page.keyboard.press('ArrowDown'); await pause(page);
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Settings.difficulty), 'medium');
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Settings.difficulty), 'hard');
    for (const [i, mode] of [[0, 'easy'], [1, 'medium'], [2, 'hard'], [1, 'medium']]) {
      const p = await page.evaluate(i => BB.Title.mbtn(i), i);
      await tap(page, p.x, p.y);
      assert.equal(await page.evaluate(() => BB.Settings.difficulty), mode);
    }
    await shot(page, 'title-medium');
    await tap(page, 600, 330); await page.waitForFunction(() => BB.Main.name === 'select');
    await hover(page, 670, 350); assert.equal(await page.evaluate(() => BB.Select.sel), 1);
    assert.equal(await page.evaluate(() => BB.Select.chosen), null); await shot(page, 'kitten-paw');
    await page.keyboard.press('ArrowLeft'); await pause(page); assert.equal(await page.evaluate(() => BB.Select.sel), 0);
    await page.waitForTimeout(300); assert.equal(await page.evaluate(() => BB.Select.sel), 0);
    await page.evaluate(() => {
      BB.World.build();
      const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1;
      for (const th of BB.World.findThings('*').slice(0, 50)) s.sparkles[th.tx + ',' + th.ty] = 1;
      BB.Main.set('play', {});
    });
    const mirror = await page.evaluate(() => BB.Home.MIRROR_COL);
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await wardrobeItem(page, 'wizard'); await shot(page, 'star-reward-half');
    assert.deepEqual(await barColor(page, 622), [255, 214, 101]);
    assert.deepEqual(await barColor(page, 628), [232, 222, 234]);
    await page.evaluate(() => {
      BB.World.build(); const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1;
      for (const t of BB.World.findThings('*').slice(0, 250)) s.sparkles[t.tx + ',' + t.ty] = 1;
      BB.Main.set('play', {}); BB.Save.write();
    });
    await place(page, 'hm', mirror - 0.5, 32);
    await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await page.keyboard.down('KeyX'); await page.waitForTimeout(350); await page.keyboard.up('KeyX');
    assert.equal(await page.evaluate(() => BB.Play.save.starsSpent), 0);
    const previousHead = await page.evaluate(() => BB.Play.save.wear.head);
    await page.keyboard.press('ArrowUp'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.focus), 'tabs');
    assert.equal(await page.evaluate(() => BB.Play.save.wear.head), previousHead);
    await page.keyboard.press('ArrowRight'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.tab), 1);
    await page.keyboard.press('ArrowDown'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.focus), 'items');
    await category(page, 4); await tap(page, 593, 178); await tap(page, 593, 178);
    assert.equal(await page.evaluate(() => BB.Play.save.starsSpent), 0);
    assert.equal(await page.evaluate(() => BB.Play.save.cosmetics.trail), 'rainbow');
    await shot(page, 'mirror-trails');
    await category(page, 3);
    await tap(page, 769, 178); await tap(page, 769, 178);
    assert.equal(await page.evaluate(() => BB.Play.save.cosmetics.bubble), 'flower');
    await shot(page, 'mirror-styles');
    await category(page, 2); assert.equal(await page.evaluate(() => BB.Play.wardrobeItems().length), 8);
    await wardrobeItem(page, 'heartshades'); await shot(page, 'locked-heart-glasses-partial');
    assert.deepEqual(await barColor(page, 525), [255, 214, 101]);
    assert.deepEqual(await barColor(page, 725), [232, 222, 234]);
    await wardrobeItem(page, 'googly'); await shot(page, 'locked-hidden-glasses-empty');
    assert.deepEqual(await barColor(page, 525), [232, 222, 234]);
    assert.deepEqual(await barColor(page, 725), [232, 222, 234]);
    await category(page, 1); assert.equal(await page.evaluate(() => BB.Play.wardrobeItems().length), 8);
    await category(page, 4); assert.equal(await page.evaluate(() => BB.Play.wardrobeItems().length), 4);
    await tap(page, 776, 438);
    await page.waitForFunction(() => !BB.Play.wardrobe);
    await place(page, 'hm', 57, 32); await page.keyboard.down('ArrowRight');
    const walk = await page.evaluate(() => {
      const seen = new Set(); let safe = true;
      for (let i = 0; i < 1100 && BB.Play.room.id !== 'g1'; i++) {
        BB.Input.poll(); BB.Main.update(); seen.add(BB.Play.room.id);
        if (BB.Play.traveling || BB.Camera.sliding || BB.Play.pl.state !== 'play') safe = false;
      }
      return { seen: [...seen], room: BB.Play.room.id, safe };
    });
    await page.keyboard.up('ArrowRight');
    assert.equal(walk.room, 'g1'); assert.equal(walk.safe, true);
    for (const id of ['ng', 'np', 'nr', 'g1']) assert.ok(walk.seen.includes(id));
    await shot(page, 'garden-entry');
    const saved = await page.evaluate(() => ({
      mode: BB.Settings.difficulty, spent: BB.Play.save.starsSpent,
      trail: BB.Play.save.cosmetics.trail, bubble: BB.Play.save.cosmetics.bubble,
      stars: Object.keys(BB.Play.save.sparkles).sort(),
    }));
    assert.equal(saved.spent, 0); assert.ok(saved.stars.length >= 250);
    await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('Space'); await page.waitForFunction(() => BB.Main.name === 'play');
    assert.deepEqual(await page.evaluate(() => ({
      mode: BB.Settings.difficulty, spent: BB.Play.save.starsSpent,
      trail: BB.Play.save.cosmetics.trail, bubble: BB.Play.save.cosmetics.bubble,
      stars: Object.keys(BB.Play.save.sparkles).sort(),
    })), saved);
    // Completed save fixture: changing the playable kitten through the
    // real keyboard category navigation must also survive Continue.
    await page.evaluate(() => {
      BB.Play.save.finale = true; BB.Play.save.mazeSolved = true; BB.Play.save.rainbowUnlocked = true;
      BB.Home.familyOrder().forEach(id => { BB.Play.save.family[id] = 1; });
      BB.RAINBOW_KIN.forEach(id => { BB.Play.save.kin[id] = 1; }); // (the replay cloud waits for Rainbow's whole family)
    });
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await page.keyboard.press('ArrowUp'); await pause(page);
    for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await pause(page); }
    assert.equal(await page.evaluate(() => BB.Play.wardrobe.tab), 5);
    await page.keyboard.press('ArrowDown'); await pause(page);
    await page.keyboard.press('ArrowRight'); await pause(page); await page.keyboard.press('ArrowRight'); await pause(page);
    await page.keyboard.press('Enter'); await pause(page);
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    await shot(page, 'mirror-kittens');
    await page.evaluate(() => {
      BB.Wardrobe.LIST.filter(item => item.boss || item.discover).forEach(item => { BB.Play.save.outfits[item.id] = 1; });
      BB.Play.save.wear.head = null; BB.Play.wardrobeTab(0);
    });
    await tap(page, 647, 333); assert.equal(await page.evaluate(() => BB.Play.wardrobe.sel), 8);
    await shot(page, 'mirror-hats-page-2');
    await category(page, 1); await shot(page, 'mirror-necklaces');
    await category(page, 2); await tap(page, 681, 178); await tap(page, 681, 178);
    assert.equal(await page.evaluate(() => BB.Play.save.wear.face), 'googly');
    await shot(page, 'mirror-glasses'); await tap(page, 776, 438);
    await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('Space'); await page.waitForFunction(() => BB.Main.name === 'play');
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    assert.equal(await page.evaluate(() => Object.keys(BB.Play.save.sparkles).length), saved.stars.length);
    // The cloud's clear choices restart only Rainbow's family, retaining
    // the original world, clothes and movement skills through Continue.
    await page.evaluate(() => {
      Object.keys(BB.Play.save.abilities).forEach(key => { BB.Play.save.abilities[key] = true; });
      BB.Play.save.outfits.googly = 1; BB.Play.save.wear.face = 'googly';
    });
    await place(page, 'nm', 6, 32); await page.waitForFunction(() => BB.Play.portalChoice?.t > 10);
    assert.equal(await page.evaluate(() => BB.Play.portalChoice.focus), 2);
    await shot(page, 'cloud-replay');
    const kept = await page.evaluate(() => ({ cat: BB.Play.pl.cat, cats: Object.keys(BB.Play.save.family).length, bosses: Object.keys(BB.Play.save.bosses).length, stars: Object.keys(BB.Play.save.sparkles).length, skills: Object.values(BB.Play.save.abilities).every(Boolean), glasses: BB.Play.save.wear.face }));
    await page.keyboard.press('ArrowRight'); await pause(page);
    await page.keyboard.down('Enter'); await page.waitForFunction(() => BB.Play.room.id === 'hm' && BB.Play.kinCard && !BB.Play.replayStarting); await page.keyboard.up('Enter');
    assert.deepEqual(await page.evaluate(() => ({ cat: BB.Play.pl.cat, cats: Object.keys(BB.Play.save.family).length, bosses: Object.keys(BB.Play.save.bosses).length, stars: Object.keys(BB.Play.save.sparkles).length, skills: Object.values(BB.Play.save.abilities).every(Boolean), glasses: BB.Play.save.wear.face })), kept);
    assert.equal(await page.evaluate(() => Object.keys(BB.Play.save.kin).length), 0);
    assert.equal(await page.evaluate(() => BB.Play.save.cloudMask), 0);
    await page.reload(); await page.waitForFunction(() => BB.Title.t > 16);
    await page.keyboard.press('Space'); await page.waitForFunction(() => BB.Main.name === 'play');
    assert.equal(await page.evaluate(() => BB.Play.save.replayCount), 0);
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    const normal = await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2'));
    await page.goto(pathToFileURL(path.join(ROOT, 'try-rewards.html')).href);
    await page.waitForFunction(() => BB.Save.preview && BB.Main.name === 'play');
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    await tap(page, 505, 178); await tap(page, 776, 438); await page.reload();
    await page.waitForFunction(() => BB.Save.preview);
    assert.equal(await page.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2')), normal);
    // The outdoor welcome spot fills all three rooms with the rescued
    // critters. Each original picture activity runs in the real browser.
    await place(page, 'ng', 24, 31); await page.waitForFunction(() => BB.Play.gardenChoice?.t > 8);
    await page.keyboard.press('Enter'); await pause(page);
    assert.ok(await page.evaluate(() => BB.Play.homeVisitors.length > 0));
    await page.evaluate(() => {
      const P = BB.Play;
      for (let i = 0; i < P.gardenChoice.kinds.length; i++) { P.gardenChoice.sel = i; if (!P.save.residents[P.gardenChoice.kinds[i]]) P.chooseGarden(); }
      P.gardenChoice.sel = 0;
    });
    await tap(page, 480, 390);
    assert.ok(await page.evaluate(() => BB.Play.homeVisitors.length < 65));
    await shot(page, 'garden-species-off');
    await tap(page, 480, 390); assert.equal(await page.evaluate(() => BB.Play.homeVisitors.length), 65);
    const gardenSpent = await page.evaluate(() => BB.Play.save.heartsSpent);
    await tap(page, 610, 390); assert.equal(await page.evaluate(() => BB.Play.homeVisitors.length), 65);
    await page.keyboard.press('ArrowUp'); await pause(page); assert.equal(await page.evaluate(() => BB.Play.homeVisitors.length), 65);
    await tap(page, 500, 390); assert.ok(await page.evaluate(() => BB.Play.homeVisitors.length < 65));
    await shot(page, 'garden-individual-off');
    await page.keyboard.press('Enter'); await pause(page); assert.equal(await page.evaluate(() => BB.Play.homeVisitors.length), 65);
    assert.equal(await page.evaluate(() => BB.Play.save.heartsSpent), gardenSpent);
    await tap(page, 678, 145); assert.equal(await page.evaluate(() => BB.Play.homeVisitors.length), 65);
    await page.evaluate(() => {
      const s = BB.Play.save;
      BB.World.findThings('o').forEach(th => { s.buds[th.tx + ',' + th.ty] = 1; });
      BB.World.rooms.filter(r => r.def.toy).slice(0, 3).forEach(r => { s.toys[r.def.toy] = 1; });
      BB.Gestures.LIST.slice(0, 3).forEach(g => { s.gestures[g.id] = 1; });
      BB.World.rooms.filter(r => r.things.some(th => th.ch === 'V')).forEach(r => { s.songs[r.id] = 1; });
      BB.World.rooms.filter(r => r.def.boss || r.things.some(th => th.ch === 'K')).slice(0, 3).forEach(r => { s.bosses[r.id] = 1; });
      s.rainbowUnlocked = true;
      BB.Save.write();
    });
    await place(page, 'hm', mirror - 0.5, 32); await page.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    for (const [tab, id] of [[2, 'flowerframes'], [2, 'aviators'], [1, 'bowtie'], [1, 'pearls'], [1, 'leafcollar'], [1, 'rainbowcollar'], [4, 'trail-heart']]) {
      await category(page, tab); await wardrobeItem(page, id); await wardrobeItem(page, id);
      assert.equal(await page.evaluate(id => BB.Economy.progress(BB.Play.save, BB.Play.wardrobeItems().find(item => item.id === id)), id), 1, id);
    }
    assert.equal(await page.evaluate(() => BB.Play.save.cosmetics.trail), 'heart');
    await shot(page, 'new-heart-trail-earned'); await tap(page, 776, 438);
    for (const [id, col, kind] of [['ng', 11, 'ball'], ['np', 14, 'bubbles'], ['nr', 10, 'dance']]) {
      await place(page, id, col, 31); await page.keyboard.press('Enter');
      await page.waitForFunction(kind => BB.Play.gardenFun?.kind === kind && BB.Play.gardenFun.t > 60 && !BB.Play.zoneCard, kind);
      await shot(page, 'garden-' + kind);
    }
    await page.evaluate(() => { BB.Play.save.family = Object.fromEntries(BB.Home.familyOrder().slice(0, 3).map(id => [id, 1])); });
    await place(page, 'hm', 4, 32); await page.waitForTimeout(500); await shot(page, 'rainbow-door-locked');
    assert.equal(await page.evaluate(() => BB.Play.portalChoice), null);
    await page.evaluate(() => BB.Home.familyOrder().forEach(id => { BB.Play.save.family[id] = 1; }));
    await place(page, 'nm', 17, 32); await page.waitForTimeout(400); await shot(page, 'rainbow-path');
    await place(page, 'nm', 21, 32); await page.waitForFunction(() => BB.Play.portalChoice?.t > 10);
    await shot(page, 'rainbow-entry');
    await page.keyboard.press('Enter'); await page.waitForFunction(() => BB.Play.maze !== null);
    await shot(page, 'hedge-maze');
    for (const pad of await page.evaluate(() => BB.GardenMaze.ORDER)) await walkMaze(page, pad);
    await walkMaze(page, await page.evaluate(() => BB.GardenMaze.PRIZE));
    await page.waitForFunction(() => BB.Play.maze?.choiceT > 10);
    await tap(page, 660, 270); await tap(page, 660, 270);
    assert.equal(await page.evaluate(() => BB.Play.pl.cat), 'rainbow');
    await page.waitForFunction(() => BB.Play.maze.bloom === 1);
    await shot(page, 'maze-happy');
    await page.evaluate(() => { BB.Play.maze.choice = true; BB.Play.maze.choiceT = 10; BB.Play.maze.sel = 2; });
    await shot(page, 'kitten-choices');
    await tap(page, 762, 136); await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => BB.Play.maze?.x === BB.GardenMaze.RESCUE_EXIT.x && !BB.Play.maze.moving);
    await page.waitForTimeout(900); assert.ok(await page.evaluate(() => BB.Play.maze));
    await shot(page, 'rescue-exit-wait');
    await page.waitForFunction(() => BB.Play.maze === null && BB.Play.room.id === 'nm');
    assert.equal(await page.evaluate(() => BB.Play.journeyLock), 'rainbow');
    await shot(page, 'courtyard-happy');
    await page.keyboard.down('ArrowRight'); await page.waitForFunction(() => BB.Play.room.id === 'hm'); await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(() => BB.Play.save.mazeSolved && BB.Play.save.rainbowUnlocked), true);
    await shot(page, 'rescued-kitten-home');
    console.log('✓ Chromium: safe mouse/keyboard menu paws, exact half star bar, full maze rescue and walk home, wardrobe, garden, replay/reload and safe preview');
    await context.close();

    const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const touch = await tablet.newPage(); watch(touch);
    await touch.goto(URL); await touch.waitForFunction(() => BB.Title.t > 16);
    await tap(touch, 790, 466, true); assert.equal(await touch.evaluate(() => BB.Settings.difficulty), 'medium');
    await touch.goto(pathToFileURL(path.join(ROOT, 'try-rewards.html')).href);
    await touch.waitForFunction(() => BB.Save.preview && BB.Main.name === 'play');
    await place(touch, 'hm', mirror - 0.5, 32); await touch.waitForFunction(() => BB.Play.wardrobe?.t > 8);
    assert.equal(await touch.locator('#touch').isVisible(), false);
    await tap(touch, 505, 178, true); assert.equal(await touch.evaluate(() => BB.Play.save.starsSpent), 0);
    for (let i = 0; i < 5; i++) await category(touch, i, true);
    await category(touch, 0, true); await tap(touch, 647, 333, true);
    assert.equal(await touch.evaluate(() => BB.Play.wardrobe.sel), 8);
    await category(touch, 2, true); await tap(touch, 505, 178, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.wear.face), 'scuba');
    await shot(touch, 'scuba-milestone');
    assert.equal(await touch.evaluate(() => BB.Play.wardrobeItems().length), 8);
    await wardrobeItem(touch, 'heartshades', true);
    assert.ok(await touch.evaluate(() => BB.Economy.progress(BB.Play.save, BB.Wardrobe.BY.heartshades) < 1));
    await category(touch, 1, true); assert.equal(await touch.evaluate(() => BB.Play.wardrobeItems().length), 8);
    await category(touch, 4, true); assert.equal(await touch.evaluate(() => BB.Play.wardrobeItems().length), 4);
    await wardrobeItem(touch, 'trail-heart', true); await shot(touch, 'touch-four-trails');
    await tap(touch, 776, 438, true); await touch.waitForFunction(() => !BB.Play.wardrobe);
    await touch.waitForFunction(() => getComputedStyle(document.getElementById('touch')).display === 'block');
    const pauseButton = await touch.locator('#pause-btn').boundingBox();
    const tapPause = () => touch.touchscreen.tap(pauseButton.x + pauseButton.width / 2, pauseButton.y + pauseButton.height / 2);
    await tapPause(); await touch.waitForFunction(() => BB.Main.name === 'pause' && document.body.classList.contains('menu-open'));
    assert.equal(await touch.locator('#touch').isVisible(), false);
    await shot(touch, 'touch-pause');
    await tapPause(); await touch.waitForFunction(() => BB.Main.name === 'play' && !document.body.classList.contains('menu-open'));
    assert.equal(await touch.locator('#touch').isVisible(), true);
    const mapButton = await touch.locator('#map-btn').boundingBox();
    const tapMap = () => touch.touchscreen.tap(mapButton.x + mapButton.width / 2, mapButton.y + mapButton.height / 2);
    // the map button opens the same kingdom map as the pause menu; tapping it again goes back to play
    await tapMap(); await touch.waitForFunction(() => BB.Main.name === 'pause' && BB.Pause.map && document.body.classList.contains('menu-open'));
    assert.equal(await touch.locator('#touch').isVisible(), false);
    assert.equal(await touch.locator('#map-btn').isVisible(), true); // remains available to close the map
    await tapMap(); await touch.waitForFunction(() => BB.Main.name === 'play' && !document.body.classList.contains('menu-open'));
    assert.equal(await touch.locator('#touch').isVisible(), true);
    await place(touch, 'ng', 24, 31); await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8);
    assert.equal(await touch.locator('#touch').isVisible(), false);
    await tap(touch, 480, 390, true); assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 1);
    const invitedCount = await touch.evaluate(() => BB.Play.homeVisitors.length);
    await tap(touch, 480, 390, true); assert.equal(await touch.evaluate(() => BB.Play.homeVisitors.length), 0);
    assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 1);
    await tap(touch, 610, 390, true); assert.equal(await touch.evaluate(() => BB.Play.homeVisitors.length), 0);
    await tap(touch, 500, 390, true); assert.equal(await touch.evaluate(() => BB.Play.homeVisitors.length), invitedCount);
    await shot(touch, 'touch-invite'); await tap(touch, 678, 145, true);
    await place(touch, 'hm', 24, 32); await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8);
    await tap(touch, 480, 390, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 2);
    assert.equal(await touch.evaluate(() => BB.Play.gardenChoice), null);
    assert.equal(await touch.evaluate(() => BB.Play.zoneCard), 0);
    await shot(touch, 'touch-fountain-party');
    await touch.waitForFunction(() => BB.Play.fountainCd === 0);
    await place(touch, 'hm', 21, 32); await pause(touch); await place(touch, 'hm', 24, 32);
    await touch.waitForFunction(() => BB.Play.gardenChoice?.t > 8); await tap(touch, 480, 390, true);
    assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 2);
    assert.equal(await touch.evaluate(() => BB.Play.save.fountainUses), 2);
    assert.equal(await touch.evaluate(() => document.body.classList.contains('touch')), true);
    for (const [id, col, kind] of [['ng', 11, 'ball'], ['np', 14, 'bubbles'], ['nr', 10, 'dance']]) {
      await place(touch, id, col, 31);
      await touch.waitForFunction(kind => BB.Play.gardenFun?.kind === kind, kind);
      assert.equal(await touch.evaluate(() => BB.Play.save.heartsSpent), 2);
    }
    await place(touch, 'nm', 21, 32); await touch.waitForFunction(() => BB.Play.portalChoice?.t > 10);
    assert.equal(await touch.locator('#touch').isVisible(), false);
    await tap(touch, 385, 405, true); await touch.waitForFunction(() => BB.Play.maze !== null);
    await tap(touch, 448, 506, true);
    await touch.waitForFunction(() => BB.Play.maze.y === 12);
    await tap(touch, 850, 30, true);
    assert.ok(await touch.evaluate(() => BB.Play.maze));
    await touch.waitForFunction(() => BB.Play.maze === null);
    assert.equal(await touch.evaluate(() => BB.Play.room.id), 'nm');
    assert.equal(await touch.evaluate(() => BB.Play.maze), null);
    // Touch cancelling a replay keeps the same adventure; confirming
    // in the preview restarts only its in-memory world.
    await touch.evaluate(() => { BB.Play.save.mazeSolved = true; BB.Play.save.rainbowUnlocked = true; BB.RAINBOW_KIN.forEach(id => { BB.Play.save.kin[id] = 1; }); });
    await touch.evaluate(() => {
      const P = BB.Play;
      P.save.mazePosition = { ...BB.GardenMaze.PRIZE }; P.openMaze();
      P.chooseMazeCat('rainbow'); P.maze.rewardLock = true;
    });
    await tap(touch, 88, 99, true);
    await touch.waitForFunction(() => BB.Play.maze?.x === BB.GardenMaze.RESCUE_EXIT.x && !BB.Play.maze.moving);
    await touch.waitForTimeout(900); assert.ok(await touch.evaluate(() => BB.Play.maze));
    await shot(touch, 'touch-rescue-exit-wait');
    await touch.waitForFunction(() => BB.Play.maze === null && BB.Play.room.id === 'nm');
    const right = await touch.locator('[data-act="right"]').boundingBox();
    await touch.dispatchEvent('[data-act="right"]', 'pointerdown', { pointerId: 92, pointerType: 'touch', clientX: right.x + right.width / 2, clientY: right.y + right.height / 2 });
    await touch.waitForFunction(() => BB.Play.room.id === 'hm');
    await touch.dispatchEvent('#touch', 'pointerup', { pointerId: 92, pointerType: 'touch' });
    assert.equal(await touch.evaluate(() => BB.Play.save.rainbowUnlocked), true);
    await place(touch, 'nm', 6, 32); await touch.waitForFunction(() => BB.Play.portalChoice?.t > 10);
    await tap(touch, 480, 447, true); assert.equal(await touch.evaluate(() => BB.Play.portalChoice), null);
    await place(touch, 'nm', 6, 32); await touch.waitForFunction(() => BB.Play.portalChoice?.t > 10);
    await tap(touch, 658, 256, true); await touch.waitForFunction(() => BB.Play.room.id === 'hm' && BB.Play.kinCard && !BB.Play.replayStarting);
    assert.equal(await touch.evaluate(() => Object.keys(BB.Play.save.kin).length), 0);
    assert.equal(await touch.evaluate(() => Object.keys(BB.Play.save.family).length), 12);
    assert.equal(await touch.evaluate(() => BB.Play.pl.cat), 'rainbow');
    assert.equal(await touch.evaluate(() => localStorage.getItem('bubblebug_kingdom_v2')), null);
    assert.deepEqual(errors, []);
    console.log('✓ Chromium touch: scuba, milestones, outdoor invitations/play, fountain, maze, confirmed replay and zero page errors');
    await tablet.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
