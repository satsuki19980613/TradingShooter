/**
 * ゲーム開始前の準備（ロード待ち）を担当するクラス
 * 物理演算の空回しは行わず、初期化が完了して安定するまで接続を待機させる役割
 */
export class GameWarmupManager {
  constructor(game) {
    this.game = game;
    this.isWarmingUp = false;
    this.pendingConnections = []; // 準備中に接続してきたプレイヤーを一時保存
  }

  /**
   * ウォームアップ（準備待機）を開始する
   */
  async start() {
    console.log(`[Warmup] Room ${this.game.roomId}: ルーム初期化を開始します...`);
    this.isWarmingUp = true;

    // 1. ワールドの初期化 (マップ読み込み、敵・障害物の配置)
    // ここでメモリ上にオブジェクトが展開されます
    this.game.initWorld();

    // 2. 安全マージンの確保 (重要)
    // 物理演算はしませんが、非同期で少しだけ待機時間を設けます。
    // これにより、initWorld直後のCPU負荷が落ち着くのを待ち、
    // その間に来た接続リクエストを確実に pendingConnections に溜めます。
    await new Promise((resolve) => setTimeout(resolve, 200)); 

    console.log(`[Warmup] 初期化完了。プレイヤーの入室を許可します。`);

    // 3. 準備完了状態へ移行
    this.isWarmingUp = false;
    this.game.isReady = true;

    // 4. 待機していたプレイヤーを順次参加させる
    // これにより「部屋ができた瞬間に入ってきてラグる」を防ぎ、
    // 「部屋が完全にできてから入室処理が走る」形になります。
    this.processPendingConnections();
  }

  // simulateFrame は不要になったので削除、または空にしておきます
  simulateFrame() {}

  addPendingPlayer(userId, playerName, ws, isDebug) {
    console.log(`[Warmup] 準備中のためプレイヤー ${playerName} (ID: ${userId}) を待機させます。`);
    this.pendingConnections.push({ userId, playerName, ws, isDebug });
  }

  processPendingConnections() {
    if (this.pendingConnections.length === 0) return;
    
    console.log(`[Warmup] 待機中の ${this.pendingConnections.length} 名を参加処理します。`);
    
    this.pendingConnections.forEach(({ userId, playerName, ws, isDebug }) => {
      if (ws.readyState === ws.OPEN) {
        // プレイヤーを追加
        const playerState = this.game.addPlayer(userId, playerName, ws, isDebug);
        
        // 遅延参加したプレイヤーに開始合図を送る
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

    // ゲームループが回っていなければ開始
    if (!this.game.isRunning && this.game.players.size > 0) {
      this.game.startLoop();
    }
  }
}