export const HexagonFortressSkin = (progress, color = '#00ffea') => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const size = (Math.min(w, h) / 2) * 0.85;
    const drawPolygon = (g, x, y, r, sides) => {
      if (sides < 3) return;
      const a = (Math.PI * 2) / sides;
      const offset = -Math.PI / 2;
      g.moveTo(x + r * Math.cos(offset), y + r * Math.sin(offset));
      for (let i = 1; i < sides; i++) {
        g.lineTo(x + r * Math.cos(offset + a * i), y + r * Math.sin(offset + a * i));
      }
      g.closePath();
    };
    ctx.translate(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size, 6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size, 6);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
};
