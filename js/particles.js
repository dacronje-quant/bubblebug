// ════════════════════════════════════════════════
//  PARTICLE SYSTEM
// ════════════════════════════════════════════════
const particles = [];

function emitParticles(x, y, count, color, spread = 3, life = 40) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.5) * spread - 1,
      life: life + Math.random() * 20,
      maxLife: life + 20,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    cx.globalAlpha = alpha;
    cx.fillStyle = p.color;
    cx.beginPath();
    cx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    cx.fill();
  }
  cx.globalAlpha = 1;
}
