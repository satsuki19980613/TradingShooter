import { getDistance } from "./ServerUtils.js";

/**
 * サーバー側の低速ゾーンクラス (ロジックのみ)
 */
export class ServerSlowZone {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = "SLOW_ZONE";
  }

  /**
   * 他の円形オブジェクト (プレイヤーなど) と衝突しているか
   */
  checkCollisionWithCircle(circle) {
    const distance = getDistance(circle.x, circle.y, this.x, this.y);

    return distance < circle.radius + this.radius;
  }
  /**
   * 円形オブジェクト (プレイヤーなど) を反発させる処理
   */
  collideWith(circle) {
    const dist = getDistance(this.x, this.y, circle.x, circle.y);
    const totalRadius = this.radius + circle.radius;
    const overlap = totalRadius - dist;

    if (overlap > 0) {
      const dx = circle.x - this.x;
      const dy = circle.y - this.y;

      let pushX = 0;
      let pushY = 0;
      if (dist === 0) {
        pushX = 0.1;
      } else {
        pushX = dx / dist;
        pushY = dy / dist;
      }

      circle.x += pushX * overlap;
      circle.y += pushY * overlap;

      circle.isDirty = true;
    }
  }
  /**
   * クライアントへのブロードキャスト用に、軽量な状態を返す
   */
  getState() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      radius: this.radius,
    };
  }
}
