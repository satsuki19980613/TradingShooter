import { PixiRenderer } from "../infrastructure/rendering/pixi/PixiRenderer.js";
import { InputManager } from "../infrastructure/input/InputManager.js";
import { NetworkClient } from "../infrastructure/network/NetworkClient.js";
import { StateSyncManager } from "./managers/StateSyncManager.js";
import { MobileControlManager } from "../infrastructure/input/MobileControlManager.js";
import { ChartRenderer } from "../infrastructure/rendering/canvas/ChartRenderer.js";
import { RadarRenderer } from "../infrastructure/rendering/canvas/RadarRenderer.js";
import { MagazineRenderer } from "../infrastructure/rendering/canvas/MagazineRenderer.js";
import { DomManipulator } from "../infrastructure/ui/DomManipulator.js";
import { ScreenScaler } from "../infrastructure/ui/ScreenScaler.js";
import { ClientConfig } from "../core/config/ClientConfig.js";
import { JitterRecorder } from "../domain/debug/JitterRecorder.js";
import { DebugGraphRenderer } from "../domain/debug/DebugGraphRenderer.js";

export class ClientGame {
  constructor(uiManipulator) {
    this.renderer = new PixiRenderer("game-field");
    this.inputManager = new InputManager();
    this.network = new NetworkClient();
    this.uiManipulator = uiManipulator || new DomManipulator();
    this.screenScaler = new ScreenScaler();

    this.chartRenderer = new ChartRenderer();
    this.radarRenderer = new RadarRenderer();
    this.magazineRenderer = new MagazineRenderer();

    this.mobileControls = new MobileControlManager(this.inputManager);
    this.uiManipulator.setMobileControlManager(this.mobileControls);

    this.syncManager = null;
    this.userId = null;
    this.tradeState = {
      chartData: [],
      currentPrice: 1000,
      minPrice: 990,
      maxPrice: 1010,
      maData: { short: [], medium: [], long: [] },
    };
    this.renderLoopId = null;
    this.inputIntervalId = null;
    this.lastFrameTime = 0;
    this.serverStats = null;

    this.chartCanvas = document.getElementById("chart-canvas");
    this.radarCanvas = document.getElementById("radar-canvas");
    this.magazineCanvas = document.getElementById("magazine-canvas");

    this.gameScale = 1.0;
    this.cachedUiScale = 1.0;
    this.jitterRecorder = null;
    this.debugGraphRenderer = null;
  }

  async init() {
    this.screenScaler.init();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    await this.renderer.init();
    this.inputManager.init(document.getElementById("game-field"));

    this.renderer.setupBackground(3000, 3000);

    this.network.on("game_state_snapshot", (payload) =>
      this.syncManager.applySnapshot(payload)
    );
    this.network.on("game_state_delta", (payload) =>
      this.syncManager.applyDelta(payload)
    );
    this.network.on("static_state", (payload) => {
      this.syncManager.setStaticState(payload);
      if (payload.worldConfig)
        this.renderer.setupBackground(
          payload.worldConfig.width,
          payload.worldConfig.height
        );
    });
    this.network.on("chart_state", (payload) =>
      this.updateTradeStateFull(payload)
    );
    this.network.on("chart_update", (payload) =>
      this.updateTradeStateDelta(payload)
    );
    this.network.on("leaderboard_update", (payload) => {
      if (payload.leaderboardData)
        this.uiManipulator.updateLeaderboard(
          payload.leaderboardData,
          this.userId
        );
      if (payload.serverStats) this.serverStats = payload.serverStats;
    });
    this.network.on("disconnect", () => {
      this.stopLoop();
      this.uiManipulator.showGameOverScreen(0);
      this.uiManipulator.setLoadingText("Disconnected");
    });
  }

