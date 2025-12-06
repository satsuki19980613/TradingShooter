/**
 * HTML DOM要素の操作クラス
 */
export class DomManipulator {
  constructor() {
    this.screens = {
      home: document.getElementById("screen-home"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
    };
    
    this.hud = {
        hpBar: document.getElementById("hp-bar-inner"),
        hpVal: document.getElementById("hp-value"),
        epVal: document.getElementById("ep-value"),
        sizeVal: document.getElementById("size-value"),
        powerVal: document.getElementById("power-value"),
        loadingText: document.getElementById("loading-text")
    };
  }

  showScreen(id) {
    Object.values(this.screens).forEach(s => s && s.classList.remove("active"));
    const target = this.screens[id];
    if (target) target.classList.add("active");
  }

  setLoadingText(text) {
    if (this.hud.loadingText) this.hud.loadingText.textContent = text;
  }

  updateHUD(hp, maxHp, ep, betAmount, power) {
    if (this.hud.hpBar) this.hud.hpBar.style.width = `${(hp/maxHp)*100}%`;
    if (this.hud.hpVal) this.hud.hpVal.textContent = Math.ceil(hp);
    if (this.hud.epVal) this.hud.epVal.textContent = Math.ceil(ep);
    if (this.hud.sizeVal) this.hud.sizeVal.textContent = Math.ceil(betAmount);
    
    if (this.hud.powerVal) {
        const val = Math.floor(power);
        this.hud.powerVal.textContent = val > 0 ? `+${val}` : val;
        this.hud.powerVal.style.color = val > 0 ? "#4caf50" : (val < 0 ? "#f44336" : "white");
    }
  }
}