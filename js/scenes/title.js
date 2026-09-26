// ════════════════════════════════════════════════════════════════
//  TITLE — both kittens snoozing on a sunny hill while bubbles drift
//  up, and two big picture buttons:
//    ▶  CONTINUE — jump straight back into the saved adventure (greyed
//                  out when there isn't one yet)
//    🌱 NEW GAME — pick a kitten and start fresh; if an adventure is
//                  saved, a picture "erase it?" check (✓ / ✗) comes first
//  Keyboard / gamepad: ◀ ▶ to choose, jump to press. Taps work too.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = () => BB.G;

  // shared bits for the menu scenes
  const UI = BB.UI = {
    bubbles: [],
    tickBubbles() {
      if (this.bubbles.length < 18 && Math.random() < 0.08) {
        this.bubbles.push({ x: Math.random() * G().W, y: G().H + 20, r: 6 + Math.random() * 16, v: 0.4 + Math.random() * 0.8, ph: Math.random() * 6, tint: BB.pick(['#d8b8ff', '#ffc6e6', '#ffd27a', '#a8f0c8', '#9fe8ff']) });
      }
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y -= b.v; b.ph += 0.02;
        if (b.y < -40) this.bubbles.splice(i, 1);
      }
    },
    drawBubbles(c) {
      for (const b of this.bubbles) G().bubble(b.x + Math.sin(b.ph) * 12, b.y, b.r, b.tint, 0.85, c);
    },
    // soft meadow hill scene used behind title & select
    drawScenery(c, t, zone = 0) {
      const cam = { x: t * 0.4, y: 0 };
      BB.Backdrops.draw(c, cam, zone, null, 0, G().H, t);
      const Z = BB.ZONES[zone];
      c.fillStyle = Z.topDark;
      c.beginPath(); c.ellipse(G().W / 2, G().H + 150, G().W * 0.75, 260, 0, Math.PI, 0); c.fill();
      c.fillStyle = Z.top;
      c.beginPath(); c.ellipse(G().W / 2, G().H + 160, G().W * 0.72, 250, 0, Math.PI, 0); c.fill();
      for (let i = 0; i < 14; i++) {
        const fx = 90 + i * 60 + Math.sin(i * 7) * 20;
        const fy = G().H - 60 - Math.sin((fx / G().W) * Math.PI) * 170 + 170 - 40;
        if (fy < G().H - 5) BB.Tiles.flower(c, fx, fy + 30, ['#ff9ec7', '#ffe066', '#ffffff', '#c9a6ff'][i % 4], 1.5);
      }
    },
    logo(c, t, y = 120) {
      const cx = G().W / 2;
      const wob = Math.sin(t * 0.03) * 3;
      c.save();
      c.translate(cx, y + wob);
      c.rotate(Math.sin(t * 0.02) * 0.015);
      const NAME = 'Bubble Paws';
      c.font = `900 92px ${G().FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const half = c.measureText(NAME).width / 2;
      c.lineWidth = 22; c.strokeStyle = '#4a2a6a'; c.strokeText(NAME, 0, 0);
      c.lineWidth = 10; c.strokeStyle = '#ffffff'; c.strokeText(NAME, 0, 0);
      const g = c.createLinearGradient(0, -45, 0, 45);
      g.addColorStop(0, '#ffd6f0'); g.addColorStop(0.5, '#c9a6ff'); g.addColorStop(1, '#7cc8ff');
      c.fillStyle = g; c.fillText(NAME, 0, 0);
      // a bubble floating off the B, and a little paw print by the s
      G().bubble(-half - 22, -38, 16, '#ffffff', 0.9, c);
      G().bubble(-half - 4, -64 - Math.abs(Math.sin(t * 0.04)) * 6, 8, '#ffffff', 0.9, c);
      UI.paw(c, half + 34, 26, 1.25, Math.sin(t * 0.05) * 0.15);
      c.restore();
      // the subtitle sits on a tiny rainbow
      const sy = y + 72 + wob * 0.5;
      c.save(); c.lineWidth = 5; c.globalAlpha = 0.75;
      ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
        c.strokeStyle = col; c.beginPath(); c.arc(cx, sy + 330, 342 - i * 5, Math.PI * 1.35, Math.PI * 1.65); c.stroke();
      });
      c.restore();
      G().text('The Rainbow Kingdom', cx, sy, 30, '#fff8e8', 'rgba(74,42,106,0.85)');
    },
    // a chubby pink paw print (toe beans!)
    paw(c, x, y, s, rot = 0) {
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
      c.fillStyle = '#ffb3cf'; c.strokeStyle = '#4a2a6a'; c.lineWidth = 3;
      G().ellipse(0, 6, 13, 10.5, 0, c); c.fill(); c.stroke();
      for (const [tx, ty, r] of [[-13, -7, 5.2], [-5, -15, 5.6], [5, -15, 5.6], [13, -7, 5.2]]) { G().circle(tx, ty, r, c); c.fill(); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.7)'; G().ellipse(-4, 2, 4, 2.4, -0.3, c); c.fill();
      c.restore();
    },
    playButton(c, x, y, r, t, lit) {
      const k = 1 + Math.sin(t * 0.08) * 0.06 + (lit ? 0.1 : 0);
      G().drawGlow(x, y, r * 2.4, '#fff4c2', 0.6, c);
      c.save(); c.translate(x, y); c.scale(k, k);
      c.fillStyle = '#5fd48a'; c.strokeStyle = '#ffffff'; c.lineWidth = 6;
      G().circle(0, 0, r, c); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(-r * 0.28, -r * 0.42); c.lineTo(r * 0.48, 0); c.lineTo(-r * 0.28, r * 0.42); c.closePath(); c.fill();
      c.restore();
    },
  };

  const G_ = () => BB.G;
  const S = () => BB.Audio.sfx;

  BB.Title = {
    t: 0, focus: 0, confirm: null, hasSave: false, summary: null,

    enter() {
      this.t = 0; this.confirm = null; this.leaving = false;
      this.hasSave = BB.Save.exists() && BB.Save.load();
      this.summary = this.hasSave ? {
        cat: BB.Save.data.cat,
        stars: BB.Save.count(BB.Save.data.sparkles),
        hearts: BB.Save.count(BB.Save.data.friends),
        family: BB.Save.count(BB.Save.data.family || {}),
      } : null;
      this.focus = this.hasSave ? 0 : 1;
      BB.Music.play('lullaby');
    },

    // button layout (logical px)
    btn(i) { return { x: G_().W / 2 + (i === 0 ? -120 : 120), y: 330, r: 62 }; },
    cbtn(i) { return { x: G_().W / 2 + (i === 0 ? -95 : 95), y: 372, r: 46 }; }, // confirm: 0 = ✓ erase, 1 = ✗ keep

    choose(i) {
      if (this.leaving) return;
      if (i === 0) {
        if (!this.hasSave) { S().hmph(); return; }
        this.leaving = true;
        S().confirm();
        BB.Main.go('play', { cat: BB.Save.data.cat, resume: true });
      } else {
        S().select();
        if (this.hasSave) { this.confirm = { t: 0, focus: 1 }; return; }
        this.startFresh();
      }
    },

    startFresh() {
      this.leaving = true;
      BB.Save.reset();
      S().confirm();
      BB.Main.go('select');
    },

    update() {
      this.t++;
      G_().t++;
      UI.tickBubbles();
      const I = BB.Input;
      const taps = I.takePointers();
      BB.Input._anyKey = false;
      if (this.t < 15 || this.leaving) return;

      if (this.confirm) {
        const cf = this.confirm;
        cf.t++;
        if (I.pressed.left) { cf.focus = 0; S().select(); }
        if (I.pressed.right) { cf.focus = 1; S().select(); }
        if (I.pressed.back || I.pressed.pause) { this.confirm = null; S().select(); return; }
        if (cf.t > 10 && (I.pressed.jump || I.pressed.confirm || I.pressed.bubble)) {
          if (cf.focus === 0) this.startFresh(); else { this.confirm = null; S().select(); }
          return;
        }
        for (const p of taps) {
          for (let i = 0; i < 2; i++) {
            const b = this.cbtn(i);
            if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 8) {
              if (i === 0) this.startFresh(); else { this.confirm = null; S().select(); }
              return;
            }
          }
        }
        return;
      }

      if (I.pressed.left && this.focus !== 0) { this.focus = 0; S().select(); }
      if (I.pressed.right && this.focus !== 1) { this.focus = 1; S().select(); }
      if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) this.choose(this.focus);
      for (const p of taps) {
        for (let i = 0; i < 2; i++) {
          const b = this.btn(i);
          if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10) { this.focus = i; this.choose(i); }
        }
      }
    },

    draw(c) {
      const t = this.t;
      const G = G_();
      UI.drawScenery(c, t, 0);
      BB.Kittens.draw(c, 'marshmallow', { mode: 'sit', t, blink: (t % 240) < 8 ? 1 : 0, yawn: (t % 600) > 520 ? Math.sin(((t % 600) - 520) / 80 * Math.PI) : 0 }, G.W / 2 - 90, G.H - 60, 2.8, 1);
      BB.Kittens.draw(c, 'phoebe', { mode: 'sit', t: t + 50, blink: ((t + 90) % 260) < 8 ? 1 : 0, ear: (t % 170) < 12 ? Math.sin((t % 170) / 12 * Math.PI * 2) : 0 }, G.W / 2 + 90, G.H - 60, 2.8, -1);
      UI.drawBubbles(c);
      UI.logo(c, t, 110);
      this.drawContinue(c, t);
      this.drawNew(c, t);
      if (this.confirm) this.drawConfirm(c, t);
    },

    ring(c, b, col, on, t, dim) {
      const G = G_();
      const k = on ? 1.08 + Math.sin(t * 0.1) * 0.04 : 1;
      if (on && !dim) G.drawGlow(b.x, b.y, b.r * 2.3, '#fff4c2', 0.65, c);
      c.save(); c.translate(b.x, b.y); c.scale(k, k);
      c.fillStyle = dim ? '#b8b2c4' : col; c.strokeStyle = '#ffffff'; c.lineWidth = 7;
      G.circle(0, 0, b.r, c); c.fill(); c.stroke();
      return k;
    },

    // ▶ Continue: play arrow, the saved kitten peeking over, and its tallies
    drawContinue(c, t) {
      const G = G_(), b = this.btn(0), dim = !this.hasSave;
      c.save();
      if (dim) c.globalAlpha = 0.5;
      this.ring(c, b, '#5fd48a', this.focus === 0, t, dim);
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(-15, -24); c.lineTo(26, 0); c.lineTo(-15, 24); c.closePath(); c.fill();
      c.restore();
      if (this.summary) {
        BB.Kittens.draw(c, this.summary.cat, { mode: 'sit', t, happy: (t % 200) > 150 }, b.x - 58, b.y - 30, 1.5, 1);
        // the saved tallies, in a little pill beside the button
        const fam = this.summary.family;
        const w = fam ? 204 : 140, px = b.x - b.r - 14 - w, py = b.y + 22;
        c.fillStyle = 'rgba(30,20,50,0.45)'; G.rrect(px, py, w, 34, 17, c); c.fill();
        c.fillStyle = '#ffd84a'; G.star(px + 20, py + 17, 9, 5, 0.5, -Math.PI / 2, c); c.fill();
        G.text(String(this.summary.stars), px + 48, py + 18, 17, '#fff6d6', null);
        c.fillStyle = '#ff7eb6'; G.heart(px + 84, py + 19, 8, c); c.fill();
        G.text(String(this.summary.hearts), px + 112, py + 18, 17, '#ffe3f0', null);
        if (fam) {
          BB.MapView.catFace(c, px + 150, py + 18, 1.05, '#fff1dc', '#9a7a64');
          G.text(String(fam), px + 178, py + 18, 17, '#fff1dc', null);
        }
      }
      c.restore();
      c.globalAlpha = 1;
    },

    // 🌱 New Game: a little sprout with a sparkle
    drawNew(c, t) {
      const G = G_(), b = this.btn(1);
      this.ring(c, b, '#ff8fb8', this.focus === 1, t, false);
      c.fillStyle = '#8a5a34'; G.rrect(-16, 8, 32, 22, 6, c); c.fill();
      c.fillStyle = '#b07a4a'; G.rrect(-19, 4, 38, 8, 4, c); c.fill();
      const sway = Math.sin(t * 0.06) * 0.1;
      c.save(); c.rotate(sway);
      c.strokeStyle = '#3f8f35'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 5); c.lineTo(0, -18); c.stroke();
      c.fillStyle = '#8fe388';
      G.ellipse(-12, -20, 13, 7, 0.5, c); c.fill();
      G.ellipse(12, -26, 13, 7, -0.5, c); c.fill();
      c.restore();
      c.fillStyle = '#fff6c2';
      G.twinkle(24, -30, 7 + Math.sin(t * 0.15) * 2, c); c.fill();
      c.restore();
    },

    // "Erase the saved adventure?"  — ✓ start fresh / ✗ keep it
    drawConfirm(c, t) {
      const G = G_(), cf = this.confirm;
      const a = Math.min(1, cf.t / 10);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(25,15,45,0.55)'; c.fillRect(0, 0, G.W, G.H);
      c.fillStyle = '#fff6de'; c.strokeStyle = '#d9a95a'; c.lineWidth = 6;
      G.rrect(G.W / 2 - 230, 170, 460, 280, 34, c); c.fill(); c.stroke();
      // the adventure that would be erased, with a gentle "poof" cloud over it
      const s = this.summary;
      BB.Kittens.draw(c, s.cat, { mode: 'sit', t, blink: (t % 160) < 8 ? 1 : 0 }, G.W / 2 - 40, 280, 1.8, 1);
      c.fillStyle = '#ffd84a'; G.star(G.W / 2 + 30, 232, 11, 5, 0.5, -Math.PI / 2, c); c.fill();
      G.text(String(s.stars), G.W / 2 + 70, 233, 22, '#8a5a14', null);
      c.fillStyle = '#ff7eb6'; G.heart(G.W / 2 + 30, 268, 10, c); c.fill();
      G.text(String(s.hearts), G.W / 2 + 70, 268, 22, '#b8407a', null);
      c.strokeStyle = 'rgba(200,80,110,0.8)'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(G.W / 2 - 100, 300); c.lineTo(G.W / 2 + 100, 205); c.stroke();
      // ✓ erase and start fresh
      const yes = this.cbtn(0), no = this.cbtn(1);
      for (const [b, i, col] of [[yes, 0, '#5fd48a'], [no, 1, '#ff8fb8']]) {
        const on = cf.focus === i;
        if (on) G.drawGlow(b.x, b.y, b.r * 2.2, '#fff4c2', 0.6, c);
        const k = on ? 1.1 + Math.sin(t * 0.12) * 0.04 : 1;
        c.save(); c.translate(b.x, b.y); c.scale(k, k);
        c.fillStyle = col; c.strokeStyle = '#ffffff'; c.lineWidth = 6;
        G.circle(0, 0, b.r, c); c.fill(); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        if (i === 0) { c.moveTo(-17, 1); c.lineTo(-5, 14); c.lineTo(18, -13); }
        else { c.moveTo(-14, -14); c.lineTo(14, 14); c.moveTo(14, -14); c.lineTo(-14, 14); }
        c.stroke();
        c.restore();
      }
      c.restore();
    },
  };
})(window.BB);
