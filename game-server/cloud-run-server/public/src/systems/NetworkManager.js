// ▼ パスの調整に合わせて変更してください
import nengi from "/nengi/index.js";
import nengiConfig from "/common/nengiConfig.js";
import { processPlayerInput } from "/common/PlayerPhysics.js";

export class NetworkManager {
  constructor() {
    this.game = null;
    this.client = new nengi.Client(nengiConfig, 100);
    this.isIntentionalClose = false;
    
    // 統計情報 (nengiから取得可能ですが、既存UI互換のため形式を維持)
    this.stats = {
      pps_total: 0,
      bps_total: 0,
      total_bytes: 0,
      total_seconds: 0,
    };
  }

  init(game) {
    this.game = game;
    console.log("Network Manager (nengi) initialized.");

    // ■ イベントハンドラの設定
    
    // 1. エンティティ生成 (Create)
    this.client.on('create', (data) => {
      const entity = data.entity;
      
      // ★ クライアントサイド予測 (Client-Side Prediction) の核心
      // 自分自身のエンティティであれば、予測ロジックを適用する
      if (entity.protocol.name === 'Player' && entity.id === this.game.userId) {
        console.log("My Player Created (Prediction Enabled):", entity.id);
        
        // サーバーと同じ物理演算関数を登録
        this.client.addCustomPrediction(entity.id, (e, command) => {
          processPlayerInput(e, command);
        });
      }

      // Game側のエンティティ生成処理を呼び出す
      this.game.onEntityCreated(entity);
    });

    // 2. エンティティ更新 (Update)
    // nengiが補間(Interpolation)済みの値をentityにセットしてくれます
    this.client.on('update', (data) => {
      // Game側のエンティティ更新処理 (必要に応じて)
      // ※ 基本的にGame側は entity オブジェクトを参照し続けるため、
      //    nengiがプロパティを書き換えるだけで描画に反映されます。
    });

    // 3. エンティティ削除 (Delete)
    this.client.on('delete', (data) => {
      this.game.onEntityDeleted(data.entity.id);
    });

    // 4. メッセージ受信 (Events)
    this.client.on('message', (message) => {
      const protocol = message.protocol.name;

      if (protocol === 'GameEvent') {
        this.game.onGameEvent(message);
      }
      else if (protocol === 'StaticState') {
        const data = JSON.parse(message.json);
        this.game.setStaticState(data);
      }
      else if (protocol === 'ChartState') {
        const data = JSON.parse(message.json);
        this.game.setFullChartState(data);
      }
      else if (protocol === 'ChartUpdate') {
        const data = JSON.parse(message.json);
        this.game.setTradeState(data);
      }
      else if (protocol === 'LeaderboardUpdate') {
        const data = JSON.parse(message.json);
        // data.leaderboardData, data.serverStats が入っている
        if (data.leaderboardData) {
            this.game.uiManager.updateLeaderboard(data.leaderboardData, this.game.userId);
        }
        if (data.serverStats) {
            this.game.setServerPerformanceStats(data.serverStats);
        }
      }
      else if (protocol === 'IdleWarning') {
        this.game.uiManager.showScreen("idle-warning");
      }
    });

    this.client.on('connected', (res) => {
      console.log('Nengi Connected:', res);
    });

    this.client.on('disconnected', () => {
      console.log('Nengi Disconnected');
      if (!this.isIntentionalClose) {
        this.game.gameOver(0); // 簡易的な切断処理
      }
    });
  }

  connect(userId, playerName, isDebugMode = false) {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;
      
      // ハンドシェイクデータとして認証情報を送る
      const handshake = { userId, playerName, isDebugMode };

      // ws:// または wss:// に変換
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${protocol}://${location.hostname}:${location.port || 8080}`;

      this.client.connect(url, handshake)
        .then((response) => {
          console.log("Connect Response:", response);
          // 既存のGame初期化フローに合わせるため、レスポンスを整形
          resolve({
            type: "join_success",
            roomId: "nengi_room",
            worldConfig: { width: 3000, height: 3000 }, // 必要ならサーバーから送る
            playerState: {} // nengiのcreateイベントで処理するため空でOK
          });
        })
        .catch((err) => {
          console.error("Connection failed", err);
          reject(err);
        });
    });
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.client.disconnect();
  }

  /**
   * 毎フレーム呼び出す更新処理
   * Game.js の renderLoop から呼ぶ
   */
  update(delta, now) {
    // ネットワークパケットを読み込み、補間計算を行い、イベントを発火させる
    this.client.readNetworkAndEmit();
  }

  /**
   * 入力送信 (Game.js / InputManager から呼ばれる)
   */
  sendInput(inputActions) {
    // nengiConfig の 'PlayerInput' に合わせたコマンドを作成
    const command = {
      // 移動
      move_up: !!inputActions.states.move_up,
      move_down: !!inputActions.states.move_down,
      move_left: !!inputActions.states.move_left,
      move_right: !!inputActions.states.move_right,
      
      // アクション
      shoot: !!inputActions.wasPressed.shoot,
      
      // マウス座標
      mouseX: inputActions.mouseWorldPos ? inputActions.mouseWorldPos.x : 0,
      mouseY: inputActions.mouseWorldPos ? inputActions.mouseWorldPos.y : 0,
      
      // トレード系 (必要に応じて追加)
      trade_long: !!inputActions.wasPressed.trade_long,
      trade_short: !!inputActions.wasPressed.trade_short,
      trade_settle: !!inputActions.wasPressed.trade_settle,
      bet_up: !!inputActions.wasPressed.bet_up,
      bet_down: !!inputActions.wasPressed.bet_down,
      bet_all: !!inputActions.wasPressed.bet_all,
      bet_min: !!inputActions.wasPressed.bet_min,

      // デルタタイム (nengiがこれを元に移動量を計算します)
      delta: 1/60 // または実際のフレームデルタ
    };

    // クライアントの送信キューに追加（次のtickで自動送信される）
    this.client.addCommand(command);
  }

  getStats() { return this.stats; }
  getSimulationStats() { return { avg_bps: 0 }; }
  stopListening() { this.disconnect(); }
}