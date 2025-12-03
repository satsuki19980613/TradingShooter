/**
 * 【UIManager の役割: ビュー (View)】
 * ユーザーインターフェースの描画と、DOMイベントの仲介を行います。
 * ロジックを持たず、受動的に振る舞います。
 * * ■ 担当する責務 (Do):
 * - DOM要素の表示・非表示切り替え (Show/Hide)
 * - HUD (HPバー、スコアなど) の描画更新
 * - ボタンクリックイベントの検知と、外部アクション(bindActions)の呼び出し
 * * ■ 担当しない責務 (Don't):
 * - アプリケーションのフロー制御 (ゲーム開始手順など)
 * - 通信処理やサーバーへの接続 (NetworkManager へ)
 * - 認証処理 (FirebaseManager へ)
 * - ゲームの描画ループ管理 (Game クラスへ)
 */
import { MobileControlManager } from "./MobileControlManager.js";
import { RadarRenderer } from "./RadarRenderer.js";
import { MagazineRenderer } from "./MagazineRenderer.js";
export class UIManager {
  constructor() {
    const testEl = document.getElementById("modal-initial");
    console.log("デバッグ確認:", testEl);
    this.screens = {
      home: document.getElementById("screen-home"),
      ranking: document.getElementById("screen-ranking"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
      idleWarning: document.getElementById("screen-idle-warning"),
      mobileBlock: document.getElementById("screen-mobile-block"),
    };
    this.activeScreen = this.screens.home;
    this.modalInitial = document.getElementById("modal-initial");
    this.modalTransfer = document.getElementById("modal-transfer");
    this.modalRegister = document.getElementById("modal-register");
    this.displayNameEl = document.getElementById("display-player-name");
    this.initialNameInput = document.getElementById("initial-name-input");
    this.regNameInput = document.getElementById("reg-name-input");
    this.btnMenuRegister = document.getElementById("btn-menu-register");
    this.recoverCodeInput = document.getElementById("recover-code-input");
    this.transferCodeDisplay = document.getElementById("transfer-code-display");
    this.rankingListEl = document.getElementById("ranking-list");
    this.loadingTextEl = document.getElementById("loading-text");
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
    this.debugPanelEl = document.getElementById("debug-panel");
    this.isTransferFromInitial = false;
    this.debugStatsContainerEl = document.getElementById(
      "debug-stats-container"
    );
    this.debugSimulationContainerEl = document.getElementById(
      "debug-simulation-container"
    );
    this.leaderboardListEl = document.getElementById("leaderboard-list");

    this.isDebugMode = false;
    this.WORLD_WIDTH = 3000;
    this.WORLD_HEIGHT = 3000;
    this.mobileControlManager = new MobileControlManager();
    this.radarRenderer = new RadarRenderer();
    this.magazineRenderer = new MagazineRenderer();
    this.modalIngameLeaderboard = document.getElementById(
      "modal-ingame-leaderboard"
    );
    this.btnShowLeaderboard = document.getElementById("btn-show-leaderboard");
    this.btnCloseLeaderboard = document.getElementById("btn-close-leaderboard");
  }
  drawRadar(ctx, w, h, ww, wh, p, e, o, op) {
    this.radarRenderer.draw(ctx, w, h, ww, wh, p, e, o, op);
  }

  drawChargeUI(ctx, playerState, w, h) {
    this.magazineRenderer.draw(ctx, playerState, w, h);
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
      requestFullScreen.call(docEl).catch((err) => {
        console.warn(
          "フルスクリーン化できませんでした (ユーザー操作が必要な場合があります):",
          err
        );
      });
    }
  }

