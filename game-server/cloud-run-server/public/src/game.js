import { Player } from "./entities/Player.js";
import { ParticleSystem } from "./systems/ParticleSystem.js";
import { Enemy } from "./entities/Enemy.js";
import { Bullet } from "./entities/Bullet.js";
import { PixiManager } from "./systems/PixiManager.js";
import { Obstacle } from "./entities/Obstacle.js";
import { Trading } from "./systems/Trading.js";
import { InputManager } from "./systems/InputManager.js";
import { ClientConfig } from "./ClientConfig.js";
import { RenderSystem } from "./systems/RenderSystem.js";
import { GridSkin } from "./skins/environment/GridSkin.js";
import { skinManager } from "./systems/SkinManager.js";

const INPUT_SEND_INTERVAL = ClientConfig.INPUT_SEND_INTERVAL;
const GRID_SIZE = ClientConfig.GRID_SIZE || 150;
const TARGET_VISIBLE_CELLS = ClientConfig.VIEWPORT_GRID_WIDTH || 10;

export class Game {
  constructor(canvasId) {
    this.gameCanvas = document.getElementById(canvasId);

    this.pixiManager = new PixiManager(canvasId);

    this.pixiManager.init().then(() => {
      this.setupBackground(3000, 3000);
    });

    this.uiCanvas = document.getElementById("ui-field");
    this.uiCtx = this.uiCanvas.getContext("2d");
    this.uiManager = null;
    this.firebaseManager = null;
    this.networkManager = null;
    this.trading = new Trading();

    this.renderSystem = new RenderSystem(this.pixiManager.getLayer("game"));
    this.particleSystem = new ParticleSystem(
      this.pixiManager.getLayer("effect")
    );
    this.inputManager = new InputManager();
    this.isGameOver = false;

    if (this.gameCanvas) this.gameCanvas.focus();

    // nengi管理になるため、serverStateなどの独自管理変数は一部不要になりますが、
    // 描画システムが参照するMapは維持します。
    this.playerEntities = new Map();
    this.enemyEntities = new Map();
    this.bulletEntities = new Map();
    this.obstacleEntities = new Map();
    this.obstacleStateArray = [];

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
    this.serverPerformanceStats = {};

    this.chartCanvas = document.getElementById("chart-canvas");
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext("2d") : null;
    this.radarCanvas = document.getElementById("radar-canvas");
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext("2d") : null;
    this.magazineCanvas = document.getElementById("magazine-canvas");
    this.magazineCtx = this.magazineCanvas
      ? this.magazineCanvas.getContext("2d")
      : null;

    this.BASE_WIDTH = 900;
    this.BASE_HEIGHT = 450;
    this.gameScale = 1.0;
    this.lastFrameTime = 0;
    this.gridSprite = null;
  }

