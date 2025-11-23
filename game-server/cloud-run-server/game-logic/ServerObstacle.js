import { getDistance } from "./ServerUtils.js";

/**
 * サーバー側の障害物クラス (回転対応版)
 */
export class ServerObstacle {
  constructor(
    x,
    y,
    width,
    height,
    type,
    borderRadius,
    individualRadii,
    rotation
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type || "obstacle_wall";

    this.borderRadius = borderRadius || 0;
    this.individualRadii = individualRadii || {};

    this.rotation = rotation || 0;
    this.angleRad = (this.rotation * Math.PI) / 180;

    this.centerX = this.x + this.width / 2;
    this.centerY = this.y + this.height / 2;
  }

  /**
   * 衝突判定と押し出し処理 (回転対応)
   */
  collideWith(circle) {
    const dx = circle.x - this.centerX;
    const dy = circle.y - this.centerY;
    const localX =
      dx * Math.cos(-this.angleRad) - dy * Math.sin(-this.angleRad);
    const localY =
      dx * Math.sin(-this.angleRad) + dy * Math.cos(-this.angleRad);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));
    const distX = localX - closestLocalX;
    const distY = localY - closestLocalY;
    const distanceSquared = distX * distX + distY * distY;

    if (distanceSquared > circle.radius * circle.radius) {
      return;
    }

    let distance = Math.sqrt(distanceSquared);
    let penetration = circle.radius - distance;
    let normalX, normalY;

    if (distance === 0) {
      normalX = 1;
      normalY = 0;
      penetration = circle.radius;
    } else {
      normalX = distX / distance;
      normalY = distY / distance;
    }

    const pushX =
      normalX * Math.cos(this.angleRad) - normalY * Math.sin(this.angleRad);
    const pushY =
      normalX * Math.sin(this.angleRad) + normalY * Math.cos(this.angleRad);
    circle.x += pushX * penetration;
    circle.y += pushY * penetration;
    circle.isDirty = true;
  }

  checkCollisionWithCircle(circle) {
    const dx = circle.x - this.centerX;
    const dy = circle.y - this.centerY;
    const localX =
      dx * Math.cos(-this.angleRad) - dy * Math.sin(-this.angleRad);
    const localY =
      dx * Math.sin(-this.angleRad) + dy * Math.cos(-this.angleRad);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const closestX = Math.max(-halfW, Math.min(localX, halfW));
    const closestY = Math.max(-halfH, Math.min(localY, halfH));
    const distX = localX - closestX;
    const distY = localY - closestY;
    return distX * distX + distY * distY < circle.radius * circle.radius;
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
      rotation: this.rotation,
    };
  }
}
