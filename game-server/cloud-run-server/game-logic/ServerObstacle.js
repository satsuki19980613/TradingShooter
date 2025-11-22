import { getDistanceSq } from "./ServerUtils.js"; // utilsからインポート

/**
 * サーバー側の障害物クラス
 */
export class ServerObstacle {
  constructor(x, y, width, height, type, borderRadius = 0, individualRadii = {}, rotation = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.borderRadius = borderRadius;
    this.individualRadii = individualRadii;
    this.rotation = rotation;
  }

  /**
   * 弾丸などのヒットチェック用
   */
  checkCollisionWithCircle(circle) {
    if (!circle || typeof circle.x !== 'number') return false;

    // 矩形上の、円の中心に最も近い点を探す (Clamp処理)
    const closestX = Math.max(this.x, Math.min(this.x + this.width, circle.x));
    const closestY = Math.max(this.y, Math.min(this.y + this.height, circle.y));

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    // ここで getDistanceSq を使う
    const distSq = dx * dx + dy * dy; 

    return distSq < (circle.radius * circle.radius);
  }

  /**
   * プレイヤー・敵の物理押し出し処理 (めり込み防止)
   */
  collideWith(circle) {
    if (!circle || typeof circle.x !== 'number') return;

    const closestX = Math.max(this.x, Math.min(this.x + this.width, circle.x));
    const closestY = Math.max(this.y, Math.min(this.y + this.height, circle.y));

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distSq = dx * dx + dy * dy;

    // 衝突しており、かつ完全に中心が重なっていない場合
    if (distSq < circle.radius * circle.radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = circle.radius - dist;

      // 押し出す方向
      const nx = dx / dist;
      const ny = dy / dist;

      // 座標更新
      circle.x += nx * overlap;
      circle.y += ny * overlap;
      
      circle.isDirty = true;
    } 
    // まれに完全に内部で重なった場合(distSq=0)の緊急回避
    else if (distSq <= 0.0001) {
        // とりあえず右に少しずらす
        circle.x += 1;
        circle.isDirty = true;
    }
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      type: this.type,
      borderRadius: this.borderRadius,
      individualRadii: this.individualRadii,
      rotation: this.rotation
    };
  }
}