import { skinManager } from "../systems/SkinManager.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";

export class Obstacle {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.styleType = type;
    this.rotation = 0;
  }

  /**
   * サーバーからの初期化データを受け取る
   */
  setState(state) {
    if (state.className) {
      this.styleType = state.className;
    }
    if (state.rotation !== undefined) {
      this.rotation = state.rotation;
    }
  }

  draw(ctx) {
    const TOTAL_FRAMES = 60;
    const LOOP_DURATION = 4000;
    const isAnimated =
      this.styleType === "obs-hexagon-fortress-animated" ||
      this.styleType === "obs-long-corner" ||
      this.styleType === "obs-wide-neon" ||
      this.styleType === "obs-ushape-hangar" ||
      this.styleType === "obs-long-cross" ||
      this.styleType === "obs-Road-Curve" ||
      this.styleType === "obs-long-cross" ||
      this.styleType === "obs-Road-Straight";
    let skinKey;
    let drawFunc;
    if (isAnimated) {
      const time = Date.now();
      const progress = (time % LOOP_DURATION) / LOOP_DURATION;
      const frameIndex = Math.floor(progress * TOTAL_FRAMES);

      skinKey = `obs_${this.styleType}_${this.width}_${this.height}_f${frameIndex}`;

      drawFunc = ObstacleSkins[this.styleType](progress);
    } else {
      skinKey = `obs_${this.styleType}_${this.width}_${this.height}`;
      drawFunc = ObstacleSkins[this.styleType] || ObstacleSkins["default"];
    }

    const skin = skinManager.getSkin(
      skinKey,
      this.width,
      this.height,
      drawFunc
    );

    ctx.save();

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);

    ctx.rotate(this.rotation || 0);

    ctx.drawImage(skin, -this.width / 2, -this.height / 2);

    ctx.restore();
  }
}
