// ════════════════════════════════════════════════════════════════
//  TITLE — both kittens snoozing on a sunny hill while bubbles drift
//  up, and two big picture buttons:
//    ▶  CONTINUE — jump straight back into the saved adventure (greyed
//                  out when there isn't one yet)
//    🌱 NEW GAME — pick a kitten and start fresh; if an adventure is
//                  saved, choose the whole game or Rainbow's family
//  and, in the corner, a grown-up picker for how brave the adventure is:
//    💗 EASY — harmless bumps with extra help jumping and landing
//    💗 MEDIUM — the former Easy, with the original movement
//    ☀ HARD — bumps and boss sad attacks cost happy suns, and a kitten
//             with none left floats back to its save point
//  Keyboard / gamepad: ◀ ▶ to choose, jump to press, ▼ for the picker.
//  Taps work too.
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
    selectionPaw(c, x, y, s = 1.6) {
      c.save(); c.globalAlpha *= 0.62;
      this.paw(c, x, y, s, -0.18);
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
  const MODES = ['easy', 'medium', 'hard'];

  BB.Title = {
    t: 0, focus: 0, lastFocus: 1, confirm: null, hasSave: false, summary: null, modeT: 99,

    enter() {
      this.t = 0; this.confirm = null; this.leaving = false;
      this.hasSave = BB.Save.exists() && BB.Save.load();
      this.summary = this.hasSave ? {
        cat: BB.Save.data.cat,
        stars: BB.Economy.balance(BB.Save.data, 'stars'),
        hearts: BB.Economy.balance(BB.Save.data, 'hearts'),
        family: BB.Save.count(BB.Save.data.family || {}),
        kin: BB.RainbowFamily.active(BB.Save.data) ? { kin: Object.assign({}, BB.Save.data.kin) } : null,
      } : null;
      this.focus = this.hasSave ? 0 : 1;
      this.modeFocus = MODES.indexOf(BB.Settings.difficulty);
      this.hoverVersion = BB.Input.pointerVersion;
      BB.Music.play('lullaby');
    },

    // button layout (logical px)
    btn(i) { return { x: G_().W / 2 + (i === 0 ? -120 : 120), y: 330, r: 62 }; },
    mbtn(i) { return { x: G_().W - 248 + i * 78, y: 466, r: 25 }; }, // Easy / Medium / Hard
    cbtn(i, cf = this.confirm) {
      const cx = G_().W / 2;
      if (cf && cf.stage === 'all') return { x: cx + (i === 0 ? -150 : 150), y: 425, w: 270, h: 64 };
      return i === 2 ? { x: cx, y: 447, w: 290, h: 56 }
        : { x: cx + (i === 0 ? -178 : 178), y: 256, w: 332, h: 280 };
    },
    resetHit(p, b) { return Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2; },
    resetChoice() {
      // The title can open before a world has ever been built. Build it
      // before Home caches its twelve-cat portrait order.
      if (!BB.World.rooms.length) BB.World.build();
      return { t: 0, focus: 2, stage: 'choose', hoverVersion: BB.Input.pointerVersion };
    },
    canResetFamily() { return !!(BB.Save.data.mazeSolved && BB.Save.data.rainbowUnlocked); },

    activateReset(i, cf, cancel) {
      if (cf.stage === 'all') {
        if (i !== 0) { cancel(); return; }
        BB.Voice.stop();
        BB.Save.reset();
        BB.Main.go('select');
      } else {
        if (i === 2) { cancel(); return; }
        if (i === 0) { Object.assign(cf, { stage: 'all', focus: 1, t: 0 }); S().select(); return; }
        if (!this.canResetFamily()) { S().hmph(); return; }
        BB.Voice.stop();
        if (!BB.Save.resetRainbowFamily()) return;
        BB.Main.go('play', { cat: BB.Save.data.cat });
      }
      // Freeze the old scene during its fade, including held/touch inputs.
      if (BB.Main.name === 'title') this.leaving = true;
      else BB.Play.replayStarting = true;
      BB.Input.clearAll(); BB.Input.takePointers(); S().confirm();
    },

    updateReset(cf, taps, cancel) {
      const I = BB.Input;
      cf.t++;
      if (cf.t <= 10) return;
      const n = cf.stage === 'all' ? 2 : 3;
      if (cf.hoverVersion !== I.pointerVersion) {
        cf.hoverVersion = I.pointerVersion;
        if (I.pointerPos) for (let i = 0; i < n; i++) if (this.resetHit(I.pointerPos, this.cbtn(i, cf))) cf.focus = i;
      }
      if (I.pressed.back || I.pressed.pause || I.pressed.map) {
        if (cf.stage === 'all') { Object.assign(cf, { stage: 'choose', focus: 2, t: 0 }); S().select(); }
        else cancel();
        return;
      }
      const nav = I.pressed.left || I.pressed.right || I.pressed.up || I.pressed.down;
      if (nav) {
        if (cf.stage === 'all') cf.focus = I.pressed.left ? 0 : 1;
        else if (I.pressed.down) cf.focus = 2;
        else if (I.pressed.up) cf.focus = 1;
        else cf.focus = I.pressed.left ? 0 : 1;
        S().select();
      } else if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) { this.activateReset(cf.focus, cf, cancel); return; }
      for (const p of taps) for (let i = 0; i < n; i++) if (this.resetHit(p, this.cbtn(i, cf))) { cf.focus = i; this.activateReset(i, cf, cancel); return; }
    },

    choose(i) {
      if (this.leaving) return;
      if (i === 0) {
        if (!this.hasSave) { S().hmph(); return; }
        this.leaving = true;
        S().confirm();
        BB.Main.go('play', { cat: BB.Save.data.cat, resume: true });
      } else {
        S().select();
        if (this.hasSave) { this.confirm = this.resetChoice(); return; }
        this.startFresh();
      }
    },

    setMode(mode) {
      if (BB.Settings.difficulty === mode) return;
      BB.Settings.setDifficulty(mode);
      this.modeT = 0;
      if (mode === 'hard') S().bossGrumble(); else S().cheerUp();
    },

    startFresh() {
      this.leaving = true;
      BB.Save.reset();
      S().confirm();
      BB.Main.go('select');
    },

    update() {
      this.t++; this.modeT++;
      G_().t++;
      UI.tickBubbles();
      const I = BB.Input;
      const taps = I.takePointers();
      BB.Input._anyKey = false;
      if (this.t < 15 || this.leaving) return;

      // Hover selects a picture; activation still needs a click or press.
      // A parked mouse must never undo a keyboard/gamepad selection.
      if (this.hoverVersion !== I.pointerVersion) {
        this.hoverVersion = I.pointerVersion;
        const p = I.pointerPos;
        if (p) {
          const hit = b => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10;
          if (!this.confirm) {
            for (let i = 0; i < 2; i++) if (hit(this.btn(i))) this.focus = this.lastFocus = i;
            for (let i = 0; i < 3; i++) if (hit(this.mbtn(i))) { this.focus = 2; this.modeFocus = i; }
          }
        }
      }

      if (this.confirm) {
        this.updateReset(this.confirm, taps, () => { this.confirm = null; S().select(); });
        return;
      }

      if (this.focus === 2) {
        // ↑ goes back; it is also "jump", so check it first.
        const mode = this.modeFocus;
        if (I.pressed.up) { this.focus = this.lastFocus; S().select(); }
        else if (I.pressed.left) { this.modeFocus = Math.max(0, mode - 1); this.setMode(MODES[this.modeFocus]); }
        else if (I.pressed.right) { this.modeFocus = Math.min(2, mode + 1); this.setMode(MODES[this.modeFocus]); }
        else if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) {
          this.modeFocus = BB.Settings.difficulty === MODES[mode] ? (mode + 1) % 3 : mode;
          this.setMode(MODES[this.modeFocus]);
        }
      } else if (I.pressed.down) {
        this.lastFocus = this.focus; this.focus = 2; this.modeFocus = MODES.indexOf(BB.Settings.difficulty); S().select();
      } else {
        if (I.pressed.left && this.focus !== 0) { this.focus = 0; S().select(); }
        if (I.pressed.right && this.focus !== 1) { this.focus = 1; S().select(); }
        if (I.pressed.jump || I.pressed.confirm || I.pressed.bubble) this.choose(this.focus);
      }
      for (const p of taps) {
        for (let i = 0; i < 3; i++) {
          const m = this.mbtn(i);
          if (Math.hypot(p.x - m.x, p.y - m.y) < m.r + 12) { this.focus = 2; this.modeFocus = i; this.setMode(MODES[i]); return; }
        }
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
      this.drawMode(c, t);
      if (this.focus !== 2 && !this.confirm) {
        const b = this.btn(this.focus);
        UI.selectionPaw(c, b.x + 31, b.y - 36, 1.7);
      }
      if (this.confirm) this.drawConfirm(c, t);
    },

    // Three picture buttons on a little cloud-pill; words are for parents.
    drawMode(c, t) {
      const G = G_(), mode = BB.Settings.difficulty;
      const a = this.mbtn(0), b = this.mbtn(2);
      const px = a.x - a.r - 18, pw = b.x - a.x + (a.r + 18) * 2, py = a.y - a.r - 12, ph = a.r * 2 + 46;
      c.save();
      c.fillStyle = 'rgba(30,20,50,0.42)'; G.rrect(px, py, pw, ph, 26, c); c.fill();
      if (this.focus === 2) {
        c.strokeStyle = `rgba(255,244,194,${0.7 + Math.sin(t * 0.12) * 0.3})`; c.lineWidth = 3;
        G.rrect(px, py, pw, ph, 26, c); c.stroke();
      }
      const pop = this.modeT < 16 ? Math.sin(this.modeT / 16 * Math.PI) * 0.18 : 0;
      [[a, 'easy', '#9ee4ff', 'Easy'], [this.mbtn(1), 'medium', '#ff9ec7', 'Medium'], [b, 'hard', '#ffb347', 'Hard']].forEach(([m, id, col, label]) => {
        const on = mode === id;
        const k = on ? 1.06 + pop + Math.sin(t * 0.08) * 0.03 : 0.9;
        c.save();
        c.globalAlpha = on ? 1 : 0.55;
        if (on) G.drawGlow(m.x, m.y, m.r * 2, '#fff4c2', 0.5, c);
        c.translate(m.x, m.y); c.scale(k, k);
        c.fillStyle = on ? col : '#b8b2c4'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
        G.circle(0, 0, m.r, c); c.fill(); c.stroke();
        if (id !== 'hard') {
          // a heart safe inside a bubble
          G.bubble(0, 0, 15, '#ffffff', 0.9, c);
          c.fillStyle = '#ff5f93'; G.heart(0, 2, 9, c); c.fill();
          if (id === 'easy') {
            // Little wings show the extra jumping help.
            c.fillStyle = '#ffffff';
            for (const d of [-1, 1]) {
              G.ellipse(d * 17, 0, 7, 3.2, -d * 0.5, c); c.fill();
              G.ellipse(d * 17, 5, 5.5, 2.7, -d * 0.3, c); c.fill();
            }
          }
        } else {
          // a happy sun with a little rain-cloud creeping up on it
          c.strokeStyle = '#fff1a8'; c.lineWidth = 2.4; c.lineCap = 'round';
          for (let i = 0; i < 8; i++) {
            const an = i / 8 * Math.PI * 2 + t * 0.01;
            c.beginPath(); c.moveTo(-3 + Math.cos(an) * 11, -3 + Math.sin(an) * 11); c.lineTo(-3 + Math.cos(an) * 14, -3 + Math.sin(an) * 14); c.stroke();
          }
          c.fillStyle = '#ffe066'; c.strokeStyle = '#d99a14'; c.lineWidth = 1.4;
          G.circle(-3, -3, 9, c); c.fill(); c.stroke();
          c.fillStyle = '#6a4a14';
          G.circle(-6, -4, 1.1, c); c.fill(); G.circle(0, -4, 1.1, c); c.fill();
          c.fillStyle = 'rgba(160,166,196,0.95)';
          c.beginPath(); c.arc(4, 8, 5, 0, Math.PI * 2); c.arc(10, 5, 6, 0, Math.PI * 2); c.arc(15, 9, 4.5, 0, Math.PI * 2); c.fill();
          const ph2 = (t * 0.05) % 1;
          c.fillStyle = `rgba(140,190,255,${1 - ph2})`; G.ellipse(10, 14 + ph2 * 5, 1.2, 1.9, 0, c); c.fill();
        }
        c.restore();
        G.text(label, m.x, m.y + m.r + 15, 15, on ? '#fff8e8' : 'rgba(255,248,232,0.6)', 'rgba(40,24,60,0.7)');
      });
      if (this.focus === 2 && !this.confirm) {
        const m = this.mbtn(this.modeFocus);
        UI.selectionPaw(c, m.x + 15, m.y - 17, 1.05);
      }
      c.restore();
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
        const kin = this.summary.kin;
        const w = (fam ? 204 : 140) + (kin ? 54 : 0), px = b.x - b.r - 14 - w, py = b.y + 22;
        c.fillStyle = 'rgba(30,20,50,0.45)'; G.rrect(px, py, w, 34, 17, c); c.fill();
        c.fillStyle = '#ffd84a'; G.star(px + 20, py + 17, 9, 5, 0.5, -Math.PI / 2, c); c.fill();
        G.text(String(this.summary.stars), px + 48, py + 18, 17, '#fff6d6', null);
        c.fillStyle = '#ff7eb6'; G.heart(px + 84, py + 19, 8, c); c.fill();
        G.text(String(this.summary.hearts), px + 112, py + 18, 17, '#ffe3f0', null);
        if (fam) {
          BB.MapView.catFace(c, px + 150, py + 18, 1.05, '#fff1dc', '#9a7a64');
          G.text(String(fam), px + 178, py + 18, 17, '#fff1dc', null);
        }
        // a Rainbow adventure: how much of her rainbow family is home
        if (kin) BB.RainbowFamily.miniArc(c, px + w - 30, py + 15, 1, kin, t);
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

    // Shared by New Game and the courtyard cloud. Pictures show exactly
    // which family goes missing; the green play button is always safe.
    drawConfirm(c, t, cf = this.confirm) {
      const G = G_(), cx = G.W / 2, all = cf.stage === 'all';
      const a = Math.min(1, cf.t / 10);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(25,15,45,0.72)'; c.fillRect(0, 0, G.W, G.H);
      c.fillStyle = '#fff9ec'; c.strokeStyle = '#c4a4e4'; c.lineWidth = 4;
      G.rrect(cx - 375, 30, 750, 480, 30, c); c.fill(); c.stroke();
      // Small captions help grown-ups; every action and consequence is
      // pictured so a child never needs to read a label.
      G.text(all ? 'Everything will reset' : 'Play again', cx, 76, 19, '#583d74', null, 'center', c);
      const card = (i, fill, edge) => {
        const b = this.cbtn(i, cf), on = cf.focus === i;
        c.fillStyle = fill; c.strokeStyle = on ? '#583d74' : edge; c.lineWidth = on ? 5 : 2;
        G.rrect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 22, c); c.fill(); c.stroke();
        if (on) UI.selectionPaw(c, b.x + b.w / 2 - 20, b.y - b.h / 2 + 20, 1.15);
        return b;
      };
      const familyPicture = (x, y, s = 1) => {
        BB.Home.familyOrder().forEach((id, i) => BB.Home.faceOf(c, id, x - 115 * s + i % 6 * 46 * s, y + Math.floor(i / 6) * 32 * s, 1.65 * s, true));
        BB.RAINBOW_KIN.forEach((id, i) => BB.RainbowFamily.face(c, id, x - 114 * s + i * 38 * s, y + 66 * s, 1.15 * s, true));
      };
      const againPicture = (x, y, r, col) => {
        const end = Math.PI * 1.4;
        c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.arc(x, y, r, -Math.PI * 0.35, end); c.stroke();
        const ex = x + Math.cos(end) * r, ey = y + Math.sin(end) * r;
        c.beginPath(); c.moveTo(ex - 9, ey + 6); c.lineTo(ex + 9, ey + 4); c.lineTo(ex + 2, ey - 12); c.closePath(); c.fill(); c.restore();
      };
      const playPicture = (x, y, size = 22) => {
        c.fillStyle = '#386947'; c.beginPath(); c.moveTo(x - size * 0.7, y - size); c.lineTo(x + size, y); c.lineTo(x - size * 0.7, y + size); c.closePath(); c.fill();
      };
      const stuffPicture = (x, y, keep) => {
        c.save();
        BB.HUD.zoneIcon(c, BB.HOME_ZONE, x - 102, y, 0.95);
        c.fillStyle = '#ffd84a'; G.star(x - 34, y, 13, 5, 0.5, -Math.PI / 2, c); c.fill();
        UI.paw(c, x + 34, y, 0.8);
        BB.Wardrobe.icon(c, 'wizard', x + 102, y, 1.1, t);
        c.strokeStyle = keep ? '#3c8955' : '#c65d65'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        for (const px of [x - 102, x - 34, x + 34, x + 102]) {
          c.beginPath();
          if (keep) { c.moveTo(px - 8, y + 15); c.lineTo(px - 1, y + 22); c.lineTo(px + 11, y + 8); }
          else { c.moveTo(px - 14, y + 14); c.lineTo(px + 14, y - 14); }
          c.stroke();
        }
        c.restore();
      };
      if (all) {
        familyPicture(cx, 151, 1.35);
        stuffPicture(cx, 291, false);
        againPicture(cx, 353, 22, '#bc6565');
        for (let i = 0; i < 2; i++) {
          const b = card(i, i === 0 ? '#fce0db' : '#d3f3dd', i === 0 ? '#d98b81' : '#75bb8c');
          if (i === 0) againPicture(b.x - 75, b.y, 20, '#bc6565');
          else playPicture(b.x - 75, b.y, 20);
          G.text(i === 0 ? 'Start over' : 'Keep playing', b.x + 25, b.y, 17, '#583d74', null, 'center', c);
        }
      } else {
        const full = card(0, '#ffede6', '#dfa18b');
        BB.HUD.zoneIcon(c, BB.HOME_ZONE, full.x, 163, 1.5);
        againPicture(full.x, 162, 37, '#bc6565');
        familyPicture(full.x, 218);
        stuffPicture(full.x, 341, false);
        G.text('Whole game', full.x, 377, 16, '#754a54', null, 'center', c);
        const ready = this.canResetFamily(), kin = card(1, ready ? '#f0e5ff' : '#eeeaf0', '#b9a0d2');
        BB.RainbowFamily.miniArc(c, kin.x, 174, 2.3, { kin: Object.fromEntries(BB.RAINBOW_KIN.map(id => [id, 1])) }, t);
        againPicture(kin.x + 105, 163, 20, '#9a7ac8');
        BB.RAINBOW_KIN.forEach((id, i) => {
          const top = i < 4, col = top ? i : i - 4;
          BB.Kittens.draw(c, id, { mode: 'sit', t, happy: true }, kin.x + (col - (top ? 1.5 : 1)) * 60, top ? 242 : 305, 0.95, 1);
        });
        if (ready) {
          stuffPicture(kin.x, 339, true);
          G.text('Rainbow family only', kin.x, 377, 16, '#684490', null, 'center', c);
        } else {
          c.fillStyle = '#eeeaf0'; c.strokeStyle = '#7b7185'; c.lineWidth = 5;
          G.rrect(kin.x - 21, 320, 42, 32, 5, c); c.fill(); c.stroke();
          c.beginPath(); c.arc(kin.x, 320, 14, Math.PI, 0); c.stroke();
          G.text('Find Rainbow first', kin.x, 377, 16, '#7b7185', null, 'center', c);
        }
        const keep = card(2, '#d3f3dd', '#75bb8c');
        playPicture(keep.x, keep.y, 21);
        G.text('Keep playing', keep.x, 489, 14, '#386947', null, 'center', c);
      }
      c.restore();
    },
  };
})(window.BB);
