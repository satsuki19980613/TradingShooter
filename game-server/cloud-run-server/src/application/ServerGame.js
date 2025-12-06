import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";

import { WorldState } from "../domain/WorldState.js";
import { PlayerState } from "../domain/PlayerState.js";
import { EnemyState } from "../domain/EnemyState.js";
import { BulletState } from "../domain/BulletState.js";

import { GameConstants } from "../core/constants/GameConstants.js";
import { PhysicsSystem } from "../infrastructure/systems/PhysicsSystem.js";
import { NetworkSystem } from "../infrastructure/systems/NetworkSystem.js";
import { PersistenceSystem } from "../infrastructure/systems/PersistenceSystem.js";
import { MapLoader } from "../infrastructure/factories/MapLoader.js";

import { TradeLogic } from "../logic/TradeLogic.js";
import { AILogic } from "../logic/AILogic.js";
import { GameLoop } from "./GameLoop.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// マップデータのキャッシュ
let CACHED_MAP_DATA = null;
try {
  const mapPath = path.join(__dirname, "../../maps/map_default.json");
  if (fs.existsSync(mapPath)) {
      const mapJson = fs.readFileSync(mapPath, "utf8");
      CACHED_MAP_DATA = JSON.parse(mapJson);
  } else {
      CACHED_MAP_DATA = {}; 
  }
} catch (error) {
  CACHED_MAP_DATA = {};
}

/**
 * ゲームロジックの統合と状態管理を行うメインクラス
 */
export class ServerGame {
  constructor(roomId, firestore, onRoomEmptyCallback) {
    this.roomId = roomId;
    this.onRoomEmptyCallback = onRoomEmptyCallback;
    
    // State (Domain)
    this.worldState = new WorldState();
    
    // Systems (Infrastructure)
    this.physicsSystem = new PhysicsSystem(GameConstants.WORLD_WIDTH, GameConstants.WORLD_HEIGHT);
    this.networkSystem = new NetworkSystem();
    this.persistenceSystem = new PersistenceSystem(firestore);
    this.loopManager = new GameLoop();

    // Trading State (Local to Game Logic)
    this.tradeState = {
        chartData: [],
        maData: { short: [], medium: [], long: [] },
        currentPrice: 800,
        minPrice: 1000,
        maxPrice: 1000,
        MA_PERIODS: { short: 20, medium: 50, long: 100 }
    };

    // Warmup State
    this.isWarmingUp = false;
    this.pendingConnections = [];

    this.initTrading();
  }

  // --- Initialization ---

  initTrading() {
    this.tradeState.chartData = [];
    this.tradeState.currentPrice = 800;
    for (let i = 0; i < 300; i++) {
        this.tradeState.currentPrice = TradeLogic.calculateNextPrice(this.tradeState.currentPrice);
        this.tradeState.chartData.push(this.tradeState.currentPrice);
        this.updateMA();
    }
    this.updateMinMax();
  }

  async warmup() {
    this.isWarmingUp = true;
    MapLoader.loadMapData(this.worldState, CACHED_MAP_DATA || {});
    
    // 初期エネミースポーン
    for (let i = 0; i < 3; i++) this.spawnEnemy();

    // 安定化待機
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    this.isWarmingUp = false;
    this.worldState.isReady = true;
    this.processPendingConnections();
  }

  processPendingConnections() {
      this.pendingConnections.forEach(({ userId, playerName, ws, isDebug }) => {
          if (ws.readyState === WebSocket.OPEN) {
              this.addPlayer(userId, playerName, ws, isDebug);
          }
      });
      this.pendingConnections = [];
  }

  startLoop() {
    if (this.worldState.isRunning) return;
    this.worldState.isRunning = true;

    this.loopManager.start("update", this.update.bind(this), GameConstants.GAME_LOOP_INTERVAL);
    this.loopManager.start("broadcast", this.broadcastGameState.bind(this), GameConstants.BROADCAST_INTERVAL);
    this.loopManager.start("chart", this.updateChart.bind(this), GameConstants.CHART_UPDATE_INTERVAL);
    this.loopManager.start("leaderboard", this.broadcastLeaderboard.bind(this), 2000);
  }

  stopLoop() {
    this.worldState.isRunning = false;
    this.loopManager.stopAll();
    if (this.onRoomEmptyCallback) this.onRoomEmptyCallback(this.roomId);
  }

  // --- Core Loops ---

