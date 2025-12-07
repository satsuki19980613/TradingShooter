import { AssetLoader } from "../../infrastructure/assets/AssetLoader.js";
import { AudioManager } from "../../infrastructure/audio/AudioManager.js";
import { AudioConfig } from "../../core/config/AudioConfig.js";

export class AppFlowManager {
  constructor(uiManipulator, gameApp) {
    this.ui = uiManipulator;
    this.game = gameApp;

    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();

    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;

    this.audioManager.onTrackChanged = (title) => {
      this.ui.showMusicNotification(title);
    };

    this.setupUI();
  }

  setupUI() {
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn)
      startBtn.addEventListener("click", () => this.handleStartGame());

    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn)
      audioBtn.addEventListener("click", () => this.handleAudioToggle());

    const retryBtn = document.getElementById("btn-gameover-retry");
    if (retryBtn)
      retryBtn.addEventListener("click", () => {
        this.ui.showScreen("loading");
        this.game.connect("Guest").then(() => this.ui.showScreen("game"));
      });
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
      await this.game.connect("Guest");
      this.ui.showScreen("game");
      this.game.startLoop();
    } catch (e) {
      console.error(e);
      this.ui.showScreen("error");
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
