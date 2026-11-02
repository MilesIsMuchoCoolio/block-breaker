// ============================================================
// BLOCK BREAKER (Plants vs Zombies Edition)
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const wallnutImage = new Image();
wallnutImage.src = "https://plantsvszombies.fandom.com/wiki/Wall-nut?file=WallNutHD.png";

let score = 0;
let level = 1;
let isGameOver = false;
let isPaused = false;
let countdown = 180;
let isCountingDown = true;

const BALL_SIZE = 10;
const BALL_SPEED_START = 4;
const ball = {
  transform: createTransform(0, 0, BALL_SIZE, BALL_SIZE, 0, 0)
};
let bonusBalls = [];

let shieldHits = 0;
const MAX_SHIELD_HITS = 10;
let timeSlowTimeoutId = null;
let paddleRestoreTimeoutId = null;
let speedBoostTimeoutId = null;
let activeSpeedBoostMultiplier = 1;
let biggerBallTimeoutId = null;
let heatSeekTimeoutId = null;
let heatSeekingBall = false;

function pause() {
  if (isGameOver || isPaused) return;
  isPaused = true;
  lastTime = performance.now();
  leftover = 0;
}

function unpause() {
  if (!isPaused) return;
  isPaused = false;
  lastTime = performance.now();
  leftover = 0;
}

const POWER_UP_TYPES = {
  SPEED: { symbol: "↑", color: "#7CFC00", effect: "Speed Up: boosts the ball for a short time" },
  MULTI: { symbol: "M", color: "#FF69B4", effect: "Multi-ball: temporary extra balls" },
  BIGGER: { symbol: "B", color: "#F59E0B", effect: "Bigger Ball: temporary oversized ball" },
  SCATTER: { symbol: "S", color: "#F97316", effect: "Scatter: launches a fan of balls" },
  HEAT: { symbol: "H", color: "#FF4500", effect: "Heat-seeking: ball homes in on nearby bricks" },
  LASER: { symbol: "L", color: "#FF4500", effect: "Laser: paddle fires a burst that damages bricks" },
  SHIELD: { symbol: "D", color: "#1E90FF", effect: "Shield: prevents 1 lost ball; shields stack" },
  TIME: { symbol: "T", color: "#00BFFF", effect: "Time Slow: slow ball for a short while" },
  MEGA: { symbol: "X", color: "#FF0000", effect: "MEGA: huge temporary buff (very rare)" }
};

const LOOT_TABLE = [
  { type: "SPEED", chance: 18 },
  { type: "MULTI", chance: 16 },
  { type: "BIGGER", chance: 13 },
  { type: "SCATTER", chance: 12 },
  { type: "HEAT", chance: 10 },
  { type: "LASER", chance: 8 },
  { type: "SHIELD", chance: 4 },
  { type: "TIME", chance: 3 },
  { type: "MEGA", chance: 1 }
];

function pickLoot() {
  const total = LOOT_TABLE.reduce((sum, entry) => sum + entry.chance, 0);
  let roll = Math.random() * total;
  for (const entry of LOOT_TABLE) {
    if (roll < entry.chance) return entry.type;
    roll -= entry.chance;
  }
  return LOOT_TABLE[LOOT_TABLE.length - 1].type;
}

function maybeSpawnPowerUp(brickX, brickY, brickWidth, brickHeight) {
  if (Math.random() > 0.7) return;
  const type = pickLoot();
  const data = POWER_UP_TYPES[type] || {};
  powerUps.push({
    x: brickX + brickWidth / 2 - 8,
    y: brickY + brickHeight + 2,
    width: 16,
    height: 16,
    type,
    color: data.color || "#999",
    symbol: data.symbol || "?"
  });
}

function clearTemporaryBallEffects() {
  if (speedBoostTimeoutId) {
    clearTimeout(speedBoostTimeoutId);
    speedBoostTimeoutId = null;
  }
  if (timeSlowTimeoutId) {
    clearTimeout(timeSlowTimeoutId);
    timeSlowTimeoutId = null;
  }
  if (biggerBallTimeoutId) {
    clearTimeout(biggerBallTimeoutId);
    biggerBallTimeoutId = null;
  }
  if (heatSeekTimeoutId) {
    clearTimeout(heatSeekTimeoutId);
    heatSeekTimeoutId = null;
  }
  heatSeekingBall = false;
  activeSpeedBoostMultiplier = 1;
}

