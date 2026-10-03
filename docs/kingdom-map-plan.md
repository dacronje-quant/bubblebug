# Kingdom map rebuild: "House at the Heart"

A plan for Claude Code. Work from the **`game_v3`** branch.

## Goal

Today the kingdom is a ring stretched into two long lines (1306 × 280 tiles). Only 18% of the map is rooms, and the map screen is mostly empty paper. Rebuild it into one solid block (about 465 × 170 tiles, about 94% rooms) with the Cat House in the middle of the ground floor:

- sky across the top
- caves right under the house
- the sea along the bottom-left

The whole kingdom should fit on one map screen at roughly today's map zoom.

Along the way, make the adventure flow nicely, and spread accessories and collectibles through the new regions. Some mirror (shop) items can then be **found** in the world, so kids need to collect fewer stars to dress up.

The finale changes. After Starlight Sky, the kitten **floats down the Starfall Shaft and lands to the left of the house, at the Pawprint Maze doorway**, for the final maze. This replaces the Rainbow Slide through the skylight.

Keep the game's rules intact:

- no reading needed
- no game over
- zero softlocks, proven by `tools/verify-world.js`
- the README's level of polish
- no bloat: reuse existing systems (`glasses` drops, vine gates, cat flaps, benches, fairy rings) rather than inventing new ones

## Ground rules

1. `git checkout game_v3 && git pull`, then create a working branch: `git checkout -b game_v3-kingdom-map`. Commit after every phase. Push regularly. Merge back into `game_v3` only when everything below passes.
2. Before changing anything, run the full test set once and note the baseline: `node tools/verify-world.js`, `--easy`, `--replay`, and the `tools/test-*.js` scripts (see TESTING.md).
3. **Every room keeps its inside.** Rooms move as whole rectangles. Only the openings on a room's border change, so each room still connects to its new neighbours. Where a room needs a new doorway, cut the smallest opening that works. Never redesign a room's platforms unless a doorway needs one step or ledge to reach it.
4. Move one zone at a time, then run `verify-world` for the stages that zone affects. Don't move everything at once.
5. Old saves must keep working (see Phase 6).

## The target layout

Each character is one cell of **15 × 17 tiles** (half a room wide, one room tall). For cell (col, row):

- world tile x = `-315 + 15 × col`
- world tile y = `-103 + 17 × row`

These offsets keep the Cat House rooms exactly where they are today.

```
col:      0         1         2       3
          0123456789012345678901234567890
row 0     SSSSSSSSSTTTTTTTTTT++KKKKKKKKKK      sky
row 1     SSSSSSSSSTTTTTTTTTT++KKKKKKKKKK
row 2     AAAAAAAAATT++RRRRRRRR++RRRRRRKK
row 3     AAAAAAAAA++..HHHHHHHH++RRRRRRRR
row 4     FFFFFFFFF++..HHHHHHHH++GGGGGGGG
row 5     FFFFFFFFFNNNNNNNNNNNN++GGGGGGGG      ground floor (house)
row 6     DDDDDDDDDNNNNNNNNNNNN++GGGMMMMM
row 7     DDDDDDDDDCCCCCCCCCCCC++MMMMMMMM      under the house
row 8     LLLLLLLLLCCCCCCCCCCCC++MMMMMMMM
row 9     LLLLLLLLLLLLLLLL...............      sea
```

| Letter | Zone |
|---|---|
| N | Cat House strip: Pawprint Maze room, house, Front Garden, Pond Walk, Root Hollow (unchanged) |
| G | Sparkle Gardens |
| M | Mushroom Meadow |
| C | Crystal Caverns |
| H | Honeycomb Hive |
| R | Rainy Ruins |
| K | Cloud Castles |
| L | Coral Lagoon |
| D | Sunny Dunes |
| F | Frosty Peaks |
| A | Autumn Woods |
| S | Moonlit Springs |
| T | Starlight Sky |
| `+` | new link room |
| `.` | empty |

`docs/kingdom-map-layout.json` has a reference placement for all 87 rooms and 19 link cells that fits this grid with no overlaps. It was packed automatically to check that everything fits, so **treat the room order inside each zone as a first draft**. Re-order rooms inside their region so each zone still flows as a sensible path from its entry to its boss arena and on to its exit, and so tall rooms (`t4` Starfall Shaft, `k5`, `c3`, `c5`, `l4`) sit where their height makes sense.

You may nudge region borders by a cell or two if a zone flows better. Keep the overall picture: house in the middle, sky on top, caves under the house, sea bottom-left, Starlight's tall shaft directly above the Pawprint Maze room (`nm`).

### Key connections

