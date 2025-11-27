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
  initWorld() {
    const mapFileName = "map_default.json";
    const mapPath = path.join(__dirname, "..", "maps", mapFileName);
    let mapData;

    try {
      const mapJson = fs.readFileSync(mapPath, "utf8");
      mapData = JSON.parse(mapJson);
    } catch (error) {
      console.warn(
        `[ServerGame] マップファイル ${mapFileName} が見つからないか不正です。デフォルトマップで起動します。`
      );

      mapData = {
        worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
        obstacles: [],
        playerSpawns: [{ x: 500, y: 500 }],
        enemySpawns: [{ x: 1500, y: 1500 }],
      };
    }

    this.WORLD_WIDTH =
      (mapData.worldSize && mapData.worldSize.width) || WORLD_WIDTH;
    this.WORLD_HEIGHT =
      (mapData.worldSize && mapData.worldSize.height) || WORLD_HEIGHT;

    this.obstacles = mapData.obstacles
      .map((obsData) => {
        if (obsData.type === "obstacle_wall" || obsData.type === "WALL") {
          const obs = new ServerObstacle(
            obsData.x,
            obsData.y,
            obsData.width,
            obsData.height,
            "obstacle_wall",
            obsData.borderRadius || 0,
            obsData.individualRadii || {},
            obsData.rotation || 0,
            obsData.className
          );

          if (obsData.colliders) {
            obs.setColliders(obsData.colliders);
          }

          return obs;
        }
        return null;
      })
      .filter((obs) => obs !== null);

    if (mapData.playerSpawns && mapData.playerSpawns.length > 0) {
      this.playerSpawns = mapData.playerSpawns;
    } else {
      console.warn(
        `[ServerGame] マップに playerSpawns がないため、デフォルト値を使用します。`
      );
      this.playerSpawns = [{ x: 500, y: 500 }];
    }

    if (mapData.enemySpawns && mapData.enemySpawns.length > 0) {
      this.enemySpawns = mapData.enemySpawns;
    } else {
      console.warn(
        `[ServerGame] マップに enemySpawns がないため、デフォルト値を使用します。`
      );
      this.enemySpawns = [{ x: 1500, y: 1500 }];
    }
    this.obstacles.forEach((obs) => {
      this.grid.insertStatic(obs);
    });
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
      player.isDirty = true; // クライアントへ変更を通知するため
      console.log(`[ServerGame] プレイヤー名を更新: ID=${userId} -> ${newName}`);
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
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update();
      if (
        bullet.x < 0 ||
        bullet.x > this.WORLD_WIDTH ||
        bullet.y < 0 ||
        bullet.y > this.WORLD_HEIGHT
      ) {
        this.removeBullet(bullet, i);
      }
    }
    this.grid.clear();
    this.players.forEach((p) => this.grid.insert(p));
    this.enemies.forEach((e) => this.grid.insert(e));
    this.bullets.forEach((b) => this.grid.insert(b));
    this.maintainEpItems();
    this.physicsSystem.applyZoneEffects(this);
    this.physicsSystem.handleObstacleCollisions(this);
    this.physicsSystem.checkCollisions(this);

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
          player.shoot(player.mouseWorldPos.x, player.mouseWorldPos.y, this);
        }

        if (action === "trade") {
          this.handleTrade(player);
        }
        if (action.startsWith("bet_")) {
          this.trading.handleBetInput(player, action);
        }
      }
    }
  }

  handleTrade(player) {
    if (player.isDead) return;
    if (!player.chargePosition) {
      const cost = this.trading.startCharge(player);
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
      .filter((p) => !p.isDead)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    this.networkSystem.broadcastLeaderboard(
      this.players,
      leaderboard,
      serverStatsPayload
    );
  }

  /**
   * アカウント関連のメッセージを処理する
   * @param {WebSocket} ws - 送信元のソケット
   * @param {Object} actionPayload - { type: "register_name", name: "..." } など
   * @param {string} userId - 現在の一時的なユーザーID (認証済みの場合)
   */
  async handleAccountAction(ws, actionPayload, userId) {
    const type = actionPayload.subtype;

    if (type === "register_name") {
      const requestedName = actionPayload.name;
      const result = await this.accountManager.registerName(
        userId,
        requestedName
      );

      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "register_name",
          success: result.success,
          message: result.message,
          name: result.name,
        })
      );

      if (result.success) {
        const player = this.players.get(userId);
        if (player) {
          player.name = result.name;
          player.isDirty = true;
        }
      }
    } else if (type === "issue_code") {
      const code = await this.accountManager.issueTransferCode(userId);

      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "issue_code",
          success: true,
          code: code,
        })
      );
    } else if (type === "recover") {
      const inputCode = actionPayload.code;
      const result = await this.accountManager.recoverAccount(inputCode);

      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "recover",
          success: result.success,
          message: result.message,
          token: result.token,
          name: result.name,
        })
      );
    }
  }
}
