// Picture interactions on the garden path: rescue Rainbow through a
// twelve-cat rainbow, then choose a fresh adventure at the sad cloud.
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE, G = () => BB.G, S = () => BB.Audio.sfx;
  const spot = kind => {
    const r = BB.World.byId.nm;
    return { x: (r.x + (kind === 'rainbow' ? 21.5 : 6.5)) * T, y: (r.y + 32) * T };
  };
  // The tall doorway: the hedge maze; while Rainbow's family is lost it is
  // shut (their six portraits show who is missing); with all six home it
  // opens onto Mama's Cloud Maze. The sad cloud waits until the whole
  // rainbow family is home.
  const RF = () => BB.RainbowFamily;
  const unlocked = (save, kind) => BB.GardenMaze.available(save) && (kind === 'rainbow' ? !RF().hunting(save)
    : save.mazeSolved && save.rainbowUnlocked && RF().complete(save));
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
      c.fillStyle = '#98d6cf'; G().star(x, y - 58, 14, 4, 0.45, t * 0.005, c); c.fill();
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

  // Tall towers and a full courtyard beyond the small family door.
  // Gloom is gentle rain and drooping plants; rescuing Rainbow blooms
  // the same place so the change is clear on the way back out.
  function grandGarden(c, room, cam, save, t) {
    const x = spot('rainbow').x - cam.x, y = spot('rainbow').y - cam.y, happy = !!save.mazeSolved;
    const left = room.px - cam.x, top = y - 560;
    c.save(); c.beginPath(); c.rect(left, top, room.pw, 560); c.clip();
    const sky = c.createLinearGradient(0, top, 0, y);
    sky.addColorStop(0, happy ? '#b4e7f5' : '#3e425d'); sky.addColorStop(1, happy ? '#fff0d9' : '#8b829f');
    c.fillStyle = sky; c.fillRect(left, top, room.pw, 560);
    // Distant spires, overgrown trees and a curved, tiled approach.
    for (let i = 0; i < 6; i++) {
      const bx = left + 44 + i * 166;
      c.fillStyle = happy ? '#87bba9' : '#55536b';
      G().ellipse(bx, y - 110, 84, 143, -0.08, c); c.fill();
      c.strokeStyle = happy ? '#81a684' : '#67617a'; c.lineWidth = 9;
      c.beginPath(); c.moveTo(bx, y - 10); c.quadraticCurveTo(bx - 23, y - 92, bx + 10, y - 170); c.stroke();
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(bx - 4, y - 80); c.quadraticCurveTo(bx + side * 38, y - 142, bx + side * 50, y - 110); c.stroke(); }
    }
    c.fillStyle = happy ? '#c5dfad' : '#6c697b'; G().ellipse(x - 280, y + 12, 500, 54, 0, c); c.fill();
    c.fillStyle = happy ? '#f2e5c5' : '#9e91a5'; G().ellipse(x, y + 2, 212, 29, 0, c); c.fill();
    c.strokeStyle = happy ? '#dccfaf' : '#817587'; c.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(x + i * 41, y - 24); c.lineTo(x + i * 48, y + 23); c.stroke(); }
    // Broad plinth; fluted towers are spaced beyond the arched door.
    for (const d of [-1, 1]) {
      const px = x + d * 154;
      c.fillStyle = happy ? '#e7d9f5' : '#a397b7'; c.strokeStyle = happy ? '#b7a4ca' : '#736b8b'; c.lineWidth = 3;
      G().rrect(px - 22, y - 251, 44, 237, 9, c); c.fill(); c.stroke();
      c.fillStyle = happy ? '#f8e9fc' : '#b5a4c5'; G().rrect(px - 33, y - 261, 66, 20, 7, c); c.fill(); c.stroke();
      G().rrect(px - 34, y - 20, 68, 20, 7, c); c.fill(); c.stroke();
      for (const dx of [-10, 0, 10]) { c.beginPath(); c.moveTo(px + dx, y - 233); c.lineTo(px + dx, y - 32); c.stroke(); }
      c.fillStyle = happy ? '#ffe6a0' : '#9c91ae'; G().star(px, y - 281, 23, 4, 0.42, 0, c); c.fill(); c.stroke();
      if (happy) G().drawGlow(px, y - 281, 43, '#ffedbc', 0.45, c);
    }
    const arch = (w, crown) => {
      c.beginPath(); c.moveTo(x - w, y - 12); c.lineTo(x - w, y - 182);
      c.quadraticCurveTo(x - w, y - crown + 35, x, y - crown);
      c.quadraticCurveTo(x + w, y - crown + 35, x + w, y - 182); c.lineTo(x + w, y - 12); c.closePath();
    };
    c.fillStyle = happy ? '#eadbf9' : '#92839f'; c.strokeStyle = happy ? '#ad94ca' : '#625673'; c.lineWidth = 5;
    arch(121, 335); c.fill(); c.stroke();
    const colors = ['#ef88b2', '#f3b479', '#eddb81', '#9bceaa', '#91cddb', '#97a8dc', '#b49cd7'];
    colors.forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = happy ? 1 : 0.65; c.lineWidth = 4; arch(111 - i * 5, 323 - i * 5); c.stroke(); });
    c.globalAlpha = 1;
    c.fillStyle = happy ? '#b9ebdd' : '#403b56'; arch(73, 278); c.fill();
    const portal = c.createLinearGradient(x, y - 260, x, y - 12);
    portal.addColorStop(0, happy ? '#fff0bf' : '#55506e'); portal.addColorStop(1, happy ? '#c5f2e6' : '#82748c');
    c.fillStyle = portal; arch(67, 266); c.fill();
    c.strokeStyle = happy ? '#fff8d5' : '#a190af'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y - 262); c.lineTo(x, y - 12); c.stroke();
    for (const d of [-1, 1]) {
      c.fillStyle = happy ? '#ffdf87' : '#bca8b0'; G().circle(x + d * 11, y - 98, 4, c); c.fill();
      c.strokeStyle = happy ? '#97c589' : '#5a546c'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(x + d * 97, y - 12); c.bezierCurveTo(x + d * 50, y - 105, x + d * 158, y - 174, x + d * 111, y - 218); c.stroke();
      for (let i = 0; i < 6; i++) {
        const vx = x + d * (97 + Math.sin(i * 1.8) * 18), vy = y - 30 - i * 31;
        c.fillStyle = happy ? '#9bce8b' : '#6f647d'; G().ellipse(vx, vy, 12, 5, d * 0.7, c); c.fill();
        if (happy) BB.Cosmetics.flower(c, vx + d * 6, vy - 3, 8, colors[i]);
      }
    }
    // A picture of the sad kitten explains who waits beyond the door.
    G().drawGlow(x, y - 165, 46, happy ? '#fff5b7' : '#b29ad1', 0.3, c);
    const hunt = RF().hunting(save), mama = RF().mamaReady(save);
    // (the sky's clouds go behind the doorway's picture sign)
    for (let i = 0; i < 6; i++) {
      const cx = left + 52 + i * 167 + Math.sin(t * 0.007 + i) * 5, cy = y - 377 - Math.sin(i * 1.4) * 32;
      if (!happy) {
        BB.Critters.moodCloud(c, cx, cy, 1, t + i * 40, 2.4);
        if (i % 2 === 0) BB.Critters.face(c, cx, cy + 9, 1.3, 1, { t, lid: '#697084' });
      } else {
        c.fillStyle = 'rgba(255,255,255,0.85)'; G().ellipse(cx, cy, 47, 16, 0, c); c.fill();
        G().circle(cx - 17, cy - 9, 19, c); c.fill(); G().circle(cx + 9, cy - 12, 23, c); c.fill();
      }
    }
    if (hunt || mama) {
      // Mama waits beyond the doorway, grey and sad, until she's rescued
      BB.Kittens.draw(c, BB.Kittens.fadedId('rbMama', 1), { mode: 'sit', sad: 0.9, t }, x, y - 138, 1.45, 1);
      BB.Critters.moodCloud(c, x, y - 228, 1, t, 1.1);
      if (hunt) {
        // the six who must come home first, grey until they do
        c.fillStyle = 'rgba(255,248,239,0.94)'; c.strokeStyle = '#c4a4f0'; c.lineWidth = 2;
        G().rrect(x - 112, y - 384, 224, 52, 20, c); c.fill(); c.stroke();
        RF().WORLD().forEach((id, i) => RF().face(c, id, x - 85 + i * 34, y - 357, 1.5, !!save.kin[id]));
        c.strokeStyle = '#c5a16b'; c.lineWidth = 4;
        c.beginPath(); c.arc(x, y - 70, 9, Math.PI, 0); c.stroke();
        c.fillStyle = '#e8c77d'; G().rrect(x - 14, y - 71, 28, 23, 6, c); c.fill();
      }
    } else BB.Kittens.draw(c, 'rainbow', { mode: 'sit', sad: happy ? 0 : 0.9, happy, t }, x, y - 138, 1.7, 1);
    if (happy) { rainbow(c, left + 280, y - 150, t, 2.7); G().drawGlow(left + 126, y - 408, 95, '#fff3af', 0.6, c); }
    for (let i = 0; i < 15; i++) {
      const fx = left + 27 + i * 62, fy = y - 13;
      c.strokeStyle = happy ? '#78a97a' : '#766d81'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx - 8, fy - 23, fx + (happy ? 0 : -12), fy - (happy ? 34 : 17)); c.stroke();
      BB.Cosmetics.flower(c, fx + (happy ? 0 : -12), fy - (happy ? 34 : 17), happy ? 8 : 5, happy ? colors[i % 7] : '#a496ab');
      if (happy) { c.fillStyle = '#fff4b4'; G().star(fx + Math.sin(t * 0.008 + i) * 9, fy - 52 - (t + i * 31) % 100, 2.2, 4, 0.4, 0, c); c.fill(); }
    }
    BB.Links.hintRing(c, x, y - 4, t);
    c.restore();
  }

  Object.assign(BB.Play, {
    syncRainbowGate() {
      const r = BB.World.byId.hm;
      if (this.rainbowExitPass && this.pl.body.x > (r.x + 3) * T) this.rainbowExitPass = false;
      const open = BB.GardenMaze.available(this.save) || !!this.rainbowExitPass;
      if (open === this.rainbowGateOpen) return;
      this.rainbowGateOpen = open;
      for (let row = 28; row < 32; row++) BB.World.setTile(r.x + 1, r.y + row, open ? '.' : '#');
    },
    updateJourney() {
      this.syncRainbowGate();
      if (this.room.id !== 'nm' || this.iris || this.traveling || this.pl.state !== 'play') { this.journeyHold = 0; return; }
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
      BB.Voice.stop();
      this.portalChoice = { kind, t: 0, focus: kind === 'cloud' ? 1 : 0 };
      this.pl.state = 'homechoice'; this.pl.body.vx = 0; this.journeyHold = 0;
      BB.Input.takePointers(); S().select();
      if (kind === 'cloud') this.sayStory('story_replay_choice', 0, false);
      else if (RF().mamaReady(this.save)) this.sayStory('kin_mama_call', 0, false);
      else if (!this.save.mazeSolved) this.sayStory('story_rainbow_call', 0, false);
      return true;
    },
    closeJourneyChoice() {
      BB.Voice.stop();
      const w = this.portalChoice;
      this.journeyLock = w && w.kind; this.journeyHold = 0;
      this.portalChoice = null; this.pl.state = 'play'; this.pl.idleT = 0;
      S().select();
    },
    chooseJourney() {
      const w = this.portalChoice;
      if (!w || !unlocked(this.save, w.kind)) return false;
      if (w.focus === 1) { this.closeJourneyChoice(); return false; }
      if (w.kind === 'rainbow') return RF().mamaReady(this.save) ? this.openCloud() : this.openMaze();
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
      if (room.def.home) { rainbowDoor(c, (room.x + 2.5) * T - cam.x, (room.y + 32) * T - cam.y, this.save, t); return; }
      if (room.id !== 'nm') return;
      if (!BB.GardenMaze.available(this.save)) return;
      grandGarden(c, room, cam, this.save, t);
      for (const kind of ['rainbow', 'cloud']) if (unlocked(this.save, kind)) {
        const q = spot(kind), x = q.x - cam.x, y = q.y - cam.y;
        if (kind === 'cloud') {
          G().drawGlow(x, y - 50, 60, '#c8bbec', 0.25, c);
          sadCloud(c, x, y - 57 + Math.sin(t * 0.03) * 3, t, 1.45);
          G().text('Play again', x, y - 116, 15, '#786080', null, 'center', c);
          BB.Links.hintRing(c, x, y - 4, t);
        }
      }
    },
    drawJourneyChoice(c, t) {
      const w = this.portalChoice, replay = w.kind === 'cloud';
      c.save(); c.fillStyle = 'rgba(35,28,56,0.6)'; c.fillRect(0, 0, G().W, G().H);
      c.fillStyle = '#fff8ee'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 5;
      G().rrect(200, 107, 560, 351, 36, c); c.fill(); c.stroke();
      const mama = RF().mamaReady(this.save);
      G().text(replay ? 'Replay as Rainbow?' : mama ? "Rainbow's Mama" : 'Rescue Rainbow', 480, 156, 26, '#82629c', null, 'center', c);
      if (replay) {
        BB.Kittens.draw(c, 'rainbow', { mode: 'sit', happy: true, t, wear: this.save.wear }, 354, 314, 2.4, 1);
        sadCloud(c, 599, 243, t, 2.3);
        BB.HUD.zoneIcon(c, BB.HOME_ZONE, 599, 291, 0.8);
        G().text('Restart adventure · Keep skills and outfits', 480, 339, 15, '#82629c', null, 'center', c);
      } else {
        rainbow(c, 392, 291, t, 1.15);
        if (mama) {
          // Mama, and a little cloud maze with its colour bridges
          BB.Kittens.draw(c, BB.Kittens.fadedId('rbMama', 1), { mode: 'sit', sad: 0.9, t }, 391, 282, 1.45, 1);
          BB.CloudMaze.picture(c, 586, 246, 0.9, t);
          RF().WORLD().forEach((id, i) => RF().face(c, id, 424 + i * 26, 336, 0.95, true));
        } else {
          BB.Kittens.draw(c, 'rainbow', { mode: 'sit', t }, 391, 282, 1.7, 1);
          c.fillStyle = '#55945b'; G().rrect(528, 201, 116, 91, 12, c); c.fill();
          c.strokeStyle = '#eaddb4'; c.lineWidth = 8;
          c.beginPath(); c.moveTo(630, 280); c.lineTo(555, 280); c.lineTo(555, 252); c.lineTo(612, 252); c.lineTo(612, 217); c.lineTo(543, 217); c.stroke();
          BB.GardenMaze.PADS.forEach((p, i) => {
            c.fillStyle = this.save.pads[p.key] ? '#b6e5ac' : '#e9ded4';
            G().circle(446 + i * 34, 336, 12, c); c.fill();
            BB.Gestures.drawPaw(c, 446 + i * 34, 336, 0.5, this.save.pads[p.key] ? '#4d9259' : '#b29d89', '#b29d89');
          });
        }
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