  update() {
    const dt = 1.0; // Fixed timestep logic
    
    // 1. Idle Check
    const now = Date.now();
    this.worldState.players.forEach(p => {
        if (!p.isDead && !p.isPaused && (now - p.lastInputTime > GameConstants.IDLE_TIMEOUT_TIME)) {
            if (p.ws) p.ws.close(1000, "Idle timeout");
        }
    });

    // 2. AI Update
    this.worldState.enemies.forEach(enemy => {
        const { player, distance } = AILogic.findClosestPlayer(enemy.x, enemy.y, this.worldState.players.values());
        enemy.moveTimer--;
        if (enemy.moveTimer <= 0) {
            enemy.targetAngle = AILogic.decideTargetAngle(enemy.x, enemy.y, player, enemy.targetAngle, distance);
            enemy.moveTimer = 60;
        }
        const velocity = AILogic.shouldShoot(distance) ? 0 : enemy.speed; // AI Logic for speed
        enemy.vx = Math.cos(enemy.targetAngle) * enemy.speed; // Simplified: AI Logic should return velocity
        enemy.vy = Math.sin(enemy.targetAngle) * enemy.speed;

        enemy.shootCooldown--;
        if (player && enemy.shootCooldown <= 0 && AILogic.shouldShoot(distance)) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            const bullet = new BulletState(enemy.x, enemy.y, 6, angle, 5, "enemy", 10, enemy.id);
            this.worldState.bullets.push(bullet);
            enemy.shootCooldown = 120;
        }
    });

    // 3. Physics Update
    this.physicsSystem.update(this.worldState, dt);

