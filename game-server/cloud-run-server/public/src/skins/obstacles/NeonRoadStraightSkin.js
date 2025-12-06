// =========================================================
// ここから追加：ネオンロード（直線）
// =========================================================
export const NeonRoadStraightSkin = () => {
  return (ctx, w, h) => {
    const roadWidth = w * 0.8;
    const margin = (w - roadWidth) / 2;
    const lineWidth = 4;
    const cyanColor = '#00ffff';
    const whiteColor = '#ffffff';

    // --- 1. ベース描画 ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin, 0, roadWidth, h);
    ctx.clip();
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // ノイズ描画
    const noiseCount = (w * h) * 0.05;
    for (let i = 0; i < noiseCount; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        const size = Math.random() * 2;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = Math.random() > 0.5 
            ? `rgba(0, 0, 0, ${alpha})` 
            : `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(nx, ny, size, size);
    }
    ctx.restore();

    // --- 2. ライン描画 ---
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineWidth = lineWidth;

    // サイドライン (Cyan)
    ctx.strokeStyle = cyanColor;
    ctx.shadowColor = cyanColor;
    ctx.shadowBlur = 15;
    
    ctx.beginPath(); ctx.moveTo(margin, 0); ctx.lineTo(margin, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - margin, 0); ctx.lineTo(w - margin, h); ctx.stroke();
    
    // 中央線 (White Dashed)
    ctx.strokeStyle = whiteColor;
    ctx.shadowColor = whiteColor;
    ctx.shadowBlur = 5;
    ctx.setLineDash([20, 20]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    
    ctx.restore();
  };
};

