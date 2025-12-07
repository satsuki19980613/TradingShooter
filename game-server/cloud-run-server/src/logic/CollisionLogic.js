export const CollisionLogic = {
  getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  },
  getDistanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  },
  clampPosition(x, y, radius, worldWidth, worldHeight) {
    const newX = Math.max(radius, Math.min(worldWidth - radius, x));
    const newY = Math.max(radius, Math.min(worldHeight - radius, y));
    return { x: newX, y: newY };
  },

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
        pushY: pushY * pushAmount,
      };
    }
    return null;
  },

  resolveObstacleCollision(circleX, circleY, radius, obstacle) {
    const distX = circleX - obstacle.centerX;
    const distY = circleY - obstacle.centerY;
    const threshold = radius + obstacle.maxColliderRadius + 10;

    if (distX * distX + distY * distY > threshold * threshold) {
      return null;
    }

    let tempX = circleX;
    let tempY = circleY;
    let hasCollision = false;
    const ITERATIONS = 4;

    for (let i = 0; i < ITERATIONS; i++) {
      let movedInThisLoop = false;

      for (const c of obstacle.colliders) {
        const result = this.solveSingleCollider(
          tempX,
          tempY,
          radius,
          obstacle.centerX,
          obstacle.centerY,
          c
        );
        if (result.hit) {
          hasCollision = true;
          movedInThisLoop = true;
          tempX += result.pushX;
          tempY += result.pushY;
        }
      }

      if (!movedInThisLoop) break;
    }

    if (hasCollision) {
      return { x: tempX, y: tempY };
    }
    return null;
  },

  solveSingleCollider(
    circleX,
    circleY,
    radius,
    obsCenterX,
    obsCenterY,
    collider
  ) {
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
  },
};
