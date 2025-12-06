/**
 * Cyberpunk Wide Obstacle
 */
export const WideNeonSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const time = progress * Math.PI * 2;

    // ★基準サイズ
    const BASE_W = 320;
    const BASE_H = 140;

    // ... (colors 定義) ...
    const colors = {
      concrete: "#252629",
      darkMetal: "#111111",
      hazardYellow: "#eebd00",
      neonGreen: "#00ff41",
      dimRed: "#8a0022",
      glass: "rgba(200, 255, 255, 0.1)",
    };

    ctx.save();
    ctx.translate(cx, cy);

    // ▼▼▼ 追加: スケーリング ▼▼▼
    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);
    // ▲▲▲

    // 位置補正
    ctx.translate(0, -15);

    // メイン構造
    drawBase(ctx, false, colors);

    // 左側：大型サーバーバンク
    ctx.save();
    ctx.translate(-80, -10);
    drawServerBank(ctx, time, colors);
    ctx.restore();

    // 右側：パイプライン
    ctx.save();
    ctx.translate(60, 0);
    drawPipelineUnit(ctx, colors);
    ctx.restore();

    // 中央：接続ブリッジ
    drawCenterDetails(ctx, colors);

    // オーバーレイ効果
    ctx.globalCompositeOperation = "lighter";
    drawGlowEffects(ctx, time, colors);

    ctx.restore();
  };
};

function drawBase(ctx, isShadow, colors) {
  ctx.fillStyle = isShadow ? "black" : colors.concrete;
  ctx.beginPath();
  ctx.moveTo(-160, -40);
  ctx.lineTo(140, -40);
  ctx.lineTo(160, -20);
  ctx.lineTo(160, 50);
  ctx.lineTo(140, 70);
  ctx.lineTo(-140, 70);
  ctx.lineTo(-160, 50);
  ctx.closePath();
  ctx.fill();

  if (!isShadow) {
    ctx.strokeStyle = "#3a3a40";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-60, -40);
    ctx.lineTo(-60, 70);
    ctx.moveTo(60, -40);
    ctx.lineTo(60, 70);
    ctx.stroke();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawServerBank(ctx, time, colors) {
  const w = 100;
  const h = 60;
  ctx.fillStyle = colors.darkMetal;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "#333";
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.fillStyle = "#000";
  for (let i = 0; i < 3; i++) {
    let xPos = -w / 2 + 10 + i * 30;
    ctx.fillRect(xPos, -h / 2 + 5, 20, h - 10);
    const pulse = (Math.sin(time * 2 + i) + 1) / 2;
    ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + pulse * 0.7})`;
    ctx.fillRect(xPos + 14, -h / 2 + 10, 3, 3);
    ctx.fillRect(xPos + 14, -h / 2 + 20, 3, 3);
  }
}

function drawPipelineUnit(ctx, colors) {
  ctx.fillStyle = colors.hazardYellow;
  ctx.beginPath();
  ctx.moveTo(-40, -20);
  ctx.lineTo(80, -20);
  ctx.lineTo(90, 40);
  ctx.lineTo(-30, 40);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.beginPath();
  for (let i = -40; i < 100; i += 20) {
    ctx.moveTo(i, -20);
    ctx.lineTo(i - 10, 40);
    ctx.lineTo(i, 40);
    ctx.lineTo(i + 10, -20);
  }
  ctx.fill();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(80, 0);
  ctx.stroke();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-50, -3);
  ctx.lineTo(80, -3);
  ctx.stroke();
}

function drawCenterDetails(ctx, colors) {
  ctx.strokeStyle = colors.darkMetal;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-40, 20);
  ctx.bezierCurveTo(-20, 40, 20, 40, 40, 20);
  ctx.stroke();
  ctx.strokeStyle = colors.dimRed;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, 20);
  ctx.bezierCurveTo(-18, 38, 18, 38, 38, 20);
  ctx.stroke();
}

function drawGlowEffects(ctx, time, colors) {
  ctx.shadowBlur = 15;
  ctx.shadowColor = colors.neonGreen;
  const scanY = Math.sin(time * 0.5) * 40;
  ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-150, scanY);
  ctx.lineTo(-70, scanY);
  ctx.stroke();
}
