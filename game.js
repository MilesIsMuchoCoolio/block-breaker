// ============================================================
// BLOCK BREAKER (Plants vs Zombies Edition)
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Load wall-nut style ball image
const wallnutImage = new Image();
wallnutImage.src =
  "https://plantsvszombies.fandom.com/wiki/Wall-nut?file=WallNutHD.png";

let score = 0;
let level = 1;
let isGameOver = false;
let isPaused = false;

let countdown = 180;
let isCountingDown = true;

// Ball starts at size 10px (bigger than before)
const BALL_SIZE = 10;
const BALL_SPEED_START = 4;

const ball = {
  transform: createTransform(0, 0, BALL_SIZE, BALL_SIZE, 0, 0),
  isGlue: false
};

let bonusBalls = [];

// --- Gambling / Loot Chest state & config ---
let isGambleScreen = false;         // true while the post-level gamble UI is visible
let gambleInProgress = false;      // true while the chest-opening animation is running
let gambleSelected = null;         // picks the power-up type after reveal
let gambleAnimationStep = 0;       // animation counter
let gambleRevealTimer = 0;         // shows revealed item for a short time

function pause() {
  if (isGameOver || isPaused) {
    return;
  }

  isPaused = true;
  lastTime = performance.now();
  leftover = 0;
}

function unpause() {
  if (!isPaused) {
    return;
  }

  isPaused = false;
  lastTime = performance.now();
  leftover = 0;
}

// Cost fixed to 150
function getGambleCost() {
  return 150;
}

// Starting power-up is speed up; the others are locked until you intentionally unlock them.
const POWER_UP_TYPES = {
  SPEED: { symbol: "↑", color: "#7CFC00", effect: "Speed Up: boosts the ball for a short time" },
  MULTI: { symbol: "M", color: "#FF69B4", effect: "Multi-ball: temporary extra balls" },
  LASER: { symbol: "L", color: "#FF4500", effect: "Laser: paddle fires a burst that damages bricks" },
  SHIELD: { symbol: "S", color: "#1E90FF", effect: "Shield: prevents 1 lost ball" },
  TIME:  { symbol: "T", color: "#00BFFF", effect: "Time Slow: slow ball for a short while" },
  SPLIT: { symbol: "P", color: "#FFD700", effect: "Split: current ball splits into multiple balls" },
  MEGA:  { symbol: "X", color: "#FF0000", effect: "MEGA: huge temporary buff (very rare)" }
};

const LOOT_TABLE = [
  { type: "SPEED", chance: 100 }
];

function pickLoot() {
  const total = LOOT_TABLE.reduce((s, e) => s + e.chance, 0);
  let r = Math.random() * total;
  for (const e of LOOT_TABLE) {
    if (r < e.chance) return e.type;
    r -= e.chance;
  }
  return LOOT_TABLE[LOOT_TABLE.length - 1].type;
}

function maybeSpawnPowerUp(brickX, brickY, brickWidth, brickHeight) {
  if (Math.random() > 0.7) {
    return;
  }

  const type = pickLoot();
  const powerUpData = POWER_UP_TYPES[type] || {};

  powerUps.push({
    x: brickX + brickWidth / 2 - 8,
    y: brickY + brickHeight + 2,
    width: 16,
    height: 16,
    type,
    color: powerUpData.color || "#999",
    symbol: powerUpData.symbol || "?"
  });
}

// Timers for some temporary effects
let shieldHits = 0;
let timeSlowTimeoutId = null;
let paddleRestoreTimeoutId = null;
let speedBoostTimeoutId = null;
let activeSpeedBoostMultiplier = 1;

function clearTemporaryBallEffects() {
  if (speedBoostTimeoutId) {
    clearTimeout(speedBoostTimeoutId);
    speedBoostTimeoutId = null;
  }

  if (timeSlowTimeoutId) {
    clearTimeout(timeSlowTimeoutId);
    timeSlowTimeoutId = null;
  }

  activeSpeedBoostMultiplier = 1;
}

function resetBall() {
  ball.transform.x = WIDTH / 2 - ball.transform.width / 2;
  ball.transform.y = HEIGHT / 2 - ball.transform.height / 2;

  ball.transform.vx = 0;
  ball.transform.vy = 0;
  ball.isGlue = false;

  clearTemporaryBallEffects();
  bonusBalls = [];
}

