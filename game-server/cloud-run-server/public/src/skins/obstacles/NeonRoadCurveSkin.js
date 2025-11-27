export const NeonRoadCurveSkin = () => {
  return (ctx, w, h) => {
    // パラメータ設定
    const lineWidth = 4;
    const cyanColor = '#00ffff';
    const whiteColor = '#ffffff';

    // ★重要: カーブの中心を「画像の右下隅」に設定します
    // これにより、画像の枠内に「左上に向かうカーブ」が描かれます
    const centerX = w;
    const centerY = h;

    // 半径と道幅の計算
    // 縦横どちらか小さい方に合わせると破綻しにくいです
    const baseSize = Math.min(w, h);
    
    // 道幅 (全体の60%くらい)
    const roadWidth = baseSize * 0.6;
    const margin = (baseSize - roadWidth) / 2;

    // 外側と内側の半径
    const radiusOuter = baseSize - margin;
    const radiusInner = margin;
    const radiusCenter = (radiusOuter + radiusInner) / 2;

    // 描画する角度: 180度(左) ～ 270度(上)
    const startAngle = Math.PI;
    const endAngle = 1.5 * Math.PI;

    // --- 1. ベース（アスファルト部分）描画 ---
    ctx.save();
    ctx.beginPath();
    // 外側の円弧
    ctx.arc(centerX, centerY, radiusOuter, startAngle, endAngle);
    // 内側の円弧（逆周りで閉じる）
    ctx.arc(centerX, centerY, radiusInner, endAngle, startAngle, true);
    ctx.closePath();
    
    // 範囲外にはみ出さないようクリッピング
    ctx.save();
    ctx.clip();
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // ノイズ（路面の質感）描画
    const noiseCount = (w * h) * 0.05;
    for (let i = 0; i < noiseCount; i++) {
        const nx = Math.random() * w; // 全体に散らす（クリップされるのでOK）
        const ny = Math.random() * h;
        const size = Math.random() * 2;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = Math.random() > 0.5 
            ? `rgba(0, 0, 0, ${alpha})` 
            : `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(nx, ny, size, size);
    }
    ctx.restore(); // clip解除

    // --- 2. ライン（ネオン・白線）描画 ---
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
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusCenter, startAngle, endAngle); 
    ctx.stroke();

    ctx.restore();
  };
};