// Write room positions from a trial layout into js/world/rooms/*.js
//   node tools/layout/apply.js lay.json id id …   (sets x, y and flip)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const lay = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ids = process.argv.slice(3);
const dir = path.join(ROOT, 'js/world/rooms');
for (const id of ids) {
  const t = lay[id];
  if (!t) throw new Error('no spot for ' + id);
  let done = false;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const src = fs.readFileSync(p, 'utf8');
    const re = new RegExp(`(id: '${id}', zone: [0-9]+, )x: -?[0-9]+, y: -?[0-9]+,( flip: true,)?`);
    if (!re.test(src)) continue;
    fs.writeFileSync(p, src.replace(re, `$1x: ${t.x}, y: ${t.y},${t.flip ? ' flip: true,' : ''}`));
    done = true;
  }
  if (!done) throw new Error('room not found: ' + id);
}
