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

let lives = 1;
let score = 0;
let gameOverPause = 0;
const GAME_OVER_PAUSE_DURATION = 120;

let countdown = 180;
let isCountingDown = true;

const BALL_SPEED = 4;

const ball = {
  x: 0,
  y: 0,
  width: 30,
  height: 30,
  vx: 0,
  vy: 0
};

function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.vx = BALL_SPEED;
  ball.vy = BALL_SPEED;
}

const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6
};

let bricks = [];

const keys = {};

document.addEventListener("keydown", function (event) {
  keys[event.key.toLowerCase()] = true;
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function update() {
  if (isCountingDown) {
    countdown--;
    if (countdown <= 0) {
      isCountingDown = false;
      resetBall();
    }
    return;
  }

  if (gameOverPause > 0) {
    gameOverPause--;
    if (gameOverPause === 0) {
      isCountingDown = true;
      countdown = 180;
      if (lives > 0) {
        resetBall();
      }
    }
    return;
  }

  movePaddle();
  moveBall();

  bounceOffWalls();
  bounceOffPaddle();
  bounceOffBricks();

  if (ball.y > HEIGHT) {
    gameOverPause = GAME_OVER_PAUSE_DURATION;
  }
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x -= paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x += paddle.speed;
  }

  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Lives: " + lives, 10, 20);
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
}

function drawGameOverMessage() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#FF6B6B";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER!", WIDTH / 2, HEIGHT / 2 - 40);

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("Starting next life...", WIDTH / 2, HEIGHT / 2 + 40);
}

function draw() {
  ctx.fillStyle = "#1a472a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#FFD700";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  if (wallnutImage.complete && wallnutImage.naturalHeight !== 0) {
    ctx.drawImage(wallnutImage, ball.x, ball.y, ball.width, ball.height);
  } else {
    ctx.fillStyle = "#D2B48C";
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height);
    ctx.strokeRect(ball.x, ball.y, ball.width, ball.height);
  }

  drawBricks();
  drawHUD();

  if (isCountingDown) {
    drawCountdown();
  }

  if (gameOverPause > 0) {
    drawGameOverMessage();
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
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);