function launchBall() {
  if (ball.transform.vx !== 0 || ball.transform.vy !== 0) {
    return;
  }

  const speedMultiplier = 1 + (level - 1) * 0.15;
  const baseSpeed = BALL_SPEED_START * speedMultiplier;
  const launchDirection = Math.random() < 0.5 ? -1 : 1;
  const horizontalSpeed = baseSpeed * 0.85 * launchDirection;

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
  glueMode = false;
  if (glueIntervalId) {
    clearInterval(glueIntervalId);
    glueIntervalId = null;
  }
  glueProjectiles = [];
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
  glueMode = false;
  if (glueIntervalId) {
    clearInterval(glueIntervalId);
    glueIntervalId = null;
  }
  glueProjectiles = [];
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

let glueMode = false;
let glueIntervalId = null;
let glueProjectiles = [];
let glueMessage = "";
let glueMessageTimer = 0;

function spawnGlueSquirt() {
  if (!bricks || bricks.length === 0) return;

  const targetIndex = Math.floor(Math.random() * bricks.length);
  const target = bricks[targetIndex];
  if (!target) return;

  const targetTransform = target.transform || target;
  const startX = ball.transform.x + ball.transform.width / 2;
  const startY = ball.transform.y + ball.transform.height / 2;

  const tx = targetTransform.x + targetTransform.width / 2;
  const ty = targetTransform.y + targetTransform.height / 2;

  let dx = tx - startX;
  let dy = ty - startY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= dist;
  dy /= dist;

  const speed = 3.0;

  glueProjectiles.push({
    x: startX - 4,
    y: startY - 4,
    width: 8,
    height: 8,
    vx: dx * speed,
    vy: dy * speed,
    targetIndex: targetIndex
  });
}

function updateGlueProjectiles() {
  for (let i = glueProjectiles.length - 1; i >= 0; i--) {
    const p = glueProjectiles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.y > HEIGHT || p.y < -20 || p.x < -20 || p.x > WIDTH + 20) {
      glueProjectiles.splice(i, 1);
      continue;
    }

    const tryIndexes = [p.targetIndex];
    for (let j = 0; j < bricks.length; j++) {
      if (j !== p.targetIndex) tryIndexes.push(j);
    }

    let hit = false;
    for (const j of tryIndexes) {
      if (j < 0 || j >= bricks.length) continue;
      const brick = bricks[j];
      const b = brick.transform || brick;
      if (
        p.x < b.x + b.width &&
        p.x + p.width > b.x &&
        p.y < b.y + b.height &&
        p.y + p.height > b.y
      ) {
        if (typeof handleBrickHit === "function") {
          handleBrickHit(j);
        } else {
          bricks.splice(j, 1);
          score += 10 * level;
        }

        glueMessage = "get squirted on bozo";
        glueMessageTimer = 120;

        glueProjectiles.splice(i, 1);
        hit = true;
        break;
      }
    }

    if (hit) continue;
  }
}

function drawGlueProjectiles() {
  for (const p of glueProjectiles) {
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(p.x + p.width / 4, p.y + 1, 2, 2);
  }
}

function documentKeyHandler(event) {
  keys[event.key.toLowerCase()] = true;
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
  if (event.code === "Space") {
    event.preventDefault();
    launchBall();
  }

  if (event.key.toLowerCase() === "p") {
    pause();
  }

  if (event.key.toLowerCase() === "o") {
    unpause();
  }

  if (isGameOver && event.key.toLowerCase() === "r") {
    resetGame();
  }
}

document.addEventListener("keydown", documentKeyHandler);

