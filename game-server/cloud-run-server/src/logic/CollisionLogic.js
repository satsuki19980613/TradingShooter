/**
 * 衝突判定、距離計算、物理的な押し出し処理に関する純粋ロジック
 */
export const CollisionLogic = {
  getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  },

  clampPosition(x, y, radius, worldWidth, worldHeight) {
    const newX = Math.max(radius, Math.min(worldWidth - radius, x));
    const newY = Math.max(radius, Math.min(worldHeight - radius, y));
    return { x: newX, y: newY };
  },

  /**
   * 円同士の重なりを解消するための押し出しベクトルを計算
   */
  resolveEntityOverlap(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const totalRadius = r1 + r2;
    const overlap = totalRadius - dist;

    if (overlap > 0) {
      let pushX = 0;
      let pushY = 0;

      if (dist === 0) {
        pushX = 0.1;
        pushY = 0;
      } else {
        pushX = dx / dist;
        pushY = dy / dist;
      }
      
      const pushAmount = overlap / 2;
      return {
        pushX: pushX * pushAmount,
        pushY: pushY * pushAmount
      };
    }
    return null;
  },

  /**
   * 単一の矩形コライダーと円の衝突判定＆押し出し計算
   */
  solveSingleCollider(circleX, circleY, radius, obsCenterX, obsCenterY, collider) {
    const boxCenterX = obsCenterX + (collider.x || 0);
    const boxCenterY = obsCenterY + (collider.y || 0);

    const dx = circleX - boxCenterX;
    const dy = circleY - boxCenterY;
    const totalAngle = (collider.angle || 0) * (Math.PI / 180);
    const cos = Math.cos(-totalAngle);
    const sin = Math.sin(-totalAngle);
    
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    const halfW = collider.w / 2;
    const halfH = collider.h / 2;

    const closestLocX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocY = Math.max(-halfH, Math.min(localY, halfH));

    const distLocX = localX - closestLocX;
    const distLocY = localY - closestLocY;
    const distSq = distLocX * distLocX + distLocY * distLocY;

    if (distSq > radius * radius || distSq === 0) {
      return { hit: false, pushX: 0, pushY: 0 };
    }

    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;

    let pushLocX = 0;
    let pushLocY = 0;

    if (dist > 0) {
      pushLocX = (distLocX / dist) * overlap;
      pushLocY = (distLocY / dist) * overlap;
    }

    const cosR = Math.cos(totalAngle);
    const sinR = Math.sin(totalAngle);
    const bestPushX = pushLocX * cosR - pushLocY * sinR;
    const bestPushY = pushLocX * sinR + pushLocY * cosR;

    return { hit: true, pushX: bestPushX, pushY: bestPushY };
  }
};