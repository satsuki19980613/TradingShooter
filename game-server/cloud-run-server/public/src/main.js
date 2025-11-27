import { Game } from "./game.js";
import { UIManager } from "./systems/UIManager.js";
import { InputManager } from "./systems/InputManager.js";
import { FirebaseManager } from "./systems/FirebaseManager.js";
import { NetworkManager } from "./systems/NetworkManager.js";
import { AppFlowManager } from "./systems/AppFlowManager.js";
/**
 * ゲームの起動
 */
window.addEventListener("load", () => {
  const uiManager = new UIManager();
  const game = new Game("game-field");
  const inputManager = game.inputManager;
  const firebaseManager = new FirebaseManager();
  const networkManager = new NetworkManager();
  const appFlowManager = new AppFlowManager(game, uiManager, firebaseManager, networkManager);

  game.setUIManager(uiManager);
  game.setFirebaseManager(firebaseManager);
  game.setNetworkManager(networkManager);
  networkManager.init(game);
  game.setupEventListeners();
  appFlowManager.init();
  uiManager.initShell(game, inputManager, firebaseManager, networkManager);
  const bgVideo = document.getElementById('bg-video');
  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.volume = 0; 
  }
});
// KB