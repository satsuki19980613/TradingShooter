// public/src/entities/GameObject.js

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
   * 描画ループで毎フレーム呼ばれる
   * @param {number} deltaFrames - 60FPS基準の経過フレーム数 (1.0 = 1/60秒)
   */
  update(deltaFrames = 1.0) {
    // フレームレート非依存のLerp計算
    // 公式: current + (target - current) * (1 - (1 - rate)^delta)
    const adjust = 1 - Math.pow(1 - this.lerpRate, deltaFrames);

    this.x += (this.targetX - this.x) * adjust;
    this.y += (this.targetY - this.y) * adjust;

    if (Math.abs(this.targetX - this.x) < 0.1) this.x = this.targetX;
    if (Math.abs(this.targetY - this.y) < 0.1) this.y = this.targetY;
  }
}