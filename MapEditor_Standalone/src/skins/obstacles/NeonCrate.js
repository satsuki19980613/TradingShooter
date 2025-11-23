/**
 * Neon Crate (ネオンクレート) の描画ロジック
 * @param {string} color - 主な色
 */
export const NeonCrateSkin = (color = "#00e5ff") => {
  return (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0a1525");
    grad.addColorStop(1, "#1c2e4a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.setLineDash([]);
  };
};
