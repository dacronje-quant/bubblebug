// node reg.js ZONE "c0-c1:r0-r1,c-c:r-r" entry(c,r,d|-) [exit c,r,d] [maxLinks] [occupied spec]
const { solve, draw } = require('./solver.js');
const parse = spec => { const out = []; if (!spec) return out; for (const part of spec.split(',')) { const [cs, rs] = part.split(':'); const [a, b = a] = cs.split('/').map(Number); const [p, q = p] = rs.split('/').map(Number); for (let c = a; c <= b; c++) for (let r = p; r <= q; r++) out.push(c + ',' + r); } return out; };
const [zone, spec, ent, ex, ml, occ, into] = process.argv.slice(2);
const reg = parse(spec);
const pe = s => { if (!s || s === '-') return null; const [c, r, d] = s.split(','); return { c: +c, r: +r, d }; };
const res = solve({ zone, region: reg, entry: pe(ent), exit: pe(ex), maxLinks: ml == null ? 2 : +ml, budget: 3e7, occupied: parse(occ), exitInto: into ? parse(into) : null });
console.log(res.tried, res.best && { left: res.best.left, links: res.best.links, cost: res.best.cost });
console.log(draw(res, reg, parse(occ)));
if (res.best) { console.log(JSON.stringify(res.best.plan.rooms)); console.log('EXIT', JSON.stringify(res.best.plan.lastExit)); }
