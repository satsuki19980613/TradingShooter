// MapEditor_Standalone/src/skins/obstacles/PowerPlant.js

export const PowerPlantSkin = () => {
    return (ctx, w, h) => {
        const cx = w / 2;
        const cy = h / 2;

        // 1. ベースの筐体
        const baseGrad = ctx.createLinearGradient(0, 0, w, h);
        baseGrad.addColorStop(0, "#2b323c");
        baseGrad.addColorStop(0.5, "#3c4550");
        baseGrad.addColorStop(1, "#1a1f26");

        ctx.fillStyle = baseGrad;
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

        ctx.strokeStyle = "#566578";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. 内部の排熱口エリア
        const padding = 15;
        const innerSize = w - padding * 2;
        ctx.fillStyle = "#111";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
        ctx.fillRect(padding, padding, innerSize, innerSize);
        ctx.shadowBlur = 0;

        // 3. 冷却ファン
        const fanRadius = innerSize / 2 - 5;
        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(0, 0, fanRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#555";
        for (let i = 0; i < 4; i++) {
            ctx.rotate((Math.PI / 2));
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, fanRadius, 0, 0.5);
            ctx.fill();
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(100, 255, 218, 0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, fanRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // 4. 四隅の警告灯
        const lightSize = 6;
        const lightOffset = 8;
        ctx.fillStyle = "#ff3d00";
        ctx.shadowColor = "#ff3d00";
        ctx.shadowBlur = 15;

        ctx.beginPath(); ctx.arc(lightOffset, lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w - lightOffset, lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(lightOffset, h - lightOffset, lightSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w - lightOffset, h - lightOffset, lightSize, 0, Math.PI*2); ctx.fill();

        // 5. ディテール線
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h/2); ctx.lineTo(padding, h/2);
        ctx.moveTo(w, h/2); ctx.lineTo(w - padding, h/2);
        ctx.stroke();
    };
};