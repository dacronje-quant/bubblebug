'use strict';
// Move a real jump edge by a few ticks without moving the character or
// changing physics. Between-tick release/repress events remain intact.
function jumpEdges(trace) {
  const result = []; let held = [], tick = 0;
  for (let i = 0; i < trace.length; i++) {
    const chunk = trace[i];
    for (const keys of chunk.eventsBefore || []) {
      if (keys.includes('Space') && !held.includes('Space')) result.push({ index: i, tick });
      held = keys;
    }
    if (chunk.keys.includes('Space') && !held.includes('Space')) result.push({ index: i, tick });
    held = chunk.keys; tick += chunk.ticks;
  }
  return result.filter((edge, i) => !i || edge.index !== result[i - 1].index);
}

function shiftJump(trace, edgeOrdinal, offset) {
  if (!Number.isInteger(offset) || offset === 0) throw new Error('Jump offset must be a nonzero integer');
  const edge = jumpEdges(trace)[edgeOrdinal];
  if (!edge || edge.index === 0) throw new Error('Jump edge has no preceding input segment');
  const changed = trace.map(c => ({ ticks: c.ticks, keys: [...c.keys], ...(c.eventsBefore ? { eventsBefore: c.eventsBefore.map(k => [...k]) } : {}) }));
  const before = changed[edge.index - 1], jump = changed[edge.index];
  if (before.ticks + offset < 1 || jump.ticks - offset < 1) throw new Error('Jump timing change would erase an input edge');
  before.ticks += offset; jump.ticks -= offset;
  return { trace: changed, variation: { kind: 'jump-timing', edgeOrdinal, tick: edge.tick, offset } };
}

module.exports = { jumpEdges, shiftJump };
