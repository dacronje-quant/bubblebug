// Dev helper: exercise each mechanic in the real game and screenshot it.
//   node tools/scenarios.js <outDir>
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const out = process.argv[2] || '.';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const kb = page.keyboard;
  const wait = ms => page.waitForTimeout(ms);
  const hold = async (key, ms) => { await kb.down(key); await wait(ms); await kb.up(key); };
  const shot = n => page.screenshot({ path: `${out}/sc_${n}.png` });
  const start = async (room, all = true, cat = 'marshmallow') => {
    await page.goto('file://' + process.cwd() + `/index.html#play=${cat}&room=${room}${all ? '&ab=all' : ''}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await wait(700);
  };
  // teleport to room tile (tx, ty) = standing cell
  const tp = (room, tx, ty) => page.evaluate(([room, tx, ty]) => {
    const r = BB.World.byId[room], b = BB.Play.pl.body;
    b.x = (r.x + tx) * 32 + 6; b.y = (r.y + ty + 1) * 32 - 24; b.vx = b.vy = 0;
    BB.Play.room = r; BB.Camera.snap(r, b);
  }, [room, tx, ty]);
  const st = () => page.evaluate(() => ({ room: BB.Play.room.id, st: BB.Play.pl.state, ab: JSON.stringify(BB.Play.save.abilities), friends: Object.keys(BB.Play.save.friends).length, gift: !!BB.Play.gift, party: !!BB.Play.party }));

  // 1. Butterfly Elder gift (no powers yet)
  await start('m3', false);
  await tp('m3', 10, 13);
  await hold('ArrowRight', 500);
  await wait(1400); await shot('elder_orb');
  await wait(2600); await shot('elder_card');
  console.log('elder', await st());
  await wait(2500); await kb.press('Space'); await wait(800);
  console.log('after card', await st());

  // 2. Befriend a bug
  await start('g2', false);
  await tp('g2', 16, 13);
  await kb.down('ArrowRight'); await wait(60); await kb.up('ArrowRight');
  for (let i = 0; i < 4; i++) { await kb.press('KeyX'); await wait(350); }
  await wait(300); await shot('befriend_pop');
  await wait(900); await shot('befriend_happy');
  console.log('friend', await st());

  // 3. Water rescue
  await start('g3', false);
  await tp('g3', 11, 13);
  await hold('ArrowRight', 700);
  await wait(500); await shot('rescue_mid');
  await wait(1200); await shot('rescue_done');
  console.log('rescue', await st());

  // 4. Bench nap
  await tp('g3', 29, 13);
  await wait(1600); await shot('bench');
  console.log('bench', await st());

  // 5. Room glide
  await start('g1', false);
  await tp('g1', 26, 13);
  await kb.down('ArrowRight'); await wait(450); await shot('slide'); await kb.up('ArrowRight');

  // 6. Caves darkness + glow petals
  await start('c4', true); await wait(300); await shot('snail');
  await start('h4', true); await tp('h4', 8, 13); await wait(300); await shot('petals');
  await start('h4', false); await tp('h4', 8, 13); await wait(300); await shot('petals_off');

  // 7. Cloud King and the party
  await start('k3', true);
  await tp('k3', 8, 13);
  await wait(300); await shot('king');
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => { const k = BB.Play.ents.k3.bugs[0]; const b = BB.Play.pl.body; b.x = k.x - 120; b.facing = 1; b.y = Math.min(b.y, k.y - 12); b.vy = 0; });
    await kb.press('KeyX'); await wait(200);
  }
  await wait(1500); await shot('king_happy');
  console.log('king', await st());
  await tp('k3', 26, 13);
  await hold('ArrowRight', 800);
  await wait(800);
  await tp('k4', 9, 13);
  await hold('ArrowRight', 400);
  await wait(4500); await shot('party');
  console.log('party', await st());

  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
