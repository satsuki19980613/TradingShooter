import { PixiRenderer } from "../infrastructure/rendering/pixi/PixiRenderer.js";
import { DomInputListener } from "../infrastructure/input/DomInputListener.js";
import { WebSocketClient } from "../infrastructure/network/WebSocketClient.js";
import { StateSyncManager } from "./managers/StateSyncManager.js";
import { VirtualJoystick } from "../infrastructure/input/VirtualJoystick.js";
import { ChartRenderer } from "../infrastructure/rendering/canvas/ChartRenderer.js";
import { RadarRenderer } from "../infrastructure/rendering/canvas/RadarRenderer.js";
import { MagazineRenderer } from "../infrastructure/rendering/canvas/MagazineRenderer.js"; // ※MagazineRendererもCanvas配下に移動と仮定
import { DomManipulator } from "../infrastructure/ui/DomManipulator.js";
import { ClientConfig } from "../../core/config/ClientConfig.js";

/**
 * クライアントサイドのゲームメインクラス
 */
export class ClientGame {
  constructor() {
    this.renderer = new PixiRenderer("game-field");
    this.inputListener = new DomInputListener(document.getElementById("game-field"));
    this.network = new WebSocketClient();
    this.uiManipulator = new DomManipulator();
    
    this.chartRenderer = new ChartRenderer();
    this.radarRenderer = new RadarRenderer();
    // this.magazineRenderer = new MagazineRenderer(); // 既存コードにある場合

    this.joystick = new VirtualJoystick(this.inputListener);
    this.syncManager = null;
    this.userId = null;
    
    this.tradeState = { chartData: [], currentPrice: 1000, minPrice: 990, maxPrice: 1010, maData: { short:[], medium:[], long:[] } };
    
    this.renderLoopId = null;
    this.inputIntervalId = null;
    this.lastFrameTime = 0;
    
    this.chartCanvas = document.getElementById("chart-canvas");
    this.radarCanvas = document.getElementById("radar-canvas");
    this.magazineCanvas = document.getElementById("magazine-canvas");
  }

  async init() {
    await this.renderer.init();
    this.inputListener.init();
    this.joystick.init();
    
    this.renderer.setupBackground(3000, 3000);
    
    // Network Event Bindings
    this.network.on("game_state_snapshot", (payload) => this.syncManager.applySnapshot(payload));
    this.network.on("game_state_delta", (payload) => this.syncManager.applyDelta(payload));
    this.network.on("static_state", (payload) => {
        this.syncManager.setStaticState(payload);
        if(payload.worldConfig) this.renderer.setupBackground(payload.worldConfig.width, payload.worldConfig.height);
    });
    this.network.on("chart_state", (payload) => this.updateTradeStateFull(payload));
    this.network.on("chart_update", (payload) => this.updateTradeStateDelta(payload));
    this.network.on("disconnect", () => {
        this.stopLoop();
        this.uiManipulator.showScreen("gameover");
        this.uiManipulator.setLoadingText("Disconnected");
    });
  }

  async connect(userName) {
    // Generate simple ID or use Firebase Auth in real impl
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
  }

  stopLoop() {
    if(this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    if(this.inputIntervalId) clearInterval(this.inputIntervalId);
  }

  loop(now) {
    const dtSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const deltaFrames = dtSeconds * 60;

    if (this.syncManager) {
        this.syncManager.updateInterpolation(deltaFrames);
        const myPlayer = this.syncManager.visualState.players.get(this.userId);
        
        // Render Game
        this.renderer.render(this.syncManager.visualState);
        
        if (myPlayer) {
            // Camera
            this.renderer.updateCamera(myPlayer.x, myPlayer.y, 1.0); // Scale logic omitted
            
            // HUD
            this.uiManipulator.updateHUD(myPlayer.hp, 100, myPlayer.ep, myPlayer.chargeBetAmount, 0); // Power logic omitted for brevity
            
            // Sub Canvases
            if (this.chartCanvas) {
                const ctx = this.chartCanvas.getContext("2d");
                this.chartRenderer.draw(ctx, this.chartCanvas.width, this.chartCanvas.height, this.tradeState, myPlayer);
            }
            if (this.radarCanvas) {
                const ctx = this.radarCanvas.getContext("2d");
                this.radarRenderer.draw(ctx, this.radarCanvas.width, this.radarCanvas.height, 3000, 3000, myPlayer, Array.from(this.syncManager.visualState.enemies.values()), [], []);
            }
        }
    }
    
    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
  }

  sendInput() {
      const state = this.inputListener.getInputState();
      // Mouse position needs adjustment by camera in real implementation
      const myPlayer = this.syncManager?.visualState.players.get(this.userId);
      if (myPlayer) {
          // Simple screen-center offset logic would go here
          state.mouseWorldPos.x = state.mousePos.x - window.innerWidth/2 + myPlayer.x;
          state.mouseWorldPos.y = state.mousePos.y - window.innerHeight/2 + myPlayer.y;
      }
      this.network.sendInput(state.seq++, state.states, state.pressed, state.mouseWorldPos);
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