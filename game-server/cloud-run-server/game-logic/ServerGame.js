import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";
import { ServerTrading } from "./ServerTrading.js";
import { SpatialGrid } from "./SpatialGrid.js";
import { WebSocket } from "ws";
import { ServerConfig, GameConstants } from "./ServerConfig.js";
import { ServerNetworkSystem } from "./ServerNetworkSystem.js"; // これはもう不要に近いですがPhysics等の参照があれば残す
import { ServerPhysicsSystem } from "./ServerPhysicsSystem.js";
import { ServerPersistenceManager } from "./ServerPersistenceManager.js";
import { ServerMapLoader } from "./ServerMapLoader.js";
import { GameWarmupManager } from "./GameWarmupManager.js";
import nengi from "nengi";
import nengiConfig from "../common/nengiConfig.js";

const IDLE_WARNING_TIME = 180000;
const IDLE_TIMEOUT_TIME = 300000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_LOOP_INTERVAL = ServerConfig.GAME_LOOP_INTERVAL;
const CHART_UPDATE_INTERVAL = ServerConfig.CHART_UPDATE_INTERVAL;
const BROADCAST_INTERVAL = ServerConfig.BROADCAST_INTERVAL;
const WORLD_WIDTH = GameConstants.WORLD_WIDTH;
const WORLD_HEIGHT = GameConstants.WORLD_HEIGHT;
const GRID_CELL_SIZE = GameConstants.GRID_CELL_SIZE;
let CACHED_MAP_DATA = null;
try {
  const mapFileName = "map_default.json";
  const mapPath = path.join(__dirname, "..", "maps", mapFileName);
  const mapJson = fs.readFileSync(mapPath, "utf8");
  CACHED_MAP_DATA = JSON.parse(mapJson);
  console.log(`[Server] マップデータをキャッシュしました: ${mapFileName}`);
} catch (error) {
  console.warn(`[Server] マップ読み込み失敗 (キャッシュなし):`, error.message);
  CACHED_MAP_DATA = {
    worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    obstacles: [],
    placements: [],
    definitions: {},
    playerSpawns: [{ x: 500, y: 500 }],
    enemySpawns: [{ x: 1500, y: 1500 }],
  };
}

// 簡易的なイベントクラス (nengiのプロトコルに合わせる)
class GameEventMessage {
    constructor(type, x, y, color) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.color = color;
    }
}
GameEventMessage.protocol = { name: 'GameEvent' };

class JsonMessage {
    constructor(protocolName, jsonString) {
        this.protocol = { name: protocolName };
        this.json = jsonString;
    }
}

class IdleWarningMessage {
    constructor() { this.protocol = { name: 'IdleWarning' }; }
}

export class ServerGame {
  constructor(roomId, firestore, onRoomEmptyCallback) {
    this.roomId = roomId;
    this.firestore = firestore;
    this.persistenceManager = new ServerPersistenceManager(firestore);
    this.onRoomEmptyCallback = onRoomEmptyCallback;
    this.players = new Map();
    this.enemies = [];
    this.bullets = [];
    this.frameEvents = []; // nengiのmessageキューとして使うか、都度送るか
    this.obstacles = [];
    this.playerSpawns = [];
    this.enemySpawns = [];
    this.nextSpawnIndex = 0;
    this.trading = new ServerTrading();
    this.WORLD_WIDTH = WORLD_WIDTH;
    this.WORLD_HEIGHT = WORLD_HEIGHT;
    this.grid = new SpatialGrid(
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT,
      GRID_CELL_SIZE
    );
    // this.networkSystem = new ServerNetworkSystem(this); // nengi移行に伴い不要化
    this.physicsSystem = new ServerPhysicsSystem(
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT
    );
    this.gameLoopInterval = null;
    this.chartLoopInterval = null;
    this.broadcastLoopInterval = null;
    this.enemyIdCounter = 0;
    this.bulletIdCounter = 0;
    this.isRunning = false;
    this.tickTimes = [];
    this.avgTickTime = 0;
    this.debugPlayerCount = 0;
    this.isReady = false;
    this.warmupManager = new GameWarmupManager(this);
    
    this.nengiInstance = new nengi.Instance(nengiConfig, {
      port: -1, 
      transferCallback: "none",
    });
  }

