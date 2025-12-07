export class DomManipulator {
  constructor() {
    this.screens = {
      home: document.getElementById("screen-home"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
      idleWarning: document.getElementById("screen-idle-warning"),
    };
    
    this.hud = {
        hpBar: document.getElementById("hp-bar-inner"),
        hpVal: document.getElementById("hp-value"),
        epVal: document.getElementById("ep-value"),
        sizeVal: document.getElementById("size-value"),
        powerVal: document.getElementById("power-value"),
        loadingText: document.getElementById("loading-text")
    };

    this.audioUI = {
        btnToggle: document.getElementById("btn-audio-toggle"),
        loadingContainer: document.getElementById("audio-loading-container"),
        loadingBar: document.getElementById("audio-loading-bar"),
        btnStartGame: document.getElementById("btn-start-game"),
        notification: document.getElementById("music-notification"),
        notificationTitle: document.getElementById("music-title")
    };
    
    this.notificationTimer = null;
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

  // --- Audio Related UI Methods ---

  setAudioLoadingState(isLoading) {
    if (this.audioUI.loadingContainer) {
        this.audioUI.loadingContainer.style.display = isLoading ? "block" : "none";
    }
    
    if (this.audioUI.btnStartGame) {
        this.audioUI.btnStartGame.disabled = isLoading;
        this.audioUI.btnStartGame.style.opacity = isLoading ? "0.5" : "1.0";
        this.audioUI.btnStartGame.style.cursor = isLoading ? "not-allowed" : "pointer";
    }

    if (this.audioUI.btnToggle) {
        this.audioUI.btnToggle.textContent = isLoading ? "⏳ LOADING..." : "🔊 BGM: ON";
    }

    if (isLoading) {
        let warningEl = document.getElementById("bgm-warning-text");
        if (!warningEl && this.audioUI.loadingContainer) {
            warningEl = document.createElement("p");
            warningEl.id = "bgm-warning-text";
            warningEl.style.color = "#ff9800";
            warningEl.style.fontSize = "12px";
            warningEl.style.marginTop = "8px";
            warningEl.style.textAlign = "center";
            warningEl.textContent = "※ BGMデータをダウンロード中です。完了するまで開始できません。";
            this.audioUI.loadingContainer.parentNode.insertBefore(warningEl, this.audioUI.loadingContainer.nextSibling);
        }
        if (warningEl) warningEl.style.display = "block";
    } else {
        const warningEl = document.getElementById("bgm-warning-text");
        if (warningEl) warningEl.style.display = "none";
    }
  }

  updateAudioLoadingProgress(percent) {
    if (this.audioUI.loadingBar) {
        this.audioUI.loadingBar.style.width = `${percent}%`;
    }
  }

  updateAudioButton(isMuted) {
    if (this.audioUI.btnToggle) {
        if (!isMuted) {
            this.audioUI.btnToggle.textContent = "🔊 BGM: ON";
            this.audioUI.btnToggle.style.opacity = "1.0";
        } else {
            this.audioUI.btnToggle.textContent = "🔇 BGM: OFF";
            this.audioUI.btnToggle.style.opacity = "0.5";
        }
    }
  }

  showMusicNotification(title) {
    if (!this.audioUI.notification || !this.audioUI.notificationTitle) return;
    
    this.audioUI.notificationTitle.textContent = title;
    this.audioUI.notification.classList.remove("hidden");
    void this.audioUI.notification.offsetWidth;
    
    requestAnimationFrame(() => {
        this.audioUI.notification.classList.add("show");
    });

    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    
    this.notificationTimer = setTimeout(() => {
        this.audioUI.notification.classList.remove("show");
        setTimeout(() => this.audioUI.notification.classList.add("hidden"), 600);
    }, 5000);
  }
}