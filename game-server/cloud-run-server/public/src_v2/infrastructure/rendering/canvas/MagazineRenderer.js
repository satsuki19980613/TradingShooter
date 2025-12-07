export class MagazineRenderer {
  draw(ctx, playerState, canvasWidth, canvasHeight) {
    if (!playerState) return;
    const dpr = window.devicePixelRatio || 1;
    let uiScale = 1;
    try {
      const val = getComputedStyle(document.body).getPropertyValue("--ui-scale");
      if (val) uiScale = parseFloat(val);
    } catch (e) {}
    if (!uiScale || isNaN(uiScale)) uiScale = 1;
    const ratio = dpr * uiScale;

    const stockedBullets = playerState.stockedBullets || [];
    const maxStock = playerState.maxStock || 10;
    const paddingY = 10 * ratio;
    const availableHeight = canvasHeight - paddingY * 2;
    const gap = 4 * ratio;
    const slotHeight = Math.floor((availableHeight - gap * (maxStock - 1)) / maxStock);
    const contentWidth = canvasWidth * 0.6;
    const startX = (canvasWidth - contentWidth) / 2 + 10 * ratio;
    const bottomY = canvasHeight - paddingY;

    ctx.save();
    ctx.transform(1, 0, -0.2, 1, 0, 0);

    for (let i = 0; i < maxStock; i++) {
      const currentY = bottomY - (i + 1) * (slotHeight + gap) + gap;
      const hasBullet = i < stockedBullets.length;
      const bulletInfo = stockedBullets[i];
      const damageVal = typeof bulletInfo === "object" ? bulletInfo.damage : bulletInfo;

      ctx.beginPath();
      ctx.rect(startX, currentY, contentWidth, slotHeight);
      ctx.fillStyle = "rgba(0, 20, 30, 0.5)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
      ctx.stroke();

      if (hasBullet) {
        let baseColor, glowColor;
        if (damageVal >= 100) {
          baseColor = "#b300ff";
          glowColor = "#ea80fc";
        } else if (damageVal >= 50) {
          baseColor = "#ff6d00";
          glowColor = "#ffab40";
        } else if (damageVal >= 25) {
          baseColor = "#00e676";
          glowColor = "#69f0ae";
        } else {
          baseColor = "#00bcd4";
          glowColor = "#84ffff";
        }

        ctx.save();
        const margin = 2 * ratio;
        ctx.beginPath();
        ctx.rect(startX + margin, currentY + margin, contentWidth - margin * 2, slotHeight - margin * 2);
        const grad = ctx.createLinearGradient(startX, currentY, startX + contentWidth, currentY);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.8, glowColor);
        grad.addColorStop(1, "#ffffff");

        ctx.fillStyle = grad;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 10 * ratio;
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(startX + margin, currentY + margin, contentWidth - margin * 2, (slotHeight - margin * 2) * 0.3);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}