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
  // ▼▼▼ ここから追加: 利益レベル別スキン (Tier 1〜4) ▼▼▼
  // -----------------------------------------------------------

  // Tier 1: Tick Shot (〜24 dmg) - 堅実な緑の弾
  player_special_1: () => {
    return (ctx, w, h) => {
      const cx = w / 2; const cy = h / 2;
      ctx.translate(cx, cy);

      // 緑系の発光
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#e0f7fa"; // 白っぽいシアン

      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); // 少し横長
      ctx.fill();
      
      // コア
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00bfa5";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    };
  },

  // Tier 2: Trade Hit (25〜49 dmg) - リッチな黄金の回転弾
  player_special_2: () => {
    return (ctx, w, h) => {
      const cx = w / 2; const cy = h / 2;
      ctx.translate(cx, cy);

      // 黄金の輝き
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 15;
      
      // 回転アニメーション
      const time = Date.now() / 150;
      ctx.rotate(time);

      // ダイヤ形状（外枠）
      ctx.strokeStyle = "#ffab00"; // 濃いオレンジ金
      ctx.lineWidth = 2;
      ctx.strokeRect(-6, -6, 12, 12);

      // 中身
      ctx.fillStyle = "#fff8e1"; // 白っぽい金
      ctx.fillRect(-4, -4, 8, 8);
    };
  },

  // Tier 3: Market Crash (50〜99 dmg) - 攻撃的な赤オレンジのスパイク弾
  player_special_3: () => {
    return (ctx, w, h) => {
      const cx = w / 2; const cy = h / 2;
      ctx.translate(cx, cy);

      // 激しいオレンジの発光
      ctx.shadowColor = "#ff3d00";
      ctx.shadowBlur = 20;
      
      // 回転（逆回転で不安感を演出）
      ctx.rotate(-Date.now() / 100);

      ctx.fillStyle = "#ffccbc";
      ctx.beginPath();
      const spikes = 6;
      const outerRadius = 16;
      const innerRadius = 6;
      
      // ギザギザを描画
      for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const a = (Math.PI * i) / spikes;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      
      // 赤い芯
      ctx.strokeStyle = "#d50000";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
  },

  // Tier 4: Liquidation (100〜 dmg) - 一撃必殺のブラックホール/極太レーザー
  player_special_4: () => {
    return (ctx, w, h) => {
      const cx = w / 2; const cy = h / 2;
      ctx.translate(cx, cy);
      
      const time = Date.now();

      // 禍々しい紫のオーラ（明滅する）
      const pulse = 20 + Math.sin(time / 50) * 10;
      ctx.shadowColor = "#d500f9"; 
      ctx.shadowBlur = pulse;
      
      // 漆黒のコア (ブラックホール的表現)
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // 周囲を取り巻くエネルギーリング
      ctx.strokeStyle = "#ff00ff"; // マゼンタ
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();

      // バチバチするスパーク (稲妻)
      ctx.strokeStyle = "#00ffff"; // シアンでコントラスト
      ctx.lineWidth = 2;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      
      // ランダムなスパークを4方向に飛ばす
      for(let i=0; i<4; i++) {
          // 角度を少しずつずらして回転させる
          const angle = (Math.PI/2) * i + time/150; 
          ctx.moveTo(Math.cos(angle)*14, Math.sin(angle)*14);
          // ジグザグさせる
          const midX = Math.cos(angle + 0.2) * 22;
          const midY = Math.sin(angle + 0.2) * 22;
          ctx.lineTo(midX, midY);
          ctx.lineTo(Math.cos(angle)*30, Math.sin(angle)*30);
      }
      ctx.stroke();
    };
  },
};