canvas.addEventListener("click", function (evt) {
  if (!isGambleScreen) return;
  if (gambleInProgress) return;

  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  const buttonW = 160;
  const buttonH = 40;
  const openX = WIDTH / 2 - buttonW / 2;
  const openY = HEIGHT / 2 + 60;
  const skipX = WIDTH / 2 - buttonW / 2;
  const skipY = HEIGHT / 2 + 110;

  if (x >= openX && x <= openX + buttonW && y >= openY && y <= openY + buttonH) {
    const cost = getGambleCost();
    if (score >= cost) {
      startGamble(cost);
    } else {
      glueMessage = "Not enough score to open chest";
      glueMessageTimer = 120;
    }
  }

  if (x >= skipX && x <= skipX + buttonW && y >= skipY && y <= skipY + buttonH) {
    isGambleScreen = false;
    nextLevel();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function update() {
  if (isGameOver || isPaused) {
    return;
  }

  if (isGambleScreen) {
    if (gambleInProgress) {
      gambleAnimationStep++;
    }
    if (gambleRevealTimer > 0) gambleRevealTimer--;
    return;
  }

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

  bounceOffWalls();
  bounceOffPaddle();
  bounceOffBricks();

  updatePowerUps();
  checkPowerUpCollision();

  if (glueMode) {
    updateGlueProjectiles();
  }

  if (ball.transform.y > HEIGHT) {
    if (shieldHits > 0) {
      shieldHits--;
      ball.transform.y = paddle.transform.y - ball.transform.height;
      ball.transform.vy = -Math.abs(ball.transform.vy);
      glueMessage = "Shield absorbed a miss!";
      glueMessageTimer = 90;
    } else {
      isGameOver = true;
    }
  }

  if (bricks.length === 0) {
    isGambleScreen = true;
    gambleInProgress = false;
    gambleSelected = null;
    gambleAnimationStep = 0;
    gambleRevealTimer = 0;
    return;
  }
}

function movePaddleLeft() {
  paddle.transform.x -= paddle.speed;

  if (paddle.transform.x < 0) {
    paddle.transform.x = 0;
  }
}

function movePaddleRight() {
  paddle.transform.x += paddle.speed;

  if (paddle.transform.x + paddle.transform.width > WIDTH) {
    paddle.transform.x = WIDTH - paddle.transform.width;
  }
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    movePaddleLeft();
  }
  if (keys["arrowright"] || keys["d"]) {
    movePaddleRight();
  }
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
        b.transform.x < paddle.transform.x + paddle.transform.width &&
        b.transform.vy > 0) {
      b.transform.y = paddle.transform.y - b.transform.height;
      const ballCenterX = b.transform.x + b.transform.width / 2;
      const paddleCenterX = paddle.transform.x + paddle.transform.width / 2;
      const relative = Math.max(-1, Math.min(1, (ballCenterX - paddleCenterX) / (paddle.transform.width / 2)));
      const speed = Math.max(Math.hypot(b.transform.vx, b.transform.vy), BALL_SPEED_START * 1.1);
      b.transform.vx = relative * speed;
      const vyAbs = Math.sqrt(Math.max(0.1, speed * speed - b.transform.vx * b.transform.vx));
      b.transform.vy = -vyAbs;
    }

    for (let j = bricks.length - 1; j >= 0; j--) {
      const brick = bricks[j];
      const brickTransform = brick.transform || brick;
      if (!boxesTouch(b, brick)) continue;

      const overlapX = Math.min(b.transform.x + b.transform.width, brickTransform.x + brickTransform.width) - Math.max(b.transform.x, brickTransform.x);
      const overlapY = Math.min(b.transform.y + b.transform.height, brickTransform.y + brickTransform.height) - Math.max(b.transform.y, brickTransform.y);
      if (overlapX < overlapY) {
        b.transform.vx *= -1;
      } else {
        b.transform.vy *= -1;
      }

      maybeSpawnPowerUp(brickTransform.x, brickTransform.y, brickTransform.width, brickTransform.height);
      bricks.splice(j, 1);
      score += 10 * level;
      break;
    }

    if (b.transform.y > HEIGHT + 40) {
      bonusBalls.splice(i, 1);
    }
  }
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    powerUps[i].y += 2.2;

    if (powerUps[i].y > HEIGHT) {
      powerUps.splice(i, 1);
    }
  }
}

function checkPowerUpCollision() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];

    if (
      powerUp.x < paddle.transform.x + paddle.transform.width &&
      powerUp.x + powerUp.width > paddle.transform.x &&
      powerUp.y < paddle.transform.y + paddle.transform.height &&
      powerUp.y + powerUp.height > paddle.transform.y
    ) {
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
    const vx = Math.cos(baseAngle + offset) * speed;
    const vy = Math.sin(baseAngle + offset) * speed;
    bonusBalls.push({
      transform: createTransform(ball.transform.x, ball.transform.y, BALL_SIZE, BALL_SIZE, vx, vy),
      isGlue: false
    });
  }
}

