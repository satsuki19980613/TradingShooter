import { ClientConfig } from "../ClientConfig.js";

/**
 * すべてのゲームオブジェクトの基底クラス
 */
export class GameObject {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.isDirty = true;
    this.color = color;

    this.targetX = x;
    this.targetY = y;
    this.lerpRate = ClientConfig.CLIENT_LERP_RATE;
  }

  /**
   * 描画ループ (renderLoop) で毎フレーム呼ばれる
   * 現在の座標を目標座標に滑らかに近づける
   */
  update() {
    this.x += (this.targetX - this.x) * this.lerpRate;
    this.y += (this.targetY - this.y) * this.lerpRate;

    if (Math.abs(this.targetX - this.x) < 0.1) this.x = this.targetX;
    if (Math.abs(this.targetY - this.y) < 0.1) this.y = this.targetY;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
