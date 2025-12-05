/**
 * ゲーム開始前のウォームアップ（コールドスタート対策）を担当するクラス
 */
export class GameWarmupManager {
  constructor(game) {
    this.game = game;
    this.isWarmingUp = false;
    this.pendingConnections = []; // 準備中に接続してきたプレイヤーを一時保存
    
    // ウォームアップにかけるフレーム数 (60フレーム = 約1秒分の物理演算を即座に行う)
    this.WARMUP_FRAMES = 60; 
  }

  /**
   * ウォームアップを開始する
   */
  async start() {
    console.log(`[Warmup] Room ${this.game.roomId}: ウォームアップを開始します...`);
    this.isWarmingUp = true;

    // 1. ワールドの初期化（マップ読み込み、敵・障害物の配置）
    // ※ ServerGameのコンストラクタでinitWorldしている場合は二重呼び出しに注意が必要ですが、
    //   ここで明示的に呼ぶ設計にします。
    this.game.initWorld();

    // 2. 物理演算の空回し (Pre-warm)
    // 通信処理を行わず、敵の移動や物理衝突だけを高速に進めます。
    const startTime = Date.now();
    
    for (let i = 0; i < this.WARMUP_FRAMES; i++) {
      this.simulateFrame();
    }

    const duration = Date.now() - startTime;
    console.log(`[Warmup] 完了 (${this.WARMUP_FRAMES} frames processed in ${duration}ms)`);

    // 3. 準備完了状態へ移行
    this.isWarmingUp = false;
    this.game.isReady = true;

    // 4. 待機していたプレイヤーを順次参加させる
    this.processPendingConnections();
  }

  /**
   * 1フレーム分のシミュレーション（通信なし）
   */
  simulateFrame() {
    // 敵の思考更新
    this.game.enemies.forEach((enemy) => {
      enemy.update(this.game);
    });

    // グリッドシステムの更新（衝突判定のため必須）
    this.game.grid.clear();
    this.game.obstacles.forEach((obs) => this.game.grid.insert(obs));
    // プレイヤーはまだいないので敵だけ登録
    this.game.enemies.forEach((e) => this.game.grid.insert(e)); 
    
    // 物理演算の更新（衝突解決）
    this.game.physicsSystem.update(this.game);
  }

  /**
   * 準備中に来た接続リクエストをキューに入れる
   */
  addPendingPlayer(userId, playerName, ws, isDebug) {
    console.log(`[Warmup] 準備中のためプレイヤー ${playerName} (ID: ${userId}) を待機させます。`);
    this.pendingConnections.push({ userId, playerName, ws, isDebug });
  }

  /**
   * 待機中のプレイヤーを正式に参加させる
   */
  processPendingConnections() {
    if (this.pendingConnections.length === 0) return;

    console.log(`[Warmup] 待機中の ${this.pendingConnections.length} 名を参加処理します。`);
    
    this.pendingConnections.forEach(({ userId, playerName, ws, isDebug }) => {
      // 切断されていないか確認
      if (ws.readyState === ws.OPEN) {
        this.game.addPlayer(userId, playerName, ws, isDebug);
      }
    });

    // キューを空にする
    this.pendingConnections = [];

    // ループが回っていなければ開始（念のため）
    if (!this.game.isRunning && this.game.players.size > 0) {
      this.game.startLoop();
    }
  }
}