function applySpeedBoost(multiplier, durationMs) {
  if (speedBoostTimeoutId) {
    clearTimeout(speedBoostTimeoutId);
  }

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
    shieldHits = Math.max(shieldHits, 1);
  } else if (type === "MULTI") {
    addBallBurst(2, 0.25);
    score += 150;
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
  } else if (type === "SPLIT") {
    addBallBurst(3, 0.4);
    score += 120;
  } else if (type === "MEGA") {
    score += 800;
    shieldHits = Math.max(shieldHits, 2);
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

function drawGambleScreen() {
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#2b6f3a";
  const panelW = 480;
  const panelH = 280;
  const px = WIDTH / 2 - panelW / 2;
  const py = HEIGHT / 2 - panelH / 2;
  roundRect(ctx, px, py, panelW, panelH, 10, true, false);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Level Cleared! Open a Loot Chest?", WIDTH / 2, py + 36);

  const cost = getGambleCost();
  ctx.font = "16px Arial";
  ctx.fillText(`Open chest for ${cost} score`, WIDTH / 2, py + 66);

  const centerX = WIDTH / 2;
  const centerY = py + 130;
  const radius = 80;
  const items = LOOT_TABLE.map(e => e.type);
  const spinSpeed = 0.12;
  const baseAngle = gambleAnimationStep * spinSpeed;

  for (let i = 0; i < items.length; i++) {
    const angle = baseAngle + (i / items.length) * Math.PI * 2;
    let tx = centerX + Math.cos(angle) * radius;
    let ty = centerY + Math.sin(angle) * radius;
    const type = items[i];
    const info = POWER_UP_TYPES[type];

    if (gambleSelected && type === gambleSelected) {
      const t = Math.min(1, gambleAnimationStep / 20);
      tx = lerp(tx, centerX, t);
      ty = lerp(ty, centerY, t);
    }

    ctx.beginPath();
    ctx.fillStyle = info.color || "#fff";
    ctx.arc(tx, ty, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(info.symbol || "?", tx, ty + 5);
  }

  const chestX = centerX - 36;
  const chestY = centerY + 50;
  ctx.fillStyle = "#8B4513";
  roundRect(ctx, chestX, chestY, 72, 44, 6, true, false);
  ctx.fillStyle = "#A0522D";
  roundRect(ctx, chestX - 4, chestY - 12, 80, 18, 6, true, false);

  const buttonW = 160;
  const buttonH = 40;
  const openX = WIDTH / 2 - buttonW / 2;
  const openY = HEIGHT / 2 + 60;
  const skipX = WIDTH / 2 - buttonW / 2;
  const skipY = HEIGHT / 2 + 110;

  ctx.fillStyle = score >= cost ? "#FFD700" : "#666";
  roundRect(ctx, openX, openY, buttonW, buttonH, 6, true, false);
  ctx.fillStyle = score >= cost ? "black" : "#ddd";
  ctx.font = "18px Arial";
  ctx.fillText("Open Chest", WIDTH / 2, openY + 26);

  ctx.fillStyle = "#ccc";
  roundRect(ctx, skipX, skipY, buttonW, buttonH, 6, true, false);
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Skip (No Gamble)", WIDTH / 2, skipY + 26);

  if (gambleRevealTimer > 0 && gambleSelected) {
    const info = POWER_UP_TYPES[gambleSelected];
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    roundRect(ctx, centerX - 160, py + panelH - 120, 320, 60, 6, true, false);
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${gambleSelected}: ${info.effect}`, centerX, py + panelH - 86);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function startGamble(cost) {
  score -= cost;
  gambleInProgress = true;
  gambleSelected = null;
  gambleAnimationStep = 0;
  gambleRevealTimer = 0;

  const spinDurationMs = 900;
  setTimeout(() => {
    gambleSelected = pickLoot();
    gambleRevealTimer = 108;

    setTimeout(() => {
      if (gambleSelected) {
        activatePowerUp(gambleSelected);
      }
      gambleInProgress = false;
      gambleSelected = null;
      isGambleScreen = false;
      nextLevel();
    }, 1800);
  }, spinDurationMs);
}

function draw() {
  ctx.fillStyle = "#1a472a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#FFD700";
  ctx.fillRect(paddle.transform.x, paddle.transform.y, paddle.transform.width, paddle.transform.height);

  if (ball.isGlue) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
    ctx.strokeStyle = "#DDD";
    ctx.strokeRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
  } else if (wallnutImage.complete && wallnutImage.naturalHeight !== 0) {
    ctx.drawImage(wallnutImage, ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
  } else {
    ctx.fillStyle = "#D2B48C";
    ctx.fillRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
    ctx.strokeRect(ball.transform.x, ball.transform.y, ball.transform.width, ball.transform.height);
  }

  drawBricks();
  drawBonusBalls();
  drawPowerUps();

  if (glueMode) {
    drawGlueProjectiles();
  }

  if (glueMessageTimer > 0 && glueMessage) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(glueMessage, WIDTH / 2, 30);
    glueMessageTimer--;
    if (glueMessageTimer <= 0) {
      glueMessage = "";
    }
  }

  drawHUD();

  if (isCountingDown) {
    drawCountdown();
  }

  if (isGambleScreen) {
    drawGambleScreen();
  }

  if (isPaused) {
    drawPauseScreen();
  }

  if (isGameOver) {
    drawGameOverScreen();
  }
}

const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover += now - lastTime;
  lastTime = now;

  if (leftover > 250) {
    leftover = 250;
  }

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
