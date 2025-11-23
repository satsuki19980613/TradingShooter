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
    const skinKey = `obs_${this.styleType}_${this.width}_${this.height}`;

    const drawFunc = ObstacleSkins[this.styleType] || ObstacleSkins["default"];

    const skin = skinManager.getSkin(
      skinKey,
      this.width,
      this.height,
      drawFunc
    );

    ctx.drawImage(skin, this.x, this.y);
  }
}
