/**
 * Cyberpunk Neon Road Curve Skin (Supports Flip)
 * isFlipped = true で左右反転（左側の直線から右カーブ）に対応
 */
export const NeonRoadCurveSkin = (isFlipped = false) => {
  return (ctx, w, h) => {
    // --- パラメータ設定 ---
    const roadWidth = w * 0.8;
    const margin = (w - roadWidth) / 2;
    const lineWidth = 4;

    const colorAsphalt = '#1a1a1a';
    const colorCyan = '#00ffff';
    const colorWhite = '#ffffff';

    // 形状計算
    const curveSize = w; 
    const straightHeight = Math.max(0, h - curveSize);
    
    // カーブの中心点（右上の角）
    const centerX = w;
    const centerY = straightHeight;

    const radiusOuter = w - margin;
    const radiusInner = margin;
    const radiusCenter = w / 2;

    const angleSide = Math.PI;      // 180度
    const angleBottom = Math.PI * 0.5; // 90度

    // ▼▼▼ 反転処理の開始 ▼▼▼
    ctx.save();
    if (isFlipped) {
      // キャンバスの右端へ移動し、X軸をマイナス倍して左右反転させる
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    // ▲▲▲ 反転処理ここまで ▲▲▲

    // --- 1. ベース描画 (一筆書きで塗りつぶし) ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w - margin, 0);
    ctx.lineTo(w - margin, straightHeight);
    ctx.arc(centerX, centerY, radiusInner, angleSide, angleBottom, true);
    ctx.lineTo(w, straightHeight + radiusOuter);
    ctx.arc(centerX, centerY, radiusOuter, angleBottom, angleSide, false);
    ctx.lineTo(margin, 0);
    ctx.closePath();

    ctx.fillStyle = colorAsphalt;
    ctx.fill();

    // ノイズ描画
    ctx.clip();
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
    ctx.lineCap = 'butt';
    ctx.lineWidth = lineWidth;

    // サイドライン (Cyan)
    ctx.save();
    ctx.strokeStyle = colorCyan;
    ctx.shadowColor = colorCyan;
    ctx.shadowBlur = 15;

    // 外側ライン
    ctx.beginPath();
    ctx.moveTo(margin, 0);
    ctx.lineTo(margin, straightHeight);
    ctx.arc(centerX, centerY, radiusOuter, angleSide, angleBottom, true);
    ctx.stroke();

    // 内側ライン
    ctx.beginPath();
    ctx.moveTo(w - margin, 0);
    ctx.lineTo(w - margin, straightHeight);
    ctx.arc(centerX, centerY, radiusInner, angleSide, angleBottom, true);
    ctx.stroke();
    ctx.restore();

    // 中央線 (White Dashed)
    ctx.save();
    ctx.strokeStyle = colorWhite;
    ctx.shadowColor = colorWhite;
    ctx.shadowBlur = 5;
    ctx.setLineDash([20, 20]);
    
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, straightHeight);
    ctx.arc(centerX, centerY, radiusCenter, angleSide, angleBottom, true);
    ctx.stroke();
    ctx.restore();

    // ▼▼▼ 反転コンテキストの復元 ▼▼▼
    ctx.restore(); 
  };
};