| # | From → to | How |
|---|---|---|
| 1 | Root Hollow → Sparkle Gardens | Out the front door, east. Unchanged feel. |
| 2 | Sparkle Gardens → Mushroom Meadow | Down into a glowing glen below the gardens. |
| 3 | Meadow → Crystal Caverns | The Old Well drops you under the house. One-way drop. |
| 4 | Caverns → Honeycomb Hive | **Golden Tower**: a new link shaft in the `++` column right of the house (cols 21–22). It needs **Sticky Paws**, the Caverns elder's gift. Its bottom must not let a kitten without that power reach the caves early: use a one-way ledge or a shy wall that opens from the cave side. |
| 5 | Hive → Rainy Ruins → Cloud Castles | Hive above the house, Ruins over it and down the east side, Cloud Castles top-right. |
| 6 | Cloud Castles → Coral Lagoon | **Rainbow Lift.** Keep it a ride (the `u`/`v` link). The map draws its rainbow around the outside of the kingdom to the bottom-left shore. |
| 7 | Lagoon → Dunes → Frosty Peaks → Autumn Woods → Moonlit Springs | Climbing the west side, using the edge cells as turnaround link rooms. Add a cozy bench and a cat flap halfway up. |
| 8 | Springs → Starlight Sky | Starlight is top centre. Its tall Starfall Shaft (`t4`) sits right above the Pawprint Maze room. |
| 9 | Starlight → Pawprint Maze doorway | **Finale float** down the `++` column at cols 9–10 (see Phase 4). |

## Phases

### Phase 1: Tools first

- Add `tools/layout-check.js`. It prints the world bounding box, the share of the box covered by rooms, any overlapping rooms, and every room border opening that leads nowhere (an opening with no room on the other side).
- Teach `verify-world.js` nothing new yet. It must keep passing after every zone move.
- Add a "dev overview" to the map view behind a URL flag that shows the whole kingdom at once. It makes checking each move quick.

### Phase 2: Move the zones (one per commit)

Suggested order:

1. Caverns
2. Meadow
3. Gardens
4. Golden Tower + Hive
5. Ruins
6. Cloud Castles
7. Lagoon
8. Dunes
9. Frosty Peaks
10. Autumn Woods
11. Springs
12. Starlight

For each zone:

