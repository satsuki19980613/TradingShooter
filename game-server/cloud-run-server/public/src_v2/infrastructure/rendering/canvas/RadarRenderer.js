export class RadarRenderer {
  draw(ctx, canvasWidth, canvasHeight, worldWidth, worldHeight, playerState, enemiesState, obstaclesState, otherPlayersState) {
    const dpr = window.devicePixelRatio || 1;
    let uiScale = 1;
    try {
      const val = getComputedStyle(document.body).getPropertyValue("--ui-scale");
      if (val) uiScale = parseFloat(val);
    } catch (e) {}
    if (!uiScale || isNaN(uiScale)) uiScale = 1;
    const ratio = dpr * uiScale;

    const size = Math.min(canvasWidth, canvasHeight);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
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

    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius * 0.33, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    const gap = 10 * ratio;
    ctx.moveTo(centerX - radarRadius, centerY);
    ctx.lineTo(centerX - gap, centerY);
    ctx.moveTo(centerX + gap, centerY);
    ctx.lineTo(centerX + radarRadius, centerY);
    ctx.moveTo(centerX, centerY - radarRadius);
    ctx.lineTo(centerX, centerY - gap);
    ctx.moveTo(centerX, centerY + gap);
    ctx.lineTo(centerX, centerY + radarRadius);
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 2);
    const scanGrad = ctx.createLinearGradient(0, 0, radarRadius, 0);
    scanGrad.addColorStop(0, "rgba(0, 255, 255, 0)");
    scanGrad.addColorStop(1, "rgba(0, 255, 255, 0.15)");

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radarRadius, -0.2, 0);
    ctx.fillStyle = scanGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radarRadius, 0);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    if (!playerState) {
      ctx.restore();
      return;
    }

    const getRadarPos = (wx, wy) => {
      const dx = wx - playerState.x;
      const dy = wy - playerState.y;
      return {
        x: centerX + dx * scale,
        y: centerY + dy * scale,
      };
    };

    if (enemiesState && enemiesState.length > 0) {
      enemiesState.forEach((enemy) => {
        const pos = getRadarPos(enemy.x, enemy.y);
        const distSq = (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2;
        if (distSq <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.fillStyle = "#ff3333";
          ctx.shadowColor = "#ff0000";
          ctx.shadowBlur = 6 * ratio;
          ctx.arc(pos.x, pos.y, 2.5 * ratio, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    if (otherPlayersState && otherPlayersState.length > 0) {
      otherPlayersState.forEach((p) => {
        const pos = getRadarPos(p.x, p.y);
        const distSq = (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2;
        if (distSq <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.fillStyle = "#00ff88";
          ctx.shadowColor = "#00ff00";
          ctx.shadowBlur = 5 * ratio;
          ctx.arc(pos.x, pos.y, 2.5 * ratio, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    const myRot = playerState.rotationAngle !== undefined ? playerState.rotationAngle : playerState.aimAngle;
    ctx.rotate(myRot + Math.PI / 2);

    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 8 * ratio;

    ctx.beginPath();
    const s = 4 * ratio;
    ctx.moveTo(0, -s * 1.5);
    ctx.lineTo(s, s);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(-s, s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "#00bcd4";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius + 3 * ratio, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 188, 212, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([10 * ratio, 10 * ratio]);
    ctx.stroke();

    ctx.restore();
  }
}