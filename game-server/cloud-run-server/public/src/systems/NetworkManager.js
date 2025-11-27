import { PacketReader } from "../utils/PacketReader.js";
const INPUT_BIT_MAP = {
  move_up: 1 << 0,
  move_down: 1 << 1,
  move_left: 1 << 2,
  move_right: 1 << 3,
  shoot: 1 << 4,
  trade: 1 << 5,
  bet_up: 1 << 6,
  bet_down: 1 << 7,
  bet_all: 1 << 8,
  bet_min: 1 << 9,
};
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
        this.ws.binaryType = "arraybuffer";
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
        this.tempStats.bps_total += event.data.byteLength || event.data.length;
        if (event.data instanceof ArrayBuffer) {
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
    const reader = new PacketReader(arrayBuffer);

    // 1. メッセージタイプ
    const msgType = reader.u8();

    if (msgType === 1) { // MSG_TYPE_DELTA
      const delta = {
        updated: { players: [], enemies: [], bullets: [] },
        removed: { players: [], enemies: [], bullets: [] },
      };

      // 2. 削除されたプレイヤー
      const remPlayerCount = reader.u8();
      for (let i = 0; i < remPlayerCount; i++) {
        delta.removed.players.push(reader.string());
      }

      // 3. 削除された敵
      const remEnemyCount = reader.u8();
      for (let i = 0; i < remEnemyCount; i++) {
        delta.removed.enemies.push(reader.string());
      }

      // 4. 削除された弾
      const remBulletCount = reader.u16();
      for (let i = 0; i < remBulletCount; i++) {
        delta.removed.bullets.push(reader.string());
      }

      // 5. プレイヤー更新
      const playerCount = reader.u8();
      for (let i = 0; i < playerCount; i++) {
        const p = {};
        p.i = reader.string();
        p.x = reader.f32();
        p.y = reader.f32();
        p.h = reader.u8();
        p.a = reader.f32();
        p.d = reader.u8();
        p.e = reader.u16();
        p.ba = reader.u16();

        const hasCharge = reader.u8();
        if (hasCharge === 1) {
          p.cp = {
            ep: reader.f32(),
            a: reader.f32(),
          };
        } else {
          p.cp = null;
        }

        const stockCount = reader.u8();
        p.sb = [];
        for (let j = 0; j < stockCount; j++) {
          p.sb.push(reader.u16());
        }

        delta.updated.players.push(p);
      }

      // 6. 敵更新
      const enemyCount = reader.u8();
      for (let i = 0; i < enemyCount; i++) {
        const e = {};
        e.i = reader.string();
        e.x = reader.f32();
        e.y = reader.f32();
        e.h = reader.u8();
        e.ta = reader.f32();
        delta.updated.enemies.push(e);
      }

      // 7. 弾更新
      const bulletCount = reader.u16();
      for (let i = 0; i < bulletCount; i++) {
        const b = {};
        b.i = reader.string();
        b.x = reader.f32();
        b.y = reader.f32();
        b.a = reader.f32();
        
        const typeId = reader.u8();
        let type = "player";
        if (typeId === 1) type = "enemy";
        else if (typeId === 2) type = "player_special";
        else if (typeId === 3) type = "item_ep";
        b.t = type;

        delta.updated.bullets.push(b);
      }

      this.game.applyDelta(delta);
    }
  }

  readString(view, offset, length) {
    const bytes = new Uint8Array(view.buffer, offset, length);
    return new TextDecoder().decode(bytes);
  }
  disconnect() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close(1000, "Intentional Disconnect");
      this.ws = null;
    }
  }
  stopListening() {
    this.disconnect();
  }

  /**
   * 入力データをバイナリ変換して送信
   * @param {Object} inputActions - InputManagerから取得した入力状態
   */
  sendInput(inputActions) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let mask = 0;

    if (inputActions.states) {
      if (inputActions.states.move_up) mask |= 1;
      if (inputActions.states.move_down) mask |= 2;
      if (inputActions.states.move_left) mask |= 4;
      if (inputActions.states.move_right) mask |= 8;
    }

    if (inputActions.wasPressed) {
      if (inputActions.wasPressed.shoot) mask |= 16;
      if (inputActions.wasPressed.trade) mask |= 32;

      if (inputActions.wasPressed.bet_up) mask |= 64;
      if (inputActions.wasPressed.bet_down) mask |= 128;
      if (inputActions.wasPressed.bet_all) mask |= 256;
      if (inputActions.wasPressed.bet_min) mask |= 512;
    }

    const buffer = new ArrayBuffer(11);
    const view = new DataView(buffer);
    view.setUint8(0, 2);
    view.setUint16(1, mask, true);
    const mx = inputActions.mouseWorldPos ? inputActions.mouseWorldPos.x : 0;
    view.setFloat32(3, mx, true);
    const my = inputActions.mouseWorldPos ? inputActions.mouseWorldPos.y : 0;
    view.setFloat32(7, my, true);
    this.ws.send(buffer);
    this.stats.total_bytes += 11;
  }

  sendPause() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "pause" }));
    }
  }

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
      this.onAccountResponse = callback;
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
