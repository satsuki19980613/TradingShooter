/**
 * Cyberpunk Standard Obstacle (Block with Hologram)
 */
export const StandardCyberSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const time = progress * Math.PI * 2;

    const colors = {
        concrete: '#2b2b30',
        metal: '#151515',
        cyberYellow: '#fcee0a',
        neonRed: '#ff003c',
        neonBlue: '#0ab9fc'
    };

    ctx.save();
    ctx.translate(cx, cy);

    // メイン構造体
    drawMainStructure(ctx, false, colors);

    // 拡張ユニット
    ctx.save();
    ctx.translate(-20, -15);
    drawIndustrialUnit(ctx, 130, 90, colors);
    ctx.restore();

    // サーバーラック
    ctx.save();
    ctx.translate(45, 35);
    drawServerRack(ctx, 80, 50, time);
    ctx.restore();

    drawCables(ctx, colors);
    drawDataCore(ctx, time, colors);

    // オーバーレイ
    ctx.globalCompositeOperation = 'lighter';
    drawNeonGlow(ctx, colors);

    ctx.restore();
  };
};

function drawMainStructure(ctx, isShadow, colors) {
    ctx.fillStyle = isShadow ? 'black' : colors.concrete;
    ctx.beginPath();
    ctx.moveTo(-90, -70);
    ctx.lineTo(70, -70);
    ctx.lineTo(90, -50);
    ctx.lineTo(90, 60);
    ctx.lineTo(70, 80);
    ctx.lineTo(-30, 80);
    ctx.lineTo(-30, 30);
    ctx.lineTo(-70, 30);
    ctx.lineTo(-90, 10);
    ctx.closePath();
    ctx.fill();

    if (!isShadow) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-80, -60, 20, 20);
        ctx.fillRect(0, 40, 30, 10);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-90, -20); ctx.lineTo(90, -20);
        ctx.moveTo(30, -70); ctx.lineTo(30, 80);
        ctx.stroke();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawIndustrialUnit(ctx, w, h, colors) {
    ctx.fillStyle = colors.metal;
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(-w/2, -h/2, w, h);

    const stripeAreaH = 15;
    const startY = h/2 - stripeAreaH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w/2, startY, w, stripeAreaH);
    ctx.clip();
    ctx.fillStyle = colors.cyberYellow;
    ctx.fillRect(-w/2, startY, w, stripeAreaH);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (let i = -w; i < w; i += 15) {
        ctx.moveTo(i, startY);
        ctx.lineTo(i + 10, startY + stripeAreaH);
        ctx.lineTo(i + 20, startY + stripeAreaH);
        ctx.lineTo(i + 10, startY);
    }
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = colors.neonRed;
    ctx.fillRect(-w/2 + 10, -h/2 + 10, 5, 20);
    ctx.fillRect(-w/2 + 18, -h/2 + 10, 5, 20);
}

function drawServerRack(ctx, w, h, time) {
    ctx.fillStyle = '#222';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = '#000';
    for(let i=0; i<4; i++) {
        ctx.fillRect(-w/2 + 10 + (i*15), -h/2 + 5, 10, h - 10);
    }
    const ledOn = Math.sin(time * 10) > 0.5;
    ctx.fillStyle = ledOn ? '#0f0' : '#030';
    ctx.fillRect(w/2 - 10, -h/2 + 5, 4, 4);
}

function drawCables(ctx, colors) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, -20);
    ctx.bezierCurveTo(40, -20, 40, 40, 60, 40);
    ctx.stroke();
    ctx.strokeStyle = colors.neonBlue;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(22, -22);
    ctx.bezierCurveTo(42, -22, 42, 38, 62, 38);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
}

function drawDataCore(ctx, time, colors) {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(60, -10);
    ctx.lineTo(70, 20);
    ctx.lineTo(-10, 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(25, 5, 20, 0, Math.PI * 2);
    ctx.fill();

    const noise = Math.random() * 2; 
    const radius = 15 + Math.sin(time * 3) * 2 + noise;
    const alpha = 0.4 + Math.sin(time * 5) * 0.2;

    const grad = ctx.createRadialGradient(25, 5, 0, 25, 5, radius);
    grad.addColorStop(0, colors.neonRed);
    grad.addColorStop(0.4, 'rgba(255, 0, 60, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(25, 5, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.save();
    ctx.translate(25, 5);
    ctx.rotate(-time * 0.5);
    ctx.strokeStyle = colors.neonRed;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]); 
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawNeonGlow(ctx, colors) {
    ctx.shadowBlur = 15;
    ctx.strokeStyle = colors.cyberYellow;
    ctx.shadowColor = colors.cyberYellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-80, -60);
    ctx.lineTo(-40, -60);
    ctx.lineTo(-30, -50);
    ctx.stroke();

    if (Math.random() > 0.9) {
        ctx.fillStyle = colors.neonBlue;
        ctx.shadowColor = colors.neonBlue;
        ctx.fillRect(50 + Math.random()*10, -40, 20, 2);
    }
}