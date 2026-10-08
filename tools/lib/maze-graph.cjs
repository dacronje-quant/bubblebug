'use strict';

// Discrete maze topology and progression only. Rendering, input timing,
// moving bees and exits' countdowns still need real scene-update checks.
const DIRECTIONS = [
  ['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1],
];
const positionKey = s => [s.x, s.y, s.mask || 0].join(',');

function pathTo(graph, key) {
  if (!graph.states.has(key)) return null;
  const keys = [], actions = [];
  for (let at = key; at != null;) {
    keys.push(at);
    const edge = graph.parents.get(at);
    if (!edge) break;
    actions.push(edge.action); at = edge.from;
  }
  keys.reverse(); actions.reverse();
  return { keys, states: keys.map(k => graph.states.get(k)), actions };
}

function analyzeGraph({ start, starts, keyOf, expand, isGoal, terminalGoals = true, maxStates = 100000 }) {
  if (typeof keyOf !== 'function' || typeof expand !== 'function' || typeof isGoal !== 'function') {
    throw new TypeError('A maze graph needs keyOf, expand and isGoal functions');
  }
  const initial = starts || (start == null ? [] : [start]);
  if (!initial.length) throw new TypeError('A maze graph needs at least one starting state');
  const graph = { states: new Map(), edges: new Map(), reverse: new Map(), parents: new Map(),
    roots: [], goalKeys: [], canComplete: new Set(), trapKeys: [] };
  const queue = [], rootSet = new Set();
  function add(state, parent) {
    const key = String(keyOf(state));
    if (!graph.states.has(key)) {
      if (graph.states.size >= maxStates) throw new Error('Maze graph state limit exceeded: ' + maxStates);
      graph.states.set(key, state); graph.edges.set(key, []); graph.reverse.set(key, []);
      graph.parents.set(key, parent); queue.push(key);
    }
    return key;
  }
  for (const state of initial) {
    const key = add(state, null);
    if (!rootSet.has(key)) { rootSet.add(key); graph.roots.push(key); }
  }
  let edgeCount = 0;
  // Finish enumerating even after finding a solution. A later branch may
  // have a trap that an early-return shortest-path search never visits.
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i], state = graph.states.get(from);
    if (isGoal(state)) {
      graph.goalKeys.push(from);
      if (terminalGoals) continue;
    }
    for (const next of expand(state)) {
      const to = String(keyOf(next.state)), edge = { from, to, action: next.action };
      add(next.state, edge);
      graph.edges.get(from).push(edge); graph.reverse.get(to).push(edge); edgeCount++;
    }
  }
  // One reverse walk proves completion is possible from every reachable
  // state in O(V + E), rather than searching forward separately per state.
  const back = [...graph.goalKeys];
  for (const key of back) graph.canComplete.add(key);
  for (let i = 0; i < back.length; i++) for (const edge of graph.reverse.get(back[i])) {
    if (!graph.canComplete.has(edge.from)) { graph.canComplete.add(edge.from); back.push(edge.from); }
  }
  for (const key of graph.states.keys()) if (!graph.canComplete.has(key)) graph.trapKeys.push(key);
  graph.solution = graph.goalKeys.length ? pathTo(graph, graph.goalKeys[0]) : null;
  graph.trapWitness = graph.trapKeys.length ? pathTo(graph, graph.trapKeys[0]) : null;
  graph.summary = { states: graph.states.size, edges: edgeCount, goals: graph.goalKeys.length,
    traps: graph.trapKeys.length, roots: graph.roots.length };
  return graph;
}

const solveGraph = modelOrGraph => (modelOrGraph.states instanceof Map ? modelOrGraph : analyzeGraph(modelOrGraph)).solution;

