'use strict';
const fs = require('node:fs'), path = require('node:path');
const game = path.resolve(__dirname, '..');
const family = JSON.parse(fs.readFileSync(path.join(__dirname, 'family-prompts.json'), 'utf8'));
const story = JSON.parse(fs.readFileSync(path.join(__dirname, 'story-voices.json'), 'utf8'));
const clips = {};
fs.mkdirSync(path.join(game, 'assets/voice'), { recursive: true });
for (const c of [...story, ...family]) {
  const isStory = c.id.startsWith('story_'), id = isStory ? c.id : 'cat_' + c.id;
  const source = isStory ? 'samples/story/' + c.id + '.mp3' : c.recordingFile || 'samples/family/' + (c.auditionId || c.id) + '.mp3';
  const file = 'assets/voice/' + id + path.extname(source);
  fs.copyFileSync(path.join(__dirname, source), path.join(game, file));
  clips[id] = { file, text: c.text, source: c.source || 'gpt-4o-mini-tts' };
}
if (Object.keys(clips).length !== 20) throw new Error('Expected 20 approved clips.');
fs.writeFileSync(path.join(game, 'js/core/voice-clips.js'), '// Approved story voices; original baby WAVs are preserved unchanged.\nwindow.BB.VOICE_CLIPS = ' + JSON.stringify(clips, null, 2) + ';\n');
console.log('Installed 20 approved recordings; preserved both original baby WAVs.');
