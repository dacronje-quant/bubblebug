'use strict';

// Test-only controller. Every committed tick goes through keyboard events,
// Input.poll and Main.update. Physics lookahead uses copies of the body;
// it never opens gates, grants rewards, moves the real kitten or changes tiles.
const POWERS = ['doubleJump', 'wallClimb', 'glow', 'float', 'swim', 'dig', 'spring', 'rings', 'bubbleBounce', 'wings'];
const { catalog, inspect } = require('./unlock-ledger.cjs');
const { executeMaze } = require('./maze-graph.cjs');
const { serviceGardenMenu, exerciseWardrobe } = require('./playability-menus.cjs');
const { plannerPhysics } = require('./planner-physics.cjs');
const PHYSICS_MIRRORS = new WeakMap();
const cloneBody = p => ({ ...p, lastSafe: { ...p.lastSafe } });
const bodyKey = p => [Math.round(p.x / 8), Math.round(p.y / 4), Math.round(p.vx), Math.round(p.vy), +p.grounded, +p.djUsed, +p.bbUsed, p.climbing, +p.inPortal].join(',');
const dirKeys = d => d < 0 ? ['ArrowLeft'] : d > 0 ? ['ArrowRight'] : [];

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; }
  pop() { const a = this.a, first = a[0], last = a.pop(); if (!a.length) return first; let i = 0; while (i * 2 + 1 < a.length) { let c = i * 2 + 1; if (c + 1 < a.length && a[c + 1].f < a[c].f) c++; if (a[c].f >= last.f) break; a[i] = a[c]; i = c; } a[i] = last; return first; }
}

function plansFor(ab) {
  const plans = [];
  for (const d of [-1, 1]) for (const n of [8, 24, 52]) plans.push({ kind: 'walk', d, n });
  for (const d of [0, -1, 1]) for (const h of [1, 10, 999]) {
    plans.push({ kind: 'jump', d, h, n: 180 });
    if (ab.doubleJump) for (const dj of [8, 20, 32]) plans.push({ kind: 'jump', d, h, dj, n: 220 });
  }
  if (ab.wallClimb) for (const d of [-1, 1]) plans.push({ kind: 'climb', d, n: 120 });
  if (ab.bubbleBounce) for (const d of [0, -1, 1]) for (const [dj, bb] of [[12, 28], [16, 30], [20, 45], [30, 65]]) plans.push({ kind: 'jump', d, h: 999, dj, bb, n: 300 });
  if (ab.wings) for (const d of [0, -1, 1]) for (const flaps of [4, 10]) plans.push({ kind: 'jump', d, h: 999, dj: 8, bb: 20, flap: 16, flaps, n: 420 });
  if (ab.swim) for (const d of [-1, 0, 1]) for (const n of [60, 180, 360]) plans.push({ kind: 'swim', d, n });
  return plans;
}

function planInput(plan, t, settling) {
  if (settling) return { keys: [], tap: false };
  const keys = dirKeys(plan.d);
  const tap = plan.kind === 'jump' && (t === 0 || t === plan.dj || t === plan.bb || plan.flap && t >= 36 && (t - 36) % plan.flap === 0 && (t - 36) / plan.flap < plan.flaps);
  if (plan.kind === 'swim' || plan.kind === 'jump' && (t < plan.h || plan.dj != null && t >= plan.dj)) keys.push('Space');
  return { keys, tap };
}

function blockedDescent(B, room, exit, save) {
  if (exit.kind !== 'walk' || exit.dy <= 0) return false;
  if (room.def.hatch && !(save.shortcuts || {})[room.def.hatch.id]) return true;
  for (let dy = 0; dy <= 3; dy++) {
    const ch = B.World.tile(Math.floor(exit.tx), Math.floor(exit.ty) - dy);
    if (ch === '-' || ch === ':' && save.abilities.glow) return true;
  }
  return false;
}

