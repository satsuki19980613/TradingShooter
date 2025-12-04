import { MobileControlManager } from "./MobileControlManager.js";
import { RadarRenderer } from "./RadarRenderer.js";
import { MagazineRenderer } from "./MagazineRenderer.js";

export class UIManager {
  constructor() {
    // 画面定義 (不要な画面IDがあれば削除しても良いですが、安全のため残してもOK)
    this.screens = {
      home: document.getElementById("screen-home"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
      idleWarning: document.getElementById("screen-idle-warning"),
    };
    this.activeScreen = this.screens.home;

    // ゲーム内要素
    this.hpBarInnerEl = document.getElementById("hp-bar-inner");
    this.hpValueEl = document.getElementById("hp-value");
    this.epValueEl = document.getElementById("ep-value");
    this.sizeValueEl = document.getElementById("size-value");
    this.powerLabelEl = document.getElementById("power-label");
    this.powerValueEl = document.getElementById("power-value");
    this.obstacleLayerEl = document.getElementById("obstacle-layer");
    this.gameCanvas = document.getElementById("game-field");
    this.gameoverScoreEl = document.getElementById("gameover-score");
    this.gameoverMessageEl = document.getElementById("gameover-message");
    this.errorMessageEl = document.getElementById("error-message");
    
    // デバッグ系
    this.debugPanelEl = document.getElementById("debug-panel");
    this.debugStatsContainerEl = document.getElementById("debug-stats-container");
    this.debugSimulationContainerEl = document.getElementById("debug-simulation-container");

    // ランキングリスト (HTMLから削除されている場合は null になるためチェックが必要)
    this.leaderboardListEl = document.getElementById("leaderboard-list");

    this.isDebugMode = false;
    this.WORLD_WIDTH = 3000;
    this.WORLD_HEIGHT = 3000;
    
    this.mobileControlManager = new MobileControlManager();
    this.radarRenderer = new RadarRenderer();
    this.magazineRenderer = new MagazineRenderer();
  }

  // 描画関連
  drawRadar(ctx, w, h, ww, wh, p, e, o, op) {
    this.radarRenderer.draw(ctx, w, h, ww, wh, p, e, o, op);
  }

  drawChargeUI(ctx, playerState, w, h) {
    this.magazineRenderer.draw(ctx, playerState, w, h);
  }

  tryFullscreen() {
      const doc = window.document;
      const docEl = doc.documentElement;
      const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
      if (requestFullScreen) {
          requestFullScreen.call(docEl).catch((err) => console.warn(err));
      }
  }

  /**
   * アクションのバインド (ゲストプレイに必要な最小限のみ)
   */
  bindActions(actions) {
    // Join Gameボタン (常にゲストとして開始)
    const btnStartGame = document.getElementById("btn-start-game");
    if (btnStartGame) {
      btnStartGame.addEventListener("click", () => {
        this.tryFullscreen();
        actions.onStartGame("Guest");
      });
    }

    // リトライボタン
    const btnRetry = document.getElementById("btn-gameover-retry");
    if (btnRetry) {
      btnRetry.addEventListener("click", () => {
        actions.onRetry();
      });
    }

    // ホームへ戻るボタン
    const btnGameoverHome = document.getElementById("btn-gameover-home");
    if (btnGameoverHome) {
      btnGameoverHome.addEventListener("click", () => {
        if (actions.onBackToHome) {
          actions.onBackToHome();
        } else {
          this.showScreen("home");
        }
      });
    }
    
    const btnErrorHome = document.getElementById("btn-error-home");
    if (btnErrorHome) {
      btnErrorHome.addEventListener("click", () => this.showScreen("home"));
    }

    // リタイアボタン
    const btnRetire = document.getElementById("btn-retire");
    if (btnRetire) {
      btnRetire.addEventListener("click", () => {
        if (confirm("終了してホームに戻りますか？")) {
          actions.onRetire();
        }
      });
    }

    this.mobileControlManager.init(true);
  }

  // 画面切り替え
  showScreen(screenId) {
    for (const key in this.screens) {
      if (this.screens[key]) this.screens[key].classList.remove("active");
    }
    const s = this.screens[screenId];
    if (s) s.classList.add("active");
    this.activeScreen = s;
    if (this.mobileControlManager) {
      this.mobileControlManager.applyScreenMode(screenId);
    }
  }

  showGameOverScreen(score) {
    if (this.gameoverScoreEl) this.gameoverScoreEl.textContent = Math.round(score);
    if (this.gameoverMessageEl) this.gameoverMessageEl.textContent = "スコアを保存中...";

    if (this.screens.gameover) {
      this.screens.gameover.classList.add("active");
    }
  }

  // HUD更新
  syncHUD(playerState, tradeState) {
    if (!playerState || !this.hpBarInnerEl) return;
    const currentPrice = tradeState ? tradeState.currentPrice : 1000;
    
    // HP
    if (playerState.hp !== undefined) {
      const hpPercent = (playerState.hp / 100) * 100;
      this.hpBarInnerEl.style.width = `${hpPercent}%`;
      if (this.hpValueEl)
        this.hpValueEl.textContent = Math.ceil(playerState.hp);
    } else {
      this.hpBarInnerEl.style.width = `0%`;
      if (this.hpValueEl) this.hpValueEl.textContent = 0;
    }

    // EP
    if (this.epValueEl) {
      this.epValueEl.textContent =
        playerState.ep !== undefined ? Math.ceil(playerState.ep) : 0;
    }

    // Size (Bet Amount)
    if (this.sizeValueEl) {
      const chargeBetAmount = playerState.chargeBetAmount || 10;
      const chargePosition = playerState.chargePosition || null;
      let betText = Math.ceil(chargeBetAmount);
      let betColor = "white";
      
      // 所持EPよりベット額が大きい場合は赤文字にする等の演出
      if (!chargePosition && playerState.ep < chargeBetAmount) {
        betColor = "#f44336";
      }
      this.sizeValueEl.textContent = betText;
      this.sizeValueEl.style.color = betColor;
    }

    // Power (Profit/Loss)
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

      const levelText = intLevel === 0 ? "0" : (intLevel > 0 ? "+" : "") + intLevel;
      const levelColor = intLevel > 0 ? "#4caf50" : intLevel < 0 ? "#f44336" : "white";

      this.powerLabelEl.textContent = "Power";
      this.powerValueEl.textContent = levelText;
      this.powerValueEl.style.color = levelColor;
      this.mobileControlManager.updateDisplay(playerState);
    }
  }

