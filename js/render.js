// ════════════════════════════════════════════════
//  RENDER ENGINE (Canvas & Visuals)
// ════════════════════════════════════════════════
const canvas = document.getElementById('c');
const cx = canvas.getContext('2d');
let W = RW * T, H = RH * T;
let frameCount = 0;

// Resize canvas while preserving aspect ratio
function resize() {
  const aspect = W / H;
  let cw = window.innerWidth, ch = window.innerHeight;
  if (isMobile) ch -= 140;
  if (cw / ch > aspect) { cw = ch * aspect; } else { ch = cw / aspect; }
  canvas.style.width = Math.floor(cw) + 'px';
  canvas.style.height = Math.floor(ch) + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = ((window.innerWidth - cw) / 2) + 'px';
  canvas.style.top = isMobile ? '0' : ((window.innerHeight - ch) / 2) + 'px';
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener('resize', resize);

// ──── BACKGROUND RENDERING ────
function drawBG() {
  const zone = ZONES[ROOMS[GS.room]?.z || 0];
  const grad = cx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, zone.sky[0]);
  grad.addColorStop(1, zone.sky[1]);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, W, H);

  // Parallax ambient scenic elements
  const z = ROOMS[GS.room]?.z || 0;
  cx.globalAlpha = 0.15;
  if (z === 0) {
    // Gardens - rolling green hills
    cx.fillStyle = '#4a9c5e';
    cx.beginPath();
    cx.moveTo(0, H);
    for (let x = 0; x <= W; x += 60) {
      cx.lineTo(x, H - 80 + Math.sin(x * 0.015 + 1) * 30);
    }
    cx.lineTo(W, H);
    cx.fill();
  } else if (z === 1) {
    // Meadow - background mushroom silhouettes
    cx.fillStyle = '#a074b6';
    for (let i = 0; i < 3; i++) {
      const mx = 100 + i * 300, my = H - 120;
      cx.beginPath();
      cx.ellipse(mx, my, 40, 30, 0, Math.PI, 0);
      cx.rect(mx - 8, my, 16, 60);
      cx.fill();
    }
  } else if (z === 2) {
    // Caves - glowing crystal stalactites
    cx.fillStyle = '#3a5aae';
    for (let i = 0; i < 8; i++) {
      const cx2 = 50 + i * 120, cy2 = 20 + Math.sin(i * 1.5) * 30;
      drawCrystal(cx2, cy2, 15 + i * 3, 40 + i * 5);
    }
  } else if (z === 5) {
    // Clouds - drifting cloud puffs
    cx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const cx2 = (80 + i * 200 + frameCount * 0.1) % (W + 100) - 50;
      cx.beginPath();
      cx.ellipse(cx2, 60 + i * 50, 60, 25, 0, 0, Math.PI * 2);
      cx.ellipse(cx2 + 30, 50 + i * 50, 40, 20, 0, 0, Math.PI * 2);
      cx.fill();
    }
  }
  cx.globalAlpha = 1;
}

function drawCrystal(x, y, w, h) {
  cx.beginPath();
  cx.moveTo(x, y + h);
  cx.lineTo(x - w / 2, y + h);
  cx.lineTo(x, y);
  cx.lineTo(x + w / 2, y + h);
  cx.fill();
}

// ──── TILE RENDERING ────
function drawTiles() {
  const zone = ZONES[ROOMS[GS.room]?.z || 0];
  for (let r = 0; r < RH; r++) {
    for (let c = 0; c < RW; c++) {
      const ch = currentTiles[r][c];
      const x = c * T, y = r * T;
      if (ch === '#') {
        cx.fillStyle = zone.tileFill;
        cx.fillRect(x, y, T, T);
        cx.strokeStyle = zone.tileStroke;
        cx.lineWidth = 1;
        cx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
        if (r === 0 || currentTiles[r - 1][c] !== '#') {
          cx.fillStyle = zone.platformFill;
          cx.fillRect(x, y, T, 4);
        }
      } else if (ch === '-') {
        cx.fillStyle = zone.platformFill;
        cx.fillRect(x + 2, y, T - 4, 6);
        cx.strokeStyle = zone.platformStroke;
        cx.lineWidth = 1;
        cx.strokeRect(x + 2, y, T - 4, 6);
      } else if (ch === 'M') {
        // Bouncy mushroom
        cx.fillStyle = '#e74c3c';
        cx.beginPath();
        cx.ellipse(x + T / 2, y + 8, T / 2, 10, 0, Math.PI, 0);
        cx.fill();
        cx.fillStyle = '#d4a76a';
        cx.fillRect(x + T / 2 - 4, y + 8, 8, T - 8);
        cx.fillStyle = '#fff';
        cx.beginPath();
        cx.arc(x + T / 2 - 4, y + 4, 3, 0, Math.PI * 2);
        cx.arc(x + T / 2 + 5, y + 6, 2, 0, Math.PI * 2);
        cx.fill();
      }
    }
  }
}

