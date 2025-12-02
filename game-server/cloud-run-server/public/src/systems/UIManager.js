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
    this.modalIngameLeaderboard = document.getElementById("modal-ingame-leaderboard");
    this.btnShowLeaderboard = document.getElementById("btn-show-leaderboard");
    this.btnCloseLeaderboard = document.getElementById("btn-close-leaderboard");
  }

  // [追加] フルスクリーン化を試みるメソッド
  tryFullscreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFullScreen) {
      // ユーザー操作のコンテキストでないとブロックされることがあるため、catchでエラーを握りつぶす
      requestFullScreen.call(docEl).catch((err) => {
        console.warn("フルスクリーン化できませんでした (ユーザー操作が必要な場合があります):", err);
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
      this.tryFullscreen(); // ★ここに追加
      
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
      .addEventListener("click", () => this.showScreen("home"));
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
  }

  showGameOverScreen(score) {
    this.gameoverScoreEl.textContent = Math.round(score);
    this.gameoverMessageEl.textContent = "スコアを保存中...";
    
    // showScreen("gameover") を使うと game画面 が消えるため、直接クラスを操作する
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
        // ★修正: ポジションタイプを確認して計算式を変える
        const type = chargePosition.type || "long";
        let priceDiff;

        if (type === "short") {
          // ショートの場合: (エントリー価格 - 現在価格) が利益
          priceDiff = chargePosition.entryPrice - currentPrice;
        } else {
          // ロングの場合: (現在価格 - エントリー価格) が利益
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

  drawChargeUI(ctx, playerState, canvasWidth, canvasHeight) {
    if (!playerState) return;
    const stockedBullets = playerState.stockedBullets || [];
    const maxStock = playerState.maxStock || 10;

    // 上下のパディング
    const paddingY = 10;
    const availableHeight = canvasHeight - paddingY * 2;
    
    // バーの設定
    const gap = 6; // 隙間を少し広げて独立感を出す
    const slotHeight = Math.floor(availableHeight / maxStock - gap);
    
    // 幅設定（CSSで小さくしているので、Canvas内では幅を使い切る）
    const contentWidth = canvasWidth * 0.35; 
    const startX = (canvasWidth - contentWidth) / 2 + 10; // 斜めにする分、少し右へ
    const bottomY = canvasHeight - paddingY;

    ctx.save();

    // ★デザイン変更: 全体を斜めに傾ける (Skew)
    // 水平方向に -0.3 の傾斜をつける
    ctx.transform(1, 0, 0, 1, 0, 0);

    for (let i = 0; i < maxStock; i++) {
      const currentY = bottomY - (i + 1) * (slotHeight + gap) + gap;
      const hasBullet = i < stockedBullets.length;
      const damageVal = hasBullet ? Math.ceil(stockedBullets[i]) : 0;

      ctx.beginPath();
      // 角を少し削ったような矩形にするなどのパス操作も可能ですが、
      // transformで傾けているのでfillRectで平行四辺形になります。
      
      if (hasBullet) {
        // --- 弾がある場合 (発光グラデーション) ---
        ctx.save();

        let baseColor, highColor;
        // 威力に応じた色分け
        if (damageVal >= 100) {       // Tier 4
          baseColor = "#aa00ff";      // 紫
          highColor = "#ea80fc";
        } else if (damageVal >= 50) { // Tier 3
          baseColor = "#ff6d00";      // オレンジ
          highColor = "#ffab40";
        } else {                      // Tier 1-2
          baseColor = "#00bcd4";      // シアン
          highColor = "#84ffff";
        }

        // グラデーション作成 (左から右へ)
        const grad = ctx.createLinearGradient(startX, currentY, startX + contentWidth, currentY);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.6, highColor);
        grad.addColorStop(1, "rgba(255, 255, 255, 0.8)"); // 先端を光らせる

        ctx.fillStyle = grad;
        
        // 強い発光エフェクト
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 15;
        
        ctx.fillRect(startX, currentY, contentWidth, slotHeight);
        
        // ハイライト線を入れる
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillRect(startX, currentY, contentWidth, 2); // 上端のハイライト

        ctx.restore();
      } else {
        // --- 空スロットの場合 (薄い背景) ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(startX, currentY, contentWidth, slotHeight);
        
        // 枠線だけ薄く描画して「空き」を強調
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, currentY, contentWidth, slotHeight);
      }
    }

    ctx.restore();
  }
  drawRadar(
    ctx,
    canvasWidth,
    canvasHeight,
    worldWidth,
    worldHeight,
    playerState,
    enemiesState,
    obstaclesState,
    otherPlayersState
  ) {
    const size = Math.min(canvasWidth, canvasHeight);
    const radarRadius = (size * 0.95) / 2;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const viewRadiusWorld = 1500;
    const scale = radarRadius / viewRadiusWorld;

    ctx.save();

    // 1. クリップ領域の設定（円形）
    // 背景の塗りつぶし(fill)は行わず、クリップのみ適用して範囲外を描画しないようにする
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    // 2. 内部グリッド
    ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
    ctx.lineWidth = 1;

    // 同心円グリッド
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    // 十字線
    ctx.beginPath();
    ctx.moveTo(centerX - radarRadius, centerY);
    ctx.lineTo(centerX + radarRadius, centerY);
    ctx.moveTo(centerX, centerY - radarRadius);
    ctx.lineTo(centerX, centerY + radarRadius);
    ctx.stroke();

    // 3. エンティティ描画
    if (!playerState) {
      ctx.restore();
      return;
    }
    
    // ... (以下、エンティティ描画ロジックは変更なし) ...

    const getRadarPos = (wx, wy) => {
      const dx = wx - playerState.x;
      const dy = wy - playerState.y;
      return {
        x: centerX + dx * scale,
        y: centerY + dy * scale,
      };
    };

    // 敵 (赤)
    if (enemiesState && enemiesState.length > 0) {
      ctx.fillStyle = "#f44336";
      enemiesState.forEach((enemy) => {
        const pos = getRadarPos(enemy.x, enemy.y);
        const distSq = (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2;
        if (distSq <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 他プレイヤー (緑)
    if (otherPlayersState && otherPlayersState.length > 0) {
      ctx.fillStyle = "#76ff03";
      otherPlayersState.forEach((p) => {
        const pos = getRadarPos(p.x, p.y);
        const distSq = (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2;
        if (distSq <= radarRadius ** 2) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 自分 (中心、シアン)
    ctx.fillStyle = "#00bbd4";
    ctx.shadowColor = "#00bbd4";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
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
