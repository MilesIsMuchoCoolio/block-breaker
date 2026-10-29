// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;
const BRICKS_TOP = 50;

// Helmet chances (per brick)
const HELMET_BUCKET_CHANCE = 0.08; // ~8% of bricks have a bucket
const HELMET_CONE_CHANCE = 0.12;   // ~12% of bricks have a cone

// More rows at higher levels = harder gameplay
function getBrickRows() {
  if (level <= 2) return 4;
  if (level <= 5) return 5;
  if (level <= 8) return 6;
  return 7; // Max 7 rows
}

const zombieColors = [
  "#4A7C59",
  "#5A8C69",
  "#3A6C49",
  "#6A9C79"
];

function makeBrick(x, y, type = 'default') {
  const normalizedType = String(type || 'default').toLowerCase().replace(/[\s_-]+/g, '');
  const brick = {
    transform: createTransform(x, y, BRICK_WIDTH, BRICK_HEIGHT),
    type: normalizedType,
    colorIndex: 0,
    color: zombieColors[0],
    hits: 1,
    maxHits: 1,
    helmet: null
  };

  if (normalizedType === 'conehead') {
    brick.color = '#F39C12';
    brick.hits = 2;
    brick.maxHits = 2;
    return brick;
  }

  if (normalizedType === 'buckethead') {
    brick.color = '#8B5A2B';
    brick.hits = 3;
    brick.maxHits = 3;
    return brick;
  }

  return brick;
}

function makeBricks() {
  const list = [];
  const brickRows = getBrickRows();
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < brickRows; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      // Decide whether this brick gets a helmet (bucket or cone)
      let helmet = null;
      const r = Math.random();
      if (r < HELMET_BUCKET_CHANCE) {
        helmet = { type: 'bucket', stage: 0 }; // stage: 0 = intact, 1 = damaged, 2 = removed
      } else if (r < HELMET_BUCKET_CHANCE + HELMET_CONE_CHANCE) {
        helmet = { type: 'cone', stage: 0 }; // stage: 0 = present, 1 = removed
      }

      const brick = makeBrick(
        left + col * (BRICK_WIDTH + BRICK_GAP),
        BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        'default'
      );

      brick.colorIndex = (row + col) % zombieColors.length;
      brick.color = zombieColors[brick.colorIndex];
      brick.helmet = helmet;

      list.push(brick);
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

    // Eyes
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

    // Mouth / line
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(brickTransform.x + brickTransform.width * 0.2, brickTransform.y + brickTransform.height * 0.7);
    ctx.lineTo(brickTransform.x + brickTransform.width * 0.8, brickTransform.y + brickTransform.height * 0.7);
    ctx.stroke();

    // Draw helmet (bucket or cone) if present and not removed
    if (brick.helmet) {
      const h = brick.helmet;
      const cx = brickTransform.x + brickTransform.width / 2;

      if (h.type === 'cone' && h.stage === 0) {
        // Cone: orange traffic cone shape
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

        // Cone stripe
        ctx.fillStyle = '#FFF';
        ctx.fillRect(cx - 6, brickTransform.y - 2, 12, 4);
      }

      if (h.type === 'bucket' && h.stage < 2) {
        // Bucket: a little metal bucket with a rim; stage 0 = intact, stage 1 = dented
        const bw = 28;
        const bh = 12;
        const bx = cx - bw / 2;
        const by = brickTransform.y - bh;

        // bucket body
        ctx.fillStyle = '#8B5A2B'; // brownish
        ctx.strokeStyle = '#5A3E26';
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, bw, bh, 3, true, true);

        // rim
        ctx.fillStyle = '#A67C52';
        ctx.fillRect(bx - 2, by - 4, bw + 4, 4);
        ctx.strokeRect(bx - 2, by - 4, bw + 4, 4);

        if (h.stage === 1) {
          // damaged: draw a dent / crack
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

// tiny helper to draw rounded rects
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
