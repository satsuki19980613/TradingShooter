/**
 * 【MobileControlManager】
 * スマホ用UI（ジョイスティック、ボタン）のイベントハンドリングを担当
 */
export class MobileControlManager {
  constructor() {
    this.mobileControlsLayer = document.getElementById("mobile-controls-layer");
    this.mcJoystickArea = document.getElementById("mc-joystick-area");
    this.mcJoystickKnob = document.getElementById("mc-joystick-knob");
    this.mcLotDisplay = document.getElementById("mc-lot-display");

    this.joystickState = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      maxDist: 40 // スティックの可動半径
    };
  }

  /**
   * スマホであればコントロールを表示してイベント設定を行う
   * @param {boolean} isMobile - スマホかどうか
   */
  init(isMobile) {
    if (isMobile) {
      this.setupControls();
    }
  }

  setupControls() {
    if (!this.mobileControlsLayer) return;

    // 表示を有効化
    this.mobileControlsLayer.style.display = "block";
    document.body.classList.add("is-mobile");

    // --- 1. 発射ボタン ---
    const btnFire = document.getElementById("mc-btn-fire");
    if (btnFire) {
      btnFire.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (window.gameInput) window.gameInput.setShootPressed();
      }, { passive: false });
    }

    // --- 2. エントリーボタン (Short / Long) ---
    const setupBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (window.gameInput) window.gameInput.setVirtualInput(action, true);
      }, { passive: false });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (window.gameInput) window.gameInput.setVirtualInput(action, false);
      });
    };
    setupBtn("mc-btn-short", "trade_short");
    setupBtn("mc-btn-long", "trade_long");

    // --- 3. ロット調整 (Trigger) ---
    const setupTriggerBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (window.gameInput) {
          window.gameInput.setVirtualInput(action, true);
          // 100ms後にOFFにする（単押し動作）
          setTimeout(() => window.gameInput.setVirtualInput(action, false), 100);
        }
      }, { passive: false });
    };
    setupTriggerBtn("mc-btn-lot-plus", "bet_up");
    setupTriggerBtn("mc-btn-lot-minus", "bet_down");

    // --- 4. ジョイスティック制御 ---
    if (this.mcJoystickArea) {
      this.mcJoystickArea.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.joystickState.active = true;
        this.joystickState.startX = touch.clientX;
        this.joystickState.startY = touch.clientY;
        this.updateJoystickVisual(0, 0);
      }, { passive: false });

      this.mcJoystickArea.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!this.joystickState.active) return;
        const touch = e.changedTouches[0];

        let dx = touch.clientX - this.joystickState.startX;
        let dy = touch.clientY - this.joystickState.startY;

        // 距離制限
        const dist = Math.sqrt(dx * dx + dy * dy);
        const max = this.joystickState.maxDist;
        if (dist > max) {
          dx = (dx / dist) * max;
          dy = (dy / dist) * max;
        }

        this.updateJoystickVisual(dx, dy);

        // 入力送信 (正規化 -1.0 ~ 1.0)
        if (window.gameInput) {
          window.gameInput.setJoystickVector(dx / max, dy / max);
        }

      }, { passive: false });

      const endJoystick = (e) => {
        e.preventDefault();
        this.joystickState.active = false;
        this.updateJoystickVisual(0, 0);
        if (window.gameInput) {
          window.gameInput.setJoystickVector(0, 0);
        }
      };
      this.mcJoystickArea.addEventListener("touchend", endJoystick);
      this.mcJoystickArea.addEventListener("touchcancel", endJoystick);
    }
  }

  updateJoystickVisual(x, y) {
    if (this.mcJoystickKnob) {
      this.mcJoystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  /**
   * HUD更新時に呼ばれる（ロット表示の更新など）
   */
  updateDisplay(playerState) {
    if (this.mcLotDisplay && playerState) {
      const bet = Math.ceil(playerState.chargeBetAmount || 10);
      this.mcLotDisplay.textContent = bet;
    }
  }
}