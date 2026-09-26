# Bubblebug: Tiny Kingdom 🫧🪲

A wholesome, non-violent 2D exploration platformer designed specifically for young children (ages 3–7) and little explorers!

Explore a magical insect kingdom, blow friendly bubbles to cheer up grumpy bugs, discover ancient insect elders, and unlock magical movement abilities.

![HTML5](https://img.shields.io/badge/Platform-HTML5%20Canvas-orange)
![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-blue)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)
![Target Age](https://img.shields.io/badge/Audience-Ages%203--7-ff69b4)

---

## ✨ Features

- **🫧 Friendship-Based "Combat":** No violence, enemies, or dying. When you blow bubbles at grumpy bugs, they cheer up, sprout hearts, and become lifelong friends!
- **📖 100% Visual & Intuitive:** Completely playable without reading. Every objective, path, and ability is communicated through emojis, animations, and color cues.
- **🗺️ 30 Interconnected Rooms across 6 Zones:**
  - 🌿 **Sparkle Gardens** (Tutorial & basic movement)
  - 🍄 **Mushroom Meadow** (Bouncy mushroom jumping & 🦋 **Double Jump**)
  - 💎 **Crystal Caves** (Glowing caverns & 🐌 **Wall Climbing**)
  - 🍯 **Honey Hive** (Buzzing honey corridors & 🪲 **Glow Aura**)
  - 🌧️ **Rainy Ruins** (Gentle raindrop ruins & 🌸 **Dandelion Float**)
  - ☁️ **Cloud Kingdom** (Ascending cloud castles & the playful **Cloud King**)
- **👶 Forgiving, Kid-Friendly Physics:**
  - Generous jump heights and soaring double jumps.
  - Smart **Ledge Assist** (prevents tripping on platform edges).
  - Variable jump height (short hops on tap, high jumps on hold).
  - Falling off a bottom edge gently floats you back to safety.
- **📱 Universal Controls:**
  - **Keyboard:** Arrow keys / `A`-`D` to move, Up / `W` / `Space` to jump, `Z` / `X` / `J` to blow bubbles.
  - **Touch:** Chunky on-screen circular buttons automatically appear on tablets, iPads, and touchscreens.
- **💾 Cozy Bench Auto-Save:** Walking past any garden bench automatically saves progress to `localStorage`.
- **🎵 Synthesized Web Audio API:** Cheerful chimes, jump boops, and ambient melodies synthesized in real time — zero external audio assets required.

---

## 🚀 How to Play

### Direct Play (No Installation Required!)
Simply double-click `index.html` in your file browser (or open with Chrome, Edge, Safari, or Firefox).

### GitHub Pages (Instant Web Hosting)
1. In your GitHub repository settings, go to **Pages**.
2. Select **Source: Deploy from a branch** and choose `main` / `/ (root)`.
3. Click **Save** — your game is instantly playable online at `https://<your-username>.github.io/bubblebug/`!

---

## 📂 Project Structure

```
bubblebug/
├── index.html          # HTML5 entrypoint & responsive canvas wrapper
├── css/
│   └── style.css       # Clean responsive styles, animations, touch UI
└── js/
    ├── constants.js    # Physics tuning & zone color palettes
    ├── audio.js        # Web Audio API chime synthesizer & zone music
    ├── input.js        # Keyboard & touch input handling
    ├── particles.js    # Sparkle, heart & celebration particle system
    ├── rooms.js        # 30 verified room tilemaps (30x17 grid)
    ├── player.js       # Player state, physics, collision & ledge assist
    ├── entities.js     # Grumpy bug AI, elder interactions & bubble system
    ├── render.js       # Vector sprite rendering, backgrounds, UI & rain
    └── game.js         # Core game loop, room transitions & auto-save
```

---

## 📄 License

MIT License — Feel free to enjoy, share, and expand for young explorers everywhere! 🫧
