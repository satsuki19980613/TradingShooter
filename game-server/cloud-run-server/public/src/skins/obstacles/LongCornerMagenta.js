/**
 * Cyberpunk Long L-Shape Obstacle
 */
export const LongCornerMagentaSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // progress (0~1) を time に変換 (無限ループアニメーション用)
    const time = progress * Math.PI * 4; 

    const colors = {
      concrete: '#252629',
      darkMetal: '#111111',
      hazardYellow: '#eebd00',
      neonGreen: '#00ff41',
      panelLine: '#3a3a40',
      darkPlate: '#1a1a1e',
      customMagenta: '#b82b5ab6',
      solidMagenta: '#b82b5a'
    };

    const dims = {
      w: 50,       // アーム幅
      shortL: 100, // 短い方（上）の長さ
      longL: 260   // 長い方（右）の長さ
    };

    ctx.save();
    ctx.translate(cx - 80, cy + 30);

    // --- メイン構造 (Base) ---
    drawBaseShape(ctx, false, colors, dims);

    // --- コンポーネント ---
    drawCornerUnit(ctx, time, colors);

    // 短いアーム（上）
    ctx.save();
    ctx.translate(0, -60);
    drawShortArmDetail(ctx, time);
    ctx.restore();

    // 長いアーム（右）
    ctx.save();
    ctx.translate(60, 0);
    drawLongArmDetail(ctx, time, colors, dims);
    ctx.restore();

    // --- ディテール ---
    drawEnergyLines(ctx, time, colors);

    // --- オーバーレイ効果 ---
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, colors);

    ctx.restore();
  };
};

function drawBaseShape(ctx, isShadow, colors, dims) {
    ctx.fillStyle = isShadow ? 'black' : colors.concrete;
    const w = dims.w;
    const sL = dims.shortL;
    const lL = dims.longL;

    ctx.beginPath();
    ctx.moveTo(-w, -sL);
    ctx.lineTo(w, -sL);
    ctx.lineTo(w, -w);
    ctx.lineTo(lL, -w);
    ctx.lineTo(lL, w);
    ctx.lineTo(w, w);
    ctx.lineTo(-w + 20, w);
    ctx.lineTo(-w, w - 20);
    ctx.closePath();
    ctx.fill();

    if (!isShadow) {
        ctx.strokeStyle = colors.panelLine;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#151515';
        for (let x = 60; x < dims.longL - 20; x += 60) {
            ctx.fillRect(x, -w, 10, w * 2);
        }
    }
}

function drawCornerUnit(ctx, time, colors) {
    ctx.fillStyle = colors.darkPlate;
    ctx.beginPath();
    ctx.moveTo(-50, -50);
    ctx.lineTo(0, -50);
    ctx.lineTo(0, 0);
    ctx.lineTo(-50, 0);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-25, -25, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.customMagenta;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-25, -25, 14, 0, Math.PI * 2);
    ctx.stroke();

    // 回転インジケータ
    ctx.save();
    ctx.translate(-25, -25);
    ctx.rotate(-time * 0.5);
    ctx.fillStyle = colors.solidMagenta;
    ctx.fillRect(-2, -10, 4, 20);
    ctx.fillRect(-10, -2, 20, 4);
    ctx.restore();

    // 中心点（明滅）
    const pulse = (Math.sin(time * 1.0) + 1) / 2;
    ctx.fillStyle = `rgba(0, 255, 65, ${0.6 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(-25, -25, 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawShortArmDetail(ctx, time) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-30, -30, 60, 50);

    ctx.fillStyle = '#333';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(-25, -25 + (i * 10), 50, 4);
    }

    const pulse = (Math.sin(time * 1.5) + 1) / 2;
    ctx.fillStyle = `rgba(0, 255, 65, ${0.5 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(0, 30, 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawLongArmDetail(ctx, time, colors, dims) {
    const length = 180;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, -10, length, 20);

    // 溝の中を走るマゼンタの光
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -10, length, 20);
    ctx.clip();

    const offset = (time * 20) % 60;
    ctx.fillStyle = colors.solidMagenta;
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.solidMagenta;

    for (let x = -20 + offset; x < length; x += 60) {
        ctx.fillRect(x, -8, 20, 16);
    }
    ctx.restore();

    ctx.fillStyle = '#333';
    ctx.fillRect(0, -30, length, 10);
    ctx.fillRect(0, 20, length, 10);

    ctx.fillStyle = colors.hazardYellow;
    for (let x = 20; x < length; x += 80) {
        ctx.fillRect(x, -30, 30, 2);
        ctx.fillRect(x, 28, 30, 2);
    }
}

function drawEnergyLines(ctx, time, colors) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(250, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -90);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = colors.solidMagenta;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -time * 4;
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawGlow(ctx, colors) {
    const grad = ctx.createRadialGradient(-25, -25, 5, -25, -25, 40);
    grad.addColorStop(0, colors.customMagenta);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-25, -25, 40, 0, Math.PI * 2);
    ctx.fill();
}