function resetBall() {
  ball.transform.width = BALL_SIZE;
  ball.transform.height = BALL_SIZE;
  ball.transform.x = WIDTH / 2 - BALL_SIZE / 2;
  ball.transform.y = HEIGHT / 2 - BALL_SIZE / 2;
  ball.transform.vx = 0;
  ball.transform.vy = 0;
  clearTemporaryBallEffects();
  bonusBalls = [];
}

function launchBall() {
  if (ball.transform.vx !== 0 || ball.transform.vy !== 0) return;
  const speedMultiplier = 1 + (level - 1) * 0.15;
  const baseSpeed = BALL_SPEED_START * speedMultiplier;
  const horizontalSpeed = baseSpeed * 0.85 * (Math.random() < 0.5 ? -1 : 1);
  ball.transform.vx = horizontalSpeed;
  ball.transform.vy = baseSpeed;
  if (!Number.isFinite(ball.transform.vx) || !Number.isFinite(ball.transform.vy)) {
    ball.transform.vx = baseSpeed * 0.85;
    ball.transform.vy = baseSpeed;
  }
}

function nextLevel() {
  level++;
  score += 100 * level;
  isCountingDown = true;
  countdown = 180;
  bricks = makeBricks();
  powerUps = [];
  bonusBalls = [];
  glueMessage = "";
  glueMessageTimer = 0;
  resetBall();
}

function resetGame() {
  score = 0;
  level = 1;
  isGameOver = false;
  isCountingDown = true;
  countdown = 180;
  bricks = makeBricks();
  powerUps = [];
  bonusBalls = [];
  shieldHits = 0;
  glueMessage = "";
  glueMessageTimer = 0;
  resetBall();
}

const paddle = {
  transform: createTransform(WIDTH / 2 - 45, HEIGHT - 30, 90, 12),
  speed: 6
};

let bricks = [];
let powerUps = [];
const keys = {};
let glueMessage = "";
let glueMessageTimer = 0;

function documentKeyHandler(event) {
  keys[event.key.toLowerCase()] = true;
  if (event.key.startsWith("Arrow")) event.preventDefault();
  if (event.code === "Space") {
    event.preventDefault();
    launchBall();
  }
  if (event.key.toLowerCase() === "p") pause();
  if (event.key.toLowerCase() === "o") unpause();
  if (isGameOver && event.key.toLowerCase() === "r") resetGame();
}

document.addEventListener("keydown", documentKeyHandler);
document.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

function updateHeatSeeking() {
  if (!heatSeekingBall || !bricks.length) return;
  let targetBrick = null;
  let bestDistance = Infinity;
  for (const brick of bricks) {
    const b = brick.transform || brick;
    const dx = b.x + b.width / 2 - (ball.transform.x + ball.transform.width / 2);
    const dy = b.y + b.height / 2 - (ball.transform.y + ball.transform.height / 2);
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      targetBrick = brick;
    }
  }
  if (!targetBrick) return;
  const target = targetBrick.transform || targetBrick;
  const dx = target.x + target.width / 2 - (ball.transform.x + ball.transform.width / 2);
  const dy = target.y + target.height / 2 - (ball.transform.y + ball.transform.height / 2);
  const currentAngle = Math.atan2(ball.transform.vy, ball.transform.vx);
  const targetAngle = Math.atan2(dy, dx);
  const angleDelta = normalizeAngle(targetAngle - currentAngle);
  const nextAngle = currentAngle + Math.max(-0.16, Math.min(0.16, angleDelta));
  const speed = Math.hypot(ball.transform.vx, ball.transform.vy) || BALL_SPEED_START;
  ball.transform.vx = Math.cos(nextAngle) * speed;
  ball.transform.vy = Math.sin(nextAngle) * speed;
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function applyBiggerBall() {
  ball.transform.width = BALL_SIZE * 1.8;
  ball.transform.height = BALL_SIZE * 1.8;
  for (const b of bonusBalls) {
    b.transform.width = BALL_SIZE * 1.8;
    b.transform.height = BALL_SIZE * 1.8;
  }
  if (biggerBallTimeoutId) clearTimeout(biggerBallTimeoutId);
  biggerBallTimeoutId = setTimeout(() => {
    ball.transform.width = BALL_SIZE;
    ball.transform.height = BALL_SIZE;
    for (const b of bonusBalls) {
      b.transform.width = BALL_SIZE;
      b.transform.height = BALL_SIZE;
    }
    biggerBallTimeoutId = null;
  }, 8000);
}