- Set each room's `x`/`y` in `js/world/rooms/<zone>.js` to its spot in the grid.
- Fix border openings between rooms that are now neighbours, and close openings that now lead nowhere.
- Add the zone's `+` link rooms as small new room definitions (keep them plain: ground, a ledge or two, the zone's palette). These are also where the seam secrets in Phase 5 go.
- Check that everything room-relative still lands: `kin` (Rainbow's relatives), `glasses`, family `&`, toys `T`, fairy rings 1–9 (each digit still exactly twice), cat flaps `h` (two per zone), benches, puzzles and keys.
- Run `node tools/verify-world.js --stage N` for the affected stages, then `node tools/layout-check.js`.

### Phase 3: Make the flow nice

- **One shortcut home per zone.** After each boss is cheered up, open a one-way door from that zone toward the house column, using an existing vine gate `G` keyed to the boss. Late powers should open loops back to home, not dead ends. Because every region touches the house column or the house, these are short.
- **Sightlines.** From the house's upstairs window you can see the Starfall Shaft and the Cloud Castles above. Kids should see where they're heading from the very start. A painted backdrop or parallax peek is enough; no new mechanics.
- **Breathers.** Put a cozy bench and a food bowl just after each of the three long climbs: Golden Tower, the west-side climb, and the Starfall Shaft top.
- **Signposts and fireflies.** Re-check that arrows and guide fireflies point the new way, especially at turnaround link rooms.
- **Difficulty curve.** Gardens and Meadow sit right next to the house. Keep them the gentlest. The west-side climb is late game, so it can be the most acrobatic.

### Phase 4: The finale float to the Pawprint Maze

- Replace the Rainbow Slide (`F` in Starlight) with a **Starfall float**. At the top of the Starfall Shaft, past the Moon Rabbit, the kitten grabs a big glowing dandelion and drifts down the `++` link column at cols 9–10. Reuse the Dandelion Float visuals.
- It lands in the courtyard on the Pawprint Maze side of the house (`nm`).
- The homecoming party should still trigger as today. Simplest: the landing plays a short arrival, then the party starts in the living room as before.
- The **Pawprint Maze doorway** (the rainbow door) glows right where the kitten lands when all twelve family cats are found. If some are missing, its portraits show which, as today.
- Rainbow's family flow and replays must keep working, and the sad-cloud replay must still start from home.
- Update `verify-world`'s final goal from "the Rainbow Slide is reachable" to "the Starfall float is reachable".

### Phase 5: Spread the treasures (found *or* earned)

Today mirror items unlock at star milestones (no spending). Give most milestone items a **hidden copy in the world as well**, so a kid who finds it gets it straight away. The star milestone stays as a fallback for anyone who misses it.

Use the existing `glasses` drop mechanism generalised to any wardrobe item: a room's `glasses: [{ id, x, y }]` list becomes `finds: [...]`, keeping `glasses` as an alias for old data. It equips on pickup, as today. Put each find in an optional nook, ideally one that needs a **later power**, so backtracking pays off. Many of the new `+` link rooms between zones are perfect "seam" nooks.

| Zone | Find | Where (idea) |
|---|---|---|
| Sparkle Gardens | Party hat (25★) | Tied to a balloon at the top of a tree; needs Double Jump on return |
| Mushroom Meadow | Flower crown (50★) | Inside a ring of glowing flowers in the grove |
| Crystal Caverns | Sparkly collar (150★) | Behind a crystal shy wall; *Silly disguise stays where it is* |
| Honeycomb Hive | Chef hat (75★) | The bees' bakery nook, above the house |
| Rainy Ruins | Flower bubbles (140★) | A rain-washed planter on a broken tower; needs Glow petals |
| Cloud Castles | Star bubbles (80★) | A cloud balcony seam room between Clouds and Starlight; needs Star Wings |
| Coral Lagoon | Pirate hat (125★) and Scuba mask (200★) | Pirate hat in the sunken ship; scuba in a tide pool. *Star shades stay* |
| Sunny Dunes | Tiny paw trail (60★) | Paw prints in the sand lead to it behind sandstone; needs Mighty Paws |
| Frosty Peaks | Jingle collar (175★) | A sleigh bell on an ice ledge; needs Spring Paws |
| Autumn Woods | Heart bubbles (40★) | Through a fairy ring to a leaf pile |
| Moonlit Springs | Heart glasses (300★) | At the lantern festival nook above the hot pool; needs Bubble Bounce |
| Starlight Sky | Wizard hat (100★) | In Comet Nook's little star library |

The Rainbow trail (250★) and the activity rewards (bow tie, pearls, leaf collar, rainbow necklace, the three goggle/glasses milestones) stay as they are: earned, not found.

On the mirror, a found item shows its picture as earned. A not-yet-found item still shows its star bar plus a small "?" spot marker, so kids know it's hidden somewhere too.

#### More ideas to fill the map (pick what fits; skip the rest to avoid bloat)

- **Seam secrets.** Every border between two regions gets at most one small secret room, reachable only with the *later* zone's power. For example, a Hive–Starlight seam above the house that needs Star Wings. The compact map makes these borders everywhere. They're the best use of the `+` cells.
- **Treasure-map scraps.** Four torn map pieces, one in each corner region (Springs top-left, Clouds top-right, Lagoon bottom-left, Meadow bottom-right). Each scrap makes the "?" clouds on the map show which rooms still hide a find, toy or family cat in that quarter. This fits the map and helps non-readers.
- **Dress-up doors (optional extras only).** A few seam nooks open for a kitten wearing the matching outfit, for example the sunken ship's captain's cabin for the sailor or pirate hat. They hold bonus sparkles, never anything needed. Kids love that the hat "does something".
- **House-column windows.** Each floor of the house column has a little round window into the neighbouring zone. Peeking in plays that zone's music sting and lights its door upstairs if you've reached it. This makes the house feel like the hub it now is.
- **Rainbow's relatives near the middle.** In the second adventure, put each relative near a border visible from the house column. Their flashing colours then make a ring around home on the map.

Keep all counts honest: update the README totals (sparkles, treats, benches, flaps, rooms) after the move.

### Phase 6: Saves and the map screen

- **Save migration.** Saved positions are world tiles. When a room moves, convert the saved position by room: `newPos = newRoom.xy + (oldPos − oldRoom.xy)`, inside a versioned migration in `js/core/save.js`. Visited rooms, flaps, gates and collected keys are keyed by room id or by things inside rooms, so they should survive. Write a test that loads a mid-game save from `game_v3` and checks the kitten stands on solid ground in the same room.
- **Map view** (`js/render/mapview.js`):
  - Open showing the whole kingdom fitted to the frame. Keep panning for small screens.
  - Replace the thin overview strip with a small square mini-map.
  - Draw the Rainbow Lift as a rainbow around the outside edge.
  - Draw the Starfall float as a dotted dandelion path down to the maze door.
  - Keep the "?" clouds, zone tags, relatives and cat faces.

### Phase 7: Prove it and document it

- `node tools/verify-world.js`, `--easy`, `--replay`: all stages, zero softlocks, every collectible (including the new finds and seam secrets) reachable.
- All `tools/test-*.js` scripts pass. Add `tools/test-finds.js` (pick up a find: it equips, the mirror shows it earned, and the star milestone still works if it's never found) and a finale test (Starfall float lands at the maze door, the party starts, replays still work).
- Screenshots with `tools/shot.js`: the full map, the house column, the finale landing.
- Update the README: the Rainbow Kingdom section, the zone table, the finale, the "Stars for you" table (found or earned), counts. Update TESTING.md.

## Done when

- [ ] `layout-check` reports at least 85% room coverage, no overlaps and no dead-end openings.
- [ ] The whole map fits one map screen.
- [ ] `verify-world` passes in every mode with zero softlocks.
- [ ] Every zone has a short way home after its boss.
- [ ] The finale float lands at the Pawprint Maze doorway, and the party and Rainbow replays work.
- [ ] 12 accessories can be found in the world and still unlock by stars.
- [ ] Old `game_v3` saves load in the right place.
- [ ] README and TESTING.md are updated. The work is on `game_v3-kingdom-map`, ready to merge into `game_v3`.
