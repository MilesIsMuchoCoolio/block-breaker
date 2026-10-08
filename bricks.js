// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_ROWS = 4;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;
const BRICKS_TOP = 50;

const zombieColors = [
  "#4A7C59",
  "#5A8C69",
  "#3A6C49",
  "#6A9C79"
];

function makeBricks() {
  const list = [];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      list.push({
        transform: createTransform(
          left + col * (BRICK_WIDTH + BRICK_GAP),
          BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          BRICK_WIDTH,
          BRICK_HEIGHT
        ),
        colorIndex: (row + col) % zombieColors.length
      });
    }
  }

  return list;
}

function drawBricks() {
  for (const brick of bricks) {
    const brickTransform = brick.transform || brick;

    ctx.fillStyle = zombieColors[brick.colorIndex];
    ctx.fillRect(brickTransform.x, brickTransform.y, brickTransform.width, brickTransform.height);

    ctx.fillStyle = "white";
    const eyeY = brickTransform.y + brickTransform.height / 3;
    ctx.beginPath();
    ctx.arc(brickTransform.x + brickTransform.width * 0.3, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(brickTransform.x + brickTransform.width * 0.7, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(brickTransform.x + brickTransform.width * 0.3, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(brickTransform.x + brickTransform.width * 0.7, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(brickTransform.x + brickTransform.width * 0.2, brickTransform.y + brickTransform.height * 0.7);
    ctx.lineTo(brickTransform.x + brickTransform.width * 0.8, brickTransform.y + brickTransform.height * 0.7);
    ctx.stroke();
  }
}
