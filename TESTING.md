# Automated playability checks

Run `node tools/check-playability.cjs --quick` for the focused regression
suites and complete maze state graphs. Successful suite results are reused
only when the game, test helpers and fixtures have the same source fingerprint.
Use `--no-cache` to run every selected suite again. Bundled canvas dependencies
are located automatically when available.

Run `node tools/check-playability.cjs` for those checks plus fresh-save
adventures in Easy, Medium and Hard. Bundled verified input routes make seed 1
fast to repeat: every run executes ordinary keyboard inputs through actual
scene updates from a fresh save, then compares the entire saved state and
runtime with the recorded expectations. A passing adventure must earn all
required powers, bosses, both families, puzzles, finds, clothing/styles,
invitations, the fountain, every fast-travel flap and the permanent shortcut,
then retain earned progress and the exact saved checkpoint through Continue.
Discovered routes are independently replayed from another fresh save before
being cached; repeat runs execute those inputs again. The completion harness
has no placement/teleport API and does not grant powers or rewards.
Recorded inputs are test cases, so `--no-cache` still executes them. Historical
capture hashes are provenance, while cached suite results require the current
source fingerprint. See `tools/fixtures/playability/README.md` for recordings.

Useful options:

- `--mode easy` selects one difficulty; `--seed 7` varies repeatable gameplay
  randomness and uses the controller when no recording exists. `--discover`
  searches for a new route instead of using recorded or cached inputs.
  `--only adventure` runs only actual progression, and `--only`
  also accepts suite names or `world` when `--deep` is selected.
- `--all-collectibles` additionally requires every world/maze star and every
  critter, using a separate cached route.
- `--stress` shifts representative actual jump events two ticks earlier/later
  and requires the controller to recover to the same completion/unlock goals.
  This samples timing margins; it does not exhaust every possible input.
- `--browser` replays each completed earned route in Chromium, with exact
  saved progress checks, sampled drawing throughout room/modal/boss transitions,
  and desktop/phone captures. Installed Chrome/Edge and
  bundled Playwright are located automatically when available.
- `--deep` also runs normal/Easy movement across story/replay and closed/open
  shortcuts with the existing physics graph search. This is much slower than
  replay. `--jobs 4` limits concurrent child processes, and `--timeout-ms
  300000` bounds each child independently of a frozen game.

Results, milestone progress, exact keyboard traces, earned-ID ledgers and
failure state are written under `test-output/playability/`. A controller that
cannot find a route is reported as incomplete, with a nonzero exit; it is not
automatically called a game lock. Quick checks explicitly do not confirm full
adventure completion. Source changes during a run invalidate its combined
result.

Confirm a completed cached route in the actual browser with
`node tools/test-playthrough-browser.js --trace PATH`. It checks exact earned
save parity, browser persistence and unlocks, with desktop/phone captures.
Use the usual `NODE_PATH` and `BUBBLEPAWS_BROWSER` settings below when needed.
`--smoke` validates a short input prefix and is explicitly not a completion
check. Sampled browser draws use a separate seeded cosmetic random stream:
decorative door sparkles otherwise change enemy randomness and invalidate
fixed inputs. Gameplay randomness, physics and earned rewards stay exact.
This checks rendering throughout a deterministic route; existing touch/gamepad
and real-time frame-loop suites remain necessary
for those input/display paths.

The physics verifier now supports `--json PATH`, `--witnesses PATH` and
`--timeout-ms N`, preserving per-stage progress and bounded search failures.
Witnesses are route candidates requiring actual gameplay validation. Its
passing result covers sampled resting-position reachability: merged body
states, interaction approximations, retained gate-history edges and bounded
unresolved trajectories prevent an unconditional no-lock guarantee.

# Trying smooth movement and room boundaries

