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
  transform: createTransform(0, 0, BALL_SIZE, BALL_SIZE, 0, 0)
};

function resetBall() {
  ball.transform.x = WIDTH / 2 - ball.transform.width / 2;
  ball.transform.y = HEIGHT / 2 - ball.transform.height / 2;

  // Ball gets faster at higher levels
  const speedMultiplier = 1 + (level - 1) * 0.15;
  ball.transform.vx = BALL_SPEED_START * speedMultiplier;
  ball.transform.vy = BALL_SPEED_START * speedMultiplier;
}

function nextLevel() {
  level++;
  score += 100 * level;
  isCountingDown = true;
  countdown = 180;
  bricks = makeBricks();
  powerUps = [];
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
  MULTI: { symbol: "M", color: "#FF69B4", effect: "Multi-ball" }
};

// 50% chance of power-up when brick is destroyed (increased from 30%)
const POWER_UP_CHANCE = 0.5;

const keys = {};

document.addEventListener("keydown", function (event) {
  keys[event.key.toLowerCase()] = true;
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }

  if (isGameOver && event.key.toLowerCase() === "r") {
    resetGame();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function update() {
  if (isGameOver) {
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

  if (ball.transform.y > HEIGHT) {
    isGameOver = true;
  }

  // Check if all bricks are destroyed
  if (bricks.length === 0) {
    nextLevel();
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

    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
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
    } else {
      ctx.fillStyle = "black";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(powerUp.symbol || "?", cx, cy + 4);
    }
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
  drawPowerUps();
  drawHUD();

  if (isCountingDown) {
    drawCountdown();
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
