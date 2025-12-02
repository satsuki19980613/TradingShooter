// public/src/systems/ScreenScaler.js

export class ScreenScaler {
  constructor() {
    // 基準となる解像度 (iPhone 11/XR 横向き想定)
    this.BASE_WIDTH = 896;
    this.BASE_HEIGHT = 414;
  }

  init() {
    window.addEventListener("resize", () => this.updateScale());
    // 初期化時にも実行
    this.updateScale();
  }

  updateScale() {
    // 1. ゲーム画面（Canvas）のサイズ合わせ (既存処理)
    const container = document.getElementById("game-field-container");
    if (container) {
      container.style.width = "100vw";
      container.style.height = "100vh";
    }

    // 2. HUDのスケーリング計算
    const currentW = window.innerWidth;
    const currentH = window.innerHeight;

    // 幅と高さ、どちらの比率に合わせて拡大縮小するか（小さい方に合わせると画面に収まる）
    const scaleX = currentW / this.BASE_WIDTH;
    const scaleY = currentH / this.BASE_HEIGHT;
    
    // 基本は小さい方の倍率に合わせる（はみ出し防止）
    // ただし、PCなどで極端に大きくなりすぎないよう上限(maxScale)を設けるのも手ですが、
    // 「均等に拡大」という要望通り、制限なしで適用します。
    let scale = Math.min(scaleX, scaleY);

    // ★PCで文字が小さくなりすぎないよう、最低倍率(0.7程度)は確保するなどの調整もここで可能
    // scale = Math.max(scale, 0.7); 

    // 3. CSS変数として反映
    document.documentElement.style.setProperty('--ui-scale', scale);
  }
}