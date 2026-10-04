// The camera settles in every room, including the narrow link shafts that are
// thinner than the view (it used to flip between their two edges every frame,
// which looked like a doubled, twitching picture).  node tools/test-camera.js
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = (() => {
  try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); }
})();
const URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.waitForFunction(() => BB.Title.t > 16);
    await page.evaluate(() => { BB.World.build(); const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1; BB.Main.set('play', {}); });
    await page.waitForTimeout(300);
    const res = await page.evaluate(async () => {
      const P = BB.Play, bad = [], solid = (x, y) => BB.Physics.solidSide(BB.World.tile(x, y));
      const frame = () => new Promise(r => requestAnimationFrame(r));
      let narrow = 0, checked = 0;
      for (const r of BB.World.rooms) {
        if (r.def.home || r.def.cameraGroup) continue;
        if (r.pw < BB.G.W || r.ph < BB.G.H) narrow++;
        // one standing spot, low in the room
        let spot = null;
        for (let y = r.h - 1; y > 0 && !spot; y--) for (let x = 1; x < r.w - 1 && !spot; x++)
          if (solid(r.x + x, r.y + y) && !solid(r.x + x, r.y + y - 1) && !solid(r.x + x, r.y + y - 2)) spot = { x, y };
        if (!spot) continue;
        P.leaveRoom(P.room);
        P.room = r; P.enterZone(r.zone); P.pl.state = 'play'; P.intro = null; P.traveling = null; P.zoneCard = 0;
        P.pl.body = BB.Physics.newBody((r.x + spot.x) * 32 + 6, (r.y + spot.y) * 32 - 24); P.pl.body.grounded = true;
        BB.Camera.snap(r, P.pl.body);
        for (let i = 0; i < 30; i++) await frame();
        const xs = [], ys = [];
        for (let i = 0; i < 12; i++) { await frame(); if (P.room !== r) break; xs.push(BB.Camera.x); ys.push(BB.Camera.y); }
        if (xs.length < 12) continue;
        checked++;
        const jx = Math.max(...xs) - Math.min(...xs), jy = Math.max(...ys) - Math.min(...ys);
        if (jx > 4 || jy > 4) bad.push(`${r.id} jumps ${Math.round(jx)}×${Math.round(jy)}px`);
      }
      return { bad, narrow, checked };
    });
    assert.ok(res.narrow >= 10, 'the narrow link shafts are in the check');
    assert.deepEqual(res.bad, []);
    // the kingdom map: opened a little zoomed in, with small name tags that
    // never overlap each other or the kitten, from any zone
    const maps = await page.evaluate(() => {
      const P = BB.Play, S = P.save, out = [];
      BB.World.rooms.forEach(r => { S.visited[r.id] = 1; });
      for (const z of [...new Set(BB.World.rooms.map(r => r.zone))]) {
        const r = BB.World.rooms.find(q => q.zone === z);
        P.room = r; P.pl.body = BB.Physics.newBody((r.x + 3) * 32, (r.y + 3) * 32);
        BB.MapView.openFull();
        const { tags, h, frame: f, kitten: k } = BB.MapView.currentTags();
        const over = (a, b, ah, bh) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (ah + bh) / 2;
        let clashes = 0, outside = 0;
        tags.forEach((a, i) => {
          if (over(a, k, h, k.h)) clashes++;
          tags.slice(i + 1).forEach(b => { if (over(a, b, h, h)) clashes++; });
          if (a.x - a.w / 2 < f.x || a.x + a.w / 2 > f.x + f.w || a.y - h / 2 < f.y || a.y + h / 2 > f.y + f.h) outside++;
        });
        out.push({ z, n: tags.length, clashes, outside, zoomed: BB.MapView.zoom() > BB.MapView.fitZoom() * 1.5 || BB.MapView.zoom() === BB.MapView.ZOOM });
      }
      return out;
    });
    for (const m of maps) assert.deepEqual({ clashes: m.clashes, outside: m.outside, zoomed: m.zoomed }, { clashes: 0, outside: 0, zoomed: true }, 'map from zone ' + m.z);
    assert.ok(maps.every(m => m.n >= 3), 'several zone names show at once');
    assert.deepEqual(errors, []);
    console.log(`✓ the kingdom map opens zoomed in from all ${maps.length} zones, with name tags that never overlap each other or the kitten`);
    console.log(`✓ the camera holds still in all ${res.checked} rooms checked, including ${res.narrow} narrower or shorter than the view`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