// A room can contain several sealed chambers joined by Fairy Rings. The
// production guide's room-level graph is deliberately optimistic; retaining
// the chamber identity prevents a bot looping through a ring into a dead end.
function regionNavigation(B) {
  let cacheKey = '', components = null;
  function refresh() {
    const key = B.World.rooms.map(r => r.version).join(',') + ':' + !!B.Play.save.abilities.dig;
    if (key === cacheKey) return;
    cacheKey = key; components = new Map();
    const air = ch => ch !== null && !['#', 'M', 'I'].includes(ch) && (ch !== 'X' || B.Play.save.abilities.dig);
    for (const r of B.World.rooms) {
      const ids = new Int32Array(r.w * r.h); ids.fill(-1); let next = 0;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const index = y * r.w + x; if (ids[index] >= 0 || !air(r.grid[y][x])) continue;
        const queue = [index]; ids[index] = next;
        for (let i = 0; i < queue.length; i++) {
          const n = queue[i], nx = n % r.w, ny = Math.floor(n / r.w);
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const xx = nx + dx, yy = ny + dy, nn = yy * r.w + xx;
            if (xx < 0 || xx >= r.w || yy < 0 || yy >= r.h || ids[nn] >= 0 || !air(r.grid[yy][xx])) continue;
            ids[nn] = next; queue.push(nn);
          }
        }
        next++;
      }
      components.set(r.id, { ids, count: next });
    }
  }
  function nodeAt(r, tx, ty) {
    const { ids } = components.get(r.id); tx = Math.floor(tx) - r.x; ty = Math.floor(ty) - r.y;
    for (const [dx, dy] of [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const x = tx + dx, y = ty + dy; if (x < 0 || x >= r.w || y < 0 || y >= r.h) continue;
      const id = ids[y * r.w + x]; if (id >= 0) return r.id + ':' + id;
    }
    return null;
  }
  const route = function firstStep(room, goalId, save) {
    refresh(); const pb = B.Play.pl.body, source = nodeAt(room, (pb.x + pb.w / 2) / 32, (pb.y + pb.h / 2) / 32);
    if (!source) return B.Wayfinder.firstStep(room, goalId, save);
    const graph = new Map();
    for (const r of B.World.rooms) {
      const exits = B.Wayfinder.exits(r, save).slice();
      if (save.abilities.rings) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        if (r.grid[y][x] < '1' || r.grid[y][x] > '9') continue;
        const twin = B.World.portalTwin(r.x + x, r.y + y), to = twin && B.World.roomAtTile(twin.tx, twin.ty);
        if (to === r) exits.push({ to: r.id, kind: 'ring', tx: r.x + x, ty: r.y + y, cost: 2 });
      }
      for (const e of exits) {
      if (blockedDescent(B, r, e, save)) continue;
      const from = nodeAt(r, e.tx, e.ty), dest = B.World.byId[e.to]; if (!from || !dest) continue;
      let target;
      if (e.kind === 'walk') target = nodeAt(dest, e.tx + e.dx, e.ty + e.dy);
      else if (e.kind === 'ring') { const twin = B.World.portalTwin(e.tx, e.ty); if (twin) target = nodeAt(dest, twin.tx, twin.ty); }
      else if (e.kind === 'flap') { const spot = B.Links.doorSpot(r.zone); target = spot && nodeAt(dest, spot.x / 32, (spot.y - 12) / 32); }
      else if (e.kind === 'door') { const spot = B.Links.flapSpot(dest.zone, B.Links.doorFlap(dest.zone, save)); target = spot && nodeAt(dest, spot.x / 32, (spot.y - 12) / 32); }
      else if (e.kind === 'lift') { const th = r.things.find(t => t.tx === e.tx && t.ty === e.ty), other = th && B.World.findThings(th.ch === 'u' ? 'v' : 'u')[0]; target = other && nodeAt(dest, other.tx, other.ty); }
      if (!target) continue; if (!graph.has(from)) graph.set(from, []); graph.get(from).push({ e, target });
      }
    }
    const q = [{ node: source, cost: 0, first: null }], best = new Map([[source, 0]]);
    while (q.length) {
      q.sort((a, b) => a.cost - b.cost); const n = q.shift();
      if (n.node.split(':')[0] === goalId) return n.first;
      for (const { e, target } of graph.get(n.node) || []) {
        const cost = n.cost + (e.cost || 1); if (best.has(target) && best.get(target) <= cost) continue;
        best.set(target, cost); q.push({ node: target, cost, first: n.first || e });
      }
    }
    return B.Wayfinder.firstStep(room, goalId, save);
  };
  route.regionAt = nodeAt;
  return route;
}

