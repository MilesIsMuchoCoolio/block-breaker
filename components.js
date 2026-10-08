// ============================================================
// components.js: Data-only components for the ECS pattern
// ============================================================

function createTransform(x, y, width, height, vx = 0, vy = 0) {
  return {
    x,
    y,
    width,
    height,
    vx,
    vy
  };
}
