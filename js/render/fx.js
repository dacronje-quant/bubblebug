// ════════════════════════════════════════════════════════════════
//  FX — living details that make the world feel touchable.
//   • grass & flower tufts that bend as the kitten brushes past (and
//     spring back), in every grassy zone
//   • paw prints pressed into snow and sand that slowly fill back in
//   • crunchy leaves kicked up in the Autumn Woods, ripples in water
//   • dancing underwater light (caustics) in the Coral Lagoon
//   • soft slanting light shafts in sunny and moonlit zones
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const C = BB.CFG;
  const T = C.TILE;
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const W = () => BB.World;
  const PT = () => BB.Particles;

  // which zones grow tufts, and in what colours
  const TUFT = {
    gardens: ['#6cc24a', '#a4e36b', '#3f8f35'], meadow: ['#5ed6b0', '#a8ffe0', '#2f9c83'],
    ruins: ['#6fae7a', '#a6d6a0', '#4a8458'], springs: ['#6fb87a', '#a8e0a0', '#3f7a4a'],
    autumn: ['#e8783a', '#ffb060', '#b0482a'], starlight: ['#b8a0ff', '#f0e8ff', '#7a60d0'],
    lagoon: ['#9ab84a', '#c8d878', '#6a8a3a'], dunes: ['#b8a050', '#d8c878', '#8a7a3a'],
  };
  const FLOWERS = { gardens: ['#ff9ec7', '#ffe066', '#ffffff', '#c9a6ff'], meadow: ['#ff9be0', '#7cf5d4'], springs: ['#ffb0c0', '#ffffff'], ruins: ['#bfe7ff'], starlight: ['#fff6d0'] };
  const PRINTS = { frost: '#b8c8e0', dunes: '#c89a5a', lagoon: '#d8b87a' };
  const SHAFT = { gardens: '#fff2b0', autumn: '#ffc070', lagoon: '#e8fff8', springs: '#d8e0ff', meadow: '#c8b8ff' };

  const tuftCache = new Map(); // room id → tufts
  const bend = new Map();      // tuft key → { a, v }
  const prints = [];
  let stepDist = 0, lastX = null, printSide = 1;

  function tuftsFor(room) {
    let list = tuftCache.get(room.id);
    if (list) return list;
    list = [];
    const Z = BB.ZONES[room.zone];
    if (TUFT[Z.key]) {
      for (let r = 1; r < room.h; r++) for (let c = 0; c < room.w; c++) {
        if (room.grid[r][c] !== '#' || room.grid[r - 1][c] !== '.') continue;
        const tx = room.x + c, ty = room.y + r;
        // beach grass only away from the water's edge
        if (Z.key === 'lagoon' && (W().tile(tx - 1, ty) === '~' || W().tile(tx + 1, ty) === '~' || W().tile(tx, ty - 2) === '~')) continue;
        const h = BB.hash(tx, ty, 777);
        const dens = Z.key === 'dunes' ? 0.12 : Z.key === 'lagoon' ? 0.2 : 0.42;
        if (h > dens) continue;
        const fl = FLOWERS[Z.key];
        list.push({
          key: tx + ',' + ty, x: tx * T + 6 + BB.hash(tx, ty, 778) * 20, y: ty * T,
          n: 3 + Math.floor(BB.hash(tx, ty, 779) * 3), hgt: 9 + BB.hash(tx, ty, 780) * 9,
          flower: fl && BB.hash(tx, ty, 781) < 0.3 ? fl[Math.floor(BB.hash(tx, ty, 782) * fl.length)] : null,
          cols: TUFT[Z.key], seed: h * 100,
        });
      }
    }
    tuftCache.set(room.id, list);
    return list;
  }

  function update(play, b) {
    const room = play.room, Z = BB.ZONES[room.zone];
    const cx = b.x + b.w / 2, feet = b.y + b.h;
    const moving = Math.abs(b.vx) > 0.4;
    // push the tufts near the kitten
    if (TUFT[Z.key]) {
      for (const tf of tuftsFor(room)) {
        const dx = tf.x - cx;
        if (Math.abs(dx) > 60 || Math.abs(feet - tf.y) > 40) { const s = bend.get(tf.key); if (s && Math.abs(s.a) < 0.01 && Math.abs(s.v) < 0.01) bend.delete(tf.key); }
        let s = bend.get(tf.key);
        if (!s) { if (Math.abs(dx) > 40 || Math.abs(feet - tf.y) > 30) continue; s = { a: 0, v: 0 }; bend.set(tf.key, s); }
        let push = 0;
        if (Math.abs(dx) < 22 && feet > tf.y - tf.hgt - 10 && feet < tf.y + 6) push = Math.sign(dx || 1) * (1 - Math.abs(dx) / 22) * (moving ? 1.1 : 0.5);
        s.v += (push - s.a) * 0.12;
        s.v *= 0.82;
        s.a += s.v;
        if (push && moving && Z.key === 'autumn' && Math.random() < 0.05) {
          PT().burst('dot', tf.x, tf.y - 4, 1, { color: BB.pick(['#e8783a', '#ffb060', '#d8442a', '#ffd04a']), speed: 1.6, life: 40, size: 3, g: 0.08, up: 1.2 });
        }
      }
    }
    // paw prints in snow and sand
    const ground = W().tile(Math.floor(cx / T), Math.floor((feet + 2) / T));
    if (PRINTS[Z.key] && b.grounded && ground === '#' && moving && play.pl.state === 'play') {
      stepDist += lastX == null ? 0 : Math.abs(cx - lastX);
      if (stepDist > 13) {
        stepDist = 0; printSide = -printSide;
        prints.push({ x: cx + printSide * 3, y: feet, t: 0, col: PRINTS[Z.key], dir: Math.sign(b.vx) });
        if (prints.length > 70) prints.shift();
        if (Z.key === 'frost' && Math.random() < 0.3) PT().burst('dot', cx, feet - 2, 2, { color: '#ffffff', speed: 1, life: 20, size: 2, up: 0.6 });
        if (Z.key === 'dunes' && Math.random() < 0.3) PT().burst('dot', cx, feet - 2, 2, { color: '#f0d0a0', speed: 1, life: 22, size: 2, up: 0.4 });
      }
    }
    lastX = cx;
    for (const p of prints) p.t++;
    while (prints.length && prints[0].t > 420) prints.shift();
    // ripples where the kitten meets the water's surface
    if (b.inWater && play.t % 9 === 0) {
      const tx = Math.floor(cx / T);
      let ty = Math.floor((b.y + 4) / T);
      if (W().tile(tx, ty - 1) !== '~' && W().tile(tx, ty) === '~') PT().ring(cx, ty * T + 6, 'rgba(255,255,255,0.8)', 8 + Math.abs(b.vx) * 3);
    }
  }

  // ──── Drawing ────
  function drawShafts(c, room, cam, t) {
    const Z = BB.ZONES[room.zone];
    const col = SHAFT[Z.key];
    if (!col) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const off = -((cam.x * 0.12) % 320);
    for (let i = -1; i < 5; i++) {
      const x = off + i * 320 + Math.sin(t * 0.004 + i) * 30;
      const w = 70 + (i % 3) * 30;
      const a = 0.05 + 0.03 * Math.sin(t * 0.01 + i * 1.7);
      const g = c.createLinearGradient(0, 0, 0, G().H);
      g.addColorStop(0, BB.rgba(col, a)); g.addColorStop(1, BB.rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, -10); c.lineTo(x + w, -10);
      c.lineTo(x + w + 260, G().H); c.lineTo(x + 180, G().H);
      c.closePath(); c.fill();
    }
    c.restore();
  }

  function drawGround(c, visible, cam, t, body) {
    // paw prints
    for (const p of prints) {
      const x = p.x - cam.x, y = p.y - cam.y;
      if (x < -20 || x > G().W + 20 || y < -20 || y > G().H + 20) continue;
      const a = Math.min(1, (420 - p.t) / 120) * 0.55;
      c.fillStyle = BB.rgba(p.col, a);
      G().ellipse(x, y - 1, 3.2, 1.3, 0, c); c.fill();
      for (const d of [-2.6, -0.9, 0.9, 2.6]) { G().ellipse(x + d + p.dir * 1.8, y - 2.6 - Math.abs(d) * 0.1, 0.9, 0.6, 0, c); c.fill(); }
    }
    // bendy tufts
    for (const room of visible) {
      for (const tf of tuftsFor(room)) {
        const x = tf.x - cam.x, y = tf.y - cam.y;
        if (x < -30 || x > G().W + 30 || y < -40 || y > G().H + 20) continue;
        const s = bend.get(tf.key);
        const lean = (s ? s.a : 0) + Math.sin(t * 0.02 + tf.seed) * 0.08;
        for (let i = 0; i < tf.n; i++) {
          const bx = x + (i - (tf.n - 1) / 2) * 3.2;
          const h = tf.hgt * (0.7 + ((i * 37 + tf.seed) % 10) / 30);
          const tipx = bx + lean * h * 0.9 + (i - (tf.n - 1) / 2) * 1.5, tipy = y - h * (1 - Math.abs(lean) * 0.25);
          c.fillStyle = tf.cols[i % 3];
          c.beginPath(); c.moveTo(bx - 1.6, y + 1); c.quadraticCurveTo(bx + lean * h * 0.3, y - h * 0.5, tipx, tipy); c.quadraticCurveTo(bx + lean * h * 0.3 + 1, y - h * 0.45, bx + 1.6, y + 1); c.closePath(); c.fill();
        }
        if (tf.flower) {
          const fx = x + lean * tf.hgt * 1.1, fy = y - tf.hgt * 1.15;
          c.strokeStyle = tf.cols[2]; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 6, y - tf.hgt * 0.6, fx, fy); c.stroke();
          c.fillStyle = tf.flower;
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + t * 0.01; G().circle(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.8, c); c.fill(); }
          c.fillStyle = '#ffd34d'; G().circle(fx, fy, 1.3, c); c.fill();
        }
      }
    }
  }

  // light dancing on the sea floor, drawn over the water
  function drawWaterFront(c, visible, cam, t) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const room of visible) {
      if (BB.ZONES[room.zone].key !== 'lagoon') continue;
      const x0 = Math.max(0, Math.floor(cam.x / T) - room.x), x1 = Math.min(room.w, Math.ceil((cam.x + G().W) / T) - room.x + 1);
      const y0 = Math.max(0, Math.floor(cam.y / T) - room.y), y1 = Math.min(room.h, Math.ceil((cam.y + G().H) / T) - room.y + 1);
      for (let r = y0; r < y1; r++) {
        for (let col = x0; col < x1; col++) {
          if (room.grid[r][col] !== '~') continue;
          const tx = room.x + col, ty = room.y + r;
          if (W().tile(tx, ty - 1) !== '~') continue;
          let d = 1;
          while (d < 10 && W().tile(tx, ty - d) === '~') d++;
          if (d >= 10) continue;
          const a = 0.1 * (1 - d / 10);
          const x = tx * T - cam.x, y = ty * T - cam.y;
          c.strokeStyle = `rgba(210,255,250,${a})`; c.lineWidth = 2;
          for (let k = 0; k < 2; k++) {
            c.beginPath();
            for (let s = 0; s <= 4; s++) {
              const px = x + s * 8;
              const py = y + 8 + k * 14 + Math.sin((tx * T + px - x) * 0.09 + t * 0.05 + k * 2 + ty) * 4 + Math.sin((tx * T + px - x) * 0.23 - t * 0.03) * 2;
              if (s) c.lineTo(px, py); else c.moveTo(px, py);
            }
            c.stroke();
          }
        }
      }
    }
    c.restore();
  }

  BB.Fx = { update, drawShafts, drawGround, drawWaterFront, clear() { tuftCache.clear(); bend.clear(); prints.length = 0; } };
})(window.BB);
