/**
 * Plasma Generator (プラズマ発生機)
 * 六角形のコアと、3つのサテライト・パイロンで構成された非矩形の障害物。
 * 時間経過で中央が脈動します。
 */
export const PlasmaGeneratorSkin = () => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    const radius = (Math.min(w, h) / 2) * 0.85;

    const time = Date.now();
    const pulse = (Math.sin(time / 500) + 1) / 2;
    const rotation = time / 2000;

    ctx.translate(cx, cy);

    ctx.save();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, radius);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    for (let i = 0; i < 3; i++) {
      const angle = ((Math.PI * 2) / 3) * i;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      ctx.fillStyle = "#263238";
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#00bcd4";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#00bcd4";
      ctx.shadowColor = "#00bcd4";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    ctx.save();

    const drawHexagon = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    ctx.fillStyle = "#37474f";
    drawHexagon(radius * 0.6);
    ctx.fill();
    ctx.strokeStyle = "#546e7a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.rotate(rotation);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.rotate(-rotation * 2);
    const energySize = radius * 0.25 + pulse * 5;

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, energySize);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#00e5ff");
    grad.addColorStop(1, "rgba(0, 229, 255, 0)");

    ctx.fillStyle = grad;
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 20 + pulse * 10;

    ctx.beginPath();
    ctx.arc(0, 0, energySize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };
};
