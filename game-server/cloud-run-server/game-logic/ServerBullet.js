import { ServerGameObject } from "./ServerGameObject.js";

/**
 * サーバー側の弾クラス (ロジックのみ)
 */
export class ServerBullet extends ServerGameObject {
  constructor(x, y, radius, angle, speed, type, damage, ownerId) {
        super(x, y, radius);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.type = type;
        this.damage = damage;
        this.ownerId = ownerId;
        
        this.id = null;
    }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.isDirty = true;
  }

  /**
   * クライアントへのブロードキャスト用に、軽量な状態を返す
   */
  getState() {
    return {
      id: this.id,

      x: this.x,
      y: this.y,
      radius: this.radius,
      type: this.type,

      angle: Math.atan2(this.vy, this.vx),
    };
  }
}
