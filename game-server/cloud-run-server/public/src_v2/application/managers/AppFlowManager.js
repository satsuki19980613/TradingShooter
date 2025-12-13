import { AssetLoader } from "../../infrastructure/assets/AssetLoader.js";
import { AudioManager } from "../../infrastructure/audio/AudioManager.js";
import { AudioConfig } from "../../core/config/AudioConfig.js";

export class AppFlowManager {
  constructor(uiManipulator, gameApp, accountManager) {
    this.ui = uiManipulator;
    this.game = gameApp;
    this.accountManager = accountManager;

    this.isDebug = this.ui.isDebugMode || false;
    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();

    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;

    this.audioManager.onTrackChanged = (title) => {
      this.ui.showMusicNotification(title);
    };

    this.ui.setMenuActionCallback((actionId) => {
      this.handleMenuAction(actionId);
    });
    this.setupModalEvents();
    this.setupUI();
  }
  setupModalEvents() {
    const btnReg = document.getElementById("btn-do-register");
    const btnCloseReg = document.getElementById("btn-close-register");
    const regInput = document.getElementById("reg-name-input");

    if (btnReg) {
      btnReg.onclick = () => {
        const name = regInput ? regInput.value : "";
        if (name) this.executeRegistration(name);
      };
    }
    if (btnCloseReg) {
      btnCloseReg.onclick = () => this.ui.closeAllModals();
    }

    const btnCloseTrans = document.getElementById("btn-close-transfer");
    const btnIssue = document.getElementById("btn-issue-code");
    const btnRecover = document.getElementById("btn-do-recover");
    const codeDisplay = document.getElementById("transfer-code-display");
    const recoverInput = document.getElementById("recover-code-input");

    if (btnCloseTrans) {
      btnCloseTrans.onclick = () => this.ui.closeAllModals();
    }

    if (btnIssue) {
      btnIssue.onclick = async () => {
        try {
          btnIssue.disabled = true;
          const originalText = btnIssue.textContent;
          btnIssue.textContent = "ISSUING...";

          const code = await this.accountManager.issueCode();

          if (codeDisplay) codeDisplay.textContent = code;
          btnIssue.textContent = "CODE ISSUED";

          setTimeout(() => {
            btnIssue.disabled = false;
            btnIssue.textContent = originalText;
          }, 3000);
        } catch (e) {
          console.error(e);
          if (codeDisplay) codeDisplay.textContent = "ERROR";
          btnIssue.textContent = "RETRY";
          btnIssue.disabled = false;
        }
      };
    }

    if (btnRecover) {
      btnRecover.onclick = async () => {
        const code = recoverInput ? recoverInput.value.trim() : "";
        if (!code) return;

        try {
          this.ui.setLoadingText("Recovering Data...");
          this.ui.showScreen("loading");
          this.ui.closeAllModals();

          await this.accountManager.recover(code);

          alert("Account recovered successfully! Reloading...");
          location.reload();
        } catch (e) {
          console.error(e);
          this.ui.showErrorScreen("Recovery Failed", e);

          this.ui.showScreen("home");
        }
      };
    }
  }

  handleUserUpdate(userEntity) {
    console.log("[AppFlow] User State Updated:", userEntity);

    if (!userEntity) {
      this.ui.setBodyMode("initial");
      this.ui.switchCanvasScene("initial");
    } else {
      this.ui.setBodyMode(userEntity.isGuest ? "guest" : "member");
      this.ui.switchCanvasScene("home", userEntity);
    }
  }

  handleMenuAction(actionId) {
    console.log("[AppFlow] Action:", actionId);

    switch (actionId) {
      case "start_guest":
        this.ui.setLoadingText("Logging in as Guest...");
        this.ui.showScreen("loading");
        this.accountManager.loginGuest().catch((e) => {
          console.error(e);
          this.ui.showErrorScreen("Guest Login Failed", e);
          this.ui.showScreen("home");
        });
        break;
      case "open_ranking":
        this.ui.showScreen("ranking");

        break;
      case "start_register":
      case "open_register":
        this.ui.openModal("register");
        break;

      case "open_transfer":
        this.ui.openModal("transfer");
        break;

      case "game_start":
        this.ui.tryFullscreen();
        const currentUser = this.accountManager.currentUser;

        if (this.handleStartGame) {
          this.handleStartGame(currentUser ? currentUser.name : "Guest");
        } else {
          console.error("Game Start Logic not found.");
        }
        break;

      case "menu_delete":
        if (
          confirm("WARNING: Account will be deleted permanently. Continue?")
        ) {
          alert("Delete logic will be implemented in the next step.");
        }
        break;

      default:
        console.warn("Unknown Action:", actionId);
      case "menu_delete":
        if (
          confirm("WARNING: Account will be deleted permanently. Continue?")
        ) {
          this.ui.setLoadingText("Deleting Account...");
          this.ui.showScreen("loading");

          this.accountManager.deleteUser().catch((e) => {
            console.error(e);

            this.ui.showErrorScreen("Delete Failed. Please re-login.", e);
            this.ui.showScreen("home");
          });
        }
        break;
    }
  }
  executeRegistration(name) {
    if (!name) return;

    this.ui.setLoadingText("Registering...");
    this.ui.showScreen("loading");

    this.ui.closeAllModals();

    this.accountManager
      .registerPlayerName(name)
      .then(() => {
        console.log("Registered successfully.");
      })
      .catch((e) => {
        console.error(e);
        this.ui.showErrorScreen("Registration Failed", e);
      });
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
      await this.game.connect(playerName || "Guest", this.isDebug);
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