function localRoute(B, start, goal, options = {}) {
  if (goal.test(start)) return { actions: [], expansions: 0 };
  const ab = B.Play.save.abilities, plans = plansFor(ab), C = B.CFG;
  if (!PHYSICS_MIRRORS.has(B)) PHYSICS_MIRRORS.set(B, plannerPhysics(B));
  const mirror = PHYSICS_MIRRORS.get(B); mirror.sync();
  const initial = { p: cloneBody(start), cost: 0, f: goal.distance(start) / C.RUN * 1.8, prev: null, actions: null };
  const open = new Heap(), best = new Map([[bodyKey(start), 0]]); open.push(initial);
  let expansions = 0, nearest = initial, bestDistance = goal.distance(start);
  const maxNodes = options.maxNodes || 1800;
  while (open.a.length && expansions < maxNodes) {
    const node = open.pop();
    if (node.cost > (best.get(bodyKey(node.p)) || 0) + 0.01) continue;
    expansions++;
    for (const plan of plans) {
      if (plan.kind === 'swim' && !node.p.inWater) continue;
      const p = cloneBody(node.p), actions = [];
      let airborne = !p.grounded, settling = false, invalid = false;
      for (let t = 0; t < plan.n + 14; t++) {
        if (t >= plan.n) settling = true;
        const action = planInput(plan, t, settling), keys = action.keys;
        const fx = mirror.physics.step(p, { left: keys.includes('ArrowLeft'), right: keys.includes('ArrowRight'), jump: keys.includes('Space'), jumpPressed: action.tap || plan.kind === 'swim' && t === 0, bubblePressed: false }, ab, B.Settings.assists);
        actions.push(action);
        if (fx & B.FX.HAZARD || !Number.isFinite(p.x + p.y) || goal.bounds && !goal.bounds(p)) { invalid = true; break; }
        if (goal.test(p)) {
          const end = { p, cost: node.cost + actions.length, prev: node, actions };
          const route = []; for (let n = end; n.prev; n = n.prev) route.push(n.actions);
          return { actions: route.reverse().flat(), expansions, destination: cloneBody(p) };
        }
        if (!p.grounded) airborne = true;
        if (plan.kind === 'walk' && t + 1 >= plan.n) settling = true;
        if (plan.kind === 'jump' && airborne && p.grounded && t > 2) settling = true;
        if (settling && p.grounded && Math.abs(p.vx) < 0.01) break;
      }
      if (invalid || actions.length < 2) continue;
      const k = bodyKey(p), cost = node.cost + actions.length;
      if (best.has(k) && best.get(k) <= cost) continue;
      best.set(k, cost);
      const distance = goal.distance(p), next = { p, cost, f: cost + distance / C.RUN * 1.8, prev: node, actions };
      if (distance < bestDistance - 24) { nearest = next; bestDistance = distance; }
      open.push(next);
    }
  }
  // A bounded planner failure is a controller limitation, not a game lock.
  if (nearest !== initial && options.partial !== false) {
    const route = []; for (let n = nearest; n.prev; n = n.prev) route.push(n.actions);
    return { actions: route.reverse().flat(), expansions, partial: true, remaining: bestDistance };
  }
  return { actions: null, expansions, reason: 'controller-could-not-find-route' };
}

