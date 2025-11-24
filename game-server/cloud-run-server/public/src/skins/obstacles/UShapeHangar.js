/**
 * Cyberpunk Long U-Shape Obstacle
 */
export const UShapeHangarSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const time = progress * Math.PI * 2;

    const BASE_W = 400;
    const BASE_H = 120;

    const colors = {
      concrete: "#252629",
      darkMetal: "#111111",
      hazardYellow: "#eebd00",
      neonGreen: "#00ff41",
      panelLine: "#3a3a40",
      darkPlate: "#1a1a1e",
      magenta: "#b82b5a",
    };
    const dims = { baseLength: 400, armLength: 100, thickness: 60 };

    ctx.save();
    ctx.translate(cx, cy);

    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);

    drawBaseShape(ctx, false, colors, dims);

    drawBackWallDetails(ctx, time, colors, dims);

    ctx.save();
    ctx.translate(-dims.baseLength / 2 + dims.thickness / 2, 0);
    drawLeftArmDetails(ctx, colors, dims);
    ctx.restore();

    ctx.save();
    ctx.translate(dims.baseLength / 2 - dims.thickness / 2, 0);
    drawRightArmDetails(ctx, time, colors, dims);
    ctx.restore();

    drawCorners(ctx, dims);

    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, time, colors, dims);

    ctx.restore();
  };
};

function drawBaseShape(ctx, isShadow, colors, dims) {
  ctx.fillStyle = isShadow ? "black" : colors.concrete;
  const w = dims.baseLength / 2;
  const h = dims.armLength;
  const t = dims.thickness;

  ctx.beginPath();
  ctx.moveTo(-w, -t / 2);
  ctx.lineTo(w, -t / 2);
  ctx.lineTo(w, h);
  ctx.lineTo(w - t, h);
  ctx.lineTo(w - t, t / 2);
  ctx.lineTo(-w + t, t / 2);
  ctx.lineTo(-w + t, h);
  ctx.lineTo(-w, h);
  ctx.closePath();
  ctx.fill();

  if (!isShadow) {
    ctx.strokeStyle = colors.panelLine;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#151515";
    const ribSpacing = 50;
    for (let x = -w + t + 20; x < w - t - 20; x += ribSpacing) {
      ctx.fillRect(x, -t / 2 - 2, 10, t + 4);
    }
  }
}

function drawBackWallDetails(ctx, time, colors, dims) {
  const w = dims.baseLength / 2 - dims.thickness;
  ctx.save();
  ctx.beginPath();
  const breathe = (Math.sin(time) + 1) / 2;
  ctx.strokeStyle = colors.magenta;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5 + breathe * 0.3;
  ctx.moveTo(-w, 0);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w, -2);
  ctx.lineTo(w, -2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = colors.hazardYellow;
  for (let x = -w; x < w; x += 40) {
    ctx.fillRect(x, 15, 20, 2);
  }
}

function drawLeftArmDetails(ctx, colors, dims) {
  ctx.fillStyle = "#111";
  ctx.fillRect(-15, 20, 30, 40);
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(0, 40, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 40);
  ctx.lineTo(12, 40);
  ctx.moveTo(0, 28);
  ctx.lineTo(0, 52);
  ctx.stroke();
  const flicker = Math.random() * 0.1;
  ctx.fillStyle = `rgba(0, 255, 65, ${0.4 + flicker})`;
  ctx.fillRect(-10, 65, 20, 2);
}

function drawRightArmDetails(ctx, time, colors, dims) {
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(-20, 20, 40, 50);
  const glow = (Math.sin(time * 0.5) + 1) / 2;
  ctx.fillStyle = colors.magenta;
  ctx.globalAlpha = 0.3 + glow * 0.2;
  ctx.fillRect(-15, 30, 30, 20);
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, 30);
  ctx.lineTo(15, -10);
  ctx.stroke();
  ctx.fillStyle = "#005511";
  ctx.beginPath();
  ctx.arc(15, -10, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCorners(ctx, dims) {
  const w = dims.baseLength / 2;
  const t = dims.thickness;
  drawCornerPlate(ctx, -w + t / 2, 0);
  drawCornerPlate(ctx, w - t / 2, 0);
}

function drawCornerPlate(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#222";
  ctx.fillRect(-20, -20, 40, 40);
  ctx.strokeStyle = "#444";
  ctx.strokeRect(-20, -20, 40, 40);
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  ctx.lineTo(20, 20);
  ctx.moveTo(20, -20);
  ctx.lineTo(-20, 20);
  ctx.stroke();
  ctx.restore();
}

function drawGlow(ctx, time, colors, dims) {
  const w = dims.baseLength / 2 - dims.thickness;
  ctx.shadowBlur = 20;
  ctx.shadowColor = colors.magenta;
  ctx.strokeStyle = `rgba(184, 43, 90, 0.3)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.shadowColor = colors.neonGreen;
  ctx.fillStyle = `rgba(0, 255, 65, 0.1)`;
  ctx.beginPath();
  ctx.arc(
    dims.baseLength / 2 - dims.thickness / 2 + 15,
    -10,
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();
}