function update() {
  if (isGameOver || isPaused) return;
  if (isCountingDown) {
    countdown--;
    if (countdown <= 0) {
      isCountingDown = false;
      resetBall();
      launchBall();
    }
    return;
  }

  movePaddle();
  moveBall();
  updateBonusBalls();
  updateHeatSeeking();
  bounceOffWalls();
  bounceOffPaddle();
  bounceOffBricks();
  updatePowerUps();
  checkPowerUpCollision();

  if (ball.transform.y > HEIGHT) {
    if (shieldHits > 0) {
      shieldHits--;
      ball.transform.y = paddle.transform.y - ball.transform.height;
      ball.transform.vy = -Math.abs(ball.transform.vy);
      glueMessage = `Shield absorbed a miss! ${shieldHits} shield${shieldHits === 1 ? "" : "s"} left`;
      glueMessageTimer = 90;
    } else {
      isGameOver = true;
    }
  }
  if (bricks.length === 0) nextLevel();
}

function movePaddleLeft() {
  paddle.transform.x = Math.max(0, paddle.transform.x - paddle.speed);
}

function movePaddleRight() {
  paddle.transform.x = Math.min(WIDTH - paddle.transform.width, paddle.transform.x + paddle.speed);
}

function movePaddle() {
  if (keys.arrowleft || keys.a) movePaddleLeft();
  if (keys.arrowright || keys.d) movePaddleRight();
}

function moveBall() {
  ball.transform.x += ball.transform.vx;
  ball.transform.y += ball.transform.vy;
}

function updateBonusBalls() {
  for (let i = bonusBalls.length - 1; i >= 0; i--) {
    const b = bonusBalls[i];
    b.transform.x += b.transform.vx;
    b.transform.y += b.transform.vy;
    if (b.transform.x <= 0 || b.transform.x + b.transform.width >= WIDTH) {
      b.transform.vx *= -1;
      b.transform.x = Math.max(0, Math.min(WIDTH - b.transform.width, b.transform.x));
    }
    if (b.transform.y <= 0) {
      b.transform.vy *= -1;
      b.transform.y = 0;
    }
    if (b.transform.y + b.transform.height >= paddle.transform.y &&
        b.transform.x + b.transform.width > paddle.transform.x &&
        b.transform.x < paddle.transform.x + paddle.transform.width && b.transform.vy > 0) {
      b.transform.y = paddle.transform.y - b.transform.height;
      const centerX = b.transform.x + b.transform.width / 2;
      const paddleCenterX = paddle.transform.x + paddle.transform.width / 2;
      const relative = Math.max(-1, Math.min(1, (centerX - paddleCenterX) / (paddle.transform.width / 2)));
      const speed = Math.max(Math.hypot(b.transform.vx, b.transform.vy), BALL_SPEED_START * 1.1);
      b.transform.vx = relative * speed;
      b.transform.vy = -Math.sqrt(Math.max(0.1, speed * speed - b.transform.vx * b.transform.vx));
    }
    for (let j = bricks.length - 1; j >= 0; j--) {
      const brick = bricks[j];
      const brickTransform = brick.transform || brick;
      if (!boxesTouch(b, brick)) continue;
      const overlapX = Math.min(b.transform.x + b.transform.width, brickTransform.x + brickTransform.width) - Math.max(b.transform.x, brickTransform.x);
      const overlapY = Math.min(b.transform.y + b.transform.height, brickTransform.y + brickTransform.height) - Math.max(b.transform.y, brickTransform.y);
      if (overlapX < overlapY) b.transform.vx *= -1;
      else b.transform.vy *= -1;
      maybeSpawnPowerUp(brickTransform.x, brickTransform.y, brickTransform.width, brickTransform.height);
      bricks.splice(j, 1);
      score += 10 * level;
      break;
    }
    if (b.transform.y > HEIGHT + 40) bonusBalls.splice(i, 1);
  }
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    powerUps[i].y += 2.2;
    if (powerUps[i].y > HEIGHT) powerUps.splice(i, 1);
  }
}

