import { getDistance } from "./ServerUtils.js";

/**
 * サーバー側の障害物クラス (回転対応版)
 */
export class ServerObstacle {
  constructor(x, y, width, height, type, borderRadius, individualRadii, rotation) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type || "obstacle_wall";
    
    this.borderRadius = borderRadius || 0;
    this.individualRadii = individualRadii || {};
    
    // 角度 (度数法 -> ラジアンに変換して保持)
    this.rotation = rotation || 0;
    this.angleRad = (this.rotation * Math.PI) / 180;
    
    // 中心座標 (回転の軸)
    this.centerX = this.x + this.width / 2;
    this.centerY = this.y + this.height / 2;
  }

  /**
   * 衝突判定と押し出し処理 (回転対応)
   */
  collideWith(circle) {
    // 1. 円の座標を、壁の中心を原点としたローカル座標に変換
    const dx = circle.x - this.centerX;
    const dy = circle.y - this.centerY;

    // 2. 壁の角度分だけ「逆回転」させる (壁を水平に戻すイメージ)
    // 回転行列の公式
    const localX = dx * Math.cos(-this.angleRad) - dy * Math.sin(-this.angleRad);
    const localY = dx * Math.sin(-this.angleRad) + dy * Math.cos(-this.angleRad);

    // 3. ローカル座標系(水平な壁)での衝突判定を行う (AABB)
    // 壁の半分のサイズ
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // 円の中心に最も近い「壁上の点」を探す (クランプ)
    const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));

    // 距離を計算
    const distX = localX - closestLocalX;
    const distY = localY - closestLocalY;
    const distanceSquared = distX * distX + distY * distY;

    // 衝突していないなら終了
    if (distanceSquared > circle.radius * circle.radius) {
        return;
    }

    // 4. 衝突している場合、押し出しベクトルを計算
    let distance = Math.sqrt(distanceSquared);
    let penetration = circle.radius - distance;
    
    let normalX, normalY;

    if (distance === 0) {
        // 完全に埋まっている場合
        normalX = 1; 
        normalY = 0;
        penetration = circle.radius;
    } else {
        normalX = distX / distance;
        normalY = distY / distance;
    }

    // 5. 押し出しベクトルを「元の角度」に回転して戻す (ワールド座標へ)
    const pushX = normalX * Math.cos(this.angleRad) - normalY * Math.sin(this.angleRad);
    const pushY = normalX * Math.sin(this.angleRad) + normalY * Math.cos(this.angleRad);

    // 6. プレイヤーの位置を更新
    circle.x += pushX * penetration;
    circle.y += pushY * penetration;
    circle.isDirty = true;
  }

  // checkCollisionWithCircle は簡易判定として、外接円で行うと高速化できるが、
  // 厳密な判定は上記の collideWith に統合したため、ここは「弾丸の消滅判定」などで使う
  checkCollisionWithCircle(circle) {
      // 同じロジックで判定だけ行う
      const dx = circle.x - this.centerX;
      const dy = circle.y - this.centerY;
      const localX = dx * Math.cos(-this.angleRad) - dy * Math.sin(-this.angleRad);
      const localY = dx * Math.sin(-this.angleRad) + dy * Math.cos(-this.angleRad);
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const closestX = Math.max(-halfW, Math.min(localX, halfW));
      const closestY = Math.max(-halfH, Math.min(localY, halfH));
      const distX = localX - closestX;
      const distY = localY - closestY;
      return (distX * distX + distY * distY) < (circle.radius * circle.radius);
  }

  getState() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      borderRadius: this.borderRadius,
      individualRadii: this.individualRadii,
      rotation: this.rotation // クライアントに角度を伝える
    };
  }
}