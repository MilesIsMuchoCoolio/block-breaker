// ============================================================
// BLOCK BREAKER (Plants vs Zombies Edition)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 450


// Load the nut ball image
const nutImage = new Image();
nutImage.src = "https://e7.pngegg.com/pngimages/588/84/png-clipart-plants-vs-zombies-2-it-s-about-time-plants-vs-zombies-garden-warfare-2-nut-plants-vs-zombies-face-food.png";

// ============================================================
// GAME STATE
// ============================================================
let lives = 3;
let score = 0;
let gameOverPause = 0;  // counts down when showing game over message
const GAME_OVER_PAUSE_DURATION = 120;  // frames (2 seconds at 60fps)

// ============================================================
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ============================================================
const BALL_SPEED = 4;

const ball = {
  x: 0,
  y: 0,
  width: 30,
  height: 30,
  vx: 0,
  vy: 0
};

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.vx = BALL_SPEED;  // right
  ball.vy = BALL_SPEED;  // down
}


// ============================================================
// THE PADDLE (Sunflower)
// ============================================================
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6
};


// ============================================================
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ============================================================
let bricks = [];


// ============================================================
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ============================================================
const keys = {};

document.addEventListener("keydown", function (event) {
  keys[event.key.toLowerCase()] = true;
  // Stop the arrow keys from scrolling the page.
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});


// ============================================================
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ============================================================
function update() {
  // If we're showing game over message, count down
  if (gameOverPause > 0) {
    gameOverPause--;
    if (gameOverPause === 0) {
      // Game over pause finished - reset everything
      lives--;
      if (lives > 0) {
        resetBall();
      }
    }
    return;  // Don't update game while showing game over
  }

  movePaddle();
  moveBall();

  bounceOffWalls();   // collisions.js
  bounceOffPaddle();  // collisions.js
  bounceOffBricks();  // collisions.js

  // The ball fell off the bottom: loss of life
  if (ball.y > HEIGHT) {
    gameOverPause = GAME_OVER_PAUSE_DURATION;
  }
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x = paddle.x - paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x = paddle.x + paddle.speed;
  }

  // Keep the paddle on the screen.
  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveBall() {
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}


// ============================================================
// DRAW: paints everything on the canvas with PvZ theme
// ============================================================
function draw() {
  // PvZ themed background (dark green)
  ctx.fillStyle = "#1a472a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw paddle (Sunflower)
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  // Draw ball as nut image (or fallback square if image not loaded)
  if (nutImage.complete && nutImage.naturalHeight !== 0) {
    ctx.drawImage(nutImage, ball.x, ball.y, ball.width, ball.height);
  } else {
    // Fallback: brown square
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height);
  }

  drawBricks();  // bricks.js

  // Draw HUD (score and lives)
  drawHUD();

  // Draw game over message if needed
  if (gameOverPause > 0) {
    drawGameOverMessage();
  }
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Lives: " + lives, 10, 20);
  ctx.fillText("Score: " + score, 10, 40);
}

function drawGameOverMessage() {
  // Semi-transparent dark overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Game Over text
  ctx.fillStyle = "#FF6B6B";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER!", WIDTH / 2, HEIGHT / 2 - 40);

  // Show remaining lives
  if (lives > 0) {
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Lives remaining: " + lives, WIDTH / 2, HEIGHT / 2 + 40);
  } else {
    ctx.fillStyle = "#FF6B6B";
    ctx.font = "24px Arial";
    ctx.fillText("YOU LOST!", WIDTH / 2, HEIGHT / 2 + 40);
  }
}


// ============================================================
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw.
// Some screens are faster than others, so we make sure update()
// always runs exactly 60 times per second on every computer.
// ============================================================
const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover = leftover + (now - lastTime);
  lastTime = now;

  // If the tab was hidden for a while, don't try to catch up.
  if (leftover > 250) {
    leftover = 250;
  }

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

function start() {
  bricks = makeBricks();  // bricks.js
  resetBall();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);
