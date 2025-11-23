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
  },

  
  item_ep: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      // 緑色の発光
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ccffcc";

      // 中心核
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // 外側のリング
      ctx.shadowBlur = 5;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      // +EP テキスト
      ctx.fillStyle = "#00ff00";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EP", 0, 0);
    };
  },
  item_ep_base: () => {
        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // 背景のグロー
            const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
            gradient.addColorStop(0, "rgba(0, 255, 128, 0.8)");
            gradient.addColorStop(1, "rgba(0, 255, 128, 0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();

            // テキスト
            ctx.shadowColor = "#00ff00";
            ctx.shadowBlur = 5;
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px 'Verdana', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("EP", 0, 1);
        };
    },

    // 2. クリスタル（回転する正方形）
    item_ep_crystal: () => {
        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            ctx.strokeStyle = "#00ffaa";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#00ffaa";
            ctx.shadowBlur = 10; // 重い処理だがキャッシュされるのでOK

            const size = 12;
            ctx.beginPath();
            ctx.rect(-size, -size, size * 2, size * 2);
            ctx.stroke();

            ctx.fillStyle = "rgba(0, 255, 170, 0.2)";
            ctx.fill();
        };
    },

    // 3. リング（外側の破線）
    item_ep_ring: () => {
        return (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]);
            
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
        };
    }
};
