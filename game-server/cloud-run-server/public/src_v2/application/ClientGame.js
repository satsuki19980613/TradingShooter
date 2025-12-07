import { PixiRenderer } from "../infrastructure/rendering/pixi/PixiRenderer.js";
import { InputManager } from "../infrastructure/input/InputManager.js";
import { NetworkClient } from "../infrastructure/network/NetworkClient.js";
import { StateSyncManager } from "./managers/StateSyncManager.js";
import { MobileControlManager } from "../infrastructure/input/MobileControlManager.js";
import { ChartRenderer } from "../infrastructure/rendering/canvas/ChartRenderer.js";
import { RadarRenderer } from "../infrastructure/rendering/canvas/RadarRenderer.js";
import { MagazineRenderer } from "../infrastructure/rendering/canvas/MagazineRenderer.js";
import { DomManipulator } from "../infrastructure/ui/DomManipulator.js";
import { ClientConfig } from "../core/config/ClientConfig.js"; 

export class ClientGame {
  constructor() {
    this.renderer = new PixiRenderer("game-field");
    this.inputManager = new InputManager();
    this.network = new NetworkClient();
    this.uiManipulator = new DomManipulator();
    
    this.chartRenderer = new ChartRenderer();
    this.radarRenderer = new RadarRenderer();
    this.magazineRenderer = new MagazineRenderer();

    this.mobileControls = new MobileControlManager(this.inputManager);
    this.syncManager = null;
    this.userId = null;
    this.tradeState = { chartData: [], currentPrice: 1000, minPrice: 990, maxPrice: 1010, maData: { short:[], medium:[], long:[] } };
    this.renderLoopId = null;
    this.inputIntervalId = null;
    this.lastFrameTime = 0;
    this.serverStats = null;
    
    this.chartCanvas = document.getElementById("chart-canvas");
    this.radarCanvas = document.getElementById("radar-canvas");
    this.magazineCanvas = document.getElementById("magazine-canvas");
  }

  async init() {
    await this.renderer.init();
    this.inputManager.init(document.getElementById("game-field"));
    this.mobileControls.init();
    
    this.renderer.setupBackground(3000, 3000);
    
    this.network.on("game_state_snapshot", (payload) => this.syncManager.applySnapshot(payload));
    this.network.on("game_state_delta", (payload) => this.syncManager.applyDelta(payload));
    this.network.on("static_state", (payload) => {
        this.syncManager.setStaticState(payload);
        if(payload.worldConfig) this.renderer.setupBackground(payload.worldConfig.width, payload.worldConfig.height);
    });
    this.network.on("chart_state", (payload) => this.updateTradeStateFull(payload));
    this.network.on("chart_update", (payload) => this.updateTradeStateDelta(payload));
    this.network.on("leaderboard_update", (payload) => {
        if(payload.leaderboardData) this.uiManipulator.updateLeaderboard(payload.leaderboardData, this.userId);
        if(payload.serverStats) this.serverStats = payload.serverStats;
    });
    this.network.on("disconnect", () => {
        this.stopLoop();
        this.uiManipulator.showScreen("gameover");
        this.uiManipulator.setLoadingText("Disconnected");
    });
  }

  async connect(userName) {
    const tempId = "user_" + Math.random().toString(36).substr(2, 9);
    this.userId = tempId;
    this.syncManager = new StateSyncManager(this.userId);
    
    const joinData = await this.network.connect(this.userId, userName, false);
    if(joinData && joinData.worldConfig) {
        this.renderer.setupBackground(joinData.worldConfig.width, joinData.worldConfig.height);
    }
  }

  startLoop() {
    this.stopLoop();
    this.lastFrameTime = performance.now();
    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
    this.inputIntervalId = setInterval(() => this.sendInput(), ClientConfig.INPUT_SEND_INTERVAL);
    this.mobileControls.applyScreenMode("game");
  }

  stopLoop() {
    if(this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    if(this.inputIntervalId) clearInterval(this.inputIntervalId);
    this.mobileControls.applyScreenMode("menu");
  }

  loop(now) {
    const dtSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const deltaFrames = dtSeconds * 60;

    if (this.syncManager) {
        this.syncManager.updateInterpolation(deltaFrames);
        const myPlayer = this.syncManager.visualState.players.get(this.userId);
        
        this.updateCamera(myPlayer);
        this.renderer.render(this.syncManager.visualState);
        
        if (myPlayer) {
            this.uiManipulator.updateHUD(myPlayer.hp, 100, myPlayer.ep, myPlayer.chargeBetAmount, 0);
            this.mobileControls.updateDisplay(myPlayer);
            
            if (this.chartCanvas) {
                const ctx = this.chartCanvas.getContext("2d");
                ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
                this.chartRenderer.draw(ctx, this.chartCanvas.width, this.chartCanvas.height, this.tradeState, myPlayer);
            }
            if (this.radarCanvas) {
                const ctx = this.radarCanvas.getContext("2d");
                ctx.clearRect(0, 0, this.radarCanvas.width, this.radarCanvas.height);
                this.radarRenderer.draw(ctx, this.radarCanvas.width, this.radarCanvas.height, 3000, 3000, myPlayer, Array.from(this.syncManager.visualState.enemies.values()), [], Array.from(this.syncManager.visualState.players.values()));
            }
            if (this.magazineCanvas) {
                const ctx = this.magazineCanvas.getContext("2d");
                ctx.clearRect(0, 0, this.magazineCanvas.width, this.magazineCanvas.height);
                this.magazineRenderer.draw(ctx, myPlayer, this.magazineCanvas.width, this.magazineCanvas.height);
            }
        }
    }
    
    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
  }

  updateCamera(myPlayer) {
      if(!myPlayer) return;
      
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      
      const mouseState = this.inputManager.mousePos;
      this.inputManager.mouseWorldPos.x = mouseState.x - screenCenterX + myPlayer.x;
      this.inputManager.mouseWorldPos.y = mouseState.y - screenCenterY + myPlayer.y;

      this.renderer.updateCamera(myPlayer.x, myPlayer.y, 1.0);
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
      if(payload.newChartPoint) {
          this.tradeState.chartData.push(payload.newChartPoint);
          if(this.tradeState.chartData.length > 300) this.tradeState.chartData.shift();
      }
      if(payload.newMaPoint) {
          ["short","medium","long"].forEach(t => {
              if(!this.tradeState.maData[t]) this.tradeState.maData[t] = [];
              this.tradeState.maData[t].push(payload.newMaPoint[t]);
              if(this.tradeState.maData[t].length > 300) this.tradeState.maData[t].shift();
          });
      }
  }
}