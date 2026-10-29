function handleBrickImpact(brick, brickIndex, brickTransform) {
  const hasMultiHit = Number.isFinite(brick?.hits) && Number.isFinite(brick?.maxHits) && brick.maxHits > 1;

  if (hasMultiHit) {
    brick.hits -= 1;

    if (brick.hits <= 0) {
      maybeSpawnPowerUp(
        brickTransform.x,
        brickTransform.y,
        brickTransform.width,
        brickTransform.height
      );

      bricks.splice(brickIndex, 1);
      score += 10 * level;
      return true;
    }

    return false;
  }

  maybeSpawnPowerUp(
    brickTransform.x,
    brickTransform.y,
    brickTransform.width,
    brickTransform.height
  );

  bricks.splice(brickIndex, 1);
  score += 10 * level;
  return true;
}

function boxesTouch(a, b) {
  const aBox = a.transform || a;
  const bBox = b.transform || b;

  return (
    aBox.x < bBox.x + bBox.width &&
    aBox.x + aBox.width > bBox.x &&
    aBox.y < bBox.y + bBox.height &&
    aBox.y + aBox.height > bBox.y
  );
}

function bounceOffWalls() {
  const ballBox = ball.transform;

  if (ballBox.x <= 0) {
    ballBox.x = 0;
    ballBox.vx = Math.abs(ballBox.vx || 1);
  }

  if (ballBox.x + ballBox.width >= WIDTH) {
    ballBox.x = WIDTH - ballBox.width;
    ballBox.vx = -Math.abs(ballBox.vx || 1);
  }

  if (ballBox.y <= 0) {
    ballBox.y = 0;
    ballBox.vy = Math.abs(ballBox.vy || 1);
  }
}

function bounceOffPaddle() {
  const paddleBox = paddle.transform;
  const ballBox = ball.transform;

  if (
    ballBox.y + ballBox.height >= paddleBox.y &&
    ballBox.y <= paddleBox.y + paddleBox.height &&
    ballBox.x + ballBox.width >= paddleBox.x &&
    ballBox.x <= paddleBox.x + paddleBox.width &&
    ballBox.vy > 0
  ) {
    const hitPoint = (ballBox.x + ballBox.width / 2) - (paddleBox.x + paddleBox.width / 2);
    const normalized = Math.max(-1, Math.min(1, hitPoint / (paddleBox.width / 2)));
    const speed = Math.max(Math.hypot(ballBox.vx, ballBox.vy), BALL_SPEED_START * 1.08);

    ballBox.vx = normalized * speed;
    const vyAbs = Math.sqrt(Math.max(0.1, speed * speed - ballBox.vx * ballBox.vx));
    ballBox.vy = -vyAbs;
    ballBox.y = paddleBox.y - ballBox.height;
  }
}

function bounceOffBricks() {
  // iterate backwards to avoid index issues when splicing
  for (let i = bricks.length - 1; i >= 0; i--) {
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

    const wasRemoved = handleBrickImpact(brick, i, brickTransform);

    // stop after handling one brick collision this frame
    if (wasRemoved) {
      break;
    }
  }
}
