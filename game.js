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

let countdown = 180;
let isCountingDown = true;

// Ball starts at size 10px (bigger than before)
const BALL_SIZE = 10;
const BALL_SPEED_START = 4;

const ball = {
  transform: createTransform(0, 0, BALL_SIZE, BALL_SIZE, 0, 0),
  isGlue: false
};

// --- Gambling / Loot Chest state & config ---
let isGambleScreen = false;         // true while the post-level gamble UI is visible
let gambleInProgress = false;      // true while chest-opening animation is running
let gambleSelected = null;         // picks the power-up type after reveal
let gambleAnimationStep = 0;       // animation counter
let gambleRevealTimer = 0;         // shows revealed item for a short time

// Cost fixed to 150
function getGambleCost() {
  return 150;
}

// New power-up list (includes new "MEGA" overpowered item)
const POWER_UP_TYPES = {
  MULTI: { symbol: "M", color: "#FF69B4", effect: "Multi-ball: temporary extra balls" },
  LASER: { symbol: "L", color: "#FF4500", effect: "Laser: paddle fires a burst that damages bricks" },
  SHIELD: { symbol: "S", color: "#1E90FF", effect: "Shield: prevents 1 lost ball" },
  TIME:  { symbol: "T", color: "#00BFFF", effect: "Time Slow: slow ball for a short while" },
  SPLIT: { symbol: "P", color: "#FFD700", effect: "Split: current ball splits into multiple balls" },
  MEGA:  { symbol: "X", color: "#FF0000", effect: "MEGA: huge temporary buff (very rare)" }
};

// Weighted loot table (percent-ish; sums to 100)
const LOOT_TABLE = [
  { type: "MULTI", chance: 30 },
  { type: "LASER", chance: 22 },
  { type: "SHIELD", chance: 18 },
  { type: "TIME",  chance: 15 },
  { type: "SPLIT", chance: 12 },
  { type: "MEGA",  chance: 3  } // very rare
];

// Helper: pick one entry from LOOT_TABLE by weighted chance
function pickLoot() {
  const total = LOOT_TABLE.reduce((s, e) => s + e.chance, 0);
  let r = Math.random() * total;
  for (const e of LOOT_TABLE) {
    if (r < e.chance) return e.type;
    r -= e.chance;
  }
  return LOOT_TABLE[LOOT_TABLE.length - 1].type;
}

// Timers for some temporary effects
let shieldHits = 0;
let timeSlowTimeoutId = null;
let paddleRestoreTimeoutId = null;

function resetBall() {
  ball.transform.x = WIDTH / 2 - ball.transform.width / 2;
  ball.transform.y = HEIGHT / 2 - ball.transform.height / 2;

  // Ball starts straight down, not slanted to the right
  const speedMultiplier = 1 + (level - 1) * 0.15;
  ball.transform.vx = 0;
  ball.transform.vy = BALL_SPEED_START * speedMultiplier;
  ball.isGlue = false;
}

function nextLevel() {
  level++;
  score += 100 * level;
  isCountingDown = true;
  countdown = 180;
  bricks = makeBricks();
  powerUps = [];
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

// Power-ups (in-world drops) kept for compatibility but not used directly by loot
let powerUps = [];

// old POWER_UP constants removed; new ones live in POWER_UP_TYPES

const keys = {};

let glueMode = false;
let glueIntervalId = null;
let glueProjectiles = [];
let glueMessage = "";
let glueMessageTimer = 0;

// small helper: spawn a single glue projectile from the ball targeting a living brick
function spawnGlueSquirt() {
  if (!bricks || bricks.length === 0) return;

  // choose a random living brick as target
  const targetIndex = Math.floor(Math.random() * bricks.length);
  const target = bricks[targetIndex];
  if (!target) return;

  const targetTransform = target.transform || target;

  // start from ball center
  const startX = ball.transform.x + ball.transform.width / 2;
  const startY = ball.transform.y + ball.transform.height / 2;

  // target center
  const tx = targetTransform.x + targetTransform.width / 2;
  const ty = targetTransform.y + targetTransform.height / 2;

  // direction vector
  let dx = tx - startX;
  let dy = ty - startY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= dist;
  dy /= dist;

  const speed = 3.0; // glue squirts a bit faster

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

    // off-screen check
    if (p.y > HEIGHT || p.y < -20 || p.x < -20 || p.x > WIDTH + 20) {
      glueProjectiles.splice(i, 1);
      continue;
    }

    // check collision with bricks (prefer the targeted brick if still alive)
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
        // hit
        if (typeof handleBrickHit === "function") {
          handleBrickHit(j);
        } else {
          bricks.splice(j, 1);
          score += 10 * level;
        }

        // show fun message
        glueMessage = "get squirted on bozo";
        glueMessageTimer = 120; // 2 seconds

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
    // white glue squirt projectile
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // small shine
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(p.x + p.width / 4, p.y + 1, 2, 2);
  }
}

