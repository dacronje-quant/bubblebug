// ════════════════════════════════════════════════════════════════
//  BOSS ART — the twelve big gloomy friends-to-be, in vector.
//
//  Each is drawn facing right around its body centre, about 22 units
//  in radius, with the floor 20 units below the centre (so squash and
//  stretch stay planted on the ground). Poses:
//    sulk     sitting about, sighing           tele    winding up
//    attack   mid sad-attack (mouth open)      dash    rolling / charging
//    hop      mid-jump                         sniffle sitting, crying
//    pop      a gloom cloud just popped        happy / dance  friends!
//  Colours stay a little grey while they're gloomy and warm up as their
//  clouds pop.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;
  const OUT = '#3a2a3a';

  const tone = (hex, m) => BB.mix(hex, '#8d8a9a', m * 0.38);
  const isHappy = st => st.pose === 'happy' || st.pose === 'dance';

  function tears(c, x, y, s, t) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const k = ((t * 0.03 + i * 0.5 + (side > 0 ? 0.25 : 0)) % 1);
        c.fillStyle = `rgba(140,200,255,${0.95 - k * 0.7})`;
        const tx = x + side * 4.2 * s, ty = y + 2 * s + k * 12 * s;
        c.beginPath(); c.moveTo(tx, ty - 2 * s); c.quadraticCurveTo(tx + 1.4 * s, ty, tx, ty + 1.3 * s); c.quadraticCurveTo(tx - 1.4 * s, ty, tx, ty - 2 * s); c.fill();
      }
    }
  }

  function face(c, x, y, s, st, lid) {
    const happy = isHappy(st);
    BB.Critters.face(c, x, y, s, happy ? 0 : Math.max(0.25, st.mood), { t: st.t, blink: st.blink, joy: happy, lid: lid || '#8a7a8a', lookX: 0.4 });
    if (!happy && (st.open || 0) > 0.3) {
      c.fillStyle = '#6a2a3a';
      G.ellipse(x, y + 5 * s, 2 * s, 1.8 * s * st.open, 0, c); c.fill();
    }
    if ((st.pose === 'sniffle' && st.tears !== false) || st.pose === 'pop') tears(c, x, y, s, st.t);
    if (st.pose === 'tele' && !happy) {
      // a grumpy puff of steam
      c.fillStyle = 'rgba(200,205,220,0.7)';
      const k = (st.t * 0.05) % 1;
      G.circle(x + 9 * s + k * 4, y - 9 * s - k * 8, 2 * s + k * 2, c); c.fill();
    }
  }

  function legs4(c, xs, y0, len, col, t, walk) {
    c.strokeStyle = OUT; c.lineCap = 'round';
    xs.forEach((lx, i) => {
      const sw = walk ? Math.sin(t * 0.3 + i * 1.6) * 3 : 0;
      c.lineWidth = 7.4; c.strokeStyle = OUT;
      c.beginPath(); c.moveTo(lx, y0); c.lineTo(lx + sw, y0 + len); c.stroke();
      c.lineWidth = 5.4; c.strokeStyle = col;
      c.beginPath(); c.moveTo(lx, y0); c.lineTo(lx + sw, y0 + len); c.stroke();
    });
  }

  const ART = {
    // ── Sparkle Gardens: the Grumpy Goose ──
    goose(c, st) {
      const m = st.mood, t = st.t;
      const white = tone('#ffffff', m), orange = tone('#ff9a3a', m);
      const flap = st.pose === 'tele' || st.pose === 'attack' ? Math.sin(t * 0.55) * 0.7 : Math.sin(t * 0.05) * 0.08;
      // legs & feet
      for (const lx of [-5, 5]) {
        c.strokeStyle = orange; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(lx, 10); c.lineTo(lx + 1, 18); c.stroke();
        c.fillStyle = orange; c.strokeStyle = OUT; c.lineWidth = 1;
        c.beginPath(); c.moveTo(lx - 3, 20); c.lineTo(lx + 6, 20); c.lineTo(lx + 1, 16); c.closePath(); c.fill(); c.stroke();
      }
      // tail tuft
      c.fillStyle = white; c.strokeStyle = OUT; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-17, -2); c.lineTo(-27, -12); c.lineTo(-22, 2); c.closePath(); c.fill(); c.stroke();
      // body
      G.ellipse(-2, 2, 20, 13, 0, c); c.fill(); c.stroke();
      // wing
      c.save(); c.translate(-4, -2); c.rotate(-flap);
      c.fillStyle = tone('#eeeef6', m);
      G.ellipse(-6, 0, 13, 7, -0.2, c); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,120,150,0.5)'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-16 + i * 5, 1); c.lineTo(-12 + i * 5, 5); c.stroke(); }
      c.restore();
      // neck
      const nod = st.pose === 'sniffle' ? 5 : st.pose === 'attack' ? -3 : 0;
      c.strokeStyle = OUT; c.lineWidth = 10.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(10, -2); c.quadraticCurveTo(15, -12, 12, -22 + nod); c.stroke();
      c.strokeStyle = white; c.lineWidth = 8;
      c.beginPath(); c.moveTo(10, -2); c.quadraticCurveTo(15, -12, 12, -22 + nod); c.stroke();
      // head
      c.fillStyle = white; c.strokeStyle = OUT; c.lineWidth = 1.4;
      G.circle(13, -26 + nod, 8.5, c); c.fill(); c.stroke();
      // beak (opens to honk)
      const o = (st.open || 0) * 4;
      c.fillStyle = orange;
      c.beginPath(); c.moveTo(19, -28 + nod); c.lineTo(29, -25 + nod - o * 0.3); c.lineTo(19, -24 + nod); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(19, -24 + nod); c.lineTo(27, -22 + nod + o); c.lineTo(19, -22 + nod); c.closePath(); c.fill(); c.stroke();
      // a little blue bonnet with a daisy
      c.fillStyle = tone('#8fc8ff', m);
      c.beginPath(); c.arc(11, -28 + nod, 9, Math.PI * 0.95, Math.PI * 1.75); c.lineTo(11, -28 + nod); c.closePath(); c.fill(); c.stroke();
      BB.Tiles.flower(c, 5, -32 + nod, '#ffffff', 0.7);
      face(c, 14, -26 + nod, 0.62, st);
    },

    // ── Mushroom Meadow: the Toadstool Toad ──
    toad(c, st) {
      const m = st.mood, t = st.t;
      const green = tone('#6cc27a', m), belly = tone('#e8f5c8', m), dark = tone('#3f8a52', m);
      const hop = st.pose === 'hop';
      // back legs
      c.fillStyle = green; c.strokeStyle = OUT; c.lineWidth = 1.4;
      if (hop) {
        for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 12, 18, 5, 10, d * 0.3, 0, TAU); c.fill(); c.stroke(); }
      } else {
        for (const d of [-1, 1]) { G.ellipse(d * 15, 13, 10, 7, d * -0.3, c); c.fill(); c.stroke(); }
      }
      // body
      G.ellipse(0, 4, 23, 15, 0, c); c.fill(); c.stroke();
      c.fillStyle = belly; G.ellipse(0, 9, 14, 9, 0, c); c.fill();
      // spots
      c.fillStyle = dark;
      for (const [sx, sy, r] of [[-15, -2, 3], [-8, -8, 2.2], [14, -3, 2.6]]) { G.circle(sx, sy, r, c); c.fill(); }
      // front feet
      c.fillStyle = green;
      for (const d of [-1, 1]) { G.ellipse(d * 8, 18, 5, 2.6, 0, c); c.fill(); c.stroke(); }
      // bulgy eye bumps
      c.fillStyle = green;
      for (const d of [-1, 1]) { G.circle(d * 7 + 2, -10, 7, c); c.fill(); c.stroke(); }
      face(c, 2, -8, 1.25, st, '#5a9a62');
      // wide mouth line
      if (!isHappy(st)) {
        c.strokeStyle = OUT; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(-12, 2); c.quadraticCurveTo(2, (st.open || 0) * 6 - 1, 16, 2); c.stroke();
      }
      // mushroom cap hat
      c.fillStyle = tone('#ff5d6c', m); c.strokeStyle = OUT; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(1, -18, 14, 8, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      for (const [sx, sy, r] of [[-6, -21, 2.2], [3, -24, 2.6], [10, -20, 1.8]]) { G.circle(sx, sy, r, c); c.fill(); }
      // cheeks puff when blowing spores
      if ((st.open || 0) > 0.5) { c.fillStyle = tone('#9fe0a8', m); G.circle(16, 0, 4 * st.open, c); c.fill(); c.stroke(); }
    },

    // ── Crystal Caverns: the Crystal Armadillo ──
    armadillo(c, st) {
      const m = st.mood, t = st.t;
      const shell = tone('#8a7ab8', m), band = tone('#5a4a8a', m), skin = tone('#e0b8a0', m);
      if (st.pose === 'dash') {
        // curled into a crystal ball and rolling
        c.save(); c.translate(0, 2); c.rotate(st.roll || 0);
        c.fillStyle = shell; c.strokeStyle = OUT; c.lineWidth = 1.6;
        G.circle(0, 0, 18, c); c.fill(); c.stroke();
        c.strokeStyle = band; c.lineWidth = 2.2;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(0, 0, 18, i * 0.55 - 0.2, i * 0.55 + 0.2); c.stroke(); c.beginPath(); c.moveTo(Math.cos(i * 0.55) * 6, Math.sin(i * 0.55) * 6); c.lineTo(Math.cos(i * 0.55) * 17, Math.sin(i * 0.55) * 17); c.stroke(); }
        for (let i = 0; i < 5; i++) {
          const a = i * TAU / 5;
          c.fillStyle = 'rgba(190,230,255,0.95)'; c.strokeStyle = '#5a6fc0'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(Math.cos(a - 0.15) * 17, Math.sin(a - 0.15) * 17); c.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); c.lineTo(Math.cos(a + 0.15) * 17, Math.sin(a + 0.15) * 17); c.closePath(); c.fill(); c.stroke();
        }
        c.restore();
        return;
      }
      // tail
      c.fillStyle = shell; c.strokeStyle = OUT; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(-18, 8); c.quadraticCurveTo(-30, 12, -32, 18); c.quadraticCurveTo(-26, 14, -16, 13); c.closePath(); c.fill(); c.stroke();
      // legs
      legs4(c, [-12, -4, 6, 13], 10, 9, skin, t, false);
      // shell dome with bands
      c.fillStyle = shell;
      c.beginPath(); c.moveTo(-20, 12); c.quadraticCurveTo(-20, -16, 0, -16); c.quadraticCurveTo(18, -16, 18, 12); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = band; c.lineWidth = 2;
      for (const bx of [-10, -2, 6]) { c.beginPath(); c.moveTo(bx, -15); c.quadraticCurveTo(bx + 2, 0, bx, 11); c.stroke(); }
      // crystals on the back
      for (const [cx, cy, h] of [[-12, -12, 9], [-3, -16, 12], [7, -13, 9]]) {
        c.fillStyle = 'rgba(190,230,255,0.95)'; c.strokeStyle = '#5a6fc0'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(cx - 3, cy + 3); c.lineTo(cx, cy - h); c.lineTo(cx + 3, cy + 3); c.closePath(); c.fill(); c.stroke();
        if (!isHappy(st)) G.drawGlow(cx, cy - h * 0.5, 8, '#bfe6ff', 0.4, c);
      }
      // head, big ears and a long snout
      c.fillStyle = skin; c.strokeStyle = OUT; c.lineWidth = 1.3;
      const droop = st.pose === 'sniffle' ? 0.5 : 0;
      for (const [ex, a] of [[16, -0.5 - droop], [21, 0.2 + droop]]) { c.save(); c.translate(ex, -6); c.rotate(a); G.ellipse(0, -6, 3.6, 7, 0, c); c.fill(); c.stroke(); c.restore(); }
      G.ellipse(21, 2, 9, 7, 0.1, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(27, -1); c.quadraticCurveTo(36, 3, 34, 6); c.quadraticCurveTo(29, 7, 26, 5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff9fb0'; G.circle(34, 4.5, 1.6, c); c.fill();
      face(c, 21, 0, 0.62, st, '#c09a88');
    },

    // ── Honeycomb Hive: the Queen Bee ──
    queenbee(c, st) {
      const m = st.mood, t = st.t;
      const yellow = tone('#ffcf3a', m), dark = tone('#4a3a2a', m);
      const resting = st.pose === 'sniffle' || st.pose === 'sulk' || st.pose === 'pop';
      const flap = resting ? Math.sin(t * 0.1) * 0.15 : Math.sin(t * 0.9) * 0.45;
      // wings
      c.fillStyle = 'rgba(230,245,255,0.75)'; c.strokeStyle = 'rgba(80,110,160,0.7)'; c.lineWidth = 1.2;
      for (const d of [-1, 1]) {
        c.save(); c.translate(-2 + d * 4, -12); c.rotate(d * (0.5 + flap) - 0.1);
        G.ellipse(0, -12, 8, 15, 0, c); c.fill(); c.stroke();
        c.restore();
      }
      // legs dangling
      c.strokeStyle = dark; c.lineWidth = 1.6; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const lx = -6 + i * 6; c.beginPath(); c.moveTo(lx, 14); c.lineTo(lx + Math.sin(t * 0.1 + i) * 2, 20); c.stroke(); }
      // fuzzy striped body
      c.fillStyle = yellow; c.strokeStyle = OUT; c.lineWidth = 1.5;
      G.ellipse(-2, 4, 18, 14, 0, c); c.fill(); c.stroke();
      c.save(); G.ellipse(-2, 4, 18, 14, 0, c); c.clip();
      c.fillStyle = dark; c.fillRect(-12, -12, 5, 30); c.fillRect(-1, -12, 5, 30);
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.35)'; G.ellipse(-8, -3, 6, 3, -0.4, c); c.fill();
      // head
      c.fillStyle = dark; c.strokeStyle = OUT;
      G.circle(15, -8, 10, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffe8a0', m); G.circle(16, -7, 8, c); c.fill();
      // antennae
      c.strokeStyle = dark; c.lineWidth = 1.2;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(14 + d * 3, -16); c.quadraticCurveTo(14 + d * 7, -24, 14 + d * 9, -24); c.stroke(); c.fillStyle = '#ff8fb8'; G.circle(14 + d * 9, -24, 2, c); c.fill(); }
      // her crown slips when she's sad
      c.save(); c.translate(15, -17); c.rotate(-0.1 - m * 0.4);
      c.fillStyle = '#ffd34d'; c.strokeStyle = '#c28a14'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-7, 2); c.lineTo(-8, -6); c.lineTo(-3, -2); c.lineTo(0, -8); c.lineTo(3, -2); c.lineTo(8, -6); c.lineTo(7, 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff7b9c'; G.circle(0, -8, 1.6, c); c.fill();
      c.restore();
      face(c, 16, -7, 0.72, st, '#d8b860');
    },

    // ── Rainy Ruins: the Weepy Elephant ──
    elephant(c, st) {
      const m = st.mood, t = st.t;
      const grey = tone('#9aa8c8', m), dark = tone('#7888aa', m), pink = tone('#ffb3c8', m);
      const stomp = st.pose === 'tele' && st.style !== 'spray';
      // tail
      c.strokeStyle = dark; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(-28, 6, -26, 12); c.stroke();
      // legs (front pair lifts before a stomp)
      const lift = stomp ? Math.max(0, Math.sin(t * 0.2)) * 6 : 0;
      legs4(c, [-16, -7, 5, 13], 8, 12, grey, t, false);
      if (lift) { c.fillStyle = grey; G.rrect(9, 8 - lift, 8, 12, 3, c); c.fill(); }
      // body
      c.fillStyle = grey; c.strokeStyle = OUT; c.lineWidth = 1.5;
      G.ellipse(-3, 0, 22, 15, 0, c); c.fill(); c.stroke();
      // big flappy ear
      const ef = Math.sin(t * (st.pose === 'tele' ? 0.4 : 0.06)) * 0.25;
      c.save(); c.translate(10, -8); c.rotate(ef);
      c.fillStyle = grey; G.ellipse(-2, 2, 10, 13, 0, c); c.fill(); c.stroke();
      c.fillStyle = pink; G.ellipse(-2, 2, 6.5, 9, 0, c); c.fill();
      c.restore();
      // head
      c.fillStyle = grey; c.strokeStyle = OUT;
      G.circle(17, -7, 11, c); c.fill(); c.stroke();
      // trunk: droops, or lifts high to spray
      const up = st.pose === 'attack' || (st.pose === 'tele' && st.style === 'spray') || st.pose === 'happy' || st.pose === 'dance';
      c.strokeStyle = OUT; c.lineWidth = 8.4; c.lineCap = 'round';
      const tr = up ? [[26, -4], [34, -10], [34, -24]] : [[26, -2], [32, 6], [29, 14]];
      c.beginPath(); c.moveTo(24, -4); c.quadraticCurveTo(tr[0][0] + 6, tr[1][1], tr[2][0], tr[2][1]); c.stroke();
      c.strokeStyle = grey; c.lineWidth = 6;
      c.beginPath(); c.moveTo(24, -4); c.quadraticCurveTo(tr[0][0] + 6, tr[1][1], tr[2][0], tr[2][1]); c.stroke();
      // a pink bow on top
      c.fillStyle = pink; c.strokeStyle = OUT; c.lineWidth = 1;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(16, -17); c.lineTo(16 + d * 6, -21); c.lineTo(16 + d * 6, -13); c.closePath(); c.fill(); c.stroke(); }
      G.circle(16, -17, 2, c); c.fill();
      face(c, 18, -9, 0.66, st, '#8a96b4');
    },

    // ── Cloud Castles: the Cloud King (drawn by the critters module) ──
    king(c, st) {
      BB.Critters.drawKing(c, 0, -4, {
        t: st.t, mood: isHappy(st) ? 0 : Math.max(0.25, st.mood), facing: 1, scale: 1, blink: st.blink,
        joy: isHappy(st), noCloud: true, lookX: 0.4,
      });
      if ((st.pose === 'sniffle' && st.tears !== false) || st.pose === 'pop') tears(c, 0, -16, 1.05, st.t);
    },

    // ── Coral Lagoon: the Grumpy Octopus ──
    octopus(c, st) {
      const m = st.mood, t = st.t;
      const pink = tone('#ff8fa8', m), dark = tone('#d0607a', m), spot = tone('#ffc0cc', m);
      const slap = st.pose === 'attack' || st.pose === 'tele';
      // tentacles swaying in the water
      c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const bx = -15 + i * 6;
        const raised = slap && i === 5;
        c.strokeStyle = OUT; c.lineWidth = 7.4;
        const path = () => {
          c.beginPath(); c.moveTo(bx, 6);
          if (raised) c.bezierCurveTo(bx + 10, -4, bx + 18, -22, bx + 10 + Math.sin(t * 0.3) * 4, -30);
          else c.bezierCurveTo(bx + Math.sin(t * 0.08 + i) * 6, 14, bx - 4 + Math.sin(t * 0.06 + i * 1.3) * 8, 22, bx + (i - 2.5) * 3, 26);
        };
        path(); c.stroke();
        c.strokeStyle = pink; c.lineWidth = 5.4; path(); c.stroke();
      }
      // mantle
      c.fillStyle = pink; c.strokeStyle = OUT; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(0, -6, 19, 21, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = spot;
      for (const [sx, sy, r] of [[-10, -16, 3], [6, -20, 2.4], [12, -10, 2], [-4, -24, 1.8]]) { G.circle(sx, sy, r, c); c.fill(); }
      // a tiny sailor cap
      c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 1.1;
      c.beginPath(); c.ellipse(2, -26, 9, 4, -0.1, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#5fb8ff'; c.fillRect(-6, -27, 16, 2.4);
      face(c, 1, -6, 1.2, st, '#e08a9a');
      if ((st.open || 0) > 0.4) { c.fillStyle = '#6a2a4a'; G.circle(1, 3, 2 + st.open * 2, c); c.fill(); }
    },

    // ── Sunny Dunes: the Sulky Camel ──
    camel(c, st) {
      const m = st.mood, t = st.t;
      const tan = tone('#e0b070', m), dark = tone('#b88848', m);
      const sneeze = st.pose === 'attack' ? Math.sin(t * 0.4) * 3 : 0;
      legs4(c, [-14, -7, 7, 13], 6, 14, tan, t, false);
      // knobbly knees
      c.fillStyle = dark; for (const lx of [-14, -7, 7, 13]) { G.circle(lx, 13, 2.2, c); c.fill(); }
      // body + humps
      c.fillStyle = tan; c.strokeStyle = OUT; c.lineWidth = 1.5;
      G.ellipse(-2, 0, 20, 11, 0, c); c.fill(); c.stroke();
      for (const hx of [-10, 3]) { c.beginPath(); c.arc(hx, -6, 8, Math.PI, 0); c.fill(); c.stroke(); }
      // a colourful blanket with tassels
      c.fillStyle = tone('#ff7b9c', m);
      G.rrect(-9, -6, 13, 9, 2, c); c.fill(); c.stroke();
      c.fillStyle = tone('#ffd04a', m); c.fillRect(-9, -3, 13, 2);
      c.fillStyle = tone('#7cc8ff', m);
      for (let i = 0; i < 4; i++) { G.circle(-8 + i * 4, 4, 1.4, c); c.fill(); }
      // tail
      c.strokeStyle = dark; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-21, -2); c.quadraticCurveTo(-25, 4, -24, 9); c.stroke();
      // neck and head
      const hy = st.pose === 'sniffle' ? 6 : 0;
      c.strokeStyle = OUT; c.lineWidth = 10.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(14, -2); c.quadraticCurveTo(22, -8, 23, -16 + hy); c.stroke();
      c.strokeStyle = tan; c.lineWidth = 8;
      c.beginPath(); c.moveTo(14, -2); c.quadraticCurveTo(22, -8, 23, -16 + hy); c.stroke();
      c.fillStyle = tan; c.strokeStyle = OUT; c.lineWidth = 1.4;
      G.ellipse(26 + sneeze, -19 + hy, 9, 6.5, 0.15, c); c.fill(); c.stroke();
      c.fillStyle = tone('#f0d0a0', m); G.ellipse(32 + sneeze, -17 + hy, 4, 3.4, 0, c); c.fill();
      c.fillStyle = OUT; G.circle(34 + sneeze, -18 + hy, 0.9, c); c.fill();
      c.fillStyle = tan; G.ellipse(21 + sneeze, -25 + hy, 2, 3.4, -0.4, c); c.fill(); c.stroke();
      face(c, 25 + sneeze, -20 + hy, 0.58, st, '#c8a060');
    },

    // ── Frosty Peaks: the Glum Walrus ──
    walrus(c, st) {
      const m = st.mood, t = st.t;
      const brown = tone('#b0866a', m), light = tone('#d8b89a', m);
      c.save();
      if (st.pose === 'dash') { c.translate(0, 6); c.scale(1.1, 0.72); }
      // back flippers
      c.fillStyle = brown; c.strokeStyle = OUT; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-20, 12); c.lineTo(-30, 8 + Math.sin(t * 0.1) * 2); c.lineTo(-30, 18); c.closePath(); c.fill(); c.stroke();
      // body
      G.ellipse(-2, 4, 23, 16, 0, c); c.fill(); c.stroke();
      c.fillStyle = light; G.ellipse(2, 10, 14, 7, 0, c); c.fill();
      // front flipper
      c.fillStyle = brown;
      c.save(); c.translate(6, 12); c.rotate(st.pose === 'tele' ? Math.sin(t * 0.5) * 0.5 : 0.3);
      G.ellipse(0, 4, 4, 8, 0.4, c); c.fill(); c.stroke();
      c.restore();
      // face, whisker pads and little rounded tusks
      face(c, 10, -6, 0.95, st, '#9a7a62');
      c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 1;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(10 + d * 2.5, 3); c.quadraticCurveTo(10 + d * 3.5, 10, 10 + d * 2, 13); c.quadraticCurveTo(10 + d * 1, 9, 10 + d * 1, 3); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = light;
      for (const d of [-1, 1]) { G.circle(10 + d * 3.6, 0.5, 3.8, c); c.fill(); }
      c.fillStyle = OUT; for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { G.circle(10 + d * (2 + i * 1.3), -0.5 + (i % 2) * 1.6, 0.5, c); c.fill(); }
      c.fillStyle = '#5a3a2a'; G.ellipse(10, -1.5, 2, 1.4, 0, c); c.fill();
      // red and white bobble hat
      c.fillStyle = '#ff6b6b'; c.strokeStyle = OUT; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(8, -15, 10, 7, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G.rrect(-2, -16, 20, 3.4, 1.5, c); c.fill(); c.stroke();
      G.circle(8, -23, 3, c); c.fill(); c.stroke();
      c.restore();
    },

    // ── Autumn Woods: the Mopey Moose ──
    moose(c, st) {
      const m = st.mood, t = st.t;
      const brown = tone('#8a5a3a', m), tanA = tone('#e8c890', m);
      const dash = st.pose === 'dash';
      legs4(c, [-14, -7, 6, 12], 6, 14, brown, t, dash);
      // body
      c.fillStyle = brown; c.strokeStyle = OUT; c.lineWidth = 1.5;
      G.ellipse(-3, -1, 20, 12, 0, c); c.fill(); c.stroke();
      c.fillStyle = tone('#a87050', m); G.ellipse(-3, 3, 14, 6, 0, c); c.fill();
      // a stripy autumn scarf
      c.fillStyle = tone('#ffb060', m); G.rrect(9, -8, 8, 12, 3, c); c.fill(); c.stroke();
      c.fillStyle = tone('#d8442a', m); c.fillRect(9, -4, 8, 2.4); c.fillRect(9, 1, 8, 2.4);
      // head (lowers for a charge)
      c.save();
      c.translate(16, -12);
      c.rotate(dash ? 0.55 : st.pose === 'sniffle' ? 0.3 : 0);
      c.fillStyle = brown; c.strokeStyle = OUT; c.lineWidth = 1.4;
      G.ellipse(4, 0, 9, 7, 0.2, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(8, -3); c.quadraticCurveTo(18, 0, 17, 6); c.quadraticCurveTo(12, 8, 7, 5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = OUT; G.circle(16, 3, 0.9, c); c.fill();
      // ears
      c.fillStyle = brown;
      for (const d of [-1, 1]) { G.ellipse(-2 + d * 2, -6, 2.4, 5, d * 0.9, c); c.fill(); c.stroke(); }
      // big palm antlers
      c.fillStyle = tanA; c.strokeStyle = OUT; c.lineWidth = 1.2;
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(2 + d * 1, -6);
        c.quadraticCurveTo(2 + d * 8, -10, 2 + d * 14, -14);
        c.lineTo(2 + d * 16, -20); c.lineTo(2 + d * 12, -17); c.lineTo(2 + d * 12, -23); c.lineTo(2 + d * 8, -17); c.lineTo(2 + d * 6, -22); c.lineTo(2 + d * 4, -14);
        c.closePath(); c.fill(); c.stroke();
      }
      face(c, 5, -1, 0.62, st, '#7a4a2a');
      c.restore();
    },

    // ── Moonlit Springs: the Sleepy Panda ──
    panda(c, st) {
      const m = st.mood, t = st.t;
      const white = tone('#ffffff', m * 0.6), black = tone('#2e2a34', m * 0.3);
      if (st.pose === 'dash') {
        c.save(); c.translate(0, 2); c.rotate(st.roll || 0);
        c.fillStyle = white; c.strokeStyle = OUT; c.lineWidth = 1.6;
        G.circle(0, 0, 18, c); c.fill(); c.stroke();
        c.fillStyle = black;
        for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) { G.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 6, 5, a, c); c.fill(); }
        c.restore();
        return;
      }
      // legs & arms
      c.fillStyle = black; c.strokeStyle = OUT; c.lineWidth = 1.3;
      for (const d of [-1, 1]) { G.ellipse(d * 10, 16, 7, 5, 0, c); c.fill(); }
      // body
      c.fillStyle = white;
      G.ellipse(0, 4, 18, 15, 0, c); c.fill(); c.stroke();
      c.fillStyle = black; G.ellipse(0, -3, 17, 5, 0, c); c.fill();
      // holding a bamboo stalk
      c.fillStyle = tone('#8ac86a', m); c.strokeStyle = '#4a8a3a'; c.lineWidth = 1;
      G.rrect(12, -14, 4, 30, 2, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(12, 0); c.lineTo(16, 0); c.stroke();
      c.fillStyle = tone('#6cb04a', m); G.ellipse(19, -14, 6, 2.4, -0.5, c); c.fill();
      c.fillStyle = black; c.strokeStyle = OUT;
      for (const d of [-1, 1]) { G.ellipse(d * 12, 4, 5, 7, d * 0.4, c); c.fill(); }
      // head
      c.fillStyle = white; c.strokeStyle = OUT; c.lineWidth = 1.5;
      const nod = st.pose === 'sniffle' ? 3 : st.pose === 'sulk' ? Math.sin(t * 0.03) * 1.5 : 0;
      G.circle(2, -14 + nod, 13, c); c.fill(); c.stroke();
      c.fillStyle = black;
      for (const d of [-1, 1]) { G.circle(2 + d * 10, -24 + nod, 4.5, c); c.fill(); c.stroke(); }
      for (const d of [-1, 1]) { G.ellipse(2 + d * 4.2, -14 + nod, 3.6, 4.6, d * -0.5, c); c.fill(); }
      face(c, 2, -14 + nod, 0.9, st, '#2e2a34');
      c.fillStyle = OUT; G.ellipse(2, -9 + nod, 1.8, 1.2, 0, c); c.fill();
    },

    // ── Starlight Sky: the Moon Rabbit on her crescent moon ──
    moonbunny(c, st) {
      const m = st.mood, t = st.t;
      const fur = tone('#ffffff', m * 0.5), pink = tone('#ffc0d8', m), gold = tone('#ffe27a', m * 0.5);
      // the crescent moon she rides
      G.drawGlow(0, 12, 34, '#fff3c0', 0.35, c);
      c.fillStyle = gold; c.strokeStyle = '#c28a14'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, 2, 22, 0.15 * Math.PI, 0.85 * Math.PI); c.arc(0, -6, 26, 0.78 * Math.PI, 0.22 * Math.PI, true); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(200,150,40,0.35)'; G.circle(-8, 18, 2, c); c.fill(); G.circle(6, 19, 1.5, c); c.fill();
      // bunny body sitting in the crescent
      c.fillStyle = fur; c.strokeStyle = OUT; c.lineWidth = 1.4;
      G.ellipse(-1, 4, 11, 10, 0, c); c.fill(); c.stroke();
      G.circle(-11, 7, 4, c); c.fill(); c.stroke();
      // long ears — they droop when she's sad
      const droop = isHappy(st) ? 0 : 0.2 + m * 0.6;
      for (const d of [-1, 1]) {
        c.save(); c.translate(3 + d * 4, -18); c.rotate(d * (0.12 + droop * 0.7) + Math.sin(t * 0.05 + d) * 0.05);
        c.fillStyle = fur; G.ellipse(0, -11, 4, 12, 0, c); c.fill(); c.stroke();
        c.fillStyle = pink; G.ellipse(0, -10, 2, 8.5, 0, c); c.fill();
        c.restore();
      }
      // head
      c.fillStyle = fur; c.strokeStyle = OUT;
      G.circle(4, -12, 10, c); c.fill(); c.stroke();
      // a star hairclip
      c.fillStyle = '#ffe27a'; c.strokeStyle = '#c28a14'; c.lineWidth = 1;
      G.star(11, -20, 4, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      face(c, 5, -12, 0.78, st, '#c8c0d8');
      c.fillStyle = '#ff9fb8'; G.ellipse(5, -8, 1.4, 1, 0, c); c.fill();
      // tiny paws holding a mochi
      c.fillStyle = tone('#fff0f4', m); c.strokeStyle = OUT; c.lineWidth = 1;
      G.circle(8, 3, 4.2, c); c.fill(); c.stroke();
      c.fillStyle = fur; for (const d of [-1, 1]) { G.circle(8 + d * 4, 4, 2, c); c.fill(); c.stroke(); }
    },
  };

  // x, y = body centre on screen · s = scale · st = pose/mood state
  function draw(c, kind, x, y, s, st) {
    const fn = ART[kind];
    if (!fn) return;
    c.save();
    c.translate(x, y);
    const sq = st.squash || 1;
    const dance = st.pose === 'dance' ? Math.sin(st.t * 0.3) : 0;
    c.scale((st.facing || 1) * s, s);
    // squash & stretch anchored on the floor (20 units down)
    c.translate(0, 20); c.scale(1 / Math.sqrt(sq), sq); c.translate(0, -20);
    if (dance) { c.translate(0, -Math.abs(dance) * 6); c.rotate(dance * 0.12); }
    fn(c, st);
    if (st.flash > 0) G.drawGlow(0, 0, 30, '#fff6c2', st.flash * 0.7, c);
    c.restore();
  }

  BB.BossArt = { draw, KINDS: Object.keys(ART) };
})(window.BB);
