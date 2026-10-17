// ════════════════════════════════════════════════════════════════
//  PAUSE — six big picture buttons: keep playing ▶, sound 🔊, kingdom
//  map 🗺, sticker book 📖, two kittens 🐱🐱 (a friend plays along, or
//  stops) and home 🏠 (back to the title screen). The sticker book has a
//  page for each zone: a sticker for every kind of critter living there
//  (in colour once you've made friends with one), the zone's boss and its
//  hidden toy. Flip with ◀ ▶, close with ✕. The map shows
//  every room you've visited in its biome colour, a star on rooms
//  whose sparkles are all found, and your kitten's face where you are.
//  It stays zoomed in; browse it with ◀ ▶ (▲ ▼) held down, by dragging, or
//  with its arrow buttons, and close it with ✕ (or jump / bubble / Esc / M).
//  It is the game's one map: the map button (or M / Tab / Select) during
//  play opens the very same map, and closing it then goes straight back
//  to playing.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;
  const BUTTONS = ['resume', 'sound', 'map', 'book', 'duo', 'home'];
  const NB = BUTTONS.length;
  const COLORS = { resume: '#5fd48a', sound: '#5fb8ff', map: '#ffb35c', book: '#c890ff', duo: '#7cc8ff', home: '#ff8fb8' };

  BB.Pause = {
    t: 0, focus: 0, map: false, fromPlay: false,
    enter() { this.t = 0; this.focus = 0; this.map = false; this.book = null; this.fromPlay = false; BB.Music.setMood({ paused: true }); },
    // the map straight from play (map button, M / Tab / Select)
    openMap() {
      BB.Main.go('pause');
      this.fromPlay = true; this.focus = 2;
      this.map = true; this.t = 0; this.drag = null; this.holdT = 0; BB.MapView.openFull();
      BB.Audio.sfx.select();
    },
    closeMap() {
      this.map = false; this.t = 0; this.drag = null; BB.Audio.sfx.select();
      if (this.fromPlay) { this.leave(); BB.Main.go('play-resume'); }
    },
    leave() { BB.Music.setMood({ energy: 0.3 }); },

    pos(i) { return { x: G().W / 2 + (i - (NB - 1) / 2) * 140, y: G().H / 2 + 20 }; },

    activate(i) {
      const b = BUTTONS[i];
      BB.Audio.sfx.select();
      if (b === 'resume') { this.leave(); BB.Main.go('play-resume'); }
      else if (b === 'sound') BB.Audio.toggle();
      else if (b === 'map') { this.map = true; this.t = 0; this.drag = null; this.holdT = 0; BB.MapView.openFull(); }
      else if (b === 'book') { const z = BB.Play.room ? BB.Play.room.zone : 0; this.book = { page: z === BB.HOME_ZONE ? 0 : Math.max(0, this.bookPages().indexOf(z)), t: 0, flip: 0 }; }
      else if (b === 'duo') { if (BB.Play.pl2) BB.Play.leaveP2(); else BB.Play.joinP2(); this.leave(); BB.Main.go('play-resume'); }
      else if (b === 'home') { this.leave(); BB.Play.writeSave(); BB.Play.pl2 = null; BB.Input.split = false; BB.Main.go('title'); }
    },

    update() {
      this.t++;
      G().t++;
      const I = BB.Input;
      const taps = I.takePointers();
      if (this.map) return this.updateMap(I, taps);
      if (this.book) return this.updateBook(I, taps);
      if (I.pressed.pause || I.pressed.back) { this.leave(); BB.Main.go('play-resume'); return; }
      if (I.pressed.map) { this.focus = 2; this.activate(2); return; }
      if (I.pressed.left) { this.focus = (this.focus + NB - 1) % NB; BB.Audio.sfx.select(); }
      if (I.pressed.right) { this.focus = (this.focus + 1) % NB; BB.Audio.sfx.select(); }
      if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) this.activate(this.focus);
      for (const p of taps) {
        for (let i = 0; i < NB; i++) {
          const q = this.pos(i);
          if (Math.hypot(p.x - q.x, p.y - q.y) < 56) { this.focus = i; this.activate(i); }
        }
      }
    },

    draw(c) {
      BB.Play.draw(c);
      c.fillStyle = 'rgba(25,15,45,0.6)'; c.fillRect(0, 0, G().W, G().H);
      if (this.map) return this.drawMap(c);
      if (this.book) return this.drawBook(c);
      const t = this.t;
      for (let i = 0; i < NB; i++) {
        const q = this.pos(i), on = i === this.focus;
        const k = on ? 1.12 + Math.sin(t * 0.1) * 0.04 : 1;
        c.save(); c.translate(q.x, q.y); c.scale(k, k);
        if (on) G().drawGlow(0, 0, 90, '#fff4c2', 0.6, c);
        c.fillStyle = COLORS[BUTTONS[i]]; c.strokeStyle = '#ffffff'; c.lineWidth = 5;
        G().circle(0, 0, 46, c); c.fill(); c.stroke();
        c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
        const b = BUTTONS[i];
        if (b === 'resume') { c.beginPath(); c.moveTo(-12, -18); c.lineTo(20, 0); c.lineTo(-12, 18); c.closePath(); c.fill(); }
        else if (b === 'sound') {
          c.beginPath(); c.moveTo(-20, -8); c.lineTo(-10, -8); c.lineTo(2, -18); c.lineTo(2, 18); c.lineTo(-10, 8); c.lineTo(-20, 8); c.closePath(); c.fill();
          if (BB.Audio.muted) { c.beginPath(); c.moveTo(10, -9); c.lineTo(24, 9); c.moveTo(24, -9); c.lineTo(10, 9); c.stroke(); }
          else { c.beginPath(); c.arc(4, 0, 10, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(4, 0, 19, -0.8, 0.8); c.stroke(); }
        } else if (b === 'map') {
          c.beginPath(); c.moveTo(-22, -14); c.lineTo(-8, -20); c.lineTo(8, -14); c.lineTo(22, -20); c.lineTo(22, 16); c.lineTo(8, 22); c.lineTo(-8, 16); c.lineTo(-22, 22); c.closePath(); c.fill();
          c.fillStyle = '#ffb35c'; G().heart(4, 2, 8, c); c.fill();
        } else if (b === 'book') {
          // an open book with a heart and a star sticker
          c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(-12, -20, -24, -14); c.lineTo(-24, 16); c.quadraticCurveTo(-12, 10, 0, 18); c.quadraticCurveTo(12, 10, 24, 16); c.lineTo(24, -14); c.quadraticCurveTo(12, -20, 0, -12); c.closePath(); c.fill();
          c.strokeStyle = COLORS.book; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 17); c.stroke();
          c.fillStyle = '#ff7eb6'; G().heart(-12, 0, 6, c); c.fill();
          c.fillStyle = '#ffd84a'; G().star(12, 0, 6, 5, 0.5, -Math.PI / 2, c); c.fill();
        } else if (b === 'duo') {
          // two kitten faces side by side (a heart between them while both play)
          for (const [dx, col] of [[-12, '#ffffff'], [12, '#ffe8c8']]) {
            c.fillStyle = col;
            c.beginPath(); c.moveTo(dx - 11, -2); c.lineTo(dx - 10, -17); c.lineTo(dx - 3, -10); c.lineTo(dx + 3, -10); c.lineTo(dx + 10, -17); c.lineTo(dx + 11, -2); c.closePath(); c.fill();
            G().circle(dx, 2, 11, c); c.fill();
            c.fillStyle = '#5a6a9a'; G().circle(dx - 4, 1, 1.8, c); c.fill(); G().circle(dx + 4, 1, 1.8, c); c.fill();
          }
          if (BB.Play.pl2) { c.fillStyle = '#ff7eb6'; G().heart(0, 17, 7, c); c.fill(); }
          else { c.fillStyle = '#ffffff'; c.fillRect(-2, 13, 4, 12); c.fillRect(-6, 17, 12, 4); }
        } else if (b === 'home') {
          c.beginPath(); c.moveTo(-22, 0); c.lineTo(0, -20); c.lineTo(22, 0); c.lineTo(15, 0); c.lineTo(15, 18); c.lineTo(-15, 18); c.lineTo(-15, 0); c.closePath(); c.fill();
          c.fillStyle = '#ff8fb8'; G().rrect(-5, 5, 10, 13, 3, c); c.fill();
        }
        c.restore();
      }
      G().text('AI-generated story voices', G().W / 2, G().H - 24, 12, '#e2d6ec', null, 'center', c);
    },

    // browsing the kingdom map
    updateMap(I, taps) {
      const M = BB.MapView;
      const close = () => this.closeMap();
      M.tick();
      // (▲ is also "jump" on the keyboard, so jump alone doesn't close the map)
      if (this.t > 8 && (I.pressed.confirm || I.pressed.bubble || I.pressed.back || I.pressed.pause || I.pressed.map)) return close();
      const sp = 10 / M.zoom();
      if (I.held.left) M.pan(-sp, 0);
      if (I.held.right) M.pan(sp, 0);
      if (I.held.up) M.pan(0, -sp);
      if (I.held.down) M.pan(0, sp);
      for (const p of taps) if (M.tapFull(p) === 'close') return close();
      // drag the map around, or hold an arrow button to keep scrolling
      const pd = I.pointerDown;
      const on = pd ? M.controlAt(pd) : null;
      if (pd && (on === 'left' || on === 'right')) {
        if (++this.holdT > 14) M.pan((on === 'left' ? -1 : 1) * sp * 1.5, 0);
      } else this.holdT = 0;
      if (pd && !on) {
        if (this.drag) M.pan(-(pd.x - this.drag.x) / M.zoom(), -(pd.y - this.drag.y) / M.zoom());
        this.drag = { x: pd.x, y: pd.y };
      } else this.drag = null;
    },

    drawMap(c) { BB.MapView.draw(c, 'full', this.t); },

    // ──── The sticker book ────
    bookPages() { return BB.ZONES.map((z, i) => i).filter(i => i !== BB.HOME_ZONE); },

    updateBook(I, taps) {
      const bk = this.book, pages = this.bookPages();
      bk.t++;
      if (bk.flip) bk.flip = BB.approach(bk.flip, 0, 0.12);
      const close = () => { this.book = null; this.t = 0; BB.Audio.sfx.select(); };
      const turn = d => { bk.page = (bk.page + d + pages.length) % pages.length; bk.flip = d; BB.Audio.sfx.whoosh(); };
      if (bk.t > 8 && (I.pressed.confirm || I.pressed.bubble || I.pressed.back || I.pressed.pause)) return close();
      if (I.pressed.left) turn(-1);
      if (I.pressed.right) turn(1);
      for (const p of taps) {
        if (Math.hypot(p.x - (G().W / 2 + 360), p.y - 100) < 34) return close();
        if (p.x < 110) turn(-1);
        else if (p.x > G().W - 110 && p.y > 110) turn(1);
      }
    },

    drawBook(c) {
      const bk = this.book, t = this.t, W0 = G().W, H0 = G().H;
      const save = BB.Play.save, z = this.bookPages()[bk.page], Z = BB.ZONES[z];
      const rooms = BB.World.rooms.filter(r => r.zone === z);
      // who did you make friends with in this zone?
      const friends = {};
      for (const key in save.friends) {
        const [tx, ty] = key.split(',').map(Number);
        const r = BB.World.roomAtTile(tx, ty);
        if (r && r.zone === z) friends[save.friends[key]] = 1;
      }
      const kinds = [];
      for (const k of (Z.cast.b || []).concat(Z.cast.c || [])) if (!kinds.includes(k)) kinds.push(k);
      const arena = rooms.find(r => r.def.arena);
      const boss = arena ? (arena.def.boss || 'king') : null, bossHappy = arena && save.bosses[arena.id];
      const toyRoom = rooms.find(r => r.def.toy), toy = toyRoom && toyRoom.def.toy;

      const slide = bk.flip * 60;
      c.save();
      c.translate(-slide, 0);
      c.globalAlpha = 1 - Math.abs(bk.flip) * 0.6;
      // the book: two cream pages with a spine
      const bx = W0 / 2, by = H0 / 2 + 10, pw = 380, ph = 400;
      c.fillStyle = 'rgba(0,0,0,0.25)'; G().rrect(bx - pw - 6, by - ph / 2 + 10, pw * 2 + 12, ph, 26, c); c.fill();
      c.fillStyle = BB.mix(Z.accent || '#ffd1e8', '#ffffff', 0.4); G().rrect(bx - pw - 10, by - ph / 2 - 8, pw * 2 + 20, ph + 16, 28, c); c.fill();
      for (const d of [-1, 1]) {
        c.fillStyle = '#fffaf0';
        G().rrect(d < 0 ? bx - pw : bx + 4, by - ph / 2, pw - 4, ph, 20, c); c.fill();
      }
      c.fillStyle = 'rgba(120,90,60,0.25)'; c.fillRect(bx - 3, by - ph / 2 + 10, 6, ph - 20);
      // left page: the zone, its boss and toy
      const lx = bx - pw / 2;
      BB.HUD.zoneIcon(c, z, lx, by - 140, 1.8);
      G().text(Z.name, lx, by - 90, 26, '#6a4a7a', null);
      if (boss) {
        c.save(); if (!bossHappy) c.globalAlpha *= 0.22;
        BB.BossArt.draw(c, boss, lx - 70, by + 30, 1.25, { t, mood: 0, facing: 1, pose: bossHappy ? 'dance' : 'sulk', blink: 0 });
        c.restore();
        if (!bossHappy) G().text('?', lx - 70, by + 20, 40, '#b8a8c8', null);
        else { BB.Critters.rainbow(c, lx - 70, by - 40, 1, 0.8); }
      }
      if (toy) {
        const got = save.toys && save.toys[toy];
        c.save(); if (!got) c.globalAlpha *= 0.22;
        BB.HUD.toyIcon(c, toy, lx + 90, by + 40, 2.2, t);
        c.restore();
        if (!got) G().text('?', lx + 90, by + 40, 34, '#b8a8c8', null);
      }
      // right page: a sticker per critter kind
      const rx = bx + pw / 2, cols = kinds.length > 4 ? 3 : 2;
      let got = 0;
      kinds.forEach((k, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = rx + (col - (cols - 1) / 2) * 112, y = by - 90 + row * 130;
        const has = !!friends[k];
        if (has) got++;
        c.save();
        c.translate(x, y);
        c.rotate((BB.hash(z, i, 9) - 0.5) * 0.18);
        c.fillStyle = has ? '#ffffff' : '#f1ece6'; c.strokeStyle = has ? '#ffcf5c' : '#ddd4cc'; c.lineWidth = 3;
        G().rrect(-48, -50, 96, 100, 18, c); c.fill(); c.stroke();
        if (has) G().drawGlow(0, 0, 50, '#fff4c2', 0.5, c);
        c.globalAlpha *= has ? 1 : 0.2;
        BB.Critters.drawBug(c, k, 0, 6, { t: t + i * 30, mood: 0, facing: 1, joy: has && (t + i * 40) % 160 < 50, scale: 1.7, noCloud: true, blink: 0 });
        c.restore();
        if (!has) G().text('?', x, y - 4, 34, '#c0b4c8', null);
        else { c.fillStyle = '#ff7eb6'; G().heart(x + 34, y - 36, 8, c); c.fill(); }
      });
      // how many friends on this page
      c.fillStyle = '#ff7eb6'; c.strokeStyle = '#b8407a'; c.lineWidth = 2;
      G().heart(rx - 30, by + ph / 2 - 36, 13, c); c.fill(); c.stroke();
      G().text(got + ' / ' + kinds.length, rx + 20, by + ph / 2 - 36, 26, got === kinds.length ? '#d8407a' : '#8a6a7a', null);
      if (got === kinds.length && kinds.length) for (let i = 0; i < 3; i++) { c.fillStyle = '#ffd84a'; G().star(rx + 80 + i * 22, by + ph / 2 - 38, 9, 5, 0.5, -Math.PI / 2 + t * 0.02, c); c.fill(); }
      c.restore();
      // page dots, arrows and ✕
      const pages = this.bookPages();
      pages.forEach((p, i) => { c.fillStyle = i === bk.page ? '#ffffff' : 'rgba(255,255,255,0.35)'; G().circle(W0 / 2 + (i - (pages.length - 1) / 2) * 16, H0 - 26, i === bk.page ? 5 : 3.5, c); c.fill(); });
      const pulse = 1 + Math.sin(t * 0.12) * 0.06;
      for (const d of [-1, 1]) {
        const ax = d < 0 ? 50 : W0 - 50, ay = H0 / 2 + 10;
        c.save(); c.translate(ax, ay); c.scale(pulse, pulse);
        c.fillStyle = 'rgba(255,255,255,0.9)'; G().circle(0, 0, 30, c); c.fill();
        c.strokeStyle = '#9a7ac8'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-d * 6, -12); c.lineTo(d * 8, 0); c.lineTo(-d * 6, 12); c.stroke();
        c.restore();
      }
      // ✕ in the book's top corner (clear of the map & pause buttons)
      const cx = W0 / 2 + 360, cy = 100;
      c.fillStyle = '#ffffff'; c.strokeStyle = '#e8c8d8'; c.lineWidth = 2; G().circle(cx, cy, 24, c); c.fill(); c.stroke();
      c.strokeStyle = '#d06a8a'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 9, cy - 9); c.lineTo(cx + 9, cy + 9); c.moveTo(cx + 9, cy - 9); c.lineTo(cx - 9, cy + 9); c.stroke();
    },

  };
})(window.BB);
