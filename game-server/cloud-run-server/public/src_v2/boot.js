import { ClientGame } from "./application/ClientGame.js";
import { AppFlowManager } from "./application/managers/AppFlowManager.js";
import { DomManipulator } from "./infrastructure/ui/DomManipulator.js";

window.addEventListener("load", async () => {
  const game = new ClientGame();
  const ui = new DomManipulator();
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