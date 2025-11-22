// public/src/skins/PlayerSkins.js

export const PlayerSkins = {
    /**
     * ホバータンクの車体 (Chassis)
     * @param {string} primaryColor - メインカラー (例: "#00e5ff")
     */
    chassis: (primaryColor) => {
        const secondaryColor = "#006064"; // 濃いシアン

        return (ctx, w, h) => {
            // 中心座標 (キャッシュ画像の真ん中)
            const cx = w / 2;
            const cy = h / 2;

            // ネオン発光エフェクト
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 15;

            ctx.translate(cx, cy);

            // --- 左右のホバーポッド ---
            ctx.fillStyle = secondaryColor;
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;

            const podW = 12;
            const podH = 40;
            const podX = 20;

            // 描画関数 (パス定義)
            const drawPod = (xSign) => {
                ctx.beginPath();
                // 浮遊アニメーション(hoverOffset)は動的なのでここでは描かず、
                // キャッシュでは「標準状態」を描きます
                ctx.moveTo(xSign * podX, -podH * 0.8);
                ctx.lineTo(xSign * (podX + podW), -podH);
                ctx.lineTo(xSign * (podX + podW), podH);
                ctx.lineTo(xSign * podX, podH * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            };

            drawPod(-1); // 左
            drawPod(1);  // 右

            // --- 中央ボディ ---
            ctx.fillStyle = "rgba(0, 20, 30, 0.9)";
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(15, -10);
            ctx.lineTo(15, 20);
            ctx.lineTo(0, 30);
            ctx.lineTo(-15, 20);
            ctx.lineTo(-15, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // --- リアクターコア ---
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
            
            // コア内の十字
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
            ctx.stroke();
        };
    },

    /**
     * 砲塔 (Turret)
     * @param {string} primaryColor 
     */
    turret: (primaryColor) => {
        const secondaryColor = "#006064";
        const coreColor = "#ffffff";

        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            
            ctx.translate(cx, cy);

            // バレル (砲身)
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 10;
            ctx.fillStyle = "#000";
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.rect(4, -3, 35, 6); // メインバレル
            ctx.rect(4, -10, 25, 4); // サブバレル
            ctx.fill();
            ctx.stroke();

            // タレット基部
            ctx.fillStyle = secondaryColor;
            ctx.beginPath();
            ctx.moveTo(-10, -12);
            ctx.lineTo(10, -8);
            ctx.lineTo(15, 0);
            ctx.lineTo(10, 8);
            ctx.lineTo(-10, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // センターコア発光
            ctx.fillStyle = coreColor;
            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        };
    }
};