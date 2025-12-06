/**
 * GM専用スキン定義
 * "Realistic Magical Armored Car with Neon Decals"
 */
export const GMSkins = {
  /**
   * GM専用車体: Neon Dreadnought
   */
  chassis: () => {
    const settings = {
      neonCyan: '#00fff2',
      neonPink: '#ff00d4'
    };

    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      // アニメーション用時間
      const time = performance.now() / 1000; 

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2); // 右向きに補正
      ctx.scale(1.2, 1.2);     // 少し大きく

      // 1. 車体下部の影
      ctx.shadowColor = 'rgba(0, 229, 255, 0.2)';
      ctx.shadowBlur = 30;

      // 2. メインボディ描画 (drawBodyShape + drawCockpit)
      ctx.save();
      
      // パス定義：縦長 (全長を伸ばす)
      ctx.beginPath();
      ctx.moveTo(0, -130); // ノーズ
      ctx.lineTo(25, -90);
      ctx.lineTo(45, -30);
      ctx.lineTo(65, 0);
      ctx.lineTo(65, 70); 
      ctx.lineTo(40, 100); // テール
      ctx.lineTo(25, 110); 
      ctx.lineTo(-25, 110);
      ctx.lineTo(-40, 100);
      ctx.lineTo(-65, 70);
      ctx.lineTo(-65, 0);
      ctx.lineTo(-45, -30);
      ctx.lineTo(-25, -90);
      ctx.closePath();

      // メタリック塗装
      const grad = ctx.createLinearGradient(-50, -50, 50, 50);
      grad.addColorStop(0, '#2a3a4a');     
      grad.addColorStop(0.3, '#050508');   
      grad.addColorStop(0.5, '#001a22');   
      grad.addColorStop(0.7, '#050508');   
      grad.addColorStop(1, '#000');        
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      // センターライン
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(-15, -60);
      ctx.lineTo(15, -60);
      ctx.lineTo(10, 100);
      ctx.lineTo(-10, 100);
      ctx.fill();

      // コックピット
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(18, -10);
      ctx.lineTo(15, 25);
      ctx.lineTo(-15, 25);
      ctx.lineTo(-18, -10);
      ctx.closePath();
      const glassGrad = ctx.createLinearGradient(0, -20, 0, 25);
      glassGrad.addColorStop(0, '#003344');
      glassGrad.addColorStop(0.5, '#000');
      glassGrad.addColorStop(1, '#002233');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.strokeStyle = '#334455';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // ボディここまで

      // 3. ネオン装飾 (drawNeonDecals)
      ctx.save();
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      const flicker = 0.8 + Math.sin(time * 10) * 0.1;
      ctx.globalAlpha = flicker;

      // シアン
      ctx.shadowColor = settings.neonCyan;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = settings.neonCyan;
      ctx.beginPath();
      ctx.moveTo(-25, -90); ctx.lineTo(-55, -20);
      ctx.moveTo(25, -90); ctx.lineTo(55, -20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-60, 0); ctx.lineTo(-60, 65); ctx.lineTo(-38, 95);
      ctx.moveTo(60, 0); ctx.lineTo(60, 65); ctx.lineTo(38, 95);
      ctx.stroke();
      
      // ピンク
      ctx.shadowColor = settings.neonPink;
      ctx.strokeStyle = settings.neonPink;
      ctx.beginPath();
      ctx.moveTo(0, -125);
      ctx.lineTo(-10, -105); ctx.lineTo(0, -95); ctx.lineTo(10, -105);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 80); ctx.lineTo(-20, 90); ctx.lineTo(0, 105); ctx.lineTo(20, 90); ctx.closePath();
      ctx.stroke();
      
      ctx.fillStyle = settings.neonCyan;
      ctx.beginPath(); ctx.arc(-40, -40, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(40, -40, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // 4. エンジン噴射パーティクル (簡易版)
      // 本来はParticleクラスで管理すべきですが、ここでは簡易的に描画
      const flameY = 115;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
      // 左
      ctx.beginPath(); ctx.arc(-30, flameY + Math.random()*5, 4, 0, Math.PI*2); ctx.fill();
      // 右
      ctx.beginPath(); ctx.arc(30, flameY + Math.random()*5, 4, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    };
  },

  /**
   * GM専用砲塔: Crystal Cannon
   */
  turret: () => {
    const magicSwordColor = '#44aaff';
    const engineGlow = '#00ffff';

    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2); // 右向きに補正

      // 基部
      ctx.fillStyle = '#0a1520';
      ctx.beginPath();
      ctx.ellipse(0, 5, 20, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = magicSwordColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // メイン砲身
      const barrelGrad = ctx.createLinearGradient(0, 0, 0, -120);
      barrelGrad.addColorStop(0, '#0a1520');
      barrelGrad.addColorStop(0.5, '#1a3a50');
      barrelGrad.addColorStop(1, '#05101a');

      ctx.fillStyle = barrelGrad;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-3, -110);
      ctx.lineTo(3, -110);
      ctx.lineTo(5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // エネルギー流路
      ctx.shadowColor = engineGlow;
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ccffff';
      ctx.fillRect(-1, -100, 2, 90);

      // マズル
      ctx.shadowBlur = 20;
      ctx.shadowColor = magicSwordColor;
      const crystalGrad = ctx.createRadialGradient(0, -115, 2, 0, -115, 10);
      crystalGrad.addColorStop(0, '#fff');
      crystalGrad.addColorStop(0.5, magicSwordColor);
      crystalGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = crystalGrad;
      
      ctx.beginPath();
      ctx.moveTo(0, -130);
      ctx.lineTo(6, -115);
      ctx.lineTo(0, -105);
      ctx.lineTo(-6, -115);
      ctx.closePath();
      ctx.fill();

      // センサー
      ctx.shadowColor = 'red';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff0033';
      ctx.beginPath();
      ctx.arc(8, -10, 2, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    };
  },
};