// public/src/systems/MobileControlManager.js

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
      maxDist: 40
    };
  }

  init(isMobile) {
    // ★修正: 引数に関わらず、要素が存在すればセットアップを試みる
    // これによりPCでのデバッグ時も強制表示しやすくなります
    this.setupControls();
  }

  setupControls() {
    if (!this.mobileControlsLayer) {
        this.mobileControlsLayer = document.getElementById("mobile-controls-layer");
    }
    
    if (!this.mobileControlsLayer) {
        console.error("Mobile Controls Layer not found in DOM!");
        return;
    }

    console.log("Mobile Controls Setup Started: Force Display");

    // ★重要: HTML側の style="display: none" を直接上書きして消す
    this.mobileControlsLayer.style.display = ""; 
    
    // ★重要: CSSで制御するためのクラスをbodyに付与
    document.body.classList.add("is-mobile");

    // --- マウス/タッチ両対応のイベントヘルパー ---
    const addInputListener = (elem, action) => {
        if (!elem) return;
        
        // タッチ開始 / マウスダウン
        const startHandler = (e) => {
            e.preventDefault();
            if (window.gameInput) {
                if (action === "shoot") window.gameInput.setShootPressed();
                else window.gameInput.setVirtualInput(action, true);
            }
        };
        
        // タッチ終了 / マウスアップ
        const endHandler = (e) => {
            e.preventDefault();
            if (window.gameInput && action !== "shoot") {
                window.gameInput.setVirtualInput(action, false);
            }
        };

        elem.addEventListener("touchstart", startHandler, { passive: false });
        elem.addEventListener("mousedown", startHandler);
        
        elem.addEventListener("touchend", endHandler);
        elem.addEventListener("mouseup", endHandler);
    };

    // --- 1. ボタン設定 ---
    addInputListener(document.getElementById("mc-btn-fire"), "shoot");
    addInputListener(document.getElementById("mc-btn-short"), "trade_short");
    addInputListener(document.getElementById("mc-btn-long"), "trade_long");
    addInputListener(document.getElementById("mc-btn-settle"), "trade_settle");

    // ロット調整 (クリックした瞬間だけON)
    const setupTrigger = (id, action) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        const handler = (e) => {
            e.preventDefault();
            if(window.gameInput) {
                window.gameInput.setVirtualInput(action, true);
                setTimeout(() => window.gameInput.setVirtualInput(action, false), 100);
            }
        };
        btn.addEventListener("touchstart", handler, { passive: false });
        btn.addEventListener("mousedown", handler);
    };
    setupTrigger("mc-btn-lot-plus", "bet_up");
    setupTrigger("mc-btn-lot-minus", "bet_down");


    // --- 2. ジョイスティック制御 (マウス/タッチ両対応) ---
    if (this.mcJoystickArea) {
        const startJoy = (clientX, clientY) => {
            this.joystickState.active = true;
            this.joystickState.startX = clientX;
            this.joystickState.startY = clientY;
            this.updateJoystickVisual(0, 0);
        };

        const moveJoy = (clientX, clientY) => {
            if (!this.joystickState.active) return;
            
            let dx = clientX - this.joystickState.startX;
            let dy = clientY - this.joystickState.startY;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            const max = this.joystickState.maxDist;
            
            if (dist > max) {
                dx = (dx / dist) * max;
                dy = (dy / dist) * max;
            }
            
            this.updateJoystickVisual(dx, dy);

            if(window.gameInput) {
                window.gameInput.setJoystickVector(dx / max, dy / max);
            }
        };

        const endJoy = () => {
            this.joystickState.active = false;
            this.updateJoystickVisual(0, 0);
            if(window.gameInput) {
                window.gameInput.setJoystickVector(0, 0);
            }
        };

        // Touch Events
        this.mcJoystickArea.addEventListener("touchstart", (e) => {
            e.preventDefault();
            startJoy(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }, {passive: false});

        this.mcJoystickArea.addEventListener("touchmove", (e) => {
            e.preventDefault();
            moveJoy(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }, {passive: false});

        this.mcJoystickArea.addEventListener("touchend", (e) => { e.preventDefault(); endJoy(); });
        
        // Mouse Events (PCデバッグ用)
        this.mcJoystickArea.addEventListener("mousedown", (e) => {
            startJoy(e.clientX, e.clientY);
        });
        window.addEventListener("mousemove", (e) => {
            if(this.joystickState.active) moveJoy(e.clientX, e.clientY);
        });
        window.addEventListener("mouseup", endJoy);
    }
  }

  updateJoystickVisual(x, y) {
    if (this.mcJoystickKnob) {
        this.mcJoystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  updateDisplay(playerState) {
    if (this.mcLotDisplay && playerState) {
        const bet = Math.ceil(playerState.chargeBetAmount || 10);
        this.mcLotDisplay.textContent = bet;
    }
  }
}