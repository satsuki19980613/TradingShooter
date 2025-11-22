export class Obstacle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.domElement = null;
  }

  /**
   * Game.js からサーバーの状態がセットされる
   */
  setState(state) {}
}
