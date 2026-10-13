function boxesTouch(a, b) {
  const aTransform = a.transform || a;
  const bTransform = b.transform || b;

  return (
    aTransform.x < bTransform.x + bTransform.width &&
    aTransform.x + aTransform.width > bTransform.x &&
    aTransform.y < bTransform.y + bTransform.height &&
    aTransform.y + aTransform.height > bTransform.y
  );
}

function bounceOffWalls() {
  const ballTransform = ball.transform;

  if (ballTransform.x < 0) {
    ballTransform.x = 0;
    ballTransform.vx = -ballTransform.vx;
  }
  if (ballTransform.x + ballTransform.width > WIDTH) {
    ballTransform.x = WIDTH - ballTransform.width;
    ballTransform.vx = -ballTransform.vx;
  }
  if (ballTransform.y < 0) {
    ballTransform.y = 0;
    ballTransform.vy = -ballTransform.vy;
  }
}

function bounceOffPaddle() {
  if (boxesTouch(ball, paddle) && ball.transform.vy > 0) {
    ball.transform.y = paddle.transform.y - ball.transform.height;
    ball.transform.vy = -ball.transform.vy;
  }
}

function bounceOffBricks() {
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];
    const brickTransform = brick.transform || brick;

    if (!boxesTouch(ball, brick)) {
      continue;
    }

    const overlapX =
      Math.min(ball.transform.x + ball.transform.width, brickTransform.x + brickTransform.width) -
      Math.max(ball.transform.x, brickTransform.x);
    const overlapY =
      Math.min(ball.transform.y + ball.transform.height, brickTransform.y + brickTransform.height) -
      Math.max(ball.transform.y, brickTransform.y);

    if (overlapX < overlapY) {
      ball.transform.vx = -ball.transform.vx;
      if (ball.transform.x < brickTransform.x) {
        ball.transform.x = brickTransform.x - ball.transform.width;
      } else {
        ball.transform.x = brickTransform.x + brickTransform.width;
      }
    } else {
      ball.transform.vy = -ball.transform.vy;
      if (ball.transform.y < brickTransform.y) {
        ball.transform.y = brickTransform.y - ball.transform.height;
      } else {
        ball.transform.y = brickTransform.y + brickTransform.height;
      }
    }

    // Helmet handling: cone and bucket protect the brick for one or two hits
    if (brick.helmet) {
      const h = brick.helmet;
      if (h.type === 'cone' && h.stage === 0) {
        // cone absorbs first hit, then is removed
        h.stage = 1; // removed
        break; // stop processing further bricks this frame
      }

      if (h.type === 'bucket') {
        if (h.stage === 0) {
          // bucket intact -> becomes damaged
          h.stage = 1; // damaged
          break;
        } else if (h.stage === 1) {
          // damaged -> bucket falls off
          h.stage = 2; // removed
          break;
        }
      }
    }

    // No helmet (or helmet already removed) -> brick is destroyed
    // 50% chance to drop a power-up
    if (Math.random() < POWER_UP_CHANCE) {
      const powerUpTypes = Object.keys(POWER_UP_TYPES);
      const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const powerUpData = POWER_UP_TYPES[randomType];

      powerUps.push({
        x: brickTransform.x + brickTransform.width / 2 - 8,
        y: brickTransform.y + brickTransform.height,
        width: 16,
        height: 16,
        type: randomType,
        color: powerUpData.color,
        symbol: powerUpData.symbol
      });
    }

    bricks.splice(i, 1);
    score += 10 * level; // Score scales with level
    break;
  }
}
