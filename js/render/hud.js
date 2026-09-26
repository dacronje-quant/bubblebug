// ════════════════════════════════════════════════════════════════
//  HUD & ICONS — everything on screen is a picture, never a word.
//   • star jar + heart counters that bounce when they grow
//   • ability badges and found toys
//   • zone emblems for the "you arrived somewhere new" card
//   • animated ability "how-to" cards: a tiny kitten shows the move
//     while the matching button icon pulses in rhythm
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const G = BB.G;
  const TAU = Math.PI * 2;

  // ──── Button icons (match the touch buttons exactly) ────
  function buttonIcon(c, kind, x, y, s = 1, lit = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const col = { jump: '#5fd48a', bubble: '#5fb8ff', left: '#ffffff', right: '#ffffff' }[kind];
    const r = 18 * (1 + lit * 0.18);
    G.drawGlow(0, 0, r * 2, col, 0.3 + lit * 0.5, c);
    c.fillStyle = BB.rgba(col, 0.9); c.strokeStyle = '#ffffff'; c.lineWidth = 3;
    G.circle(0, 0, r, c); c.fill(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'jump') { c.beginPath(); c.moveTo(-8, 4); c.lineTo(0, -5); c.lineTo(8, 4); c.stroke(); }
    else if (kind === 'bubble') { G.bubble(-2, 2, 8, '#ffffff', 1, c); G.bubble(7, -7, 4, '#ffffff', 1, c); }
    else if (kind === 'right') { c.beginPath(); c.moveTo(-4, -8); c.lineTo(5, 0); c.lineTo(-4, 8); c.stroke(); }
    else if (kind === 'left') { c.beginPath(); c.moveTo(4, -8); c.lineTo(-5, 0); c.lineTo(4, 8); c.stroke(); }
    c.restore();
  }

  // ──── Ability & toy icons ────
  function abilityIcon(c, ab, x, y, s = 1, on = true) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.globalAlpha = on ? 1 : 0.25;
    if (ab === 'doubleJump') {
      for (const d of [-1, 1]) {
        c.fillStyle = d < 0 ? '#7ef0d8' : '#c9a6ff'; c.strokeStyle = '#3b3070'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(d * 6, -3, 6, 8, d * 0.5, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#ffc6e6'; c.beginPath(); c.ellipse(d * 5, 6, 4, 4, 0, 0, TAU); c.fill(); c.stroke();
      }
      c.fillStyle = '#5a4a8a'; G.ellipse(0, 1, 2, 8, 0, c); c.fill();
    } else if (ab === 'wallClimb') {
      c.fillStyle = '#9fe6c9'; c.strokeStyle = '#2f5a55'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-10, 8); c.lineTo(11, 8); c.lineTo(9, 1); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#8fb8ff'; G.circle(-2, 0, 8, c); c.fill(); c.stroke();
      c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(-2, 0, 4, 0, 4.5); c.stroke();
    } else if (ab === 'glow') {
      G.drawGlow(0, 2, 18, '#fff38a', 0.9, c);
      c.fillStyle = '#ffdc5c'; c.strokeStyle = '#8a5a14'; c.lineWidth = 1.2;
      G.ellipse(0, 4, 6, 7, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#6a4a8c'; G.circle(0, -5, 5, c); c.fill(); c.stroke();
    } else if (ab === 'float') {
      c.strokeStyle = '#7fb069'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -1); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(0, -3); c.lineTo(Math.cos(a) * 9, -3 + Math.sin(a) * 9); c.stroke(); c.fillStyle = '#fff'; G.circle(Math.cos(a) * 9, -3 + Math.sin(a) * 9, 1.6, c); c.fill(); }
    }
    c.restore();
  }

  function toyIcon(c, toy, x, y, s = 1, t = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.lineWidth = 1.2; c.strokeStyle = '#5a3a4a';
    if (toy === 'yarn') {
      c.fillStyle = '#ff8fb8'; G.circle(0, 0, 9, c); c.fill(); c.stroke();
      c.strokeStyle = '#d65a8a';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(0, 0, 9, 4 + i * 2.5, 0.7 + i * 0.6, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(7, 5); c.quadraticCurveTo(13, 9, 10, 13); c.stroke();
    } else if (toy === 'feather') {
      c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8, 10); c.lineTo(6, -8); c.stroke();
      c.fillStyle = '#7cc8ff'; c.strokeStyle = '#3a6aa8'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(3, -4, 4, 10, 0.65, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ff9ec7'; c.beginPath(); c.ellipse(-2, 3, 2.5, 5, 0.65, 0, TAU); c.fill();
    } else if (toy === 'bell') {
      c.fillStyle = '#ffd34d'; c.strokeStyle = '#a8740e';
      G.circle(0, 1, 9, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-8, 1); c.lineTo(8, 1); c.stroke();
      c.fillStyle = '#6a4a14'; G.circle(0, 5, 1.8, c); c.fill();
      c.fillStyle = '#ff5d6c'; c.fillRect(-9, -9, 18, 4);
      c.fillStyle = 'rgba(255,255,255,0.7)'; G.circle(-3, -2, 2, c); c.fill();
    } else if (toy === 'mouse') {
      c.fillStyle = '#b8b0c8'; G.ellipse(0, 2, 10, 7, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ffb3c8'; G.circle(-5, -5, 3.5, c); c.fill(); c.stroke(); G.circle(1, -6, 3.5, c); c.fill(); c.stroke();
      c.fillStyle = '#2a2030'; G.circle(6, 0, 1.2, c); c.fill();
      c.strokeStyle = '#ff8fb8'; c.beginPath(); c.moveTo(-10, 3); c.quadraticCurveTo(-16, 0, -15, 7); c.stroke();
    } else if (toy === 'boat') {
      c.fillStyle = '#fff6e0'; c.strokeStyle = '#7a8aa0';
      c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(7, 7); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(0, -12); c.lineTo(5, 0); c.closePath(); c.fill(); c.stroke();
    } else if (toy === 'star') {
      c.fillStyle = '#ffe27a'; c.strokeStyle = '#c28a14';
      G.star(0, 0, 11, 5, 0.55, -Math.PI / 2 + Math.sin(t * 0.05) * 0.1, c); c.fill(); c.stroke();
      c.fillStyle = '#ff9ec7'; G.circle(-3, 1, 1.4, c); c.fill(); G.circle(3, 1, 1.4, c); c.fill();
    }
    c.restore();
  }

  // ──── Zone emblems ────
  function zoneIcon(c, zone, x, y, s = 1) {
    const key = BB.ZONES[zone].key;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (key === 'gardens') BB.Tiles.flower(c, 0, 12, '#ff9ec7', 2.6);
    else if (key === 'meadow') {
      c.fillStyle = '#f5ead0'; c.fillRect(-4, -2, 8, 14);
      c.fillStyle = '#c46ad8'; c.beginPath(); c.ellipse(0, -2, 15, 11, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#7cf5d4'; for (const d of [-7, 0, 7]) { G.circle(d, -7 + Math.abs(d) * 0.3, 2.4, c); c.fill(); }
    } else if (key === 'caves') BB.Tiles.crystalCluster(c, 0, 12, 0.7, 1.8);
    else if (key === 'hive') {
      c.fillStyle = '#ffc93d'; c.strokeStyle = '#a8661a'; c.lineWidth = 2;
      c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff3c4'; G.circle(-3, -3, 3, c); c.fill();
    } else if (key === 'ruins') {
      c.fillStyle = '#9aa6b1'; c.fillRect(-13, -10, 6, 22); c.fillRect(7, -10, 6, 22);
      c.strokeStyle = '#9aa6b1'; c.lineWidth = 6; c.beginPath(); c.arc(0, -8, 10, Math.PI, 0); c.stroke();
      c.fillStyle = '#7cc8ff'; c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(5, 6, 0, 8); c.quadraticCurveTo(-5, 6, 0, -2); c.fill();
    } else if (key === 'clouds') {
      BB.Backdrops.cloud(c, -14, 4, 0.35, '#ffffff');
      c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-8, -14); c.lineTo(-3, -9); c.lineTo(0, -16); c.lineTo(3, -9); c.lineTo(8, -14); c.lineTo(6, -4); c.closePath(); c.fill();
    }
    c.restore();
  }

  // ──── Main HUD ────
  const bounce = { stars: 0, hearts: 0 };
  let last = { stars: -1, hearts: -1 };

  function drawHUD(c, s, t) {
    if (last.stars >= 0 && s.stars > last.stars) bounce.stars = 1;
    if (last.hearts >= 0 && s.hearts > last.hearts) bounce.hearts = 1;
    last = { stars: s.stars, hearts: s.hearts };
    bounce.stars *= 0.9; bounce.hearts *= 0.9;

    const pill = (x, w) => { c.fillStyle = 'rgba(30,20,50,0.38)'; G.rrect(x, 12, w, 38, 19, c); c.fill(); };
    pill(12, 104);
    const sb = 1 + bounce.stars * 0.5;
    G.drawGlow(34, 31, 22, '#fff1a8', 0.6, c);
    c.fillStyle = '#ffd84a'; c.strokeStyle = '#c28a14'; c.lineWidth = 1.5;
    G.star(34, 31, 11 * sb, 5, 0.5, -Math.PI / 2 + Math.sin(t * 0.05) * 0.1, c); c.fill(); c.stroke();
    G.text(String(s.stars), 78, 32, 22 * (1 + bounce.stars * 0.2), '#fff6d6', 'rgba(40,20,60,0.6)');

    pill(124, 92);
    const hb = 1 + bounce.hearts * 0.5;
    c.fillStyle = '#ff7eb6'; c.strokeStyle = '#b8407a';
    G.heart(146, 33, 11 * hb, c); c.fill(); c.stroke();
    G.text(String(s.hearts), 186, 32, 22 * (1 + bounce.hearts * 0.2), '#ffe3f0', 'rgba(40,20,60,0.6)');

    // abilities
    let x = 26;
    for (const ab of ['doubleJump', 'wallClimb', 'glow', 'float']) {
      if (!s.abilities[ab]) continue;
      c.fillStyle = 'rgba(30,20,50,0.3)'; G.circle(x, 68, 15, c); c.fill();
      abilityIcon(c, ab, x, 68, 0.95);
      x += 34;
    }
    // toys
    let tx = G.W - 110;
    for (const toy of Object.keys(s.toys || {})) {
      toyIcon(c, toy, tx, 31, 0.9, t);
      tx -= 30;
    }
  }

  // ──── "New place!" card ────
  function drawZoneCard(c, zone, a, t) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = Math.min(1, a);
    const y = 96 - (1 - Math.min(1, a)) * 20;
    c.fillStyle = 'rgba(30,20,50,0.45)';
    G.rrect(G.W / 2 - 170, y - 34, 340, 68, 34, c); c.fill();
    zoneIcon(c, zone, G.W / 2 - 128, y, 1.2);
    G.text(BB.ZONES[zone].name, G.W / 2 + 22, y + 1, 30, '#ffffff', 'rgba(40,20,60,0.7)');
    c.restore();
  }

  // ──── Ability demo card (pictogram animation) ────
  function drawAbilityCard(c, ability, t, cat, a) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = Math.min(1, a);
    const cx = G.W / 2, cy = G.H / 2;
    const k = BB.easeOutBack(Math.min(1, a));
    c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
    G.drawGlow(cx, cy, 300, '#fff4c2', 0.55, c);
    c.fillStyle = 'rgba(255,250,240,0.95)'; c.strokeStyle = '#ffcf5c'; c.lineWidth = 5;
    G.rrect(cx - 230, cy - 150, 460, 300, 36, c); c.fill(); c.stroke();
    // the badge
    c.fillStyle = 'rgba(255,220,120,0.35)'; G.circle(cx, cy - 102, 34, c); c.fill();
    abilityIcon(c, ability, cx, cy - 102, 2.2);

    // stage
    const gy = cy + 92;
    c.fillStyle = '#cfe8b8'; G.rrect(cx - 190, gy, 380, 12, 6, c); c.fill();
    const loop = 150, p = (t % loop) / loop;
    let kx = cx - 120, ky = gy, pose = { mode: 'stand', t }, press = 0, face = 1;

    if (ability === 'doubleJump') {
      // jump … and jump again in mid-air!
      kx = cx - 120 + p * 240;
      const h = p < 0.5 ? Math.sin(p / 0.5 * Math.PI * 0.5) * 70 : 70 + Math.sin((p - 0.5) / 0.5 * Math.PI) * 60 - (p - 0.5) * 140;
      ky = gy - Math.max(0, h);
      pose = { mode: p > 0.02 && p < 0.97 ? 'air' : 'stand', vy: p < 0.3 || (p > 0.5 && p < 0.7) ? -3 : 3, t };
      press = (p < 0.08 ? 1 : 0) + (p > 0.48 && p < 0.56 ? 1 : 0);
      if (p > 0.48 && p < 0.56) { for (const d of [-1, 1]) { c.fillStyle = d < 0 ? 'rgba(126,240,216,0.8)' : 'rgba(201,166,255,0.8)'; G.ellipse(kx + d * 16, ky - 8, 12, 7, d * 0.4, c); c.fill(); } }
    } else if (ability === 'wallClimb') {
      // walk into the wall and keep holding towards it
      const wx = cx + 80;
      c.fillStyle = '#8a9ccf'; G.rrect(wx, gy - 170, 40, 170, 6, c); c.fill();
      if (p < 0.25) { kx = cx - 100 + p / 0.25 * 170; pose = { mode: 'run', phase: t * 0.3, t }; }
      else { kx = wx - 12; ky = gy - Math.min(1, (p - 0.25) / 0.6) * 130; pose = { mode: 'climb', phase: t * 0.3, t }; }
      press = -1; // hold → toward wall
    } else if (ability === 'glow') {
      kx = cx - 140 + p * 280;
      pose = { mode: 'run', phase: t * 0.3, t };
      G.drawGlow(kx, ky - 12, 90, '#fff3b0', 0.8, c);
      for (let i = 0; i < 3; i++) {
        const px = cx - 90 + i * 90, near = Math.max(0, 1 - Math.abs(px - kx) / 110);
        c.fillStyle = `rgba(255,220,150,${0.25 + near * 0.75})`;
        c.beginPath(); c.ellipse(px, gy - 50, 18 * (0.5 + near * 0.6), 7, 0, 0, TAU); c.fill();
      }
    } else if (ability === 'float') {
      // jump, then HOLD jump to drift down slowly
      kx = cx - 140 + p * 280;
      const up = Math.min(1, p / 0.2);
      const down = p > 0.2 ? (p - 0.2) / 0.8 : 0;
      ky = gy - up * 120 + down * 110;
      pose = { mode: p > 0.25 && p < 0.97 ? 'float' : p < 0.25 ? 'air' : 'stand', vy: -3, t };
      press = p < 0.95 ? 1 : 0;
    }
    BB.Kittens.draw(c, cat, pose, kx, ky, 2.2, face);

    // the button to use
    const bx = cx + 165, by = cy - 100;
    if (press === -1) buttonIcon(c, 'right', bx, by, 1.2, 0.5 + 0.5 * Math.sin(t * 0.2));
    else buttonIcon(c, 'jump', bx, by, 1.2, press ? 1 : 0);
    c.restore();
  }

  BB.HUD = { drawHUD, drawZoneCard, drawAbilityCard, buttonIcon, abilityIcon, toyIcon, zoneIcon };
})(window.BB);
