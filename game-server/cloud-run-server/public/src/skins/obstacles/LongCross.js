/**
 * Cyberpunk Long Cross Obstacle
 */
/**
 * Cyberpunk Long Cross Obstacle
 */
export const LongCrossSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const time = progress * Math.PI * 2;
    // ★基準サイズ
    const BASE_W = 240;
    const BASE_H = 360;

    // ... (colors 定義などはそのまま) ...
    const colors = {
      concrete: "#252629",
      darkMetal: "#111111",
      hazardYellow: "#eebd00",
      neonGreen: "#00ff41",
      darkRed: "#550000",
      panelLine: "#3a3a40",
      tankBlue: "#003344",
    };
    const armSize = { top: 110, side: 110, bottom: 230, width: 50 };

    ctx.save();
    ctx.translate(cx, cy); // キャンバスの中心へ移動

    // ▼▼▼ 修正箇所: 過剰な translate を削除し、形状の中心補正のみ行う ▼▼▼
    
    // スケーリング
    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);

    // 形状の中心合わせ
    // 上(110)と下(230)の中間点は +60 の位置なので、-60 して中心に戻す
    ctx.translate(0, -60); 

    // ▲▲▲ 修正ここまで ▲▲▲

    drawBaseShape(ctx, false, colors, armSize);

    // 上：大型排気ユニット
    ctx.save();
    ctx.translate(0, -70);
    drawVentUnit(ctx, colors);
    ctx.restore();

    // 左：サーバーバンク
    ctx.save();
    ctx.translate(-70, 0);
    drawServerUnit(ctx, time, colors);
    ctx.restore();

    // 右：パイプライン接続部
    ctx.save();
    ctx.translate(70, 0);
    drawPipeUnit(ctx);
    ctx.restore();

    // 下（延長部分）：拡張タンク
    ctx.save();
    ctx.translate(0, 80);
    drawExtensionTank(ctx, time);
    ctx.restore();

    // 下（先端）：ストレージ
    ctx.save();
    ctx.translate(0, 190);
    drawStorageUnit(ctx, colors);
    ctx.restore();

    // 中央ハブ
    drawCenterHub(ctx);

    // グロー
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, time, colors);

    ctx.restore();
  };
};
function drawBaseShape(ctx, isShadow, colors, armSize) {
  ctx.fillStyle = isShadow ? "black" : colors.concrete;
  const w = armSize.width;
  const top = armSize.top;
  const side = armSize.side;
  const bottom = armSize.bottom;

  ctx.beginPath();
  ctx.moveTo(-w, -top + 20);
  ctx.lineTo(-w + 20, -top);
  ctx.lineTo(w - 20, -top);
  ctx.lineTo(w, -top + 20);
  ctx.lineTo(w, -w);
  ctx.lineTo(side - 20, -w);
  ctx.lineTo(side, -w + 20);
  ctx.lineTo(side, w - 20);
  ctx.lineTo(side - 20, w);
  ctx.lineTo(w, w);
  ctx.lineTo(w, bottom - 20);
  ctx.lineTo(w - 20, bottom);
  ctx.lineTo(-w + 20, bottom);
  ctx.lineTo(-w, bottom - 20);
  ctx.lineTo(-w, w);
  ctx.lineTo(-side + 20, w);
  ctx.lineTo(-side, w - 20);
  ctx.lineTo(-side, -w + 20);
  ctx.lineTo(-side + 20, -w);
  ctx.lineTo(-w, -w);
  ctx.closePath();
  ctx.fill();

  if (!isShadow) {
    ctx.strokeStyle = colors.panelLine;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w, 60);
    ctx.lineTo(w, 60);
    ctx.moveTo(-w, 140);
    ctx.lineTo(w, 140);
    ctx.stroke();
  }
}

function drawVentUnit(ctx, colors) {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-30, -20, 60, 40);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  for (let i = -25; i < 30; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, -20);
    ctx.lineTo(i, 20);
    ctx.stroke();
  }
  ctx.strokeStyle = colors.hazardYellow;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(-32, -22, 64, 44);
  ctx.setLineDash([]);
}

