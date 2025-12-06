// public/src/systems/PixiManager.js

export class PixiManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.app = null;
    this.layers = {
      background: new PIXI.Container(),
      game: new PIXI.Container(),
      effect: new PIXI.Container(),
    };
  }

  async init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;

    this.app = new PIXI.Application();
    await this.app.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: 0x1a1a1a, // ★変更: マップ外を完全な黒にする
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    this.setupLayers();
  }

  setupLayers() {
    if (!this.app) return;
    this.app.stage.addChild(this.layers.background);
    this.app.stage.addChild(this.layers.game);
    this.app.stage.addChild(this.layers.effect);
  }

  resize(width, height) {
    if (this.app && this.app.renderer) {
      this.app.renderer.resize(width, height);
    }
  }

  getLayer(name) {
    return this.layers[name];
  }

  /**
   * カメラ更新（背景もキャラと同じように動かす）
   */
  updateCameraCentered(centerX, centerY, scale) {
    if (!this.app) return;

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    // 全レイヤー（背景・ゲーム・エフェクト）に対して同じ変換を適用
    // これにより、背景グリッドは「ワールドに固定された床」として振る舞います
    [this.layers.background, this.layers.game, this.layers.effect].forEach((layer) => {
      layer.scale.set(scale);
      layer.pivot.set(centerX, centerY);
      layer.position.set(screenW / 2, screenH / 2);
    });
  }
}