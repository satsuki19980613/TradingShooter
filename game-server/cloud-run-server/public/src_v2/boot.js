import { ClientGame } from "./application/ClientGame.js";
import { AppFlowManager } from "./application/managers/AppFlowManager.js";
import { DomManipulator } from "./infrastructure/ui/DomManipulator.js";

window.addEventListener("load", async () => {
  // 1. UI管理インスタンスを生成
  const ui = new DomManipulator();
  const params = new URLSearchParams(window.location.search);
  const isDebug = params.get("debug") === "true";
  
  if (isDebug) {
      ui.enableDebugMode();
      console.log("[Boot] Debug Mode Enabled");
  }
  // 2. Gameインスタンス生成時にUIを渡す（依存性注入）
  const game = new ClientGame(ui);
  
  // 3. 全体を管理するフローに両方を渡す
  const appFlow = new AppFlowManager(ui, game);

  await game.init();
  
  window.gameInput = game.inputManager;

  const bgVideo = document.getElementById("bg-video");
  if (bgVideo) {
      bgVideo.muted = true;
      bgVideo.play().catch(() => {});
  }

  console.log("[Boot] Game Initialized with v2 Architecture");
});