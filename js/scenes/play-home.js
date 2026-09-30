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
    // ──── Invited friends live in the neighbourhood ────
    // Visitors are separate from collectible critters: petting them or
    // reloading never awards another heart. Read actual earned friends so
    // older saves containing 1 instead of a species name work as well.
    refreshHomeVisitors() {
      const kinds = this.earnedFriendKinds().filter(kind => this.save.residents[kind]);
      const old = new Map((this.homeVisitors || []).map(v => [v.kind, v]));
      this.homeVisitors = kinds.map((kind, i) => {
        if (old.has(kind)) return old.get(kind);
        const room = BB.World.byId[['ng', 'np', 'nr'][i % 3]];
        const th = { tx: room.x + 4 + Math.floor(i / 3) * 2, ty: room.y + 30, ch: 'b' };
        const key = th.tx + ',' + th.ty;
        const visitor = BB.Bugs.create(th, room, { friends: { [key]: 1 } }, 0, kind);
        if (visitor.behavior === 'hop') visitor.y = visitor.homeY = (room.y + 31) * T - 16;
        // Different-sized visitors need their own floor probe. Keep the
        // original adventure critters' movement rules unchanged.
        visitor.footOffset = (room.y + 31) * T - visitor.y + 1;
        visitor.petNear = false;
        return visitor;
      });
    },

    updateHomeVisitors() {
      if (!['ng', 'np', 'nr'].includes(this.room.id)) return;
      const ctx = this.ctx(), b = this.pl.body, room = this.room;
      for (const visitor of this.homeVisitors) {
        if (visitor.room !== room.id) continue;
        BB.Bugs.update(visitor, ctx);
        const lo = room.px + 3 * T, hi = room.px + room.pw - 2 * T;
        if (visitor.x < lo || visitor.x > hi) {
          visitor.x = BB.clamp(visitor.x, lo, hi);
          visitor.facing = visitor.x === lo ? 1 : -1;
        }
        const near = this.pl.state === 'play' && Math.hypot(b.x + b.w / 2 - visitor.x, b.y + b.h / 2 - visitor.y) < 42;
        if (near && !visitor.petNear) {
          visitor.hopV = -3; visitor.danceT = 60;
          S().purr();
          for (let i = 0; i < 3; i++) PT().heart(visitor.x, visitor.y - 20);
          this.pl.happyT = Math.max(this.pl.happyT, 40);
        }
        if (near) visitor.petNear = true;
        else if (Math.hypot(b.x + b.w / 2 - visitor.x, b.y + b.h / 2 - visitor.y) > 80) visitor.petNear = false;
      }
    },

    drawHomeVisitors(c, cam, visible) {
      for (const visitor of this.homeVisitors) if (visible.some(r => r.id === visitor.room)) BB.Bugs.draw(c, visitor, cam);
    },

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
      if (this.mirrorLock) {
        if (Math.abs(b.x + b.w / 2 - mx) < 50 && Math.abs(b.y + b.h - my) < 40) { this.mirrorHold = 0; return; }
        this.mirrorLock = false;
      }
      const at = pl.state === 'play' && b.grounded && Math.abs(b.x + b.w / 2 - mx) < 18 && Math.abs(b.y + b.h - my) < 6 && Math.abs(b.vx) < 0.3;
      this.mirrorHold = at ? (this.mirrorHold || 0) + 1 : Math.max(0, (this.mirrorHold || 0) - 3);
      if (this.mirrorHold >= BB.Links.HOLD) { this.mirrorHold = 0; this.openWardrobe(); }
    },

    openWardrobe() {
      BB.Economy.milestones(this.save);
      const list = BB.Wardrobe.LIST.filter(a => a.stars), wear = this.save.wear || {};
      let sel = list.findIndex(a => wear[a.slot] === a.id);
      if (sel < 0) sel = 0;
      this.wardrobe = { sel, tab: 0, focus: 'items', t: 0, wiggle: 0 };
      this.save.wardrobeNew = 0;
      this.save.used = this.save.used || {}; this.save.used.mirror = 1;
      this.pl.state = 'wardrobe'; this.pl.body.vx = 0;
      BB.Input.takePointers();
      S().select();
    },

    wardrobeItems() {
      const tab = this.wardrobe.tab;
      if (tab === 1) return BB.Cosmetics.LIST;
      if (tab === 3) return BB.GardenMaze.CATS.map(id => ({ id, name: BB.CATS[id].name, slot: 'cat' }));
      return BB.Wardrobe.LIST.filter(a => tab === 0 ? !!a.stars : !!a.boss && !!this.save.outfits[a.id]);
    },

    wardrobeTabs() { return this.save.mazeSolved ? 4 : 3; },
    wardrobeTabX(i) { return 505 + i * (this.wardrobeTabs() === 4 ? 100 : 116); },

    wardrobeTab(tab) {
      const tabs = this.wardrobeTabs();
      this.wardrobe.tab = (tab + tabs) % tabs; this.wardrobe.sel = 0;
      S().select();
    },

    closeWardrobe() {
      this.wardrobe = null;
      this.pl.state = 'play'; this.pl.idleT = 0; this.pl.happyT = 60;
      this.mirrorHold = -40; // (step away before it opens again)
      this.mirrorLock = true;
      BB.Save.write();
      S().confirm();
    },

    // put on / take off
    toggleOutfit(i) {
      const a = this.wardrobeItems()[i], w = this.wardrobe;
      if (!a) return;
      w.sel = i;
      if (a.slot === 'cat') { this.chooseMazeCat(a.id); return; }
      const style = w.tab === 1;
      BB.Economy.milestones(this.save);
      if (!BB.Economy.unlocked(this.save, a)) { w.wiggle = 20; S().hmph(); return; }
      if (style) {
        this.save.cosmetics[a.slot] = a.value; S().outfit();
      } else {
        this.save.outfits[a.id] = 1;
        this.save.wear = this.save.wear || {};
        if (this.save.wear[a.slot] === a.id) { this.save.wear[a.slot] = null; S().pop(1); }
        else { this.save.wear[a.slot] = a.id; S().outfit(); PT().burst('spark', this.pl.body.x + 10, this.pl.body.y, 10, { color: '#ffe0f0', speed: 2, life: 28 }); }
      }
      BB.Save.write();
    },

    updateWardrobe() {
      const I = BB.Input, w = this.wardrobe;
      w.t++;
      if (w.wiggle > 0) w.wiggle--;
      if (w.t < 8) return;
      if (I.pressed.pause || I.pressed.back || I.pressed.map) return this.closeWardrobe();
      const n = this.wardrobeItems().length;
      if (w.focus === 'tabs') {
        if (I.pressed.left) this.wardrobeTab(w.tab - 1);
        if (I.pressed.right) this.wardrobeTab(w.tab + 1);
        if (I.pressed.down || (!I.pressed.up && (I.pressed.confirm || I.pressed.bubble || I.pressed.jump))) { w.focus = 'items'; S().select(); }
      } else {
        if (I.pressed.left && n) { w.sel = (w.sel + n - 1) % n; S().select(); }
        if (I.pressed.right && n) { w.sel = (w.sel + 1) % n; S().select(); }
        if (I.pressed.up) { if (w.sel < 4 || !n) w.focus = 'tabs'; else w.sel -= 4; S().select(); }
        if (n && I.pressed.down) { w.sel = Math.min(n - 1, w.sel + 4); S().select(); }
        if (!I.pressed.up && !I.pressed.down && !I.pressed.left && !I.pressed.right && (I.pressed.jump || I.pressed.bubble || I.pressed.confirm)) this.toggleOutfit(w.sel);
      }
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - DONE.x, p.y - DONE.y) < DONE.r + 10) return this.closeWardrobe();
        for (let i = 0; i < this.wardrobeTabs(); i++) if (Math.hypot(p.x - this.wardrobeTabX(i), p.y - 88) < 32) { this.wardrobeTab(i); w.focus = 'items'; return; }
        for (let i = 0; i < this.wardrobeItems().length; i++) { const q = cell(i); if (Math.hypot(p.x - q.x, p.y - q.y) < q.r + 8) { if (w.sel === i && w.focus === 'items') this.toggleOutfit(i); else { w.sel = i; w.focus = 'items'; S().select(); } break; } }
      }
    },

    drawWardrobe(c, t) {
      const w = this.wardrobe, save = this.save, list = this.wardrobeItems();
      const selected = list[w.sel];
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
      const previewWear = Object.assign({}, save.wear);
      if (w.tab === 0 || w.tab === 2) if (selected) previewWear[selected.slot] = selected.id;
      BB.Kittens.draw(c, w.tab === 3 && selected ? selected.id : this.pl.cat, { mode: 'sit', happy: true, t, wear: previewWear }, MIRROR.x + 6, MIRROR.y + 118, 5.2, 1);
      c.restore();
      // Picture tabs: extra outfits, bubble / trail styles, earned gifts.
      for (let i = 0; i < this.wardrobeTabs(); i++) {
        const x = this.wardrobeTabX(i);
        c.fillStyle = i === w.tab ? '#ffe7ad' : '#ffffff'; c.strokeStyle = '#d8c8d8'; c.lineWidth = 2;
        G().circle(x, 88, 26, c); c.fill(); c.stroke();
        if (i === w.tab && w.focus === 'tabs') { c.strokeStyle = '#ffb35c'; c.lineWidth = 4; G().circle(x, 88, 32, c); c.stroke(); }
        if (i === 0) BB.Wardrobe.icon(c, 'partyhat', x, 88, 1.6, t);
        if (i === 1) BB.Cosmetics.icon(c, BB.Cosmetics.LIST[1], x, 88, 1.15, t);
        if (i === 2) { c.fillStyle = '#b99cff'; G().rrect(x - 12, 78, 24, 22, 3, c); c.fill(); c.fillStyle = '#ffe066'; c.fillRect(x - 2, 76, 4, 25); c.fillRect(x - 14, 80, 28, 4); }
        if (i === 3) BB.Kittens.draw(c, 'rainbow', { mode: 'sit', t }, x, 102, 0.9, 1);
      }
      // Locked items can be previewed; stars are never spent.
      if (w.tab === 1 && selected) BB.Cosmetics.icon(c, selected, MIRROR.x + 8, MIRROR.y - 68, 2, t);
      c.fillStyle = '#ffd84a'; G().star(244, 85, 10, 5, 0.5, -Math.PI / 2, c); c.fill();
      G().text(String(BB.Economy.balance(save, 'stars')), 287, 85, 23, '#795830', null, 'center', c);
      // Every milestone stays visible; unlocked choices glow.
      list.forEach((it, i) => {
        const style = w.tab === 1;
        const q = cell(i), have = it.slot === 'cat' ? save.mazeSolved : BB.Economy.unlocked(save, it);
        const worn = it.slot === 'cat' ? save.cat === it.id : style ? save.cosmetics[it.slot] === it.value : (save.wear || {})[it.slot] === it.id, sel = i === w.sel && w.focus === 'items';
        const afford = have;
        const k = sel ? 1.1 + Math.sin(t * 0.15) * 0.04 : 1;
        const wx = sel && w.wiggle ? Math.sin(w.wiggle * 1.5) * 4 : 0;
        c.save(); c.translate(q.x + wx, q.y); c.scale(k, k);
        if (afford && (sel || !have)) G().drawGlow(0, 0, 48, '#fff1c2', sel ? 0.7 : 0.4, c);
        c.fillStyle = '#ffffff'; c.strokeStyle = worn ? '#5fd48a' : sel ? '#ffb35c' : '#d8c8d8'; c.lineWidth = worn || sel ? 5 : 3;
        G().circle(0, 0, q.r, c); c.fill(); c.stroke();
        if (it.slot === 'cat') BB.Kittens.draw(c, it.id, { mode: 'sit', happy: true, t }, 0, 22, 1.4, 1);
        else if (style) BB.Cosmetics.icon(c, it, 0, 0, 1.65, t);
        else BB.Wardrobe.icon(c, it.id, 0, 0, 2.4, t);
        if (!have) {
          c.strokeStyle = '#aaa0b4'; c.lineWidth = 2; G().rrect(19, 19, 13, 11, 3, c); c.stroke();
          c.beginPath(); c.arc(25.5, 19, 4, Math.PI, 0); c.stroke();
        }
        if (worn) {
          c.fillStyle = '#5fd48a'; G().circle(q.r * 0.7, -q.r * 0.7, 11, c); c.fill();
          c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(q.r * 0.7 - 5, -q.r * 0.7); c.lineTo(q.r * 0.7 - 1, -q.r * 0.7 + 4); c.lineTo(q.r * 0.7 + 5, -q.r * 0.7 - 4); c.stroke();
        }
        c.restore();
      });
      const next = BB.Economy.milestones(save), total = BB.Economy.balance(save, 'stars');
      G().text(selected ? selected.name : 'Boss presents', 625, 351, 18, '#795830', null, 'center', c);
      const target = selected && selected.slot !== 'cat' && !BB.Economy.unlocked(save, selected) ? selected : next;
      const bx = 467, by = 392, bw = 242;
      c.fillStyle = '#e8deea'; G().rrect(bx, by, bw, 15, 7, c); c.fill();
      c.fillStyle = '#ffd665'; G().rrect(bx, by, bw * (target ? Math.min(1, total / target.stars) : 1), 15, 7, c); c.fill();
      G().text(target ? `${target.stars - total} stars to ${target.name}` : 'All star rewards unlocked!', 588, 426, 16, '#795830', null, 'center', c);
      G().text('↑ categories   ← → choose   ↓ items', 620, 469, 15, '#998097', null, 'center', c);
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
