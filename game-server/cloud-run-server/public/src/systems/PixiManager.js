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
    if (!canvas) {
      console.error(
        `PixiManager: Canvas with id '${this.canvasId}' not found.`
      );
      return;
    }

    this.app = new PIXI.Application();

    await this.app.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: 0x213135,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    console.log("PixiManager: Initialized");

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
   * ★新規追加: カメラ位置に合わせてコンテナを動かす
   */
  updateCamera(x, y, scale) {
    if (!this.app) return;

    const screenCX = this.app.screen.width / 2;
    const screenCY = this.app.screen.height / 2;

    [this.layers.game, this.layers.effect].forEach((layer) => {
      if (layer) {
        layer.scale.set(scale);

        layer.position.set(-x * scale + screenCX, -y * scale + screenCY);
      }
    });

    if (this.layers.background) {
    }
  }
}
