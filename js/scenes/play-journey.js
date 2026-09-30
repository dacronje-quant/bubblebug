// Picture interactions on the garden path: rescue Rainbow through a
// twelve-cat rainbow, then choose a fresh adventure at the sad cloud.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, S = () => BB.Audio.sfx;
  const spot = kind => {
    const r = BB.World.byId.nm;
    return { x: (r.x + (kind === 'rainbow' ? 21.5 : 26.5)) * T, y: (r.y + 32) * T };
  };
  const unlocked = (save, kind) => BB.GardenMaze.available(save) && (kind === 'rainbow' || save.mazeSolved && save.rainbowUnlocked);
  const button = i => ({ x: 385 + i * 190, y: 405, r: 42 });
  BB.RainbowJourney = { spot, unlocked };

  function sadCloud(c, x, y, t, scale) {
    BB.Critters.moodCloud(c, x, y, 1, t, scale);
    BB.Critters.face(c, x, y + 3 * scale + Math.sin(t * 0.05) * 1.5, scale * 0.9, 0.9, { t, lid: '#8a8fa6' });
  }

  function rainbow(c, x, y, t, scale = 1) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    G().drawGlow(0, -44, 100, '#fff0bf', 0.28, c);
    const colors = ['#ff94c2', '#ffbb85', '#ffe383', '#a4e5ab', '#8ddce8', '#99b5f4', '#c4a4f0'];
    c.lineWidth = 5; c.lineCap = 'round';
    colors.forEach((color, i) => { c.strokeStyle = color; c.beginPath(); c.arc(0, -4, 58 - i * 5, Math.PI, 0); c.stroke(); });
    for (const d of [-1, 1]) {
      c.fillStyle = '#ffffff'; G().ellipse(d * 48, -7, 23, 10, 0, c); c.fill();
      G().circle(d * 44, -15, 11, c); c.fill(); G().circle(d * 56, -13, 8, c); c.fill();
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 0.7 + t * 0.012;
      c.fillStyle = '#fff9d6'; G().star(Math.cos(a) * 74, -42 + Math.sin(a) * 32, 2 + Math.sin(t * 0.08 + i), 4, 0.3, a, c); c.fill();
    }
    c.restore();
  }

  function rainbowDoor(c, x, y, save, t) {
    const ready = BB.GardenMaze.available(save);
    const colors = ['#ff94c2', '#ffbb85', '#ffe383', '#a4e5ab', '#8ddce8', '#99b5f4', '#c4a4f0'];
    c.save();
    c.fillStyle = ready ? '#eee8ff' : '#fff8ef'; c.strokeStyle = '#d6bddc'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 49, y - 5); c.lineTo(x - 49, y - 97);
    c.arc(x, y - 97, 49, Math.PI, 0); c.lineTo(x + 49, y - 5); c.closePath(); c.fill(); c.stroke();
    colors.forEach((color, i) => {
      c.strokeStyle = color; c.lineWidth = 3; c.beginPath();
      c.moveTo(x - 49 + i * 3, y - 7); c.lineTo(x - 49 + i * 3, y - 97);
      c.arc(x, y - 97, 49 - i * 3, Math.PI, 0); c.lineTo(x + 49 - i * 3, y - 7); c.stroke();
    });
    if (ready) {
      c.fillStyle = '#fffdf5'; G().rrect(x - 25, y - 94, 50, 87, 24, c); c.fill();
      BB.Kittens.draw(c, 'rainbow', { mode: 'sit', t }, x, y - 22, 1, 1);
      BB.Links.hintRing(c, x, y - 4, t);
    } else {
      c.strokeStyle = '#c5a16b'; c.lineWidth = 4;
      c.beginPath(); c.arc(x, y - 62, 8, Math.PI, 0); c.stroke();
      c.fillStyle = '#e8c77d'; G().rrect(x - 13, y - 63, 26, 22, 6, c); c.fill();
      c.fillStyle = '#a27d52'; G().circle(x, y - 55, 3, c); c.fill(); c.fillRect(x - 1.5, y - 55, 3, 7);
    }
    // The same twelve portraits as the family wall: children can see
    // exactly who is home without needing to read an instruction.
    const family = BB.Home.familyOrder(), found = family.filter(id => save.family[id]).length;
    c.fillStyle = '#fff8ef'; c.strokeStyle = '#d6bddc'; c.lineWidth = 2;
    G().rrect(x - 75, y - 218, 150, 62, 16, c); c.fill(); c.stroke();
    family.forEach((id, i) => BB.Home.faceOf(c, id, x - 55 + i % 6 * 22, y - 202 + Math.floor(i / 6) * 24, 0.9, !!save.family[id]));
    G().text(found + ' / 12', x, y - 231, 16, '#786080', null, 'center', c);
    c.restore();
  }

  Object.assign(BB.Play, {
    updateJourney() {
      if (this.room.id !== 'nm' || this.mapOn || this.iris || this.traveling || this.pl.state !== 'play') { this.journeyHold = 0; return; }
      const b = this.pl.body;
      if (this.journeyLock) {
        const q = spot(this.journeyLock);
        if (Math.hypot(b.x + b.w / 2 - q.x, b.y + b.h - q.y) < 64) { this.journeyHold = 0; return; }
        this.journeyLock = null;
      }
      const kind = ['rainbow', 'cloud'].find(k => {
        const q = spot(k);
        return unlocked(this.save, k) && b.grounded && Math.abs(b.vx) < 0.3 && Math.abs(b.x + b.w / 2 - q.x) < 18 && Math.abs(b.y + b.h - q.y) < 6;
      });
      if (!kind) { this.journeyHold = 0; return; }
      this.journeyHold++;
      if (this.journeyHold >= BB.Links.HOLD || BB.Input.pressed.confirm || BB.Input.pressed.bubble) this.openJourneyChoice(kind);
    },
    openJourneyChoice(kind) {
      if (!unlocked(this.save, kind)) return false;
      this.portalChoice = { kind, t: 0, focus: kind === 'cloud' ? 1 : 0 };
      this.pl.state = 'homechoice'; this.pl.body.vx = 0; this.journeyHold = 0;
      BB.Input.takePointers(); S().select(); return true;
    },
    closeJourneyChoice() {
      const w = this.portalChoice;
      this.journeyLock = w && w.kind; this.journeyHold = 0;
      this.portalChoice = null; this.pl.state = 'play'; this.pl.idleT = 0;
      S().select();
    },
    chooseJourney() {
      const w = this.portalChoice;
      if (!w || !unlocked(this.save, w.kind)) return false;
      if (w.focus === 1) { this.closeJourneyChoice(); return false; }
      if (w.kind === 'rainbow') return this.openMaze();
      if (!BB.Save.rainbowReplay()) return false;
      this.portalChoice = null; this.replayStarting = true;
      BB.Input.clearAll(); BB.Input.takePointers(); S().bossGrumble();
      BB.Main.go('play', { cat: 'rainbow' }); return true;
    },
    updateJourneyChoice() {
      const w = this.portalChoice, I = BB.Input; w.t++;
      if (w.t < 10) { I.takePointers(); return; }
      if (I.pressed.back || I.pressed.pause || I.pressed.map) return this.closeJourneyChoice();
      if (I.pressed.left) { w.focus = 0; S().select(); }
      if (I.pressed.right) { w.focus = 1; S().select(); }
      if (!I.pressed.up && !I.pressed.left && !I.pressed.right && (I.pressed.confirm || I.pressed.bubble || I.pressed.jump)) return this.chooseJourney();
      for (const p of I.takePointers()) for (let i = 0; i < 2; i++) {
        const q = button(i);
        if (Math.hypot(p.x - q.x, p.y - q.y) < q.r + 8) { w.focus = i; return this.chooseJourney(); }
      }
    },
    drawJourney(c, room, cam, t) {
      if (room.id !== 'nm') return;
      const door = spot('rainbow');
      rainbowDoor(c, door.x - cam.x, door.y - cam.y, this.save, t);
      for (const kind of ['rainbow', 'cloud']) if (unlocked(this.save, kind)) {
        const q = spot(kind), x = q.x - cam.x, y = q.y - cam.y;
        if (kind === 'cloud') {
          G().drawGlow(x, y - 50, 60, '#c8bbec', 0.25, c);
          sadCloud(c, x, y - 57 + Math.sin(t * 0.03) * 3, t, 1.45);
          G().text('Play again', x, y - 116, 15, '#786080', null, 'center', c);
          BB.Links.hintRing(c, x, y - 4, t);
        }
        if (this.room === room && this.journeyHold > 0 && Math.abs(this.pl.body.x + 10 - q.x) < 18) BB.Links.holdRing(c, x, y - 35, this.journeyHold / BB.Links.HOLD);
      }
    },
    drawJourneyChoice(c, t) {
      const w = this.portalChoice, replay = w.kind === 'cloud';
      c.save(); c.fillStyle = 'rgba(35,28,56,0.6)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = '#fff8ee'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 5;
      G().rrect(200, 107, 560, 351, 36, c); c.fill(); c.stroke();
      G().text(replay ? 'Make the kingdom gloomy again?' : 'Rescue Rainbow', 480, 156, replay ? 22 : 26, '#82629c', null, 'center', c);
      if (replay) {
        BB.Kittens.draw(c, 'rainbow', { mode: 'sit', happy: true, t, wear: this.save.wear }, 354, 296, 2.7, 1);
        sadCloud(c, 599, 243, t, 2.3);
        BB.HUD.zoneIcon(c, BB.HOME_ZONE, 599, 291, 0.8);
        c.strokeStyle = '#c7b5d6'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(426, 247); c.lineTo(506, 247); c.lineTo(494, 235); c.moveTo(506, 247); c.lineTo(494, 259); c.stroke();
        G().text('Cats, stars, hearts, bosses and puzzles restart', 480, 329, 15, '#82629c', null, 'center', c);
        G().text('Keep your skills and outfits · Play as Rainbow', 480, 351, 14, '#998097', null, 'center', c);
      } else {
        rainbow(c, 392, 291, t, 1.15);
        BB.Kittens.draw(c, 'rainbow', { mode: 'sit', t }, 391, 282, 1.7, 1);
        c.fillStyle = '#55945b'; G().rrect(528, 201, 116, 91, 12, c); c.fill();
        c.strokeStyle = '#eaddb4'; c.lineWidth = 8;
        c.beginPath(); c.moveTo(630, 280); c.lineTo(555, 280); c.lineTo(555, 252); c.lineTo(612, 252); c.lineTo(612, 217); c.lineTo(543, 217); c.stroke();
        G().text('Follow the maze and wake the three paw stones', 480, 331, 15, '#82629c', null, 'center', c);
      }
      for (let i = 0; i < 2; i++) {
        const q = button(i), on = w.focus === i;
        if (on) G().drawGlow(q.x, q.y, 62, '#fff1c2', 0.5, c);
        c.fillStyle = i ? '#ff8fb8' : '#5fd48a'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
        G().circle(q.x, q.y, q.r * (on ? 1.06 : 1), c); c.fill(); c.stroke();
        c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        if (i) { c.moveTo(q.x - 12, q.y - 12); c.lineTo(q.x + 12, q.y + 12); c.moveTo(q.x + 12, q.y - 12); c.lineTo(q.x - 12, q.y + 12); }
        else { c.moveTo(q.x - 13, q.y); c.lineTo(q.x - 3, q.y + 11); c.lineTo(q.x + 15, q.y - 11); }
        c.stroke();
      }
      c.restore();
    },
  });
})(window.BB);
