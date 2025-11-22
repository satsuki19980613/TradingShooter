/**
 * キーボードやマウス入力を抽象的な「アクション」に変換するクラス
 */
export class InputManager {
  constructor() {
    this.defaultKeyMap = {
      w: "move_up",
      ArrowUp: "move_up",
      s: "move_down",
      ArrowDown: "move_down",
      a: "move_left",
      ArrowLeft: "move_left",
      d: "move_right",
      ArrowRight: "move_right",
      " ": "trade",
      e: "bet_up",
      r: "bet_down",
      y: "bet_all",
      t: "bet_min",
    };

    this.keyMap = { ...this.defaultKeyMap };

    this.actionStates = {};
    this.actionPressed = {};

    this.configurableActions = [
      "move_up",
      "move_down",
      "move_left",
      "move_right",
      "trade",
      "bet_up",
      "bet_down",
      "bet_all",
      "bet_min",
    ];

    this.mouseWorldPos = { x: 0, y: 0 };

    this.shootPressed = false;

    this.resetActionStates();
  }

  resetActionStates() {
    const allActions = [...new Set(Object.values(this.keyMap))];
    this.actionStates = {};
    this.actionPressed = {};
    for (const action of allActions) {
      this.actionStates[action] = false;
    }
    this.shootPressed = false;
  }
  resetAllKeys() {
    for (const action in this.actionStates) {
      this.actionStates[action] = false;
    }
    this.actionPressed = {};
    this.shootPressed = false;
    console.log("キー入力をすべてリセットしました (Focus Blur)");
  }

  init() {
    this.loadKeyMap();
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  handleKeyDown(e) {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
    }
    const key = e.key;
    const action = this.keyMap[key];

    if (action) {
      e.preventDefault();
      if (!this.actionStates[action]) {
        this.actionPressed[action] = true;
      }
      this.actionStates[action] = true;
    }
  }

  handleKeyUp(e) {
    const key = e.key;
    const action = this.keyMap[key];

    if (action) {
      e.preventDefault();
      this.actionStates[action] = false;
    }
  }

  /**
   *Game.js がマウスのワールド座標を更新するために呼ぶ
   */
  updateMouseWorldPos(x, y) {
    this.mouseWorldPos.x = x;
    this.mouseWorldPos.y = y;
  }

  /**
   *Game.js が射撃ボタン(mousedown)を検知したら呼ぶ
   */
  setShootPressed() {
    this.shootPressed = true;
  }

  /**
   *  サーバーに送信する用の入力オブジェクトを生成
   */
  getCurrentInputState() {
    const inputState = {
      states: { ...this.actionStates },
      wasPressed: { ...this.actionPressed },
      mouseWorldPos: { ...this.mouseWorldPos },
    };

    if (this.shootPressed) {
      inputState.wasPressed["shoot"] = true;
    }

    this.actionPressed = {};
    this.shootPressed = false;

    return inputState;
  }

  setKeyMap(newKeyMap) {
    this.keyMap = newKeyMap;
    this.resetActionStates();
    console.log("キーマップが更新されました:", this.keyMap);
  }

  saveKeyMap() {
    localStorage.setItem("game_key_map", JSON.stringify(this.keyMap));
    console.log("キー設定をlocalStorageに保存しました。");
  }

  loadKeyMap() {
    const savedMap = localStorage.getItem("game_key_map");
    if (savedMap) {
      try {
        const parsedMap = JSON.parse(savedMap);
        this.keyMap = parsedMap;
        this.resetActionStates();
        console.log("キー設定をlocalStorageから読み込みました。");
      } catch (error) {
        console.error("キー設定の読み込みに失敗:", error);
        this.keyMap = { ...this.defaultKeyMap };
        this.resetActionStates();
      }
    } else {
      this.keyMap = { ...this.defaultKeyMap };
      this.resetActionStates();
    }
  }

  getKeyForAction(action) {
    for (const key in this.keyMap) {
      if (this.keyMap[key] === action) {
        return key;
      }
    }
    return "N/A";
  }
}
