export class ScreenScaler {
  constructor() {
    // 基準となる解像度
    this.BASE_WIDTH = 1366;
    this.BASE_HEIGHT = 768;
    
    this.containerId = 'cockpit-container';
  }

  init() {
    window.addEventListener('resize', () => this.applyScale());
    this.applyScale();
  }

  applyScale() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    // 比率を計算
    const scale = Math.min(
      windowW / this.BASE_WIDTH,
      windowH / this.BASE_HEIGHT
    );

    // ゲーム画面コンテナ (#cockpit-container) の調整
    const gameContainer = document.getElementById(this.containerId);
    if (gameContainer) {
      gameContainer.style.width = `${this.BASE_WIDTH}px`;
      gameContainer.style.height = `${this.BASE_HEIGHT}px`;

      gameContainer.style.position = 'absolute';
      gameContainer.style.top = '50%';
      gameContainer.style.left = '50%';
      // 拡大縮小して中央配置
      gameContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
      gameContainer.style.transformOrigin = 'center center';
    }

    // ★修正: メニュー画面のスケーリング削除
    // メニュー等はCSSのFlexbox等で自然に配置されるのに任せることで、
    // 「最初から縮小されて見える」現象を防ぎます。

    // 全体の背景を黒に統一
    document.body.style.backgroundColor = '#000';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
  }
}