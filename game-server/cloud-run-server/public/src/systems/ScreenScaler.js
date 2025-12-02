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

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile && window.innerWidth < 1024) {
        // スマホ用変数をリセット（あるいは1.0にしてCSSに任せる）
        document.documentElement.style.setProperty('--ui-scale', '1');
        return; 
    }
    // 1. ゲーム画面コンテナのサイズ設定
    const container = document.getElementById("game-field-container");
    // ※CSSで回転制御するため、ここでのJSによるサイズ指定は削除または無効化しても良いですが、
    // 安全のため残す場合はデフォルト挙動のままにします。

    // 2. HUDのスケーリング計算
    let currentW = window.innerWidth;
    let currentH = window.innerHeight;

    // ▼▼▼ 追加: 縦向きなら、サイズを入れ替えて計算する（回転して横長として使うため） ▼▼▼
    if (currentH > currentW) {
        const temp = currentW;
        currentW = currentH;
        currentH = temp;
    }
    // ▲▲▲ 追加ここまで ▲▲▲

    const scaleX = currentW / this.BASE_WIDTH;
    const scaleY = currentH / this.BASE_HEIGHT;
    
    // 小さい方の倍率に合わせる
    let scale = Math.min(scaleX, scaleY);

    // CSS変数として反映
    document.documentElement.style.setProperty('--ui-scale', scale);
  }
}