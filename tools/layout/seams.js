// Every side doorway between two rooms: how high is the floor on each side?
// A step of two tiles or more is worth a look (a kid has to jump it).
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
global.window = global;
const L = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(L);
const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...h.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].forEach(m => L(m[1]));
L('js/engine/physics.js');
const BB = global.BB, W = BB.World.build(), P = BB.Physics;
const air = (x, y) => { const c = W.tile(x, y); return c !== null && !P.solidSide(c); };
const floorBelow = (x, y) => { for (let k = 0; k < 40; k++) { const c = W.tile(x, y + k); if (c === null) return null; if (P.landKind(c, { glow: true, dig: false })) return y + k; } return null; };
for (const a of W.rooms) {
  const x = a.x + a.w;                      // a's right edge; who's on the other side?
  for (let y = a.y; y < a.y + a.h; y++) {
    if (!(air(x - 1, y) && air(x, y))) continue;
    const b = W.roomAtTile(x, y);
    if (!b || b === a) continue;
    // the bottom tile of this doorway run
    if (air(x - 1, y + 1) && air(x, y + 1)) continue;
    const fa = floorBelow(x - 1, y), fb = floorBelow(x, y);
    const fa2 = floorBelow(x - 3, y), fb2 = floorBelow(x + 2, y);
    if (fa == null || fb == null) continue;
    const d = fb - fa;
    if (Math.abs(d) >= 2 || Math.abs((fb2 ?? fb) - (fa2 ?? fa)) >= 3) console.log(`${a.id} → ${b.id} at y ${y - a.y} (of ${a.id}): floor ${fa - a.y} | ${fb - b.y} of ${b.id}  step ${d > 0 ? 'down' : 'UP'} ${Math.abs(d)}  (a bit further: ${fa2 != null ? fa2 - a.y : '-'} | ${fb2 != null ? fb2 - b.y : '-'})`);
  }
}