function checkPowerUpCollision() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    if (powerUp.x < paddle.transform.x + paddle.transform.width &&
        powerUp.x + powerUp.width > paddle.transform.x &&
        powerUp.y < paddle.transform.y + paddle.transform.height &&
        powerUp.y + powerUp.height > paddle.transform.y) {
      activatePowerUp(powerUp.type);
      powerUps.splice(i, 1);
    }
  }
}

function addBallBurst(count, angleOffset = 0) {
  const speed = Math.hypot(ball.transform.vx, ball.transform.vy) || BALL_SPEED_START;
  const baseAngle = Math.atan2(ball.transform.vy, ball.transform.vx) || 0;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * (Math.PI / 7) + angleOffset;
    bonusBalls.push({
      transform: createTransform(ball.transform.x, ball.transform.y, BALL_SIZE, BALL_SIZE,
        Math.cos(baseAngle + offset) * speed, Math.sin(baseAngle + offset) * speed)
    });
  }
}

function applySpeedBoost(multiplier, durationMs) {
  if (speedBoostTimeoutId) clearTimeout(speedBoostTimeoutId);
  const previousBoost = activeSpeedBoostMultiplier;
  const nextBoost = Math.max(previousBoost, multiplier);
  const scale = previousBoost === 1 ? nextBoost : nextBoost / previousBoost;
  if (scale !== 1) {
    ball.transform.vx *= scale;
    ball.transform.vy *= scale;
    for (const b of bonusBalls) {
      b.transform.vx *= scale;
      b.transform.vy *= scale;
    }
  }
  activeSpeedBoostMultiplier = nextBoost;
  speedBoostTimeoutId = setTimeout(() => {
    ball.transform.vx /= activeSpeedBoostMultiplier;
    ball.transform.vy /= activeSpeedBoostMultiplier;
    for (const b of bonusBalls) {
      b.transform.vx /= activeSpeedBoostMultiplier;
      b.transform.vy /= activeSpeedBoostMultiplier;
    }
    activeSpeedBoostMultiplier = 1;
    speedBoostTimeoutId = null;
  }, durationMs);
}

function activatePowerUp(type) {
  const info = POWER_UP_TYPES[type] || { effect: "Unknown" };
  glueMessage = `${type}: ${info.effect}`;
  glueMessageTimer = 180;
  if (type === "SPEED") {
    applySpeedBoost(1.35, 5000);
  } else if (type === "TIME") {
    ball.transform.vx *= 0.6;
    ball.transform.vy *= 0.6;
    for (const b of bonusBalls) {
      b.transform.vx *= 0.6;
      b.transform.vy *= 0.6;
    }
    if (timeSlowTimeoutId) clearTimeout(timeSlowTimeoutId);
    timeSlowTimeoutId = setTimeout(() => {
      ball.transform.vx /= 0.6;
      ball.transform.vy /= 0.6;
      for (const b of bonusBalls) {
        b.transform.vx /= 0.6;
        b.transform.vy /= 0.6;
      }
      timeSlowTimeoutId = null;
    }, 5000);
  } else if (type === "SHIELD") {
    shieldHits = Math.min(MAX_SHIELD_HITS, shieldHits + 1);
    glueMessage = `Shield gained! ${shieldHits} shield${shieldHits === 1 ? "" : "s"} ready`;
  } else if (type === "MULTI") {
    addBallBurst(2, 0.25);
    score += 150;
  } else if (type === "BIGGER") {
    applyBiggerBall();
    score += 100;
  } else if (type === "SCATTER") {
    addBallBurst(5, 0.95);
    score += 220;
  } else if (type === "HEAT") {
    heatSeekingBall = true;
    if (heatSeekTimeoutId) clearTimeout(heatSeekTimeoutId);
    heatSeekTimeoutId = setTimeout(() => {
      heatSeekingBall = false;
      heatSeekTimeoutId = null;
    }, 8000);
    score += 160;
  } else if (type === "LASER") {
    let destroyed = 0;
    for (let i = 0; i < bricks.length && destroyed < 3; i++) {
      const idx = Math.floor(Math.random() * bricks.length);
      if (bricks[idx]) {
        maybeSpawnPowerUp(bricks[idx].transform.x, bricks[idx].transform.y, bricks[idx].transform.width, bricks[idx].transform.height);
        bricks.splice(idx, 1);
        destroyed++;
        score += 20 * level;
      }
    }
  } else if (type === "MEGA") {
    score += 800;
    shieldHits = Math.min(MAX_SHIELD_HITS, shieldHits + 2);
    paddle.transform.width = Math.min(paddle.transform.width + 80, WIDTH);
    applySpeedBoost(1.25, 8000);
    if (paddleRestoreTimeoutId) clearTimeout(paddleRestoreTimeoutId);
    paddleRestoreTimeoutId = setTimeout(() => {
      paddle.transform.width = 90;
      paddleRestoreTimeoutId = null;
    }, 9000);
  }
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Level: " + level, 16, 24);
  ctx.fillText("Score: " + score, 16, 48);
  if (shieldHits > 0) {
    ctx.fillStyle = "#1E90FF";
    ctx.fillText("Shields: " + shieldHits, 16, 72);
  }
}

