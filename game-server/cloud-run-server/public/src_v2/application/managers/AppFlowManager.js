import { AssetLoader } from "../../infrastructure/assets/AssetLoader.js";
import { AudioManager } from "../../infrastructure/audio/AudioManager.js";
import { AudioConfig } from "../../core/config/AudioConfig.js";

export class AppFlowManager {
  constructor(uiManipulator, gameApp) {
    this.ui = uiManipulator;
    this.game = gameApp;
    this.isDebug = this.ui.isDebugMode || false;
    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();
    this.accountManager = accountManager;
    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;
    this.audioManager.onTrackChanged = (title) => {
      this.ui.showMusicNotification(title);
    };
    this.ui.setMenuActionCallback((actionId) => {
        this.handleMenuAction(actionId);
    });
    this.setupUI();
  }

  handleUserUpdate(userEntity) {
    console.log("[AppFlow] User State Updated:", userEntity);

    if (!userEntity) {
        // 未ログイン -> 初期画面
        this.ui.setBodyMode("initial"); 
        this.ui.switchCanvasScene("initial"); 
    } else {
        // ログイン済み -> ホーム画面
        this.ui.setBodyMode(userEntity.isGuest ? "guest" : "member");
        this.ui.switchCanvasScene("home", userEntity);
    }
  }

  handleMenuAction(actionId) {
    console.log("[AppFlow] Action:", actionId);
    
    switch(actionId) {
        case "start_guest":
            this.ui.setLoadingText("Logging in as Guest...");
            this.ui.showScreen("loading");
            // 必ず this.accountManager を使う
            this.accountManager.loginGuest().catch(e => {
                console.error(e);
                this.ui.showErrorScreen("Guest Login Failed", e);
                this.ui.showScreen("home");
            });
            break;
            
        case "start_register":
            const name = prompt("Please enter your pilot name (ALVOLT System):");
            if (name) {
                this.ui.setLoadingText("Registering...");
                this.ui.showScreen("loading");
                this.accountManager.registerPlayerName(name).catch(e => {
                    console.error(e);
                    this.ui.showErrorScreen("Registration Failed", e);
                    this.ui.showScreen("home");
                });
            }
            break;

        case "game_start":
            this.ui.tryFullscreen();
            const currentUser = this.accountManager.currentUser;
            // AppFlowManagerにあるはずの handleStartGame を呼び出す
            // (まだ実装されていない場合は console.log で止める)
            if (this.handleStartGame) {
                this.handleStartGame(currentUser ? currentUser.name : "Guest");
            } else {
                console.log("Game Start Logic goes here.");
            }
            break;

        case "open_register":
            const regName = prompt("Register Formal Pilot Name:");
            if (regName) {
                this.accountManager.registerPlayerName(regName);
            }
            break;
            
        case "menu_delete":
            if(confirm("WARNING: Account will be deleted permanently. Continue?")) {
                alert("Delete logic not implemented yet.");
            }
            break;
            
        default:
            console.warn("Unknown Action:", actionId);
    }
  }

  setupUI() {
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn)
      startBtn.addEventListener("click", () => {
        this.ui.tryFullscreen();
        this.handleStartGame();
      });

    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn)
      audioBtn.addEventListener("click", () => this.handleAudioToggle());
    this.ui.setupMenuCallbacks(
      () => {
        this.ui.tryFullscreen();
        this.handleStartGame("Guest");
      },
      () => {
        this.handleAudioToggle();
      }
    );
    const retryBtn = document.getElementById("btn-gameover-retry");
    if (retryBtn)
      retryBtn.addEventListener("click", () => {
        this.handleStartGame("Guest");
      });
    const retireBtn = document.getElementById("btn-retire");
    if (retireBtn) {
      retireBtn.addEventListener("click", () => this.handleRetire());
    }

    const homeBtn = document.getElementById("btn-gameover-home");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => this.handleBackToHome());
    }

    this.ui.mobileControlManager.init();
  }

  handleRetire() {
    if (confirm("ゲームを終了してホームに戻りますか？")) {
      this.game.stopLoop();
      if (this.game.network) {
        this.game.network.disconnect();
      }

      this.ui.showScreen("home");
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "block";
    }
  }

  handleBackToHome() {
    this.ui.showScreen("home");
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) bgVideo.style.display = "block";
  }

  async handleStartGame(playerName) {
    if (this.isAudioLoading) {
      this.pendingGameStartName = playerName;

      this.ui.showScreen("loading");
      this.ui.setLoadingText("音楽データを準備中...");
      return;
    }

    this.ui.showScreen("loading");
    this.ui.setLoadingText("Connecting...");

    try {
      await this.game.connect("Guest", this.isDebug);
      this.ui.showScreen("game");
      this.game.startLoop();
    } catch (e) {
      console.error(e);
      this.ui.showErrorScreen("接続失敗", e);
    }
  }
  async handleAudioToggle() {
    if (this.isAudioLoading) return;
    if (!this.isAudioLoaded) {
      await this.startLoadingSequence();
      return;
    }

    const isUnmuted = this.audioManager.toggleMute();
    this.ui.updateAudioButton(!isUnmuted);
  }

  async startLoadingSequence() {
    this.isAudioLoading = true;
    this.ui.setAudioLoadingState(true);
    await this.assetLoader.loadAudioPlaylist(
      AudioConfig.BGM_PLAYLIST,
      (percent) => this.ui.updateAudioLoadingProgress(percent)
    );
    console.log("[Audio] Ready to stream (Cached in Memory).");
    this.isAudioLoaded = true;
    this.isAudioLoading = false;
    setTimeout(() => {
      this.ui.setAudioLoadingState(false);
    }, 500);

    const isUnmuted = this.audioManager.toggleMute();
    this.ui.updateAudioButton(!isUnmuted);
    if (this.pendingGameStartName) {
      this.ui.setLoadingText("音楽の準備完了。接続中...");
      this.handleStartGame(this.pendingGameStartName);
      this.pendingGameStartName = null;
    }
  }
}