A zone's rooms that sit side by side at the same height share one
continuous camera, like the home and garden: walk across those seams (for
example Sparkle Gardens g2 into g3, or the five Moonlit Springs rooms) and the
camera just scrolls on, with no glide, whoosh or vanishing bubbles; critters
in the next room keep moving while they're on screen, and a dark room's
shadow eases into a brighter neighbour's. Boss arenas and link trails keep
their own framing. Everywhere else (up or down a shaft, into a taller room,
an arena or the next zone) room glides take 0.2 seconds while the kitten,
residents, bubbles and game timers keep moving; tap Jump during the glide.
In the tower, repeatedly release and tap Jump for Double Jump, Bubble Bounce
and Star Wings while passing the upper room boundary. Brief taps between
ticks should also work. A zone's backdrop is painted a layer at a time in
spare frame time while you're near it, so crossing into it never waits on
the painting.

Rendering interpolates completed 60 Hz game ticks. Compare motion on 60, 90
and 120 Hz displays; game speed should stay the same, with positions filling
the extra drawing frames. Snow, pollen, rain, HUD collection bounces and
gate/portal fades use game time. Pause should freeze these effects. Resolution
lowers only under sustained drawing load and gradually recovers with spare
time; a healthy 30 Hz display should keep its normal resolution.

Run `node tools/test-room-glides.js`, `node tools/test-render-motion.js`,
`node tools/test-frame-quality.js` and `node tools/test-effects-timing.js` for
boundary input, exact simulation-state preservation, quality recovery and
30/60/90/120 Hz effect parity. Run `node tools/test-frame-loop-browser.js`
with the Playwright and `BUBBLEPAWS_BROWSER` settings below for the real
browser loop at those cadences; captures and results are saved under
`test-output/frame-loop`. Simulated cadence does not replace a physical
high-refresh tablet playtest. Movement checks also require the Medium/Hard
and Easy world verifiers described below.

Zone music prepares in short background tasks, preloads the next zone and
keeps the previous score audible until the new recording is ready. A voice
line already speaking should finish while walking across a room boundary or
traveling through a door or lift;
queued or delayed room-specific cues should disappear. Pause and mute still
stop speech. Run `node tools/test-music.js`, `node tools/test-voice.js`,
`node tools/test-guidance.js` and the music/voice browser checks for these
behaviors, including offline `file://` playback.

# Trying Glow and aerial jumps

Skill unlocks use a picture strip with no words or numbers. Jump taps visibly
press and release; a continuous hold keeps the fingertip down. Swimming shows
release to sink, Sticky Paws shows holding into a wall followed by Jump to kick
away, and Glow/Dig/Fairy Rings show movement triggering the effect. Bubble
Bounce uses Jump after any learned Double Jump; Star Wings shows the learned
jump sequence before repeated flaps. The diagram follows the selected kitten
and the current touch, keyboard or gamepad input.

Use the play picture to replay and the arrow to continue. A gameplay button
only dismisses the card after the whole sequence has played. The automatic
timeout remains, and replay starts a fresh viewing period. Check that the
card clears the actual touch row, map/pause controls and screen cutouts.

Run `node tools/test-skill-prompts.js` for diagram-versus-physics checks,
tap/hold/release timing, learned-power variants and ceremony replay/dismissal.
Run `node tools/test-skill-prompts-browser.js` with the same Playwright/browser
settings as the control tests for all ten lessons on desktop, tablet and
portrait/landscape phones, zero-text rendering, clear controls and real canvas
replay/continue clicks. Captures are saved to `test-output/skill-prompts`.

Jump once from the ground, release and tap again for Double Jump, then tap a third time for Bubble Bounce. Once Star Wings are learned, further taps flap. Holding Jump must not repeat a bounce; floating and swimming still use a hold. Shoot before, during and after the jumps: Bubble must shoot without changing the jump sequence, including when Jump and Bubble are pressed together. Land and repeat to check the air jumps reset.

In Honey Pools, Glow works automatically. Without it, the faint closed petals cannot support the kitten; with it, they form golden platforms. Walk towards them and watch the flowers unfold and brighten. Moving the camera must not change how strongly the flowers respond at the same player distance. Sleepy buds that open gates still need bubbles. The Glow lesson shows a flower bridge over honey; the Bubble Bounce lesson shows three presses of the Jump button.

