// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;
const BRICKS_TOP = 50;

const MOVING_BRICK_SPEED = 1;

// Special zombie variants
const CONEHEAD_CHANCE = 0.10;
const BUCKETHEAD_CHANCE = 0.06;

function stayStill(brick) {
  return brick;
}

// Move the entire row together, reversing at the canvas edges.
function slide(brick) {
  const row = brick.motionGroup;
  if (!row || row.bricks.length === 0) return;

  // Remove destroyed bricks and let the first surviving member drive the row.
  row.bricks = row.bricks.filter(item => bricks.includes(item));
  if (row.bricks.length === 0 || row.bricks[0] !== brick) return;

  const leftEdge = Math.min(...row.bricks.map(item => item.transform.x));
  const rightEdge = Math.max(...row.bricks.map(item => item.transform.x + item.transform.width));
  let distance = row.speed * row.direction;

  if (leftEdge + distance < 0) {
    distance = -leftEdge;
    row.direction = 1;
  } else if (rightEdge + distance > WIDTH) {
    distance = WIDTH - rightEdge;
    row.direction = -1;
  }

  for (const item of row.bricks) {
    item.transform.x += distance;
    item.speed = row.speed * row.direction;
  }
}

// Start at 10 rows and grow as levels increase.
function getBrickRows() {
  return Math.min(14, 10 + Math.floor((level - 1) / 2));
}

const zombieColors = [
  "#4A7C59",
  "#5A8C69",
  "#3A6C49",
  "#6A9C79"
];

function getBrickPattern(row, col, rows, pattern) {
  const centerCol = (BRICK_COLUMNS - 1) / 2;
  const centerRow = (rows - 1) / 2;
  const distanceFromCenter = Math.abs(col - centerCol) + Math.abs(row - centerRow);

  switch (pattern) {
    case 0: // Chevron
      return row >= Math.abs(col - centerCol) * 0.55;
    case 1: // Diamond
      return distanceFromCenter <= Math.min(centerCol, centerRow + 1);
    case 2: // Checkerboard
      return (row + col) % 2 === 0 || level < 5;
    case 3: // Twin wings
      return col < 2 || col > BRICK_COLUMNS - 3 || row % 2 === 0;
    case 4: // Zig-zag waves
      return (row + Math.floor(col / 2)) % 2 === 0 || row === 0;
    default: // Full rows, used for early levels
      return true;
  }
}

function makeBrick(x, y, type = 'default') {
  const normalizedType = String(type || 'default').toLowerCase().replace(/[\s_-]+/g, '');
  const brick = {
    transform: createTransform(x, y, BRICK_WIDTH, BRICK_HEIGHT),
    type: normalizedType,
    colorIndex: 0,
    color: zombieColors[0],
    hits: 1,
    maxHits: 1,
    helmet: null,
    moveStrategy: stayStill,
    speed: 0,
    startX: x
  };

  switch (normalizedType) {
    case 'conehead':
      brick.color = '#F39C12';
      brick.hits = 2;
      brick.maxHits = 2;
      brick.helmet = { type: 'cone', stage: 0 };
      return brick;

    case 'buckethead':
      brick.color = '#8B5A2B';
      brick.hits = 3;
      brick.maxHits = 3;
      brick.helmet = { type: 'bucket', stage: 0 };
      return brick;

    default:
      brick.color = zombieColors[0];
      brick.hits = 1;
      brick.maxHits = 1;
      brick.helmet = null;
      return brick;
  }
}

function makeBricks() {
  const list = [];
  const movingRow = [];
  let movingRowIndex = null;
  const brickRows = getBrickRows();
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;
  const pattern = Math.floor((level - 1) / 2) % 5;

  for (let row = 0; row < brickRows; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      if (!getBrickPattern(row, col, brickRows, pattern)) continue;

      let brickType = 'default';
      const specialRoll = Math.random();
      const difficultyBonus = Math.min(0.12, (level - 1) * 0.01);

      if (specialRoll < CONEHEAD_CHANCE + difficultyBonus) {
        brickType = 'conehead';
      } else if (specialRoll < CONEHEAD_CHANCE + difficultyBonus + BUCKETHEAD_CHANCE) {
        brickType = 'buckethead';
      }

      const brick = makeBrick(
        left + col * (BRICK_WIDTH + BRICK_GAP),
        BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        brickType
      );

      brick.startX = brick.transform.x;
      if (movingRowIndex === null) movingRowIndex = row;
      if (row === movingRowIndex) movingRow.push(brick);

      brick.colorIndex = (row + col + pattern) % zombieColors.length;
      if (brickType === 'default') {
        brick.color = zombieColors[brick.colorIndex];
      }

      list.push(brick);
    }
  }

  if (movingRow.length > 0) {
    const motionGroup = {
      bricks: movingRow,
      speed: MOVING_BRICK_SPEED,
      direction: 1
    };
    // Any surviving member can advance the shared row once per game update.
    for (const brick of movingRow) {
      brick.motionGroup = motionGroup;
      brick.moveStrategy = slide;
      brick.speed = MOVING_BRICK_SPEED;
    }
  }

  return list;
}

function drawBricks() {
  for (const brick of bricks) {
    const brickTransform = brick.transform || brick;
    const brickColor = brick.color || zombieColors[brick.colorIndex];

    ctx.fillStyle = brickColor;
    ctx.fillRect(brickTransform.x, brickTransform.y, brickTransform.width, brickTransform.height);

    if (brick.maxHits && brick.hits < brick.maxHits) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(
        brickTransform.x + brickTransform.width - 8,
        brickTransform.y + 4,
        5,
        5
      );
    }

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

    if (brick.helmet) {
      const h = brick.helmet;
      const cx = brickTransform.x + brickTransform.width / 2;

      if (h.type === 'cone' && h.stage === 0) {
        ctx.fillStyle = '#FFA500';
        ctx.strokeStyle = '#CC8400';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, brickTransform.y - 8);
        ctx.lineTo(cx - 12, brickTransform.y + 6);
        ctx.lineTo(cx + 12, brickTransform.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFF';
        ctx.fillRect(cx - 6, brickTransform.y - 2, 12, 4);
      }

      if (h.type === 'bucket' && h.stage < 2) {
        const bw = 28;
        const bh = 12;
        const bx = cx - bw / 2;
        const by = brickTransform.y - bh;

        ctx.fillStyle = '#8B5A2B';
        ctx.strokeStyle = '#5A3E26';
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, bw, bh, 3, true, true);

        ctx.fillStyle = '#A67C52';
        ctx.fillRect(bx - 2, by - 4, bw + 4, 4);
        ctx.strokeRect(bx - 2, by - 4, bw + 4, 4);

        if (h.stage === 1) {
          ctx.strokeStyle = '#3b2214';
          ctx.beginPath();
          ctx.moveTo(bx + 6, by + 4);
          ctx.lineTo(bx + 10, by + 6);
          ctx.lineTo(bx + 14, by + 4);
          ctx.stroke();
        }
      }
    }
  }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
