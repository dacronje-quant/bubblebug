// ════════════════════════════════════════════════════════════════
//  HOME — drawing the Cat House: cosy wallpaper, windows onto the sky,
//  sisal cat-tree posts, a sofa and a rug, the family wall (a frame for
//  each of the twelve family members, grey until they're found) and a
//  cushion for each of them, where they nap once they're home.
//  Until the kitten has gone out once, glowing paw prints lead from its
//  bed to the front door. In the opening scene a gloom cloud drifts past
//  the windows.
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const T = BB.CFG.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const W = () => BB.World;

  let FAM = null;
  // the twelve family members, in the order you meet their zones
  function familyOrder() {
    if (!FAM) FAM = W().rooms.filter(r => r.def.family).sort((a, b) => a.zone - b.zone).map(r => r.def.family);
    return FAM;
  }

  function faceOf(c, id, x, y, s, found) {
    if (found) {
      const m = BB.CATS[id];
      BB.MapView.catFace(c, x, y, s, m ? m.fur : '#fff', m ? (m.pointDark || m.stripe || m.fur) : '#ccc');
    } else {
      BB.MapView.catFace(c, x, y, s, '#b9b1c2', '#9a92a6');
      c.fillStyle = 'rgba(255,255,255,0.9)';
      G().text('?', x, y + 1 * s, 9 * s, '#ffffff', null, 'center', c);
    }
  }

  // the family wall: 2 rows of 6 frames
  function familyWall(c, cx, cy, save, t) {
    const fam = familyOrder();
    c.fillStyle = 'rgba(120,70,40,0.15)'; G().rrect(cx - 172, cy - 62, 344, 124, 14, c); c.fill();
    fam.forEach((id, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const x = cx - 145 + col * 58, y = cy - 30 + row * 60;
      const found = !!(save.family || {})[id];
      c.save();
      c.translate(x, y); c.rotate(Math.sin(i * 1.7) * 0.05);
      c.fillStyle = found ? '#d9a95a' : '#a69a8a'; c.strokeStyle = '#6a4a2a'; c.lineWidth = 2;
      G().rrect(-22, -24, 44, 48, 6, c); c.fill(); c.stroke();
      c.fillStyle = found ? '#fff6de' : '#d8d2dc'; G().rrect(-17, -19, 34, 38, 4, c); c.fill();
      faceOf(c, id, 0, 2, 1.6, found);
      if (found && (t + i * 20) % 120 < 60) { c.fillStyle = '#ff7eb6'; G().heart(14, -16, 4, c); c.fill(); }
      c.restore();
    });
  }

  function catTreePost(c, x, yTop, yBot) {
    c.fillStyle = '#d9b98a'; c.fillRect(x - 7, yTop, 14, yBot - yTop);
    c.strokeStyle = 'rgba(140,100,60,0.55)'; c.lineWidth = 1.5;
    for (let y = yTop + 3; y < yBot; y += 5) { c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y + 2); c.stroke(); }
    c.strokeStyle = '#8a6a44'; c.lineWidth = 1.5; c.strokeRect(x - 7, yTop, 14, yBot - yTop);
  }

  function windowView(c, x, y, w, h, t, gloom) {
    c.fillStyle = '#7a4e2c'; G().rrect(x - 6, y - 6, w + 12, h + 12, 10, c); c.fill();
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#fff1d6');
    c.fillStyle = g; G().rrect(x, y, w, h, 6, c); c.fill();
    c.save(); G().rrect(x, y, w, h, 6, c); c.clip();
    // soft clouds drifting by, and far-off hills of the kingdom
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 2; i++) {
      const cx = x + ((t * 0.15 + i * 90) % (w + 80)) - 40;
      BB.Backdrops.cloud(c, cx, y + 20 + i * 18, 0.22, 'rgba(255,255,255,0.9)');
    }
    c.fillStyle = '#9fd8c0'; c.beginPath(); c.ellipse(x + w * 0.3, y + h + 10, w * 0.5, h * 0.35, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#6fbf8e'; c.beginPath(); c.ellipse(x + w * 0.8, y + h + 14, w * 0.45, h * 0.3, 0, Math.PI, 0); c.fill();
    if (gloom > 0) {
      // the big gloom cloud that sent everyone wandering off
      const gx = x - 60 + gloom * (w + 120);
      c.fillStyle = 'rgba(110,112,140,0.95)';
      c.beginPath(); c.arc(gx, y + 30, 22, 0, TAU); c.arc(gx + 24, y + 22, 28, 0, TAU); c.arc(gx + 50, y + 32, 20, 0, TAU); c.fill();
      c.fillStyle = 'rgba(150,190,255,0.8)';
      for (let i = 0; i < 5; i++) G().ellipse(gx + i * 12, y + 56 + ((t * 2 + i * 7) % 20), 1.5, 3, 0, c), c.fill();
    }
    c.restore();
    c.strokeStyle = '#7a4e2c'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke();
  }

  function roundWindow(c, x, y, r, t, rainbow) {
    c.fillStyle = '#7a4e2c'; G().circle(x, y, r + 8, c); c.fill();
    const g = c.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#fff1d6');
    c.fillStyle = g; G().circle(x, y, r, c); c.fill();
    c.save(); G().circle(x, y, r, c); c.clip();
    BB.Backdrops.cloud(c, x - r + ((t * 0.2) % (2 * r + 60)) - 30, y - r * 0.3, 0.3, 'rgba(255,255,255,0.9)');
    if (rainbow) {
      c.lineWidth = 7;
      ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y + r * 0.9, r * 0.9 - i * 7, Math.PI, 0); c.stroke(); });
    }
    c.fillStyle = '#9fd8c0'; c.beginPath(); c.ellipse(x, y + r, r * 1.2, r * 0.45, 0, Math.PI, 0); c.fill();
    c.restore();
    c.strokeStyle = '#7a4e2c'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
  }

  function bunting(c, x0, x1, y, z0) {
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.5;
    const sag = 18, n = Math.floor((x1 - x0) / 26);
    const at = k => ({ x: x0 + (x1 - x0) * k, y: y + Math.sin(k * Math.PI) * sag });
    c.beginPath(); for (let i = 0; i <= 20; i++) { const p = at(i / 20); c.lineTo(p.x, p.y); } c.stroke();
    for (let i = 0; i < n; i++) {
      const p = at((i + 0.5) / n);
      c.fillStyle = BB.ZONES[(z0 + i) % 12].accent;
      c.beginPath(); c.moveTo(p.x - 9, p.y); c.lineTo(p.x + 9, p.y); c.lineTo(p.x, p.y + 16); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.stroke();
    }
  }

  function sofa(c, x, y, w) {
    c.fillStyle = '#c05a7a'; c.strokeStyle = '#7a2a4a'; c.lineWidth = 2;
    G().rrect(x, y - 58, w, 34, 14, c); c.fill(); c.stroke();
    G().rrect(x - 12, y - 40, 26, 40, 10, c); c.fill(); c.stroke();
    G().rrect(x + w - 14, y - 40, 26, 40, 10, c); c.fill(); c.stroke();
    c.fillStyle = '#d97a98'; G().rrect(x + 8, y - 30, w - 16, 22, 8, c); c.fill(); c.stroke();
    c.fillStyle = '#5a2a3a'; c.fillRect(x + 4, y - 8, 6, 8); c.fillRect(x + w - 10, y - 8, 6, 8);
  }

  function drawBack(c, room, cam, t, play) {
    const save = play.save;
    const X = col => (room.x + col) * T - cam.x, Y = row => (room.y + row) * T - cam.y;
    if (X(60) < -40 || X(0) > G().W + 40 || Y(34) < -40 || Y(0) > G().H + 40) return;
    c.save();
    c.beginPath(); c.rect(X(2), Y(2), 56 * T, 30 * T); c.clip();
    // upstairs: soft starry blue wallpaper
    c.fillStyle = '#cfe0f6'; c.fillRect(X(2), Y(2), 56 * T, 19 * T);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    for (let r = 3; r < 20; r += 2) for (let col = 3; col < 58; col += 3) G().twinkle(X(col) + (r % 4) * 16, Y(r), 3, c), c.fill();
    // downstairs: warm peach with stripes, and wood panelling below
    c.fillStyle = '#f6d6b6'; c.fillRect(X(2), Y(21), 56 * T, 11 * T);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    for (let col = 2; col < 58; col += 2) c.fillRect(X(col), Y(21), T * 0.7, 11 * T);
    c.fillStyle = '#b98555'; c.fillRect(X(2), Y(28.5), 56 * T, 3.5 * T);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let col = 2; col < 58; col += 3) c.fillRect(X(col), Y(28.5), 2, 3.5 * T);
    // windows upstairs (a gloom cloud sails past them in the opening scene)
    const gloom = play.intro && play.intro.t > 60 ? Math.min(1, (play.intro.t - 60) / 180) : 0;
    for (const col of [5, 14, 41, 50]) windowView(c, X(col), Y(9), 3 * T, 3.4 * T, t, 0);
    for (const col of [6, 47]) windowView(c, X(col), Y(22.4), 3.4 * T, 3.2 * T, t, gloom);
    // the big round window over the stairwell, where the skylight light falls
    G().drawGlow(X(30), Y(10), 220, save.finale ? '#fff0c8' : '#ffffff', 0.35, c);
    roundWindow(c, X(30), Y(10.5), 2.6 * T, t, save.finale);
    // bunting in the zones' colours, and two hanging lamps
    bunting(c, X(3), X(26), Y(14.2), 0);
    bunting(c, X(34), X(57), Y(14.2), 6);
    for (const col of [10, 46]) {
      c.strokeStyle = '#6a4a2a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(col), Y(2)); c.lineTo(X(col), Y(6)); c.stroke();
      G().drawGlow(X(col), Y(6.4), 60, '#ffe6a0', 0.55, c);
      c.fillStyle = '#ffb3cf'; c.beginPath(); c.moveTo(X(col) - 16, Y(6.6)); c.lineTo(X(col) + 16, Y(6.6)); c.lineTo(X(col) + 8, Y(6)); c.lineTo(X(col) - 8, Y(6)); c.closePath(); c.fill();
    }
    // cat-tree posts (the platforms themselves are the wooden ledges)
    catTreePost(c, X(22.5), Y(23), Y(32));
    catTreePost(c, X(37.5), Y(23), Y(32));
    // a cosy hidey-box on each cat tree
    for (const col of [20.3, 35.3]) {
      c.fillStyle = '#e0b07a'; c.strokeStyle = '#8a5a34'; c.lineWidth = 2;
      G().rrect(X(col), Y(27.2), 1.6 * T, 1.7 * T, 6, c); c.fill(); c.stroke();
      c.fillStyle = '#5a3a24'; G().circle(X(col) + 0.8 * T, Y(28), 9, c); c.fill();
    }
    // the rug, the sofa and the family wall
    c.fillStyle = '#e88aa8'; G().ellipse(X(30), Y(32) - 4, 7 * T, 12, 0, c); c.fill();
    c.fillStyle = '#ffd1e0'; G().ellipse(X(30), Y(32) - 5, 5.5 * T, 8, 0, c); c.fill();
    sofa(c, X(43.5), Y(32), 10 * T);
    familyWall(c, X(30), Y(24.2), save, t);
    // a warm lamp and a plant
    c.fillStyle = '#6a4a2a'; c.fillRect(X(3.5), Y(29), 4, 3 * T);
    G().drawGlow(X(3.6), Y(28.6), 70, '#ffe6a0', 0.6, c);
    c.fillStyle = '#ffe6a0'; c.beginPath(); c.moveTo(X(3) - 4, Y(29)); c.lineTo(X(4.2) + 4, Y(29)); c.lineTo(X(4) , Y(28.2)); c.lineTo(X(3.2), Y(28.2)); c.closePath(); c.fill();
    c.fillStyle = '#c96a4a'; G().rrect(X(56), Y(31) - 4, 26, 24, 5, c); c.fill();
    c.fillStyle = '#4f9e6c';
    for (let i = 0; i < 5; i++) G().ellipse(X(56) + 13 + (i - 2) * 6, Y(30.3) - Math.abs(i - 2) * -4, 5, 14, (i - 2) * 0.4, c), c.fill();
    // cushions for the family (they nap here once they're home)
    const fam = familyOrder();
    (room.def.cushions || []).forEach((col, i) => {
      const id = fam[i];
      const m = BB.CATS[id] || {};
      c.fillStyle = m.cushion || '#ffb3d1';
      G().ellipse(X(col) + T / 2, Y(32) - 5, 22 * (m.size || 1.4) / 1.4, 7, 0, c); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; G().ellipse(X(col) + T / 2 - 5, Y(32) - 8, 10, 2.5, 0, c); c.fill();
    });
    // glowing paw prints from the bed to the front door, until the first trip out
    if (!save.leftHome && !play.intro) {
      const exitCol = room.def.doors[0][1];
      const dir = exitCol > 8 ? 1 : -1;
      const steps = Math.ceil(Math.abs(exitCol - 8) / 2.5);
      for (let i = 0; i < steps; i++) {
        const col = 8 + dir * (i + 1) * 2.5;
        const k = ((t * 0.03) - i * 0.15) % 1;
        const a = k > 0 ? Math.sin(Math.min(1, k * 1.2) * Math.PI) : 0;
        c.globalAlpha = 0.45 + a * 0.55;
        G().drawGlow(X(col), Y(32) - 7 - (i % 2) * 5, 14, '#ffe27a', 0.5 * a, c);
        BB.Gestures.drawPaw(c, X(col), Y(32) - 7 - (i % 2) * 5, 0.7, '#ffd84a', '#b8860b');
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  // ──── Found toys decorate the house (bat them to play!) ────
  // [col, row the toy sits on (its bottom), hanging?]
  const TOY_SPOTS = {
    yarn: [27, 32], feather: [19.4, 32], bell: [37.5, 23.3, true], mouse: [41.4, 32],
    boat: [7.7, 25.7], star: [48.5, 31.1], shell: [24.3, 20], bucket: [33.6, 20],
    mitten: [21.1, 27.2], kite: [30, 15.2, true], duck: [33.2, 32], rocket: [22, 23],
  };
  const MIRROR_COL = 17;
  function toySpot(room, toy) {
    const s = TOY_SPOTS[toy];
    return s ? { x: (room.x + s[0]) * T, y: (room.y + s[1]) * T, hang: !!s[2] } : null;
  }
  function drawToys(c, room, cam, t, play) {
    const save = play.save;
    for (const toy of Object.keys(TOY_SPOTS)) {
      const sp = toySpot(room, toy), have = !!save.toys[toy];
      const x = sp.x - cam.x, y = sp.y - cam.y;
      if (x < -60 || x > G().W + 60 || y < -80 || y > G().H + 60) continue;
      const bn = (play.toyBounce && play.toyBounce[toy]) || 0;
      c.save();
      if (!have) c.globalAlpha = 0.16;
      if (sp.hang) {
        // on a string: it swings when batted
        const sw = Math.sin(t * 0.05 + x) * 0.08 + Math.sin(bn * 12) * bn * 0.6;
        c.strokeStyle = 'rgba(90,60,40,0.7)'; c.lineWidth = 1.2;
        c.translate(x, y); c.rotate(sw);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, toy === 'kite' ? 18 : 12); c.stroke();
        BB.HUD.toyIcon(c, toy, 0, toy === 'kite' ? 30 : 22, 1.3, t);
      } else {
        const hop = -Math.abs(Math.sin(bn * 9)) * 16 * bn;
        c.translate(x, y + hop); c.rotate(Math.sin(bn * 14) * bn * 0.5);
        BB.HUD.toyIcon(c, toy, 0, -12, 1.3, t);
      }
      c.restore();
    }
  }

  // the dressing-up mirror: stand still in front of it to try things on
  function drawMirror(c, room, cam, t, play) {
    const x = (room.x + MIRROR_COL) * T - cam.x, y = (room.y + 32) * T - cam.y;
    if (x < -120 || x > G().W + 120) return;
    const save = play.save, has = Object.keys(save.outfits || {}).length;
    const fresh = !!save.wardrobeNew;
    // a warm glow (golden and pulsing when there's a new present to try on)
    G().drawGlow(x, y - 70, fresh ? 110 : 70, fresh ? '#ffe27a' : '#ffe0f0', fresh ? 0.55 + 0.25 * Math.sin(t * 0.12) : 0.35, c);
    c.fillStyle = '#8a5a34'; c.strokeStyle = '#4a2e18'; c.lineWidth = 2.5;
    c.fillRect(x - 4, y - 36, 8, 36);
    c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x, y - 16); c.lineTo(x + 22, y); c.stroke();
    // the frame: pink and gold, with little hearts
    c.fillStyle = '#ff9ec7'; G().ellipse(x, y - 76, 31, 44, 0, c); c.fill(); c.stroke();
    c.fillStyle = '#ffd84a'; G().ellipse(x, y - 76, 27, 40, 0, c); c.fill();
    const g = c.createLinearGradient(x - 24, y - 116, x + 24, y - 36);
    g.addColorStop(0, '#f2faff'); g.addColorStop(0.5, '#c4e2fa'); g.addColorStop(1, '#e6f4ff');
    c.fillStyle = g; G().ellipse(x, y - 76, 23, 36, 0, c); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath(); c.ellipse(x - 9, y - 86, 4, 16, 0.3, 0, TAU); c.fill();
    for (const [dx, dy] of [[-29, -76], [29, -76], [0, -121]]) { c.fillStyle = '#ff7eb6'; G().heart(x + dx, y + dy, 5, c); c.fill(); }
    // a floating sign with a hat on it: "dress up here!"
    const b = Math.sin(t * 0.06) * 3;
    c.fillStyle = '#fff8e8'; c.strokeStyle = '#ff9ec7'; c.lineWidth = 3;
    G().circle(x, y - 150 + b, 20, c); c.fill(); c.stroke();
    if (BB.Wardrobe) {
      const id = (save.wear && save.wear.head) || 'sunhat';
      c.save(); c.globalAlpha = has ? 1 : 0.6;
      BB.Wardrobe.icon(c, id, x, y - 150 + b, 1.5, t);
      c.restore();
    }
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.015) + i / 3) % 1;
      c.fillStyle = `rgba(255,250,220,${Math.sin(k * Math.PI)})`;
      G().twinkle(x - 20 + i * 20, y - 40 - k * 90, 2.6, c); c.fill();
    }
    if (fresh && BB.Links.arrow) BB.Links.arrow(c, x, y - 192, t);
  }

  // the family members who are home, napping on their cushions
  function drawFamily(c, room, cam, t, play) {
    if (play.party) return;
    const save = play.save, fam = familyOrder();
    (room.def.cushions || []).forEach((col, i) => {
      const id = fam[i];
      if (!id || !(save.family || {})[id]) return;
      // the kitten's own Mama waits by the front door
      const mama = id === play.mamaId();
      if (mama) col = room.def.doors[0][1] - 2.5;
      const x = (room.x + col) * T + T / 2 - cam.x, y = (room.y + 32) * T - cam.y - 4;
      if (x < -60 || x > G().W + 60) return;
      const m = BB.CATS[id] || {};
      const b = play.pl.body, near = Math.abs(b.x - (x + cam.x)) < 120 && Math.abs(b.y - (y + cam.y)) < 100;
      const tt = t + i * 37;
      // (Mama stays awake, watching the door)
      const pose = play.celebrationT > 0 ? { mode: 'stand', happy: true, t: tt, squash: 1 + Math.sin(tt * 0.2) * 0.12, wave: Math.max(0, Math.sin(tt * 0.1)) }
        : near || mama ? { mode: 'sit', happy: near, t: tt } : { mode: 'sleep', t: tt };
      const hop = play.celebrationT > 0 ? Math.max(0, Math.sin(tt * 0.18)) * 22 : 0;
      BB.Kittens.draw(c, id, pose, x, y - hop, m.size || 1.4, x < b.x - cam.x ? 1 : -1);
      if (near && tt % 60 === 0) BB.Particles.heart(x + cam.x, y + cam.y - 40);

    });
  }

  // the skylight in the roof — a rainbow shines through once you've slid home
  function drawFront(c, room, cam, t, play) {
    const X = col => (room.x + col) * T - cam.x, Y = row => (room.y + row) * T - cam.y;
    const x = X(26.5), y = Y(0.2), w = 7 * T;
    if (x > G().W + 40 || x + w < -40 || y > G().H) return;
    c.fillStyle = '#7a4e2c'; G().rrect(x - 6, y - 4, w + 12, 1.7 * T, 8, c); c.fill();
    const g = c.createLinearGradient(0, y, 0, y + 1.5 * T);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#e8f6ff');
    c.fillStyle = g; G().rrect(x, y, w, 1.3 * T, 6, c); c.fill();
    if (play.save.finale) {
      c.save(); c.globalAlpha = 0.5;
      ['#ff7b9c', '#ffcf5c', '#8fe388', '#7cc8ff', '#b99cff'].forEach((col, i) => {
        c.fillStyle = col; c.fillRect(x + 20 + i * 18, y, 16, 1.3 * T);
      });
      c.restore();
    }
  }

  // the opening scene's thought bubble: where is everyone?
  function drawIntro(c, cam, play) {
    const it = play.intro;
    if (!it || it.t < 80) return;
    const b = play.pl.body;
    const a = Math.min(1, (it.t - 80) / 20);
    const x = b.x + b.w / 2 - cam.x + 30, y = b.y - cam.y - 70;
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.strokeStyle = '#b8a0e8'; c.lineWidth = 2;
    G().circle(x - 22, y + 50, 4, c); c.fill(); c.stroke();
    G().circle(x - 14, y + 38, 6, c); c.fill(); c.stroke();
    G().rrect(x - 10, y - 30, 120, 56, 26, c); c.fill(); c.stroke();
    const fam = familyOrder();
    for (let i = 0; i < 3; i++) faceOf(c, fam[i * 2], x + 16 + i * 30, y - 2, 1.4, false);
    c.restore();
  }

  BB.Home = { familyOrder, drawBack, drawFamily, drawFront, drawIntro, faceOf, drawToys, drawMirror, toySpot, TOY_SPOTS, MIRROR_COL };
})(window.BB);
