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
  // When the ball hits the paddle, change horizontal velocity based on hit position
  if (boxesTouch(ball, paddle) && ball.transform.vy > 0) {
    // place ball on top of paddle to avoid sticking
    ball.transform.y = paddle.transform.y - ball.transform.height;

    // Compute hit position relative to paddle center: -1 (left edge) .. 0 (center) .. 1 (right edge)
    const ballCenterX = ball.transform.x + ball.transform.width / 2;
    const paddleCenterX = paddle.transform.x + paddle.transform.width / 2;
    let relative = (ballCenterX - paddleCenterX) / (paddle.transform.width / 2);
    relative = Math.max(-1, Math.min(1, relative));

    // Desired speed magnitude (respect level scaling). Use current speed if it's faster than base.
    const baseSpeed = BALL_SPEED_START * (1 + (level - 1) * 0.15);
    const currentSpeed = Math.sqrt(ball.transform.vx * ball.transform.vx + ball.transform.vy * ball.transform.vy);
    const speed = Math.max(currentSpeed, baseSpeed);

    // Map relative to horizontal velocity, then compute vertical velocity to keep overall speed
    ball.transform.vx = relative * speed;
    const vyAbs = Math.sqrt(Math.max(0.1, speed * speed - ball.transform.vx * ball.transform.vx));
    ball.transform.vy = -vyAbs; // send upward
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
