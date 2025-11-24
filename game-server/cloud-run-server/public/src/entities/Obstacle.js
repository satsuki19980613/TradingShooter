import { skinManager } from "../systems/SkinManager.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";

export class Obstacle {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.styleType = type;
  }

  /**
   * サーバーからの初期化データを受け取る
   */
  setState(state) {
    if (state.className) {
      this.styleType = state.className;
    }
  }

  draw(ctx) {
    const TOTAL_FRAMES = 60;
    const LOOP_DURATION = 4000;

    const isAnimated = this.styleType === "obs-hexagon-fortress-animated";

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

    ctx.drawImage(skin, this.x, this.y);
  }
}