  resize() {
    if (this.screenScaler) {
      this.screenScaler.updateScale();
    }

    const container = document.getElementById("cockpit-container");
    if (!container) return;

    let width, height;

    if (window.visualViewport) {
      width = window.visualViewport.width;
      height = window.visualViewport.height;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    if (height > width) {
      const temp = width;
      width = height;
      height = temp;
    }

    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    let uiScale = 1;
    try {
      const val = getComputedStyle(document.body).getPropertyValue(
        "--ui-scale"
      );
      if (val) uiScale = parseFloat(val);
    } catch (e) {}
    if (!uiScale || isNaN(uiScale)) uiScale = 1;
    this.cachedUiScale = uiScale;

    const targetWorldWidth =
      ClientConfig.GRID_SIZE * ClientConfig.VIEWPORT_GRID_WIDTH;
    this.gameScale = width / targetWorldWidth;

    if (this.renderer) {
      this.renderer.resize(width, height);
    }

    const resizeSubCanvas = (canvas) => {
      if (canvas && canvas.parentElement) {
        const w = canvas.parentElement.clientWidth;
        const h = canvas.parentElement.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        if (w > 0 && h > 0) {
          canvas.width = Math.floor(w * dpr * uiScale);
          canvas.height = Math.floor(h * dpr * uiScale);

          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;

          const ctx = canvas.getContext("2d");
          if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    };

    resizeSubCanvas(this.chartCanvas);
    resizeSubCanvas(this.radarCanvas);
    resizeSubCanvas(this.magazineCanvas);
  }

  async connect(userName, isDebug = false) {
    this.stopLoop();
    this.inputManager.resetActionStates();

    const tempId = "user_" + Math.random().toString(36).substr(2, 9);
    if (isDebug) {
      this.jitterRecorder = new JitterRecorder();
      this.debugGraphRenderer = new DebugGraphRenderer();

      setTimeout(() => {
        const canvas = this.uiManipulator.getDebugCanvas();
        if (canvas) this.debugGraphRenderer.setCanvas(canvas);

        this.uiManipulator.setupDebugListeners(() => {
          this.jitterRecorder.downloadJson();
        });
      }, 100);
    }
    this.userId = tempId;
    this.syncManager = new StateSyncManager(this.userId);

    const joinData = await this.network.connect(
      this.userId,
      userName,
      isDebug,
      this.jitterRecorder
    );
    if (joinData && joinData.worldConfig) {
      this.renderer.setupBackground(
        joinData.worldConfig.width,
        joinData.worldConfig.height
      );
    }
  }

  startLoop() {
    this.stopLoop();
    this.lastFrameTime = performance.now();
    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
    this.inputIntervalId = setInterval(
      () => this.sendInput(),
      ClientConfig.INPUT_SEND_INTERVAL
    );
    this.mobileControls.applyScreenMode("game");

    this.resize();
  }

  stopLoop() {
    if (this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    if (this.inputIntervalId) clearInterval(this.inputIntervalId);
    this.mobileControls.applyScreenMode("menu");
  }

  loop(now) {
    const dtSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const deltaFrames = dtSeconds * 60;

    if (this.syncManager) {
      this.syncManager.updateInterpolation(deltaFrames);
      while (this.syncManager.effectQueue.length > 0) {
        const ef = this.syncManager.effectQueue.shift();
        this.renderer.playOneShotEffect(ef.key, ef.x, ef.y, ef.rotation);
      }
      const myPlayer = this.syncManager.visualState.players.get(this.userId);

      this.updateCamera(myPlayer);
      this.renderer.render(this.syncManager.visualState);
      if (
        this.uiManipulator.isDebugMode &&
        this.debugGraphRenderer &&
        this.jitterRecorder
      ) {
        this.debugGraphRenderer.draw(this.jitterRecorder);
      }
      if (myPlayer) {
        this.uiManipulator.updateHUD(myPlayer, this.tradeState);

        if (this.chartCanvas) {
          const ctx = this.chartCanvas.getContext("2d");
          ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
          this.chartRenderer.draw(
            ctx,
            this.chartCanvas.width,
            this.chartCanvas.height,
            this.tradeState,
            myPlayer,
            this.cachedUiScale
          );
        }
        if (this.radarCanvas) {
          const ctx = this.radarCanvas.getContext("2d");
          ctx.clearRect(0, 0, this.radarCanvas.width, this.radarCanvas.height);
          this.radarRenderer.draw(
            ctx,
            this.radarCanvas.width,
            this.radarCanvas.height,
            3000,
            3000,
            myPlayer,
            Array.from(this.syncManager.visualState.enemies.values()),
            Array.from(this.syncManager.visualState.obstacles.values()),
            Array.from(this.syncManager.visualState.players.values()),
            this.cachedUiScale
          );
        }
        if (this.magazineCanvas) {
          const ctx = this.magazineCanvas.getContext("2d");
          ctx.clearRect(
            0,
            0,
            this.magazineCanvas.width,
            this.magazineCanvas.height
          );
          this.magazineRenderer.draw(
            ctx,
            myPlayer,
            this.magazineCanvas.width,
            this.magazineCanvas.height,
            this.cachedUiScale
          );
        }
      }

      if (this.uiManipulator.isDebugMode && this.network) {
        const stats = this.network.getStats();
        const simStats = { avg_bps: 0 };
        this.uiManipulator.updateDebugHUD(stats, simStats, this.serverStats);
      }
    }

    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
  }

  updateCamera(myPlayer) {
    if (!myPlayer) return;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const mouseState = this.inputManager.mousePos;
    this.inputManager.mouseWorldPos.x =
      (mouseState.x - screenCenterX) / this.gameScale + myPlayer.x;
    this.inputManager.mouseWorldPos.y =
      (mouseState.y - screenCenterY) / this.gameScale + myPlayer.y;

    this.renderer.updateCamera(myPlayer.x, myPlayer.y, this.gameScale);
  }

  sendInput() {
    const state = this.inputManager.getInputState();
    this.network.sendInput(0, state.states, state.pressed, state.mouseWorldPos);
  }

  updateTradeStateFull(payload) {
    this.tradeState = payload;
  }

  updateTradeStateDelta(payload) {
    this.tradeState.currentPrice = payload.currentPrice;
    this.tradeState.minPrice = payload.minPrice;
    this.tradeState.maxPrice = payload.maxPrice;
    if (payload.newChartPoint) {
      this.tradeState.chartData.push(payload.newChartPoint);
      if (this.tradeState.chartData.length > 300)
        this.tradeState.chartData.shift();
    }
    if (payload.newMaPoint) {
      ["short", "medium", "long"].forEach((t) => {
        if (!this.tradeState.maData[t]) this.tradeState.maData[t] = [];
        this.tradeState.maData[t].push(payload.newMaPoint[t]);
        if (this.tradeState.maData[t].length > 300)
          this.tradeState.maData[t].shift();
      });
    }
  }
}
