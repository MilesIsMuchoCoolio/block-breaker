function drawPowerUps() {
  for (const powerUp of powerUps) {
    // background circle
    ctx.fillStyle = powerUp.color || '#999';
    ctx.beginPath();
    ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // icon
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    const cx = powerUp.x + powerUp.width / 2;
    const cy = powerUp.y + powerUp.height / 2;

    if (powerUp.type === "WIDE") {
      // wide paddle icon: a wider horizontal bar
      ctx.fillStyle = "white";
      ctx.fillRect(cx - 12, cy - 4, 24, 8);
      ctx.fillStyle = "black";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("W", cx, cy + 4);
    } else if (powerUp.type === "SLOW") {
      // slow icon: a small rounded snail/shell (circle with two antenna dots)
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(cx - 2, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 3, 1.2, 0, Math.PI * 2);
      ctx.arc(cx - 5, cy + 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (powerUp.type === "FAST") {
      // fast icon: lightning bolt
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6);
      ctx.lineTo(cx - 1, cy - 1);
      ctx.lineTo(cx - 2, cy - 1);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.lineTo(cx + 1, cy + 1);
      ctx.lineTo(cx + 2, cy + 1);
      ctx.closePath();
      ctx.fill();
    } else if (powerUp.type === "MULTI") {
      // multi icon: three small balls
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(cx - 5, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx, cy - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // fallback: draw the symbol letter
      ctx.fillStyle = "black";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(powerUp.symbol || "?", cx, cy + 4);
    }
  }
}