  // デバッグHUD
  syncDebugHUD(stats, simStats, serverStats) {
    if (!this.isDebugMode || !this.debugStatsContainerEl) return;

    let statsHtml = "";
    statsHtml += `<p><span class="stat-key">PPS Total:</span> <span class="stat-value">${stats.pps_total}</span></p>`;
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
      const tickColor = loadPercent > 80 ? "#f44336" : loadPercent > 50 ? "#ff9800" : "#4caf50";
      
      serverHtml += `<p><span class="stat-key">Avg Tick Time:</span> <span class="stat-value" style="color: ${tickColor}">${avgTick.toFixed(2)} ms</span></p>`;
      serverHtml += `<p><span class="stat-key">(Target):</span> <span class="stat-value">${targetTick} ms</span></p>`;
      serverHtml += `<p><span class="stat-key">Server Load:</span> <span class="stat-value" style="color: ${tickColor}">${loadPercent.toFixed(1)} %</span></p>`;
      serverHtml += `<hr>`;
      serverHtml += `<p><span class="stat-key">Players:</span> <span class="stat-value">${serverStats.playerCount}</span></p>`;
      serverHtml += `<p><span class="stat-key">Enemies:</span> <span class="stat-value">${serverStats.enemyCount}</span></p>`;
      serverHtml += `<p><span class="stat-key">Bullets:</span> <span class="stat-value">${serverStats.bulletCount}</span></p>`;
    } else {
      serverHtml += `<p><span class="stat-key">Avg Speed:</span> <span class="stat-value">${(simStats.avg_bps / 1024).toFixed(1)} KB/s</span></p>`;
    }
    this.debugSimulationContainerEl.innerHTML = serverHtml;
  }

  setGameOverMessage(message) {
    if (this.gameoverMessageEl) this.gameoverMessageEl.textContent = message;
  }

  showErrorScreen(message, error) {
    console.error(message, error);
    if (this.errorMessageEl) {
        this.errorMessageEl.textContent = `${message} (${error.code || error.message})`;
    }
    this.showScreen("error");
  }

  setLoadingText(text) {
    if(this.loadingTextEl) this.loadingTextEl.textContent = text;
  }

  setWorldSize(width, height) {
    this.WORLD_WIDTH = width;
    this.WORLD_HEIGHT = height;
    if (this.obstacleLayerEl) {
        this.obstacleLayerEl.style.width = `${width}px`;
        this.obstacleLayerEl.style.height = `${height}px`;
    }
  }

  syncDomElements(cameraX, cameraY) {
    if (this.obstacleLayerEl) {
        const cameraTransform = `translate(${-cameraX}px, ${-cameraY}px)`;
        this.obstacleLayerEl.style.transform = cameraTransform;
    }
  }

  clearObstacleLayer() {
    if (this.obstacleLayerEl) this.obstacleLayerEl.innerHTML = "";
  }

  addObstacleDOM(entity) {
    if (!this.obstacleLayerEl) return null;
    let el = null;
    if (entity.type === "obstacle_wall") {
      el = document.createElement("div");
      el.className = "obs-base";
      if (entity.styleType) {
        el.classList.add(entity.styleType);
      }
      el.style.width = `${entity.width}px`;
      el.style.height = `${entity.height}px`;
      el.style.left = `${entity.x}px`;
      el.style.top = `${entity.y}px`;

      if (entity.rotation) {
        el.style.transform = `rotate(${entity.rotation}rad)`;
      }
      if (entity.borderRadius > 0) {
        el.style.borderRadius = `${entity.borderRadius}px`;
      } else if (
        entity.individualRadii &&
        Object.keys(entity.individualRadii).length > 0
      ) {
        const {
          borderBottomLeftRadius = 0,
          borderBottomRightRadius = 0,
          borderTopLeftRadius = 0,
          borderTopRightRadius = 0,
        } = entity.individualRadii;
        el.style.borderRadius = `${borderTopLeftRadius}px ${borderTopRightRadius}px ${borderBottomRightRadius}px ${borderBottomLeftRadius}px`;
      }
    }
    if (el) {
      entity.domElement = el;
      this.obstacleLayerEl.appendChild(el);
      return el;
    }
    return null;
  }

  removeObstacleDOM(obstacle) {
    if (obstacle.domElement) {
      obstacle.domElement.remove();
    }
  }

  showFloatingMessage(text, type) {
    const msg = document.createElement("div");
    msg.textContent = text;
    msg.style.position = "absolute";
    msg.style.left = "50%";
    msg.style.top = "20%";
    msg.style.transform = "translateX(-50%)";
    msg.style.fontSize = "24px";
    msg.style.fontWeight = "bold";
    msg.style.padding = "10px 20px";
    msg.style.borderRadius = "8px";
    msg.style.zIndex = "20";
    msg.style.backgroundColor =
      type === "profit" ? "rgba(76, 175, 80, 0.8)" : "rgba(244, 67, 54, 0.8)";
    msg.style.color = "white";
    msg.style.pointerEvents = "none";
    
    const gameScreen = this.screens.game;
    if (gameScreen) {
        gameScreen.appendChild(msg);
        setTimeout(() => {
            msg.remove();
        }, 1500);
    }
  }

  // サーバーからリーダーボード情報が送られてきた場合の処理
  // (HTMLからリストが削除されている場合は何もしない)
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

  isMobileDevice() {
    return false;
  }
}