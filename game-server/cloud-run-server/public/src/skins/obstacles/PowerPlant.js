/**
 * Power Plant (発電施設) の描画ロジック
 * 立体感のある金属筐体、中央のファン、警告灯を描画します。
 */
export const PowerPlantSkin = () => {
    return (ctx, w, h) => {
        const cx = w / 2;
        const cy = h / 2;

        // 1. ベースの筐体（金属的なグラデーションで立体感を出す）
        const baseGrad = ctx.createLinearGradient(0, 0, w, h);
        baseGrad.addColorStop(0, "#2b323c");
        baseGrad.addColorStop(0.5, "#3c4550");
        baseGrad.addColorStop(1, "#1a1f26");

        ctx.fillStyle = baseGrad;
        // 角を少し削ったような形状
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(w - 10, 0);
        ctx.lineTo(w, 10);
        ctx.lineTo(w, h - 10);
        ctx.lineTo(w - 10, h);
        ctx.lineTo(10, h);
        ctx.lineTo(0, h - 10);
        ctx.lineTo(0, 10);
        ctx.closePath();
        ctx.fill();

        // 枠線（ハイライト）
        ctx.strokeStyle = "#566578";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. 内部の排熱口エリア（一段凹んだ表現）
        const padding = 15;
        const innerSize = w - padding * 2;
        ctx.fillStyle = "#111"; // 暗い穴
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
        ctx.fillRect(padding, padding, innerSize, innerSize);
        ctx.shadowBlur = 0; // リセット

        // 3. 冷却ファン（中央の丸い構造物）
        const fanRadius = innerSize / 2 - 5;
        
        ctx.save();
        ctx.translate(cx, cy);

        // ファンの土台
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(0, 0, fanRadius, 0, Math.PI * 2);
        ctx.fill();

        // ファンのブレード（羽）
        ctx.fillStyle = "#555";
        for (let i = 0; i < 4; i++) {
            ctx.rotate((Math.PI / 2)); // 90度ずつ回転
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, fanRadius, 0, 0.5); // 扇形
            ctx.fill();
            
            // ブレードのハイライト
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // 中央のハブ
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 回転しているかのようなブレ (同心円の線)
        ctx.strokeStyle = "rgba(100, 255, 218, 0.1)"; // 薄いシアン
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, fanRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // 4. 四隅の警告灯（発光エフェクト）
        const lightSize = 6;
        const lightOffset = 8;
        
        ctx.fillStyle = "#ff3d00"; // 赤オレンジ
        ctx.shadowColor = "#ff3d00";
        ctx.shadowBlur = 15; // 強く発光させる

        // 左上
        ctx.beginPath(); ctx.arc(lightOffset, lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        // 右上
        ctx.beginPath(); ctx.arc(w - lightOffset, lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        // 左下
        ctx.beginPath(); ctx.arc(lightOffset, h - lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        // 右下
        ctx.beginPath(); ctx.arc(w - lightOffset, h - lightOffset, lightSize, 0, Math.PI*2); ctx.fill();

        // 5. ディテール線（パネルライン）
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h/2); ctx.lineTo(padding, h/2); // 左の線
        ctx.moveTo(w, h/2); ctx.lineTo(w - padding, h/2); // 右の線
        ctx.stroke();
    };
};