function documentKeyHandler(event) {
  keys[event.key.toLowerCase()] = true;
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }

  if (isGameOver && event.key.toLowerCase() === "r") {
    resetGame();
  }
}

document.addEventListener("keydown", documentKeyHandler);

// Mouse / click handling for gamble UI
canvas.addEventListener("click", function (evt) {
  if (!isGambleScreen) return;
  if (gambleInProgress) return;

  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  // simple button bounds
  const buttonW = 160;
  const buttonH = 40;
  const openX = WIDTH / 2 - buttonW / 2;
  const openY = HEIGHT / 2 + 60;
  const skipX = WIDTH / 2 - buttonW / 2;
  const skipY = HEIGHT / 2 + 110;

  // Open button
  if (x >= openX && x <= openX + buttonW && y >= openY && y <= openY + buttonH) {
    const cost = getGambleCost();
    if (score >= cost) {
      startGamble(cost);
    } else {
      // not enough score; show a small message
      glueMessage = "Not enough score to open chest";
      glueMessageTimer = 120;
    }
  }

  // Skip button -> advance to next level without gambling
  if (x >= skipX && x <= skipX + buttonW && y >= skipY && y <= skipY + buttonH) {
    isGambleScreen = false;
    nextLevel();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function update() {
  if (isGameOver) {
    return;
  }

  if (isGambleScreen) {
    // pause gameplay while the gamble UI is visible
    // allow gamble animation to progress separately
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
    }
    return;
  }

  movePaddle();
  moveBall();

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
      // consume shield and reflect ball
      shieldHits--;
      ball.transform.y = paddle.transform.y - ball.transform.height;
      ball.transform.vy = -Math.abs(ball.transform.vy);
      glueMessage = "Shield absorbed a miss!";
      glueMessageTimer = 90;
    } else {
      isGameOver = true;
    }
  }

  // Check if all bricks are destroyed -> show gamble screen instead of immediately advancing
  if (bricks.length === 0) {
    isGambleScreen = true;
    gambleInProgress = false;
    gambleSelected = null;
    gambleAnimationStep = 0;
    gambleRevealTimer = 0;
    return;
  }
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.transform.x -= paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.transform.x += paddle.speed;
  }

  if (paddle.transform.x < 0) {
    paddle.transform.x = 0;
  }
  if (paddle.transform.x + paddle.transform.width > WIDTH) {
    paddle.transform.x = WIDTH - paddle.transform.width;
  }
}

