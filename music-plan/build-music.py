#!/usr/bin/env python3
"""Build the game's region music from Lyria takes.

    python3 music-plan/build-music.py [takes-dir]

For each track in lyria-plan.json: cut a seamless loop (make-loop.py),
match loudness across regions, encode a 128 kbps MP3 and wrap it in
assets/music/<id>.js. The game loads that script only when the region is
first heard, so it also works when index.html is opened straight from disk.
"""
import base64, json, os, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
takes = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'takes')
plan = json.load(open(os.path.join(HERE, 'lyria-plan.json')))
out = os.path.join(ROOT, 'assets', 'music')
os.makedirs(out, exist_ok=True)
TARGET_DB = -17.0  # median loudness (1 s windows) of every loop
SR = 44100
manifest = []
with tempfile.TemporaryDirectory() as tmp:
    for t in plan['tracks']:
        src = next((os.path.join(takes, f) for f in sorted(os.listdir(takes)) if f.startswith(t['id'] + '-') and f.endswith(('.mp3', '.wav'))), None)
        if not src: sys.exit('missing take for ' + t['id'])
        loop = os.path.join(tmp, t['id'] + '.wav')
        info = json.loads(subprocess.run([sys.executable, os.path.join(HERE, 'make-loop.py'), src, loop] + t.get('loopArgs', []), capture_output=True, text=True, check=True).stdout)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', loop, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
        mono = x.mean(1)
        n = len(mono) // SR * SR
        db = 20 * np.log10(np.sqrt((mono[:n].reshape(-1, SR) ** 2).mean(1)) + 1e-9)
        gain = min(10 ** ((TARGET_DB - np.median(db)) / 20), 0.95 / np.abs(x).max())
        x *= gain
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
        mp3 = os.path.join(tmp, t['id'] + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', mp3], input=pcm, check=True)
        b64 = base64.b64encode(open(mp3, 'rb').read()).decode()
        frames = len(x)
        with open(os.path.join(out, t['id'] + '.js'), 'w') as f:
            f.write('// %s (%s): Lyria 3.5 take, seamless %.1f s loop. Built by music-plan/build-music.py.\n' % (t['zone'], t['id'], frames / SR))
            f.write('(window.BB_MUSIC = window.BB_MUSIC || {})[%s] = { frames: %d, rate: %d, mp3: "%s" };\n' % (json.dumps(t['id']), frames, SR, b64))
        manifest.append({'id': t['id'], 'zone': t['zone'], 'seconds': round(frames / SR, 2), 'loopFrom': info['start'], 'loopTo': info['end'], 'seamJump': info['seamJump'], 'gainDb': round(20 * np.log10(gain), 2)})
        print('%-10s %5.1f s  seam %.2f  gain %+.1f dB' % (t['id'], frames / SR, info['seamJump'], 20 * np.log10(gain)))
json.dump({'model': plan['model'], 'tracks': manifest}, open(os.path.join(out, 'manifest.json'), 'w'), indent=2)