function drawCountdown() {
  const secondsLeft = Math.ceil(countdown / 60);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 72px Arial";
  ctx.textAlign = "center";
  ctx.fillText(secondsLeft, WIDTH / 2, HEIGHT / 2);
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Level " + level, WIDTH / 2, HEIGHT / 2 + 50);
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#FF6B6B";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER!", WIDTH / 2, HEIGHT / 2 - 80);
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("Final Level: " + level, WIDTH / 2, HEIGHT / 2 - 20);
  ctx.fillText("Score: " + score, WIDTH / 2, HEIGHT / 2 + 20);
  ctx.fillStyle = "#FFD700";
  ctx.font = "20px Arial";
  ctx.fillText("Press R to Restart", WIDTH / 2, HEIGHT / 2 + 80);
}

function drawPauseScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2 - 20);
  ctx.font = "20px Arial";
  ctx.fillText("Press O to Resume", WIDTH / 2, HEIGHT / 2 + 30);
}

function drawPowerUps() {
  for (const powerUp of powerUps) {
    ctx.fillStyle = powerUp.color || "#999";
    ctx.beginPath();
    ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
    ctx.fill();
    const cx = powerUp.x + powerUp.width / 2;
    const cy = powerUp.y + powerUp.height / 2;
    ctx.fillStyle = "black";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(powerUp.symbol || "?", cx, cy + 4);
  }
}

function drawBonusBalls() {
  for (const b of bonusBalls) {
    ctx.fillStyle = "#FFF";
    ctx.fillRect(b.transform.x, b.transform.y, b.transform.width, b.transform.height);
  }
}

function draw() {
  ctx.fillStyle = "#1a472a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(paddle.transform.x, paddle.transform.y, paddle.transform.width, paddle.transform.height);

  if (wallnutImage.complete && wallnutImage.naturalHeight !== 0) {
    ctx.drawImage(wallnutImage, ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
  } else {
    ctx.fillStyle = "#D2B48C";
    ctx.fillRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
    ctx.strokeRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
  }

  drawBricks();
  drawBonusBalls();
  drawPowerUps();
  if (glueMessageTimer > 0 && glueMessage) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(glueMessage, WIDTH / 2, 30);
    glueMessageTimer--;
    if (glueMessageTimer <= 0) glueMessage = "";
  }
  drawHUD();
  if (isCountingDown) drawCountdown();
  if (isPaused) drawPauseScreen();
  if (isGameOver) drawGameOverScreen();
}

const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover += now - lastTime;
  lastTime = now;
  if (leftover > 250) leftover = 250;
  while (leftover >= STEP) {
    update();
    leftover -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

function start() {
  bricks = makeBricks();
  resetBall();
  isCountingDown = true;
  countdown = 180;
  isGameOver = false;
  isPaused = false;
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);
