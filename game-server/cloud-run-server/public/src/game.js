import { Player } from "./entities/Player.js";
import { Enemy } from "./entities/Enemy.js";
import { Bullet } from "./entities/Bullet.js";
import { Particle } from "./entities/Particle.js";
import { Obstacle } from "./entities/Obstacle.js";
import { UIManager } from "./systems/UIManager.js";
import { Trading } from "./systems/Trading.js";
import { InputManager } from "./systems/InputManager.js";
import { ClientConfig } from "./ClientConfig.js";
import { skinManager } from "./systems/SkinManager.js";
import { GridSkin } from "./skins/GridSkin.js";

const RENDER_LOOP_INTERVAL = ClientConfig.RENDER_LOOP_INTERVAL;
const INPUT_SEND_INTERVAL = ClientConfig.INPUT_SEND_INTERVAL;

/**
 * ゲーム全体を管理するクラス (Dumb クライアント・レンダラー)
 * エディタ機能は削除され、プレイ専用になりました。
 */
export class Game {
  constructor(canvasId) {
    this.gameCanvas = document.getElementById(canvasId);
    this.gameCtx = this.gameCanvas.getContext("2d");
    this.uiCanvas = document.getElementById("ui-field");
    this.uiCtx = this.uiCanvas.getContext("2d");
    this.uiManager = null;
    this.firebaseManager = null;
    this.networkManager = null;
    this.trading = new Trading();

    this.inputManager = new InputManager();
    this.isGameOver = false;
    if (this.gameCanvas) {
      this.gameCanvas.focus();
    }
    this.serverState = {
      players: [],
      enemies: [],
      bullets: [],
    };

    this.tradeState = {};
    this.playerEntities = new Map();
    this.enemyEntities = new Map();
    this.bulletEntities = new Map();
    this.obstacleEntities = new Map();
    this.particles = [];
    this.cameraX = 0;
    this.cameraY = 0;
    this.mousePos = { x: 0, y: 0 };
    this.mouseWorldPos = { x: 0, y: 0 };
    this.renderLoopId = null;
    this.inputLoopInterval = null;
    this.userId = null;
    this.playerName = "Guest";
    this.WORLD_WIDTH = 3000;
    this.WORLD_HEIGHT = 3000;
    this.clientTickLoopInterval = null;
    this.lastTickTime = 0;
    this.obstacleStateArray = [];
    this.serverPerformanceStats = {};
  }

  sendPause() {
    if (this.networkManager) {
      this.networkManager.sendPause();
    }
  }
  setServerPerformanceStats(stats) {
    this.serverPerformanceStats = stats;
  }
  sendResume() {
    if (this.networkManager) {
      this.networkManager.sendResume();
    }
  }

  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  setFirebaseManager(firebaseManager) {
    this.firebaseManager = firebaseManager;
  }

  setNetworkManager(networkManager) {
    this.networkManager = networkManager;
  }

  setAuthenticatedPlayer(user) {
    this.userId = user.uid;
    this.playerName = user.displayName || "Guest";
  }

