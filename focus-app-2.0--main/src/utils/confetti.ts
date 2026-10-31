/**
 * Lightweight zero-dependency confetti particle burst
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
  decay: number;
}

export function triggerConfetti(originX?: number, originY?: number) {
  let canvas = document.getElementById('focus-confetti-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'focus-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);

  const startX = originX ?? w / 2;
  const startY = originY ?? h / 2;

  const colors = ['#ff7e6b', '#ffb88c', '#4ecdc4', '#8b90d6', '#ffd166', '#06d6a0'];
  const particles: Particle[] = [];
  const count = 75;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 8 + 4;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      radius: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01,
    });
  }

  let animFrameId: number;
  function update() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    let activeCount = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animFrameId = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, w, h);
      cancelAnimationFrame(animFrameId);
    }
  }

  update();
}
