// ============================================================
// effects.js: lightweight arcade visuals for the canvas game
// ============================================================

let visualParticles = [];
let ballTrail = [];
let screenShakeStrength = 0;
let effectFrame = 0;

function triggerScreenShake(strength = 6) {
  screenShakeStrength = Math.max(screenShakeStrength, strength);
}

function spawnGameParticles(x, y, color = "#FFD166", count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.5;
    const life = 18 + Math.floor(Math.random() * 18);
    visualParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1.5 + Math.random() * 3,
      color
    });
  }

  // Keep the effect bounded if a lot of bricks are hit at once.
  if (visualParticles.length > 500) {
    visualParticles.splice(0, visualParticles.length - 500);
  }
}

function updateGameEffects() {
  effectFrame++;
  for (let i = visualParticles.length - 1; i >= 0; i--) {
    const particle = visualParticles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.97;
    particle.vy = particle.vy * 0.97 + 0.035;
    particle.life--;
    if (particle.life <= 0) visualParticles.splice(i, 1);
  }

  if (screenShakeStrength > 0.15) {
    screenShakeStrength *= 0.82;
  } else {
    screenShakeStrength = 0;
  }

  const transform = ball.transform;
  if (Math.hypot(transform.vx, transform.vy) > 0.1) {
    ballTrail.push({
      x: transform.x + transform.width / 2,
      y: transform.y + transform.height / 2,
      life: 12
    });
  }
  for (let i = ballTrail.length - 1; i >= 0; i--) {
    ballTrail[i].life--;
    if (ballTrail[i].life <= 0) ballTrail.splice(i, 1);
  }
  if (ballTrail.length > 18) ballTrail.splice(0, ballTrail.length - 18);
}

function drawBallTrail() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < ballTrail.length - 1; i++) {
    const point = ballTrail[i];
    const progress = (i + 1) / ballTrail.length;
    const radius = 1.5 + progress * 4;
    ctx.globalAlpha = (point.life / 12) * 0.34;
    ctx.fillStyle = "#FFD98A";
    ctx.shadowColor = "#FF9F43";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawImpactParticles() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const particle of visualParticles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAmbientEffects() {
  const time = effectFrame / 60;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    const x = ((i * 137 + time * (8 + (i % 3) * 3)) % WIDTH);
    const y = 35 + ((i * 83 + Math.sin(time + i) * 18) % (HEIGHT - 70));
    const pulse = 0.35 + (Math.sin(time * 2 + i * 1.7) + 1) * 0.22;
    ctx.globalAlpha = pulse * 0.22;
    ctx.fillStyle = i % 3 === 0 ? "#FFE27A" : "#A9F5A2";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Add a gentle pulsing halo to falling power-ups without changing their behavior.
const drawPowerUpsWithGlow = drawPowerUps;
drawPowerUps = function() {
  drawPowerUpsWithGlow();
  const pulse = 0.5 + (Math.sin(performance.now() / 120) + 1) * 0.25;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const powerUp of powerUps) {
    const cx = powerUp.x + powerUp.width / 2;
    const cy = powerUp.y + powerUp.height / 2;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = powerUp.color || "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.shadowColor = powerUp.color || "#FFFFFF";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, powerUp.width * (0.62 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

// Wrap the fixed-step update and renderer so the effects stay separate from gameplay.
const updateWithVisualEffects = update;
update = function() {
  updateWithVisualEffects();
  if (!isPaused && !isGameOver) updateGameEffects();
};

const drawWithVisualEffects = draw;
draw = function() {
  if (screenShakeStrength > 0) {
    const shakeX = (Math.random() - 0.5) * screenShakeStrength * 2;
    const shakeY = (Math.random() - 0.5) * screenShakeStrength * 2;
    canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
  } else {
    canvas.style.transform = "";
  }

  drawWithVisualEffects();
  drawAmbientEffects();
  drawBallTrail();
  drawImpactParticles();
};
