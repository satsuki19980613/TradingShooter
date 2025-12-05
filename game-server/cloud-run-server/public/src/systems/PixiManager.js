export class PixiManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.app = null;
    
    // レイヤー（コンテナ）を保持するオブジェクト
    this.layers = {
      background: null,
      game: null,
      effect: null
    };
  }

  /**
   * Pixi.js アプリケーションの初期化
   */
  async init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) {
      console.error(`PixiManager: Canvas with id '${this.canvasId}' not found.`);
      return;
    }

    // Application生成
    this.app = new PIXI.Application();

    // 初期化 (Pixi v8)
    await this.app.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: 0x213135, // 背景色
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    console.log("PixiManager: Initialized");

    // レイヤー構築
    this.setupLayers();
  }

  /**
   * 描画レイヤー（コンテナ）のセットアップ
   */
  setupLayers() {
    if (!this.app) return;

    this.layers.background = new PIXI.Container();
    this.layers.game = new PIXI.Container();
    this.layers.effect = new PIXI.Container();

    // 描画順に追加 (背景 -> ゲーム -> エフェクト)
    this.app.stage.addChild(this.layers.background);
    this.app.stage.addChild(this.layers.game);
    this.app.stage.addChild(this.layers.effect);
  }

  /**
   * 画面リサイズ処理
   */
  resize(width, height) {
    if (this.app && this.app.renderer) {
      this.app.renderer.resize(width, height);
    }
  }

  /**
   * 特定のレイヤーを取得するヘルパー
   */
  getLayer(name) {
    return this.layers[name];
  }
}