Run `node tools/test-skill-controls.js` for player/physics checks. Run `node tools/test-skill-controls-browser.js` with Playwright and optional `BUBBLEPAWS_BROWSER` for actual keyboard events, simulated standard gamepad input, multitouch, Glow rendering and lesson screenshots on desktop, tablet and portrait/landscape phones. Movement changes also require `node tools/verify-world.js --jobs 4` and `node tools/verify-world.js --easy --jobs 4`; the verifier uses successive Jump presses for the new bounce sequence.

# Trying touch controls

Touch controls keep their visible size and position, with a transparent 10px touch margin on every movement, action, maze, map and pause button. Near misses between neighbouring movement buttons select the closer button, and you can slide between Left and Right without lifting. Pressed feedback changes the icon and colour while keeping the touch target steady. `node tools/test-touch-targets-browser.js` uses real browser touch events across portrait/landscape phones and tablets to check all nine buttons, shared margins, two-finger movement/jump, cancellation, overlays and menu visibility. Use the same Playwright and optional `BUBBLEPAWS_BROWSER` settings as the other browser checks. `node tools/test-touch-ground-browser.js` checks that the character and ground-level enemies remain above the visible control row.

# Trying Rainbow's family and Mama's Cloud Maze

Open [the Rainbow family preview](index.html#play=rainbow&room=hm&demo=rainbow). It starts at home just after Rainbow's rescue, with every power, and never touches the normal saved adventure.

1. A picture card shows six grey relatives and an arrow to the Cat House. Upstairs over the stairwell, the Rainbow Nest is grey with seven empty cloud cushions; the little rainbow at the top is grey too.
2. Open the map (map button or M): each lost relative flashes in their own colour; ones off to the side flash at the map's edge with an arrow, and tapping one glides there. Close the map: you are straight back in the game.
3. Walk out to Pond Walk and up onto the branch walk. A chime plays and green stars float toward Rainbow's Grandpa, grey and sad. Walk up to him: his Lily Pond maze opens. Gather the three flowers (they fill in at the top), then reach him: his colour floods back and he says hello. Back outside he rides a rainbow away toward home. His band lights up at the top and on the nest. Leaving a maze early with the house button keeps him waiting; step away and come back to try again.
4. Find the others on high perches, each with their own maze: Papa (Honeycomb Hive; honey pots and bees to wait for), Granny (Cloud Castles; yarn and slippery wool), Splash (Coral Lagoon; shells and currents), Pumpkin (Autumn Woods; acorns in the mist) and Twinkle (Starlight Sky; stars that make bridges appear).
5. While any are lost, the courtyard doorway (left of the house) is shut, with their six faces above it. When the sixth is home, Rainbow says only Mama is missing; at the doorway Mama calls for help and the green check opens the **Cloud Maze**.
6. In the Cloud Maze, touch Twinkle (purple) near the start: the purple bridges turn solid. Each relative's colour opens the way to the next; bumping a closed bridge wobbles it. Leave by standing on the start cloud for two seconds or tapping the house: gathered colours are kept. The rainbow bridge by Mama needs all six. Reach her: the whole family gathers under a rainbow, then fireworks over the courtyard and rainbow bubbles.
7. Only now does the sad cloud offer a replay. Its picture cards match New Game on the title: the **house and both families with crossed-out items** reset everything, while **Rainbow's seven relatives with green ticks** reset only her family. Circular arrows mean replay; the big green play arrow is the safe default. Small captions are for adults and reading is not required. Family-only clears the seven relatives and cloud colours, returns you home, and keeps the twelve house cats, your kitten, every skill, item, reward and all other progress. Find all six and Mama again; reload partway through to check progress persists. Full reset shows a second picture warning with the green play arrow selected first; only the red restart arrow clears the whole adventure and opens kitten selection. Before Rainbow's rescue, the title's family-only card has a large padlock.

`node tools/test-rainbow-family.js` checks these interactions, including walking the Cloud Maze with real key presses. `node tools/test-maze-graph.js` explores the discrete maze states. `node tools/verify-world.js --replay` supplies sampled movement coverage of the relatives' perches; `node tools/check-playability.cjs` requires actual rescues and earned unlocks.

# Trying the home neighbourhood and rewards

Download this branch as a ZIP, extract it, and open `index.html#play=phoebe&room=hm&demo=rewards` in a browser, or use [the rewards preview](index.html#play=phoebe&room=hm&demo=rewards). No install or build is needed. This preview starts at home with 250 stars, 65 rescued critters/hearts, all 12 family cats, boss presents and the homecoming complete, so you can try the garden, maze and Rainbow replay. It keeps progress in memory, so reloading starts the preview again and your normal adventure stays intact. Open `index.html` for normal saved play.

The title picker has three modes: **Easy** adds jumping and landing help; **Medium** is the former Easy; **Hard** keeps its original movement and happy suns. Existing Easy adventures carry over to Medium. Difficulty remains a device setting, including when trying the preview.

1. Walk right out of the house. Follow the lower path through **Front Garden → Pond Walk → Root Hollow → Sparkle Gardens**. The camera should follow continuously, and no jump is needed. Walk back home.
2. Try the wider leaf steps and open upper entrance in the Front Garden, then hop across the short gaps along the high garden and pond branches. Bounce on the trampoline on the lower path without needing a jump skill. Start ball play and keep nudging the ball through Front Garden, Pond Walk and Root Hollow: it should roll, bounce and stay with you after the play ring finishes. In Root Hollow, bubble both sleepy buds and collect the bonus stars from their nook.
3. Walk left to the small **indoor rainbow door**, clear of the family cushions. Its 12 cat portraits match the house wall; missing cats are grey, and the door physically blocks the courtyard until all 12 are found. The preview already has all 12. Walk through to the grand, cloud-covered courtyard. Stand at its tall doorway or press Enter/Bubble, then choose the green check to enter the gloomy hedge maze. Move with all four arrows/WASD, a gamepad D-pad, or the four on-screen arrows. Light the moon, flower and star lanterns in order; each opens its matching arch and reveals the next part of the garden. Rescue Rainbow in the upper-left corner and watch the entire maze brighten. Choose Marshmallow, Phoebe or Rainbow as your playable kitten. Rainbow has a golden horn, rainbow mane and flowing rainbow tail. Move left into the new house-picture door beside her, or tap it, and wait two seconds to return to the now cheerful courtyard. Walk right outside to reach Cat House. Walking back off the door cancels its wait, including after Continue. The top home picture and lower-right entrance also work. The mirror's new cat tab lets you change kitten again.
4. Stand on the mirror's paw ring. Its picture tabs separate **Hats, Necklaces, Glasses, Bubbles and Trails**, with Kittens added after rescuing Rainbow. From the first item row press Up to focus categories, Left/Right to change category, and Down to return to items. Space/X/Enter equips. A first tap on an unselected item previews it; another equips it if unlocked. Page dots browse longer categories. There are no navigation arrows or long control hints on the cards. On a tablet, movement buttons hide in wardrobe, invitations, replay choices, pause and map menus, then return on closing them. The map button remains tappable to close its overlay. Star totals never decrease. A number-free progress bar and unlock picture show progress toward the selected item. Half the required stars fills exactly half the bar; only earned items have full bars. Try the scuba mask with a hat/collar and the smaller paw trail.
5. In the Front Garden, use the **outdoor welcome board** with the bunny and house pictures to invite a species for one heart. Every rescued critter of that species should appear across the garden floor and upper branches; later rescues join automatically. Each card has only its selected species switch. Before unlocking, the slider shows a heart and lock and cannot be enabled without a heart. After the one-heart unlock it shows/hides that species for free. Use Left/Right or the neighbouring critter pictures to browse; use mouse/touch or Enter/Bubble to change the switch. Reload and Continue: hidden choices and invitations should persist, with no extra hearts spent. Invite all 39 species to bring all 65 rescued critters home. Try ball play, pond bubbles and Root Hollow dancing. Each eight-second game gathers up to six nearby ground-level visitors into spaced places; upstairs friends stay upstairs. Check that visitors move calmly, avoid twitching and ease home without snapping. Step away and return to repeat. Pet visitors and blow bubbles at them. Playing, petting, switching and reloading must never charge or award extra hearts.
6. At the living-room fountain, spend one heart once. Watch six seconds of rainbow water jets, flying hearts, confetti, fireworks, party music and family dancing. The new twirl picture appears after the celebration. Step away, then repeat for free. Holding a button should produce one celebration.
7. Open `index.html`, choose each difficulty from the title screen, and try jumping and a gloomy bump. Medium should feel like the old Easy; only Hard loses happy suns. Pause → home lets you change the mode and Continue.
8. In normal play, check that the indoor rainbow door stays locked with 11 cats and opens with all 12, even before the homecoming. Try every movement skill against the locked door. Equip an unlocked extra, reload, and Continue. Your kitten, items, collected stars, friends, map ★ marks and completion stay earned. Older star purchases remain usable even below the new milestone. Maze lanterns and current position survive a reload. An older save already inside the maze should finish its existing route safely; an older checkpoint outside the new indoor lock should still allow a walk home.
9. Find the existing **Googly glasses** inside Root Hollow's upper nook after bubbling both sleepy buds; their former Ladybug Hill spot is empty. Find the **silly disguise** in the hidden crystal grotto and **star shades** in the coral garden. They equip when found and stay available in Glasses beside the scuba mask. Earned boss presents join Hats or Necklaces. Browse both hat pages with dots or keyboard; wear a hat and collar with glasses. Old owned clothes remain available after Continue or a family-only reset; a full reset clears them.
10. After reuniting Rainbow's whole family, use the **sad cloud beside the rainbow door**, or choose **New Game** from the title. Check both picture choices, safe cancel, and the extra full-reset confirmation described above. Repeat a full playthrough/reset three times; repeat a Rainbow-family hunt twice. Continue after reloading must resume the chosen adventure. Both reset choices in a preview must leave the normal saved adventure intact. `node tools/test-reset.js` checks save preservation and the real menu inputs; `node tools/test-reset-browser.js` checks both choices on desktop, tablet, and landscape/portrait phones with real mouse/touch inputs.

11. Hover or use keyboard/gamepad to choose New Game, difficulty and a kitten: a translucent paw marks the selected picture. A parked mouse must not undo keyboard selection, and hovering never starts or erases a game. In play, Down before learning a trick shows a smiling-cat/music symbol with a question mark; the same symbol marks the trick pickups, learned-trick HUD, touch button, lesson card and relevant wardrobe reward. Learn a trick, perform it and move to cancel.

The additions have automated checks for saves, every star threshold, real scene inputs, physical routes, puzzles, difficulty and all 65 roaming residents. `node tools/test-maze.js` checks every maze corridor and exit, twelve-cat access, kitten choices and reloads. `node tools/test-rainbow-garden.js` checks the physical indoor lock in all difficulties, the lantern sequence, rescue exit, garden bloom and older active maze/checkpoint compatibility; pass an output folder to render its scenes. `node tools/test-journey.js` finds all three glasses and repeats the rescue/cloud/replay loop three times. `node tools/test-garden.js` repeats every garden game, measures calm movement/facing and safe floors, checks individual switches, the removed All action and reload, and verifies later rescues join without another payment. `node tools/test-critters.js` (with @napi-rs/canvas) renders all 39 species through real updates, checking animation, greetings, landings, moods, distinct art and unchanged entities/saves. Adventure critters keep their original movement and hitboxes; garden visitors roam and play more gently. The world verifier's `--replay` mode samples movement reachability in a fresh world with carried skills and closed boss/puzzle gates, using both original and Easy movement. Its merged states, approximate interactions and bounded trajectories do not establish runtime completion or an unconditional no-lock guarantee. Use `node tools/check-playability.cjs` for naturally earned progression, unlocks and Continue checks; an unfinished controller run remains incomplete. Chromium checks cover keyboard/mouse input, every wardrobe category/page, individual garden switches, a complete lantern maze rescue and its exit, reloading, preview save protection and emulated tablet touch. `node tools/test-menu-feedback.js` checks safe menu hover and the gesture inputs; pass an output folder with @napi-rs/canvas available to inspect menu paws, an exact half star bar, visible doorway/wardrobe/garden/pond/lift waits and heart-locked critter sliders. Canvas scenes are rendered for inspection. A physical gamepad/tablet playtest remains useful for judging feel and touch comfort.

Family wishes, house decorating and jukebox tunes remain deferred. No recovery benches were added. The approved story voice pack is covered below.

## Region music

Walk from the Cat House into the Front Garden and on into Mushroom Meadow: each region's recorded score fades out while the next fades in, with no silence between. Come back and the earlier score continues where it stopped. A boss arena switches to its bouncy layered tune and back. Leave a region playing for two minutes to hear the loop point pass without a gap. Run `node tools/test-music-browser.js` (Playwright via `NODE_PATH`) for the automated version. The shipped music bundles and pack manifest are in `assets/music/`.

## Approved story voices

The game bundles 53 Gemini 3.8 Flash TTS recordings: the twelve family greetings, twelve funny lines for bubbling a family member at home, the story moments, the first-time guidance cues and twelve lines for Rainbow's family (seven greetings, Rainbow's two lines about her family, Mama's call, the Cloud Maze hint and the whole-family thanks). Snowflake (Puck) and Patches (Leda) use soft, playful spoken introductions that identify their name and whose baby sibling they are. The Gemini narrator lines share one designed voice, and Rainbow uses Achernar for both lines. No API key or network speech service is needed to play. New recordings use a fixed gain for approximate speech-volume matching, with a peak limit and no pitch or speed change. Music and its reverb stay at 18% of their normal level throughout speech, then fade back up; other effects stay at 40%, with meows and purrs held back while a cat speaks. Overlapping fanfares cannot end the speech duck early.

- Start a new adventure: hear the mission once when the kitten wakes.
- Find each family cat: hear its greeting. The twelfth greeting finishes before the whole-family announcement.
- Rescue a boss, return for the first homecoming, approach Rainbow's door and rescue her: hear the matching story moments without menu or wardrobe narration. The new reset chooser must not play the old recording promising retained skills in a whole-world replay.
- Mute or pause during a line or its short delay: playback and queued lines stop. Walk between rooms or open a menu to check the same cancellation.
- Reset only Rainbow's family: their hunt announcement, greetings and completion line play again, while other story milestones stay heard. A full reset plays the original welcome on the new adventure and clears skills/outfits. Reload to confirm completed story milestones do not repeat within the same hunt.

Run `node tools/test-voice.js` for queue/cancellation/save checks and `node tools/check-audio.js` for overlapping ducks, effect limits and reverb routing. `node tools/test-voice-browser.js` verifies all 53 bundled files decode and tests real playback, mute and pause in Playwright. `node tools/check-mix-browser.js [screenshot-directory]` checks the existing googly glasses moved from Ladybug Hill into Root Hollow's two-bud nook, saved unlocks, real speech ducking, and mute/pause/end cleanup. Existing glasses stay earned. Use the same optional browser and dependency settings as `tools/test-browser.js`; the new browser check also accepts Playwright through `NODE_PATH`.

# Trying the compact kingdom ("House at the Heart")

Open [the climbing preview](index.html#play=phoebe&room=tx&ab=all&demo=rewards) to explore the new terraces from the Mushroom crossing of the Golden Tower, with all skills. Like the rewards preview, this uses an in-memory adventure and leaves the normal save intact. Climb through the garden crossing, try the side rewards and bench, then use Sticky Paws for the final neck into the Hive.

At the top of the Mushroom crossing, the soil rim marks the blocked ceiling; golden posts mark the opening. Jump up through the shaft, using its right side to land in the garden. The hatch opens a return gap on the left, marked by a mushroom picture and downward arrow. All shortcut cues use pictures and shapes without words. Walk into that gap to land on the Mushroom catch shelf. In a normal adventure the opening survives Continue and family-only resets; a full new adventure closes it. Use `--shortcuts-open` with the world verifier to test all story stages in the unlocked state, as well as the default closed state.

The kingdom is rebuilt round the house: sky on top, caves under the house, the sea bottom-left, and the Starfall Shaft standing right above the Pawprint Maze room. To look it over:

1. Open `index.html#overview` and press the map button: every room shows at once, the whole kingdom fitted to one screen, with the Rainbow Lift swooping round the outside and the Starfall float's dotted path down to the rainbow door.
2. Start a new game and walk out of the front door: the path runs through the Golden Gate (the tower rising out of the garden path) into Sunrise Lawn with no camera slide.
3. In Sparkle Gardens, the Tall Garden's leafy drop leads down into Goose Green; the glen (Mushroom Meadow) runs west under the house to the Old Well, which drops into the caves below your own floor. With Sticky Paws, the Golden Tower climbs from the caves' pillar past the glen and the garden path to the Hive, where a bench and a bowl wait.
4. Each zone hides one thing to wear or a bubble/trail style (see the README's *Found or earned* table). Pick one up and it goes straight on; at the mirror a still-hidden thing shows a purple "?" spot.
5. Past the Moon Rabbit, take hold of the big glowing dandelion: it floats you over to the Starfall Shaft and down it, landing by the rainbow door for the homecoming party.

Checks:

- `node tools/verify-world.js` (and `--easy`, `--replay`): sampled stage goals, graph backtracking and approximate collectible/interaction coverage; the last goal is the Starfall float home. Use `node tools/check-playability.cjs` for actual runtime completion and earned unlocks.
- `node tools/test-finds.js`: the hidden things are where they should be, go straight on when found, show as earned and still unlock by stars.
- `node tools/test-rainbow-beams.js [shot-dir]`: Rainbow casts beams from her paw by default, one beam cheers up a boss (it still opens the way on and saves), the mirror offers Rainbow beams, and each kitten's choice survives a reload.
- `node tools/test-camera.js`: the camera holds still in every room, including the narrow link shafts that are thinner than the screen; the kingdom map opens zoomed in on the whole current zone, with name tags that never overlap.
- `node tools/test-wayfinder.js`: following the "this way!" guide from home (no powers yet) reaches every elder, all 12 bosses and every family cat with no dead end; it never points against a signpost; Medium shows it in each new room and when standing still, Hard after a still moment, and it hides while a boss is sad.
- `node tools/test-finale.js`: the Starfall float drifts down the shaft and lands by the rainbow door; the party starts.
- `node tools/test-neighbourhood.js` also checks that an older save's sparkles, friends, resume spot and bench move with their rooms (save v9).
- `node tools/test-climbs.js` preserves all 1,201 original landmarks and checks all 1,779 original standing positions in normal and Easy movement. It reloads older saves across the refreshed rooms, keeps their 756 already-collected stars and other progress, jumps the Pond Walk side route without powers, and tests the discovered Hive door before and after Sticky Paws. It also checks the garden hatch's ascent, safe landing, return drop, saved opening, Continue, family-only reset and full reset, plus the narrow Coral Garden dive pocket.
- `node tools/test-climbs-browser.js [shot-dir]` traverses the Pond Walk reward loop, complete Golden Tower and garden return shortcut with real keyboard input, including the room seam and final Sticky Paws climb. It captures ten representative climbs and the hatch in both states at desktop and portrait-phone sizes, and checks runtime errors and overflow.
- For the refreshed trails, run `node tools/verify-world.js --jobs 4`, then `--easy --jobs 4`, `--replay --jobs 1` and `--replay --easy --jobs 1`. The search checks sampled stage goals, standing positions, power gates, coverage near collectibles, approximate puzzle/boss conditions and graph routes home. Its finite plans, merged states and gate histories limit the conclusion. The explicit Hive requirement is also respected by the house door and wayfinder.
- `node tools/layout-check.js` prints the world box, room coverage, overlaps and any doorway that leads nowhere; `--picture` draws the map in cells.
