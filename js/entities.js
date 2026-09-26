// ════════════════════════════════════════════════
//  ENTITIES & BUBBLE FRIENDSHIP SYSTEM
// ════════════════════════════════════════════════
let entities = []; // [{type, x, y, ...extra}]
let bubbles = [];  // [{x, y, vx, vy, life, size}]

// ──── SHOOT FRIENDSHIP BUBBLE ────
function shootBubble() {
  Audio.bubble();
  bubbles.push({
    x: player.x + PW / 2 + player.dir * 12,
    y: player.y + PH / 2 - 4,
    vx: player.dir * BUBBLE_SPD,
    vy: -0.5,
    life: BUBBLE_LIFE,
    size: 8
  });
  emitParticles(player.x + PW / 2 + player.dir * 14, player.y + PH / 2, 4, '#74b9ff', 1.8, 12);
}

// ──── UPDATE BUBBLES ────
function updateBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.x += b.vx;
    b.y += b.vy;
    b.vy -= 0.01; // gentle upward buoyancy
    b.size = 8 + Math.sin(b.life * 0.2) * 2;
    b.life--;

    // Check hit on grumpy creatures
    for (let j = entities.length - 1; j >= 0; j--) {
      const e = entities[j];
      if (e.type !== 'grumpy') continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        e.hp--;
        e.hitTimer = 15;
        Audio.boop();
        emitParticles(e.x, e.y, 8, '#ffeaa7', 3, 25);
        bubbles.splice(i, 1);

        if (e.hp <= 0) {
          // Befriended! Transforms into a happy friend with hearts!
          GS.befriended[e.key] = true;
          GS.friends++;
          Audio.befriend();
          emitParticles(e.x, e.y, 22, '#fd79a8', 5, 40);
          emitParticles(e.x, e.y, 16, '#ffeaa7', 4, 35);
          entities[j] = { type: 'happy_bug', x: e.x, y: e.y, variant: e.variant, newTimer: 60 };
        }
        break;
      }
    }

    // Check hit on elder bugs (bestow unique kingdom abilities)
    for (const e of entities) {
      if (e.type !== 'elder') continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        GS.abilities[e.ability] = true;
        GS.elders[e.ability] = true;
        Audio.unlock();
        emitParticles(e.x, e.y, 35, '#ffeaa7', 6, 50);
        emitParticles(e.x, e.y, 25, '#fd79a8', 5, 45);
        GS.showUnlock = 180;
        GS.unlockEmoji = e.emoji;
        GS.unlockText = e.giveText;
        e.type = 'happy_elder';
        bubbles.splice(i, 1);
        break;
      }
    }

    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20) {
      bubbles.splice(i, 1);
    }
  }
}

// ──── UPDATE ENTITIES IN ROOM ────
function updateEntities() {
  for (const e of entities) {
    if (e.type === 'sparkle') {
      e.bob += 0.05;
      // Collection check
      const dx = (player.x + PW / 2) - e.x, dy = (player.y + PH / 2) - e.y;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) {
        GS.collectedSparkles[e.key] = true;
        GS.sparkles++;
        GS.totalSparkles++;
        Audio.sparkle();
        emitParticles(e.x, e.y, 7, '#ffeaa7', 2.2, 20);
        e.type = 'dead';
      }
    }
    else if (e.type === 'grumpy') {
      if (e.hitTimer > 0) e.hitTimer--;
      // Gentle patrol
      e.moveTimer++;
      if (e.moveTimer > 80) {
        e.moveDir *= -1;
        e.moveTimer = 0;
      }
      const spd = e.boss ? 1 : 0.6;
      e.x += e.moveDir * spd;
      if (Math.abs(e.x - e.origX) > 80) {
        e.moveDir *= -1;
      }

      // Friendly non-violent bump: touching a grumpy bug gently bounces player back
      const dx = (player.x + PW / 2) - e.x, dy = (player.y + PH / 2) - e.y;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22 && player.invincible <= 0) {
        player.vx = dx > 0 ? 5 : -5;
        player.vy = -5.5;
        player.invincible = 30;
        Audio.hurt();
        emitParticles(player.x + PW / 2, player.y + PH / 2, 6, '#ffeaa7', 2, 15);
      }
    }
    else if (e.type === 'happy_bug') {
      if (e.newTimer && e.newTimer > 0) e.newTimer--;
    }
    else if (e.type === 'celebration_trigger') {
      if (!e.triggered) {
        const dx = (player.x + PW / 2) - e.x, dy = (player.y + PH / 2) - e.y;
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
          e.triggered = true;
          GS.celebrationTimer = 300;
          Audio.unlock();
          for (let i = 0; i < 60; i++) {
            emitParticles(Math.random() * W, Math.random() * H / 2, 3,
              ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#fd79a8'][Math.floor(Math.random() * 6)], 4.5, 65);
          }
        }
      }
    }
    else if (e.type === 'bench') {
      // Auto-save when resting at a cozy garden bench
      const dx = (player.x + PW / 2) - e.x, dy = (player.y + PH / 2) - e.y;
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26 && !e.saved) {
        e.saved = true;
        emitParticles(e.x, e.y - 8, 10, '#ffeaa7', 2.5, 35);
        try {
          const saveData = JSON.stringify({
            room: GS.room,
            sparkles: GS.sparkles,
            friends: GS.friends,
            abilities: GS.abilities,
            collected: GS.collectedSparkles,
            befriended: GS.befriended,
            elders: GS.elders,
            px: player.x,
            py: player.y
          });
          localStorage.setItem('bubblebug_save', saveData);
          localStorage.setItem('hf_save', saveData); // backwards compatibility
        } catch (err) {}
      }
    }
  }

  // Filter collected sparkles
  entities = entities.filter(e => e.type !== 'dead');

  // Celebration confetti loop
  if (GS.celebrationTimer > 0) {
    GS.celebrationTimer--;
    if (GS.celebrationTimer % 18 === 0) {
      emitParticles(Math.random() * W, 0, 6,
        ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#fd79a8'][Math.floor(Math.random() * 6)], 3.5, 45);
    }
  }

  // Ability unlock presentation timer
  if (GS.showUnlock > 0) GS.showUnlock--;
}
