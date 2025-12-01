export class ScreenScaler {
  constructor() {
    this.containerId = "cockpit-container";
    // アスペクト比の固定を廃止します
    this.targetAspect = null; 
  }

  init() {
    window.addEventListener("resize", () => this.applyScale());
    this.applyScale();
  }

  applyScale() {
    const gameContainer = document.getElementById(this.containerId);
    if (!gameContainer) return;

    // 画面サイズいっぱいを使う設定に変更
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    gameContainer.style.width = `${windowWidth}px`;
    gameContainer.style.height = `${windowHeight}px`;
    
    // 位置調整（念のため）
    gameContainer.style.position = 'absolute';
    gameContainer.style.top = '0';
    gameContainer.style.left = '0';
    gameContainer.style.transform = 'none'; // 中央寄せ解除
    
    // 背景設定
    document.body.style.backgroundColor = "#000";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
  }
}