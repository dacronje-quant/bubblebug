// ════════════════════════════════════════════════════════════════
//  WARDROBE — things for the kitten to wear.
//  Every boss you cheer up gives the kitten a present to wear (the goose's
//  bonnet, the walrus's bobble hat, the moose's stripy scarf…). The newest
//  one goes straight on; at home, stand still at the big mirror to try
//  them all on: one hat, one neck thing and a face accessory at a time.
//
//  Everything is drawn in the kitten's head space (the head is an ellipse
//  about 9.6 × 8.8 around 0,0, looking right; ears poke up to y ≈ −15).
// ════════════════════════════════════════════════════════════════
(function (BB) {
  'use strict';
  const TAU = Math.PI * 2;
  const G = () => BB.G;
  const OUT = '#3a2a3a';

  const LIST = [
    { id: 'bonnet', boss: 'goose', slot: 'head', name: 'Goose bonnet' },
    { id: 'mushroom', boss: 'toad', slot: 'head', name: 'Mushroom hat' },
    { id: 'tiara', boss: 'armadillo', slot: 'head', name: 'Crystal tiara' },
    { id: 'crown', boss: 'queenbee', slot: 'head', name: 'Honey crown' },
    { id: 'horn', boss: 'elephant', slot: 'head', name: 'Unicorn horn' },
    { id: 'ruff', boss: 'king', slot: 'neck', name: 'Cloud collar' },
    { id: 'sailor', boss: 'octopus', slot: 'head', name: 'Sailor hat' },
    { id: 'sunhat', boss: 'camel', slot: 'head', name: 'Sun hat' },
    { id: 'bobble', boss: 'walrus', slot: 'head', name: 'Bobble hat' },
    { id: 'scarf', boss: 'moose', slot: 'neck', name: 'Stripy scarf' },
    { id: 'nightcap', boss: 'panda', slot: 'head', name: 'Sleepy nightcap' },
    { id: 'ears', boss: 'moonbunny', slot: 'head', name: 'Bunny ears' },
    { id: 'partyhat', name: 'Party hat', slot: 'head', stars: 25 },
    { id: 'flowers', name: 'Flower crown', slot: 'head', stars: 50 },
    { id: 'wizard', name: 'Wizard hat', slot: 'head', stars: 100 },
    { id: 'pirate', name: 'Pirate hat', slot: 'head', stars: 125 },
    { id: 'chef', name: 'Chef hat', slot: 'head', stars: 75 },
    { id: 'sparkly', name: 'Sparkly collar', slot: 'neck', stars: 150 },
    { id: 'jingle', name: 'Jingle collar', slot: 'neck', stars: 175 },
    { id: 'scuba', name: 'Scuba mask & snorkel', slot: 'face', stars: 200 },
    { id: 'googly', name: 'Googly glasses', slot: 'face', discover: 'Root Hollow' },
    { id: 'disguise', name: 'Silly disguise', slot: 'face', discover: 'the hidden crystal grotto' },
    { id: 'starshades', name: 'Star shades', slot: 'face', discover: 'the coral garden' },
    { id: 'heartshades', name: 'Heart glasses', slot: 'face', stars: 300 },
    { id: 'flowerframes', name: 'Flower glasses', slot: 'face', unlock: { kind: 'buds', count: 4 } },
    { id: 'moonframes', name: 'Moon glasses', slot: 'face', unlock: { kind: 'family', count: 4 } },
    { id: 'aviators', name: 'Explorer goggles', slot: 'face', unlock: { kind: 'friends', count: 16 } },
    { id: 'bowtie', name: 'Bow tie', slot: 'neck', unlock: { kind: 'toys', count: 3 } },
    { id: 'pearls', name: 'Pearl necklace', slot: 'neck', unlock: { kind: 'songs', count: 2 } },
    { id: 'leafcollar', name: 'Leaf collar', slot: 'neck', unlock: { kind: 'gestures', count: 3 } },
    { id: 'rainbowcollar', name: 'Rainbow necklace', slot: 'neck', unlock: { kind: 'rainbow', count: 1 } },
  ];
  const BY = Object.fromEntries(LIST.map(a => [a.id, a]));
  const BY_BOSS = Object.fromEntries(LIST.filter(a => a.boss).map(a => [a.boss, a]));

  // ──── Drawing each thing (head space) ────
  const ART = {
    heartshades(c) {
      c.strokeStyle = '#cd648e'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(-11, -2); c.lineTo(12, -2); c.stroke();
      for (const x of [-4.8, 5.8]) {
        c.fillStyle = '#ffb6d6'; G().heart(x, -1, 5.4, c); c.fill(); c.stroke();
        c.strokeStyle = '#fff7fc'; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(x - 2.3, -3.5); c.lineTo(x - 0.7, -4); c.stroke();
        c.strokeStyle = '#cd648e'; c.lineWidth = 1.3;
      }
    },
    flowerframes(c) {
      c.strokeStyle = '#79b997'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(-11, -2); c.lineTo(12, -2); c.stroke();
      for (const [x, col] of [[-5, '#ff9fc8'], [6, '#b9a3ef']]) {
        flower(c, x, -1, col, 1.3);
        c.fillStyle = 'rgba(235,252,255,0.78)'; c.strokeStyle = '#dbbc56'; c.lineWidth = 0.8;
        G().circle(x, -1, 3, c); c.fill(); c.stroke();
        c.strokeStyle = '#79b997'; c.lineWidth = 1.3;
      }
    },
    moonframes(c) {
      c.strokeStyle = '#7f80ba'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-11, -2); c.lineTo(12, -2); c.stroke();
      for (const x of [-5, 6]) {
        c.fillStyle = 'rgba(198,217,255,0.6)'; G().circle(x, -1, 4.8, c); c.fill(); c.stroke();
        c.fillStyle = '#ffe99b';
        c.beginPath(); c.arc(x, -1, 4.6, -Math.PI / 2, Math.PI / 2);
        c.quadraticCurveTo(x + 1.2, -1, x, -5.6); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; G().twinkle(x - 1.2, -2.2, 1.1, c); c.fill();
      }
    },
    aviators(c) {
      c.strokeStyle = '#ae7048'; c.lineWidth = 2.7;
      c.beginPath(); c.moveTo(-11, -1); c.lineTo(12, -1); c.stroke();
      for (const x of [-5, 6]) {
        c.fillStyle = '#ca9b64'; c.strokeStyle = '#936039'; c.lineWidth = 0.8;
        G().ellipse(x, -1, 5.4, 4.8, 0, c); c.fill(); c.stroke();
        c.fillStyle = 'rgba(165,222,236,0.8)'; G().ellipse(x, -1, 3.9, 3.4, 0, c); c.fill();
        c.strokeStyle = '#effdff'; c.lineWidth = 0.9;
        c.beginPath(); c.moveTo(x - 2, -1); c.lineTo(x + 0.5, -3); c.stroke();
      }
    },
    bowtie(c) {
      c.fillStyle = '#777cc9'; G().rrect(-8, 6, 19, 4, 2, c); c.fill();
      c.fillStyle = '#a6adf5'; c.strokeStyle = '#6c72ba'; c.lineWidth = 0.7;
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(2, 9); c.lineTo(2 + d * 7, 5); c.quadraticCurveTo(2 + d * 9, 10, 2 + d * 7, 14); c.closePath(); c.fill(); c.stroke();
      }
      c.fillStyle = '#fff2bc'; G().circle(2, 9, 2.1, c); c.fill();
    },
    pearls(c) {
      c.strokeStyle = '#b7a4bf'; c.lineWidth = 0.6;
      for (let i = 0; i < 7; i++) {
        const x = -7 + i * 3, y = 7 + Math.sin(i / 6 * Math.PI) * 3;
        c.fillStyle = '#fff5f2'; G().circle(x, y, 2.2, c); c.fill(); c.stroke();
        c.fillStyle = '#ffffff'; G().circle(x - 0.6, y - 0.7, 0.7, c); c.fill();
      }
      c.fillStyle = '#87d0de'; G().ellipse(2, 15, 2.5, 3.1, 0, c); c.fill(); c.stroke();
    },
    leafcollar(c) {
      c.strokeStyle = '#528b67'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-8, 7); c.quadraticCurveTo(0, 13, 11, 7); c.stroke();
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#98d39b' : '#69b78b';
        G().ellipse(-7 + i * 3.5, 8 + Math.sin(i / 5 * Math.PI) * 3, 2.4, 4, (i - 2.5) * 0.32, c); c.fill();
      }
      flower(c, 2, 12, '#ffe8a3', 0.65);
    },
    rainbowcollar(c, t) {
      c.save(); G().rrect(-8, 6, 19, 4, 2, c); c.clip();
      BB.Cosmetics.COLORS.forEach((col, i) => { c.fillStyle = col; c.fillRect(-8 + i * 3.8, 6, 3.8, 4); });
      c.restore();
      c.strokeStyle = '#bfa266'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(2, 10); c.lineTo(2, 12); c.stroke();
      c.fillStyle = '#ffe6a1'; G().star(2, 14, 4, 5, 0.5, -Math.PI / 2, c); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G().twinkle(2.4, 13, 1 + Math.sin(t * 0.06) * 0.15, c); c.fill();
    },
    googly(c, t) {
      c.strokeStyle = '#8b69b3'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-10, -2); c.lineTo(11, -2); c.stroke();
      for (const x of [-4.7, 5.3]) {
        c.fillStyle = '#fffef6'; G().circle(x, -1, 4.8, c); c.fill(); c.stroke();
        c.fillStyle = '#474258'; G().circle(x + Math.sin(t * 0.1 + x) * 1.3, -0.2 + Math.cos(t * 0.08) * 0.8, 1.8, c); c.fill();
        c.fillStyle = '#ffffff'; G().circle(x + 0.7, -1.4, 0.7, c); c.fill();
      }
    },
    disguise(c) {
      c.fillStyle = 'rgba(193,230,255,0.3)'; c.strokeStyle = '#4f445d'; c.lineWidth = 1.3;
      for (const x of [-4.8, 5.2]) { G().circle(x, -2, 4.4, c); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(-0.4, -2); c.lineTo(0.8, -2); c.stroke();
      c.fillStyle = '#f2b28c'; G().ellipse(1.5, 3, 2.6, 3.5, -0.1, c); c.fill();
      c.fillStyle = '#675167';
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(1.5, 5); c.quadraticCurveTo(1.5 + d * 7, 2, 1.5 + d * 7, 6); c.quadraticCurveTo(1.5 + d * 3, 9, 1.5, 5); c.fill(); }
      c.lineWidth = 2.3;
      for (const x of [-5, 5]) { c.beginPath(); c.moveTo(x - 3, -7); c.lineTo(x + 3, -7); c.stroke(); }
    },
    starshades(c) {
      c.strokeStyle = '#ba7fae'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-10, -2); c.lineTo(11, -2); c.stroke();
      for (const [x, color] of [[-4.5, '#ffa7da'], [5.5, '#9cdfff']]) {
        c.fillStyle = color; G().star(x, -1, 5.6, 5, 0.55, -Math.PI / 2, c); c.fill(); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - 1.3, -3); c.lineTo(x + 1, -3.8); c.stroke();
        c.strokeStyle = '#ba7fae'; c.lineWidth = 1.1;
      }
    },
    scuba(c, t) {
      // Transparent lenses leave the eyes visible; the snorkel curls up
      // beside the ear. It can be worn with a hat and collar.
      c.strokeStyle = '#438eab'; c.lineWidth = 1.8; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-10, -2); c.lineTo(11, -2); c.stroke();
      c.fillStyle = 'rgba(153,235,255,0.42)'; c.strokeStyle = '#45c9d0'; c.lineWidth = 1.3;
      for (const x of [-7, 2]) { G().rrect(x, -4, 8, 7, 2.2, c); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(1, -1); c.lineTo(2, -1); c.stroke();
      c.strokeStyle = '#ffaf70'; c.lineWidth = 2.7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(6, 6); c.quadraticCurveTo(-12, 9, -12, -1);
      c.lineTo(-12, -18); c.quadraticCurveTo(-12, -22, -8, -22); c.lineTo(-7, -22); c.stroke();
      c.fillStyle = '#5dbecb'; G().rrect(-9, -24, 5, 4, 1, c); c.fill();
      c.fillStyle = '#ffffff'; G().ellipse(5, -2, 1.8, 0.6, -0.5, c); c.fill();
      for (let i = 0; i < 2; i++) {
        const phase = (t * 0.04 + i * 0.8) % 1.6;
        c.strokeStyle = 'rgba(99,201,225,0.55)'; c.lineWidth = 0.6;
        G().circle(-7 + Math.sin(phase * 3), -25 - phase * 5, 0.8, c); c.stroke();
      }
    },
    partyhat(c) {
      c.fillStyle = '#ff8fb8'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-8, -6); c.lineTo(1, -26); c.lineTo(10, -6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffe066';
      for (const [x, y] of [[0, -19], [-3, -12], [5, -10]]) { G().circle(x, y, 1.5, c); c.fill(); }
      G().circle(1, -26, 2.4, c); c.fill();
    },
    flowers(c) {
      c.strokeStyle = '#6cbf78'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-9, -7); c.quadraticCurveTo(0, -12, 10, -7); c.stroke();
      for (const [x, y, col] of [[-7, -8, '#ff9ec7'], [0, -10, '#ffffff'], [7, -8, '#ffe066']]) flower(c, x, y, col, 1.25);
    },
    wizard(c, t) {
      c.fillStyle = '#7975ce'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(-1, -19, -1, -27); c.quadraticCurveTo(6, -23, 10, -6); c.closePath(); c.fill(); c.stroke();
      G().ellipse(0.5, -6, 13, 2.4, 0, c); c.fill(); c.stroke();
      c.fillStyle = '#ffe066'; G().star(2, -15, 3, 5, 0.5, t * 0.02, c); c.fill();
    },
    pirate(c) {
      c.fillStyle = '#4c506a'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-13, -6); c.lineTo(-10, -15); c.quadraticCurveTo(0, -11, 11, -15); c.lineTo(14, -6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffe066'; G().star(0.5, -10, 3.6, 5, 0.5, -Math.PI / 2, c); c.fill();
    },
    chef(c) {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#9e8fa4'; c.lineWidth = 0.9;
      for (const [x, y] of [[-6, -15], [1, -18], [8, -15]]) { G().circle(x, y, 6, c); c.fill(); c.stroke(); }
      G().rrect(-8, -13, 18, 8, 2, c); c.fill(); c.stroke();
    },
    sparkly(c, t) {
      c.fillStyle = '#d1a4f3'; c.strokeStyle = '#8560ac'; c.lineWidth = 0.8;
      G().rrect(-7, 6, 17, 4, 2, c); c.fill(); c.stroke();
      c.fillStyle = '#fff4c2';
      for (const x of [-3, 3, 8]) { G().twinkle(x, 8, 1.3 + Math.sin(t * 0.08 + x) * 0.4, c); c.fill(); }
    },
    jingle(c, t) {
      c.fillStyle = '#ff8fb8'; G().rrect(-7, 6, 17, 4, 2, c); c.fill();
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#a47a36'; c.lineWidth = 0.7;
      G().circle(4, 12 + Math.sin(t * 0.1) * 0.5, 3, c); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, 12); c.lineTo(4, 14.5); c.stroke();
    },
    bonnet(c, t) {
      c.fillStyle = '#8fc8ff'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-10, 1); c.quadraticCurveTo(-11, -12, 0, -12.5); c.quadraticCurveTo(8, -12.5, 9.5, -6); c.quadraticCurveTo(0, -8.5, -7, 1); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.moveTo(-7, 1); c.quadraticCurveTo(0, -8.5, 9.5, -6); c.stroke();
      flower(c, -2.5, -11, '#ffffff', 0.9);
      c.strokeStyle = '#ff8fb8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8.5, 1); c.quadraticCurveTo(-6, 6, -3, 8); c.stroke();
    },
    mushroom(c) {
      c.fillStyle = '#ff5d6c'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(0.5, -7.5, 11, 7.5, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      for (const [x, y, r] of [[-5, -10, 1.8], [1.5, -13, 2.1], [6.5, -9.5, 1.5], [-1, -8.5, 1.1]]) { G().circle(x, y, r, c); c.fill(); }
    },
    tiara(c, t) {
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#a8740e'; c.lineWidth = 0.7;
      c.beginPath(); c.ellipse(0.5, -7.5, 8, 2.2, 0, Math.PI, 0); c.lineTo(8.5, -7.5); c.stroke();
      c.fillRect(-7.5, -8.3, 16, 1.6);
      for (const [x, h] of [[-4, 4], [0.5, 6.5], [5, 4]]) {
        c.fillStyle = 'rgba(190,230,255,0.95)'; c.strokeStyle = '#5a6fc0';
        c.beginPath(); c.moveTo(x - 1.8, -8); c.lineTo(x, -8 - h); c.lineTo(x + 1.8, -8); c.closePath(); c.fill(); c.stroke();
      }
      G().drawGlow(0.5, -12, 6, '#bfe6ff', 0.5 + 0.3 * Math.sin(t * 0.1), c);
    },
    crown(c, t) {
      c.fillStyle = '#ffcf3a'; c.strokeStyle = '#a8740e'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-6.5, -7); c.lineTo(-7.5, -15); c.lineTo(-3.5, -11); c.lineTo(0.5, -16.5); c.lineTo(4.5, -11); c.lineTo(8.5, -15); c.lineTo(7.5, -7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff7eb6'; G().circle(0.5, -9.5, 1.5, c); c.fill();
      c.fillStyle = '#ffffff'; for (const x of [-7.5, 0.5, 8.5]) { G().circle(x, x === 0.5 ? -16.5 : -15, 0.9, c); c.fill(); }
    },
    // the elephant's present: a little tusk that turns the kitten into a unicorn
    horn(c, t) {
      c.save(); c.translate(3.5, -7.5); c.rotate(0.28);
      const g = c.createLinearGradient(-3, 0, 3, -14);
      g.addColorStop(0, '#fff6d0'); g.addColorStop(0.5, '#ffd9f0'); g.addColorStop(1, '#d8c8ff');
      c.fillStyle = g; c.strokeStyle = '#b89a6a'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-3.2, 0); c.quadraticCurveTo(-1.2, -8, 0, -15); c.quadraticCurveTo(1.2, -8, 3.2, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(200,150,120,0.8)'; c.lineWidth = 0.7;
      for (let i = 1; i <= 4; i++) { const y = -i * 3, w = 3.2 * (1 - i / 5); c.beginPath(); c.moveTo(-w, y + 1); c.lineTo(w, y - 0.8); c.stroke(); }
      const k = 0.5 + 0.5 * Math.sin(t * 0.12);
      G().drawGlow(0, -15, 7, '#fff4c2', 0.5 + 0.4 * k, c);
      c.fillStyle = 'rgba(255,255,255,0.95)'; G().twinkle(1.5, -16.5, 1.4 + k, c); c.fill();
      c.restore();
      // a little rainbow tuft of mane behind the ear
      ['#ff9ec7', '#ffe066', '#9fe89a', '#8fd0ff'].forEach((col, i) => {
        c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-6 + i * 1.2, -8); c.quadraticCurveTo(-11 + i, -6, -10 + i * 1.5, -1 + i); c.stroke();
      });
    },
    ruff(c, t) {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#b8b0d8'; c.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) { G().circle(-6 + i * 3.4, 8.5 + (i % 2) * 1.2, 3, c); c.fill(); c.stroke(); }
      c.fillStyle = '#ffe27a'; G().star(3, 9.5, 2, 5, 0.45, -Math.PI / 2, c); c.fill();
    },
    sailor(c) {
      c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(0.5, -7.5, 10, 2.6, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-6.5, -8); c.lineTo(-5.5, -13); c.quadraticCurveTo(0.5, -15, 6.5, -13); c.lineTo(7.5, -8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#3f7fd0'; c.fillRect(-6.2, -10.2, 13.5, 2.2);
      c.beginPath(); c.moveTo(-6, -9); c.lineTo(-10, -5); c.lineTo(-8, -4.5); c.closePath(); c.fill();
    },
    sunhat(c) {
      c.fillStyle = '#f2d08a'; c.strokeStyle = '#9a7a3a'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0.5, -7, 15, 3.6, -0.05, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(0.5, -8, 7.5, 6.5, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff8fb8'; c.fillRect(-7, -10, 15, 2.2);
      flower(c, 7, -10, '#ffe066', 0.7);
    },
    bobble(c) {
      c.fillStyle = '#e84a5a'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-9, -5); c.quadraticCurveTo(-9, -16, 0.5, -16); c.quadraticCurveTo(10, -16, 10, -5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(-9.2, -7.5, 19.4, 2.6);
      c.fillRect(-7, -12.5, 15, 1.6);
      G().circle(0.5, -17.5, 3.2, c); c.fill(); c.stroke();
    },
    scarf(c) {
      const band = (x, y, w, h) => {
        c.fillStyle = '#4fc3c8'; G().rrect(x, y, w, h, 2, c); c.fill();
        c.fillStyle = '#ffd84a'; for (let i = 1; i < w / 3; i++) c.fillRect(x + i * 3, y, 1.4, h);
      };
      band(-7, 6.5, 17, 4.2);
      c.save(); c.translate(-3, 9); c.rotate(0.35); band(-1.5, 0, 4.5, 9); c.restore();
      c.strokeStyle = 'rgba(40,30,40,0.4)'; c.lineWidth = 0.6; G().rrect(-7, 6.5, 17, 4.2, 2, c); c.stroke();
    },
    nightcap(c, t) {
      const sway = Math.sin(t * 0.05) * 1.2;
      c.fillStyle = '#6a7ad8'; c.strokeStyle = OUT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-9, -5); c.quadraticCurveTo(-6, -14, 2, -14); c.quadraticCurveTo(-8, -17, -15 + sway, -10); c.lineTo(-13 + sway, -8.5); c.quadraticCurveTo(-7, -12, 10, -5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; G().rrect(-9.5, -6.5, 20, 3, 1.5, c); c.fill();
      G().circle(-14.5 + sway, -9, 2.6, c); c.fill(); c.stroke();
      c.fillStyle = '#ffe27a'; G().star(-1, -10, 1.8, 5, 0.45, -Math.PI / 2, c); c.fill();
    },
    ears(c, t) {
      const flop = Math.sin(t * 0.06) * 0.08;
      c.strokeStyle = '#ff8fb8'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0.5, -6.5, 9, 3, 0, Math.PI, 0); c.stroke();
      for (const [x, a] of [[-3.5, -0.25 - flop], [4.5, 0.2 + flop]]) {
        c.save(); c.translate(x, -8); c.rotate(a);
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 0.8;
        G().ellipse(0, -8, 3, 8, 0, c); c.fill(); c.stroke();
        c.fillStyle = '#ffb3cf'; G().ellipse(0, -8, 1.5, 6, 0, c); c.fill();
        c.restore();
      }
    },
  };

  function flower(c, x, y, col, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; G().circle(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 1.8, c); c.fill(); }
    c.fillStyle = '#ffd34d'; G().circle(0, 0, 1.3, c); c.fill();
    c.restore();
  }

  // on the kitten (called from the head drawing, in head space)
  function drawOn(c, wear, t) {
    if (!wear) return;
    for (const slot of ['neck', 'head', 'face']) {
      const id = wear[slot];
      if (!id || !ART[id]) continue;
      // (neck things sit a little lower, under the chin)
      if (slot === 'neck') { c.save(); c.translate(-1, 2.5); ART[id](c, t || 0); c.restore(); }
      else ART[id](c, t || 0);
    }
  }

  // an item on its own, centred at x,y (for cards and the wardrobe)
  function icon(c, id, x, y, s, t) {
    const a = BY[id];
    if (!a) return;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.translate(-0.5, a.slot === 'neck' ? -9 : 10);
    ART[id](c, t || 0);
    c.restore();
  }

  // Head-space artwork has different origins/heights. Fit it to a
  // centred display box; worn clothing keeps its original proportions.
  const BOUNDS = {
    bonnet: [-12, -15, 11, 10], mushroom: [-12, -16, 13, -6], tiara: [-9, -16, 10, -6],
    crown: [-9, -18, 10, -6], horn: [-13, -28, 14, 4], ruff: [-10, 4, 15, 14],
    sailor: [-12, -16, 13, -3], sunhat: [-17, -16, 17, -2], bobble: [-11, -23, 12, -4],
    scarf: [-8, 5, 12, 20], nightcap: [-19, -19, 13, -2], ears: [-10, -27, 12, -3],
    partyhat: [-9, -29, 11, -5], flowers: [-13, -16, 13, -2], wizard: [-14, -28, 15, -3],
    pirate: [-14, -16, 15, -5], chef: [-13, -25, 15, -4], sparkly: [-8, 5, 11, 11],
    jingle: [-8, 5, 11, 17], scuba: [-15, -35, 12, 11], googly: [-11, -7, 12, 5],
    disguise: [-11, -9, 12, 10], starshades: [-11, -8, 12, 6],
    heartshades: [-12, -7, 13, 6], flowerframes: [-11, -7, 12, 5], moonframes: [-11, -7, 12, 5],
    aviators: [-12, -7, 13, 5], bowtie: [-9, 4, 12, 15], pearls: [-10, 4, 14, 19],
    leafcollar: [-10, 3, 14, 16], rainbowcollar: [-9, 5, 12, 19],
  };
  function framedIcon(c, id, x, y, size, t) {
    const bounds = BOUNDS[id];
    if (!bounds || !ART[id]) return;
    const [x0, y0, x1, y1] = bounds, scale = size / Math.max(x1 - x0, y1 - y0);
    c.save(); c.translate(x, y); c.scale(scale, scale); c.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    ART[id](c, t || 0); c.restore();
  }

  // a grey "still to find" shape
  function silhouette(c, id, x, y, s) {
    c.save();
    c.globalAlpha = 0.35; c.filter = 'grayscale(1) brightness(0.6)';
    icon(c, id, x, y, s, 0);
    c.restore();
  }

  // a boss was cheered up: its present goes on straight away
  function grant(save, bossKind, wearNow) {
    const a = BY_BOSS[bossKind];
    if (!a) return null;
    save.outfits = save.outfits || {};
    save.wear = save.wear || {};
    const isNew = !save.outfits[a.id];
    save.outfits[a.id] = 1;
    if (isNew && wearNow) { save.wear[a.slot] = a.id; save.wardrobeNew = 1; } // (the mirror sparkles till you've looked)
    return isNew ? a : null;
  }

  BB.Wardrobe = { LIST, BY, BY_BOSS, drawOn, icon, framedIcon, silhouette, grant };
})(window.BB);
