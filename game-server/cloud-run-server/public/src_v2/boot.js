import { ClientGame } from "./application/ClientGame.js";
import { AppFlowManager } from "./application/managers/AppFlowManager.js";
import { DomManipulator } from "./infrastructure/ui/DomManipulator.js";
import { AssetLoader } from "./infrastructure/assets/AssetLoader.js";
import { EffectConfig } from "./core/config/EffectConfig.js";

window.addEventListener("load", async () => {
  const ui = new DomManipulator();
  const params = new URLSearchParams(window.location.search);
  const isDebug = params.get("debug") === "true";

  if (isDebug) {
    ui.enableDebugMode();
    console.log("[Boot] Debug Mode Enabled");
  }

  ui.setLoadingText("Loading Assets...");
  ui.showScreen("loading");

  const assetLoader = new AssetLoader();
  await assetLoader.loadSpriteAssets(EffectConfig);

  ui.setLoadingText("Initializing...");

  const game = new ClientGame(ui);
  const appFlow = new AppFlowManager(ui, game);

  await game.init();

  window.gameInput = game.inputManager;

  const bgVideo = document.getElementById("bg-video");
  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.play().catch(() => {});
  }

  ui.showScreen("home");

  console.log("[Boot] Game Initialized with v2 Architecture");
});