  bindActions(actions) {
    document
      .getElementById("btn-initial-start")
      .addEventListener("click", () => {
        const name = this.initialNameInput.value;

        if (!name) return alert("名前を入力してください");
        if (name.length < 3 || name.length > 12)
          return alert("名前は3文字以上12文字以下にしてください");
        if (name.toLowerCase() === "guest")
          return alert("その名前は使用できません");

        actions.onRegisterName(name);
      });

    document
      .getElementById("btn-initial-guest")
      .addEventListener("click", () => {
        actions.onGuestLogin();
      });

    document.getElementById("btn-start-game").addEventListener("click", () => {
      this.tryFullscreen();

      const playerName = this.displayNameEl.textContent || "Guest";
      actions.onStartGame(playerName);
    });

    document
      .getElementById("btn-goto-ranking")
      .addEventListener("click", () => {
        actions.onRankingRequest();
      });

    document.getElementById("btn-do-register").addEventListener("click", () => {
      const name = this.regNameInput.value;
      if (!name) return alert("名前を入力してください");
      if (name.length < 3 || name.length > 12)
        return alert("3〜12文字で入力してください");

      actions.onRegisterName(name);
    });

    document
      .getElementById("btn-gameover-retry")
      .addEventListener("click", () => {
        actions.onRetry();
      });

    const btnRetire = document.getElementById("btn-retire");
    if (btnRetire) {
      btnRetire.addEventListener("click", () => {
        if (confirm("終了してホームに戻りますか？")) {
          actions.onRetire();
        }
      });
    }

    document
      .getElementById("btn-ranking-back")
      .addEventListener("click", () => this.showScreen("home"));
    document
      .getElementById("btn-gameover-home")
      .addEventListener("click", () => {
        if (actions.onBackToHome) {
          actions.onBackToHome();
        } else {
          this.showScreen("home");
        }
      });
    document
      .getElementById("btn-error-home")
      .addEventListener("click", () => this.showScreen("home"));
    document
      .getElementById("btn-close-register")
      .addEventListener("click", () => {
        this.modalRegister.classList.add("hidden");
      });
    this.mobileControlManager.init(true);
    if (this.btnShowLeaderboard) {
      this.btnShowLeaderboard.addEventListener("click", () => {
        if (this.modalIngameLeaderboard) {
          this.modalIngameLeaderboard.classList.remove("hidden");
        }
      });
    }

    if (this.btnCloseLeaderboard) {
      this.btnCloseLeaderboard.addEventListener("click", () => {
        if (this.modalIngameLeaderboard) {
          this.modalIngameLeaderboard.classList.add("hidden");
        }
      });
    }
  }
  hideInitialModal() {
    if (this.modalInitial) this.modalInitial.classList.add("hidden");
  }

  showInitialModal() {
    if (this.modalInitial) this.modalInitial.classList.remove("hidden");
  }

  hideRegisterModal() {
    if (this.modalRegister) this.modalRegister.classList.add("hidden");
  }

  clearRankingList() {
    if (this.rankingListEl)
      this.rankingListEl.innerHTML = "<p>読み込み中...</p>";
  }

  async openTemporaryConnection(game, firebaseManager, networkManager) {
    if (!networkManager.ws || networkManager.ws.readyState !== WebSocket.OPEN) {
      const name = this.displayNameEl.textContent || "Guest";
      try {
        const user = await firebaseManager.authenticateAnonymously(name);
        game.setAuthenticatedPlayer(user);
        await networkManager.connect(user.uid, name, this.isDebugMode);
      } catch (e) {
        console.error("Temp Connect Error", e);
        alert("通信エラー");
      }
    }
  }

  openTransferModal(game, firebaseManager, networkManager) {
    this.modalTransfer.classList.remove("hidden");

    if (this.isTransferFromInitial) {
      document.getElementById(
        "transfer-code-display"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById(
        "transfer-code-display"
      ).parentElement.style.display = "block";
    }

    this.openTemporaryConnection(game, firebaseManager, networkManager);
  }

  async checkInitialLoginStatus(firebaseManager) {
    firebaseManager.onAuthStateChanged(async (user) => {
      if (!this.modalInitial) return;

      if (this.isRegistering) return;

      if (user) {
        if (user.displayName && user.displayName !== "Guest") {
          this.updateDisplayName(user.displayName);
          this.modalInitial.classList.add("hidden");
        } else {
          this.updateDisplayName("Guest");

          this.modalInitial.classList.add("hidden");
        }
      } else {
        this.updateDisplayName("Guest");
        this.modalInitial.classList.remove("hidden");
      }
    });
  }

  updateDisplayName(name) {
    if (this.displayNameEl) {
      this.displayNameEl.textContent = name;
    }

    const isGuest = name === "Guest";

    if (this.btnMenuRegister) {
      if (isGuest) {
        this.btnMenuRegister.classList.remove("hidden");
      } else {
        this.btnMenuRegister.classList.add("hidden");
      }
    }

    if (isGuest) {
      document.body.classList.add("guest-mode");
    } else {
      document.body.classList.remove("guest-mode");
    }
  }

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
    this.gameoverScoreEl.textContent = Math.round(score);
    this.gameoverMessageEl.textContent = "スコアを保存中...";

    if (this.screens.gameover) {
      this.screens.gameover.classList.add("active");
    }
  }

