export class ScreenScaler {
  constructor() {
    // 設定不要
  }

  init() {
    window.addEventListener("resize", () => this.resizeCanvas());
    // 初期化時にも実行
    this.resizeCanvas();
  }

  resizeCanvas() {
    // ゲーム画面（Canvas）だけは常にウィンドウサイズに合わせる
    const container = document.getElementById("game-field-container");
    if (container) {
      container.style.width = "100vw";
      container.style.height = "100vh";
    }
    
    // ★重要: UIのスケール操作（transform）は一切行わない
    // CSSのメディアクエリに任せるため、ここでの処理は削除
    document.documentElement.style.removeProperty('--ui-scale');
  }
}