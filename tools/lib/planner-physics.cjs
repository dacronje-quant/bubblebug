'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
// Compile the unchanged production physics in Node's own realm for cheap
// lookahead. Committed gameplay still uses the original complete VM runtime.
// This avoids sandbox global lookup overhead on millions of speculative ticks.
function plannerPhysics(B) {
  const local = { BB: {} };
  const load = file => vm.compileFunction(fs.readFileSync(path.join(ROOT, file), 'utf8'), ['window'], { filename: file })(local);
  load('js/core/bb.js');
  local.BB.CFG = { ...B.CFG };
  load('js/world/world.js');
  load('js/engine/physics.js');
  function sync() {
    const target = local.BB.World, source = B.World;
    target.bounds = { ...source.bounds }; target.gw = source.gw; target.gh = source.gh;
    // Physics only reads tiles. Share the current grid so real gate/hatch
    // transitions immediately affect lookahead; never write it in the planner.
    target.flat = source.flat; target.portals = source.portals;
    target.rooms = source.rooms; target.byId = source.byId; target.buckets = source.buckets; target._last = null;
    Object.assign(local.BB.CFG, B.CFG);
    return local.BB.Physics;
  }
  sync();
  return { sync, physics: local.BB.Physics, FX: local.BB.FX };
}
module.exports = { plannerPhysics };
