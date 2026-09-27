// ════════════════════════════════════════════════════════════════
//  PLAY · AT HOME — the Cat House extras that live on top of the
//  adventure: the dressing-up mirror and its wardrobe, the "something new
//  to wear!" card, and batting found toys around the house.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const PT = () => BB.Particles;
  const S = () => BB.Audio.sfx;

  // wardrobe layout (logical screen px)
  const MIRROR = { x: 290, y: 272, rx: 118, ry: 168 };
  const cell = i => ({ x: 505 + (i % 4) * 88, y: 150 + Math.floor(i / 4) * 96, r: 36 });
  const DONE = { x: 776, y: 438, r: 34 };

  Object.assign(BB.Play, {
    // ──── Presents from the bosses ────
    giveOutfit(kind) {
      const a = BB.Wardrobe.grant(this.save, kind, true);
      if (!a) return;
      BB.Save.write();
      this.later(170, () => {
        this.outfitCard = { id: a.id, t: 0 };
        S().outfit();
        BB.Voice.say('You got a ' + a.name + '!');
      });
    },

    drawOutfitCard(c, t) {
      const oc = this.outfitCard;
      const a = oc.t < 16 ? oc.t / 16 : oc.t > 245 ? Math.max(0, (280 - oc.t) / 35) : 1;
      if (a <= 0) return;
      const cx = G().W / 2, cy = 150 - (1 - Math.min(1, oc.t / 16)) * 24;
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(255,250,240,0.95)'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 4;
      G().rrect(cx - 170, cy - 64, 340, 128, 30, c); c.fill(); c.stroke();
      // the kitten, twirling in its new thing
      const k = BB.easeOutBack(Math.min(1, oc.t / 24));
      c.save(); c.beginPath(); c.rect(cx - 162, cy - 58, 200, 116); c.clip();
      G().drawGlow(cx - 64, cy + 6, 60, '#ffe0f0', 0.7, c);
      BB.Kittens.draw(c, this.pl.cat, { mode: 'sit', happy: true, t: oc.t, wear: this.save.wear }, cx - 64, cy + 52, 3 * k, Math.floor(oc.t / 50) % 2 ? -1 : 1);
      c.restore();
      // the present itself, and a little mirror: "try things on at home"
      BB.Wardrobe.icon(c, oc.id, cx + 80, cy - 14, 2.4, oc.t);
      c.fillStyle = '#8a5a34'; G().ellipse(cx + 80, cy + 34, 12, 16, 0, c); c.fill();
      c.fillStyle = '#cfe8fb'; G().ellipse(cx + 80, cy + 34, 9, 13, 0, c); c.fill();
      BB.HUD.zoneIcon(c, BB.HOME_ZONE, cx + 112, cy + 38, 0.5);
      c.restore();
    },

    // ──── The dressing-up mirror ────
    updateMirror() {
      const room = this.room, pl = this.pl, b = pl.body;
      if (!room.def.home || this.wardrobe || this.party || this.traveling) { this.mirrorHold = 0; return; }
      const mx = (room.x + BB.Home.MIRROR_COL) * T, my = (room.y + 32) * T;
      const at = pl.state === 'play' && b.grounded && Math.abs(b.x + b.w / 2 - mx) < 18 && Math.abs(b.y + b.h - my) < 6 && Math.abs(b.vx) < 0.3;
      this.mirrorHold = at ? (this.mirrorHold || 0) + 1 : Math.max(0, (this.mirrorHold || 0) - 3);
      if (this.mirrorHold >= BB.Links.HOLD) { this.mirrorHold = 0; this.openWardrobe(); }
    },

    openWardrobe() {
      const list = BB.Wardrobe.LIST, wear = this.save.wear || {};
      let sel = list.findIndex(a => wear[a.slot] === a.id);
      if (sel < 0) sel = Math.max(0, list.findIndex(a => (this.save.outfits || {})[a.id]));
      this.wardrobe = { sel, t: 0, wiggle: 0 };
      this.save.wardrobeNew = 0;
      this.pl.state = 'wardrobe'; this.pl.body.vx = 0;
      BB.Input.takePointers();
      S().select();
    },

    closeWardrobe() {
      this.wardrobe = null;
      this.pl.state = 'play'; this.pl.idleT = 0; this.pl.happyT = 60;
      this.mirrorHold = -40; // (step away before it opens again)
      BB.Save.write();
      S().confirm();
    },

    // put on / take off
    toggleOutfit(i) {
      const a = BB.Wardrobe.LIST[i], w = this.wardrobe;
      w.sel = i;
      if (!(this.save.outfits || {})[a.id]) { w.wiggle = 20; S().hmph(); return; }
      this.save.wear = this.save.wear || {};
      if (this.save.wear[a.slot] === a.id) { this.save.wear[a.slot] = null; S().pop(1); }
      else { this.save.wear[a.slot] = a.id; S().outfit(); PT().burst('spark', this.pl.body.x + 10, this.pl.body.y, 10, { color: '#ffe0f0', speed: 2, life: 28 }); }
    },

    updateWardrobe() {
      const I = BB.Input, w = this.wardrobe, n = BB.Wardrobe.LIST.length;
      w.t++;
      if (w.wiggle > 0) w.wiggle--;
      if (w.t < 8) return;
      if (I.pressed.pause || I.pressed.back || I.pressed.map) return this.closeWardrobe();
      if (I.pressed.left) { w.sel = (w.sel + n - 1) % n; S().select(); }
      if (I.pressed.right) { w.sel = (w.sel + 1) % n; S().select(); }
      if (I.pressed.up) { w.sel = (w.sel + n - 4) % n; S().select(); }
      if (I.pressed.down) { w.sel = (w.sel + 4) % n; S().select(); }
      if (I.pressed.jump || I.pressed.bubble || I.pressed.confirm) this.toggleOutfit(w.sel);
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - DONE.x, p.y - DONE.y) < DONE.r + 10) return this.closeWardrobe();
        for (let i = 0; i < n; i++) { const q = cell(i); if (Math.hypot(p.x - q.x, p.y - q.y) < q.r + 8) this.toggleOutfit(i); }
      }
    },

    drawWardrobe(c, t) {
      const w = this.wardrobe, save = this.save, list = BB.Wardrobe.LIST;
      const a = Math.min(1, w.t / 12);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(30,18,40,0.5)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = 'rgba(255,248,240,0.97)'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 6;
      G().rrect(120, 52, 720, 436, 36, c); c.fill(); c.stroke();
      // the mirror, with the kitten in it
      c.fillStyle = '#8a5a34'; G().ellipse(MIRROR.x, MIRROR.y, MIRROR.rx + 12, MIRROR.ry + 12, 0, c); c.fill();
      const g = c.createLinearGradient(MIRROR.x - MIRROR.rx, MIRROR.y - MIRROR.ry, MIRROR.x + MIRROR.rx, MIRROR.y + MIRROR.ry);
      g.addColorStop(0, '#eef8ff'); g.addColorStop(1, '#c8e2f8');
      c.fillStyle = g; G().ellipse(MIRROR.x, MIRROR.y, MIRROR.rx, MIRROR.ry, 0, c); c.fill();
      c.save(); G().ellipse(MIRROR.x, MIRROR.y, MIRROR.rx, MIRROR.ry, 0, c); c.clip();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(MIRROR.x - 60, MIRROR.y - 60, 14, 70, 0.4, 0, TAU); c.fill();
      BB.Kittens.draw(c, this.pl.cat, { mode: 'sit', happy: true, t, wear: save.wear }, MIRROR.x + 6, MIRROR.y + 118, 5.2, 1);
      c.restore();
      // the presents: bright if you have them, grey "?" if not yet
      list.forEach((it, i) => {
        const q = cell(i), have = !!(save.outfits || {})[it.id], worn = (save.wear || {})[it.slot] === it.id, sel = i === w.sel;
        const k = sel ? 1.1 + Math.sin(t * 0.15) * 0.04 : 1;
        const wx = sel && w.wiggle ? Math.sin(w.wiggle * 1.5) * 4 : 0;
        c.save(); c.translate(q.x + wx, q.y); c.scale(k, k);
        if (sel) G().drawGlow(0, 0, 58, '#fff1c2', 0.7, c);
        c.fillStyle = have ? '#ffffff' : '#e6e0ea'; c.strokeStyle = worn ? '#5fd48a' : sel ? '#ffb35c' : '#d8c8d8'; c.lineWidth = worn || sel ? 5 : 3;
        G().circle(0, 0, q.r, c); c.fill(); c.stroke();
        if (have) BB.Wardrobe.icon(c, it.id, 0, 0, 2.4, t);
        else {
          BB.Wardrobe.silhouette(c, it.id, 0, 0, 2.4);
          G().text('?', 0, 2, 26, '#b8a8c0', null);
        }
        if (worn) {
          c.fillStyle = '#5fd48a'; G().circle(q.r * 0.7, -q.r * 0.7, 11, c); c.fill();
          c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(q.r * 0.7 - 5, -q.r * 0.7); c.lineTo(q.r * 0.7 - 1, -q.r * 0.7 + 4); c.lineTo(q.r * 0.7 + 5, -q.r * 0.7 - 4); c.stroke();
        }
        c.restore();
      });
      // ✓ all done
      c.fillStyle = '#5fd48a'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      G().circle(DONE.x, DONE.y, DONE.r, c); c.fill(); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(DONE.x - 13, DONE.y + 1); c.lineTo(DONE.x - 3, DONE.y + 11); c.lineTo(DONE.x + 14, DONE.y - 10); c.stroke();
      c.restore();
    },

    // ──── Until the first trip out: a sparkle flies to the front door ────
    updateFirstExit() {
      const room = this.room, pl = this.pl, b = pl.body;
      if (!room.def.home || this.save.leftHome || this.intro || this.traveling || pl.state !== 'play') return;
      if (pl.idleT > 0 && pl.idleT % 150 === 90) {
        const d = BB.Links.doorSpot(0);
        this.orbs.push({ x0: b.x + b.w / 2, y0: b.y, x1: d.x, y1: d.y - 40, t: 0, dur: 70, col: '#ffe27a' });
        S().firefly();
      }
    },

    // ──── Batting the toys around the house ────
    updateHomeToys() {
      const room = this.room, b = this.pl.body;
      this.toyBounce = this.toyBounce || {};
      this.toyNear = this.toyNear || {};
      for (const toy of Object.keys(BB.Home.TOY_SPOTS)) {
        if (this.toyBounce[toy] > 0) this.toyBounce[toy] = Math.max(0, this.toyBounce[toy] - 0.025);
        if (!room.def.home || !this.save.toys[toy]) continue;
        const sp = BB.Home.toySpot(room, toy);
        const cx = b.x + b.w / 2, feet = b.y + b.h;
        const ty = sp.hang ? sp.y + 30 : sp.y - 12;
        const near = Math.abs(cx - sp.x) < 22 && Math.abs((sp.hang ? b.y + b.h / 2 : feet) - (sp.hang ? ty : sp.y)) < 26;
        if (near && !this.toyNear[toy] && this.pl.state === 'play') {
          this.toyBounce[toy] = 1;
          S().toySound(toy);
          for (let i = 0; i < 3; i++) PT().heart(sp.x + (Math.random() - 0.5) * 20, ty - 14);
          this.pl.happyT = Math.max(this.pl.happyT, 40);
        }
        if (near) this.toyNear[toy] = true;
        else if (Math.abs(cx - sp.x) > 44 || Math.abs(feet - sp.y) > 50) this.toyNear[toy] = false;
      }
    },
  });
})(window.BB);