  initWorld() {
    ServerMapLoader.loadMapData(this, CACHED_MAP_DATA);
    this.nextSpawnIndex = 0;
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy();
    }
    this.trading.init();
  }

  startLoop() {
    if (this.isRunning) return;
    console.log(`[ServerGame ${this.roomId}] ループを開始します...`);
    this.isRunning = true;

    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.chartLoopInterval) clearInterval(this.chartLoopInterval);
    if (this.broadcastLoopInterval) clearInterval(this.broadcastLoopInterval);

    this.gameLoopInterval = setInterval(this.update.bind(this), GAME_LOOP_INTERVAL);
    this.chartLoopInterval = setInterval(this.updateChart.bind(this), CHART_UPDATE_INTERVAL);
    this.broadcastLoopInterval = setInterval(this.broadcastGameState.bind(this), BROADCAST_INTERVAL);
    this.leaderboardLoopInterval = setInterval(this.broadcastLeaderboard.bind(this), 2000);
  }

  // ■ 変更: フレーム内のイベント（ヒット、爆発）をnengiのメッセージとしてブロードキャスト
  broadcastGameState() {
    if (this.frameEvents.length > 0) {
        // 全クライアントに対してイベントメッセージを送信
        // ※ 本来は「見える範囲のクライアント」に絞るべきだが、簡略化のため全員に送る
        this.frameEvents.forEach(ev => {
            let typeId = 1; // hit
            if (ev.type === "explosion") typeId = 2;
            
            const msg = new GameEventMessage(typeId, ev.x, ev.y, ev.color || "#ffffff");
            this.nengiInstance.messageAll(msg);
        });
        this.frameEvents = [];
    }
  }

  updatePlayerName(userId, newName) {
    const player = this.players.get(userId);
    if (player) {
      player.name = newName;
      player.isDirty = true; // nengiが変更を検知するトリガー
    }
  }

  stopLoops() {
    if (!this.isRunning) return;
    console.log(`[ServerGame ${this.roomId}] 停止します。`);
    this.isRunning = false;
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.chartLoopInterval) clearInterval(this.chartLoopInterval);
    if (this.broadcastLoopInterval) clearInterval(this.broadcastLoopInterval);
    if (this.leaderboardLoopInterval) clearInterval(this.leaderboardLoopInterval);
    this.gameLoopInterval = null;
    this.chartLoopInterval = null;
    this.broadcastLoopInterval = null;
    if (this.onRoomEmptyCallback) {
      this.onRoomEmptyCallback(this.roomId);
    }
  }

  checkIdlePlayers() {
    const now = Date.now();
    this.players.forEach((player) => {
      if (player.isDead || player.isPaused) {
        player.lastInputTime = now;
        return;
      }
      const idleTime = now - player.lastInputTime;
      if (idleTime > IDLE_TIMEOUT_TIME) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.close(1000, "Idle timeout");
        }
      } else if (idleTime > IDLE_WARNING_TIME && !player.isIdleWarned) {
        // ■ 変更: Idle警告をnengiメッセージで送信
        const client = player.client; // addPlayerで紐づけたnengiのclient
        if (client) {
            this.nengiInstance.message(new IdleWarningMessage(), client);
        }
        player.isIdleWarned = true;
      }
    });
  }

  update() {
    let startTime;
    if (this.debugPlayerCount > 0) startTime = process.hrtime.bigint();
    
    this.checkIdlePlayers();

    // 1. nengiのコマンド処理
    this.nengiInstance.emitCommands();

    // 2. サーバー側ロジック更新
    this.players.forEach((player) => player.update(this));
    this.enemies.forEach((enemy) => enemy.update(this));

    // 3. 空間分割と物理演算
    this.grid.clear();
    this.obstacles.forEach((obs) => this.grid.insert(obs));
    this.players.forEach((p) => this.grid.insert(p));
    this.enemies.forEach((e) => this.grid.insert(e));
    this.bullets.forEach((b) => this.grid.insert(b));
    this.maintainEpItems();
    this.physicsSystem.update(this);

    // 4. nengiの状態更新 (スナップショット生成)
    this.nengiInstance.update();

    if (this.debugPlayerCount > 0) {
      const endTime = process.hrtime.bigint();
      this.tickTimes.push(Number(endTime - startTime));
    }
  }

  maintainEpItems() {
    const epItems = this.bullets.filter((b) => b.type === "item_ep");
    if (epItems.length < 5) {
      const spawnCount = 10 - epItems.length;
      for (let i = 0; i < spawnCount; i++) {
        if (Math.random() < 0.1) {
          const pos = this.findRandomValidPosition(15);
          const item = new ServerBullet(pos.x, pos.y, 15, 0, 0, "item_ep", 0, null);
          this.addBullet(item);
        }
      }
    }
  }

  // ■ 変更: チャート更新をnengiメッセージで送信
  updateChart() {
    const chartDeltaState = this.trading.updateChartData();
    const jsonStr = JSON.stringify(chartDeltaState);
    const msg = new JsonMessage('ChartUpdate', jsonStr);
    this.nengiInstance.messageAll(msg);
  }

  isValidSpawnPosition(x, y, radius) {
    const tempObj = { x: x, y: y, radius: radius };
    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollisionWithCircle(tempObj)) return false;
    }
    return true;
  }

  findRandomValidPosition(radius) {
    const maxAttempts = 30;
    const margin = 50;
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * (this.WORLD_WIDTH - margin * 2) + margin;
      const y = Math.random() * (this.WORLD_HEIGHT - margin * 2) + margin;
      if (this.isValidSpawnPosition(x, y, radius)) return { x, y };
    }
    return { x: this.WORLD_WIDTH / 2, y: this.WORLD_HEIGHT / 2 };
  }

  addPlayer(userId, playerName, ws, isDebug = false) {
    if (!this.isReady) {
      this.warmupManager.addPendingPlayer(userId, playerName, ws, isDebug);
      return null;
    }
    if (!this.isRunning) this.startLoop();

    // 重複ログインチェック
    const existingPlayer = this.players.get(userId);
    if (existingPlayer) {
      if (existingPlayer.ws && existingPlayer.ws.readyState === WebSocket.OPEN) {
        existingPlayer.ws.close(4001, "Duplicate Login");
      }
      this.removePlayer(userId); // 一旦削除して作り直すのが安全
    }

    const pos = this.findRandomValidPosition(45);
    const newPlayer = new ServerPlayer(userId, playerName, pos.x, pos.y, ws, isDebug);
    this.players.set(userId, newPlayer);
    
    // nengi登録
    this.nengiInstance.addEntity(newPlayer);
    
    if (ws) {
      // WebSocketとnengiを接続
      const clientConnection = new nengi.ClientConnection(ws, this.nengiInstance);
      clientConnection.entity = newPlayer; // エンティティと紐づけ
      this.nengiInstance.addConnection(clientConnection);
      
      // 参照保持（メッセージ送信などで使うため）
      newPlayer.client = clientConnection;

      // ■ 変更: 初期データを nengi メッセージとして送信
      // nengiは接続直後のメッセージをバッファリングしてハンドシェイク後に送ってくれます
      
      // 1. 静的データ (障害物など)
      const staticState = {
        obstacles: this.obstacles.map((o) => o.getState()),
        playerSpawns: this.playerSpawns,
        enemySpawns: this.enemySpawns,
      };
      this.nengiInstance.message(new JsonMessage('StaticState', JSON.stringify(staticState)), clientConnection);

      // 2. チャート初期データ
      const fullChartState = this.trading.getState();
      this.nengiInstance.message(new JsonMessage('ChartState', JSON.stringify(fullChartState)), clientConnection);
    }

    console.log(`[ServerGame] 参加: ${playerName} (${this.players.size}人)`);
    return newPlayer.getState(); // この戻り値はあまり使われません
  }

  removePlayer(userId) {
    const player = this.players.get(userId);
    if (!player) return;
    
    this.nengiInstance.removeEntity(player);
    
    if (player.ws && player.ws.readyState !== WebSocket.CLOSED) {
      player.ws.close(1000, "Player removed");
    }
    this.players.delete(userId);
    
    if (this.players.size === 0 && this.isRunning) {
      this.stopLoops();
    }
  }

  // handlePlayerInput は nengi.emitCommands() に代替されたため不要ですが、
  // ServerPlayer.processMove が呼ばれる形になります。

  handlePlayerDeath(player, attackerPlayer) {
    if (attackerPlayer && attackerPlayer.id !== player.id && !attackerPlayer.isDead) {
      attackerPlayer.ep += player.ep;
      attackerPlayer.hp = Math.min(100, attackerPlayer.hp + 20);
      attackerPlayer.isDirty = true; // ステータス変更を通知
    }
    this.persistenceManager.saveScore(player.id, player.name, player.score);
    player.ep = 0;
    player.isDirty = true; // 死亡フラグ等の変更を通知

    player.deathCleanupTimer = setTimeout(() => {
      if (this.players.has(player.id)) {
        const p = this.players.get(player.id);
        if (p.isDead) this.removePlayer(player.id);
      }
    }, 0);
  }

  spawnEnemy() {
    const pos = this.findRandomValidPosition(45);
    const newEnemy = new ServerEnemy(pos.x, pos.y, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    newEnemy.id = `e_${this.enemyIdCounter++}`;
    this.enemies.push(newEnemy);
    this.nengiInstance.addEntity(newEnemy);
  }

  addBullet(bullet) {
    bullet.id = `b_${this.bulletIdCounter++}`;
    this.bullets.push(bullet);
    this.nengiInstance.addEntity(bullet);
  }

  removeBullet(bullet, index) {
    this.bullets.splice(index, 1);
    this.nengiInstance.removeEntity(bullet);
  }

  removeEnemy(enemyToRemove) {
    const index = this.enemies.indexOf(enemyToRemove);
    if (index > -1) {
      this.enemies.splice(index, 1);
      this.nengiInstance.removeEntity(enemyToRemove);
      this.spawnEnemy();
    }
  }

  // ■ 変更: ランキングをnengiメッセージで送信
  broadcastLeaderboard() {
    const leaderboard = Array.from(this.players.values())
      .filter((p) => !p.isDead && p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    let serverStatsPayload = null;
    if (this.debugPlayerCount > 0) {
       // ... (デバッグ統計計算はそのまま)
       serverStatsPayload = { /*...*/ };
    }

    const payload = { leaderboardData: leaderboard, serverStats: serverStatsPayload };
    const msg = new JsonMessage('LeaderboardUpdate', JSON.stringify(payload));
    this.nengiInstance.messageAll(msg);
  }
}