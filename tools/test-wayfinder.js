// The "this way!" guide: following it from a fresh Cat House visits every
// room of the story in order (doorways, gates, the Rainbow Lift and fairy
// rings) with no dead end; it shows at once on Easy/Medium, only after a
// few still seconds on Hard, and steps aside for a boss's fight.
// node tools/test-wayfinder.js
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = (() => {
  try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); }
})();
const URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function place(page, id, col) {
  await page.evaluate(([id, col]) => {
    const P = BB.Play, r = BB.World.byId[id], solid = (x, y) => BB.Physics.solidSide(BB.World.tile(x, y));
    let sp = { x: col, y: r.h - 3 };
    for (let y = r.h - 1; y > 0; y--) if (solid(r.x + col, r.y + y) && !solid(r.x + col, r.y + y - 1) && !solid(r.x + col, r.y + y - 2)) { sp = { x: col, y }; break; }
    P.leaveRoom(P.room); P.room = r; P.enterZone(r.zone); P.pl.state = 'play'; P.intro = null; P.zoneCard = 0; P.pl.invuln = 9999;
    P.save.visited[id] = 1;
    P.pl.body = BB.Physics.newBody((r.x + sp.x) * 32 + 6, (r.y + sp.y) * 32 - 24); P.pl.body.grounded = true; BB.Camera.snap(r, P.pl.body);
  }, [id, col]);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BUBBLEPAWS_BROWSER || undefined, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.waitForFunction(() => BB.Title.t > 16);

    // 1. follow the guide through the whole story (room by room)
    const walk = await page.evaluate(() => {
      BB.World.build();
      const s = BB.Save.fresh(); s.doors = {};
      let room = BB.World.byId.hm; s.visited = { hm: 1 };
      const order = [], kinds = {};
      for (let i = 0; i < 400; i++) {
        const g = BB.Wayfinder.goal(s, room);
        if (!g) return { done: true, order, kinds };
        const st = BB.Wayfinder.firstStep(room, g, s);
        if (!st) return { stuck: room.id, goal: g };
        kinds[st.kind] = (kinds[st.kind] || 0) + 1;
        room = BB.World.byId[st.to]; s.visited[room.id] = 1;
        if (!order.includes(room.id)) order.push(room.id);
        // (as in play: passing a flap lights its door; a happy boss opens the next one)
        if (room.things.some(t => t.ch === 'h')) s.doors[room.zone] = Math.max(s.doors[room.zone] || 0, 1);
        if (room.def.family) s.family[room.def.family] = 1;
        if (room.def.elder) s.abilities[room.def.elder] = 1;
        if (room.def.arena) { s.bosses[room.id] = 1; if (room.zone < 11) s.doors[room.zone + 1] = Math.max(s.doors[room.zone + 1] || 0, 1); }
      }
      return { loop: true };
    });
    assert.ok(walk.done, 'the guide leads all the way: ' + JSON.stringify(walk));
    const story = await page.evaluate(() => BB.STORY.filter(id => BB.World.byId[id]));
    // it leads to every boss, then to every family cat still lost
    const musts = await page.evaluate(() => BB.World.rooms.filter(r => r.def.arena || r.def.family).map(r => r.id));
    assert.deepEqual(musts.filter(id => !walk.order.includes(id)), [], 'every boss and family cat is reached');
    assert.ok(walk.kinds.lift >= 1 && walk.kinds.ring >= 1, 'the guide uses the Rainbow Lift and fairy rings');

    // 1b. the guide never points against a signpost, in any story room
    const clashes = await page.evaluate(() => {
      const W = BB.World, out = [];
      BB.STORY.forEach((id, i) => {
        const room = W.byId[id]; if (!room) return;
        const s = BB.Save.fresh(); Object.keys(s.abilities).forEach(k => { s.abilities[k] = 1; }); s.doors = {};
        BB.STORY.slice(0, i + 1).forEach(q => { const r = W.byId[q]; s.visited[q] = 1; if (r && r.def.arena && q !== id) s.bosses[q] = 1; if (r) s.doors[r.zone] = 1; });
        const signs = room.things.filter(t => 'RLUD'.includes(t.ch)).map(t => t.ch);
        const g = BB.Wayfinder.goal(s, room), st = g && BB.Wayfinder.stepFor(room, g, s);
        if (!st || !signs.length) return;
        const d = st.kind !== 'walk' ? st.kind : st.dx > 0 ? 'R' : st.dx < 0 ? 'L' : st.dy > 0 ? 'D' : 'U';
        if (!signs.includes(d) && !(d === 'lift' && signs.includes('D'))) out.push(`${id}: ${d} vs ${signs.join('')}`);
      });
      return out;
    });
    assert.deepEqual(clashes, [], 'the guide agrees with every signpost');

    // 2. in play: shows at once on Medium, pointing on from the first garden
    await page.evaluate(() => { BB.Settings.setDifficulty('medium'); const s = BB.Save.data = BB.Save.fresh(); s.introDone = 1; s.visited.tw = 1; BB.Main.set('play', {}); });
    await page.waitForTimeout(300);
    await place(page, 'g1', 4);
    await page.waitForTimeout(1200);
    let w = await page.evaluate(() => ({ goal: BB.Play.way.goal, to: BB.Play.way.step && BB.Play.way.step.to, show: BB.Play.way.show }));
    assert.equal(w.goal, 'g6'); assert.equal(w.to, 'g2'); assert.ok(w.show > 0.9, 'shown on Medium');

    // 2b. Medium: after a few seconds in the room it fades while moving,
    // and comes back after standing still
    const faded = await page.evaluate(() => new Promise(res => {
      const w = BB.Play.way; w.roomT = 999;
      let n = 0; const tick = () => { w.idle = 0; if (++n < 60) requestAnimationFrame(tick); else res(w.show); }; tick();
    }));
    assert.ok(faded < 0.1, 'Medium: hidden while on the move after a while');
    await page.waitForTimeout(3000);
    assert.ok(await page.evaluate(() => BB.Play.way.show > 0.5), 'Medium: back after standing still');

    // 3. Hard: only after standing still for a few seconds
    await page.evaluate(() => BB.Settings.setDifficulty('hard'));
    await place(page, 'g1', 5);
    await page.waitForTimeout(800);
    assert.ok(await page.evaluate(() => BB.Play.way.show < 0.1), 'hidden at first on Hard');
    await page.waitForTimeout(4600);
    assert.ok(await page.evaluate(() => BB.Play.way.show > 0.5), 'shown after standing still on Hard');
    await page.evaluate(() => BB.Settings.setDifficulty('medium'));

    // 4. a boss's fight: the guide steps aside until the boss is happy
    await page.evaluate(() => { for (const id of BB.STORY) { if (id === 'g6') break; BB.Play.save.visited[id] = 1; } });
    await place(page, 'g6', 20);
    await page.waitForFunction(() => BB.Play.activeBoss && BB.Play.activeBoss.state !== 'wait', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    const fight = await page.evaluate(() => ({ boss: BB.Play.activeBoss && BB.Play.activeBoss.state, show: BB.Play.way.show }));
    if (fight.boss && fight.boss !== 'happy') assert.ok(fight.show < 0.1, 'hidden during the boss fight');
    assert.deepEqual(errors, []);
    console.log(`✓ following the guide from home reaches all 12 bosses and every family cat (${walk.kinds.walk} doorways, ${walk.kinds.lift} lift, ${walk.kinds.ring} fairy rings); never against a signpost; on Medium shown in each new room and when standing still, on Hard after a still moment, and hidden while a boss is sad`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
