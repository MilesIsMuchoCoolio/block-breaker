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

// Cost scales with level (50 * level), but not below 50
function getGambleCost() {
  return Math.max(50, 50 * level);
}

// Loot table with rarities (percent chances)
const LOOT_TABLE = [
  { type: "SLOW",  chance: 40 }, // common
  { type: "WIDE",  chance: 25 }, // uncommon
  { type: "FAST",  chance: 15 }, // rare-ish
  { type: "MULTI", chance: 15 }, // rare-ish
  { type: "GLUE",  chance: 5 }   // very rare / powerful
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

// Power-ups
let powerUps = [];

const POWER_UP_TYPES = {
  SLOW: { symbol: "S", color: "#00BFFF", effect: "Slow ball" },
  WIDE: { symbol: "W", color: "#32CD32", effect: "Wide paddle" },
  FAST: { symbol: "F", color: "#FF4500", effect: "Fast ball" },
  MULTI: { symbol: "M", color: "#FF69B4", effect: "Multi-ball" },
  GLUE: { symbol: "GL", color: "#ffffff", effect: "Glue mode" }
};

// 50% chance of power-up when brick is destroyed (increased from 30%)
const POWER_UP_CHANCE = 0.5;

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
      // not enough score; maybe play a small shake or message
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
    isGameOver = true;
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
  if (type === "SLOW") {
    ball.transform.vx *= 0.6;
    ball.transform.vy *= 0.6;
  } else if (type === "WIDE") {
    paddle.transform.width = Math.min(paddle.transform.width + 30, 150);
    setTimeout(() => {
      paddle.transform.width = 90;
    }, 5000);
  } else if (type === "FAST") {
    ball.transform.vx *= 1.5;
    ball.transform.vy *= 1.5;
  } else if (type === "MULTI") {
    score += 50;
  } else if (type === "GLUE") {
    if (glueIntervalId) {
      clearInterval(glueIntervalId);
      glueIntervalId = null;
    }

    glueMode = true;
    ball.isGlue = true;
    glueMessage = "Glue mode activate.";
    glueMessageTimer = 180;

    // spawn immediately and then every 3s
    spawnGlueSquirt();
    glueIntervalId = setInterval(spawnGlueSquirt, 3000);
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

    if (powerUp.type === "WIDE") {
      ctx.fillStyle = "white";
      ctx.fillRect(cx - 12, cy - 4, 24, 8);
      ctx.fillStyle = "black";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("W", cx, cy + 4);
    } else if (powerUp.type === "SLOW") {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(cx - 2, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 3, 1.2, 0, Math.PI * 2);
      ctx.arc(cx - 5, cy + 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (powerUp.type === "FAST") {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6);
      ctx.lineTo(cx - 1, cy - 1);
      ctx.lineTo(cx - 2, cy - 1);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.lineTo(cx + 1, cy + 1);
      ctx.lineTo(cx + 2, cy + 1);
      ctx.closePath();
      ctx.fill();
    } else if (powerUp.type === "MULTI") {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(cx - 5, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx, cy - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (powerUp.type === "GLUE") {
      ctx.fillStyle = "#c2a27f";
      ctx.fillRect(cx - 4, cy - 3, 8, 10);
      ctx.fillStyle = "#a8876a";
      ctx.fillRect(cx - 2, cy - 7, 4, 4);
      ctx.fillStyle = "#fff";
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.fillText("G", cx, cy + 4);
    } else {
      ctx.fillStyle = "black";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(powerUp.symbol || "?", cx, cy + 4);
    }
  }
}

// Draw the post-level gamble UI overlay
function drawGambleScreen() {
  // dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Panel
  ctx.fillStyle = "#2b6f3a";
  const panelW = 420;
  const panelH = 260;
  const px = WIDTH / 2 - panelW / 2;
  const py = HEIGHT / 2 - panelH / 2;
  roundRect(ctx, px, py, panelW, panelH, 8, true, false);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Level Cleared! Open a Loot Chest?", WIDTH / 2, py + 36);

  // Show cost
  const cost = getGambleCost();
  ctx.font = "16px Arial";
  ctx.fillText(`Open chest for ${cost} score`, WIDTH / 2, py + 66);

  // Draw chest (simple rectangle + lid) and animate lid if in progress
  const chestX = WIDTH / 2 - 32;
  const chestY = py + 90;
  // chest base
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(chestX, chestY, 64, 44);
  // lid
  ctx.save();
  ctx.translate(chestX + 32, chestY + 6);
  const lidOpen = gambleInProgress ? (Math.sin(gambleAnimationStep / 6) * 0.5 + 0.5) : 0;
  ctx.rotate(-lidOpen * 0.8);
  ctx.fillStyle = "#A0522D";
  ctx.fillRect(-36, -10, 72, 14);
  ctx.restore();

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

  // Show loot chances
  ctx.textAlign = "left";
  ctx.font = "14px Arial";
  const chanceX = px + 20;
  let chanceY = py + 110;
  ctx.fillStyle = "white";
  ctx.fillText("Loot chances:", chanceX, chanceY);
  chanceY += 22;
  for (const e of LOOT_TABLE) {
    const pct = e.chance + "%";
    const info = POWER_UP_TYPES[e.type];
    ctx.fillStyle = info.color || "#fff";
    ctx.fillText(`${e.type} - ${pct} - ${info.effect}`, chanceX, chanceY);
    chanceY += 18;
  }

  // If gambling is in progress and we've selected an item, show it
  if (gambleInProgress && gambleSelected) {
    ctx.textAlign = "center";
    ctx.font = "22px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(`You got: ${gambleSelected}`, WIDTH / 2, py + panelH - 26);
  }
}

function startGamble(cost) {
  // Deduct cost up-front
  score -= cost;
  gambleInProgress = true;
  gambleSelected = null;
  gambleAnimationStep = 0;
  gambleRevealTimer = 0;

  // Animation loop using interval
  const animInterval = setInterval(() => {
    gambleAnimationStep++;

    // After some steps, pick and reveal
    if (gambleAnimationStep > 24) {
      clearInterval(animInterval);
      gambleSelected = pickLoot();
      // show reveal for 90 frames (~1.5s at 60fps)
      gambleRevealTimer = 90;

      // After reveal, apply powerup and advance level
      setTimeout(() => {
        if (gambleSelected) {
          activatePowerUp(gambleSelected);
        }
        gambleInProgress = false;
        gambleSelected = null;
        isGambleScreen = false;
        nextLevel();
      }, 1500);
    }
  }, 30);
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
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
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
