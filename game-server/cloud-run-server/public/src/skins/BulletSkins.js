// public/src/skins/BulletSkins.js

export const BulletSkins = {
    player: () => {
        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // 発光
            ctx.shadowColor = "#00ffff";
            ctx.shadowBlur = 10; // 少し抑えめに(数が多いので)
            ctx.fillStyle = "#ffffff";

            // 弾本体
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // コア部分
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = "#00bcd4";
            ctx.beginPath();
            ctx.moveTo(-5, -3);
            ctx.lineTo(-18, 0);
            ctx.lineTo(-5, 3);
            ctx.fill();
        };
    },

    enemy: () => {
        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            ctx.shadowColor = "#ff5722";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "#ffffff";

            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#ff9800";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(-8, -5);
            ctx.lineTo(-6, 0);
            ctx.lineTo(-8, 5);
            ctx.closePath();
            ctx.stroke();
        };
    }
};