  setupBackground(worldW, worldH) {
    const bgLayer = this.pixiManager.getLayer("background");
    if (!bgLayer) return;

    bgLayer.removeChildren();

    const cellSize = GRID_SIZE;
    const drawFn = GridSkin.drawTile("rgba(0, 100, 100, 0.2)", 2);
    const gridTexture = skinManager.getTexture(
      "bg_grid",
      cellSize,
      cellSize,
      drawFn
    );

    this.gridSprite = new PIXI.TilingSprite(gridTexture, worldW, worldH);
    this.gridSprite.position.set(0, 0);
    bgLayer.addChild(this.gridSprite);

    const border = new PIXI.Graphics();
    border.rect(0, 0, worldW, worldH);
    border.stroke({ width: 4, color: 0x00ffff, alpha: 0.5 });
    bgLayer.addChild(border);
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
  sendPause() {
    if (this.networkManager) this.networkManager.sendPause();
  }
  sendResume() {
    if (this.networkManager) this.networkManager.sendResume();
  }
  setServerPerformanceStats(stats) {
    this.serverPerformanceStats = stats;
  }

  startGameLoop(worldConfig) {
    this.isGameOver = false;
    if (worldConfig) {
      this.WORLD_WIDTH = worldConfig.width;
      this.WORLD_HEIGHT = worldConfig.height;
      this.setupBackground(this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }
    this.inputManager.resetActionStates();
    requestAnimationFrame(() => {
      this.resizeCanvas();
    });
    this.uiManager.setWorldSize(this.WORLD_WIDTH, this.WORLD_HEIGHT);

    if (this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    this.lastFrameTime = performance.now();
    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    if (this.inputLoopInterval) clearInterval(this.inputLoopInterval);
    this.inputLoopInterval = setInterval(
      this.sendInputLoop.bind(this),
      INPUT_SEND_INTERVAL
    );
  }

  stopGameLoop() {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
    clearInterval(this.inputLoopInterval);
  }

  resizeCanvas() {
    if (!this.uiManager) return;
    let uiScale = 1;
    try {
      const val = getComputedStyle(document.body).getPropertyValue("--ui-scale");
      if (val) uiScale = parseFloat(val);
    } catch (e) {}
    if (!uiScale || isNaN(uiScale)) uiScale = 1;

    const container = document.getElementById("cockpit-container");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const targetWorldWidth = GRID_SIZE * TARGET_VISIBLE_CELLS;
    this.gameScale = width / targetWorldWidth;

    const fieldContainer = document.getElementById("game-field-container");
    if (fieldContainer) {
      fieldContainer.style.width = `${width}px`;
      fieldContainer.style.height = `${height}px`;
      this.pixiManager.resize(width, height);
      if (this.uiCanvas) {
        this.uiCanvas.width = width;
        this.uiCanvas.height = height;
      }
    }

    const resizeSubCanvas = (canvas, ctx) => {
      if (canvas && canvas.parentElement) {
        const w = canvas.parentElement.clientWidth;
        const h = canvas.parentElement.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        if (w > 0 && h > 0) {
          canvas.width = Math.floor(w * dpr * uiScale);
          canvas.height = Math.floor(h * dpr * uiScale);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
          if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    };
    resizeSubCanvas(this.chartCanvas, this.chartCtx);
    resizeSubCanvas(this.radarCanvas, this.radarCtx);
    resizeSubCanvas(this.magazineCanvas, this.magazineCtx);
  }

  async setupEventListeners() {
    this.inputManager.init();
    window.addEventListener("resize", this.resizeCanvas.bind(this));
    this.gameCanvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.inputManager.setShootPressed();
    });
    this.gameCanvas.addEventListener("mousemove", (e) => {
      const rect = this.gameCanvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener("blur", () => {
      this.inputManager.resetAllKeys();
      if (this.networkManager) this.networkManager.sendPause();
    });
  }

  sendInputLoop() {
    if (!this.networkManager) return;
    const inputState = this.inputManager.getCurrentInputState();
    inputState.mouseWorldPos = this.mouseWorldPos;
    this.networkManager.sendInput(inputState);
  }

  renderLoop() {
    const now = performance.now();
    // nengiの補間計算には正確なデルタが必要です
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const deltaFrames = dt * 60; // 従来のアニメーション用

    // ▼ nengiのネットワーク更新＆補間処理を実行
    if (this.networkManager) {
      this.networkManager.update(dt, now);
    }

    if (this.particleSystem) this.particleSystem.update(deltaFrames);

    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    if (this.gameCanvas.width === 0) this.resizeCanvas();

    // ▼ 各エンティティの位置をnengiから同期
    this.playerEntities.forEach((p) => p.updateFromNengi());
    this.enemyEntities.forEach((e) => e.updateFromNengi());
    this.bulletEntities.forEach((b) => b.updateFromNengi());

    // 従来のアニメーション更新も実行 (エフェクトなど)
    this.playerEntities.forEach((p) => p.update(this, deltaFrames));
    this.enemyEntities.forEach((e) => e.update(deltaFrames));
    this.bulletEntities.forEach((b) => b.update(this, deltaFrames));

    this.updateCamera();

    this.renderSystem.render(
      this.playerEntities,
      this.enemyEntities,
      this.bulletEntities,
      this.obstacleEntities
    );

    this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    if (this.uiManager) {
      const myPlayerState = this.playerEntities.get(this.userId);
      this.uiManager.syncHUD(myPlayerState, this.trading.tradeState);

      if (this.chartCtx && this.chartCanvas.width > 0) {
        this.chartCtx.clearRect(
          0,
          0,
          this.chartCanvas.width,
          this.chartCanvas.height
        );
        this.trading.drawChart(
          this.chartCtx,
          this.chartCanvas.width,
          this.chartCanvas.height,
          myPlayerState
        );
      }

      if (this.magazineCtx && this.magazineCanvas.width > 0) {
        this.magazineCtx.clearRect(
          0,
          0,
          this.magazineCanvas.width,
          this.magazineCanvas.height
        );
        this.uiManager.drawChargeUI(
          this.magazineCtx,
          myPlayerState,
          this.magazineCanvas.width,
          this.magazineCanvas.height
        );
      }

      if (this.radarCtx && this.radarCanvas.width > 0) {
        this.radarCtx.clearRect(
          0,
          0,
          this.radarCanvas.width,
          this.radarCanvas.height
        );
        const enemiesState = Array.from(this.enemyEntities.values());
        const otherPlayersState = [];
        for (const [id, player] of this.playerEntities.entries()) {
          if (id !== this.userId && !player.isDead)
            otherPlayersState.push(player);
        }
        this.uiManager.drawRadar(
          this.radarCtx,
          this.radarCanvas.width,
          this.radarCanvas.height,
          this.WORLD_WIDTH,
          this.WORLD_HEIGHT,
          myPlayerState,
          enemiesState,
          this.obstacleStateArray,
          otherPlayersState
        );
      }

      if (this.uiManager.isDebugMode && this.networkManager) {
        const stats = this.networkManager.getStats();
        const simStats = this.networkManager.getSimulationStats();
        this.uiManager.syncDebugHUD(
          stats,
          simStats,
          this.serverPerformanceStats
        );
      }
    }
  }

  updateCamera() {
    if (!this.uiManager) return;
    const myPlayer = this.playerEntities.get(this.userId);
    const screenCenterX = this.gameCanvas.width / 2;
    const screenCenterY = this.gameCanvas.height / 2;
    let playerX = 0;
    let playerY = 0;

    if (myPlayer) {
      playerX = myPlayer.x;
      playerY = myPlayer.y;
      this.cameraX = playerX - screenCenterX / this.gameScale;
      this.cameraY = playerY - screenCenterY / this.gameScale;
    }

    this.mouseWorldPos.x =
      (this.mousePos.x - screenCenterX) / this.gameScale + playerX;
    this.mouseWorldPos.y =
      (this.mousePos.y - screenCenterY) / this.gameScale + playerY;

    this.pixiManager.updateCameraCentered(playerX, playerY, this.gameScale);
  }

  // NetworkManagerの 'create' イベントから呼ばれる
  onEntityCreated(nengiEntity) {
    const protocol = nengiEntity.protocol.name;

    if (protocol === "Player") {
      const player = new Player(nengiEntity.x, nengiEntity.y);
      player.id = nengiEntity.id;
      player.nengiEntity = nengiEntity;

      if (player.id === this.userId) player.isMe = true;
      this.playerEntities.set(player.id, player);
    } else if (protocol === "Enemy") {
      const enemy = new Enemy(nengiEntity.x, nengiEntity.y);
      enemy.id = nengiEntity.id;
      enemy.nengiEntity = nengiEntity;
      this.enemyEntities.set(enemy.id, enemy);
    } else if (protocol === "Bullet") {
      // 弾のタイプID解決はnengiEntity.typeIdから行うなどの処理が必要
      // ここでは仮に angle=0, type="player" で初期化
      const bullet = new Bullet(
        nengiEntity.x,
        nengiEntity.y,
        nengiEntity.rotation,
        "player" // TODO: typeIdから解決
      );
      bullet.id = nengiEntity.id;
      bullet.nengiEntity = nengiEntity;
      this.bulletEntities.set(bullet.id, bullet);
    }
  }

  // NetworkManagerの 'delete' イベントから呼ばれる
  onEntityDeleted(id) {
    if (this.playerEntities.has(id)) this.playerEntities.delete(id);
    if (this.enemyEntities.has(id)) this.enemyEntities.delete(id);
    if (this.bulletEntities.has(id)) this.bulletEntities.delete(id);
  }

  // NetworkManagerの 'GameEvent' メッセージ受信時に呼ばれる
  onGameEvent(message) {
    if (message.type === 1) { // hit
      this.particleSystem.createHitEffect(message.x, message.y, message.color, 8, "hit");
    } else if (message.type === 2) { // explosion
      this.particleSystem.createHitEffect(message.x, message.y, message.color, 30, "explosion");
    }
  }

  // nengiへの移行に伴い、applySnapshot, applyDelta は不要になったため削除しました。

  setStaticState(staticData) {
    if (!staticData) return;
    this.obstacleEntities.clear();
    if (staticData.obstacles) {
      console.log(`静的障害物を受信: ${staticData.obstacles.length}件`);
      staticData.obstacles.forEach((obsState) => {
        const obsId = obsState.id || `${obsState.x},${obsState.y}`;
        const obs = new Obstacle(
          obsState.x,
          obsState.y,
          obsState.width,
          obsState.height
        );
        // Obstacleは動かないためnengi管理外（static_stateで受信）のままでもOK
        obs.setState(obsState);
        obs.id = obsId;
        obs.type = "obstacle_wall";
        this.obstacleEntities.set(obsId, obs);
      });
      this.obstacleStateArray = Array.from(this.obstacleEntities.values());
    }
  }
  setTradeState(chartDelta) {
    if (chartDelta) this.trading.addNewChartPoint(chartDelta);
  }
  setFullChartState(full) {
    if (full) this.trading.setFullChartData(full);
  }
  async gameOver(score) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopGameLoop();
    this.uiManager.showGameOverScreen(score);
    this.uiManager.setGameOverMessage("お疲れ様でした。");
  }
  findNearestTarget(player, gridRadius = 5) {
    let nearest = null;
    let minD = Infinity;
    this.enemyEntities.forEach((e) => {
      if (e.hp > 0) {
        const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
        if (d < minD) {
          minD = d;
          nearest = e;
        }
      }
    });
    return nearest;
  }
}