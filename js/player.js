// ════════════════════════════════════════════════
//  PLAYER PHYSICS & CONTROLLER
// ════════════════════════════════════════════════
const player = {
  x: 64,
  y: 400,
  vx: 0,
  vy: 0,
  w: PW,
  h: PH,
  dir: 1,           // 1=facing right, -1=facing left
  grounded: false,
  canDJump: false,
  djumpUsed: false,
  walkFrame: 0,
  walkTimer: 0,
  bubbleCooldown: 0,
  invincible: 0,
  coyoteTime: 0,
  jumpBuffer: 0,
};

let currentTiles = []; // 2D array [row][col] of chars

// ──── TILE COLLISION HELPERS ────
function isSolid(ch) { return ch === '#'; }
function isPlatform(ch) { return ch === '-'; }
function isMushroom(ch) { return ch === 'M'; }

function tileAt(px, py) {
  const c = Math.floor(px / T), r = Math.floor(py / T);
  if (r < 0 || r >= RH || c < 0 || c >= RW) return '.';
  return currentTiles[r] ? currentTiles[r][c] || '.' : '.';
}

function solidAt(px, py) { return isSolid(tileAt(px, py)); }

// Bottom-up search for safe grounded footing with clear air above
function findGroundY(col) {
  for (let r = RH - 1; r >= 1; r--) {
    const tile = currentTiles[r]?.[col];
    const above = currentTiles[r - 1]?.[col];
    if ((isSolid(tile) || isPlatform(tile) || isMushroom(tile)) && !isSolid(above)) {
      return (r - 1) * T;
    }
  }
  return (RH - 2) * T;
}

