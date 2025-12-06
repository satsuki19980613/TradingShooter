import { ClientGame } from "./application/ClientGame.js";
import { AppFlowManager } from "./application/managers/AppFlowManager.js";
import { DomManipulator } from "./infrastructure/ui/DomManipulator.js";

window.addEventListener("load", () => {
  const game = new ClientGame();
  const ui = new DomManipulator();
  const appFlow = new AppFlowManager(ui, game);

  game.init().then(() => {
      console.log("Game Initialized");
      // window.gameInput is used by VirtualJoystick/MobileControl
      window.gameInput = {
          setVirtualInput: (action, val) => { game.inputListener.actionStates[action] = val; if(val) game.inputListener.actionPressed[action] = true; },
          setShootPressed: () => { game.inputListener.shootPressed = true; },
          setJoystickVector: (x, y) => { /* logic in VirtualJoystick */ }
      };
  });
});