function happyMazeGraph(HM, def, { from = HM.find(def, 'S'), mask = 0 } = {}) {
  const goal = HM.find(def, 'K');
  return analyzeGraph({ start: { x: from.x, y: from.y, mask },
    keyOf: s => positionKey(s) + (s.automaticLoop ? ',loop,' + s.dir : ''),
    isGoal: s => !s.automaticLoop && s.x === goal.x && s.y === goal.y && s.mask === 7,
    expand(state) {
      if (state.automaticLoop) return [];
      const out = [];
      for (const [action, dx, dy] of DIRECTIONS) {
        const moved = HM.move(def, state.x, state.y, state.mask, action);
        if (!moved) continue;
        // HM.move caps a forced slide at 60 cells for its solver. The real
        // scene keeps animating: detect a wool/current cycle explicitly so
        // that artificial cap cannot turn an infinite ride into a safe stop.
        let at = { x: state.x + dx, y: state.y + dy, dir: action }, gathered = state.mask;
        const seen = new Set();
        while (at) {
          const ch = HM.at(def, at.x, at.y);
          if ('abc'.includes(ch)) gathered |= 1 << 'abc'.indexOf(ch);
          const key = [at.x, at.y, gathered, at.dir].join(',');
          if (seen.has(key)) {
            out.push({ action, state: { x: at.x, y: at.y, mask: gathered, dir: at.dir, automaticLoop: true } });
            at = null; break;
          }
          seen.add(key);
          const next = HM.next(def, at.x, at.y, gathered, at.dir);
          if (!next) {
            if (moved.x !== at.x || moved.y !== at.y || moved.mask !== gathered) {
              throw new Error(def.name + ': forced move exceeds or disagrees with the scene transition');
            }
            out.push({ action, state: { x: moved.x, y: moved.y, mask: moved.mask } });
            at = null;
          } else at = next;
        }
      }
      return out;
    },
  });
}

function cloudMazeGraph(C, { from = C.START, mask = 0, masks, skip } = {}) {
  const starts = (masks || [mask]).map(m => ({ x: from.x, y: from.y, mask: m }));
  return analyzeGraph({ starts, keyOf: positionKey,
    isGoal: s => s.x === C.MAMA.x && s.y === C.MAMA.y,
    expand(s) {
      const out = [];
      for (const [action, dx, dy] of DIRECTIONS) {
        const x = s.x + dx, y = s.y + dy;
        if (!C.walkable(x, y, s.mask) || C.potAt(x, y) === skip) continue;
        const pot = C.potAt(x, y), mask = pot ? s.mask | 1 << C.POTS.indexOf(pot) : s.mask;
        out.push({ action, state: { x, y, mask } });
      }
      return out;
    },
  });
}

function gardenMazeGraph(M, { from = M.START, mask = 0, masks, solved = false,
  legacyAccess = false, goal = solved ? 'exit' : 'rescue' } = {}) {
  const all = (1 << M.PADS.length) - 1;
  const starts = (masks || [mask]).map(m => ({ x: from.x, y: from.y, mask: m, solved }));
  return analyzeGraph({ starts,
    keyOf: s => positionKey(s) + ',' + Number(s.solved),
    // Completed gardens remain explorable. Their start/rescue doors are
    // safe destinations, not traps; an unfinished run still needs rescue.
    terminalGoals: goal !== 'exit',
    isGoal: s => goal === 'exit'
      ? s.x === M.START.x && s.y === M.START.y || s.solved && s.x === M.RESCUE_EXIT.x && s.y === M.RESCUE_EXIT.y
      : s.solved && s.x === M.PRIZE.x && s.y === M.PRIZE.y && s.mask === all,
    expand(s) {
      const pads = Object.fromEntries(M.PADS.filter((p, i) => s.mask & 1 << i).map(p => [p.key, 1]));
      const save = { pads, mazeSolved: s.solved, mazeLegacyAccess: legacyAccess }, out = [];
      for (const [action, dx, dy] of DIRECTIONS) {
        const x = s.x + dx, y = s.y + dy;
        if (!M.walkable(x, y, save)) continue;
        let mask = s.mask;
        M.PADS.forEach((p, i) => { if (x === p.x && y === p.y) mask |= 1 << i; });
        const rescued = s.solved || x === M.PRIZE.x && y === M.PRIZE.y && mask === all;
        out.push({ action, state: { x, y, mask, solved: rescued } });
      }
      return out;
    },
  });
}

