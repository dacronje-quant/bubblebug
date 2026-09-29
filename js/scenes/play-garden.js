// Two picture choices at paw rings: invite a garden friend for one
// heart, or unlock a celebration fountain for one heart. Further
// celebrations are free. Entry / holding still never spends anything.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, S = () => BB.Audio.sfx;
  const SPOTS = { ng: { col: 16, floor: 31, kind: 'friends' }, hm: { col: 24, floor: 32, kind: 'fountain' } };
  const CLOSE = { x: 678, y: 145 }, CHOOSE = { x: 480, y: 390 };
  Object.assign(BB.Play, {
    earnedFriendKinds() {
      const kinds = [];
      for (const r of BB.World.rooms) for (const bug of this.ents[r.id].bugs) {
        if (this.save.friends[bug.key] && !bug.king && !kinds.includes(bug.kind)) kinds.push(bug.kind);
      }
      return kinds;
    },
    gardenSpot(room) {
      const spot = SPOTS[room.id];
      return spot ? { x: (room.x + spot.col + 0.5) * T, y: (room.y + spot.floor) * T, kind: spot.kind } : null;
    },
    updateGarden() {
      if (this.fountainCd > 0) this.fountainCd--;
      if (this.celebrationT > 0) {
        this.celebrationT--;
        if (this.celebrationT % 30 === 0) {
          const sp = this.gardenSpot(BB.World.byId.hm);
          BB.Particles.firework(sp.x + (Math.random() - 0.5) * 360, sp.y - 100 - Math.random() * 100);
        }
      }
      const sp = this.gardenSpot(this.room), b = this.pl.body;
      if (this.gardenLock) {
        if (this.room.id === this.gardenLock.room && Math.hypot(b.x + b.w / 2 - this.gardenLock.x, b.y + b.h - this.gardenLock.y) < 60) { this.gardenHold = 0; return; }
        this.gardenLock = null;
      }
      if (!sp || this.mapOn || this.wardrobe || this.party || this.traveling || this.pl.state !== 'play') { this.gardenHold = 0; return; }
      const near = b.grounded && Math.abs(b.x + b.w / 2 - sp.x) < 18 && Math.abs(b.y + b.h - sp.y) < 6 && Math.abs(b.vx) < 0.3;
      this.gardenHold = near ? (this.gardenHold || 0) + 1 : Math.max(0, (this.gardenHold || 0) - 3);
      if (this.gardenHold >= BB.Links.HOLD) this.openGardenChoice(sp.kind);
    },
    openGardenChoice(kind) {
      this.gardenChoice = { kind, kinds: this.earnedFriendKinds(), sel: 0, t: 0, wiggle: 0, cooldown: 0 };
      this.gardenHold = 0; this.pl.state = 'homechoice'; this.pl.body.vx = 0;
      BB.Input.takePointers(); S().select();
    },
    closeGardenChoice() {
      const sp = this.gardenSpot(this.room);
      this.gardenLock = sp ? { room: this.room.id, x: sp.x, y: sp.y } : null;
      this.gardenChoice = null; this.pl.state = 'play'; this.pl.idleT = 0;
      this.gardenHold = -45; S().confirm();
    },
    chooseGarden() {
      const w = this.gardenChoice;
      if (!w || (w.kind === 'fountain' && this.fountainCd > 0)) return false;
      if (w.kind === 'friends') {
        const kind = w.kinds[w.sel];
        if (!kind || !this.earnedFriendKinds().includes(kind)) return false;
        if (this.save.residents[kind]) { S().purr(); return false; }
        if (BB.Economy.buy(this.save, 'resident-' + kind, 'hearts', 1) === 'poor') { w.wiggle = 20; S().hmph(); return false; }
        this.save.residents[kind] = 1; this.refreshHomeVisitors(); S().befriend();
        BB.Particles.burst('heart', this.pl.body.x + 10, this.pl.body.y - 16, 8, { color: '#ff7eb6', life: 50 });
      } else {
        if (BB.Economy.buy(this.save, 'heart-fountain', 'hearts', 1) === 'poor') { w.wiggle = 20; S().hmph(); return false; }
        const first = !this.save.gestures.twirl;
        this.zoneCard = 0; // keep the celebration and new trick picture clear
        this.save.fountainUses++;
        this.save.gestures.twirl = 1; this.showTrickButton();
        this.celebrationT = 180; this.fountainCd = 120;
        S().party(); BB.Particles.firework(this.pl.body.x + 10, this.pl.body.y - 100);
        for (const v of this.homeVisitors) v.danceT = 180;
        this.closeGardenChoice();
        BB.Gestures.start(this.pl, 'twirl');
        if (first) this.trickCard = { id: 'twirl', t: 0 };
      }
      BB.Save.write(); this.pl.happyT = 90;
      return true;
    },
    updateGardenChoice() {
      const w = this.gardenChoice, I = BB.Input;
      w.t++; if (w.wiggle) w.wiggle--; if (this.fountainCd > 0) this.fountainCd--;
      this.updateHomeVisitors();
      if (this.celebrationT) this.celebrationT--;
      if (w.t < 8) return;
      if (I.pressed.pause || I.pressed.back || I.pressed.map) return this.closeGardenChoice();
      const n = w.kinds.length;
      if (w.kind === 'friends' && n && (I.pressed.left || I.pressed.right)) {
        w.sel = (w.sel + n + (I.pressed.left ? -1 : 1)) % n; S().select();
      } else if (I.pressed.jump || I.pressed.bubble || I.pressed.confirm) { this.chooseGarden(); if (!this.gardenChoice) return; }
      for (const p of I.takePointers()) {
        if (Math.hypot(p.x - CLOSE.x, p.y - CLOSE.y) < 32) return this.closeGardenChoice();
        if (Math.hypot(p.x - CHOOSE.x, p.y - CHOOSE.y) < 40) { this.chooseGarden(); if (!this.gardenChoice) return; }
        if (w.kind === 'friends' && n && Math.abs(p.y - 267) < 40 && (Math.abs(p.x - 310) < 40 || Math.abs(p.x - 650) < 40)) {
          w.sel = (w.sel + n + (p.x < 480 ? -1 : 1)) % n; S().select();
        }
      }
    },
    drawGarden(c, room, cam, t) {
      const sp = this.gardenSpot(room);
      if (!sp) return;
      const x = sp.x - cam.x, y = sp.y - cam.y;
      const cost = sp.kind === 'friends' ? 1 : this.save.purchases['heart-fountain'] ? 0 : 1;
      const afford = BB.Economy.balance(this.save, 'hearts') >= cost;
      c.save();
      if (afford) G().drawGlow(x, y - 34, 62, '#ffd5e8', 0.3 + Math.sin(t * 0.07) * 0.1, c);
      if (sp.kind === 'fountain') {
        c.fillStyle = '#b5c4e3'; c.strokeStyle = '#7c8bb1'; c.lineWidth = 3;
        G().ellipse(x, y - 15, 32, 12, 0, c); c.fill(); c.stroke();
        G().rrect(x - 8, y - 54, 16, 39, 6, c); c.fill();
        c.fillStyle = '#ff9ec7'; G().heart(x, y - 57, 13, c); c.fill();
        c.strokeStyle = '#b2efff'; c.lineWidth = 3;
        for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x, y - 46); c.quadraticCurveTo(x + d * 27, y - 56, x + d * 25, y - 19); c.stroke(); }
      } else {
        c.fillStyle = '#d8b589'; G().rrect(x - 22, y - 53, 44, 33, 6, c); c.fill();
        BB.Critters.drawBug(c, 'bunny', x, y - 28, { t, mood: 0, facing: 1, scale: 0.9, joy: true });
        c.fillStyle = '#ff7eb6'; G().heart(x + 17, y - 51, 5, c); c.fill();
      }
      if (cost) BB.Economy.pips(c, 'hearts', cost, x, y - 77, afford);
      BB.Links.hintRing(c, x, y - 4, t);
      if (this.room === room && this.gardenHold > 0) BB.Links.holdRing(c, x, y - 30, this.gardenHold / BB.Links.HOLD);
      c.restore();
    },
    drawGardenChoice(c, t) {
      const w = this.gardenChoice, kind = w.kinds[w.sel];
      const have = w.kind === 'friends' ? !!this.save.residents[kind] : !!this.save.purchases['heart-fountain'];
      const cost = have ? 0 : 1, afford = BB.Economy.balance(this.save, 'hearts') >= cost;
      c.save(); c.globalAlpha = Math.min(1, w.t / 12);
      c.fillStyle = 'rgba(30,18,40,0.38)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = '#fff8f0'; c.strokeStyle = '#ffb3cf'; c.lineWidth = 5;
      G().rrect(255, 116, 450, 326, 55, c); c.fill(); c.stroke();
      c.fillStyle = '#ffd5e8'; G().circle(480, 265, 82, c); c.fill();
      if (w.kind === 'friends') {
        if (kind) BB.Critters.drawBug(c, kind, 480, 280, { t, mood: 0, facing: 1, scale: 3, joy: have });
        else { BB.Critters.drawBug(c, 'bunny', 450, 280, { t, mood: 0, facing: 1, scale: 2 }); BB.HUD.buttonIcon(c, 'bubble', 522, 265, 1.2, 0); }
        if (w.kinds.length > 1) for (const [x, d] of [[310, -1], [650, 1]]) {
          c.fillStyle = '#ffffff'; G().circle(x, 267, 32, c); c.fill();
          BB.HUD.buttonIcon(c, d < 0 ? 'left' : 'right', x, 267, 0.9, 0);
        }
      } else {
        c.fillStyle = '#ff7eb6'; G().heart(480, 260, 42 + Math.sin(t * 0.08) * 3, c); c.fill();
        if (this.celebrationT) BB.Gestures.drawPaw(c, 575, 205, 1.6, '#ffd84a', '#b8860b');
      }
      if (!have) BB.Economy.pips(c, 'hearts', cost, 480, 163, afford);
      c.fillStyle = '#ff7eb6'; G().heart(300, 153, 9, c); c.fill();
      G().text(String(BB.Economy.balance(this.save, 'hearts')), 330, 153, 20, '#9b5d74', null, 'center', c);
      const wx = w.wiggle ? Math.sin(w.wiggle * 1.5) * 4 : 0;
      c.fillStyle = have ? '#5fd48a' : afford && !this.fountainCd && (w.kind === 'fountain' || kind) ? '#ffd84a' : '#d5ccdb';
      G().circle(CHOOSE.x + wx, CHOOSE.y, 32, c); c.fill();
      BB.Gestures.drawPaw(c, CHOOSE.x + wx, CHOOSE.y, 1.25, '#ffffff', '#ffffff');
      c.fillStyle = '#5fd48a'; G().circle(CLOSE.x, CLOSE.y, 23, c); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(CLOSE.x - 10, CLOSE.y); c.lineTo(CLOSE.x - 2, CLOSE.y + 7); c.lineTo(CLOSE.x + 10, CLOSE.y - 8); c.stroke();
      c.restore();
    },
  });
})(window.BB);
