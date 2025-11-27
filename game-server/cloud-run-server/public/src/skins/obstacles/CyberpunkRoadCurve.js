/**
 * Cyberpunk Road Curve Obstacle (修正版 v3)
 * サイズ調整による見切れ修正 & 内側の透過処理
 */
export const CyberpunkRoadCurveSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // アニメーション用（角度回転）
    const time = progress * Math.PI * 2;
    
    // 基準サイズ
    const BASE_SIZE = 400;
    const scale = Math.min(w, h) / BASE_SIZE;

    // カーブ設計図（左上を角とするカーブ）
    // 画面の左上(-200, -200)を中心として描画
    const curveParams = {
        centerX: -BASE_SIZE * 0.5, // -200
        centerY: -BASE_SIZE * 0.5, // -200
        roadWidth: 260,            // アスファルトの幅
        
        // ★修正ポイント: 半径を小さくして枠内に収める
        // アスファルト外端(380) + フレーム(20) = 400(最大) となるように逆算
        innerRadius: 120,          // (前回140 -> 今回120)
        
        // 角度: 0(右) ～ PI/2(下)
        startAngle: 0, 
        endAngle: Math.PI / 2
    };
    // outerRadius = 120 + 260 = 380
    curveParams.outerRadius = curveParams.innerRadius + curveParams.roadWidth;
    curveParams.centerRadius = (curveParams.innerRadius + curveParams.outerRadius) / 2;

    const colors = {
      asphalt: "#2e3238",
      neonCyan: "#00f0ff",
      neonPink: "#ff003c",
      darkMetal: "#15151a",
    };

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // グロー効果
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 240, 255, 0.15)";

    // 1. 路面ベース
    drawCurveRoadBase(ctx, colors, curveParams);

    // 2. センターライン (アニメーション)
    ctx.save();
    clipRoadArea(ctx, curveParams);
    drawCurveMovingLines(ctx, time, colors, curveParams);
    ctx.restore();

    // 3. 路肩のバリア
    drawCurveSideBarriers(ctx, time, colors, curveParams);

    // 4. オーバーレイ
    ctx.globalCompositeOperation = "lighter";
    drawCurveHologramOverlay(ctx, time, colors, curveParams);

    ctx.restore();
  };
};

// 路面ベース
function drawCurveRoadBase(ctx, colors, cp) {
  // 金属フレーム（外枠）
  ctx.fillStyle = colors.darkMetal;
  ctx.beginPath();
  // 外周を描く（フレーム厚み +20px）-> これで半径400になりぴったり収まる
  ctx.arc(cp.centerX, cp.centerY, cp.outerRadius + 20, cp.startAngle, cp.endAngle);
  
  // 内周を逆回転で描いてドーナツ型にする（フレーム厚み -20px）
  // ★前回の修正を維持: 中心に戻らず内側をくり抜く
  ctx.arc(cp.centerX, cp.centerY, cp.innerRadius - 20, cp.endAngle, cp.startAngle, true);
  
  ctx.closePath();
  ctx.fill();

  // フレームライン
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  // 外周ライン
  ctx.beginPath();
  ctx.arc(cp.centerX, cp.centerY, cp.outerRadius, cp.startAngle, cp.endAngle);
  ctx.stroke();
  // 内周ライン
  ctx.beginPath();
  ctx.arc(cp.centerX, cp.centerY, cp.innerRadius - 20, cp.startAngle, cp.endAngle);
  ctx.stroke();

  // アスファルト部分
  ctx.fillStyle = colors.asphalt;
  ctx.beginPath();
  // ドーナツ型にくり抜くためのパス
  ctx.arc(cp.centerX, cp.centerY, cp.outerRadius - 20, cp.startAngle, cp.endAngle, false);
  ctx.arc(cp.centerX, cp.centerY, cp.innerRadius, cp.endAngle, cp.startAngle, true); 
  ctx.closePath();
  ctx.fill();
}

