import { ServerGameObject } from "./ServerGameObject.js";

/**
 * 障害物クラス（複合コライダー・部分回転対応版）
 */
export class ServerObstacle extends ServerGameObject {
  constructor(x, y, width, height, type, borderRadius, individualRadii, rotation, className) {
    // 自身の回転(rotation)は使用しません
    super(x, y, Math.max(width, height), type);

    this.width = width;
    this.height = height;
    
    // 障害物の中心（絶対座標）
    this.centerX = x + width / 2;
    this.centerY = y + height / 2;

    this.colliders = [];
    
    // フォールバック
    if (this.colliders.length === 0) {
      this.colliders.push({ type: "rect", x: 0, y: 0, w: width, h: height, angle: 0 });
    }
  }

  setColliders(collidersData) {
    if (collidersData && collidersData.length > 0) {
      // rectタイプのみ採用
      this.colliders = collidersData.filter((c) => c.type === "rect");
    }
  }

  // 判定のみ
  checkCollisionWithCircle(circle) {
    return this.resolveCollision(circle, false);
  }

  // 押し出し実行
  collideWith(circle) {
    this.resolveCollision(circle, true);
  }

  /**
   * 衝突判定コアロジック
   * 四角形の回転(c.angle)を考慮して判定・押し出しを行います
   */
  resolveCollision(circle, applyPush) {
    let maxOverlap = -Infinity;
    let bestPushX = 0;
    let bestPushY = 0;
    let hasCollision = false;

    // プレイヤー(円)の絶対座標
    const cx = circle.x;
    const cy = circle.y;

    for (const c of this.colliders) {
      // 1. コライダーの中心（絶対座標）
      const boxCenterX = this.centerX + (c.x || 0);
      const boxCenterY = this.centerY + (c.y || 0);
      
      // 2. 円の座標を、このコライダーの「ローカル座標系」へ変換
      //    (コライダーの中心を原点とし、コライダーの回転を打ち消した座標系)
      const dx = cx - boxCenterX;
      const dy = cy - boxCenterY;
      
      // コライダーの角度 (度 -> ラジアン)
      const angleRad = (c.angle || 0) * Math.PI / 180;
      
      // 逆回転行列 (World -> Local)
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);
      
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // 3. ローカル座標系で「軸に平行な四角形 (AABB) vs 円」の判定
      const halfW = c.w / 2;
      const halfH = c.h / 2;

      // 円の中心に最も近い矩形上の点（クランプ）
      const closestLocX = Math.max(-halfW, Math.min(localX, halfW));
      const closestLocY = Math.max(-halfH, Math.min(localY, halfH));

      // 距離チェック
      const distLocX = localX - closestLocX;
      const distLocY = localY - closestLocY;
      let distSq = distLocX * distLocX + distLocY * distLocY;

      // --- 衝突しているか？ ---
      let overlap = 0;
      let pushLocX = 0;
      let pushLocY = 0;
      let isHit = false;

      // A. 通常衝突（円の中心が矩形の外にある）
      if (distSq > 0 && distSq < circle.radius * circle.radius) {
        const dist = Math.sqrt(distSq);
        overlap = circle.radius - dist;
        
        // ローカル空間での押し出しベクトル
        pushLocX = (distLocX / dist) * overlap;
        pushLocY = (distLocY / dist) * overlap;
        isHit = true;
      }
      // B. 埋まり込み（円の中心が矩形の中にある）
      else if (distSq === 0) {
         // 一番近い辺の外へ押し出す
         const pushLeft = localX - (-halfW);
         const pushRight = halfW - localX;
         const pushTop = localY - (-halfH);
         const pushBottom = halfH - localY;
         
         const minP = Math.min(pushLeft, pushRight, pushTop, pushBottom);
         const escapeMargin = circle.radius + 1.0;
         overlap = minP + circle.radius + 1000; // 優先度を高くする

         if (minP === pushLeft)       pushLocX = -(pushLeft + escapeMargin);
         else if (minP === pushRight) pushLocX = (pushRight + escapeMargin);
         else if (minP === pushTop)   pushLocY = -(pushTop + escapeMargin);
         else                         pushLocY = (pushBottom + escapeMargin);
         
         isHit = true;
      }

      // --- 衝突時の処理 ---
      if (isHit) {
        if (!applyPush) return true; // checkCollisionなら即座にtrueを返す

        // 複数のコライダーに同時に当たっている場合、最も「深い」衝突を採用
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          hasCollision = true;

          // ローカルの押し出しベクトルを、ワールド座標系に戻す
          // 順回転行列 (Local -> World)
          const cosR = Math.cos(angleRad);
          const sinR = Math.sin(angleRad);
          
          bestPushX = pushLocX * cosR - pushLocY * sinR;
          bestPushY = pushLocX * sinR + pushLocY * cosR;
        }
      }
    }

    if (applyPush && hasCollision) {
      circle.x += bestPushX;
      circle.y += bestPushY;
      circle.isDirty = true;
    }

    return hasCollision;
  }

  getState() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      radius: Math.max(this.width, this.height) // クライアント側のカリング用
    };
  }
}