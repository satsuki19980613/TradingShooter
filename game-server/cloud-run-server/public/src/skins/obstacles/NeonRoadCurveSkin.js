// =========================================================
// ここから追加：ネオンロード（カーブ）
// ※エディタで回転(Rotation)させるため、基本形（右下中心＝左上カーブ）として定義します
// =========================================================
export const NeonRoadCurveSkin = () => {
  return (ctx, w, h) => {
    const roadWidth = w * 0.8;
    const margin = (w - roadWidth) / 2;
    const lineWidth = 4;
    const cyanColor = '#00ffff';
    const whiteColor = '#ffffff';

    // カーブパラメータ (Bottom-Right Center)
    const centerX = w;
    const centerY = h;
    const radiusOuter = w - margin;
    const radiusInner = margin;
    const radiusCenter = w / 2;
    const startAngle = Math.PI; 
    const endAngle = 1.5 * Math.PI;

    // --- 1. ベース描画 ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusOuter, startAngle, endAngle);
    ctx.arc(centerX, centerY, radiusInner, endAngle, startAngle, true);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // ノイズ描画
    const noiseCount = (w * h) * 0.05;
    for (let i = 0; i < noiseCount; i++) {
        // 簡易的に全体に散らす（クリッピングされているので安全）
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
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusOuter, startAngle, endAngle); ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusInner, startAngle, endAngle); ctx.stroke();
    
    // 中央線 (White Dashed)
    ctx.strokeStyle = whiteColor;
    ctx.shadowColor = whiteColor;
    ctx.shadowBlur = 5;
    ctx.setLineDash([20, 20]);
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusCenter, startAngle, endAngle); ctx.stroke();

    ctx.restore();
  };
};

// 既存の ObstacleSkins オブジェクトにマージしてください
export const ObstacleSkins = {
  // ...既存の定義...
  
  // 新規追加
  "obs-road-straight": NeonRoadStraightSkin(),
  "obs-road-curve": NeonRoadCurveSkin(),
  
  // ...
  default: (ctx, w, h) => { /* ... */ }
};