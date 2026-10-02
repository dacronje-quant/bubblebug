# Layout helpers (kingdom map rebuild)

Working tools used to design the compact "House at the Heart" map. They don't run in the game.

- `profile.js`: tests each room on its own and records which edges (one per 15 × 17 cell side) the kitten can reach from which, with the powers it has on arriving in that zone. Writes JSON to stdout (`prof0.json` is the saved result; `--plus` adds the zone's own power).
- `solver.js` / `reg.js`: fill an area of cells with a zone's rooms in story order, joining them where the profiles say a doorway can go (existing doorways preferred), with short straight link rooms where needed.
  `node reg.js ZONE "c0/c1:r0/r1,..." entryC,entryR,dir [exit|-] [maxLinks] [occupied] [exitInto]`
- `cells.js`: turns a trial layout into plan-grid cells (x = -315 + 15c, y = 17r - 102).
- `lay.js`: the trial layout itself (room id → x, y, flip; sketch link rooms → x, y, w, h, zone).
