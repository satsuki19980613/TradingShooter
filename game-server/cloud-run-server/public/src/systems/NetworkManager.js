export class NetworkManager {
  constructor() {
    this.serverUrl = location.origin.replace(/^http/, "ws");
    this.onAccountResponse = null;
    this.game = null;
    this.ws = null;
    this.isIntentionalClose = false;
    this.stats = {
      pps_total: 0,
      bps_total: 0,
      total_bytes: 0,
      total_seconds: 0,
    };
    this.tempStats = { pps_total: 0, bps_total: 0 };
    this.messageHandlers = new Map();
    this.statsInterval = setInterval(() => {
      if (this.stats) {
        this.stats.total_bytes += this.tempStats.bps_total;
        this.stats.total_seconds++;

        this.stats.pps_total = this.tempStats.pps_total;
        this.stats.bps_total = this.tempStats.bps_total;

        this.tempStats.pps_total = 0;
        this.tempStats.bps_total = 0;
      }
    }, 1000);
  }

  _estimateJsonBytes(str) {
    return new TextEncoder().encode(str).length;
  }

  init(game) {
    this.game = game;
    console.log("Network Manager (WebSocket) が初期化されました。");
    this.messageHandlers.set("game_state_snapshot", (payload) =>
      this.game.applySnapshot(payload)
    );
    this.messageHandlers.set("game_state_delta", (payload) =>
      this.game.applyDelta(payload)
    );
    this.messageHandlers.set("chart_state", (payload) =>
      this.game.setFullChartState(payload)
    );
    this.messageHandlers.set("chart_update", (payload) =>
      this.game.setTradeState(payload)
    );
    this.messageHandlers.set("static_state", (payload) =>
      this.game.setStaticState(payload)
    );
    this.messageHandlers.set("idle_warning", () =>
      this.game.uiManager.showScreen("idle-warning")
    );
    this.messageHandlers.set("leaderboard_update", (payload) =>
      this.game.uiManager.updateLeaderboard(payload, this.game.userId)
    );
    this.messageHandlers.set("leaderboard_update", (payload) => {
      if (payload.leaderboardData) {
        this.game.uiManager.updateLeaderboard(
          payload.leaderboardData,
          this.game.userId
        );
      }
      if (payload.serverStats) {
        this.game.setServerPerformanceStats(payload.serverStats);
      }
    });
  }

  /**
   * [修正] デルタ更新に対応した onmessage ハンドラ
   */
  connect(userId, playerName, isDebugMode = false) {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;
      const url = `${this.serverUrl}/?userId=${encodeURIComponent(
        userId
      )}&playerName=${encodeURIComponent(playerName)}&debug=${isDebugMode}`;
      console.log(`[Network] サーバー ${url} に接続中...`);

      this.stats.total_bytes = 0;
      this.stats.total_seconds = 0;

      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
      } catch (error) {
        console.error("[Network] (A) WebSocket 接続(new)に失敗:", error);
        return reject(error);
      }

      this.ws.onopen = () => {
        console.log(
          "[Network] (B) WebSocket 接続成功 (onopen)。サーバーからの 'join_success' を待機中..."
        );
      };

      this.ws.onmessage = (event) => {
        this.tempStats.pps_total++;
        this.tempStats.bps_total += (event.data.byteLength || event.data.length);
        if (event.data instanceof ArrayBuffer) {
            // バイナリデータの場合
            this.handleBinaryMessage(event.data);
            return;
        }
        try {
          const message = JSON.parse(event.data);
          if (message.type === "account_response") {
            if (this.onAccountResponse) {
              this.onAccountResponse(message);
            }
            return;
          }
          if (message.type === "join_success") {
            resolve(message);
            return;
          }
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message.payload);
          } else {
            console.warn("[Network] 未知のメッセージタイプ:", message.type);
          }
        } catch (e) {
          console.warn(
            "[Network] (E) 不正なメッセージ形式:",
            e.message,
            event.data
          );
        }
      };
      this.ws.onclose = (event) => {
        console.log(
          `[Network] (F) 接続切断 (Code: ${event.code}, Reason: ${event.reason})`
        );
        if (this.isIntentionalClose) {
          console.log(
            "[Network] 意図的な切断のため、ゲームオーバー画面への遷移をスキップします。"
          );
          return;
        }
        this.game.stopGameLoop();
        const reason = event.reason || `Code ${event.code}`;
        let friendlyMessage = "サーバーから切断されました。";
        if (event.code === 4001) {
          friendlyMessage =
            "別の端末またはタブでログインされたため、接続が切断されました。";
        } else if (event.code === 1000 && event.reason === "Idle timeout") {
          friendlyMessage =
            "一定時間操作がなかったため、サーバーから切断されました。";
        }
        this.game.uiManager.showGameOverScreen(0);
        this.game.uiManager.setGameOverMessage(friendlyMessage);
      };
      this.ws.onerror = (errorEvent) => {
        console.error("[Network] (G) WebSocket エラー発生:", errorEvent);
      };
    });
  }


  handleBinaryMessage(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    let offset = 0;

    // 1. MsgType
    const msgType = view.getUint8(offset); offset += 1;

    if (msgType === 1) { // MSG_TYPE_DELTA
        const delta = {
            updated: { players: [], enemies: [], bullets: [] },
            removed: { players: [], enemies: [], bullets: [] }
        };

        // --- 1. Removed Lists (ここが重要: 弾が消えない問題の修正) ---
        // Removed Players
        const remPlayerCount = view.getUint8(offset); offset += 1;
        for(let i=0; i<remPlayerCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            delta.removed.players.push(this.readString(view, offset, idLen));
            offset += idLen;
        }
        // Removed Enemies
        const remEnemyCount = view.getUint8(offset); offset += 1;
        for(let i=0; i<remEnemyCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            delta.removed.enemies.push(this.readString(view, offset, idLen));
            offset += idLen;
        }
        // Removed Bullets
        const remBulletCount = view.getUint16(offset, true); offset += 2;
        for(let i=0; i<remBulletCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            delta.removed.bullets.push(this.readString(view, offset, idLen));
            offset += idLen;
        }


        // --- 2. Updated Lists ---
        
        // Players
        const playerCount = view.getUint8(offset); offset += 1;
        for(let i=0; i<playerCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = this.readString(view, offset, idLen); offset += idLen;
            
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const hp = view.getUint8(offset); offset += 1;
            const angle = view.getFloat32(offset, true); offset += 4;
            const isDeadVal = view.getUint8(offset); offset += 1;

            // ▼ トレード・弾情報の復元 (ここが重要: トレード/弾数問題の修正) ▼
            const betAmount = view.getUint16(offset, true); offset += 2;
            
            let chargePos = null;
            const hasCharge = view.getUint8(offset); offset += 1;
            if (hasCharge === 1) {
                const ep = view.getFloat32(offset, true); offset += 4;
                const amt = view.getFloat32(offset, true); offset += 4;
                chargePos = { ep: ep, a: amt };
            }

            const stockCount = view.getUint8(offset); offset += 1;
            const stockedBullets = [];
            for(let j=0; j<stockCount; j++) {
                stockedBullets.push(view.getUint16(offset, true)); offset += 2;
            }
            // ▲ 追加ここまで ▲

            delta.updated.players.push({
                i: id, x: x, y: y, h: hp, a: angle, d: isDeadVal,
                // 復元したトレード情報をセット (短縮キー形式)
                ba: betAmount,
                cp: chargePos,
                sb: stockedBullets
            });
        }

        // Enemies
        const enemyCount = view.getUint8(offset); offset += 1;
        for(let i=0; i<enemyCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = this.readString(view, offset, idLen); offset += idLen;
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const hp = view.getUint8(offset); offset += 1;
            const angle = view.getFloat32(offset, true); offset += 4;

            delta.updated.enemies.push({
                i: id, x: x, y: y, h: hp, ta: angle
            });
        }

        // Bullets
        const bulletCount = view.getUint16(offset, true); offset += 2;
        for(let i=0; i<bulletCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = this.readString(view, offset, idLen); offset += idLen;
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const angle = view.getFloat32(offset, true); offset += 4;
            const typeId = view.getUint8(offset); offset += 1;
            
            // タイプ復元 (0: player, 1: enemy, 2: player_special)
            let type = 'player';
            if (typeId === 1) type = 'enemy';
            else if (typeId === 2) type = 'player_special';

            delta.updated.bullets.push({
                i: id, x: x, y: y, a: angle, t: type
            });
        }

        this.game.applyDelta(delta);
    }
  }



  // 文字列読み込みヘルパー
  readString(view, offset, length) {
    const bytes = new Uint8Array(view.buffer, offset, length);
    return new TextDecoder().decode(bytes);
  }
  disconnect() {
    this.isIntentionalClose = true; // フラグを立てる
    if (this.ws) {
      this.ws.close(1000, "Intentional Disconnect");
      this.ws = null;
    }
  }
  stopListening() {
      this.disconnect();
  }

  async sendInput(inputActions) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "input",
            payload: inputActions,
          })
        );
      } catch (error) {
        console.warn("[Network] 入力送信(WS)に失敗:", error);
      }
    }
  }

  sendPause() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "pause" }));
    }
  }

  // [修正A-4] 再開メッセージを送信
  sendResume() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "resume" }));
    }
  }

  getStats() {
    return this.stats;
  }

  getSimulationStats() {
    if (this.stats.total_seconds === 0) {
      return {
        avg_bps: 0,
        mb_per_minute: 0,
        mb_per_hour: 0,
      };
    }

    const avg_bps = this.stats.total_bytes / this.stats.total_seconds;
    const bytes_per_hour = avg_bps * 3600;

    return {
      avg_bps: avg_bps.toFixed(0),
      mb_per_minute: ((avg_bps * 60) / (1024 * 1024)).toFixed(3),
      mb_per_hour: (bytes_per_hour / (1024 * 1024)).toFixed(2),
    };
  }
  /**
   * アカウント操作リクエストを送信する
   * @param {string} subtype - "register_name", "issue_code", "recover"
   * @param {Object} data - { name: "..." } or { code: "..." }
   * @param {Function} callback - サーバーからのレスポンスを受け取る関数
   */
  sendAccountAction(subtype, data, callback) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.onAccountResponse = callback; // レスポンスが来たらこれを呼ぶ
      this.ws.send(
        JSON.stringify({
          type: "account_action",
          payload: {
            subtype: subtype,
            ...data,
          },
        })
      );
    } else {
      console.warn("WebSocketが接続されていません。");
      if (callback) callback({ success: false, message: "サーバー未接続" });
    }
  }
}