function executeMaze({ BB: B, step, wait, report }) {
  const P = B.Play, key = Object.fromEntries(DIRECTIONS.map(([d]) => [d, 'Arrow' + d[0].toUpperCase() + d.slice(1)]));
  let ticks = 0, moves = 0;
  const press = keys => { step(keys); ticks++; };
  const idle = n => { wait(n); ticks += n; };
  const fail = message => { const error = new Error('Maze controller: ' + message); error.code = 'MAZE_CONTROLLER'; throw error; };
  const move = (name, action, target) => {
    const initial = P[name];
    if (!initial) fail(name + ' closed before its planned move');
    const before = [initial.x, initial.y];
    for (let retry = 0; retry < 30; retry++) {
      press([key[action]]); idle(1);
      let time = 0;
      while (P[name]?.moving && time++ < 600) idle(1);
      if (P[name]?.moving) fail(name + ' move did not settle within 600 ticks');
      const live = P[name];
      if (!live) fail(name + ' closed during its planned move');
      if (live.x !== before[0] || live.y !== before[1] || live.done) {
        if (live.x !== target.x || live.y !== target.y || target.mask != null && name === 'mini' && live.mask !== target.mask) {
          fail(name + ' diverged from planned ' + JSON.stringify(target));
        }
        moves++; return;
      }
      if (name !== 'mini') fail(name + ' planned direction was blocked');
      // The actual scene continues moving bees while the player waits.
      idle(17);
    }
    fail('friendly bee did not clear a planned move');
  };
  const walk = (name, graph, afterMove) => {
    if (!graph.solution || graph.summary.traps) fail(name + ' graph has no safe complete route: ' + JSON.stringify(graph.trapWitness));
    for (let i = 0; i < graph.solution.actions.length; i++) {
      move(name, graph.solution.actions[i], graph.solution.states[i + 1]);
      if (afterMove) afterMove();
    }
  };
  let kind;
  if (P.mini) {
    kind = 'mini';
    const m = P.mini, id = m.id;
    walk('mini', happyMazeGraph(B.HappyMaze, m.def, { from: m, mask: m.mask }));
    if (!P.mini?.done) fail('relative was not reached');
    idle(140);
    if (P.mini || !P.save.kin[id]) fail('relative celebration did not complete');
  } else if (P.cloud) {
    kind = 'cloud';
    walk('cloud', cloudMazeGraph(B.CloudMaze, { from: P.cloud, mask: P.save.cloudMask || 0 }));
    if (!P.cloud?.done || !P.save.kin.rbMama) fail('Mama was not reached');
    idle(430);
    if (P.cloud || P.save.cloudMask !== B.CloudMaze.ALL) fail('Cloud Maze celebration did not complete');
  } else if (P.maze) {
    kind = 'garden';
    const M = B.GardenMaze;
    const dismissChoice = () => {
      if (!P.maze?.choice) return;
      idle(10);
      const desired = M.CATS.indexOf('rainbow');
      for (let i = (desired - P.maze.sel + M.CATS.length) % M.CATS.length; i > 0; i--) { press(['ArrowRight']); idle(1); }
      press(['Enter']); idle(1);
      if (P.maze?.choice || P.save.cat !== 'rainbow') fail('Rainbow kitten choice did not complete');
    };
    if (!P.save.mazeSolved) {
      const mask = M.PADS.reduce((bits, p, i) => bits | (P.save.pads[p.key] ? 1 << i : 0), 0);
      walk('maze', gardenMazeGraph(M, { from: P.maze, mask, legacyAccess: !!P.save.mazeLegacyAccess }), dismissChoice);
    }
    dismissChoice();
    const routeTo = target => analyzeGraph({ start: { x: P.maze.x, y: P.maze.y }, keyOf: s => [s.x, s.y].join(','),
      isGoal: s => s.x === target.x && s.y === target.y,
      expand(s) { return DIRECTIONS.filter(([, dx, dy]) => M.walkable(s.x + dx, s.y + dy, P.save))
        .map(([action, dx, dy]) => ({ action, state: { x: s.x + dx, y: s.y + dy } })); } });
    for (let i = 0; i < M.STARS.length; i++) if (!P.save.sparkles[M.starKey(i)]) {
      const [x, y] = M.STARS[i]; walk('maze', routeTo({ x, y }), dismissChoice);
    }
    walk('maze', routeTo(M.RESCUE_EXIT), dismissChoice);
    idle(M.EXIT_HOLD + 1);
    if (P.maze || !P.save.mazeSolved || !P.save.rainbowUnlocked || !M.ready(P.save)) fail('garden rescue/exit did not complete');
  } else return null;
  const result = { kind, ticks, moves };
  if (report) (report.mazeRuns || (report.mazeRuns = [])).push(result);
  return result;
}

module.exports = { analyzeGraph, solveGraph, pathTo, DIRECTIONS, happyMazeGraph, cloudMazeGraph, gardenMazeGraph, executeMaze };