// クリップ領域作成
function clipRoadArea(ctx, cp) {
    ctx.beginPath();
    ctx.arc(cp.centerX, cp.centerY, cp.outerRadius - 20, cp.startAngle, cp.endAngle, false);
    ctx.arc(cp.centerX, cp.centerY, cp.innerRadius, cp.endAngle, cp.startAngle, true);
    ctx.closePath();
    ctx.clip();
}

// センターライン
function drawCurveMovingLines(ctx, time, colors, cp) {
  const dashAngle = 0.08; 
  const gapAngle = 0.06;  
  const totalPitch = dashAngle + gapAngle;
  
  // 内側から外側へ（またはその逆）流れるように角度オフセット計算
  const scrollOffset = (time * 0.3) % totalPitch;

  ctx.strokeStyle = colors.neonCyan;
  ctx.shadowColor = colors.neonCyan;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";

  // startAngle(0) から endAngle(PI/2) に向かって描画
  for (let angle = cp.startAngle - totalPitch; angle < cp.endAngle + totalPitch; angle += totalPitch) {
    const currentAngle = angle + scrollOffset;

    // 描画範囲外チェック
    if (currentAngle < cp.startAngle - 0.05 || currentAngle > cp.endAngle + 0.05) continue;

    const lineSpacing = 10; 

    // 内ライン
    ctx.beginPath();
    ctx.arc(cp.centerX, cp.centerY, cp.centerRadius - lineSpacing, currentAngle, currentAngle + dashAngle);
    ctx.stroke();

    // 外ライン
    ctx.beginPath();
    ctx.arc(cp.centerX, cp.centerY, cp.centerRadius + lineSpacing, currentAngle, currentAngle + dashAngle);
    ctx.stroke();
  }
}

// バリアとライト
function drawCurveSideBarriers(ctx, time, colors, cp) {
  const lightCount = 5;
  const angleStep = (cp.endAngle - cp.startAngle) / (lightCount - 1);

  for (let i = 0; i < lightCount; i++) {
    const angle = cp.startAngle + angleStep * i;
    
    // 点滅
    const blinkVal = Math.sin(time * 1.5 + i);
    const isOn = blinkVal > 0.5;
    
    const params = { ctx, colors, isOn, angle, cx: cp.centerX, cy: cp.centerY };

    // 内側バリア
    drawBarrierLight({ ...params, radius: cp.innerRadius, isInner: true });
    // 外側バリア (フレーム幅分内側に)
    drawBarrierLight({ ...params, radius: cp.outerRadius - 20, isInner: false });
  }
}

function drawBarrierLight({ ctx, colors, isOn, angle, cx, cy, radius, isInner }) {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle); 

    ctx.fillStyle = isOn ? colors.neonPink : "#441111";
    if (isOn) {
        ctx.shadowColor = colors.neonPink;
        ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    // 内側なら外へ、外側なら内へ向くように
    const sign = isInner ? 1 : -1;
    ctx.moveTo(0, -8);
    ctx.lineTo(sign * 12, 0);
    ctx.lineTo(0, 8);
    ctx.fill();

    ctx.restore();
}

// ホログラム
function drawCurveHologramOverlay(ctx, time, colors, cp) {
  // 0 -> 90度へスキャン
  const scanAngle = (time * 0.5) % (cp.endAngle - cp.startAngle) + cp.startAngle;
  const arcWidth = 0.05;

  ctx.beginPath();
  ctx.arc(cp.centerX, cp.centerY, cp.outerRadius - 20, scanAngle, scanAngle + arcWidth, false);
  ctx.arc(cp.centerX, cp.centerY, cp.innerRadius, scanAngle + arcWidth, scanAngle, true);
  ctx.closePath();

  ctx.fillStyle = `rgba(0, 240, 255, 0.03)`;
  ctx.fill();
  
  ctx.strokeStyle = `rgba(0, 240, 255, 0.1)`;
  ctx.stroke();
}