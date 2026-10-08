// ════════════════════════════════════════════════════════════════
//  RAINBOW'S FAMILY — after Rainbow is rescued from the hedge maze.
//  Rainbow's own relatives, one for each colour of her rainbow, are lost
//  all over the kingdom: grey and sad under their own rain clouds. Touch
//  one and the colour floods back; they say hello, hop onto a cloud and
//  ride a rainbow home to the start of the adventure, the Cat House.
//  There they sit on cloud cushions along the Rainbow Nest, the arch over
//  the stairwell, and their own band of its rainbow lights up.
//  With all six home, the courtyard doorway opens onto the Cloud Maze,
//  where Mama waits (play-cloudmaze.js). They stay home until the player
//  chooses to restart their hunt, or erase the whole adventure.
//  A guiding star drifts toward a lost relative in the same room, so
//  small players can always find them without reading anything.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, PT = () => BB.Particles, S = () => BB.Audio.sfx;
  const ORDER = () => BB.RAINBOW_KIN; // rainbow order: pink … purple (the arch's bands)
  // Seats along the arch, left to right: Mama on top, the baby beside her
  const SEATS = ['rbGrandpa', 'rbPumpkin', 'rbPapa', 'rbMama', 'rbTwinkle', 'rbSplash', 'rbGranny'];
  const ARCH = { col: 30, row: 19.6, rx: 4.3, ry: 6.1 }; // over the stairwell, in Cat House tiles
  const WORLD = () => ORDER().filter(id => id !== 'rbMama'); // the six lost around the kingdom
  const has = (save, id) => !!(save && save.kin && save.kin[id]);
  const count = save => ORDER().filter(id => has(save, id)).length;
  const complete = save => !!save && ORDER().every(id => has(save, id));
  // the six are lost once Rainbow has been rescued, until each is found
  const hunting = save => !!save && !!save.mazeSolved && WORLD().some(id => !has(save, id));
  // all six home: Mama waits in the Cloud Maze
  const mamaReady = save => !!save && !!save.mazeSolved && WORLD().every(id => has(save, id)) && !has(save, 'rbMama');
  // the little rainbow on the HUD / title shows while the family is still apart
  const active = save => !!save && !!save.mazeSolved && !complete(save);
  const nest = save => !!save && (!!save.mazeSolved || count(save) > 0);
  function seat(room, id) {
    const i = SEATS.indexOf(id), a = Math.PI * (160 - i * 140 / 6) / 180;
    return { x: (room.x + ARCH.col + Math.cos(a) * ARCH.rx) * T, y: (room.y + ARCH.row - Math.sin(a) * ARCH.ry) * T - 6 };
  }

  // A small rainbow of seven bands; found relatives' bands are coloured
  function miniArc(c, x, y, s, save, t, pulse = 0) {
    c.save(); c.lineCap = 'round';
    ORDER().forEach((id, i) => {
      const on = !!(save.kin || {})[id];
      c.strokeStyle = on ? BB.CATS[id].trailColor : 'rgba(205,198,216,0.75)';
      c.lineWidth = 2.6 * s;
      c.beginPath(); c.arc(x, y + 6 * s, (17 - i * 2.4) * s * (1 + pulse * 0.15), Math.PI, 0); c.stroke();
    });
    if (complete(save)) { c.fillStyle = '#fff6c2'; G().star(x + Math.sin(t * 0.05) * 9 * s, y - 9 * s, 2.6 * s, 4, 0.35, t * 0.03, c); c.fill(); }
    c.restore();
  }

  // A relative's face for the cards: grey with a "?" until they are home
  function face(c, id, x, y, s, found) {
    const m = BB.CATS[id];
    if (!found) { BB.Home.faceOf(c, id, x, y, s, false); return; }
    BB.MapView.catFace(c, x, y, s, m.fur, m.point);
    c.fillStyle = '#ffdf7c'; c.beginPath(); c.moveTo(x - 1.6 * s, y - 6 * s); c.lineTo(x, y - 13 * s); c.lineTo(x + 1.6 * s, y - 6 * s); c.closePath(); c.fill();
  }

  BB.RainbowFamily = { active, hunting, mamaReady, nest, count, complete, seat, miniArc, face, SEATS, WORLD };

  Object.assign(BB.Play, {
    // ──── Found one! ────
    onKin(th) {
      const save = this.save;
      if (!hunting(save) || save.kin[th.kin]) return;
      this.cancelGuidance();
      // their own little maze: find their favourite things to cheer them up
      this.openMini(th);
    },
    foundKin(id, x, y, delay) {
      const save = this.save;
      save.kin[id] = 1;
      this.kinPulse = 1;
      if (this.pl) { this.pl.happyT = 120; this.heal(BB.CFG.MOOD_MAX, x, y - 30); }
      S().familyFound();
      this.later(36, () => S().meow(id));
      BB.Voice.play('kin_' + id, delay);
      for (const col of BB.RAINBOW) PT().burst('spark', x, y - 30, 3, { color: col, speed: 3, life: 46 });
      for (let i = 0; i < 10; i++) PT().heart(x + (Math.random() - 0.5) * 50, y - 20 - Math.random() * 30);
      if (complete(save)) {
        // the whole rainbow family is home: their rainbow shines again,
        // and Rainbow's bubbles turn rainbow too (kept for every adventure)
        BB.Economy.milestones(save);
        save.cosmetics.bubble = 'rainbow'; save.wardrobeNew = 1;
        this.sayStory('kin_complete', 400);
      } else if (mamaReady(save)) {
        // the sixth is home: only Mama is missing now
        this.sayStory('kin_six_home', 600);
      }
      BB.Save.write();
    },

    // Rainbow was just rescued: her relatives appear around the kingdom
    // (without a reload), and a picture card shows the new goal.
    spawnKin() {
      for (const room of BB.World.rooms) for (const th of room.things) {
        if (th.ch !== '@' || this.ents[room.id].things.some(e => e.type === 'kin' && e.kin === th.kin)) continue;
        const e = BB.Things.create(th, room, this.save);
        if (e) this.ents[room.id].things.push(e);
      }
    },
    startHunt() {
      this.spawnKin();
      if (!hunting(this.save) || this.save.kinIntro) return;
      this.save.kinIntro = 1;
      this.kinCard = { t: 0 };
      BB.Save.write();
    },

    // ──── A guiding star toward a lost relative in this room ────
    updateRainbowFamily() {
      if (this.kinPulse > 0) this.kinPulse = Math.max(0, this.kinPulse - 0.03);
      if (this.kinCard && ++this.kinCard.t > 330) this.kinCard = null;
      if (!hunting(this.save) || this.pl.state !== 'play') return;
      const lost = this.ents[this.room.id].things.find(th => th.type === 'kin' && !th.found);
      if (this.kinRoom !== this.room.id) {
        this.kinRoom = this.room.id;
        if (lost) { S().firefly(); this.later(10, () => S().note(84)); }
      }
      if (!lost || this.t % 26) return;
      const b = this.pl.body, px = b.x + b.w / 2, py = b.y + 4;
      const d = Math.hypot(lost.x - px, lost.y - 30 - py);
      if (d > 120) PT().guide(px, py, lost.x, lost.y - 30, BB.CATS[lost.kin].trailColor);
    },

    // ──── "Find Rainbow's family": six grey faces → their rainbow home ────
    drawKinCard(c, t) {
      const k = this.kinCard, a = k.t < 18 ? k.t / 18 : k.t > 300 ? Math.max(0, (330 - k.t) / 30) : 1;
      if (a <= 0) return;
      const cx = G().W / 2, cy = 150 - (1 - Math.min(1, k.t / 18)) * 24;
      c.save(); c.globalAlpha = a;
      c.fillStyle = 'rgba(255,250,240,0.95)'; c.strokeStyle = '#c4a4f0'; c.lineWidth = 4;
      G().rrect(cx - 250, cy - 62, 500, 124, 30, c); c.fill(); c.stroke();
      WORLD().forEach((id, i) => {
        const x = cx - 205 + i * 46, y = cy + 26 + Math.sin(t * 0.08 + i) * 2;
        BB.Kittens.draw(c, BB.Kittens.fadedId(id, 1), { mode: 'sit', sad: 0.9, t: t + i * 20 }, x, y, 0.95, 1);
        BB.Critters.moodCloud(c, x, y - 52, 1, t + i * 30, 0.55);
      });
      c.strokeStyle = '#9a7ac8'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
      const ax = cx + 82 + Math.sin(t * 0.12) * 4;
      c.beginPath(); c.moveTo(ax - 18, cy); c.lineTo(ax + 14, cy); c.moveTo(ax + 4, cy - 10); c.lineTo(ax + 14, cy); c.lineTo(ax + 4, cy + 10); c.stroke();
      BB.HUD.zoneIcon(c, BB.HOME_ZONE, cx + 170, cy + 14, 1.05);
      miniArc(c, cx + 170, cy - 30, 1.15, { kin: Object.fromEntries(ORDER().map(id => [id, 1])) }, t);
      c.restore();
    },

    updateRainbowNestEffects(room) {
      if (!nest(this.save)) return;
      const b = this.pl.body;
      for (let i = 0; i < SEATS.length; i++) {
        const id = SEATS[i];
        if (!this.save.kin[id]) continue;
        const p = seat(room, id);
        const near = Math.abs(b.x + b.w / 2 - p.x) < 170 && Math.abs(b.y - p.y) < 220;
        if (near && (this.t + i * 41) % 70 === 0) PT().heart(p.x, p.y - 34);
      }
    },

    // ──── The Rainbow Nest: an arch over the Cat House stairwell ────
    drawRainbowNest(c, room, cam, t) {
      if (!nest(this.save)) return;
      const cx = (room.x + ARCH.col) * T - cam.x, cy = (room.y + ARCH.row) * T - cam.y;
      if (cx < -300 || cx > G().W + 300 || cy < -40 || cy - ARCH.ry * T > G().H + 40) return;
      const save = this.save, all = complete(save);
      c.save();
      if (all) G().drawGlow(cx, cy - ARCH.ry * T * 0.6, 230, '#fff4d0', 0.35 + Math.sin(t * 0.05) * 0.08, c);
      // seven bands, outer pink to inner purple; grey until their cat is home
      ORDER().forEach((id, i) => {
        const on = !!save.kin[id], w = 0.34 * T;
        c.strokeStyle = on ? BB.CATS[id].trailColor : 'rgba(198,190,210,0.55)';
        c.lineWidth = w + 1;
        c.beginPath(); c.ellipse(cx, cy, ARCH.rx * T - i * w, ARCH.ry * T - i * w, 0, Math.PI, 0); c.stroke();
      });
      // a fluffy cloud at each foot of the arch
      for (const d of [-1, 1]) BB.Backdrops.cloud(c, cx + d * (ARCH.rx - 0.9) * T - 20, cy + 2, 0.34, 'rgba(255,255,255,0.95)');
      if (all) for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.1 + 0.8 * ((i / 6 + t * 0.0015) % 1));
        c.fillStyle = '#fff8d8'; G().twinkle(cx - Math.cos(a) * ARCH.rx * T, cy - Math.sin(a) * ARCH.ry * T, 3 + Math.sin(t * 0.1 + i) * 1.5, c); c.fill();
      }
      // a cloud cushion for each relative, and whoever is home on it
      const b = this.pl.body;
      for (const id of SEATS) {
        const p = seat(room, id), x = p.x - cam.x, y = p.y - cam.y, m = BB.CATS[id];
        const home = !!save.kin[id], s = (m.size || 1.4) * 0.85;
        BB.Backdrops.cloud(c, x - 9.5, y + 6, 0.32, home ? 'rgba(255,255,255,0.97)' : 'rgba(234,229,242,0.85)');
        if (!home) continue;
        const near = Math.abs(b.x + b.w / 2 - p.x) < 170 && Math.abs(b.y - p.y) < 220;
        const tt = t + SEATS.indexOf(id) * 41;
        const pose = this.celebrationT > 0 ? { mode: 'stand', happy: true, t: tt, wave: Math.max(0, Math.sin(tt * 0.1)) }
          : near || all ? { mode: 'sit', happy: true, t: tt } : { mode: 'sleep', t: tt };
        const bob = all ? Math.sin(tt * 0.06) * 2 : 0;
        BB.Kittens.draw(c, id, pose, x, y + bob, s, x < b.x + b.w / 2 - cam.x ? 1 : -1);
      }
      c.restore();
    },
  });
})(window.BB);
