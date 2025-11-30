import { Game } from "./game.js";
import { UIManager } from "./systems/UIManager.js";
import { InputManager } from "./systems/InputManager.js";
import { FirebaseManager } from "./systems/FirebaseManager.js";
import { NetworkManager } from "./systems/NetworkManager.js";
import { AppFlowManager } from "./systems/AppFlowManager.js";
import { ScreenScaler } from "./systems/ScreenScaler.js";
/**
 * ゲームの起動
 */
window.addEventListener("load", () => {
  const screenScaler = new ScreenScaler();
  screenScaler.init();
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
  const bgVideo = document.getElementById('bg-video');
  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.volume = 0; 
  }
  document.querySelectorAll('input[name="ma-select"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
          if (game && game.trading) {
              // toggleMaType(タイプ, ON/OFFの状態) を呼び出す
              game.trading.toggleMaType(e.target.value, e.target.checked);
          }
      });
  });
});
// KB