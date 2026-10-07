// Picture-only elder lessons. The strip separates taps, continuous holds,
// and releases, and follows the same learned-power order as physics.js.
(function (BB) {
  'use strict';
  const G = BB.G, HUD = BB.HUD, BEAT = 78, TAIL = 36, W = 840, H = 442;
  const paper = '#fffaf0', ink = '#594374', green = '#5fd48a', purple = '#9a8fc8';

  function lesson(ability, abilities = {}) {
    const powers = { ...abilities, [ability]: true };
    const base = powers.spring ? 'spring' : 'jump';
    const air = [base];
    if (powers.doubleJump) air.push('doubleJump');
    if (powers.bubbleBounce) air.push('bubbleBounce');
    const spec = {
      ability, powers, mode: 'tap', prefix: [], repeat: false,
      steps: [base, 'doubleJump', 'land'], actions: ['jump', 'jump', null],
    };
    if (ability === 'bubbleBounce') {
      spec.steps = air;
      spec.actions = air.map(() => 'jump');
      if (air.length === 2) { spec.steps = [...air, 'land']; spec.actions.push(null); }
    } else if (ability === 'wings') {
      spec.prefix = air;
      spec.steps = ['wings', 'wings', 'wings'];
      spec.actions = ['jump', 'jump', 'jump']; spec.repeat = true;
    } else if (ability === 'spring') {
      spec.steps = ['spring', 'peak', 'land']; spec.actions = ['jump', null, null];
    } else if (ability === 'float') {
      spec.mode = 'hold'; spec.steps = ['rise', 'float', 'float']; spec.actions = ['jump'];
    } else if (ability === 'swim') {
      spec.mode = 'release'; spec.steps = ['swim', 'swim', 'sink']; spec.actions = ['jump'];
    } else if (ability === 'wallClimb') {
      spec.mode = 'wall'; spec.steps = ['approach', 'climb', 'kick']; spec.actions = ['right', 'jump'];
    } else if (['glow', 'dig', 'rings'].includes(ability)) {
      spec.mode = 'hold'; spec.steps = [ability, ability, ability]; spec.actions = ['right'];
    }
    spec.duration = (spec.prefix.length + spec.steps.length) * BEAT + TAIL;
    return spec;
  }

  function frame(spec, elapsed) {
    const t = Math.max(0, elapsed) % spec.duration, beat = Math.floor(t / BEAT);
    const prefix = beat < spec.prefix.length;
    const step = prefix ? -1 : Math.min(spec.steps.length - 1, beat - spec.prefix.length);
    const tail = t >= (spec.prefix.length + spec.steps.length) * BEAT;
    const tap = t % BEAT < 12 && !tail;
    let action = null, down = false;
    if (!prefix && !tail) {
      if (spec.mode === 'tap') { action = spec.actions[step]; down = !!action && tap; }
      else if (spec.mode === 'release') { action = step < 2 ? 'jump' : null; down = step < 2; }
      else if (spec.mode === 'wall') { action = step < 2 ? 'right' : 'jump'; down = step < 2 || tap; }
      else { action = spec.actions[0]; down = true; }
    }
    return { step, prefix: prefix ? beat : -1, action, down, tail, phase: (t % BEAT) / BEAT };
  }

  function layout() {
    const view = G.view, ratio = view.w ? G.W / view.w : 1;
    const safe = G.safeArea || {};
    const left = Math.max(18, ((safe.left || 0) - (view.x || 0)) * ratio + 12);
    const right = Math.min(G.W - 18, ((window.innerWidth || G.W) - (safe.right || 0) - (view.x || 0)) * ratio - 12);
    let top = Math.max(18, ((safe.top || 0) - (view.y || 0)) * ratio + 12);
    const bandW = Math.min(W, right - left), bandX = (left + right - bandW) / 2;
    for (const id of ['map-btn', 'pause-btn']) {
      const rect = document.getElementById(id)?.getBoundingClientRect?.();
      if (!rect || !rect.height) continue;
      const rx = (rect.left - view.x) * ratio, rr = (rect.right - view.x) * ratio;
      if (rr > bandX && rx < bandX + bandW) top = Math.max(top, (rect.bottom - view.y) * ratio + 12);
    }
    let bottom = G.H - 18;
    if (BB.Input.touchEnabled && G.touchPadTop > 0 && view.h) {
      bottom = Math.min(bottom, (G.touchPadTop - view.y) * G.H / view.h - 18);
    }
    const scale = Math.min(1, Math.max(0.1, (right - left) / W), Math.max(0.1, (bottom - top) / H));
    const x = (left + right - W * scale) / 2, y = (top + bottom - H * scale) / 2;
    const button = (bx, by) => ({ x: x + bx * scale, y: y + by * scale,
      r: Math.max(28 * scale, 22 * ratio) });
    return { x, y, w: W * scale, h: H * scale, scale,
      replay: button(58, 52), next: button(W - 58, H - 37) };
  }

  function hit(point, target) { return Math.hypot(point.x - target.x, point.y - target.y) <= target.r; }
  function box(c, x, y, w, h, r, fill) { c.fillStyle = fill; G.rrect(x, y, w, h, r, c); c.fill(); }
  function lineArrow(c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = '#a18bb6';
    c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(3, -6); c.lineTo(9, 0); c.lineTo(3, 6); c.stroke(); c.restore();
  }

  function finger(c, x, y, down, lifted = false) {
    c.save(); c.translate(x, y + (down ? -7 : lifted ? 10 : 2)); c.rotate(-0.12);
    c.fillStyle = paper; c.strokeStyle = ink; c.lineWidth = 2.8; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-7, 13); c.lineTo(-10, 6); c.quadraticCurveTo(-12, 1, -7, 1);
    c.lineTo(-3, 5); c.lineTo(-3, -15); c.quadraticCurveTo(-3, -21, 2, -21);
    c.quadraticCurveTo(6, -21, 6, -15); c.lineTo(6, -2);
    c.quadraticCurveTo(9, -6, 12, -2); c.quadraticCurveTo(16, -4, 18, 0);
    c.quadraticCurveTo(23, -1, 23, 5); c.lineTo(22, 15);
    c.quadraticCurveTo(20, 23, 12, 23); c.lineTo(4, 23); c.quadraticCurveTo(-2, 23, -7, 13); c.fill(); c.stroke();
    if (lifted) { c.beginPath(); c.moveTo(30, -9); c.lineTo(30, -24); c.moveTo(24, -18); c.lineTo(30, -24); c.lineTo(36, -18); c.stroke(); }
    c.restore();
  }

  function button(c, action, x, y, active, down, device) {
    c.save(); c.translate(x, y + (down ? 3 : 0));
    const color = action === 'right' ? purple : green;
    if (device === 'keyboard') {
      box(c, -42, -28, 84, 55, 9, '#e5dced');
      for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) box(c, -35 + col * 10, -21 + row * 9, 7, 6, 1, '#a08cb1');
      if (action === 'jump') box(c, -22, 11, 44, 10, 2, color);
      else { box(c, 13, 11, 9, 10, 2, color); box(c, -9, 11, 9, 10, 2, '#a08cb1'); box(c, 2, 11, 9, 10, 2, '#a08cb1'); }
    } else if (device === 'gamepad') {
      box(c, -40, -24, 80, 48, 17, '#a08cb1');
      box(c, -28, -3, 21, 6, 1, paper); box(c, -20, -11, 6, 22, 1, paper);
      for (const [dx, dy] of [[21, -11], [31, -1], [21, 9], [11, -1]]) { c.fillStyle = dx === 21 && dy === 9 && action === 'jump' ? color : '#dacdea'; G.circle(dx, dy, 5, c); c.fill(); }
      if (action === 'right') box(c, -13, -3, 7, 6, 1, color);
    } else {
      c.fillStyle = color; c.strokeStyle = '#fff'; c.lineWidth = 3;
      G.circle(0, 0, 27, c); c.fill(); c.stroke(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 4;
      c.beginPath();
      if (action === 'jump') { c.moveTo(-13, 7); c.lineTo(0, -7); c.lineTo(13, 7); c.moveTo(-10, 16); c.lineTo(10, 16); }
      else { c.moveTo(-7, -14); c.lineTo(8, 0); c.lineTo(-7, 14); }
      c.stroke();
    }
    if (active) finger(c, device === 'touch' ? 0 : -6, 35, down);
    c.restore();
  }

  function fairyRing(c, x, y) {
    c.strokeStyle = '#da7ba7'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 25, 7, 0, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, px = x + Math.cos(a) * 25, py = y + Math.sin(a) * 7;
      box(c, px - 2, py - 7, 4, 7, 1, '#e5cdb6'); c.fillStyle = '#ef91b4'; c.beginPath(); c.ellipse(px, py - 7, 6, 4, 0, Math.PI, 0); c.fill(); }
  }

  // Canonical miniature stage; uses the actual selected kitten and game art.
  function scene(c, spec, i, cat, tick, state) {
    const skill = spec.ability, effect = spec.steps[i], gy = 213;
    let x = 95, y = gy, face = 1, pose = { mode: 'air', t: tick, vy: -3 };
    box(c, 0, 0, 190, 238, 16, '#f3eef8');
    if (skill !== 'glow') box(c, 8, gy, 174, 9, 5, '#d8ebc4');
    if (skill === 'doubleJump' || skill === 'bubbleBounce') {
      y = skill === 'doubleJump' ? [178, 130, 213][i] : [185, 152, 119][i];
      if (effect === 'land') { y = gy; pose = { mode: 'stand', happy: true, t: tick }; }
      if (effect === 'doubleJump') HUD.abilityIcon(c, effect, x - 39, y - 80, 1.3);
      if (effect === 'bubbleBounce') G.bubble(x, y + 16, 21, '#9fe8ff', 1, c);
      if (effect === 'spring') HUD.abilityIcon(c, 'spring', x - 38, gy - 8, 1.1);
    } else if (skill === 'float') {
      y = [112, 153, 189][i]; pose.mode = i === 0 ? 'air' : 'float';
      if (i) for (const d of [-1, 1]) { c.strokeStyle = '#a1b980'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + d * 22, y - 60); c.lineTo(x + d * 30, y - 83); c.stroke(); HUD.abilityIcon(c, 'float', x + d * 30, y - 87, 0.8); }
    } else if (skill === 'swim') {
      box(c, 8, 57, 174, 157, 7, '#a9dce7'); c.strokeStyle = '#58aec6'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(8, 57); for (let q = 8; q < 170; q += 22) c.quadraticCurveTo(q + 11, 48, q + 22, 57); c.stroke();
      y = [189, 143, 189][i]; pose.mode = 'run'; pose.phase = tick * 0.08;
    } else if (skill === 'wallClimb') {
      box(c, 137, 59, 31, 155, 7, '#9baacc'); x = [82, 122, 74][i]; y = [213, 145, 114][i];
      pose.mode = ['run', 'climb', 'air'][i]; pose.phase = tick * 0.12; if (i === 2) face = -1;
    } else if (skill === 'glow') {
      x = [43, 98, 151][i]; pose.mode = 'run'; pose.phase = tick * 0.1;
      box(c, 8, gy, 44, 9, 4, '#d8ebc4'); box(c, 166, gy, 16, 9, 4, '#d8ebc4');
      box(c, 53, gy + 14, 111, 11, 3, '#e8b057');
      for (let j = 0; j < 3; j++) { const px = 70 + j * 34, open = j <= i;
        if (open) box(c, px - 17, gy - 3, 34, 7, 3, '#ffdea5');
        for (const d of [-1, 0, 1]) { c.save(); c.translate(px, gy - 3); c.rotate(open ? d * 0.85 : 0); c.fillStyle = open ? '#ffdea5' : '#ebbfd4'; G.ellipse(0, -8, open ? 6 : 3, 10, 0, c); c.fill(); c.restore(); }
      }
      G.drawGlow(x, y - 28, 44, '#fff3b0', 0.22, c);
    } else if (skill === 'dig') {
      x = [70, 102, 145][i]; pose.mode = 'run'; pose.phase = tick * 0.1;
      for (let j = i; j < 3; j++) { const bx = 108 + j * 21; box(c, bx, 109, 19, 104, 4, '#e5b279');
        c.strokeStyle = '#987450'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + 6, 111); c.lineTo(bx + 12, 135); c.lineTo(bx + 5, 169); c.lineTo(bx + 11, 210); c.stroke(); }
      if (i) { c.fillStyle = '#b48b64'; for (let j = 0; j < 6; j++) c.fillRect(94 + j * 12, 195 - j % 3 * 17, 5, 5); }
    } else if (skill === 'rings') {
      fairyRing(c, 59, 212); fairyRing(c, 142, 212); x = [54, 59, 142][i]; pose.mode = i === 1 ? 'stand' : 'run'; pose.phase = tick * 0.1;
    } else if (skill === 'spring') {
      y = [185, 107, 213][i]; if (i === 2) pose = { mode: 'stand', happy: true, t: tick };
      if (i === 0) HUD.abilityIcon(c, 'spring', 95, 212, 1.4);
    } else if (skill === 'wings') {
      y = [180, 148, 115][i];
      for (const d of [-1, 1]) { c.fillStyle = '#ffe1a1'; c.strokeStyle = '#b68a43'; c.lineWidth = 1.5; G.star(x + d * 32, y - 40, 17, 5, 0.45, -Math.PI / 2 + (state.step === i ? Math.sin(tick * 0.2) * 0.15 : 0), c); c.fill(); c.stroke(); }
    }
    if (state.step === i && !state.tail && pose.mode === 'air') y -= Math.sin(state.phase * Math.PI) * 5;
    c.fillStyle = '#77946435'; G.ellipse(x, 216, 22, 4, 0, c); c.fill();
    BB.Kittens.draw(c, cat, pose, x, y, 2.7, face);
    if (skill === 'swim') G.bubble(x + 17, y - 55, 30, '#bff4ff', 0.75, c);
  }

  function draw(c, ability, t, cat, alpha, abilities = BB.Play && BB.Play.save ? BB.Play.save.abilities : {}) {
    if (alpha <= 0) return;
    const spec = lesson(ability, abilities), state = frame(spec, t), bounds = layout();
    c.save(); c.globalAlpha = Math.min(1, alpha); c.translate(bounds.x, bounds.y); c.scale(bounds.scale, bounds.scale);
    box(c, 0, 0, W, H, 30, paper); c.strokeStyle = '#efc768'; c.lineWidth = 4; G.rrect(0, 0, W, H, 30, c); c.stroke();
    c.fillStyle = '#f8e7b8'; G.circle(W / 2, 49, 35, c); c.fill(); HUD.abilityIcon(c, ability, W / 2, 49, 2.5);
    box(c, 35, 29, 46, 46, 23, '#eee6f7'); c.fillStyle = ink; c.beginPath(); c.moveTo(52, 41); c.lineTo(52, 63); c.lineTo(69, 52); c.closePath(); c.fill();

    // Wings start only after all the learned preceding jumps have fired.
    if (spec.prefix.length) {
      const start = W / 2 - (spec.prefix.length - 1) * 69;
      spec.prefix.forEach((effect, i) => {
        const px = start + i * 138;
        button(c, 'jump', px - 18, 105, false, state.prefix === i && state.phase < 0.16, BB.Input.device);
        if (effect !== 'jump') HUD.abilityIcon(c, effect, px + 36, 105, 0.8);
        if (i < spec.prefix.length - 1) lineArrow(c, px + 62, 105, 0.7);
        if (state.prefix === i) finger(c, px - 18, 125, state.phase < 0.16);
      });
    }
    const sceneY = spec.prefix.length ? 150 : 101, sceneH = spec.prefix.length ? 188 : 222;
    const gap = 26, panelW = (W - 64 - gap * 2) / 3, scale = Math.min(panelW / 190, sceneH / 238);
    for (let i = 0; i < 3; i++) {
      const px = 32 + i * (panelW + gap);
      box(c, px, sceneY, panelW, sceneH, 18, '#f3eef8');
      c.save(); c.beginPath(); G.rrect(px, sceneY, panelW, sceneH, 18, c); c.clip();
      c.translate(px + (panelW - 190 * scale) / 2, sceneY + (sceneH - 238 * scale) / 2); c.scale(scale, scale);
      scene(c, spec, i, cat, state.step === i ? t : 0, state); c.restore();
      if (state.step === i && !state.tail) { c.strokeStyle = ink; c.lineWidth = 3; G.rrect(px, sceneY, panelW, sceneH, 18, c); c.stroke(); }
      if (i < 2) lineArrow(c, px + panelW + gap / 2, sceneY + sceneH / 2, 0.8);
    }

    const centers = Array.from({ length: 3 }, (_, i) => 32 + panelW / 2 + i * (panelW + gap));
    const by = 368, device = BB.Input.device;
    if (spec.mode === 'tap') spec.actions.forEach((action, i) => {
      if (action) button(c, action, centers[i], by, state.step === i && !state.tail, state.step === i && state.down, device);
      else { c.fillStyle = '#cbbadd'; G.ellipse(centers[i] - 4, by - 5, 3, 5, -0.2, c); c.fill(); G.ellipse(centers[i] + 5, by + 4, 3, 5, 0.2, c); c.fill(); }
    });
    else {
      const holdX = spec.mode === 'hold' ? centers[1] : (centers[0] + centers[1]) / 2;
      c.strokeStyle = '#cbbadd'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
      c.moveTo(centers[0] - 34, by); c.lineTo(holdX - 50, by); c.moveTo(holdX + 50, by); c.lineTo(spec.mode === 'hold' ? centers[2] + 34 : centers[1] + 34, by); c.stroke();
      button(c, spec.actions[0], holdX, by, state.action === spec.actions[0], state.down && state.action === spec.actions[0], device);
      if (spec.mode === 'wall') button(c, 'jump', centers[2], by, state.step === 2 && !state.tail, state.step === 2 && state.down, device);
      if (spec.mode === 'release') finger(c, centers[2], by + 2, false, true);
    }
    if (spec.repeat) { c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.arc(centers[2] + 42, by - 26, 10, 0.2, 5.5); c.stroke(); c.beginPath(); c.moveTo(centers[2] + 45, by - 39); c.lineTo(centers[2] + 49, by - 31); c.lineTo(centers[2] + 55, by - 37); c.stroke(); }
    box(c, W - 81, H - 60, 46, 46, 23, t >= spec.duration ? '#d3efdb' : '#eee6f7'); lineArrow(c, W - 58, H - 37, 0.9);
    c.restore();
  }

  BB.SkillPrompts = { lesson, frame, layout, hit, draw, BEAT };
  HUD.drawAbilityCard = draw;
})(window.BB);
