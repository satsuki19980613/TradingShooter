export class MagazineRenderer {
  draw(ctx, playerState, canvasWidth, canvasHeight, uiScale = 1.0) {
    if (!playerState) return;

    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr * uiScale;
    const stockedBullets = playerState.stockedBullets || [];
    const maxStock = playerState.maxStock || 10;

    // マージンと配置計算
    const paddingY = 10 * ratio;
    const availableHeight = canvasHeight - paddingY * 2;
    const gap = 4 * ratio;
    
    // スロットの高さを計算
    const slotHeight = Math.floor(
      (availableHeight - gap * (maxStock - 1)) / maxStock
    );

    // 弾丸の元サイズ（magazine.htmlの定義に基づく）
    // TotalLen = 600, RimRadius = 55 (Height = 110)
    const BASE_BULLET_WIDTH = 600;
    const BASE_BULLET_HEIGHT = 110;

    // キャンバス内での描画幅
    // ★修正: 横幅を大きくするため係数を0.95に変更
    const contentWidth = canvasWidth * 1.5; 
    const startX = (canvasWidth - contentWidth) / 2; // 中央寄せ
    const bottomY = canvasHeight - paddingY;

    ctx.save();
    // ★修正: 斜めにする処理 (ctx.transform) を削除しました

    for (let i = 0; i < maxStock; i++) {
      // 下から積み上げる計算
      const currentY = bottomY - (i + 1) * (slotHeight + gap) + gap;
      
      // スロットの中心座標
      const slotCenterX = startX + contentWidth / 2;
      const slotCenterY = currentY + slotHeight / 2;

      const hasBullet = i < stockedBullets.length;
      
      // スケーリング計算 (スロットに収まるように)
      // 横幅を広げたので、scaleXが大きくなり、結果的に弾が大きく表示されやすくなります
      const scaleX = (contentWidth / BASE_BULLET_WIDTH);
      const scaleY = (slotHeight / BASE_BULLET_HEIGHT) * 0.85; // 高さが詰まりすぎないよう少し余裕を持たせる
      const scale = Math.min(scaleX, scaleY);

      // --- 1. 空スロット（未装填）の描画 ---
      // 暗いシルエットとして描画
      ctx.save();
      ctx.translate(slotCenterX, slotCenterY);
      ctx.scale(-scale, scale); // 左向きにするためXを反転
      
      ctx.beginPath();
      this._drawBulletPath(ctx);
      
      ctx.fillStyle = "rgba(0, 40, 50, 0.3)"; // 少し視認性を上げるため色を調整
      ctx.fill();
      
      // ★修正: アウトライン描画 (ctx.stroke) を削除しました
      ctx.restore();

      // --- 2. 装填済み弾丸の描画 ---
      if (hasBullet) {
        const bulletInfo = stockedBullets[i];
        const damageVal =
          typeof bulletInfo === "object" ? bulletInfo.damage : bulletInfo;

        let baseColor, glowColor;
        // 威力に応じた色分け
        if (damageVal >= 100) {
          baseColor = "#b300ff"; // Fireball
          glowColor = "#ea80fc";
        } else if (damageVal >= 50) {
          baseColor = "#ff6d00"; // Slash
          glowColor = "#ffab40";
        } else if (damageVal >= 25) {
          baseColor = "#00e676"; // High Power
          glowColor = "#69f0ae";
        } else {
          baseColor = "#00bcd4"; // Normal
          glowColor = "#84ffff";
        }

        ctx.save();
        ctx.translate(slotCenterX, slotCenterY);
        ctx.scale(-scale, scale); // 左向き

        ctx.beginPath();
        this._drawBulletPath(ctx);

        // ネオン風グラデーション作成
        const grad = ctx.createLinearGradient(-300, 0, 300, 0);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.6, baseColor);
        grad.addColorStop(0.9, glowColor);
        grad.addColorStop(1, "#ffffff");

        ctx.fillStyle = grad;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 15 * scale;
        ctx.fill();

        // ハイライト（光沢感）
        ctx.save();
        ctx.clip(); 
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(-300, -20, 600, 40);
        ctx.restore();

        // ★修正: 弾丸本体のアウトラインも描画していません (fillのみ)
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /**
   * 弾丸パスの定義
   */
  _drawBulletPath(ctx) {
    const totalLen = 600; 
    const rimLen = 15;    
    const grooveLen = 20; 
    const bodyLen = 320;  
    const shoulderLen = 40; 
    const neckLen = 50;   
    const bulletLen = totalLen - (rimLen + grooveLen + bodyLen + shoulderLen + neckLen);

    const rimRadius = 55;      
    const grooveRadius = 45;   
    const bodyRadius = 52;     
    const neckRadius = 32;     

    const startX = -(totalLen / 2);
    const centerY = 0;

    let currentX = startX;
    
    // 上半分
    ctx.moveTo(currentX, centerY - rimRadius);
    currentX += rimLen;
    ctx.lineTo(currentX, centerY - rimRadius);
    
    ctx.lineTo(currentX, centerY - grooveRadius);
    currentX += grooveLen;
    ctx.lineTo(currentX, centerY - grooveRadius);
    ctx.lineTo(currentX + 5, centerY - bodyRadius);
    
    currentX += 5;
    const actualBodyLen = bodyLen - 5;
    currentX += actualBodyLen;
    ctx.lineTo(currentX, centerY - bodyRadius);
    
    currentX += shoulderLen;
    ctx.lineTo(currentX, centerY - neckRadius);
    
    currentX += neckLen;
    ctx.lineTo(currentX, centerY - neckRadius);
    
    const tipX = startX + totalLen;
    const tipY = centerY;
    
    ctx.bezierCurveTo(
        currentX + bulletLen * 0.4, centerY - neckRadius,
        tipX - bulletLen * 0.1, centerY - (neckRadius * 0.1),
        tipX, tipY
    );

    // 下半分
    ctx.bezierCurveTo(
        tipX - bulletLen * 0.1, centerY + (neckRadius * 0.1),
        currentX + bulletLen * 0.4, centerY + neckRadius,
        currentX, centerY + neckRadius
    );

    currentX -= neckLen;
    ctx.lineTo(currentX, centerY + neckRadius);

    currentX -= shoulderLen;
    ctx.lineTo(currentX, centerY + bodyRadius);

    currentX -= actualBodyLen;
    ctx.lineTo(currentX, centerY + bodyRadius);
    
    currentX -= 5;
    ctx.lineTo(currentX, centerY + grooveRadius);
    currentX -= grooveLen;
    ctx.lineTo(currentX, centerY + grooveRadius);
    ctx.lineTo(currentX, centerY + rimRadius);

    currentX -= rimLen;
    ctx.lineTo(currentX, centerY + rimRadius);
    
    ctx.closePath();
  }
}