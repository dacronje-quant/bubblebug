"""Build local review pages and contact sheets from the browser captures."""
from pathlib import Path
from html import escape
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1] / 'test-output' / 'release-audit'
groups = [('test-safe-area-browser', 'Phone cutouts'), ('test-side-hud-browser', 'Side HUD'), ('test-touch-ground-browser', 'Touch framing'), ('solid-terrain', 'All terrain blocks'), ('room-boundaries', 'Camera boundary views'), ('visual-after', 'Phone, tablet and desktop'), ('world', 'Every room'), ('visual-before', 'Before the fixes')]
cards = []
for folder, title in groups:
    files = sorted((root / folder).glob('*.png'))
    for file in files:
        src = file.relative_to(root).as_posix()
        cards.append(f'<button class="capture" data-group="{folder}" onclick="show(this)"><img loading="lazy" src="{src}" alt="{escape(file.stem)}"><span>{escape(file.stem)}</span></button>')
    for start in range(0, len(files), 16):
        batch = files[start:start+16]
        sheet = Image.new('RGB', (1960, 1224), '#211932')
        draw = ImageDraw.Draw(sheet)
        for i, file in enumerate(batch):
            x, y = (i % 4) * 490, (i // 4) * 306
            im = ImageOps.contain(Image.open(file).convert('RGB'), (480, 270))
            sheet.paste(im, (x + (480-im.width)//2 + 5, y + 5))
            draw.text((x+8, y+280), file.stem, fill='white')
        sheet.save(root / f'{folder}-sheet-{start//16+1}.jpg', quality=90)
html = '''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bubble Paws game visual audit</title><style>
body{margin:24px;background:#181322;color:#f5efff;font:16px system-ui}h1{font-size:28px}p{max-width:850px;line-height:1.5}button{font:inherit;color:inherit;background:#352943;border:1px solid #65547c;border-radius:10px;padding:12px;cursor:pointer}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.capture{display:flex;flex-direction:column;gap:8px}.capture img{width:100%;height:230px;object-fit:contain}.capture[hidden]{display:none}dialog{background:#181322;color:white;border:1px solid #65547c;max-width:95vw;max-height:95vh;padding:12px}dialog img{max-width:90vw;max-height:80vh;object-fit:contain}dialog::backdrop{background:#000c}dialog button{display:block;margin-bottom:8px}input{font:inherit;padding:12px;border-radius:8px;min-width:200px}
</style><h1>Bubble Paws: game visual audit</h1>
<p>Review the real game on phones, tablets and wide desktops, plus captures of all 103 rooms. The side HUD previews include a full inventory and hard-mode health. Click a capture for a larger view.</p>
<p>Wide-screen side HUD, smaller controls with minimal extra floor depth, visible blocked room boundaries, unobstructed mazes and reset-safe touch input. Browser screenshots support visual review; physical device performance and unscripted play remain unverified.</p>
<nav><button onclick="group='test-safe-area-browser';filter()">Phone cutouts</button><button onclick="group='test-side-hud-browser';filter()">Side HUD</button><button onclick="group='test-touch-ground-browser';filter()">Touch framing</button><button onclick="group='solid-terrain';filter()">All terrain blocks</button><button onclick="group='room-boundaries';filter()">Walls and ceilings</button><button onclick="group='visual-after';filter()">Menus and mazes</button><button onclick="group='world';filter()">103 rooms</button><button onclick="group='visual-before';filter()">Before fixes</button><input aria-label="Filter captures" placeholder="Filter by size or room" oninput="filter()"></nav>
<div class="grid">''' + '\n'.join(cards) + '''</div><dialog><button onclick="this.parentElement.close()">Close</button><img><p></p></dialog>
<script>let group='test-side-hud-browser';function filter(){const q=document.querySelector('input').value.toLowerCase();document.querySelectorAll('.capture').forEach(b=>b.hidden=b.dataset.group!==group||!b.textContent.toLowerCase().includes(q))}function show(b){const d=document.querySelector('dialog');d.querySelector('img').src=b.querySelector('img').src;d.querySelector('p').textContent=b.textContent;d.showModal()}filter();</script>'''
(root / 'index.html').write_text(html, encoding='utf-8')
print(f'Created gallery with {len(cards)} captures: {root / "index.html"}')
