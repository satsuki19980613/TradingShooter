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

    // 1. ワールドの初期化
    this.game.initWorld();

    // 2. 物理演算の空回し (Pre-warm)
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
    this.game.enemies.forEach((enemy) => {
      enemy.update(this.game);
    });

    this.game.grid.clear();
    this.game.obstacles.forEach((obs) => this.game.grid.insert(obs));
    this.game.enemies.forEach((e) => this.game.grid.insert(e)); 
    
    this.game.physicsSystem.update(this.game);
  }

  addPendingPlayer(userId, playerName, ws, isDebug) {
    console.log(`[Warmup] 準備中のためプレイヤー ${playerName} (ID: ${userId}) を待機させます。`);
    this.pendingConnections.push({ userId, playerName, ws, isDebug });
  }

  /**
   * ★重要修正: ここで join_success を送信する
   */
  processPendingConnections() {
    if (this.pendingConnections.length === 0) return;

    console.log(`[Warmup] 待機中の ${this.pendingConnections.length} 名を参加処理します。`);
    
    this.pendingConnections.forEach(({ userId, playerName, ws, isDebug }) => {
      // 切断されていないか確認
      if (ws.readyState === ws.OPEN) {
        // プレイヤーを追加
        const playerState = this.game.addPlayer(userId, playerName, ws, isDebug);
        
        // ★修正: 遅延参加したプレイヤーに開始合図を送る
        if (playerState) {
            const joinData = {
                type: "join_success",
                roomId: this.game.roomId,
                playerState: playerState,
                worldConfig: {
                    width: this.game.WORLD_WIDTH,
                    height: this.game.WORLD_HEIGHT,
                },
            };
            try {
                ws.send(JSON.stringify(joinData));
            } catch(e) {
                console.error("[Warmup] Failed to send join_success:", e);
            }
        }
      }
    });

    this.pendingConnections = [];

    // ループが回っていなければ開始
    if (!this.game.isRunning && this.game.players.size > 0) {
      this.game.startLoop();
    }
  }
}