// ════════════════════════════════════════════════
//  GAME STATE & CORE LOOP
// ════════════════════════════════════════════════
const GS = {
  screen: 'title', // 'title', 'play'
  room: 'sg1',
  sparkles: 0,
  totalSparkles: 0,
  friends: 0,
  abilities: { doubleJump: false, wallClimb: false, glow: false, float: false },
  collectedSparkles: {}, // 'roomId_x_y' -> true
  befriended: {},        // 'roomId_idx' -> true
  elders: {},            // 'abilityName' -> true
  celebrationTimer: 0,
  transitionAlpha: 0,
  transitioning: false,
  transitionTarget: null,
  transitionDir: null,
  transitionPhase: null,
  showUnlock: 0,
  unlockText: '',
  unlockEmoji: '',
  zoneNameTimer: 0,
  raindrops: [],
};

// ──── ROOM LOADING ────
function loadRoom(roomId, fromDir) {
  const room = ROOMS[roomId];
  if (!room) return;
  GS.room = roomId;

  // Build tile matrix
  currentTiles = [];
  for (let r = 0; r < RH; r++) {
    currentTiles[r] = [];
    const row = room.t[r] || '';
    for (let c = 0; c < RW; c++) {
      currentTiles[r][c] = row[c] || '.';
    }
  }

  // Populate entities
  entities = [];
  bubbles = [];
  const ents = room.e || [];
  ents.forEach((e, idx) => {
    const type = e[0];
    const ex = e[1] * T + T / 2;
    const ey = e[2] * T + T / 2;
    const key = roomId + '_' + idx;

    if (type === 'sparkle') {
      const skey = roomId + '_' + e[1] + '_' + e[2];
      if (GS.collectedSparkles[skey]) return;
      entities.push({ type: 'sparkle', x: ex, y: ey, key: skey, bob: Math.random() * Math.PI * 2 });
    } else if (type === 'grumpy') {
      if (GS.befriended[key]) {
        entities.push({ type: 'happy_bug', x: ex, y: ey, variant: e[3] || 0 });
      } else {
        entities.push({ type: 'grumpy', x: ex, y: ey, hp: 3, maxHp: 3, variant: e[3] || 0, key, hitTimer: 0, moveDir: 1, moveTimer: 0, origX: ex });
      }
    } else if (type === 'caterpillar') {
      if (GS.befriended[key]) {
        entities.push({ type: 'happy_bug', x: ex, y: ey, variant: 10 });
      } else {
        entities.push({ type: 'grumpy', x: ex, y: ey, hp: 4, maxHp: 4, variant: 10, key, hitTimer: 0, moveDir: 1, moveTimer: 0, origX: ex });
      }
    } else if (type === 'bee') {
      if (GS.befriended[key]) {
        entities.push({ type: 'happy_bug', x: ex, y: ey, variant: 20 });
      } else {
        entities.push({ type: 'grumpy', x: ex, y: ey, hp: 3, maxHp: 3, variant: 20, key, hitTimer: 0, moveDir: 1, moveTimer: 0, origX: ex });
      }
    } else if (type === 'spider') {
      if (GS.befriended[key]) {
        entities.push({ type: 'happy_bug', x: ex, y: ey, variant: 30 });
      } else {
        entities.push({ type: 'grumpy', x: ex, y: ey, hp: 3, maxHp: 3, variant: 30, key, hitTimer: 0, moveDir: 1, moveTimer: 0, origX: ex });
      }
    } else if (type === 'elder_butterfly' || type === 'butterfly_elder') {
      if (!GS.elders['doubleJump']) {
        entities.push({ type: 'elder', x: ex, y: ey, ability: 'doubleJump', emoji: '🦋', giveText: 'Double Jump!' });
      } else {
        entities.push({ type: 'happy_elder', x: ex, y: ey, emoji: '🦋' });
      }
    } else if (type === 'elder_snail') {
      if (!GS.elders['wallClimb']) {
        entities.push({ type: 'elder', x: ex, y: ey, ability: 'wallClimb', emoji: '🐌', giveText: 'Wall Climb!' });
      } else {
        entities.push({ type: 'happy_elder', x: ex, y: ey, emoji: '🐌' });
      }
    } else if (type === 'elder_firefly') {
      if (!GS.elders['glow']) {
        entities.push({ type: 'elder', x: ex, y: ey, ability: 'glow', emoji: '🪲', giveText: 'Glow!' });
      } else {
        entities.push({ type: 'happy_elder', x: ex, y: ey, emoji: '🪲' });
      }
    } else if (type === 'elder_dandelion') {
      if (!GS.elders['float']) {
        entities.push({ type: 'elder', x: ex, y: ey, ability: 'float', emoji: '🌸', giveText: 'Float!' });
      } else {
        entities.push({ type: 'happy_elder', x: ex, y: ey, emoji: '🌸' });
      }
    } else if (type === 'cloud_king') {
      if (GS.befriended[key]) {
        entities.push({ type: 'happy_bug', x: ex, y: ey, variant: 50 });
      } else {
        entities.push({ type: 'grumpy', x: ex, y: ey, hp: 6, maxHp: 6, variant: 50, key, hitTimer: 0, moveDir: 1, moveTimer: 0, origX: ex, boss: true });
      }
    } else if (type === 'bench') {
      entities.push({ type: 'bench', x: ex, y: ey });
    } else if (type === 'arrow') {
      entities.push({ type: 'arrow', x: ex, y: ey, dir: e[3] });
    } else if (type === 'flower' || type === 'mushroom_bg' || type === 'crystal' || type === 'honey_drip' || type === 'cloud_bg') {
      entities.push({ type, x: ex, y: ey });
    } else if (type === 'celebration_trigger') {
      entities.push({ type: 'celebration_trigger', x: ex, y: ey, triggered: false });
    }
  });

  // Safe, verified spawn positioning
  const spawn = room.spawn || [2, 14];
  if (fromDir === 'left') {
    player.x = 2 * T;
    player.y = findGroundY(2);
    player.dir = 1;
  } else if (fromDir === 'right') {
    player.x = (RW - 3) * T;
    player.y = findGroundY(RW - 3);
    player.dir = -1;
  } else if (fromDir === 'up') {
    player.y = T;
  } else if (fromDir === 'down') {
    player.y = (RH - 2) * T;
  } else {
    player.x = spawn[0] * T;
    player.y = spawn[1] * T;
    player.dir = 1;
  }
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;

  // Background zone music
  Audio.startMusic(room.z);

  // Rainy Ruins rain drops
  GS.raindrops = [];
  const hasRain = (room.e || []).some(e => e[0] === 'rain');
  if (hasRain) {
    for (let i = 0; i < 80; i++) {
      GS.raindrops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 3 + Math.random() * 4,
        len: 8 + Math.random() * 12
      });
    }
  }
}