// ──── MOVEMENT & PHYSICS ENGINE ────
function movePlayer() {
  // Horizontal acceleration
  if (Input.left) {
    player.vx = -MOVE_SPD;
    player.dir = -1;
  } else if (Input.right) {
    player.vx = MOVE_SPD;
    player.dir = 1;
  } else {
    player.vx *= 0.7;
    if (Math.abs(player.vx) < 0.2) player.vx = 0;
  }

  // Walking animation
  if (Math.abs(player.vx) > 0.5 && player.grounded) {
    player.walkTimer++;
    if (player.walkTimer > 6) {
      player.walkTimer = 0;
      player.walkFrame = (player.walkFrame + 1) % 4;
    }
  } else {
    player.walkFrame = 0;
  }

  // Float ability (gentle dandelion parachute descent)
  if (GS.abilities.float && !player.grounded && Input.jump && player.vy > 0) {
    player.vy = Math.min(player.vy, 1.4);
  }

  // Gravity
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  // Coyote time (forgiving ledge jumps)
  if (player.grounded) player.coyoteTime = 10;
  else if (player.coyoteTime > 0) player.coyoteTime--;

  // Jump buffer (pre-landing jump queue)
  if (Input.jumpPressed) player.jumpBuffer = 10;
  else if (player.jumpBuffer > 0) player.jumpBuffer--;

  // Normal Jump
  if (player.jumpBuffer > 0 && player.coyoteTime > 0) {
    player.vy = JUMP_VEL;
    player.grounded = false;
    player.coyoteTime = 0;
    player.jumpBuffer = 0;
    player.djumpUsed = false;
    Audio.jump();
  }
  // Double Jump (unlocked in Mushroom Meadow)
  else if (Input.jumpPressed && !player.grounded && GS.abilities.doubleJump && !player.djumpUsed) {
    player.vy = DJUMP_VEL;
    player.djumpUsed = true;
    Audio.djump();
    emitParticles(player.x + PW / 2, player.y + PH, 10, '#74b9ff', 2.8, 22);
  }

  // Variable Jump Height: release jump early for a gentle short hop
  if (!Input.jump && player.vy < -3 && !GS.abilities.float) {
    player.vy *= 0.65;
  }

  // ──── HORIZONTAL COLLISION WITH SMART LEDGE-ASSIST ────
  const newX = player.x + player.vx;
  const top = player.y + 2, mid = player.y + PH / 2, bot = player.y + PH - 2;

  // Ledge Assist (eliminates "stubbing toe on platform ledge" for little kids)
  if (!player.grounded && player.vy >= 0) {
    if (player.vx > 0 && solidAt(newX + PW, bot) && !solidAt(newX + PW, bot - 8) && !solidAt(player.x, bot - 8)) {
      player.y -= 6;
    } else if (player.vx < 0 && solidAt(newX, bot) && !solidAt(newX, bot - 8) && !solidAt(player.x + PW, bot - 8)) {
      player.y -= 6;
    }
  }

  if (player.vx > 0) {
    if (solidAt(newX + PW, top) || solidAt(newX + PW, mid) || solidAt(newX + PW, bot)) {
      player.x = Math.floor((newX + PW) / T) * T - PW;
      player.vx = 0;
      // Wall climb (unlocked in Crystal Caves)
      if (GS.abilities.wallClimb && !player.grounded && Input.right) {
        player.vy = Math.min(player.vy, 1);
        if (Input.jumpPressed) {
          player.vy = JUMP_VEL;
          player.vx = -4.5;
          player.dir = -1;
          Audio.jump();
        }
      }
    } else {
      player.x = newX;
    }
  } else if (player.vx < 0) {
    if (solidAt(newX, top) || solidAt(newX, mid) || solidAt(newX, bot)) {
      player.x = Math.ceil(newX / T) * T;
      player.vx = 0;
      if (GS.abilities.wallClimb && !player.grounded && Input.left) {
        player.vy = Math.min(player.vy, 1);
        if (Input.jumpPressed) {
          player.vy = JUMP_VEL;
          player.vx = 4.5;
          player.dir = 1;
          Audio.jump();
        }
      }
    } else {
      player.x = newX;
    }
  }

  // ──── VERTICAL COLLISION ────
  player.grounded = false;
  const newY = player.y + player.vy;
  const left = player.x + 2, right = player.x + PW - 2, centerX = player.x + PW / 2;

  if (player.vy > 0) {
    // Falling down: check solids, one-way platforms, bouncy mushrooms
    const footY = newY + PH;
    const wasAbove = player.y + PH <= Math.floor(footY / T) * T;

    if (solidAt(left, footY) || solidAt(right, footY) || solidAt(centerX, footY)) {
      player.y = Math.floor(footY / T) * T - PH;
      player.vy = 0;
      player.grounded = true;
      player.djumpUsed = false;
    }
    // One-way cloud/wooden platforms
    else if (wasAbove && (isPlatform(tileAt(left, footY)) || isPlatform(tileAt(right, footY)) || isPlatform(tileAt(centerX, footY)))) {
      player.y = Math.floor(footY / T) * T - PH;
      player.vy = 0;
      player.grounded = true;
      player.djumpUsed = false;
    }
    // Super bouncy mushroom caps
    else if (isMushroom(tileAt(left, footY)) || isMushroom(tileAt(right, footY)) || isMushroom(tileAt(centerX, footY))) {
      player.y = Math.floor(footY / T) * T - PH;
      player.vy = -12.5; // Soars 6 tiles high!
      player.djumpUsed = false;
      Audio.bounce();
      emitParticles(player.x + PW / 2, player.y + PH, 8, '#55efc4', 3.5, 28);
    }
    else {
      player.y = newY;
    }
  } else if (player.vy < 0) {
    // Rising: check solid ceiling
    if (solidAt(left, newY) || solidAt(right, newY) || solidAt(centerX, newY)) {
      player.y = Math.ceil(newY / T) * T;
      player.vy = 0;
    } else {
      player.y = newY;
    }
  }

  // ──── ROOM TRANSITIONS ────
  const room = ROOMS[GS.room];
  if (room) {
    if (player.x + PW >= W && room.exits.r) {
      transition(room.exits.r, 'left');
    } else if (player.x <= 0 && room.exits.l) {
      transition(room.exits.l, 'right');
    } else if (player.y >= H && room.exits.d) {
      transition(room.exits.d, 'up');
    } else if (player.y <= -PH && room.exits.u) {
      transition(room.exits.u, 'down');
    }
    // Safe friendly respawn if falling off screen bottom
    else if (player.y > H + 64) {
      const sp = ROOMS[GS.room].spawn || [2, 14];
      player.x = sp[0] * T;
      player.y = sp[1] * T;
      player.vx = 0;
      player.vy = 0;
      player.invincible = 30;
      Audio.hurt();
      emitParticles(player.x + PW / 2, player.y + PH / 2, 15, '#74b9ff', 3, 30);
    }

    // Screen edge boundary clamping if no exit
    if (player.x < 0 && !room.exits.l) player.x = 0;
    if (player.x + PW > W && !room.exits.r) player.x = W - PW;
  }

  // Timers
  if (player.invincible > 0) player.invincible--;
  if (player.bubbleCooldown > 0) player.bubbleCooldown--;

  // Friendship Bubble Attack
  if (Input.attackPressed && player.bubbleCooldown <= 0) {
    shootBubble();
    player.bubbleCooldown = 14;
  }

  Input.jumpPressed = false;
  Input.attackPressed = false;
}
