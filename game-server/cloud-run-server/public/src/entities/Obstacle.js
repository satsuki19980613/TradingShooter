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


}
