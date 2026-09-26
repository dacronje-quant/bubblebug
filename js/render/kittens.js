// ════════════════════════════════════════════════════════════════
//  KITTENS — the two heroes, painted procedurally in vector.
//
//  MARSHMALLOW — a fluffy cream Birman kitten: warm taupe points on
//    ears, mask and tail, a dark little nose, snowy "gloves" on every
//    paw, and big, sparkling sapphire-blue eyes.
//  PIP — a patchwork tortoiseshell-tabby: dark chocolate and ginger
//    patches with tabby stripes, a white bib and white paws, a ginger
//    cheek patch and bright green eyes.
//
//  drawKitten(ctx, catId, pose, x, y, scale, facing)
//    (x, y) is the point between the kitten's feet.
//    pose: { mode, phase, vy, blink, squash, puff, happy, yawn, ear,
//            tail, look, lick, t }  — see entities/player.js
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;

  const CATS = BB.CATS = {
    marshmallow: {
      id: 'marshmallow', name: 'Marshmallow', pattern: 'points', fluffy: true,
      fur: '#f7efe5', furShade: '#e7d9c9', belly: '#fffaf3',
      point: '#9a8072', pointDark: '#6c5549',
      earInner: '#dcb0a4', nose: '#6f5750', paw: '#ffffff',
      tail: '#d6c3b2', tailTip: '#8f7465',
      iris: '#3d8ff0', irisLight: '#a8e0ff', irisDark: '#123f8f',
      outline: '#5b4a44', blush: '#ffb3c1',
      bubbleTint: '#d8b8ff', bubbleTint2: '#ffc6e6', trail: 'heart',
    },
    pip: {
      id: 'pip', name: 'Pip', pattern: 'torbie', fluffy: false,
      fur: '#47301f', furShade: '#33221a', belly: '#fffaf2',
      patch: '#d27a2e', patchLight: '#e9a45d', stripe: '#22150d', face: '#a86a36',
      earInner: '#eaa59a', nose: '#e59482', paw: '#ffffff',
      tail: '#47301f', tailTip: '#22150d',
      iris: '#9fd046', irisLight: '#e4f7a0', irisDark: '#4f7d18',
      outline: '#2e2019', blush: '#ffab8f',
      bubbleTint: '#ffd27a', bubbleTint2: '#a8f0c8', trail: 'star',
    },
  };

  // ──── small helpers ────
  function limb(c, x0, y0, len, ang, w, color, outline, pawColor) {
    const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len;
    c.lineCap = 'round';
    c.strokeStyle = outline; c.lineWidth = w + 1.6;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = color; c.lineWidth = w;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    // paw / glove
    c.fillStyle = pawColor; c.strokeStyle = outline; c.lineWidth = 0.9;
    G.ellipse(x1 + 0.6, y1 - 0.4, w * 0.62, w * 0.48, 0, c); c.fill(); c.stroke();
  }

  function fluffEdge(c, cx, cy, rx, ry, n, amp, from, to) {
    // little scalloped fur tufts along an ellipse arc
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = from + (to - from) * (i / n);
      const r = 1 + (i % 2 ? amp : 0);
      c.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
    }
  }

  // ──── Tail ────
  function drawTail(c, cat, p, x, y, pose) {
    const t = pose.t || 0;
    const sway = Math.sin(t * 0.06 + (pose.tail || 0)) * 0.5 + (pose.tailLift || 0);
    // control points: tail rises from the rump and curls up
    let pts;
    if (pose.mode === 'sit') {
      pts = [[x, y], [x - 7, y + 3], [x - 2 + sway * 2, y + 9], [x + 12, y + 9]];
    } else if (pose.mode === 'sleep') {
      pts = [[x, y], [x - 6, y + 4], [x + 2, y + 8], [x + 16, y + 7]];
    } else {
      const up = pose.mode === 'air' ? (pose.vy < 0 ? 4 : -4) : 0;
      pts = [[x, y], [x - 7, y - 2 + up], [x - 9 + sway * 3, y - 11 + up], [x - 5 + sway * 5, y - 17 + up]];
    }
    const bez = s => {
      const [a, b, d, e] = pts, u = 1 - s;
      return [
        u * u * u * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * d[0] + s * s * s * e[0],
        u * u * u * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * d[1] + s * s * s * e[1],
      ];
    };
    if (cat.fluffy) {
      // Birman plume: overlapping soft puffs that get darker toward the tip
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i <= 10; i++) {
          const s = i / 10;
          const [px, py] = bez(s);
          const r = (3.2 + Math.sin(s * Math.PI) * 2.6) * (pose.mode === 'sit' || pose.mode === 'sleep' ? 0.72 : 1);
          c.fillStyle = pass === 0 ? cat.outline : BB.mix(cat.tail, cat.tailTip, Math.pow(s, 1.6));
          G.circle(px, py, pass === 0 ? r + 0.9 : r, c); c.fill();
        }
      }
    } else {
      // Tabby tail: striped and perky
      c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i <= 16; i++) { const [px, py] = bez(i / 16); i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.strokeStyle = cat.outline; c.lineWidth = 5.4; c.stroke();
      c.strokeStyle = cat.patch; c.lineWidth = 3.8; c.stroke();
      c.strokeStyle = cat.fur; c.lineWidth = 3.8;
      c.setLineDash([2.4, 2.2]); c.stroke(); c.setLineDash([]);
      const [tx, ty] = bez(1);
      c.fillStyle = cat.stripe; G.circle(tx, ty, 2.1, c); c.fill();
    }
  }

  // ──── Body ────
  function drawBody(c, cat, bx, by, rx, ry, rot) {
    c.save();
    c.translate(bx, by); c.rotate(rot);
    c.fillStyle = cat.fur; c.strokeStyle = cat.outline; c.lineWidth = 1.3;
    if (cat.fluffy) {
      fluffEdge(c, 0, 0, rx, ry, 22, 0.07, 0, TAU); c.closePath();
    } else G.ellipse(0, 0, rx, ry, 0, c);
    c.fill(); c.stroke();
    c.save(); c.clip();
    if (cat.pattern === 'points') {
      // soft shading on the back, bright fluffy chest
      const g = c.createLinearGradient(0, -ry, 0, ry);
      g.addColorStop(0, cat.furShade); g.addColorStop(0.5, cat.fur); g.addColorStop(1, cat.belly);
      c.fillStyle = g; c.fillRect(-rx - 2, -ry - 2, rx * 2 + 4, ry * 2 + 4);
      c.fillStyle = BB.rgba(cat.point, 0.28); G.ellipse(-rx * 0.8, -ry * 0.2, rx * 0.45, ry, 0, c); c.fill();
      c.fillStyle = cat.belly; G.ellipse(rx * 0.75, ry * 0.2, rx * 0.45, ry * 0.9, 0, c); c.fill();
    } else {
      // Tortoiseshell-tabby patchwork
      c.fillStyle = cat.patch;
      G.ellipse(-rx * 0.1, ry * 0.15, rx * 0.42, ry * 0.5, 0.2, c); c.fill();
      c.fillStyle = cat.patchLight;
      G.ellipse(-rx * 0.7, -ry * 0.1, rx * 0.2, ry * 0.3, 0, c); c.fill();
      G.ellipse(rx * 0.3, -ry * 0.55, rx * 0.18, ry * 0.22, 0, c); c.fill();
      c.strokeStyle = cat.stripe; c.lineWidth = 1.1; c.lineCap = 'round';
      for (let i = -3; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * rx * 0.3, -ry - 1);
        c.quadraticCurveTo(i * rx * 0.3 + 2, -ry * 0.3, i * rx * 0.3 - 0.4, ry * 0.25);
        c.stroke();
      }
      // white bib + belly
      c.fillStyle = cat.belly;
      G.ellipse(rx * 0.85, ry * 0.35, rx * 0.4, ry * 0.85, 0, c); c.fill();
      G.ellipse(0, ry * 1.05, rx * 0.7, ry * 0.35, 0, c); c.fill();
    }
    c.restore();
    c.restore();
  }

  // ──── Head ────
  function drawHead(c, cat, hx, hy, pose, s) {
    const t = pose.t || 0;
    const rx = 9.6, ry = 8.8;
    const earT = pose.ear || 0;
    const tilt = pose.tilt || 0;
    c.save();
    c.translate(hx, hy); c.rotate(tilt);

    // Ears
    const ear = (bx, tipx, tipy, ex, back) => {
      c.fillStyle = cat.pattern === 'points' ? cat.pointDark : (back ? cat.stripe : cat.fur);
      c.strokeStyle = cat.outline; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(bx - 4, -3); c.lineTo(tipx, tipy); c.lineTo(ex, -5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = cat.earInner;
      c.beginPath(); c.moveTo(bx - 2.2, -4.2); c.lineTo(tipx + (ex - tipx) * 0.12, tipy + 3); c.lineTo(ex - 1.8, -5.6); c.closePath(); c.fill();
    };
    const twitch = Math.sin(earT * Math.PI) * 2.2;
    ear(-5, -6.5, -15.5, 0.5, true);
    ear(2.5, 7 + twitch * 0.4, -15.8 + twitch, 8.8, false);

    // Head base
    c.fillStyle = cat.fur; c.strokeStyle = cat.outline; c.lineWidth = 1.3;
    if (cat.fluffy) { fluffEdge(c, 0, 0.5, rx, ry, 20, 0.06, 0, TAU); c.closePath(); }
    else G.ellipse(0, 0, rx, ry, 0, c);
    c.fill(); c.stroke();

    c.save(); c.clip();
    if (cat.pattern === 'points') {
      // taupe mask blooming out from the nose, like the real kitten
      const g = c.createRadialGradient(4.5, 3, 0.5, 4.5, 2.5, 9);
      g.addColorStop(0, cat.pointDark); g.addColorStop(0.35, BB.rgba(cat.point, 0.85)); g.addColorStop(1, BB.rgba(cat.point, 0));
      c.fillStyle = g; c.fillRect(-rx, -ry, rx * 2, ry * 2);
      c.fillStyle = BB.rgba(cat.point, 0.3); G.ellipse(-7, -6, 5, 5, 0, c); c.fill();
    } else {
      c.fillStyle = cat.face; c.fillRect(-rx, -ry, rx * 2, ry * 2);
      c.fillStyle = cat.fur; G.ellipse(-8, 0, 5, 9, 0, c); c.fill();
      c.fillStyle = cat.patch; G.ellipse(8, 0, 4.5, 6.5, 0.3, c); c.fill();
      c.fillStyle = cat.stripe; G.ellipse(-1, -8, 7, 3, 0, c); c.fill();
      // forehead "M" stripes
      c.strokeStyle = cat.stripe; c.lineWidth = 1.2; c.lineCap = 'round';
      for (const dx of [-1.5, 1.8, 5]) { c.beginPath(); c.moveTo(dx, -8.8); c.lineTo(dx + 0.3, -3.6); c.stroke(); }
      c.beginPath(); c.moveTo(-8, -1); c.lineTo(-4.8, 0); c.stroke();
      // white muzzle & chin
      c.fillStyle = cat.belly;
      G.ellipse(5.2, 5.2, 5.2, 3.6, 0, c); c.fill();
      c.beginPath(); c.moveTo(4.6, -2); c.lineTo(3.2, 3); c.lineTo(6.4, 3); c.closePath(); c.fill();
    }
    c.restore();

    // cheek fluff
    if (cat.fluffy) {
      c.fillStyle = cat.belly; c.strokeStyle = cat.outline; c.lineWidth = 1;
      fluffEdge(c, -2, 6.5, 6.5, 3.2, 8, 0.18, 0.2, Math.PI - 0.2); c.fill();
    }

    // Eyes (3/4 view: near eye larger)
    const look = (pose.look || 0) * 0.8;
    const blink = BB.clamp(pose.blink || 0, 0, 1);
    const eye = (ex, ey, erx, ery) => {
      if (pose.happy || pose.mode === 'sleep' || blink > 0.85) {
        c.strokeStyle = cat.outline; c.lineWidth = 1.3; c.lineCap = 'round';
        c.beginPath();
        if (pose.happy) c.arc(ex, ey + 1, erx * 0.9, Math.PI + 0.3, -0.3);
        else c.arc(ex, ey - 0.5, erx * 0.9, 0.3, Math.PI - 0.3);
        c.stroke();
        return;
      }
      const sy = ery * (1 - blink);
      c.fillStyle = '#ffffff';
      G.ellipse(ex, ey, erx + 0.5, sy + 0.5, 0, c); c.fill();
      const g = c.createRadialGradient(ex + 0.3, ey + look + 0.8, 0.2, ex, ey + look, ery);
      g.addColorStop(0, cat.irisLight); g.addColorStop(0.55, cat.iris); g.addColorStop(1, cat.irisDark);
      c.fillStyle = g;
      G.ellipse(ex + 0.25, ey + look * 0.5, erx, sy, 0, c); c.fill();
      c.fillStyle = '#10141f';
      G.ellipse(ex + 0.5, ey + look * 0.6, erx * 0.42, sy * 0.72, 0, c); c.fill();
      c.strokeStyle = cat.outline; c.lineWidth = 0.9;
      G.ellipse(ex + 0.25, ey + look * 0.5, erx, sy, 0, c); c.stroke();
      // sparkles
      c.fillStyle = '#fff';
      G.circle(ex + erx * 0.35, ey - sy * 0.35, erx * 0.34, c); c.fill();
      G.circle(ex - erx * 0.3, ey + sy * 0.4, erx * 0.16, c); c.fill();
    };
    eye(-0.6, -0.6, 2.6, 3.3);
    eye(6.2, -0.6, 3.0, 3.7);

    // Blush
    c.fillStyle = BB.rgba(cat.blush, 0.45);
    G.ellipse(-3.3, 3.6, 2.2, 1.2, 0, c); c.fill();
    G.ellipse(8.2, 3.6, 1.8, 1.1, 0, c); c.fill();

    // Nose & mouth
    c.fillStyle = cat.nose;
    c.beginPath(); c.moveTo(3.4, 2.1); c.lineTo(6.2, 2.1); c.lineTo(4.8, 3.7); c.closePath(); c.fill();
    c.strokeStyle = cat.outline; c.lineWidth = 0.9; c.lineCap = 'round';
    const yawn = pose.yawn || 0, puff = pose.puff || 0;
    if (yawn > 0.05) {
      c.fillStyle = '#b8405a';
      G.ellipse(4.8, 6 + yawn * 1.2, 1.6 + yawn * 0.8, 1 + yawn * 2.4, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ff8fa8'; G.ellipse(4.8, 7 + yawn * 2, 1 + yawn * 0.5, 0.6 + yawn * 0.8, 0, c); c.fill();
    } else if (puff > 0.05) {
      c.fillStyle = '#b8405a'; G.circle(6.8, 5.6, 1.1, c); c.fill();
    } else if (pose.surprised) {
      c.fillStyle = '#b8405a'; G.ellipse(4.8, 6, 1.2, 1.5, 0, c); c.fill();
    } else {
      c.beginPath();
      c.moveTo(4.8, 3.7); c.lineTo(4.8, 4.6);
      c.arc(3.8, 4.6, 1, 0, Math.PI * 0.9);
      c.moveTo(4.8, 4.6); c.arc(5.8, 4.6, 1, Math.PI, Math.PI * 0.1, true);
      c.stroke();
    }
    // puffed cheeks when blowing a bubble
    if (puff > 0.05) {
      c.fillStyle = BB.rgba(cat.pattern === 'points' ? cat.fur : cat.belly, 0.95);
      c.strokeStyle = cat.outline; c.lineWidth = 0.8;
      G.circle(8.6, 4.2, 2.2 * puff + 0.5, c); c.fill(); c.stroke();
    }
    // Whiskers
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.5;
    const wig = Math.sin(t * 0.1) * 0.4;
    for (const [dy, len] of [[-0.6, 4.5], [0.8, 5], [2.2, 4.2]]) {
      c.beginPath(); c.moveTo(8, 4 + dy * 0.5); c.lineTo(8 + len, 3 + dy * 1.5 + wig); c.stroke();
      c.beginPath(); c.moveTo(0, 4 + dy * 0.5); c.lineTo(-len + 1, 3 + dy * 1.5 - wig); c.stroke();
    }
    c.restore();
  }

  // ──── The whole kitten ────
  function drawKitten(c, catId, pose, x, y, scale = 1, facing = 1) {
    const cat = CATS[catId] || CATS.marshmallow;
    const t = pose.t || 0;
    c.save();
    c.translate(x, y);
    c.scale(scale * facing, scale);

    const mode = pose.mode || 'stand';
    const sq = pose.squash || 1;
    if (mode === 'climb') {
      // hug the wall: rotate so the belly faces the wall, head up
      c.translate(4, -12);
      c.rotate(-Math.PI / 2);
      c.translate(0, 12);
    }
    c.scale(1 / Math.sqrt(sq), sq);

    if (mode === 'float' || mode === 'rescue') drawDandelions(c, pose, mode === 'rescue' ? 3 : 1);

    if (mode === 'sit') drawSitting(c, cat, pose);
    else if (mode === 'sleep') drawSleeping(c, cat, pose);
    else drawStanding(c, cat, pose, mode);

    c.restore();
  }

  function drawStanding(c, cat, pose, mode) {
    const t = pose.t || 0;
    const ph = pose.phase || 0;
    const running = mode === 'run' || mode === 'climb';
    const bob = running ? Math.abs(Math.sin(ph)) * -1.6 : Math.sin(t * 0.05) * 0.35;
    let rot = 0;
    if (mode === 'air') rot = BB.clamp((pose.vy || 0) * 0.035, -0.3, 0.3);
    if (mode === 'float' || mode === 'rescue') rot = -0.1;
    const wig = pose.wiggle ? Math.sin(t * 0.9) * 1.6 : 0; // Pip's pounce wiggle

    c.save();
    c.rotate(rot);
    const bx = -2, by = -9.5 + bob;
    const outline = cat.outline;
    const legC = cat.pattern === 'points' ? cat.fur : cat.fur;
    const legFar = cat.furShade;

    // leg angles
    let aBF, aBN, aFF, aFN, len = 7.5;
    if (running) {
      const s = Math.sin(ph), s2 = Math.sin(ph + 0.9);
      aBF = s2 * 0.75; aBN = s * 0.75; aFF = -s2 * 0.75; aFN = -s * 0.75;
    } else if (mode === 'air') {
      if ((pose.vy || 0) < 0) { aBF = 1.0; aBN = 0.85; aFF = -1.1; aFN = -0.95; }
      else { aBF = 0.35; aBN = 0.2; aFF = -0.45; aFN = -0.3; len = 8.2; }
    } else if (mode === 'float' || mode === 'rescue') {
      aBF = 0.15; aBN = -0.1; aFF = 3.0; aFN = 2.8; len = 8;
    } else { aBF = 0.06; aBN = -0.04; aFF = 0.04; aFN = -0.06; }

    // tail + far legs behind the body
    drawTail(c, cat, pose.tail, bx - 10 + wig * 0.4, by - 1, pose);
    limb(c, bx - 6.5 + wig, by + 3, len, aBF, 3.8, legFar, outline, cat.paw);
    limb(c, bx + 7, by + 3, len, aFF, 3.8, legFar, outline, cat.paw);
    drawBody(c, cat, bx + wig * 0.5, by, 11.5, 7.6, wig * 0.02);
    limb(c, bx - 3.5 + wig, by + 4, len, aBN, 4.2, legC, outline, cat.paw);
    limb(c, bx + 9.5, by + 4, len, aFN, 4.2, legC, outline, cat.paw);

    // head, a little in front and above
    const hx = 8.5, hy = -19 + bob * 0.7 + (mode === 'air' && pose.vy > 0 ? -0.8 : 0);
    drawHead(c, cat, hx, hy, pose);
    c.restore();
  }

  function drawSitting(c, cat, pose) {
    const t = pose.t || 0;
    const breathe = Math.sin(t * 0.05) * 0.4;
    const outline = cat.outline;
    drawTail(c, cat, pose.tail, -8, -3, pose);
    // haunch
    c.fillStyle = cat.pattern === 'points' ? cat.fur : cat.fur;
    c.strokeStyle = outline; c.lineWidth = 1.3;
    G.ellipse(-6, -5, 7, 5.5, 0, c); c.fill(); c.stroke();
    if (cat.pattern === 'torbie') { c.fillStyle = cat.patch; G.ellipse(-7, -6, 4, 3, 0.4, c); c.fill(); }
    // upright body
    drawBody(c, cat, -1, -11 + breathe, 8, 10.5, 0.15);
    // front legs + paws together (Pip's lifted paw for grooming)
    const legC = cat.belly;
    const lick = pose.lick || 0;
    limb(c, 1.5, -8, 7.5, 0.02, 4, legC, outline, cat.paw);
    limb(c, 5, -8, 7.5 - lick * 3, -0.05 - lick * 2.3, 4.2, legC, outline, cat.paw);
    drawHead(c, cat, 3, -22 + breathe + lick * 1.5, pose);
  }

  function drawSleeping(c, cat, pose) {
    const t = pose.t || 0;
    const breathe = Math.sin(t * 0.04) * 0.6;
    drawTail(c, cat, pose.tail, -12, -3, pose);
    drawBody(c, cat, -1, -6.5 - breathe * 0.5, 13, 6.5 + breathe * 0.4, 0);
    c.fillStyle = cat.paw; c.strokeStyle = cat.outline; c.lineWidth = 0.9;
    G.ellipse(9, -1, 3, 2, 0, c); c.fill(); c.stroke();
    drawHead(c, cat, 8, -10.5, Object.assign({}, pose, { tilt: 0.25 }));
  }

  // Dandelion parachute(s) for gliding and the gentle rescue float
  function drawDandelions(c, pose, n) {
    const t = pose.t || 0;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - 1) * 11;
      const sway = Math.sin(t * 0.08 + i * 2) * 3;
      const hx = 6 + off * 0.6, hy = -20;
      const px = hx + off + sway, py = -46 - (i === 1 ? 5 : 0);
      c.strokeStyle = '#7fb069'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + sway, (hy + py) / 2, px, py); c.stroke();
      // seed spokes
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.8;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + t * 0.01;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); c.stroke();
        c.fillStyle = '#ffffff'; G.circle(px + Math.cos(a) * 9, py + Math.sin(a) * 9, 1.3, c); c.fill();
      }
      c.fillStyle = '#e8e2c8'; G.circle(px, py, 2.4, c); c.fill();
    }
  }

  BB.Kittens = { draw: drawKitten, CATS };
})(window.BB);
