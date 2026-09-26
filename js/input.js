// ════════════════════════════════════════════════
//  INPUT SYSTEM (Keyboard & Mobile Touch)
// ════════════════════════════════════════════════
const Input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  attack: false,
  attackPressed: false
};

const keys = {};

window.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') Input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') Input.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
    Input.jump = true;
    Input.jumpPressed = true;
  }
  if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'KeyJ') {
    Input.attack = true;
    Input.attackPressed = true;
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') Input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') Input.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') Input.jump = false;
  if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'KeyJ') Input.attack = false;
});

// Auto-detect touchscreen (tablet, phone, touchscreen laptop)
let isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

window.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && !isMobile) {
    isMobile = true;
    const touchEl = document.getElementById('touch');
    if (touchEl) touchEl.style.display = 'block';
    if (typeof resize === 'function') resize();
  }
}, { passive: true });

function setupTouch() {
  if (!isMobile) return;
  const touchEl = document.getElementById('touch');
  if (touchEl) touchEl.style.display = 'block';

  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      Input[key] = true;
      if (key === 'jump') Input.jumpPressed = true;
      if (key === 'attack') Input.attackPressed = true;
    });
    el.addEventListener('pointerup', e => {
      e.preventDefault();
      Input[key] = false;
    });
    el.addEventListener('pointerleave', () => { Input[key] = false; });
    el.addEventListener('pointercancel', () => { Input[key] = false; });
  };

  bind('tl', 'left');
  bind('tr', 'right');
  bind('tj', 'jump');
  bind('ta', 'attack');
}
