// Cells (plan grid: x = -315 + 15c, y = 17r - 102) taken by rooms in a trial layout
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
global.window = global;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
['js/core/bb.js', 'js/core/config.js', 'js/world/zones.js', 'js/world/world.js'].forEach(load);
const D = []; BB.room = d => D.push(d);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/src="(js\/world\/rooms\/[^"]+)"/g)].forEach(m => load(m[1]));
function cells(lay, only) {
  const out = {};
  const all = D.map(d => ({ id: d.id, x: d.x, y: d.y, w: d.map[0].length, h: d.map.length, zone: d.zone }));
  for (const [id, t] of Object.entries(lay)) if (!all.some(d => d.id === id)) all.push({ id, ...t });
  for (const d of all) {
    const t = lay[d.id];
    if (only && !t && !(d.zone === 12 || ['nm', 'ng', 'np', 'nr'].includes(d.id))) continue;
    const x = t ? t.x : d.x, y = t ? t.y : d.y;
    const c0 = Math.round((x + 315) / 15), r0 = Math.round((y + 102) / 17);
    for (let i = 0; i < Math.round(d.w / 15); i++) for (let j = 0; j < Math.round(d.h / 17); j++) out[(c0 + i) + ',' + (r0 + j)] = d.id;
  }
  return out;
}
module.exports = { cells, D };
if (require.main === module) {
  const lay = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const g = cells(lay, true);
  const ks = Object.keys(g).map(k => k.split(',').map(Number));
  const c0 = Math.min(...ks.map(a => a[0])), c1 = Math.max(...ks.map(a => a[0]));
  console.log('cols', c0, c1);
  for (let r = -1; r <= 10; r++) { let s = ''; for (let c = c0; c <= c1; c++) s += (g[c + ',' + r] || '··').padEnd(2).slice(0, 2); console.log(String(r).padStart(3), s); }
}
