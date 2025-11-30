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
  player_special_4: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      const color = '#b300ff'; // Purple
      const secColor = '#ccff00'; // Lime
      
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 弾丸の中心(0,0)から前後へ長く伸ばしてビームに見せる
      // 長さ: 3000px (画面外まで届くように)
      const beamLen = 1500; 
      
      // 1. コアビーム (白くて太い芯)
      const jitter = Math.random() * 4;
      ctx.shadowBlur = 30;
      ctx.shadowColor = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 10 + jitter;
      
      ctx.beginPath();
      ctx.moveTo(-beamLen, 0); 
      ctx.lineTo(beamLen, 0); 
      ctx.stroke();

      // 2. ヘイズ (色のついた外光)
      ctx.shadowBlur = 60;
      ctx.strokeStyle = color;
      ctx.lineWidth = 30;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-beamLen, 0);
      ctx.lineTo(beamLen, 0);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // 3. 稲妻エフェクト (Baribari)
      const lightningCount = 3;
      const segments = 20; // 分割数
      const amplitude = 30; // 振幅

      for (let i = 0; i < lightningCount; i++) {
          const isSecondary = i % 2 === 0;
          ctx.strokeStyle = isSecondary ? secColor : '#fff'; 
          ctx.lineWidth = Math.random() * 3 + 1;
          ctx.shadowBlur = 15;
          ctx.shadowColor = secColor;

          ctx.beginPath();
          // ビームに沿ってランダムな稲妻を描く
          // 長すぎるので、現在の視界範囲付近だけ描画するなど最適化しても良いが、
          // 見た目重視で簡易的に描く
          
          let currX = -beamLen;
          let currY = 0;
          ctx.moveTo(currX, currY);

          // セグメント分割してジグザグさせる
          const step = (beamLen * 2) / segments;
          
          for (let s = 0; s <= segments; s++) {
              currX += step;
              // Y軸方向にランダムオフセット
              const offset = (Math.random() - 0.5) * amplitude * 2;
              ctx.lineTo(currX, offset);
          }
          ctx.stroke();
      }
    };
  },
};