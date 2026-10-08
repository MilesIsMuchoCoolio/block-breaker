// ============================================================
// components.js: Data-only components for the ECS pattern
// ============================================================

/**
 * Transform Component
 * Holds only data: position, dimensions, and velocity
 * No functions, no logic — purely data storage
 */
function createTransform(x, y, width, height, vx = 0, vy = 0) {
  return {
    x: x,
    y: y,
    width: width,
    height: height,
    vx: vx,
    vy: vy
  };
}
