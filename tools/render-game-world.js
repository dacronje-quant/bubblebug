'use strict';
// Capture the real renderer in every room for manual visual inspection.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'test-output/release-audit/world');
const edgeViews = process.argv.includes('--edges');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER, headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '#play=phoebe&ab=all&hunt=1&demo=rainbow');
    await page.waitForFunction(() => BB.Play.t > 30);
    const rooms = await page.evaluate(() => {
      BB.Main.update = () => {};
      BB.Play.intro = null; BB.Play.iris = null; BB.Play.kinCard = null; BB.Play.zoneCard = 0;
      return BB.World.rooms.map(r => ({ id: r.id, zone: r.zone, name: r.def.name || r.id }));
    });
    for (const room of rooms) {
      await page.evaluate(id => {
        const P = BB.Play, r = BB.World.byId[id];
        P.room = r; P.prevRoom = null; P.lastZone = r.zone; P.zoneCard = 0;
        P.way = null; P.activeBoss = null; P.bossCard = null;
        let spot;
        const solid = (x, y) => BB.Physics.solidSide(BB.World.tile(x, y));
        for (let y = r.h - 1; y > 1 && !spot; y--) for (let x = Math.floor(r.w / 2); x < r.w - 1 && !spot; x++) {
          if (solid(r.x + x, r.y + y) && !solid(r.x + x, r.y + y - 1) && !solid(r.x + x, r.y + y - 2)) spot = { x, y };
        }
        spot ||= { x: r.w / 2, y: r.h / 2 };
        P.pl.body = BB.Physics.newBody((r.x + spot.x) * 32 + 6, (r.y + spot.y) * 32 - 24);
        P.pl.body.grounded = true;
        BB.Camera.snap(r, P.pl.body); P.lastCam = { x: BB.Camera.x, y: BB.Camera.y };
        BB.Particles.clear();
      }, room.id);
      const seen = [];
      for (const view of edgeViews ? ['floor','ceiling','left','right'] : ['floor']) {
        const position = await page.evaluate(({id,view}) => {
          const r=BB.World.byId[id],cam=BB.Camera;
          const x=view==='left'?r.px:view==='right'?r.px+r.pw-BB.G.W:cam.x;
          const y=view==='ceiling'?r.py:cam.y;
          const target=cam.clampTo(r,x,y);cam.x=target.x;cam.y=target.y;
          return target;
        },{id:room.id,view});
        if(seen.some(p=>Math.abs(p.x-position.x)<16&&Math.abs(p.y-position.y)<16))continue;
        seen.push(position);
        await page.waitForTimeout(40);
        await page.screenshot({ path: path.join(out, room.zone.toString().padStart(2, '0') + '-' + room.id + (edgeViews?'-'+view:'') + '.png') });
      }
    }
    fs.writeFileSync(path.join(out, 'rooms.json'), JSON.stringify({ rooms, errors }, null, 2));
    assert.deepEqual(errors, [], 'all rooms render without exceptions');
    console.log(`${rooms.length} rooms rendered without exceptions`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
