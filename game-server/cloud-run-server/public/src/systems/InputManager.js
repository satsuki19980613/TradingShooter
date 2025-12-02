/**
 * 【InputManager の役割: 入力検知】
 * キーボードやマウスの生の入力を、ゲーム内の「アクション（移動、攻撃）」に変換します。
 * * ■ 担当する責務 (Do):
 * - キーバインディング（キー設定）の管理
 * - 入力状態の保持 (Pressed/Down)
 * - マウス座標のワールド座標変換
 * * ■ 担当しない責務 (Don't):
 * - サーバーへの入力送信 (NetworkManager がここのデータを取得して送る)
 * - プレイヤーの移動処理 (サーバーが行う)
 */
export class InputManager {
  constructor() {
    this.defaultKeyMap = {
      r: "move_up",
      ArrowUp: "move_up",
      f: "move_down",
      ArrowDown: "move_down",
      d: "move_left",
      ArrowLeft: "move_left",
      g: "move_right",
      ArrowRight: "move_right",
      a: "trade_long",
      z: "trade_short",
      " ": "trade_settle",
      e: "bet_up",
      w: "bet_down",
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
      "trade_long",
      "trade_short",
      "trade_settle",
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
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
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

  // [InputManager.js] クラス内に追加

  /**
   * 仮想ジョイスティックやボタンからの入力を適用する (スマホ用)
   * @param {string} action - 'move_up', 'trade_long' などのアクション名
   * @param {boolean} isPressed - 押されているかどうか
   */
  setVirtualInput(action, isPressed) {
    // 状態を更新
    this.actionStates[action] = isPressed;
    
    // 押された瞬間なら pressed にも記録 (クリックイベント相当)
    if (isPressed) {
      this.actionPressed[action] = true;
    }
  }

  /**
   * ジョイスティックのベクトル (x, y: -1.0 ~ 1.0) を受け取り、
   * 移動キーの入力状態に変換する
   */
  setJoystickVector(x, y) {
    const threshold = 0.3; // 感度

    this.actionStates["move_right"] = x > threshold;
    this.actionStates["move_left"] = x < -threshold;
    this.actionStates["move_down"] = y > threshold;
    this.actionStates["move_up"] = y < -threshold;
  }
}