  startGameLoop(worldConfig) {
    console.log("クライアントの描画/入力ループを開始...");
    this.isGameOver = false;
    if (worldConfig) {
      this.WORLD_WIDTH = worldConfig.width;
      this.WORLD_HEIGHT = worldConfig.height;
      console.log(
        `ワールドサイズ設定: ${this.WORLD_WIDTH} x ${this.WORLD_HEIGHT}`
      );
    }
    this.particles = [];
    this.inputManager.resetActionStates();
    this.resizeCanvas();
    this.uiManager.setWorldSize(this.WORLD_WIDTH, this.WORLD_HEIGHT);

    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
    }

    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    if (this.inputLoopInterval) clearInterval(this.inputLoopInterval);
    this.inputLoopInterval = setInterval(
      this.sendInputLoop.bind(this),
      INPUT_SEND_INTERVAL
    );
  }

  stopGameLoop() {
    console.log("クライアントの描画/入力ループを停止...");

    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
    clearInterval(this.inputLoopInterval);
    clearInterval(this.clientTickLoopInterval);
  }

  resizeCanvas() {
    if (!this.uiManager) return;
    const fieldRect = this.gameCanvas.parentElement.getBoundingClientRect();
    this.gameCanvas.width = fieldRect.width;
    this.gameCanvas.height = fieldRect.height;
    if (this.uiCanvas) {
      this.uiCanvas.width = fieldRect.width;
      this.uiCanvas.height = fieldRect.height;
    }
  }

  /**
   * イベントリスナーの設定
   * エディタ関連のイベント処理をすべて削除しました
   */
  async setupEventListeners() {
    this.inputManager.init();

    window.addEventListener("resize", this.resizeCanvas.bind(this));

    this.gameCanvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.inputManager.setShootPressed();
      }
    });

    this.gameCanvas.addEventListener("mousemove", (e) => {
      this.mousePos.x = e.offsetX;
      this.mousePos.y = e.offsetY;
    });

    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    window.addEventListener("blur", () => {
      this.inputManager.resetAllKeys();

      if (this.networkManager) {
        console.log("タブが非アクティブになりました。サーバーに通知します。");
        this.networkManager.sendPause();
      }
    });
  }

  sendInputLoop() {
    if (!this.networkManager) return;
    const inputState = this.inputManager.getCurrentInputState();
    this.networkManager.sendInput(inputState);
  }

  renderLoop() {
    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    this.particles = this.particles.filter((p) => {
      p.update();
      return p.alpha > 0;
    });

    this.playerEntities.forEach((p) => p.update(this.inputManager));
    this.enemyEntities.forEach((e) => e.update());
    this.bulletEntities.forEach((b) => b.update());

    this.updateCamera();

    this.inputManager.updateMouseWorldPos(
      this.mouseWorldPos.x,
      this.mouseWorldPos.y
    );

    const ctx = this.gameCtx;
    this.drawBackground(ctx);
    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    this.particles.forEach((p) => p.draw(ctx));
    this.bulletEntities.forEach((b) => b.draw(ctx));
    this.playerEntities.forEach((p) => p.draw(ctx));
    this.enemyEntities.forEach((e) => e.draw(ctx));

    ctx.restore();
    this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    this.uiManager.syncDomElements(this.cameraX, this.cameraY);
    const myPlayerState = this.playerEntities.get(this.userId);
    this.uiManager.syncHUD(myPlayerState, this.trading.tradeState);
    const w = this.gameCanvas.width;
    const h = this.gameCanvas.height;
    this.trading.drawChart(this.uiCtx, w, h, myPlayerState);
    this.uiManager.drawChargeUI(this.uiCtx, myPlayerState, w, h);
    const enemiesState = Array.from(this.enemyEntities.values());

    const otherPlayersState = [];
    for (const [id, player] of this.playerEntities.entries()) {
      if (id !== this.userId && !player.isDead) {
        otherPlayersState.push(player);
      }
    }
    this.uiManager.drawRadar(
      this.uiCtx,
      w,
      h,
      this.WORLD_WIDTH,
      this.WORLD_HEIGHT,
      myPlayerState,
      enemiesState,
      this.obstacleStateArray,
      otherPlayersState
    );

    if (this.uiManager.isDebugMode) {
      const stats = this.networkManager.getStats();
      const simStats = this.networkManager.getSimulationStats();
      this.uiManager.syncDebugHUD(stats, simStats, this.serverPerformanceStats);
    }
  }

  applySnapshot(snapshot) {
    if (!snapshot) return;

    this.playerEntities.clear();
    this.enemyEntities.clear();
    this.bulletEntities.clear();

    if (snapshot.players) {
      snapshot.players.forEach((pState) => {
        const player = new Player(pState.x, pState.y);
        if (pState.id === this.userId) {
            player.isMe = true;
        }
        player.setState(pState);
        this.playerEntities.set(pState.id, player);
      });
    }
    if (snapshot.enemies) {
      snapshot.enemies.forEach((eState) => {
        const enemy = new Enemy(eState.x, eState.y);
        enemy.setState(eState);
        this.enemyEntities.set(eState.id, enemy);
      });
    }
    if (snapshot.bullets) {
      snapshot.bullets.forEach((bState) => {
        const bullet = new Bullet(
          bState.x,
          bState.y,
          bState.angle,
          bState.type
        );
        bullet.setState(bState);
        this.bulletEntities.set(bState.id, bullet);
      });
    }
  }

  applyDelta(delta) {
    if (!delta) return;
    if (delta.events && delta.events.length > 0) {
      delta.events.forEach((ev) => {
        if (ev.type === "hit") {
          this.createHitEffect(ev.x, ev.y, ev.color, 8, "hit");
        }
      });
    }
    const myPlayer = this.playerEntities.get(this.userId);

    if (delta.updated) {
      if (delta.updated.players) {
        delta.updated.players.forEach((pState) => {
          let player = this.playerEntities.get(pState.id);
          if (!player) {
            player = new Player(pState.x, pState.y);

            if (pState.id === this.userId) {
              player.isMe = true;
            }

            this.playerEntities.set(pState.id, player);
          }

          if (!player.isDead && pState.isDead) {
            this.createHitEffect(
              player.x,
              player.y,
              "#ffffff",
              20,
              "explosion"
            );
          } else if (pState.hp < player.hp) {
            this.createHitEffect(player.x, player.y, "#00e5ff", 5, "hit");
          }

          player.setState(pState);
        });
      }

      if (delta.updated.enemies) {
        delta.updated.enemies.forEach((eState) => {
          let enemy = this.enemyEntities.get(eState.id);
          if (!enemy) {
            enemy = new Enemy(eState.x, eState.y);
            this.enemyEntities.set(eState.id, enemy);
          }

          if (eState.hp < enemy.hp) {
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            this.createHitEffect(
              enemy.x + offsetX,
              enemy.y + offsetY,
              "#ff9800",
              5,
              "hit"
            );
          }

          enemy.setState(eState);
        });
      }

      if (delta.updated.bullets) {
        delta.updated.bullets.forEach((bState) => {
          const bulletId = bState.id;
          if (!bulletId) return;
          let bullet = this.bulletEntities.get(bulletId);
          if (!bullet) {
            bullet = new Bullet(bState.x, bState.y, bState.angle, bState.type);
            this.bulletEntities.set(bulletId, bullet);
          }
          bullet.setState(bState);
        });
      }
    }

    if (delta.removed) {
      if (delta.removed.players) {
        delta.removed.players.forEach((id) => {
          this.playerEntities.delete(id);
        });
      }

      if (delta.removed.enemies) {
        delta.removed.enemies.forEach((id) => {
          const enemy = this.enemyEntities.get(id);
          if (enemy) {
            let isDeath = false;
            if (myPlayer) {
              const dx = enemy.x - myPlayer.x;
              const dy = enemy.y - myPlayer.y;
              if (dx * dx + dy * dy < 650 * 650) {
                isDeath = true;
              }
            }
            if (isDeath) {
              this.createHitEffect(
                enemy.x,
                enemy.y,
                "#f44336",
                30,
                "explosion"
              );
            }
          }
          this.enemyEntities.delete(id);
        });
      }

      if (delta.removed.bullets) {
        delta.removed.bullets.forEach((id) => {
          const bullet = this.bulletEntities.get(id);

          this.bulletEntities.delete(id);
        });
      }
    }

    if (myPlayer && myPlayer.isDead) {
      this.gameOver(myPlayer.score || 0);
    }
  }
  /**
   * ヒットエフェクト生成
   * @param {number} x - 発生X座標
   * @param {number} y - 発生Y座標
   * @param {string} color - エフェクトの色
   * @param {number} count - パーティクルの数
   * @param {string} type - 'hit' または 'explosion'
   */
  createHitEffect(x, y, color, count, type = "hit") {
    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = Math.random() * 2 + 1;
      this.particles.push(new Particle(x, y, radius, color, vx, vy, "spark"));
    }

    if (type === "explosion" || count > 8) {
      this.particles.push(new Particle(x, y, 10, color, 0, 0, "ring"));
    }
  }

  setStaticState(staticData) {
    if (!staticData) return;

    this.uiManager.clearObstacleLayer();
    this.obstacleEntities.clear();

    if (staticData.obstacles && staticData.obstacles.length > 0) {
      console.log(
        `[Game] 静的障害物 ${staticData.obstacles.length} 件を読み込み...`
      );

      staticData.obstacles.forEach((obsState) => {
        const obsId = obsState.id || `${obsState.x},${obsState.y}`;
        const obs = new Obstacle(
          obsState.x,
          obsState.y,
          obsState.width,
          obsState.height
        );

        obs.borderRadius = obsState.borderRadius || 0;
        obs.individualRadii = obsState.individualRadii || {};

        obs.type = obsState.type || "obstacle_wall";
        obs.radius = obsState.radius;

        this.uiManager.addObstacleDOM(obs);

        this.obstacleEntities.set(obsId, obs);
      });
      this.obstacleStateArray = Array.from(this.obstacleEntities.values());
    }
  }

  setTradeState(chartDelta) {
    if (!chartDelta) return;
    this.trading.addNewChartPoint(chartDelta);
  }

  setFullChartState(fullChartState) {
    if (!fullChartState) return;
    this.trading.setFullChartData(fullChartState);
  }

  updateCamera() {
    if (!this.uiManager) return;

    const myPlayer = this.playerEntities.get(this.userId);
    if (myPlayer) {
      let targetX = myPlayer.x - this.gameCanvas.width / 2;
      let targetY = myPlayer.y - this.gameCanvas.height / 2;
      this.cameraX += (targetX - this.cameraX) * 0.1;
      this.cameraY += (targetY - this.cameraY) * 0.1;
    }

    this.cameraX = Math.max(
      0,
      Math.min(this.cameraX, this.WORLD_WIDTH - this.gameCanvas.width)
    );
    this.cameraY = Math.max(
      0,
      Math.min(this.cameraY, this.WORLD_HEIGHT - this.gameCanvas.height)
    );

    this.mouseWorldPos.x = this.mousePos.x + this.cameraX;
    this.mouseWorldPos.y = this.mousePos.y + this.cameraY;
  }

  drawBackground(ctx) {
    ctx.fillStyle = "#050a15";
    ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
    const gridSize = 50;
    const tileCanvas = skinManager.getSkin(
      "grid_tile_50",
      gridSize,
      gridSize,

      GridSkin.drawTile("rgba(0, 255, 255, 0.1)", 1)
    );

    const pattern = skinManager.getPattern(ctx, "grid_tile_50", tileCanvas);
    ctx.save();
    const offsetX = -this.cameraX;
    const offsetY = -this.cameraY;
    ctx.translate(offsetX, offsetY);
    ctx.fillStyle = pattern;

    ctx.fillRect(
      -offsetX,
      -offsetY,
      this.gameCanvas.width,
      this.gameCanvas.height
    );

    ctx.restore();
  }
  createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 5;
      const vy = (Math.random() - 0.5) * 5 - 2;
      const radius = Math.random() * 3 + 1;
      this.particles.push(new Particle(x, y, radius, color, vx, vy));
    }
  }

  async gameOver(score) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopGameLoop();

    console.log("ゲームオーバー。スコア:", score);

    this.uiManager.showGameOverScreen(score);

    this.uiManager.setGameOverMessage(
      "お疲れ様でした。スコアは自動的に保存されます。"
    );
  }
}
