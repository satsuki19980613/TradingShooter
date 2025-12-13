import { CyberUIRenderer } from "../rendering/ui/CyberUIRenderer.js";

export class DomManipulator {
  constructor() {
    this.screens = {
      home: document.getElementById("screen-home"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
      ranking: document.getElementById("screen-ranking"),
    };
    const btnRankingBack = document.getElementById("btn-ranking-back");
    if (btnRankingBack) {
      btnRankingBack.onclick = () => this.showScreen("home");
    }
    this.hpBarInnerEl = document.getElementById("hp-bar-inner");
    this.hpValueEl = document.getElementById("hp-value");
    this.epValueEl = document.getElementById("ep-value");
    this.sizeValueEl = document.getElementById("size-value");
    this.powerLabelEl = document.getElementById("power-label");
    this.powerValueEl = document.getElementById("power-value");
    this.gameoverScoreEl = document.getElementById("gameover-score");
    this.gameoverMessageEl = document.getElementById("gameover-message");
    this.errorMessageEl = document.getElementById("error-message");
    this.loadingTextEl = document.getElementById("loading-text");

    this.debugPanelEl = document.getElementById("debug-panel");
    this.debugStatsContainerEl = document.getElementById(
      "debug-stats-container"
    );
    this.debugSimulationContainerEl = document.getElementById(
      "debug-simulation-container"
    );
    this.leaderboardListEl = document.getElementById("leaderboard-list");

    this.audioUI = {
      btnToggle: document.getElementById("btn-audio-toggle"),
      loadingContainer: document.getElementById("audio-loading-container"),
      loadingBar: document.getElementById("audio-loading-bar"),
      btnStartGame: document.getElementById("btn-start-game"),
      notification: document.getElementById("music-notification"),
      notificationTitle: document.getElementById("music-title"),
    };

    this.notificationTimer = null;
    this.modals = {
      register: document.getElementById("modal-register"),
      transfer: document.getElementById("modal-transfer"),
    };
    this.activeScreen = this.screens.home;
    this.isDebugMode = false;
    this.mobileControlManager = null;
    this.uiRenderer = new CyberUIRenderer("menu-canvas");
    this.uiRenderer.start();
  }
  openModal(modalType) {
    Object.values(this.modals).forEach(
      (el) => el && el.classList.add("hidden")
    );

    if (this.modals[modalType]) {
      this.modals[modalType].classList.remove("hidden");

      this.uiRenderer.setOverlay("modal");
    }
  }

  closeAllModals() {
    Object.values(this.modals).forEach(
      (el) => el && el.classList.add("hidden")
    );

    this.uiRenderer.setOverlay(null);
  }

  setBodyMode(mode) {
    document.body.classList.remove("mode-initial", "mode-guest", "mode-member");
    document.body.classList.add(`mode-${mode}`);

    if (mode === "initial") {
      this.showScreen("home");
    } else {
      this.showScreen("home");
    }
  }

  switchCanvasScene(sceneKey, data = null) {
    this.uiRenderer.setScene(sceneKey, data);
  }
  setMenuActionCallback(callback) {
    this.uiRenderer.setCallback(callback);
  }

  showScreen(screenId) {
    if (screenId === "home") {
      this.uiRenderer.setScene("initial");
      this.uiRenderer.start();
    } else if (screenId === "game") {
      this.uiRenderer.stop();
    }
  }

  enableDebugMode() {
    this.isDebugMode = true;
    if (this.debugPanelEl) {
      this.debugPanelEl.style.display = "block";
    }
  }
  setMobileControlManager(manager) {
    this.mobileControlManager = manager;
  }

  showScreen(screenId) {
    for (const key in this.screens) {
      if (this.screens[key]) this.screens[key].classList.remove("active");
    }

    const s = this.screens[screenId];
    if (s) s.classList.add("active");
    this.activeScreen = s;

    if (screenId === "home") {
      this.uiRenderer.start();
    } else if (screenId === "game") {
      this.uiRenderer.stop();
    } else {
      this.uiRenderer.start();
    }

    if (this.mobileControlManager) {
      this.mobileControlManager.applyScreenMode(screenId);
    }
  }

  setLoadingText(text) {
    if (this.loadingTextEl) this.loadingTextEl.textContent = text;
  }

  updateHUD(playerState, tradeState) {
    if (!playerState || !this.hpBarInnerEl) return;

    const currentPrice = tradeState ? tradeState.currentPrice : 1000;

    if (playerState.hp !== undefined) {
      const hpPercent = (playerState.hp / 100) * 100;
      this.hpBarInnerEl.style.width = `${hpPercent}%`;
      if (this.hpValueEl)
        this.hpValueEl.textContent = Math.ceil(playerState.hp);
    } else {
      this.hpBarInnerEl.style.width = `0%`;
      if (this.hpValueEl) this.hpValueEl.textContent = 0;
    }

    if (this.epValueEl) {
      this.epValueEl.textContent =
        playerState.ep !== undefined ? Math.ceil(playerState.ep) : 0;
    }

    if (this.sizeValueEl) {
      const chargeBetAmount = playerState.chargeBetAmount || 10;
      const chargePosition = playerState.chargePosition || null;
      let betText = Math.ceil(chargeBetAmount);
      let betColor = "white";
      if (!chargePosition && playerState.ep < chargeBetAmount) {
        betColor = "#f44336";
      }
      this.sizeValueEl.textContent = betText;
      this.sizeValueEl.style.color = betColor;
    }

    if (this.powerValueEl && this.powerLabelEl) {
      const chargePosition = playerState.chargePosition || null;
      let level = 0;

      if (chargePosition) {
        const type = chargePosition.type || "long";
        let priceDiff;

        if (type === "short") {
          priceDiff = chargePosition.entryPrice - currentPrice;
        } else {
          priceDiff = currentPrice - chargePosition.entryPrice;
        }

        const betAmount = chargePosition.amount;
        level = priceDiff * betAmount;
      }

      let intLevel = Math.floor(level);
      if (level > 0) intLevel = Math.ceil(level);

      const levelText =
        intLevel === 0 ? "0" : (intLevel > 0 ? "+" : "") + intLevel;
      const levelColor =
        intLevel > 0 ? "#00ff00" : intLevel < 0 ? "#ff0055" : "white";

      this.powerLabelEl.textContent = "Power";
      this.powerValueEl.textContent = levelText;
      this.powerValueEl.style.color = levelColor;
    }

    if (this.mobileControlManager) {
      this.mobileControlManager.updateDisplay(playerState);
    }
  }
  enableDebugMode() {
    this.isDebugMode = true;
    if (this.debugPanelEl) {
      this.debugPanelEl.style.display = "block";
      if (!document.getElementById("debug-jitter-canvas")) {
        const container = document.createElement("div");
        container.style.marginTop = "10px";

        const canvas = document.createElement("canvas");
        canvas.id = "debug-jitter-canvas";
        canvas.width = 300;
        canvas.height = 100;
        canvas.style.width = "100%";
        canvas.style.backgroundColor = "#222";
        canvas.style.border = "1px solid #555";

        const btn = document.createElement("button");
        btn.id = "btn-download-jitter";
        btn.textContent = "Download JSON";
        btn.className = "ui-button small";
        btn.style.marginTop = "5px";
        btn.style.width = "100%";

        container.appendChild(canvas);
        container.appendChild(btn);
        this.debugPanelEl.appendChild(container);
      }
    }
  }
  setupDebugListeners(onDownload) {
    const btn = document.getElementById("btn-download-jitter");
    if (btn) {
      btn.addEventListener("click", onDownload);
    }
  }

  getDebugCanvas() {
    return document.getElementById("debug-jitter-canvas");
  }
  updateDebugHUD(stats, simStats, serverStats) {
    if (!this.isDebugMode || !this.debugStatsContainerEl) return;

    let statsHtml = "";
    statsHtml += `<p><span class="stat-key">PPS Total:</span> <span class="stat-value">${stats.pps_total}</span></p>`;
    if (stats.jitter !== undefined) {
      const jitterVal = stats.jitter.toFixed(2);

      let color = "#4caf50";
      if (stats.jitter > 5.0) color = "#ffeb3b";
      if (stats.jitter > 10.0) color = "#f44336";

      statsHtml += `<p><span class="stat-key">Jitter:</span> <span class="stat-value" style="color:${color}">${jitterVal} ms</span></p>`;
    }
    statsHtml += `<hr>`;
    statsHtml += `<p><span class="stat-key">BPS Total:</span> <span class="stat-value">${(
      stats.bps_total / 1024
    ).toFixed(1)} KB/s</span></p>`;
    this.debugStatsContainerEl.innerHTML = statsHtml;

    let serverHtml = "<h4>💻 Server Stats (Room)</h4>";
    if (serverStats && serverStats.avgTickTime !== undefined) {
      const avgTick = parseFloat(serverStats.avgTickTime);
      const targetTick = serverStats.targetTickTime;
      const loadPercent = (avgTick / targetTick) * 100;
      const tickColor =
        loadPercent > 80 ? "#f44336" : loadPercent > 50 ? "#ff9800" : "#4caf50";

      serverHtml += `<p><span class="stat-key">Avg Tick Time:</span> <span class="stat-value" style="color: ${tickColor}">${avgTick.toFixed(
        2
      )} ms</span></p>`;
      serverHtml += `<p><span class="stat-key">(Target):</span> <span class="stat-value">${targetTick} ms</span></p>`;
      serverHtml += `<p><span class="stat-key">Server Load:</span> <span class="stat-value" style="color: ${tickColor}">${loadPercent.toFixed(
        1
      )} %</span></p>`;
      serverHtml += `<hr>`;
      serverHtml += `<p><span class="stat-key">Players:</span> <span class="stat-value">${serverStats.playerCount}</span></p>`;
      serverHtml += `<p><span class="stat-key">Enemies:</span> <span class="stat-value">${serverStats.enemyCount}</span></p>`;
      serverHtml += `<p><span class="stat-key">Bullets:</span> <span class="stat-value">${serverStats.bulletCount}</span></p>`;
    } else {
      serverHtml += `<p><span class="stat-key">Avg Speed:</span> <span class="stat-value">${(
        simStats.avg_bps / 1024
      ).toFixed(1)} KB/s</span></p>`;
    }
    this.debugSimulationContainerEl.innerHTML = serverHtml;
  }

  showGameOverScreen(score) {
    if (this.gameoverScoreEl)
      this.gameoverScoreEl.textContent = Math.round(score);
    if (this.gameoverMessageEl)
      this.gameoverMessageEl.textContent = "スコアを保存中...";
    this.showScreen("gameover");
  }

  showErrorScreen(message, error) {
    console.error(message, error);
    if (this.errorMessageEl) {
      this.errorMessageEl.textContent = `${message} (${
        error.code || error.message
      })`;
    }
    this.showScreen("error");
  }

  updateLeaderboard(leaderboardData, myUserId) {
    if (!this.leaderboardListEl) return;

    this.leaderboardListEl.innerHTML = "";
    const numSlots = 5;
    for (let i = 0; i < numSlots; i++) {
      const player = leaderboardData ? leaderboardData[i] : null;
      const li = document.createElement("li");
      li.className = "leaderboard-row";
      if (player) {
        const nameSpan = document.createElement("span");
        nameSpan.className = "lb-name";
        nameSpan.textContent = player.name;
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "lb-score";
        scoreSpan.textContent = Math.floor(player.score).toLocaleString();

        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        if (player.id === myUserId) {
          li.classList.add("you");
        }
      } else {
        li.classList.add("empty");
        li.innerHTML =
          '<span class="lb-name">...</span><span class="lb-score">-</span>';
      }
      this.leaderboardListEl.appendChild(li);
    }
  }

  tryFullscreen() {
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    if (requestFullScreen) {
      requestFullScreen.call(docEl).catch((err) => console.warn(err));
    }
  }
  setAudioLoadingState(isLoading) {
    if (this.audioUI.loadingContainer) {
      this.audioUI.loadingContainer.style.display = isLoading ? "block" : "none";
    }
    // 読み込み開始時はバーを0%にリセット
    if (isLoading && this.audioUI.loadingBar) {
      this.audioUI.loadingBar.style.width = "0%";
    }
  }
  updateAudioLoadingProgress(percent) {
    if (this.audioUI.loadingBar) {
      this.audioUI.loadingBar.style.width = `${percent}%`;
    }
  }

  updateAudioButton(isMuted) {
    if (this.uiRenderer) {
      this.uiRenderer.setAudioState(isMuted);
    }

    if (this.audioUI.btnToggle) {
      this.audioUI.btnToggle.textContent = isMuted
        ? "🔇 BGM: OFF"
        : "🔊 BGM: ON";
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
