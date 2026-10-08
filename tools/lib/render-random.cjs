'use strict';

// Test-only: deterministic replay controls update randomness independently
// of how often a renderer emits decorative particles. The game renderer
// itself still executes; its exception must propagate and its RNG restores.
function withRenderRandom(math, random, draw) {
  const previous = math.random;
  math.random = random;
  try { return draw(); }
  finally { math.random = previous; }
}

module.exports = { withRenderRandom };