// ──── PLAYER RENDERING (LITTLE BUBBLE KNIGHT) ────
function drawPlayer() {
  const px = Math.round(player.x), py = Math.round(player.y);
  const dir = player.dir;

  if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) return;

  cx.save();
  cx.translate(px + PW / 2, py + PH / 2);
  if (dir < 0) cx.scale(-1, 1);

  // Cloak & body
  cx.fillStyle = '#f5f6fa';
  cx.strokeStyle = '#4a5568';
  cx.lineWidth = 2;

  // Body
  cx.beginPath();
  cx.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();

  // Cloak hem
  const legOff = player.grounded ? Math.sin(player.walkFrame * Math.PI / 2) * 2 : 0;
  cx.beginPath();
  cx.moveTo(-9, 4);
  cx.lineTo(-7 + legOff, 13);
  cx.lineTo(0, 11);
  cx.lineTo(7 - legOff, 13);
  cx.lineTo(9, 4);
  cx.fill();
  cx.stroke();

  // Cute mask head
  cx.fillStyle = '#f5f6fa';
  cx.beginPath();
  cx.ellipse(0, -6, 8, 7, 0, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();

  // Horns
  cx.fillStyle = '#f5f6fa';
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.moveTo(-3, -11);
  cx.lineTo(-6, -22);
  cx.lineTo(0, -12);
  cx.fill();
  cx.stroke();

  cx.beginPath();
  cx.moveTo(3, -11);
  cx.lineTo(6, -22);
  cx.lineTo(0, -12);
  cx.fill();
  cx.stroke();

  // Glowing eyes
  cx.fillStyle = '#1e272e';
  cx.beginPath();
  cx.ellipse(-3, -5, 2.5, 3, 0, 0, Math.PI * 2);
  cx.fill();
  cx.beginPath();
  cx.ellipse(4, -5, 2.5, 3, 0, 0, Math.PI * 2);
  cx.fill();

  // Eye highlights
  cx.fillStyle = '#fff';
  cx.beginPath();
  cx.arc(-2, -6, 1, 0, Math.PI * 2);
  cx.arc(5, -6, 1, 0, Math.PI * 2);
  cx.fill();

  cx.restore();

  // Glow aura (when Glow ability unlocked)
  if (GS.abilities.glow) {
    cx.save();
    cx.globalAlpha = 0.09 + Math.sin(frameCount * 0.05) * 0.03;
    cx.fillStyle = '#ffeaa7';
    cx.beginPath();
    cx.arc(px + PW / 2, py + PH / 2, 54, 0, Math.PI * 2);
    cx.fill();
    cx.globalAlpha = 1;
    cx.restore();
  }
}

