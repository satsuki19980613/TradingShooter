// game-server/cloud-run-server/public/src/entities/Obstacle.js

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
    // ★追加: IDの初期化
    this.id = null; 
  }

  /**
   * サーバーからの初期化データを受け取る
   */
  setState(state) {
    // ★★★ 最重要修正: ここに ID の設定を追加！ ★★★
    // これがないと RenderSystem が同一オブジェクトだと認識できません
    this.id = state.id; 

    if (state.className) {
      this.styleType = state.className;
    }
    if (state.rotation !== undefined) {
      this.rotation = state.rotation;
    }
  }
}