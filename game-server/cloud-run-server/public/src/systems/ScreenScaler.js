export class ScreenScaler {
  constructor() {
    this.containerId = "cockpit-container";
    
    // ▼ 設定: ここで固定したいアスペクト比を指定します
    // 縦持ちスマホ (9:16) の場合
    this.targetAspect = 16 / 9;
    
    // 横持ちスマホ (16:9) にしたい場合はこちらを有効にしてください
    // this.targetAspect = 16 / 9; 
  }

  init() {
    window.addEventListener("resize", () => this.applyScale());
    this.applyScale();
  }

  applyScale() {
    const gameContainer = document.getElementById(this.containerId);
    if (!gameContainer) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowAspect = windowWidth / windowHeight;

    let targetWidth, targetHeight;

    // ウィンドウが目標より「横長」の場合 -> 高さを基準に幅を決める（左右に黒帯）
    if (windowAspect > this.targetAspect) {
      targetHeight = windowHeight;
      targetWidth = targetHeight * this.targetAspect;
    } 
    // ウィンドウが目標より「縦長」の場合 -> 幅を基準に高さを決める（上下に黒帯）
    else {
      targetWidth = windowWidth;
      targetHeight = targetWidth / this.targetAspect;
    }

    // スタイルを適用（中央寄せ）
    gameContainer.style.width = `${targetWidth}px`;
    gameContainer.style.height = `${targetHeight}px`;
    gameContainer.style.position = 'absolute';
    gameContainer.style.top = '50%';
    gameContainer.style.left = '50%';
    gameContainer.style.transform = 'translate(-50%, -50%)'; // 中央揃え
    
    // 外側の背景（黒帯部分）の設定
    document.body.style.backgroundColor = "#000";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
  }
}