function runAdventure(game, options = {}) {
  const B = game.BB, P = B.Play;
  const expected = catalog(B);
  const firstStep = regionNavigation(B);
  const report = { status: 'running', complete: false, ticks: 0, milestones: [], trace: [], planner: { searches: 0, expansions: 0 }, failures: [], mode: options.mode || B.Settings.difficulty, seed: options.seed };
  const maxTicks = options.maxTicks || 600000;
  let held = [], currentGoal = null, goalSince = 0, loops = 0, detour = null, wardrobeChecked = false, collectionObjective = null;
  const seen = new Set();
  const milestone = (kind, id) => {
    const key = kind + ':' + id; if (seen.has(key)) return; seen.add(key);
    const event = { tick: report.ticks, kind, id, room: P.room && P.room.id };
    report.milestones.push(event); if (options.onProgress) options.onProgress(event);
  };
  const noteState = () => {
    if (!P.save || !P.room) return;
    milestone('room', P.room.id);
    for (const key of POWERS) if (P.save.abilities[key]) milestone('ability', key);
    for (const kind of ['bosses', 'family', 'gates', 'kin']) for (const [key, value] of Object.entries(P.save[kind] || {})) if (value) milestone(kind, key);
    if (P.save.finale) milestone('finale', 'home');
    if (P.save.mazeSolved) milestone('rainbow', 'rescued');
  };
  function step(keys = [], tap = false) {
    if (report.ticks >= maxTicks) throw new Error('controller-tick-budget');
    if (tap && held.includes('Space')) game.keys(keys.filter(k => k !== 'Space'));
    game.tick(1, keys); held = keys.slice(); report.ticks++;
    const last = report.trace[report.trace.length - 1], signature = keys.join('+');
    if (last && last.keys.join('+') === signature && !tap && !last.tap) last.ticks++;
    else report.trace.push({ keys: keys.slice(), ticks: 1, ...(tap ? { tap: true } : {}) });
    noteState(); if (options.onStep) options.onStep({ tick: report.ticks, BB: B, keys: keys.slice() });
    if (P.pl && !Number.isFinite(P.pl.body.x + P.pl.body.y)) throw new Error('non-finite-body');
  }
  function wait(n, keys = []) { for (let i = 0; i < n; i++) step(keys); }
  function targetGoal(th, radius = 30, foot = false) {
    const y = foot ? th.y - B.CFG.PH / 2 : th.y;
    return { id: th.type + ':' + (th.key || th.fam || th.ability), x: th.x, y,
      distance: b => Math.hypot(b.x + b.w / 2 - th.x, b.y + b.h / 2 - y),
      test: b => foot ? Math.abs(b.x + b.w / 2 - th.x) < radius && Math.abs(b.y + b.h - th.y) < 5 && b.grounded : Math.hypot(b.x + b.w / 2 - th.x, b.y + b.h / 2 - y) < radius };
  }
  function executeRoute(goal, allowShoot = false) {
    const roomBefore = P.room.id, beforeMode = P.pl.state;
    const result = localRoute(B, P.pl.body, goal, { maxNodes: options.maxNodes || 1800 });
    report.planner.searches++; report.planner.expansions += result.expansions;
    if (!result.actions) {
      if (!P.pl.body.grounded) { wait(30); return true; }
      throw new Error('controller-route-unresolved:' + P.room.id + ':' + goal.id);
    }
    if (!result.actions.length) { step([]); return true; }
    // Full-state interactions can invalidate a pure-physics prediction. Replan
    // at room seams, gifts, rescues and changed collision instead of ignoring it.
    const revision = B.World.rooms.map(r => r.version).join(',');
    for (let i = 0; i < result.actions.length; i++) {
      const action = result.actions[i], keys = action.keys.slice();
      if (allowShoot && report.ticks % 16 === 0) keys.push('KeyX');
      step(keys, action.tap);
      if (goal.test(P.pl.body)) return true;
      if (P.gift || P.traveling || P.maze || P.mini || P.cloud || P.pl.state === 'rescue' || P.pl.state === 'sad' || P.wardrobe || P.gardenChoice || P.portalChoice) break;
      if (i % 20 === 0 && B.World.rooms.map(r => r.version).join(',') !== revision) break;
    }
    return true;
  }
  function shoot(th, predicate) {
    let y = th.type === 'bell' ? th.y - 30 : th.y;
    if (th.type === 'friend' && B.Physics.solidSide(B.World.tile(Math.floor(th.x / 32), Math.floor(y / 32)))) { wait(20); return true; }
    const beam = B.Cosmetics.bubbleFor(P.save, P.pl.cat) === 'beam', shootY = beam ? 17 : 9, shootX = beam ? 20 : 14;
    const clearShot = b => {
      const d = th.x < b.x + b.w / 2 ? -1 : 1, x = b.x + b.w / 2 + d * shootX, yy = b.y + shootY, distance = Math.hypot(th.x - x, y - yy), steps = Math.max(1, Math.ceil(distance / 8));
      const stop = distance ? Math.max(0, 1 - ((th.r || 16) + 8) / distance) : 0;
      for (let i = 0; i / steps <= stop; i++) if (B.Physics.solidSide(B.World.tile(Math.floor((x + (th.x - x) * i / steps) / 32), Math.floor((yy + (y - yy) * i / steps) / 32)))) return false;
      return true;
    };
    const budFloor = th.type === 'bud' ? B.Links.spot(Math.floor(th.x / 32), Math.floor(th.y / 32)).y : null;
    const bellSpot = th.type === 'bell' || th.type === 'bud' ? { ...th, x: th.x + (P.pl.body.x + P.pl.body.w / 2 > th.x ? 44 : -44), ...(budFloor != null ? { y: budFloor } : {}) } : null;
    // A bubble starts ahead of the paw. Standing directly below a flying
    // friend can put that friend behind the new bubble, outside its homing
    // cone. Keep a little horizontal runway before taking the real shot.
    const minimumDx = th.type === 'friend' ? shootX + 25 : 0;
    const shootingGoal = bellSpot ? targetGoal(bellSpot, 12, true) : { id: 'shoot:' + (th.key || th.room), x: th.x, y,
      distance: b => Math.max(0, Math.abs(b.x + b.w / 2 - th.x) - 180) + Math.max(0, minimumDx - Math.abs(b.x + b.w / 2 - th.x)) + Math.max(0, Math.abs(b.y + shootY - y) - 55) * 2,
      test: b => Math.abs(b.x + b.w / 2 - th.x) >= minimumDx && Math.abs(b.x + b.w / 2 - th.x) < 250 && Math.abs(b.y + shootY - y) < 70 && clearShot(b) };
    if (!shootingGoal.test(P.pl.body)) {
      executeRoute(shootingGoal);
      // Moving critters can leave the planned shooting window while the
      // kitten travels. Recheck their real position before aiming the paw.
      if (th.type === 'friend') {
        const live = P.ents[th.room].bugs.find(b => b.key === th.key);
        if (live) { th.x = live.x; th.y = y = live.y; }
      }
      if (!shootingGoal.test(P.pl.body)) return true;
    }
    const dir = th.x < P.pl.body.x + P.pl.body.w / 2 ? -1 : 1;
    step(dirKeys(dir).concat('KeyX'));
    for (let i = 0; i < 80 && !predicate(); i++) {
      if (P.pl.state !== 'play' && P.pl.state !== 'bench') break;
      step(th.type !== 'bell' && i % 14 === 0 ? ['KeyX'] : []);
    }
    return true;
  }
  function solveRoom() {
    const ents = P.ents[P.room.id], things = ents.things;
    const looseKey = things.find(t => t.type === 'key' && !t.follow && !P.save.keys[t.lockKey]);
    if (looseKey) { executeRoute(targetGoal(looseKey, 25)); return true; }
    const looseBaby = things.find(t => t.type === 'baby' && !t.follow && !P.save.babies[t.key]);
    if (looseBaby) { executeRoute(targetGoal(looseBaby, 22, true)); return true; }
    if (!P.save.gates[P.room.id] && P.room.grid.some(row => row.includes('G'))) {
      const pad = things.find(t => t.type === 'pad' && !P.save.pads[t.key]);
      if (pad) { executeRoute(targetGoal(pad, 15, true)); return true; }
      const bud = things.find(t => t.type === 'bud' && !P.save.buds[t.key]);
      if (bud) { shoot(bud, () => !!P.save.buds[bud.key]); return true; }
      const baby = things.find(t => t.type === 'baby' && !t.follow && !P.save.babies[t.key]);
      if (baby) { executeRoute(targetGoal(baby, 22, true)); return true; }
      const mama = things.find(t => t.type === 'mama' && t.kids.some(k => !P.save.babies[k]));
      if (mama && P.followers.some(t => t.type === 'baby')) {
        const g = targetGoal({ ...mama, y: mama.y - 12 }, 110);
        g.test = b => b.grounded && g.distance(b) < 110;
        if (g.test(P.pl.body)) wait(55); else executeRoute(g); return true;
      }
      if (mama) {
        const missing = Object.values(P.ents).flatMap(e => e.things).find(t => t.type === 'baby' && mama.kids.includes(t.key) && !t.follow && !P.save.babies[t.key]);
        if (missing && missing.room !== P.room.id) {
          detour = { kind: 'baby', room: missing.room, key: missing.key };
          const exit = firstStep(P.room, missing.room, P.save);
          if (exit && exit.to === missing.room && exit.kind === 'walk') executeRoute(targetGoal(missing, 22, true));
          else moveToRoom(missing.room);
          return true;
        }
      }
      const key = things.find(t => t.type === 'key' && !t.follow && !P.save.keys[t.lockKey]);
      if (key) { executeRoute(targetGoal(key, 25)); return true; }
      const lock = things.find(t => t.type === 'lock' && !P.save.keys[t.key]);
      if (lock && P.followers.some(t => t.type === 'key')) {
        const g = targetGoal({ ...lock, y: lock.y - 20 }, 70); if (g.test(P.pl.body)) wait(50); else executeRoute(g); return true;
      }
      if (lock) {
        const missingKey = Object.values(P.ents).flatMap(e => e.things).find(t => t.type === 'key' && t.lockKey === lock.key && !t.follow);
        if (missingKey && missingKey.room !== P.room.id) { detour = { kind: 'key', room: missingKey.room, key: missingKey.lockKey }; moveToRoom(missingKey.room); return true; }
      }
      const stone = things.find(t => t.type === 'stone' && !P.save.songs[t.room]);
      if (stone) {
        if (stone.phase === 'listen') { const bell = things.find(t => t.type === 'bell' && t.idx === stone.seq[stone.i]); shoot(bell, () => stone.phase !== 'listen' || stone.seq[stone.i] !== bell.idx); }
        else { const g = targetGoal({ ...stone, y: stone.y - 12 }, 160); if (g.test(P.pl.body)) wait(40); else executeRoute(g); }
        return true;
      }
    }
    return false;
  }
  function fightBoss(boss) {
    // Grounded shooting preserves ordinary movement and damage. Shoot during
    // the actual sniffle window; full entity ticks decide whether it hits.
    const b = P.pl.body, target = B.Bosses.target(boss, P.ctx());
    if (boss.state === 'sniffle' || boss.state === 'wait') {
      if (target) return shoot({ ...target, room: boss.room, type: 'boss' }, () => boss.state !== 'sniffle' && boss.state !== 'wait' || !!P.save.bosses[boss.room]);
    }
    const r = P.room, safeX = boss.x > r.px + r.pw / 2 ? r.px + 100 : r.px + r.pw - 100;
    let keys = [];
    if (Math.abs(b.x + b.w / 2 - safeX) > 28) keys = dirKeys(safeX < b.x + b.w / 2 ? -1 : 1);
    if (boss.state === 'attack' && report.ticks % 50 < 25) keys.push('Space');
    if (report.ticks % 14 === 0) keys.push('KeyX');
    step(keys, keys.includes('Space') && report.ticks % 50 === 0);
    return true;
  }
  function nextObjective() {
    if (detour) {
      if (P.save.keys[detour.key] || P.save.babies[detour.key] || P.followers.some(t => t.type === 'key' && t.lockKey === detour.key || t.type === 'baby' && t.key === detour.key)) detour = null;
      else return detour;
    }
    for (const id of B.STORY) {
      const r = B.World.byId[id]; if (!r) continue;
      if (r.def.elder && !P.save.abilities[r.def.elder]) return { kind: 'elder', room: id, ability: r.def.elder };
      if (r.def.arena && !P.save.bosses[id]) return { kind: 'boss', room: id };
    }
    for (const id of B.Home.familyOrder()) if (!P.save.family[id]) { const r = B.World.rooms.find(r => r.def.family === id); return { kind: 'family', room: r.id, id }; }
    if (!P.save.finale) { const th = B.World.findThings('F')[0]; return { kind: 'finale', room: B.World.roomAtTile(th.tx, th.ty).id }; }
    if (!P.save.mazeSolved) return { kind: 'rainbow-door', room: 'nm' };
    for (const id of B.RainbowFamily.WORLD()) if (!P.save.kin[id]) {
      const th = B.World.findThings('@').find(th => th.kin === id); return { kind: 'kin', room: B.World.roomAtTile(th.tx, th.ty).id, id };
    }
    if (!P.save.kin.rbMama) return { kind: 'rainbow-door', room: 'nm' };
    if (collectionObjective) {
      const o = collectionObjective;
      const pending = o.kind === 'toy' && !P.save.toys[o.th.toy] || o.kind === 'trick' && !P.save.gestures[o.th.gid] || o.kind === 'glasses' && !P.save.glassesFound[o.th.item] || o.kind === 'bud' && !P.save.buds[o.key] || o.kind === 'pad' && !P.save.pads[o.key] || o.kind === 'flap' && (P.save.doors[o.th.zone] || 0) < o.th.idx + 1 || o.kind === 'friend' && !P.save.friends[o.key] || o.kind === 'sparkle' && !P.save.sparkles[o.key] && (options.allCollectibles || B.Save.count(P.save.sparkles) < expected.budget.maximumStarMilestone);
      if (pending) return o;
      collectionObjective = null;
    }
    const candidates = [];
    for (const [id, e] of Object.entries(P.ents)) {
      for (const th of e.things) {
        const pending = th.type === 'toy' && !P.save.toys[th.toy] || th.type === 'trick' && !P.save.gestures[th.gid] || th.type === 'glasses' && !P.save.glassesFound[th.item] || th.type === 'bud' && !P.save.buds[th.key] || th.type === 'pad' && !P.save.pads[th.key] || th.type === 'flap' && (P.save.doors[th.zone] || 0) < th.idx + 1 || th.type === 'sparkle' && (options.allCollectibles || B.Save.count(P.save.sparkles) < expected.budget.maximumStarMilestone);
        if (pending && !th.dead) candidates.push({ kind: th.type, room: id, key: th.key, th });
      }
      for (const bug of e.bugs) if (!P.save.friends[bug.key] && !bug.king) candidates.push({ kind: 'friend', room: id, key: bug.key, th: bug });
    }
    if (candidates.length) {
      const cx = P.pl.body.x + 10, cy = P.pl.body.y + 12;
      candidates.sort((a, b) => (a.room === P.room.id ? 0 : 800) + Math.hypot(a.th.x - cx, a.th.y - cy) - (b.room === P.room.id ? 0 : 800) - Math.hypot(b.th.x - cx, b.th.y - cy));
      collectionObjective = candidates[0]; return collectionObjective;
    }
    const hatchRoom = B.World.hatches.find(r => !P.save.shortcuts[r.def.hatch.id]);
    if (hatchRoom) {
      const h = hatchRoom.def.hatch, y = (hatchRoom.y + h.row) * 32, x = (hatchRoom.x + (h.approachLeft + h.approachRight + 1) / 2) * 32;
      const below = B.World.roomAtPx(x, y + 128);
      return { kind: 'shortcut', room: below.id, key: h.id, th: { x, y, hatchRoom, h } };
    }
    if (expected.namespaces.residents.some(k => !P.save.residents[k])) return { kind: 'garden-friends', room: 'ng' };
    if (!P.save.purchases['heart-fountain'] || !P.save.gestures.twirl) return { kind: 'garden-fountain', room: 'hm' };
    if (!wardrobeChecked) return { kind: 'wardrobe', room: 'hm' };
    return null;
  }
  function moveToRoom(id) {
    let exit = firstStep(P.room, id, P.save);
    if (!exit) return false;
    if (exit.kind === 'ring') {
      const twin = B.World.portalTwin(exit.tx, exit.ty);
      const goal = { id: 'ring:' + exit.tx + ',' + exit.ty, x: (exit.tx + 0.5) * 32, y: (exit.ty + 0.5) * 32,
        distance: b => Math.hypot(b.x + b.w / 2 - (exit.tx + 0.5) * 32, b.y + b.h / 2 - (exit.ty + 0.5) * 32),
        test: b => Math.abs(b.x + b.w / 2 - (twin.tx + 0.5) * 32) < 42 && Math.abs(b.y + b.h / 2 - (twin.ty * 32 + 20)) < 42 };
      return executeRoute(goal);
    }
    if (exit.kind !== 'walk') {
      const spot = B.Links.spot(exit.tx, exit.ty), g = targetGoal({ type: exit.kind, key: id, ...spot }, exit.kind === 'ring' ? 18 : 8, true);
      if (P.linkLock && Math.hypot(P.linkLock.x - spot.x, P.linkLock.y - spot.y) < 4) {
        wait(25, dirKeys(P.pl.body.x > P.room.px + P.room.pw - 120 ? -1 : 1)); wait(4); return true;
      }
      if (g.test(P.pl.body)) wait(B.Links.HOLD + B.CFG.IRIS_TIME + 5); else return executeRoute(g);
      return true;
    }
    const body = P.pl.body;
    const openings = B.Wayfinder.exits(P.room, P.save).filter(e => e.kind === 'walk' && e.to === exit.to && e.dx === exit.dx && e.dy === exit.dy && !blockedDescent(B, P.room, e, P.save));
    const contact = e => e.dx ? Math.max(Math.min(e.y0, e.y1), Math.min(Math.max(e.y0, e.y1), (body.y + body.h / 2) / 32 - 0.5)) : Math.max(Math.min(e.x0, e.x1), Math.min(Math.max(e.x0, e.x1), (body.x + body.w / 2) / 32 - 0.5));
    const coordinate = e => (contact(e) + 0.5) * 32;
    openings.sort((a, b) => Math.abs(coordinate(a) - (a.dx ? body.y + body.h / 2 : body.x + body.w / 2)) - Math.abs(coordinate(b) - (b.dx ? body.y + body.h / 2 : body.x + body.w / 2)));
    if (openings.length) exit = { ...openings[0], ...(exit.dx ? { ty: contact(openings[0]) } : { tx: contact(openings[0]) }) };
    const dest = B.World.byId[exit.to], r = P.room;
    const arrivalRegion = firstStep.regionAt(dest, exit.tx + exit.dx, exit.ty + exit.dy);
    const tx = exit.dx ? (exit.dx > 0 ? dest.px + 18 : dest.px + dest.pw - 18) : (exit.tx + 0.5) * 32;
    const ty = exit.dy ? (exit.dy > 0 ? dest.py + 20 : dest.py + dest.ph - 20) : (exit.ty + 0.5) * 32 - 12;
    const bounds = b => b.x > Math.min(r.px, dest.px) - 1024 && b.x < Math.max(r.px + r.pw, dest.px + dest.pw) + 1024 && b.y > Math.min(r.py, dest.py) - 512 && b.y < Math.max(r.py + r.ph, dest.py + dest.ph) + 512;
    // The upper room may have an open bottom and no floor at the seam.
    // Aim the search at real landing terraces in its arrival chamber.
    const landings = [];
    if (exit.dy < 0) for (let row = 1; row < dest.h; row++) {
      let left = null;
      for (let col = 0; col <= dest.w; col++) {
        const valid = col < dest.w && B.Physics.landKind(dest.grid[row][col], P.save.abilities) && !B.Physics.solidSide(dest.grid[row - 1][col]) && firstStep.regionAt(dest, dest.x + col, dest.y + row - 1) === arrivalRegion;
        if (valid && left == null) left = col;
        if (!valid && left != null) { landings.push({ x0: (dest.x + left + .5) * 32, x1: (dest.x + col - .5) * 32, y: (dest.y + row) * 32 }); left = null; }
      }
    }
    const goal = { id: 'room:' + exit.to, x: tx, y: ty, bounds,
      distance: b => landings.length ? Math.min(...landings.map(s => Math.hypot(b.x + b.w / 2 - Math.max(s.x0, Math.min(s.x1, b.x + b.w / 2)), b.y + b.h - s.y))) : Math.hypot(b.x + b.w / 2 - tx, b.y + b.h / 2 - ty),
      test: b => b.x + b.w / 2 >= dest.px && b.x + b.w / 2 < dest.px + dest.pw && b.y + b.h / 2 >= dest.py && b.y + b.h / 2 < dest.py + dest.ph && firstStep.regionAt(dest, (b.x + b.w / 2) / 32, (b.y + b.h / 2) / 32) === arrivalRegion && (exit.dy < 0 ? b.grounded && Math.abs(b.vy) < .01 && (!landings.length || landings.some(s => Math.abs(b.y + b.h - s.y) < 2 && b.x + b.w / 2 > s.x0 - 26 && b.x + b.w / 2 < s.x1 + 26)) : Math.abs(b.x + b.w / 2 - tx) < 80 && Math.abs(b.y + b.h / 2 - ty) < 80) };
    return executeRoute(goal, true);
  }

  try {
    if (B.Main.name !== 'play') {
      // Start through the ordinary title and selection scenes.
      wait(35); step(['Enter']); wait(35); step(['Enter']); wait(80);
    }
    for (; report.ticks < maxTicks; loops++) {
      if (P.intro) { wait(80, ['ArrowRight']); continue; }
      if (P.gift) { wait(40); continue; }
      if (P.traveling || P.pl.state === 'rescue' || P.pl.state === 'sad') { wait(20); continue; }
      if (P.wardrobe) {
        if (currentGoal === 'wardrobe:hm') { report.wardrobe = exerciseWardrobe({ BB: B, tick: wait }); wardrobeChecked = true; }
        else { step(['Escape']); wait(2); } continue;
      }
      if (P.gardenChoice) {
        if (currentGoal && currentGoal.startsWith('garden-')) {
          report.gardenMenus = report.gardenMenus || []; report.gardenMenus.push(serviceGardenMenu({ BB: B, tick: wait }));
        } else { step(['Escape']); wait(2); } continue;
      }
      if (P.portalChoice) {
        if (currentGoal === 'rainbow-door:nm') { wait(12); step(['Enter']); step([]); }
        else { step(['Escape']); wait(2); } continue;
      }
      if (B.Main.name === 'pause') { step(['Escape']); wait(2); continue; }
      if (P.maze || P.cloud || P.mini) {
        (options.solveMaze || executeMaze)({ BB: B, step, wait, report }); continue;
      }
      if (P.pl.state === 'bench') { step(['KeyX']); wait(3); continue; }
      const objective = nextObjective();
      if (!objective) { report.ledger = inspect(B, expected, { requireAllCollectibles: !!options.allCollectibles }); report.complete = report.ledger.complete; report.status = report.complete ? 'all-unlocks-earned' : 'controller-unlock-ledger-incomplete'; break; }
      const goalId = objective.kind + ':' + objective.room + (objective.key ? ':' + objective.key : '');
      if (goalId !== currentGoal) { currentGoal = goalId; goalSince = report.ticks; if (options.onProgress) options.onProgress({ kind: 'objective', id: goalId, tick: report.ticks, room: P.room.id }); }
      if (report.ticks - goalSince > (options.maxGoalTicks || 14000)) throw new Error('controller-objective-timeout:' + goalId);
      if (solveRoom()) continue;
      const boss = P.ents[P.room.id].bosses.find(b => !P.save.bosses[b.room]);
      if (boss) { fightBoss(boss); continue; }
      if (objective.kind === 'shortcut') {
        const { x, y, hatchRoom, h } = objective.th, body = P.pl.body;
        // The hatch is earned by an ascent from underneath. Its closed
        // one-way floor means a kitten already in the garden must take
        // the ordinary Mushroom route round to the lower tower first.
        if (P.room.id !== objective.room || body.y + body.h <= y) { if (!moveToRoom(objective.room)) throw new Error('controller-shortcut-approach:' + objective.key); }
        else executeRoute({ id: 'shortcut:' + objective.key, x, y: y - 32,
          distance: b => Math.hypot(b.x + b.w / 2 - x, b.y + b.h - (y - 1)),
          test: b => b.y + b.h <= y && b.vy < 0 && b.x >= (hatchRoom.x + h.approachLeft) * 32 && b.x + b.w <= (hatchRoom.x + h.approachRight + 1) * 32 });
        continue;
      }
      if (P.room.id !== objective.room) {
        if (objective.kind === 'baby') {
          const child = P.ents[objective.room].things.find(t => t.type === 'baby' && t.key === objective.key);
          const exit = firstStep(P.room, objective.room, P.save);
          if (child && exit && exit.to === objective.room && exit.kind === 'walk') { executeRoute(targetGoal(child, 22, true)); continue; }
        }
        if (!moveToRoom(objective.room)) throw new Error('controller-route-unresolved:' + P.room.id + '->' + objective.room);
        continue;
      }
      if (objective.kind === 'rainbow-door') {
        const spot = B.RainbowJourney.spot('rainbow'), goal = targetGoal({ ...spot, type: 'rainbow-door' }, 8, true);
        if (goal.test(P.pl.body)) wait(B.Links.HOLD + 12); else executeRoute(goal);
        continue;
      }
      if (objective.kind.startsWith('garden-') || objective.kind === 'wardrobe') {
        const spot = objective.kind === 'wardrobe' ? { x: (P.room.x + B.Home.MIRROR_COL) * 32, y: (P.room.y + 32) * 32 } : P.gardenSpot(P.room);
        const goal = targetGoal({ ...spot, type: objective.kind }, 8, true);
        if (goal.test(P.pl.body)) wait(B.Links.HOLD + 12); else executeRoute(goal);
        continue;
      }
      if (objective.kind === 'friend' || objective.kind === 'bud') {
        if (objective.kind === 'friend' && objective.th.state === 'bubbled') { wait(55); continue; }
        shoot({ ...objective.th, type: objective.kind }, () => !!(objective.kind === 'friend' ? P.save.friends[objective.key] : P.save.buds[objective.key]));
        continue;
      }
      if (objective.kind === 'flap') { executeRoute(targetGoal(objective.th, 60, true)); continue; }
      const th = objective.th || P.ents[P.room.id].things.find(t => t.type === objective.kind && (!objective.id || t.kin === objective.id || t.fam === objective.id));
      if (!th) throw new Error('controller-missing-target:' + goalId);
      if (!executeRoute(targetGoal(th, objective.kind === 'family' || objective.kind === 'kin' ? 95 : objective.kind === 'toy' ? 24 : 20, objective.kind === 'pad'))) throw new Error('controller-target-unresolved:' + goalId);
    }
    if (!report.complete) report.status = 'controller-tick-budget';
  } catch (error) {
    report.status = error.message; report.failures.push({ kind: 'controller-incomplete', message: error.message, objective: currentGoal, tick: report.ticks, room: P.room && P.room.id, body: P.pl && cloneBody(P.pl.body) });
  }
  game.keys([]);
  report.earned = P.save ? { abilities: { ...P.save.abilities }, bosses: Object.keys(P.save.bosses), family: Object.keys(P.save.family), kin: Object.keys(P.save.kin || {}), finale: !!P.save.finale, mazeSolved: !!P.save.mazeSolved } : {};
  report.lastState = { room: P.room && P.room.id, body: P.pl && cloneBody(P.pl.body), objective: currentGoal };
  return report;
}

module.exports = { runAdventure, localRoute, plansFor, planInput, POWERS };
