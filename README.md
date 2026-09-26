# Bubblebug: The Whispering Kingdom 🫧🐾

A cozy, non-violent platformer for little explorers (ages 3–7). Choose your kitten, then blow friendship bubbles to cheer up gloomy animals (and a few bugs) across six hand-built biomes. There's no fail state, and nothing in the game needs to be read.

![Platform](https://img.shields.io/badge/Platform-Any%20modern%20browser-orange)
![Install](https://img.shields.io/badge/Install-None-brightgreen)
![Audio](https://img.shields.io/badge/Audio-100%25%20synthesized-blue)
![Audience](https://img.shields.io/badge/Audience-Ages%203--7-ff69b4)

---

## ▶ How to play

**Windows:** double-click **`Play Bubblebug.bat`** (or double-click `index.html`).
**Mac / Linux / tablets:** open `index.html` in Chrome, Edge, Safari or Firefox.
**Online:** enable GitHub Pages (Settings → Pages → deploy from `main`, `/ (root)`).

There's no install, no Node.js and no build step. Everything, sound included, is generated in the browser.

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | ← → or A D | D-pad / left stick | big ◀ ▶ buttons (slide your thumb between them) |
| Jump (hold = higher) | Space, ↑, W | A / Y | green ⬆ button |
| Blow a bubble | X, Z, J, E, Shift | B / X / bumpers / triggers | blue bubble button |
| Pause / map / home | Esc or P | Start | round button, top-right |

Touch buttons appear automatically on tablets and touchscreens.

---

## 🐾 The heroes

Both kittens are painted from photos of two real cats:

- **Marshmallow**, a fluffy cream Birman kitten. She has warm taupe points on her ears, mask and plume tail, a dark little nose, snowy white "gloves", and sapphire-blue eyes. Her bubbles are lilac and pink with a trail of tiny hearts. She loves a big sleepy yawn.
- **Pip**, a patchwork tortoiseshell-tabby. Pip has chocolate and ginger patches with tabby stripes, a white bib and paws, a ginger cheek and bright green eyes. Pip's bubbles are honey-gold and mint with a sprinkle of stars. Pip twitches an ear, licks a paw, and does a wiggly pounce-crouch.

Both move the same way. They differ in voice (a synthesized *mew*), idle habits and bubble style.

## 🗺 The Whispering Kingdom

| Zone | What happens there | Elder's gift |
|---|---|---|
| 🌼 **Sparkle Gardens** | Tutorial: hops, a gloomy bunny to cheer up, a harmless pond, a cozy bench, a secret inside a hill | – |
| 🍄 **Mushroom Meadow** | Bouncy toadstools up to the glowing grove | 🦋 **Double Jump** |
| 💎 **Crystal Caverns** | A gentle drop down the Old Well into cozy-dark caves | 🐌 **Sticky Paws** (wall climb) |
| 🍯 **Honeycomb Hive** | Climb the golden tower | 🪲 **Glow** (wakes glow-petal bridges) |
| 🌧 **Rainy Ruins** | Soft rain, broken towers, wide pools | 🌸 **Dandelion Float** (hold jump to drift) |
| ☁ **Cloud Castles** | Breezy updrafts, sky bridges, and the grumpy Cloud King | 🌈 the Rainbow Party |

### 🐰 The gloomy critters

| Zone | Who needs cheering up |
|---|---|
| Sparkle Gardens | bunny, hedgehog, bluebird, ladybug |
| Mushroom Meadow | frog, mouse, caterpillar, beetle |
| Crystal Caverns | mole (with a tiny miner's lamp), bat, pillbug, beetle |
| Honeycomb Hive | bear cub (hugging a honey pot), bee, beetle |
| Rainy Ruins | owl, turtle, duckling, spider, snail |
| Cloud Castles | lamb, bluebird, moth, and the **Cloud King**: a lion cub with a cloud mane and a golden crown |

Bunnies and frogs hop, birds, bats, owls and bees flutter, spiders dangle on silk, and everyone else waddles. Every friend you make comes to the rainbow party.

The world has 27 interconnected rooms, 166 sparkles, 30 gloomy critters and 6 hidden toys (yarn ball, feather wand, jingle bell, toy mouse, paper boat, star cushion). There are also guide fireflies, music flowers, sleepy buds that open vine gates when bubbled, and shy walls you can walk right through.

## 👶 Designed for little hands

- **No reading, anywhere.** Arrows on signposts, fireflies that zip the right way, zone emblems, and an animated card for each new power. The card shows a tiny kitten doing the move while the matching button pulses in time.
- **No fail states.** Falling into water or sky-mist makes dandelion fluff float you back to safe ground. Bumping a gloomy critter gives a silly *boing*, never damage.
- **Friendship, not fighting.** A gloomy critter carries a little rain-cloud over its head. Each bubble shrinks the cloud and lifts its frown (a sad bunny's ears even perk back up). The last bubble wraps it in a big bubble that pops into a rainbow, and it becomes a dancing friend.
- **Forgiving movement.** Coyote time, jump buffering, *ledge assist* (arrive a bit low and you're popped up), *corner slip* on head-bonks, variable jump height, and bubbles that gently home in on their target.
- **Cozy benches.** Stop on one and your kitten curls up, purrs, and the music turns into a lullaby. The game also autosaves on every room change, so nothing is ever lost.

## 👪 For grown-ups

- **Pause** (top-right button, Esc or Start) has four picture buttons: keep playing, sound on/off, **kingdom map** (visited rooms, benches, earned powers, ★ on fully collected rooms) and **home** (back to kitten select).
- **Switch kittens anytime.** Picking a kitten on the select screen continues the saved adventure.
- **Start fresh:** on the select screen, press and hold the little 🌱 sprout button (or hold Backspace) until its ring fills.
- **Old PCs:** if frames get slow, the game automatically lowers its render resolution.

---

## 🛠 Under the hood

Plain HTML5 Canvas and Web Audio in classic `<script>` files. ES modules are avoided on purpose, because browsers block them from `file://` and that would break double-click play.

```
index.html              entry point (script load order = dependency order)
Play Bubblebug.bat      Windows one-click launcher
css/style.css           letterboxing, touch buttons, pause button
js/core/                bb.js (namespace & math) · config.js (all tuning) · input.js (keys/pads/touch)
                        audio.js (synth voices & SFX) · music.js (adaptive layered score) · save.js
js/world/               zones.js (biome palettes) · world.js (room grid & tile queries)
js/world/rooms/         gardens · meadow · caves · hive · ruins · clouds  (ASCII room maps)
js/engine/              physics.js (pure movement) · camera.js · particles.js
js/render/              gfx · kittens · critters · tiles · backdrops (parallax) · lighting · hud
js/entities/            player · bubbles · bugs (all gloomy critters) · things (sparkles, benches, elders, toys…)
js/scenes/              title · select · play · pause (+ map)
js/main.js              fixed 60 Hz loop, scene switching, adaptive quality
tools/                  verify-world.js + dev playtest/screenshot helpers (optional, need Node)
```

- **One continuous world grid.** Rooms are placed at world coordinates (Hollow-Knight style), so walking off any edge leads straight into the neighbouring room, and the camera glides across.
- **Pure physics.** `BB.Physics.step(body, input, abilities)` has no side effects, so the same code runs in the game and in the verifier.
- **Adaptive music.** Each biome has an 8-bar song in layers (pad, bass, lead, arpeggio, percussion, twinkles). Running swells the arps and percussion, benches fade to a music box, a new friend adds a twinkle layer, and dark caves warm the mix.

### Zero softlocks, proven

```
node tools/verify-world.js            # ~4 minutes, exit code 0 = all good
node tools/verify-world.js --map g3   # also print a room with reachable air marked •
```

The verifier loads the real game modules and simulates hundreds of button patterns (walks, hops, run-ups, mid-air steering, double jumps, wall kicks, glides) from every reachable standing spot using the game's own physics. It checks all of the following:

1. each elder and the finale are reachable with the powers you'd have at that point;
2. **from every reachable spot the next goal is still reachable** (the water rescue is modelled too);
3. with all powers, every spot can travel back home (free backtracking);
4. every sparkle, toy, bench, flower, firefly and critter can be reached, and every bud can be bubbled.

Current result: ✓ all five story stages pass with zero softlocks.

### Editing rooms

Rooms are ASCII maps in `js/world/rooms/*.js` (see the legend at the top of `js/world/world.js`): `#` ground, `-` one-way ledge, `M` bouncy mushroom, `~` water/mist, `^` updraft, `:` glow-petal, `H` shy wall, `G` bud gate, plus `*` sparkle, `b`/`c` critters (each zone's `cast` in `js/world/zones.js` decides which animals they become), `B` bench, `E` elder, `f` firefly, `R L U D` signs, `T` toy, `n` music flower, `o` bud, `K` Cloud King, `F` finale, `S` start. Run the verifier after any change.

Developer shortcut: `index.html#play=pip&room=c4&ab=all` jumps straight into a room with every power.

## 📄 License

MIT. Enjoy, share, and build on it for young explorers everywhere. 🫧
