/**
 * 【ServerGame の役割: 指揮者・状態保持】
 * ゲーム全体のライフサイクル管理と、各サブシステム（Physics, Network）の統合を行います。
 * * ■ 担当する責務 (Do):
 * - ゲームループ (setInterval) の開始と停止
 * - プレイヤー・敵・弾の生成管理 (Spawn/Despawn)
 * - ゲームルールの判定（スコア加算、死亡判定のトリガー）
 * - PhysicsSystem, NetworkSystem の update メソッド呼び出し
 * * ■ 担当しない責務 (Don't):
 * - 具体的な移動計算 (→ ServerPhysicsSystem へ)
 * - 衝突判定の計算ロジック (→ ServerPhysicsSystem へ)
 * - 通信パケットのバイナリ変換や送信処理 (→ ServerNetworkSystem へ)
 * - データベースへの直接アクセス (→ ServerPersistenceManager へ)
 * - アカウント登録や認証処理 (→ index.js / ServerAccountManager へ)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FieldValue } from "firebase-admin/firestore";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";
import { ServerTrading } from "./ServerTrading.js";
import { ServerObstacle } from "./ServerObstacle.js";
import { getDistance } from "./ServerUtils.js";
import { SpatialGrid } from "./SpatialGrid.js";
import { WebSocket } from "ws";
import { ServerConfig, GameConstants } from "./ServerConfig.js";
import { ServerAccountManager } from "./ServerAccountManager.js";
import { ServerNetworkSystem } from "./ServerNetworkSystem.js";
import { ServerPhysicsSystem } from "./ServerPhysicsSystem.js";
import { ServerPersistenceManager } from "./ServerPersistenceManager.js";
import { ServerMapLoader } from "./ServerMapLoader.js";

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

export class ServerGame {
  constructor(roomId, firestore, onRoomEmptyCallback) {
    this.roomId = roomId;
    this.firestore = firestore;
    this.persistenceManager = new ServerPersistenceManager(firestore);
    this.onRoomEmptyCallback = onRoomEmptyCallback;
    this.players = new Map();
    this.enemies = [];
    this.bullets = [];
    this.frameEvents = [];
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
    this.networkSystem = new ServerNetworkSystem(this);
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
    this.initWorld();
  }

  /**
   * ワールドの初期化 (障害物と敵の配置)
   */
  /**
   * ワールドの初期化 (障害物と敵の配置)
   */
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

    this.gameLoopInterval = setInterval(
      this.update.bind(this),
      GAME_LOOP_INTERVAL
    );

    this.chartLoopInterval = setInterval(
      this.updateChart.bind(this),
      CHART_UPDATE_INTERVAL
    );

    this.broadcastLoopInterval = setInterval(
      this.broadcastGameState.bind(this),
      BROADCAST_INTERVAL
    );
    this.leaderboardLoopInterval = setInterval(
      this.broadcastLeaderboard.bind(this),
      2000
    );
  }

  broadcastGameState() {
    this.networkSystem.broadcastGameState(this.players, this.frameEvents);

    this.frameEvents = [];
  }
  updatePlayerName(userId, newName) {
    const player = this.players.get(userId);
    if (player) {
      player.name = newName;
      player.isDirty = true;
      console.log(
        `[ServerGame] プレイヤー名を更新: ID=${userId} -> ${newName}`
      );
    }
  }

  stopLoops() {
    if (!this.isRunning) return;

    console.log(
      `[ServerGame ${this.roomId}] プレイヤーが0人になったため、ループを停止します。`
    );
    this.isRunning = false;

    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.chartLoopInterval) clearInterval(this.chartLoopInterval);
    if (this.broadcastLoopInterval) clearInterval(this.broadcastLoopInterval);
    if (this.leaderboardLoopInterval)
      clearInterval(this.leaderboardLoopInterval);
    this.gameLoopInterval = null;
    this.chartLoopInterval = null;
    this.broadcastLoopInterval = null;

    if (this.onRoomEmptyCallback) {
      this.onRoomEmptyCallback(this.roomId);
    }
  }

  pausePlayer(userId) {
    const player = this.players.get(userId);
    if (player) {
      console.log(
        `[ServerGame ${this.roomId}] プレイヤー ${player.name} を一時停止します。`
      );
      player.isPaused = true;
    }
  }

  resumePlayer(userId) {
    const player = this.players.get(userId);
    if (!player || player.ws.readyState !== WebSocket.OPEN) return;

    console.log(
      `[ServerGame ${this.roomId}] プレイヤー ${player.name} を再開します。`
    );
    player.isPaused = false;

    this.networkSystem.sendSnapshot(player);
  }

  checkIdlePlayers() {
    const now = Date.now();
    this.players.forEach((player) => {
      if (player.isDead) {
        player.lastInputTime = now;
        return;
      }
      if (player.isPaused) {
        return;
      }

      const idleTime = now - player.lastInputTime;

      if (idleTime > IDLE_TIMEOUT_TIME) {
        console.log(
          `[ServerGame ${this.roomId}] プレイヤー ${player.name} をアイドルタイムアウトにより切断します。`
        );

        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.close(1000, "Idle timeout");
        }
      } else if (idleTime > IDLE_WARNING_TIME && !player.isIdleWarned) {
        console.log(
          `[ServerGame ${this.roomId}] プレイヤー ${player.name} にアイドル警告を送信します。`
        );

        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "idle_warning" }));
          player.isIdleWarned = true;
        }
      }
    });
  }

  update() {
    let startTime;
    if (this.debugPlayerCount > 0) {
      startTime = process.hrtime.bigint();
    }
    this.checkIdlePlayers();

    this.players.forEach((player) => {
      player.update(this);
    });
    this.enemies.forEach((enemy) => {
      enemy.update(this);
    });

    this.grid.clear();
    this.obstacles.forEach((obs) => this.grid.insert(obs));
    this.players.forEach((p) => this.grid.insert(p));
    this.enemies.forEach((e) => this.grid.insert(e));
    this.bullets.forEach((b) => this.grid.insert(b));
    this.maintainEpItems();
    this.physicsSystem.update(this);

    if (this.debugPlayerCount > 0) {
      const endTime = process.hrtime.bigint();
      this.tickTimes.push(Number(endTime - startTime));
    }
  }
  maintainEpItems() {
    const epItems = this.bullets.filter((b) => b.type === "item_ep");

    const targetCount = 10;
    const minCount = 5;

    if (epItems.length < minCount) {
      const spawnCount = targetCount - epItems.length;
      for (let i = 0; i < spawnCount; i++) {
        if (Math.random() < 0.1) {
          const pos = this.findRandomValidPosition(15);

          const item = new ServerBullet(
            pos.x,
            pos.y,
            15,
            0,
            0,
            "item_ep",
            0,
            null
          );
          this.addBullet(item);
        }
      }
    }
  }

  updateChart() {
    const chartDeltaState = this.trading.updateChartData();
    this.networkSystem.broadcastChartUpdate(this.players, chartDeltaState);
  }

  /**
   * ▼▼▼ 追加: 指定座標が障害物と衝突しないか確認するメソッド ▼▼▼
   */
  isValidSpawnPosition(x, y, radius) {
    const tempObj = { x: x, y: y, radius: radius };

    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollisionWithCircle(tempObj)) {
        return false;
      }
    }
    return true;
  }
  findRandomValidPosition(radius) {
    const maxAttempts = 30;
    const margin = 50;

    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * (this.WORLD_WIDTH - margin * 2) + margin;
      const y = Math.random() * (this.WORLD_HEIGHT - margin * 2) + margin;

      if (this.isValidSpawnPosition(x, y, radius)) {
        return { x, y };
      }
    }

    console.warn(
      "[ServerGame] 安全なスポーン位置が見つかりませんでした。中央に出現させます。"
    );
    return { x: this.WORLD_WIDTH / 2, y: this.WORLD_HEIGHT / 2 };
  }
  addPlayer(userId, playerName, ws, isDebug = false) {
    if (!this.isRunning) {
      console.log(
        `[ServerGame ${this.roomId}] 最初のプレイヤーが入室。ループを起動します。`
      );
      this.startLoop();
    }
    if (isDebug) {
      this.debugPlayerCount++;
      console.log(
        `[ServerGame ${this.roomId}] デバッグプレイヤー ${playerName} が参加。`
      );
    }

    const existingPlayer = this.players.get(userId);
    if (existingPlayer) {
      console.log(
        `[ServerGame] ${playerName} (ID: ${userId}) が再接続しました。`
      );
      if (existingPlayer.deathCleanupTimer) {
        clearTimeout(existingPlayer.deathCleanupTimer);
        existingPlayer.deathCleanupTimer = null;
      }
      if (
        existingPlayer.ws &&
        existingPlayer.ws.readyState === WebSocket.OPEN
      ) {
        existingPlayer.ws.close(4001, "Duplicate Login");
      }
    }

    const playerRadius = 45;
    const pos = this.findRandomValidPosition(playerRadius);
    const x = pos.x;
    const y = pos.y;

    const newPlayer = new ServerPlayer(userId, playerName, x, y, ws, isDebug);
    this.players.set(userId, newPlayer);

    console.log(
      `[ServerGame ${this.roomId}] プレイヤー参加: ${playerName} (現在 ${this.players.size} 人)`
    );

    const staticState = {
      obstacles: this.obstacles.map((o) => o.getState()),
      playerSpawns: this.playerSpawns,
      enemySpawns: this.enemySpawns,
    };
    const staticStateString = JSON.stringify({
      type: "static_state",
      payload: staticState,
    });

    const fullChartState = this.trading.getState();
    const fullChartStateString = JSON.stringify({
      type: "chart_state",
      payload: fullChartState,
    });

    try {
      ws.send(staticStateString);
      ws.send(fullChartStateString);
      this.networkSystem.sendSnapshot(newPlayer);
    } catch (err) {
      console.warn(`[Send Error] ${err.message}`);
    }

    return newPlayer.getState();
  }
  removePlayer(userId) {
    const player = this.players.get(userId);
    if (!player) return;

    if (player.isDebugPlayer) {
      this.debugPlayerCount--;
      console.log(
        `[ServerGame ${this.roomId}] デバッグプレイヤー ${player.name} が退出。 (残り ${this.debugPlayerCount} 人)`
      );
    }
    const name = player.name;

    if (player.ws && player.ws.readyState !== WebSocket.CLOSED) {
      player.ws.close(1000, "Player removed from game");
    }

    this.players.delete(userId);

    console.log(
      `[ServerGame ${this.roomId}] プレイヤー退出: ${name} (現在 ${this.players.size} 人)`
    );
    if (this.players.size === 0 && this.isRunning) {
      this.stopLoops();
    }
  }

  handlePlayerInput(userId, inputActions) {
    const player = this.players.get(userId);
    if (!player || !inputActions) return;

    player.lastInputTime = Date.now();

    if (player.isIdleWarned) {
      player.isIdleWarned = false;
    }

    player.setInput(inputActions);

    if (inputActions.wasPressed) {
      for (const action in inputActions.wasPressed) {
        if (!inputActions.wasPressed[action]) continue;

        if (action === "shoot") {
          player.shoot(this);
        }

        if (action === "trade_long") {
          if (!player.chargePosition) {
            this.handleEntry(player, "long");
          }
        }

        if (action === "trade_short") {
          if (!player.chargePosition) {
            this.handleEntry(player, "short");
          }
        }

        if (action === "trade_settle") {
          if (player.chargePosition) {
            this.handleSettle(player);
          }
        }

        if (action.startsWith("bet_")) {
          this.trading.handleBetInput(player, action);
        }
      }
    }
  }
  handleEntry(player, type) {
    if (player.isDead) return;
    const cost = this.trading.startCharge(player, type);
    if (cost > 0) {
      player.ep -= cost;
      player.isDirty = true;
    }
  }

  handleSettle(player) {
    if (player.isDead) return;

    const result = this.trading.releaseCharge(player);

    if (result) {
      if (result.type === "profit") {
        const profit = result.profitAmount;
        let bulletType = "player_special_1";

        if (profit >= 100) {
          bulletType = "player_special_4";
        } else if (profit >= 50) {
          bulletType = "player_special_3";
        } else if (profit >= 25) {
          bulletType = "player_special_2";
        }

        player.specialAttack(profit, bulletType);
      } else {
        player.takeDamage(result.lossAmount, this, null);
      }
      this.trading.resetBetAmount(player);
      player.isDirty = true;
    }
  }
  handleTrade(player, type = "long") {
    if (player.isDead) return;

    if (!player.chargePosition) {
      const cost = this.trading.startCharge(player, type);
      if (cost > 0) {
        player.ep -= cost;
        player.isDirty = true;
      }
    } else {
      const result = this.trading.releaseCharge(player);
      if (result) {
        if (result.type === "profit") {
          player.specialAttack(result.profitAmount);
        } else {
          player.takeDamage(result.lossAmount, this, null);
        }
        this.trading.resetBetAmount(player);
        player.isDirty = true;
      }
    }
  }

  handlePlayerDeath(player, attackerPlayer) {
    console.log(`プレイヤーが死亡: ${player.name} (スコア: ${player.score})`);
    if (
      attackerPlayer &&
      attackerPlayer.id !== player.id &&
      !attackerPlayer.isDead
    ) {
      const stolenEP = player.ep;
      console.log(
        `${attackerPlayer.name} が ${player.name} のEP ${stolenEP} を強奪`
      );
      attackerPlayer.ep += stolenEP;
      attackerPlayer.hp = Math.min(100, attackerPlayer.hp + 20);
      attackerPlayer.isDirty = true;
    }
    this.persistenceManager.saveScore(player.id, player.name, player.score);
    player.ep = 0;
    player.isDirty = true;

    player.deathCleanupTimer = setTimeout(() => {
      if (this.players.has(player.id)) {
        const currentPlayer = this.players.get(player.id);
        if (currentPlayer.isDead) {
          this.removePlayer(player.id);
          console.log(
            `プレイヤー ${player.name} をルームからクリーンアップしました。`
          );
        }
      }
    }, 0);
  }

  spawnEnemy() {
    const enemyRadius = 45;
    const pos = this.findRandomValidPosition(enemyRadius);

    const newEnemy = new ServerEnemy(
      pos.x,
      pos.y,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT
    );
    newEnemy.id = `e_${this.enemyIdCounter++}`;
    this.enemies.push(newEnemy);
  }

  addBullet(bullet) {
    bullet.id = `b_${this.bulletIdCounter++}`;
    this.bullets.push(bullet);
  }

  removeBullet(bullet, index) {
    this.bullets.splice(index, 1);
  }

  removeEnemy(enemyToRemove) {
    const index = this.enemies.indexOf(enemyToRemove);
    if (index > -1) {
      this.enemies.splice(index, 1);
      this.spawnEnemy();
    }
  }

  broadcastLeaderboard() {
    let serverStatsPayload = null;

    if (this.debugPlayerCount > 0) {
      if (this.tickTimes.length > 0) {
        const sum = this.tickTimes.reduce((a, b) => a + b, 0);
        this.avgTickTime = sum / this.tickTimes.length / 1000000;
        this.tickTimes = [];
      }
      serverStatsPayload = {
        avgTickTime: this.avgTickTime,
        targetTickTime: GAME_LOOP_INTERVAL,
        playerCount: this.players.size,
        enemyCount: this.enemies.length,
        bulletCount: this.bullets.length,
      };
    }
    const leaderboard = Array.from(this.players.values())
      .filter((p) => !p.isDead && p.score > 0) // ★ p.score > 0 を追加
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    this.networkSystem.broadcastLeaderboard(
      this.players,
      leaderboard,
      serverStatsPayload
    );
  }
}