  syncHUD(playerState, tradeState) {
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
      if (chargePosition) {
        const type = chargePosition.type || "long";
        let priceDiff;

        if (type === "short") {
          priceDiff = chargePosition.entryPrice - currentPrice;
        } else {
          priceDiff = currentPrice - chargePosition.entryPrice;
        }

        const betAmount = chargePosition.amount;
      } else if (playerState.ep < chargeBetAmount) {
        betColor = "#f44336";
      }
      this.sizeValueEl.textContent = betText;
      this.sizeValueEl.style.color = betColor;
    }
    if (this.powerValueEl && this.powerLabelEl) {
      const chargePosition = playerState.chargePosition || null;
      const currentPrice = tradeState ? tradeState.currentPrice : 1000;
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

      let intLevel;
      if (level > 0) {
        intLevel = Math.ceil(level);
      } else {
        intLevel = Math.floor(level);
      }

      const levelText =
        intLevel === 0 ? "0" : (intLevel > 0 ? "+" : "") + intLevel;
      const levelColor =
        intLevel > 0 ? "#4caf50" : intLevel < 0 ? "#f44336" : "white";

      this.powerLabelEl.textContent = "Power";
      this.powerValueEl.textContent = levelText;
      this.powerValueEl.style.color = levelColor;
      this.mobileControlManager.updateDisplay(playerState);
    }
  }

  syncDebugHUD(stats, simStats, serverStats) {
    if (!this.isDebugMode) return;

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
      serverHtml += `<p><span class="stat-key">Est. (1 min):</span> <span class="stat-value">${simStats.mb_per_minute} MB</span></p>`;
      serverHtml += `<p><span class="stat-key">Est. (1 hour):</span> <span class="stat-value">${simStats.mb_per_hour} MB</span></p>`;
    }
    this.debugSimulationContainerEl.innerHTML = serverHtml;
  }

  setGameOverMessage(message) {
    this.gameoverMessageEl.textContent = message;
  }

  showErrorScreen(message, error) {
    console.error(message, error);
    this.errorMessageEl.textContent = `${message} (${
      error.code || error.message
    })`;
    this.showScreen("error");
  }

  setLoadingText(text) {
    this.loadingTextEl.textContent = text;
  }

  displayRanking(rankingData) {
    this.rankingListEl.innerHTML = "";
    if (!rankingData || rankingData.length === 0) {
      this.rankingListEl.innerHTML =
        "<p>ランキングデータがまだありません。</p>";
      return;
    }
    rankingData.forEach((data, index) => {
      const rank = index + 1;
      const row = document.createElement("div");
      row.className = `ranking-row rank-${rank}`;
      const rankEl = document.createElement("span");
      rankEl.className = "rank";
      rankEl.textContent = rank;
      const nameEl = document.createElement("span");
      nameEl.className = "name";
      nameEl.textContent = data.name || "No Name";
      const scoreEl = document.createElement("span");
      scoreEl.className = "score";
      scoreEl.textContent = data.highScore.toLocaleString();
      row.appendChild(rankEl);
      row.appendChild(nameEl);
      row.appendChild(scoreEl);
      this.rankingListEl.appendChild(row);
    });
  }

  setWorldSize(width, height) {
    this.WORLD_WIDTH = width;
    this.WORLD_HEIGHT = height;
    this.obstacleLayerEl.style.width = `${width}px`;
    this.obstacleLayerEl.style.height = `${height}px`;
  }

  syncDomElements(cameraX, cameraY) {
    const cameraTransform = `translate(${-cameraX}px, ${-cameraY}px)`;
    this.obstacleLayerEl.style.transform = cameraTransform;
  }

  clearObstacleLayer() {
    this.obstacleLayerEl.innerHTML = "";
  }

  addObstacleDOM(entity) {
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
    this.screens.game.appendChild(msg);

    setTimeout(() => {
      msg.remove();
    }, 1500);
  }

  async checkInitialLoginStatus(firebaseManager) {
    firebaseManager.onAuthStateChanged(async (user) => {
      if (!this.modalInitial) {
        console.error(
          "エラー: id='modal-initial' の要素が見つかりません。HTMLを確認してください。"
        );
        return;
      }

      if (user) {
        if (!user.displayName) {
          try {
            await user.reload();
          } catch (e) {
            console.warn("User reload failed:", e);
          }
        }
        if (user.displayName && user.displayName !== "Guest") {
          this.updateDisplayName(user.displayName);
          this.modalInitial.classList.add("hidden");
        } else {
          this.updateDisplayName("Guest");
          this.modalInitial.classList.add("hidden");
        }
      } else {
        this.modalInitial.classList.remove("hidden");
      }
    });
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

  isMobileDevice() {
    const ua = navigator.userAgent;
    const isStandardMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isStandardMobile;
  }
}