function moveBall() {
  ball.transform.x += ball.transform.vx;
  ball.transform.y += ball.transform.vy;
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    powerUps[i].y += 2; // Fall down

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

function activatePowerUp(type) {
  const info = POWER_UP_TYPES[type] || { effect: "Unknown" };

  // Show a popup description
  glueMessage = `${type}: ${info.effect}`;
  glueMessageTimer = 180;

  if (type === "TIME") {
    // slow the ball for 5s
    ball.transform.vx *= 0.6;
    ball.transform.vy *= 0.6;
    if (timeSlowTimeoutId) clearTimeout(timeSlowTimeoutId);
    timeSlowTimeoutId = setTimeout(() => {
      ball.transform.vx /= 0.6;
      ball.transform.vy /= 0.6;
      timeSlowTimeoutId = null;
    }, 5000);
  } else if (type === "SHIELD") {
    shieldHits = Math.max(shieldHits, 1);
  } else if (type === "MULTI") {
    // quick reward: give score and a small paddle buff
    score += 150;
    paddle.transform.width = Math.min(paddle.transform.width + 30, 180);
    if (paddleRestoreTimeoutId) clearTimeout(paddleRestoreTimeoutId);
    paddleRestoreTimeoutId = setTimeout(() => {
      paddle.transform.width = 90;
      paddleRestoreTimeoutId = null;
    }, 6000);
  } else if (type === "LASER") {
    // make a satisfying instant effect: damage a few random bricks and give score
    let destroyed = 0;
    for (let i = 0; i < bricks.length && destroyed < 3; i++) {
      const idx = Math.floor(Math.random() * bricks.length);
      if (bricks[idx]) {
        bricks.splice(idx, 1);
        destroyed++;
        score += 20 * level;
      }
    }
  } else if (type === "SPLIT") {
    // quick reward: give score and a temporary paddle widen
    score += 120;
    paddle.transform.width = Math.min(paddle.transform.width + 40, 200);
    if (paddleRestoreTimeoutId) clearTimeout(paddleRestoreTimeoutId);
    paddleRestoreTimeoutId = setTimeout(() => {
      paddle.transform.width = 90;
      paddleRestoreTimeoutId = null;
    }, 6000);
  } else if (type === "MEGA") {
    // mega effect: large score and multiple buffs
    score += 800;
    shieldHits = Math.max(shieldHits, 2);
    paddle.transform.width = Math.min(paddle.transform.width + 80, WIDTH);
    // slow ball a little so player enjoys the effect
    ball.transform.vx *= 0.7;
    ball.transform.vy *= 0.7;
    if (paddleRestoreTimeoutId) clearTimeout(paddleRestoreTimeoutId);
    paddleRestoreTimeoutId = setTimeout(() => {
      paddle.transform.width = 90;
      paddleRestoreTimeoutId = null;
    }, 9000);
  }
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Level: " + level, 10, 20);
  ctx.fillText("Score: " + score, 10, 40);
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

// Draw a clean chances bar: segmented horizontal bar with labels
function drawChancesBar(px, py, w) {
  const total = LOOT_TABLE.reduce((s, e) => s + e.chance, 0);
  let x = px;
  for (const e of LOOT_TABLE) {
    const fraction = e.chance / total;
    const segW = Math.max(2, Math.floor(w * fraction));
    const info = POWER_UP_TYPES[e.type] || {};
    ctx.fillStyle = info.color || "#888";
    ctx.fillRect(x, py, segW, 18);
    x += segW;
  }

  // border
  ctx.strokeStyle = "#333";
  ctx.strokeRect(px, py, w, 18);

  // labels under the bar
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  let labelX = px;
  for (const e of LOOT_TABLE) {
    const info = POWER_UP_TYPES[e.type] || {};
    ctx.fillStyle = info.color || "#fff";
    ctx.fillText(`${e.type} (${e.chance}%)`, labelX, py + 36);
    labelX += Math.max(60, Math.floor(w * (e.chance / total)));
  }
}

// Draw the post-level gamble UI overlay with spinning icons
function drawGambleScreen() {
  // dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Panel
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

  // Show cost
  const cost = getGambleCost();
  ctx.font = "16px Arial";
  ctx.fillText(`Open chest for ${cost} score`, WIDTH / 2, py + 66);

  // center point for spinning icons
  const centerX = WIDTH / 2;
  const centerY = py + 130;
  const radius = 80;

  // Draw orbiting powerup icons
  const items = LOOT_TABLE.map(e => e.type);
  const spinSpeed = 0.12; // radians per frame
  const baseAngle = gambleAnimationStep * spinSpeed;

  for (let i = 0; i < items.length; i++) {
    const angle = baseAngle + (i / items.length) * Math.PI * 2;
    // if reveal and selected, move selected to center
    let tx = centerX + Math.cos(angle) * radius;
    let ty = centerY + Math.sin(angle) * radius;
    const type = items[i];
    const info = POWER_UP_TYPES[type];

    // if reveal phase and this is the selected item, interpolate to center
    if (gambleSelected && type === gambleSelected) {
      const t = Math.min(1, gambleAnimationStep / 20);
      tx = lerp(tx, centerX, t);
      ty = lerp(ty, centerY, t);
    }

    // draw circle icon
    ctx.beginPath();
    ctx.fillStyle = info.color || "#fff";
    ctx.arc(tx, ty, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(info.symbol || "?", tx, ty + 5);
  }

  // Chest graphic under icons
  const chestX = centerX - 36;
  const chestY = centerY + 50;
  ctx.fillStyle = "#8B4513";
  roundRect(ctx, chestX, chestY, 72, 44, 6, true, false);
  // lid
  ctx.fillStyle = "#A0522D";
  roundRect(ctx, chestX - 4, chestY - 12, 80, 18, 6, true, false);

  // Buttons
  const buttonW = 160;
  const buttonH = 40;
  const openX = WIDTH / 2 - buttonW / 2;
  const openY = HEIGHT / 2 + 60;
  const skipX = WIDTH / 2 - buttonW / 2;
  const skipY = HEIGHT / 2 + 110;

  // Open button (disabled if not enough score)
  ctx.fillStyle = score >= cost ? "#FFD700" : "#666";
  roundRect(ctx, openX, openY, buttonW, buttonH, 6, true, false);
  ctx.fillStyle = score >= cost ? "black" : "#ddd";
  ctx.font = "18px Arial";
  ctx.fillText("Open Chest", WIDTH / 2, openY + 26);

  // Skip button
  ctx.fillStyle = "#ccc";
  roundRect(ctx, skipX, skipY, buttonW, buttonH, 6, true, false);
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Skip (No Gamble)", WIDTH / 2, skipY + 26);

  // Clean chances bar
  drawChancesBar(px + 20, py + panelH - 74, panelW - 40);

  // If reveal in progress, show the selected item name and description in a popup
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

// linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function startGamble(cost) {
  // Deduct cost up-front
  score -= cost;
  gambleInProgress = true;
  gambleSelected = null;
  gambleAnimationStep = 0;
  gambleRevealTimer = 0;

  // Start a short timed spin and then pick
  const spinDurationMs = 900; // how long the spin runs before picking
  setTimeout(() => {
    gambleSelected = pickLoot();
    // let animation step continue so selected item interpolates to center
    // show reveal for 1.8s
    gambleRevealTimer = 108; // 1.8s at 60fps

    // After reveal, apply powerup and advance level
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

  // draw gamble UI on top if active
  if (isGambleScreen) {
    drawGambleScreen();
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
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);
