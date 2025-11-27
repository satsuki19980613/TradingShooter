/**
 * Cyberpunk Road Obstacle (マイルド修正版)
 * グリッド削除 / 明度アップ / 点滅速度ダウン
 */
export const CyberpunkRoadSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // ★修正: 時間の進行係数を落として全体をゆっくりに (4 -> 2)
    const time = progress * Math.PI * 2; 
    
    const BASE_W = 300;
    const BASE_H = 400;

    const colors = {
      asphalt: "#2e3238", 
      lineWhite: "#e0e0e0",
      neonCyan: "#00f0ff",
      neonPink: "#ff003c",
      neonYellow: "#fcee0a",
      darkMetal: "#15151a", 
    };

    ctx.save();
    ctx.translate(cx, cy);

    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);

    // グロー効果（少し弱めに調整）
    ctx.shadowBlur = 10; 
    ctx.shadowColor = "rgba(0, 240, 255, 0.15)";

    // 1. 路面ベース
    drawRoadBase(ctx, colors, BASE_W, BASE_H);

    // 2. センターライン（移動）
    ctx.save();
    ctx.beginPath();
    ctx.rect(-BASE_W / 2 + 20, -BASE_H / 2, BASE_W - 40, BASE_H);
    ctx.clip();
    drawMovingLines(ctx, time, colors, BASE_H);
    ctx.restore();

    // 3. 路肩のバリアとライト
    drawSideBarriers(ctx, time, colors, BASE_W, BASE_H);

    // 4. テック装飾
    drawTechDecals(ctx, time, colors);

    // 5. オーバーレイ（明滅）
    ctx.globalCompositeOperation = "lighter";
    drawHologramOverlay(ctx, time, colors);

    ctx.restore();
  };
};

function drawRoadBase(ctx, colors, w, h) {
  const hw = w / 2;
  const hh = h / 2;

  ctx.fillStyle = colors.asphalt;
  ctx.beginPath();
  ctx.rect(-hw + 10, -hh, w - 20, h);
  ctx.fill();

  ctx.fillStyle = colors.darkMetal;
  ctx.fillRect(-hw, -hh, 20, h); 
  ctx.fillRect(hw - 20, -hh, 20, h); 

  ctx.strokeStyle = "#555"; 
  ctx.lineWidth = 2;
  ctx.strokeRect(-hw, -hh, 20, h);
  ctx.strokeRect(hw - 20, -hh, 20, h);
}

function drawMovingLines(ctx, time, colors, h) {
  const hh = h / 2;
  const dashHeight = 60;
  const gap = 40;
  const totalPitch = dashHeight + gap;
  
  // スクロール速度も少しゆっくりに (80 -> 60)
  const scrollOffset = (time * 60) % totalPitch;

  ctx.fillStyle = colors.neonCyan;
  ctx.shadowColor = colors.neonCyan;
  ctx.shadowBlur = 8; // ブラー軽減

  for (let y = -hh - totalPitch; y < hh + totalPitch; y += totalPitch) {
    const drawY = y + scrollOffset;
    ctx.fillRect(-15, drawY, 8, dashHeight);
    ctx.fillRect(7, drawY, 8, dashHeight);
  }
  
  ctx.shadowBlur = 0;
}

function drawSideBarriers(ctx, time, colors, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  const lightCount = 6;
  const spacing = h / lightCount;

  for (let i = 0; i < lightCount; i++) {
    const y = -hh + spacing * i + spacing / 2;
    
    // ★修正: 点滅頻度を大幅に下げる (time * 3 -> time * 1.5)
    // ゆっくり明滅するようにサイン波を調整
    const blinkVal = Math.sin(time * 1.5 + i);
    const isOn = blinkVal > 0.5; 
    
    ctx.fillStyle = isOn ? colors.neonPink : "#441111"; 
    if (isOn) {
        ctx.shadowColor = colors.neonPink;
        ctx.shadowBlur = 8;
    }
    
    // 左
    ctx.beginPath();
    ctx.moveTo(-hw, y - 10);
    ctx.lineTo(-hw + 15, y);
    ctx.lineTo(-hw, y + 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 右
    ctx.fillStyle = isOn ? colors.neonPink : "#441111";
    if (isOn) {
        ctx.shadowColor = colors.neonPink;
        ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(hw, y - 10);
    ctx.lineTo(hw - 15, y);
    ctx.lineTo(hw, y + 10);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawTechDecals(ctx, time, colors) {
  // ★修正: パルス速度を低下 (5 -> 2)
  const pulse = (Math.sin(time * 2) + 1) / 2;
  
  ctx.strokeStyle = `rgba(252, 238, 10, ${0.2 + pulse * 0.5})`; // 透明度も少し下げて目に優しく
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  
  const yPositions = [-120, 0, 120];
  
  yPositions.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(-60, y - 20);
    ctx.lineTo(-40, y);
    ctx.lineTo(-60, y + 20);
    ctx.moveTo(60, y - 20);
    ctx.lineTo(40, y);
    ctx.lineTo(60, y + 20);
    ctx.stroke();
  });
}

function drawHologramOverlay(ctx, time, colors) {
  // ★修正: スキャン速度を低下 (150 -> 80)
  const scanY = (time * 80) % 400 - 200; 
  
  // 全体的に薄くする
  ctx.fillStyle = `rgba(0, 240, 255, 0.03)`; 
  ctx.fillRect(-140, scanY, 280, 20);
  
  ctx.strokeStyle = `rgba(0, 240, 255, 0.1)`;
  ctx.beginPath();
  ctx.moveTo(-140, scanY + 20);
  ctx.lineTo(140, scanY + 20);
  ctx.stroke();
}