    // 4. Maintain Items (Example)
    const epItems = this.worldState.bullets.filter(b => b.type === "item_ep");
    if (epItems.length < 5) {
        // Spawn logic omitted for brevity, similar to enemy spawn
    }
  }

  broadcastGameState() {
    this.networkSystem.broadcastGameState(this.worldState.players, this.worldState);
    this.worldState.frameEvents = []; // Clear events
  }

  updateChart() {
    this.tradeState.currentPrice = TradeLogic.calculateNextPrice(this.tradeState.currentPrice);
    this.tradeState.chartData.push(this.tradeState.currentPrice);
    if (this.tradeState.chartData.length > 300) this.tradeState.chartData.shift();
    
    const newMa = this.updateMA();
    this.updateMinMax();

    const chartDelta = {
        currentPrice: this.tradeState.currentPrice,
        minPrice: this.tradeState.minPrice,
        maxPrice: this.tradeState.maxPrice,
        newChartPoint: this.tradeState.currentPrice,
        newMaPoint: newMa
    };
    
    const msg = JSON.stringify({ type: "chart_update", payload: chartDelta });
    this.worldState.players.forEach(p => {
        if(p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    });
  }

  updateMA() {
      const ma = {};
      ["short", "medium", "long"].forEach(type => {
          const val = TradeLogic.calculateMA(this.tradeState.chartData, this.tradeState.MA_PERIODS[type]);
          this.tradeState.maData[type].push(val);
          if (this.tradeState.maData[type].length > 300) this.tradeState.maData[type].shift();
          ma[type] = val;
      });
      return ma;
  }

  updateMinMax() {
      if (this.tradeState.chartData.length === 0) return;
      this.tradeState.minPrice = Math.min(...this.tradeState.chartData);
      this.tradeState.maxPrice = Math.max(...this.tradeState.chartData);
  }

  broadcastLeaderboard() {
      const leaderboard = Array.from(this.worldState.players.values())
        .filter(p => !p.isDead && p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, score: p.score }));
      
      const msg = JSON.stringify({ type: "leaderboard_update", payload: { leaderboardData: leaderboard } });
      this.worldState.players.forEach(p => {
          if(p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
      });
  }

  // --- Player Management ---

  addPlayer(userId, playerName, ws, isDebug) {
    if (!this.worldState.isReady) {
        this.pendingConnections.push({ userId, playerName, ws, isDebug });
        return null;
    }
    if (!this.worldState.isRunning) this.startLoop();

    // 既存プレイヤー切断
    const existing = this.worldState.players.get(userId);
    if (existing && existing.ws) existing.ws.close(4001);

    // スポーン位置決定 (簡易)
    const x = Math.random() * (this.worldState.width - 100) + 50;
    const y = Math.random() * (this.worldState.height - 100) + 50;

    const player = new PlayerState(userId, playerName, x, y, ws, isDebug);
    this.worldState.players.set(userId, player);

    // 初期データ送信
    this.networkSystem.sendSnapshot(player, this.worldState);
    
    const staticState = {
        obstacles: this.worldState.obstacles, // ObstacleState has getState structure compatibility
        playerSpawns: this.worldState.playerSpawns,
        enemySpawns: this.worldState.enemySpawns
    };
    ws.send(JSON.stringify({ type: "static_state", payload: staticState }));
    
    ws.send(JSON.stringify({ 
        type: "chart_state", 
        payload: { 
            chartData: this.tradeState.chartData, 
            maData: this.tradeState.maData,
            currentPrice: this.tradeState.currentPrice,
            minPrice: this.tradeState.minPrice,
            maxPrice: this.tradeState.maxPrice
        } 
    }));

    return { id: player.id, x: player.x, y: player.y };
  }

  removePlayer(userId) {
      const player = this.worldState.players.get(userId);
      if (player) {
          this.persistenceSystem.saveScore(player.id, player.name, player.score);
          this.worldState.players.delete(userId);
      }
      if (this.worldState.players.size === 0) this.stopLoop();
  }

  spawnEnemy() {
      const x = Math.random() * (this.worldState.width - 100) + 50;
      const y = Math.random() * (this.worldState.height - 100) + 50;
      const enemy = new EnemyState(x, y, this.worldState.width, this.worldState.height);
      enemy.id = `e_${this.worldState.enemyIdCounter++}`;
      this.worldState.enemies.push(enemy);
  }

  // --- Input Handling ---

  handlePlayerInput(userId, input) {
      const player = this.worldState.players.get(userId);
      if (!player) return;
      
      player.lastInputTime = Date.now();
      player.inputs = input.states || {};
      
      if (input.wasPressed) {
          // Shoot
          if (input.wasPressed.shoot) {
              if (player.shootCooldown <= 0 && player.stockedBullets.length > 0) {
                  const bulletData = player.stockedBullets.pop();
                  const damage = typeof bulletData === 'object' ? bulletData.damage : bulletData;
                  const type = typeof bulletData === 'object' ? bulletData.type : "player_special_1";
                  
                  // Target aiming
                  let aimAngle = player.angle;
                  // (省略) 簡易的なエイムロジック、あるいはクライアントの向いている方向を使用
                  if (input.mouseWorldPos) {
                      aimAngle = Math.atan2(input.mouseWorldPos.y - player.y, input.mouseWorldPos.x - player.x);
                  }
                  
                  const b = new BulletState(player.x, player.y, 6, aimAngle, 9, type, damage, player.id);
                  this.worldState.bullets.push(b);
                  player.shootCooldown = 15;
              }
          }
          
          // Trade Actions
          if (input.wasPressed.trade_long) this.handleTradeEntry(player, "long");
          if (input.wasPressed.trade_short) this.handleTradeEntry(player, "short");
          if (input.wasPressed.trade_settle) this.handleTradeSettle(player);
          
          // Bet Actions
          const betActions = ["bet_up", "bet_down", "bet_all", "bet_min"];
          betActions.forEach(action => {
              if (input.wasPressed[action]) {
                  player.chargeBetAmount = TradeLogic.adjustBetAmount(player.chargeBetAmount, player.ep, action, 10);
              }
          });
      }
  }

  handleTradeEntry(player, type) {
      if (player.isDead || player.chargePosition) return;
      if (player.ep >= player.chargeBetAmount) {
          player.chargePosition = {
              entryPrice: this.tradeState.currentPrice,
              amount: player.chargeBetAmount,
              type: type
          };
          player.ep -= player.chargeBetAmount;
      }
  }

  handleTradeSettle(player) {
      if (!player.chargePosition) return;
      const profit = TradeLogic.calculateProfit(
          player.chargePosition.entryPrice, 
          this.tradeState.currentPrice, 
          player.chargePosition.amount, 
          player.chargePosition.type
      );
      
      player.chargePosition = null;
      
      if (profit > 0) {
          // 利益に応じた特殊弾の補充
          let type = "player_special_1";
          if (profit >= 100) type = "player_special_4";
          else if (profit >= 50) type = "player_special_3";
          else if (profit >= 25) type = "player_special_2";
          
          if (player.stockedBullets.length < player.maxStock) {
              player.stockedBullets.push({ damage: profit, type: type });
          }
      } else {
          // 損失ダメージ
          player.hp -= Math.abs(profit);
          if (player.hp <= 0) {
              player.isDead = true;
              // Death Logic handling...
          }
      }
      player.chargeBetAmount = Math.min(player.ep, 10);
  }
}