function drawServerUnit(ctx, time, colors) {
  ctx.fillStyle = colors.darkMetal;
  ctx.fillRect(-30, -35, 60, 70);
  for (let i = 0; i < 3; i++) {
    const yPos = -25 + i * 20;
    ctx.fillStyle = "#000";
    ctx.fillRect(-25, yPos, 50, 10);
    const pulse = (Math.sin(time * 2 + i) + 1) / 2;
    ctx.fillStyle = `rgba(0, 255, 65, ${0.2 + pulse * 0.8})`;
    ctx.fillRect(10, yPos + 3, 12, 4);
    ctx.fillRect(-20, yPos + 3, 4, 4);
  }
}

function drawPipeUnit(ctx) {
  ctx.fillStyle = "#222";
  ctx.fillRect(-30, -30, 60, 60);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 10;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(40, -15);
  ctx.lineTo(-20, -15);
  ctx.moveTo(40, 15);
  ctx.lineTo(-20, 15);
  ctx.stroke();
  ctx.fillStyle = "#444";
  ctx.beginPath();
  ctx.arc(-10, -15, 8, 0, Math.PI * 2);
  ctx.arc(-10, 15, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(0, 255, 65, 0.4)`;
  ctx.fillRect(-14, -17, 8, 4);
  ctx.fillRect(-14, 13, 8, 4);
}

function drawExtensionTank(ctx, time) {
  ctx.fillStyle = "#151515";
  ctx.fillRect(-35, -30, 70, 60);
  const grad = ctx.createLinearGradient(-20, 0, 20, 0);
  grad.addColorStop(0, "#222");
  grad.addColorStop(0.5, "#444");
  grad.addColorStop(1, "#222");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -15, 20, Math.PI, 0);
  ctx.arc(0, 15, 20, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#001122";
  ctx.fillRect(-5, -15, 10, 30);
  const level = Math.sin(time) * 10;
  ctx.fillStyle = `rgba(0, 255, 65, 0.6)`;
  ctx.fillRect(-5, level, 10, 15 - level);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-40, 0);
  ctx.moveTo(20, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();
}

function drawStorageUnit(ctx, colors) {
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(-30, -20);
  ctx.lineTo(30, -20);
  ctx.lineTo(35, 20);
  ctx.lineTo(-35, 20);
  ctx.fill();
  ctx.fillStyle = "#555";
  ctx.fillRect(-10, -5, 20, 10);
  ctx.fillStyle = colors.hazardYellow;
  for (let i = -25; i < 30; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, 15);
    ctx.lineTo(i + 5, 15);
    ctx.lineTo(i - 2, 20);
    ctx.lineTo(i - 7, 20);
    ctx.fill();
  }
}

function drawCenterHub(ctx) {
  ctx.fillStyle = "#1e1e22";
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const r = 20;
    const cx = Math.cos(angle) * r;
    const cy = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-35, -35);
  ctx.lineTo(-20, -20);
  ctx.moveTo(35, -35);
  ctx.lineTo(20, -20);
  ctx.moveTo(-35, 35);
  ctx.lineTo(-20, 20);
  ctx.moveTo(35, 35);
  ctx.lineTo(20, 20);
  ctx.stroke();
}

function drawGlow(ctx, time, colors) {
  const corePulse = (Math.sin(time * 1.5) + 1) / 2;
  const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
  grad.addColorStop(0, `rgba(0, 255, 65, ${0.3 + corePulse * 0.3})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(0, 255, 65, ${0.2 + corePulse * 0.1})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const offset = 45;
  ctx.moveTo(-offset, -offset);
  ctx.lineTo(-20, -20);
  ctx.moveTo(offset, -offset);
  ctx.lineTo(20, -20);
  ctx.moveTo(-offset, offset);
  ctx.lineTo(-20, 20);
  ctx.moveTo(offset, offset);
  ctx.lineTo(20, 20);
  ctx.stroke();
  ctx.strokeStyle = `rgba(0, 255, 65, 0.1)`;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(0, 150);
  ctx.stroke();
}
