# Game visual audit — 4 October 2026

Audited the local `game_v3` game, starting at commit `7ff3ce2`. Changes and evidence are local; this audit did not publish a release.

## Fixed and verified

- On 320–360 px portrait phones, the right movement button overlapped bubble or maze Up. All four primary targets now fit separately.
- On short landscape screens, maze direction controls covered corridors and collectibles. Touch mazes now fit above a reserved control row; closing a maze or using keyboard input restores the normal view.
- Input reset cleared held actions but kept the finger registry and pressed-button highlight. It now clears both, preventing a stale finger from being restored by another touch.
- Map/pause chrome could cover wardrobe category tabs on landscape phones. Picture menus now use their own close controls; map and pause overlays retain their usual controls.

## Touch framing and side HUD

Normal adventure controls are smaller (52–80 CSS px), with the trick button in the same bottom row on landscape screens. Camera framing uses only the additional floor depth needed to clear the controls, rather than displaying a large strip of soil. The game canvas retains its full original size. Floating and water sections are accepted exceptions; world geometry and collision data are unchanged.

Wide screens with at least 70 CSS px of existing space on each side now use that space for the HUD. The left rail shows happiness, stars, spendable hearts, family progress and the active Rainbow hunt. The right rail shows all earned abilities, toys and tricks, including the fullest inventory during boss fights. Map and pause remain reachable above the rails. Counters update from the real save and preserve the distinction between collected and spent hearts. Picture menus, pause and mazes hide the rails. Screens without enough side space retain the compact top HUD so the game is neither reduced nor cropped.

Outer walls and ceilings that previously looked open now have visible zone-coloured edges wherever the collision map blocks travel. Real neighbouring rooms remain open; out-of-world drops remain falling exits. Boundary soil continues into empty exterior scenery only beneath an existing solid floor, without painting over real rooms or changing physics.

The complete terrain pass also covers internal blocks and the Pawprint courtyard. Its formerly hidden containment walls and roof now render normally. Exposed solid walls and ceilings have darker outlines with a narrow highlight, and walking surfaces retain their biome-specific tops. Closed vine gates fill their solid footprint; mushroom/trampoline bodies show the full area that blocks movement. Opening a gate or crumbling sandstone removes its blocking artwork. Secret pass-through walls retain their discovery/fade behavior.

## Validation

- All 21 gameplay/save/audio suites passed.
- All 11 browser suites passed, including camera, reset, beam, guidance, recorded voice/music, real keyboard/pointer/touch playthrough, side HUD and visual checks.
- 112 visual cases passed at 320×568, 360×800, 390×844, 568×320, 640×360, 844×390, 1024×768 and 1280×720. These include title, kitten select, home, pause, map, wardrobe, hedge maze, Cloud Maze and all six relative mazes.
- Checks assert that visible controls fit without overlap, maze controls do not cover map cells, wardrobe tabs are unobstructed, input reset clears held highlights, and pages have no overflow or runtime exceptions.
- Captured and visually inspected all 103 rooms. Room captures sample the camera view; they are not exhaustive images of every position or animation.
- Camera checks cover 94 stable standing views, including 11 rooms narrower or shorter than the camera, and map label placement in all 13 zones.
- Touch framing checks cover 42 captures at six sizes and standing-level clearance in all 100 rooms with suitable firm footing; the separate maze is excluded.
- Boundary pixels match collision behavior across all 103 adventure rooms, including the Pawprint courtyard: 1,458 blocked edge sections are marked, 3,274 other edge sections remain open, and 28 out-of-world floor exits remain open drops.
- Full-room terrain checks cover all 13 zones and 15,642 solid tiles, including 3,414 exposed vertical wall faces, 2,141 ceiling faces, 3,441 floor faces and 1,765 one-way/glowing platform tiles. The tests use real rendered pixels and assert that opening gates and crumbling sandstone clear the artwork without altering other collision tiles. Complete terrain images cover every block, beyond what a single gameplay camera can show.
- Side HUD checks cover six screen sizes, including narrow-screen fallback and a 2560 px wide desktop. They assert all ten abilities and twelve toys fit, panels stay outside the game and clear controls, health/currencies/progress update correctly, and menu/resume transitions hide and restore the rails.
- The large movement-route verifier was stopped after partial passes to keep this review focused on visuals and interactions. Its full search remains incomplete and is not included in the passing-suite counts above.

Physical phone comfort/performance and unscripted play remain unverified. Passing these checks does not prove the absence of every possible bug.

## Reproduce

Use Node.js with Playwright available through `NODE_PATH`; set `BUBBLEPAWS_BROWSER` to a local Chrome/Chromium executable if Playwright's bundled browser is not installed. The character rendering suite also uses `@napi-rs/canvas` when available.

```text
node tools/audit-game.cjs
node tools/audit-game.cjs --browser
node tools/render-game-world.js
node tools/render-game-world.js test-output/release-audit/room-boundaries --edges
node tools/test-solid-terrain.js
python tools/build-audit-gallery.py
```

Logs, result JSON and the screenshot gallery are in `test-output/release-audit/`, excluded from Git. Open its `index.html` to compare captures. The normal game's save is protected by isolated browser contexts and in-memory previews.
