export class ScreenScaler {
  constructor() {
    this.containerId = "cockpit-container";
  }

  init() {
    window.addEventListener("resize", () => this.applyScale());

    this.applyScale();
  }

  applyScale() {
    const gameContainer = document.getElementById(this.containerId);
    if (gameContainer) {
      
      gameContainer.style.width = '100%';
      gameContainer.style.height = '100%';
      
      
      gameContainer.style.transform = 'none';
      gameContainer.style.top = '0';
      gameContainer.style.left = '0';
      gameContainer.style.position = 'relative'; 
    }
    

    document.body.style.backgroundColor = "#000";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
  }
}