// ──── ENTITIES RENDERING ────
function drawEntities() {
  for (const e of entities) {
    if (e.type === 'sparkle') {
      const by = Math.sin(e.bob) * 4;
      cx.save();
      cx.translate(e.x, e.y + by);
      cx.fillStyle = '#ffd700';
      cx.strokeStyle = '#f39c12';
      cx.lineWidth = 1.5;
      cx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * Math.PI / 180;
        cx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
        cx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
      }
      cx.closePath();
      cx.fill();
      cx.stroke();
      cx.globalAlpha = 0.5 + Math.sin(frameCount * 0.15 + e.bob) * 0.3;
      cx.fillStyle = '#fff';
      cx.beginPath();
      cx.arc(0, 0, 2, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      cx.restore();
    }
    else if (e.type === 'grumpy') {
      drawCreature(e.x, e.y, e.variant, false, e.hitTimer > 0, e.hp, e.maxHp, e.boss);
    }
    else if (e.type === 'happy_bug') {
      drawCreature(e.x, e.y, e.variant, true, false, 0, 0, false);
      if (e.newTimer && e.newTimer > 0) {
        cx.fillStyle = '#fd79a8';
        cx.font = '14px serif';
        cx.textAlign = 'center';
        const ho = Math.sin(frameCount * 0.1) * 3;
        cx.fillText('❤️', e.x, e.y - 22 + ho);
      }
    }
    else if (e.type === 'elder') {
      cx.save();
      cx.globalAlpha = 0.2 + Math.sin(frameCount * 0.05) * 0.1;
      cx.fillStyle = '#ffeaa7';
      cx.beginPath();
      cx.arc(e.x, e.y, 30, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      cx.font = '28px serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(e.emoji, e.x, e.y + Math.sin(frameCount * 0.04) * 3);
      cx.fillStyle = 'rgba(255,255,255,.85)';
      cx.beginPath();
      cx.ellipse(e.x + 16, e.y - 24, 12, 10, 0, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = '#333';
      cx.font = 'bold 12px sans-serif';
      cx.fillText('🫧', e.x + 16, e.y - 24);
      cx.restore();
    }
    else if (e.type === 'happy_elder') {
      cx.font = '28px serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(e.emoji, e.x, e.y + Math.sin(frameCount * 0.04) * 3);
      cx.fillStyle = '#fd79a8';
      cx.font = '14px serif';
      cx.fillText('💕', e.x, e.y - 22 + Math.sin(frameCount * 0.08) * 3);
    }
    else if (e.type === 'bench') {
      cx.fillStyle = '#d4a76a';
      cx.fillRect(e.x - 14, e.y - 2, 28, 6);
      cx.fillRect(e.x - 10, e.y + 4, 4, 10);
      cx.fillRect(e.x + 6, e.y + 4, 4, 10);
      cx.fillStyle = '#c8a96e';
      cx.fillRect(e.x - 14, e.y - 4, 28, 3);
      if (e.saved) {
        cx.fillStyle = '#ffeaa7';
        cx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
        cx.font = '10px serif';
        cx.textAlign = 'center';
        cx.fillText('💾', e.x, e.y - 14);
        cx.globalAlpha = 1;
      }
    }
    else if (e.type === 'arrow') {
      cx.globalAlpha = 0.45 + Math.sin(frameCount * 0.08) * 0.25;
      cx.fillStyle = '#fff';
      cx.font = '22px sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      const bounce = Math.sin(frameCount * 0.1) * 4;
      if (e.dir === 'right') cx.fillText('➡️', e.x + bounce, e.y);
      else if (e.dir === 'left') cx.fillText('⬅️', e.x - bounce, e.y);
      else if (e.dir === 'up') cx.fillText('⬆️', e.x, e.y - bounce);
      cx.globalAlpha = 1;
    }
    else if (e.type === 'flower') {
      cx.font = '16px serif';
      cx.textAlign = 'center';
      cx.fillText(['🌸', '🌼', '🌺', '🌻'][Math.floor(e.x / 40) % 4], e.x, e.y);
    }
    else if (e.type === 'mushroom_bg') {
      cx.font = '18px serif';
      cx.textAlign = 'center';
      cx.fillText('🍄', e.x, e.y);
    }
    else if (e.type === 'crystal') {
      cx.font = '16px serif';
      cx.textAlign = 'center';
      const glow = 0.6 + Math.sin(frameCount * 0.06 + e.x * 0.01) * 0.3;
      cx.globalAlpha = glow;
      cx.fillText('💎', e.x, e.y);
      cx.globalAlpha = 1;
    }
    else if (e.type === 'honey_drip') {
      cx.fillStyle = '#daa520';
      cx.globalAlpha = 0.4;
      const dripY = (frameCount * 1.5 + e.x) % H;
      cx.beginPath();
      cx.ellipse(e.x, dripY, 3, 8, 0, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
    }
    else if (e.type === 'cloud_bg') {
      cx.fillStyle = 'rgba(255,255,255,.25)';
      cx.beginPath();
      cx.ellipse(e.x, e.y, 50, 20, 0, 0, Math.PI * 2);
      cx.ellipse(e.x + 25, e.y - 8, 30, 15, 0, 0, Math.PI * 2);
      cx.fill();
    }
  }
}

// ──── CREATURE SPRITE RENDERING ────
function drawCreature(x, y, variant, happy, hit, hp, maxHp, boss) {
  cx.save();
  cx.translate(x, y);
  const sz = boss ? 1.8 : 1;
  cx.scale(sz, sz);
  const shake = hit ? Math.sin(frameCount * 2) * 3 : 0;
  cx.translate(shake, 0);

  if (variant < 10) {
    const colors = ['#74b9ff', '#dda0dd', '#4a69bd', '#daa520', '#6c7a89', '#e8e8e8'];
    cx.fillStyle = happy ? '#55efc4' : colors[variant % colors.length];
    cx.strokeStyle = '#333';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(-5, -3, 4, 0, Math.PI * 2);
    cx.arc(5, -3, 4, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#111';
    cx.beginPath();
    cx.arc(-4, -2, 2, 0, Math.PI * 2);
    cx.arc(6, -2, 2, 0, Math.PI * 2);
    cx.fill();

    if (happy) {
      cx.strokeStyle = '#111';
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.arc(0, 2, 4, 0, Math.PI);
      cx.stroke();
    } else {
      cx.strokeStyle = '#111';
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.arc(0, 6, 4, Math.PI, 0);
      cx.stroke();
      cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(-8, -7); cx.lineTo(-3, -5);
      cx.moveTo(8, -7); cx.lineTo(3, -5);
      cx.stroke();
    }

    cx.strokeStyle = '#555';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(-4, -10); cx.lineTo(-6, -16);
    cx.moveTo(4, -10); cx.lineTo(6, -16);
    cx.stroke();
    cx.fillStyle = variant < 10 ? '#fd79a8' : '#ffeaa7';
    cx.beginPath();
    cx.arc(-6, -16, 2, 0, Math.PI * 2);
    cx.arc(6, -16, 2, 0, Math.PI * 2);
    cx.fill();
  }
  else if (variant === 10) {
    // Caterpillar
    cx.fillStyle = happy ? '#55efc4' : '#6ab04c';
    cx.strokeStyle = '#333';
    cx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      cx.beginPath();
      const segY = Math.sin((frameCount * 0.1 + i) * 1) * 2;
      cx.ellipse(-12 + i * 8, segY, 6, 5, 0, 0, Math.PI * 2);
      cx.fill();
      cx.stroke();
    }
    cx.fillStyle = '#fff';
    cx.beginPath(); cx.arc(13, -3, 3, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(19, -3, 3, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#111';
    cx.beginPath(); cx.arc(14, -2, 1.5, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(20, -2, 1.5, 0, Math.PI * 2); cx.fill();
    if (happy) {
      cx.strokeStyle = '#111'; cx.lineWidth = 1;
      cx.beginPath(); cx.arc(16, 2, 3, 0, Math.PI); cx.stroke();
    } else {
      cx.strokeStyle = '#111'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(16, 5, 3, Math.PI, 0); cx.stroke();
    }
  }
  else if (variant === 20) {
    // Bee
    cx.fillStyle = happy ? '#ffeaa7' : '#f39c12';
    cx.strokeStyle = '#333';
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2); cx.fill(); cx.stroke();
    cx.fillStyle = '#2d3436';
    cx.fillRect(-4, -8, 3, 16);
    cx.fillRect(3, -7, 3, 14);
    cx.fillStyle = 'rgba(200,230,255,.5)';
    cx.strokeStyle = 'rgba(100,180,255,.6)';
    const wingFlap = Math.sin(frameCount * 0.4) * 8;
    cx.beginPath(); cx.ellipse(-4, -12 + wingFlap, 8, 5, -0.3, 0, Math.PI * 2); cx.fill(); cx.stroke();
    cx.beginPath(); cx.ellipse(4, -12 - wingFlap, 8, 5, 0.3, 0, Math.PI * 2); cx.fill(); cx.stroke();
    cx.fillStyle = '#fff';
    cx.beginPath(); cx.arc(-4, -2, 3, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(4, -2, 3, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#111';
    cx.beginPath(); cx.arc(-3, -1, 1.5, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(5, -1, 1.5, 0, Math.PI * 2); cx.fill();
    if (happy) {
      cx.strokeStyle = '#111'; cx.lineWidth = 1;
      cx.beginPath(); cx.arc(0, 3, 3, 0, Math.PI); cx.stroke();
    } else {
      cx.strokeStyle = '#111'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(0, 6, 3, Math.PI, 0); cx.stroke();
      cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(-7, -6); cx.lineTo(-2, -4); cx.moveTo(7, -6); cx.lineTo(2, -4); cx.stroke();
    }
  }
  else if (variant === 30) {
    // Spider
    cx.fillStyle = happy ? '#b2bec3' : '#636e72';
    cx.strokeStyle = '#333';
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(0, 0, 10, 0, Math.PI * 2); cx.fill(); cx.stroke();
    cx.strokeStyle = happy ? '#b2bec3' : '#636e72';
    cx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 2) {
      for (let j = 0; j < 3; j++) {
        const legAngle = (j - 1) * 0.4 + Math.sin(frameCount * 0.1 + j) * 0.1;
        cx.beginPath();
        cx.moveTo(i * 10, -2 + j * 4);
        cx.lineTo(i * 20, -8 + j * 6 + legAngle * 5);
        cx.stroke();
      }
    }
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(-4, -4, 3, 0, Math.PI * 2); cx.arc(4, -4, 3, 0, Math.PI * 2);
    cx.arc(-3, 2, 2, 0, Math.PI * 2); cx.arc(3, 2, 2, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = happy ? '#e74c3c' : '#111';
    cx.beginPath();
    cx.arc(-3, -3, 1.5, 0, Math.PI * 2); cx.arc(5, -3, 1.5, 0, Math.PI * 2);
    cx.fill();
    if (happy) {
      cx.strokeStyle = '#111'; cx.lineWidth = 1;
      cx.beginPath(); cx.arc(0, 4, 3, 0, Math.PI); cx.stroke();
    }
    cx.strokeStyle = 'rgba(200,200,200,.3)';
    cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(0, -10); cx.lineTo(0, -40); cx.stroke();
  }
  else if (variant === 50) {
    // Cloud King (Friendly Boss)
    cx.fillStyle = happy ? '#fff' : '#dfe6e9';
    cx.strokeStyle = '#b2bec3';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    cx.fill(); cx.stroke();
    cx.beginPath();
    cx.ellipse(-10, -6, 8, 6, 0, 0, Math.PI * 2);
    cx.ellipse(10, -6, 8, 6, 0, 0, Math.PI * 2);
    cx.fill(); cx.stroke();
    cx.fillStyle = '#ffd700';
    cx.beginPath();
    cx.moveTo(-8, -14); cx.lineTo(-10, -22); cx.lineTo(-4, -18);
    cx.lineTo(0, -24); cx.lineTo(4, -18); cx.lineTo(10, -22);
    cx.lineTo(8, -14);
    cx.fill();
    cx.strokeStyle = '#f39c12'; cx.stroke();
    cx.fillStyle = '#fff';
    cx.beginPath(); cx.arc(-5, -2, 4, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(5, -2, 4, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#111';
    cx.beginPath(); cx.arc(-4, -1, 2, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(6, -1, 2, 0, Math.PI * 2); cx.fill();
    if (happy) {
      cx.fillStyle = '#fd79a8';
      cx.beginPath(); cx.arc(-12, 3, 3, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(12, 3, 3, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#111'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(0, 5, 5, 0, Math.PI); cx.stroke();
    } else {
      cx.strokeStyle = '#111'; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(0, 8, 4, Math.PI, 0); cx.stroke();
      cx.beginPath(); cx.moveTo(-9, -7); cx.lineTo(-3, -5); cx.moveTo(9, -7); cx.lineTo(3, -5); cx.stroke();
    }
  }

  // HP friendship bubbles needed
  if (!happy && maxHp > 0) {
    const bx = 0, by = -24 - (boss ? 10 : 0);
    for (let i = 0; i < maxHp; i++) {
      const bxx = bx + (i - (maxHp - 1) / 2) * 8;
      cx.fillStyle = i < hp ? 'rgba(200,200,200,.5)' : 'rgba(100,200,255,.75)';
      cx.strokeStyle = i < hp ? 'rgba(150,150,150,.5)' : 'rgba(60,160,255,.8)';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.arc(bxx, by, 3, 0, Math.PI * 2);
      cx.fill();
      cx.stroke();
    }
  }

  cx.restore();
}

// ──── BUBBLE RENDERING ────
function drawBubbles() {
  for (const b of bubbles) {
    cx.save();
    cx.translate(b.x, b.y);
    const grad = cx.createRadialGradient(-2, -2, 1, 0, 0, b.size);
    grad.addColorStop(0, 'rgba(200,230,255,.65)');
    grad.addColorStop(0.5, 'rgba(120,200,255,.35)');
    grad.addColorStop(1, 'rgba(100,180,255,.12)');
    cx.fillStyle = grad;
    cx.beginPath();
    cx.arc(0, 0, b.size, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.7)';
    cx.beginPath();
    cx.arc(-b.size * 0.3, -b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
    cx.fill();
    cx.strokeStyle = 'rgba(100,180,255,.45)';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.arc(0, 0, b.size, 0, Math.PI * 2);
    cx.stroke();
    cx.restore();
  }
}

// ──── RAIN RENDERING ────
function drawRain() {
  if (GS.raindrops.length === 0) return;
  cx.strokeStyle = 'rgba(150,200,255,.32)';
  cx.lineWidth = 1;
  for (const r of GS.raindrops) {
    cx.beginPath();
    cx.moveTo(r.x, r.y);
    cx.lineTo(r.x - 1, r.y + r.len);
    cx.stroke();
    r.y += r.speed;
    if (r.y > H) {
      r.y = -r.len;
      r.x = Math.random() * W;
    }
  }
}

// ──── HEADS-UP DISPLAY (UI) ────
function drawUI() {
  // Sparkle counter
  cx.fillStyle = 'rgba(0,0,0,.38)';
  cx.beginPath();
  cx.roundRect(10, 10, 84, 30, 10);
  cx.fill();
  cx.font = 'bold 16px sans-serif';
  cx.textAlign = 'left';
  cx.textBaseline = 'middle';
  cx.fillStyle = '#ffd700';
  cx.fillText('✨ ' + GS.sparkles, 20, 25);

  // Friend counter
  cx.fillStyle = 'rgba(0,0,0,.38)';
  cx.beginPath();
  cx.roundRect(102, 10, 84, 30, 10);
  cx.fill();
  cx.fillStyle = '#fd79a8';
  cx.fillText('❤️ ' + GS.friends, 112, 25);

  // Ability unlock icons
  const abilities = [
    { key: 'doubleJump', icon: '🦋', color: '#74b9ff' },
    { key: 'wallClimb', icon: '🐌', color: '#55efc4' },
    { key: 'glow', icon: '🪲', color: '#ffeaa7' },
    { key: 'float', icon: '🌸', color: '#fd79a8' },
  ];
  let ax = 10;
  for (const a of abilities) {
    if (GS.abilities[a.key]) {
      cx.fillStyle = 'rgba(0,0,0,.38)';
      cx.beginPath();
      cx.roundRect(ax, H - 40, 32, 32, 8);
      cx.fill();
      cx.font = '18px serif';
      cx.textAlign = 'center';
      cx.fillText(a.icon, ax + 16, H - 24);
      ax += 38;
    }
  }

  // Ability unlock banner
  if (GS.showUnlock > 0) {
    cx.save();
    const alpha = Math.min(1, GS.showUnlock / 30, (180 - GS.showUnlock + 30) / 30);
    cx.globalAlpha = alpha;
    cx.fillStyle = 'rgba(0,0,0,.65)';
    cx.beginPath();
    cx.roundRect(W / 2 - 110, H / 2 - 55, 220, 90, 20);
    cx.fill();
    cx.fillStyle = '#fff';
    cx.font = 'bold 18px sans-serif';
    cx.textAlign = 'center';
    cx.fillText('New Ability!', W / 2, H / 2 - 25);
    cx.font = '38px serif';
    cx.fillText(GS.unlockEmoji, W / 2, H / 2 + 18);
    cx.globalAlpha = 1;
    cx.restore();
  }

  // Grand Celebration Banner
  if (GS.celebrationTimer > 0) {
    cx.save();
    cx.fillStyle = 'rgba(255,255,255,.08)';
    cx.fillRect(0, 0, W, H);
    cx.font = 'bold 28px sans-serif';
    cx.textAlign = 'center';
    cx.fillStyle = '#ffd700';
    cx.fillText('🎉 You made every friend! 🎉', W / 2, H / 2 - 20);
    cx.font = '20px sans-serif';
    cx.fillStyle = '#fff';
    cx.fillText('✨ ' + GS.sparkles + ' sparkles  ❤️ ' + GS.friends + ' friends', W / 2, H / 2 + 20);
    cx.restore();
  }

  // Zone banner when entering new biome
  if (GS.zoneNameTimer && GS.zoneNameTimer > 0) {
    GS.zoneNameTimer--;
    cx.save();
    cx.globalAlpha = Math.min(1, GS.zoneNameTimer / 20);
    cx.fillStyle = 'rgba(0,0,0,.5)';
    cx.beginPath();
    cx.roundRect(W / 2 - 120, 50, 240, 36, 12);
    cx.fill();
    cx.fillStyle = '#fff';
    cx.font = 'bold 16px sans-serif';
    cx.textAlign = 'center';
    const zone = ZONES[ROOMS[GS.room]?.z || 0];
    cx.fillText(zone.ambient + ' ' + zone.name, W / 2, 72);
    cx.globalAlpha = 1;
    cx.restore();
  }
}
