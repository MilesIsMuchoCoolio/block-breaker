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
