export const BulletSkins = {
  player: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ccffcc";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 5;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
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
      const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
      gradient.addColorStop(0, "rgba(0, 255, 128, 0.8)");
      gradient.addColorStop(1, "rgba(0, 255, 128, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'Verdana', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EP", 0, 1);
    };
  },

  item_ep_crystal: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 10;
      const size = 12;
      ctx.beginPath();
      ctx.rect(-size, -size, size * 2, size * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 255, 170, 0.2)";
      ctx.fill();
    };
  },

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
  },

  // -----------------------------------------------------------
  // ▼▼▼ 新エフェクト: Tier 1〜4 ▼▼▼
  // -----------------------------------------------------------

  // Tier 1: Standard
  player_special_1: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      const color = '#00aaff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.fill();
    };
  },

  // Tier 2: Plasma
  player_special_2: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      const color = '#ff00ff';
      const time = Date.now();
      const wobble = Math.sin(time * 0.02) * 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + wobble, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    };
  },

  // Tier 3: Nova (サイズアップ & 脈動強化)
  player_special_3: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      const mainColor = '#ffeb3b';
      const subColor = '#ff5722';
      const time = Date.now();
      const pulse = Math.sin(time * 0.05) * 5; // 脈動幅アップ

      ctx.globalCompositeOperation = 'lighter';

      // 1. アウターグロー
      ctx.shadowBlur = 50;
      ctx.shadowColor = subColor;
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      // サイズ: 10 -> 25 (大幅アップ)
      ctx.arc(0, 0, 25 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. コア
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fff';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
    };
  },

  // Tier 4: Gamma (完全再現レーザー)
  // Tier 4: Gamma (完全再現レーザー) - 修正版
  // ... (他のスキン定義) ...

  // Tier 4: Gamma (一本の線 + 稲妻)
  // Tier 4: Gamma (修正版: 長さを動的に反映)
  // 引数に currentLength を追加 (デフォルトは十分な長さ)
  player_special_4: (currentLength = 3000) => {
    return (ctx, w, h) => {
      // 弾の先端(0,0)が現在の弾丸位置。
      // そこから -currentLength 分だけ後ろ（発射位置）まで線を引く。
      
      const color = '#b300ff'; // Purple
      const secColor = '#ccff00'; // Lime
      
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. コアビーム
      const jitter = Math.random() * 1;
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 + jitter; 
      
      ctx.beginPath();
      ctx.moveTo(-currentLength, 0); // 発射位置から
      ctx.lineTo(0, 0);              // 先端まで
      ctx.stroke();

      // 2. ヘイズ
      ctx.shadowBlur = 40;
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.moveTo(-currentLength, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.globalAlpha /= 0.8;

      // 3. 稲妻エフェクト
      // 長さに応じて分割数を調整 (100pxあたり1セグメントなど)
      const segments = Math.max(5, Math.floor(currentLength / 50));
      const amplitude = 8;
      const lightningCount = 2;

      for (let i = 0; i < lightningCount; i++) {
          const isSecondary = i % 2 === 0;
          ctx.strokeStyle = isSecondary ? secColor : '#fff'; 
          ctx.lineWidth = Math.random() * 1.5 + 0.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = secColor;

          ctx.beginPath();
          
          let currX = -currentLength;
          let currY = 0;
          ctx.moveTo(currX, currY);

          const step = currentLength / segments;
          for (let s = 0; s <= segments; s++) {
              currX += step;
              // 先端(0)付近以外でランダムに揺らす
              // (先端は弾の当たり判定と一致させたいので揺らさない)
              const offset = (Math.random() - 0.5) * amplitude * 2;
              const taper = Math.min(1.0, Math.abs(currX) / 200); 

              ctx.lineTo(currX, offset * taper);
          }
          ctx.stroke();
      }
    };
  },
};