// Dev helper: build the recording script for the game's spoken lines, for VoiceStudio's
// batch tool (https://github.com/debpalash/VoiceStudio — needs a GPU-ish machine + model).
//   node tools/make-voices.js
// Then follow the two steps it prints. Clips land in assets/voice/<key>.wav, which is
// where js/core/voice.js looks for them (any missing clip falls back to the device voice).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'voices', 'out');

// the game's own lines (js/core/voice-lines.js is the single source of truth)
const ctx = { window: { BB: {} } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/voice-lines.js'), 'utf8'), ctx);
const LINES = ctx.window.BB.VoiceLines;

// VoiceStudio "voice design" only understands: gender, age (child / teenager / young adult /
// middle-aged / elderly), pitch (very low … very high), and accent (american / british /
// australian / canadian). Different mixes keep the twelve cats easy to tell apart.
const HOST = 'female, young adult, moderate pitch, american accent'; // the friendly host, all toys/bosses/outfits
const CATS = {
  mamaMallow: 'female, middle-aged, moderate pitch, british accent',
  papaBirman: 'male, middle-aged, low pitch, american accent',
  grannyLilac: 'female, elderly, moderate pitch, british accent',
  bigSisterCocoa: 'female, teenager, high pitch, american accent',
  babySnowflake: 'child, very high pitch, american accent',
  grandpaSeal: 'male, elderly, very low pitch, british accent',
  mamaTortie: 'female, middle-aged, low pitch, canadian accent',
  papaGinger: 'male, middle-aged, moderate pitch, australian accent',
  grannyGrey: 'female, elderly, high pitch, american accent',
  bigBrotherTiger: 'male, teenager, moderate pitch, australian accent',
  babyPatches: 'female, child, very high pitch, british accent',
  grandpaStripes: 'male, elderly, low pitch, american accent',
};

const HOST_SAMPLE = 'Hooray! The goose is happy!';
const HOST_REF = path.join(out, 'host_ref.wav');

const jsonl = rows => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
fs.mkdirSync(out, { recursive: true });

// step 1: a few takes of the host, so you can pick the one you like best
fs.writeFileSync(path.join(out, 'step1-host.jsonl'), jsonl(
  [1, 2, 3, 4, 5, 6].map(n => ({ id: 'host_take' + n, text: HOST_SAMPLE, instruct: HOST }))));

// step 2: every line. Cats are designed one by one; the host is cloned from the chosen take
// so every toy / boss / outfit line is the *same* woman.
const rows = [];
for (const [key, text] of Object.entries(LINES)) {
  if (key.startsWith('cat_')) {
    const id = key.slice(4);
    if (!CATS[id]) throw new Error('no voice cast for ' + key);
    rows.push({ id: key, text, instruct: CATS[id] });
  } else {
    rows.push({ id: key, text, ref_audio: HOST_REF, ref_text: HOST_SAMPLE });
  }
}
fs.writeFileSync(path.join(out, 'step2-all.jsonl'), jsonl(rows));

console.log(`Wrote ${rows.length} lines to tools/voices/out/.

1. Try the host voice, then keep the take you like:
   omnivoice-infer-batch --model k2-fsa/OmniVoice --test_list tools/voices/out/step1-host.jsonl --res_dir tools/voices/out/step1
   cp tools/voices/out/step1/host_takeN.wav tools/voices/out/host_ref.wav

2. Record everything (re-run any single line by putting just it in a smaller .jsonl):
   omnivoice-infer-batch --model k2-fsa/OmniVoice --test_list tools/voices/out/step2-all.jsonl --res_dir assets/voice

3. Listen through assets/voice/*.wav, then open index.html.`);