// ──── ROOM TRANSITION ────
function transition(target, fromDir) {
  if (GS.transitioning) return;
  GS.transitioning = true;
  GS.transitionTarget = target;
  GS.transitionDir = fromDir;
  GS.transitionAlpha = 0;
  GS.transitionPhase = 'out';
}

function updateTransition() {
  if (!GS.transitioning) return;
  player.vx = 0;
  player.vy = 0;
  if (!GS.transitionPhase) GS.transitionPhase = 'out';

  if (GS.transitionPhase === 'out') {
    GS.transitionAlpha += 0.08;
    if (GS.transitionAlpha >= 1) {
      GS.transitionAlpha = 1;
      const prevZone = ROOMS[GS.room]?.z;
      loadRoom(GS.transitionTarget, GS.transitionDir);
      const newZone = ROOMS[GS.room]?.z;
      if (newZone !== prevZone) {
        GS.zoneNameTimer = 90;
      }
      GS.transitionPhase = 'in';
    }
  } else if (GS.transitionPhase === 'in') {
    GS.transitionAlpha -= 0.06;
    if (GS.transitionAlpha <= 0) {
      GS.transitionAlpha = 0;
      GS.transitioning = false;
      GS.transitionTarget = null;
      GS.transitionPhase = null;
    }
  }
}

// ──── GAME LOOP ────
function update() {
  if (GS.screen !== 'play') return;
  movePlayer();
  updateBubbles();
  updateEntities();
  updateParticles();
  updateTransition();
  frameCount++;
}

function draw() {
  cx.clearRect(0, 0, W, H);

  if (GS.screen === 'play') {
    drawBG();
    drawTiles();
    drawEntities();
    drawBubbles();
    drawPlayer();
    drawRain();
    drawParticles();
    drawUI();

    // Fade overlay during room transition
    if (GS.transitioning && GS.transitionAlpha > 0) {
      cx.fillStyle = `rgba(0,0,0,${GS.transitionAlpha})`;
      cx.fillRect(0, 0, W, H);
    }
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ──── GAME INITIALIZATION ────
function startGame() {
  const ts = document.getElementById('title-screen');
  if (ts) {
    ts.classList.add('hidden');
    setTimeout(() => { ts.style.display = 'none'; }, 800);
  }
  Audio.ensure();
  GS.screen = 'play';

  // Load progress from localStorage
  try {
    const raw = localStorage.getItem('bubblebug_save') || localStorage.getItem('hf_save');
    const save = JSON.parse(raw);
    if (save) {
      GS.sparkles = save.sparkles || 0;
      GS.friends = save.friends || 0;
      GS.abilities = save.abilities || {};
      GS.collectedSparkles = save.collected || {};
      GS.befriended = save.befriended || {};
      GS.elders = save.elders || {};
      loadRoom(save.room || 'sg1');
      player.x = save.px || 64;
      player.y = save.py || 400;
      GS.zoneNameTimer = 90;
      return;
    }
  } catch (err) {}

  loadRoom('sg1');
  GS.zoneNameTimer = 120;
}

// Canvas roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.arcTo(x + w, y, x + w, y + r[1], r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
    this.lineTo(x + r[3], y + h);
    this.arcTo(x, y, x + r[3], y + h, r[3]);
    this.lineTo(x, y + r[0]);
    this.arcTo(x, y, x + r[0], y, r[0]);
    this.closePath();
  };
}

// Start listeners
const tsEl = document.getElementById('title-screen');
if (tsEl) {
  tsEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    startGame();
  }, { once: true });
}

document.addEventListener('keydown', function startOnKey() {
  if (GS.screen === 'title') {
    startGame();
    document.removeEventListener('keydown', startOnKey);
  }
});

// Launch!
resize();
setupTouch();
gameLoop();
