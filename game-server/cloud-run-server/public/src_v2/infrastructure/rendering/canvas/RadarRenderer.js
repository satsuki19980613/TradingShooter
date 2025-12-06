/**
 * レーダー描画レンダラー
 */
export class RadarRenderer {
  draw(ctx, width, height, worldWidth, worldHeight, player, enemies, obstacles, otherPlayers) {
    if (!player) return;
    const dpr = window.devicePixelRatio || 1;
    // UIスケールの取得ロジックはAppFlowManager等から渡される想定、ここでは簡易化
    const ratio = dpr; 

    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radarRadius = (size * 0.9) / 2;
    const viewRadiusWorld = 1500;
    const scale = radarRadius / viewRadiusWorld;
    const time = Date.now() / 1000;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(0, 20, 30, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    ctx.beginPath(); ctx.arc(centerX, centerY, radarRadius * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radarRadius * 0.66, 0, Math.PI * 2); ctx.stroke();

    // スキャンライン
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 2);
    const scanGrad = ctx.createLinearGradient(0, 0, radarRadius, 0);
    scanGrad.addColorStop(0, "rgba(0, 255, 255, 0)");
    scanGrad.addColorStop(1, "rgba(0, 255, 255, 0.15)");
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radarRadius, -0.2, 0);
    ctx.fillStyle = scanGrad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radarRadius, 0);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)"; ctx.stroke();
    ctx.restore();

    const getRadarPos = (wx, wy) => ({
      x: centerX + (wx - player.x) * scale,
      y: centerY + (wy - player.y) * scale,
    });

    if (enemies) {
      enemies.forEach((enemy) => {
        const pos = getRadarPos(enemy.x, enemy.y);
        if ((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2 <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.fillStyle = "#ff3333";
          ctx.arc(pos.x, pos.y, 2.5 * ratio, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    if (otherPlayers) {
      otherPlayers.forEach((p) => {
        const pos = getRadarPos(p.x, p.y);
        if ((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2 <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.fillStyle = "#00ff88";
          ctx.arc(pos.x, pos.y, 2.5 * ratio, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 自分
    ctx.save();
    ctx.translate(centerX, centerY);
    const myRot = player.rotationAngle !== undefined ? player.rotationAngle : player.aimAngle;
    ctx.rotate(myRot + Math.PI / 2);
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    const s = 4 * ratio;
    ctx.moveTo(0, -s * 1.5); ctx.lineTo(s, s); ctx.lineTo(0, s * 0.5); ctx.lineTo(-s, s);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}