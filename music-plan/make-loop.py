#!/usr/bin/env python3
"""Turn a Lyria take into a seamless loop.

    python3 music-plan/make-loop.py in.mp3 out.wav [--min=60] [--max=100]

Skips any intro and ending, then searches for a start and end point where
the music sounds the same (spectrum over a few seconds, then waveform
alignment to the sample). The end is blended into the start with an
equal-power crossfade, so the loop plays straight through the seam.
Prints the loop length and a seam score (lower is smoother).
"""
import json, subprocess, sys
import numpy as np

SR = 44100
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=') for a in sys.argv[1:] if a.startswith('--'))
src, dst = args
lo, hi = float(opt.get('min', 60)), float(opt.get('max', 100))
XF = float(opt.get('xf', 3.0))

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
mono = x.mean(1)
n = len(mono)

# short-time spectra (log magnitude, 0.1 s hop) for musical similarity
HOP, WIN = SR // 10, 4096
frames = np.lib.stride_tricks.sliding_window_view(np.pad(mono, (0, WIN)), WIN)[::HOP]
spec = np.log1p(np.abs(np.fft.rfft(frames * np.hanning(WIN), axis=1))[:, 4:900])
# fold into ~60 log-spaced bands so tiny pitch wobble doesn't matter
edges = np.unique(np.geomspace(1, spec.shape[1], 61).astype(int))
bands = np.stack([spec[:, a:b].mean(1) for a, b in zip(edges[:-1], edges[1:])], 1)
bands = (bands - bands.mean(1, keepdims=True))
bands /= np.linalg.norm(bands, axis=1, keepdims=True) + 1e-9
rms = np.sqrt((frames ** 2).mean(1))
loud = np.convolve(rms, np.ones(20) / 20, 'same')
steady = np.median(loud[len(loud) // 4: 3 * len(loud) // 4])

def ctx(i, w=30):  # 3 s of context before a point (what you hear leading into it)
    return bands[i - w:i].ravel()

best = None
fs = len(bands)
for s in range(60, min(220, fs // 3), 2):          # start between 6 and 22 s
    if loud[s] < 0.6 * steady: continue           # still in a quiet intro
    a_after = bands[s:s + 30].ravel()
    for e in range(s + int(lo * 10), min(s + int(hi * 10), fs - 80 - int(XF * 10))):
        if loud[e] < 0.6 * steady or loud[e + int(XF * 10)] < 0.6 * steady: continue
        # what follows the end must sound like what follows the start
        score = 1 - np.dot(a_after, bands[e:e + 30].ravel()) / 30
        score += 0.5 * abs(np.log((loud[e] + 1e-6) / (loud[s] + 1e-6)))
        if best is None or score < best[0]: best = (score, s, e)
score, s, e = best
s, e = s * HOP, e * HOP
# fine waveform alignment of the end (±25 ms) to the start
W = 4096
ref = mono[s:s + W]
cands = range(-int(0.025 * SR), int(0.025 * SR))
corr = [np.dot(ref, mono[e + d:e + d + W]) / (np.linalg.norm(mono[e + d:e + d + W]) * np.linalg.norm(ref) + 1e-9) for d in cands]
e += list(cands)[int(np.argmax(corr))]
xf = int(XF * SR)
loop = x[s:e].copy()
tail = x[e:e + xf]
t = np.linspace(0, np.pi / 2, xf)[:, None]
loop[:xf] = loop[:xf] * np.sin(t) + tail * np.cos(t)
# gentle level match to the game's music bed
peak = np.abs(loop).max()
loop *= min(1.0, 0.89 / peak)
pcm = (np.clip(loop, -1, 1) * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', '-', dst], input=pcm, check=True)
# seam check: spectral jump across the wrap vs typical frame-to-frame change
wrap = np.concatenate([loop[-SR:], loop[:SR]]).mean(1)
def flux(sig):
    f = np.lib.stride_tricks.sliding_window_view(sig, 2048)[::512]
    m = np.abs(np.fft.rfft(f * np.hanning(2048), axis=1))
    return np.sqrt((np.diff(m, axis=0) ** 2).sum(1))
fl = flux(wrap)
print(json.dumps({'file': dst, 'start': round(s / SR, 2), 'end': round(e / SR, 2), 'length': round(len(loop) / SR, 2),
                  'match': round(float(score), 3), 'seamJump': round(float(fl[len(fl) // 2 - 2:len(fl) // 2 + 2].max() / np.median(fl)), 2)}))
