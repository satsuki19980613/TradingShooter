// game-server/cloud-run-server/public/src/systems/AppFlowManager.js

export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;

    // Audio設定 (そのまま)
    this.audioContext = null;
    this.bgmGainNode = null;
    this.bgmBuffer = null;
    this.isPlaying = false;
    this.isMuted = true;
    this.defaultVolume = 0.2;
    this.bgmUrl = "https://trading-charge-shooter.web.app/audio/StellarSignals.mp3";
    this.initAudioSystem();
  }

  async initAudioSystem() {
    // (元のコードと同じ)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.bgmGainNode = this.audioContext.createGain();
      this.bgmGainNode.gain.value = 0;
      this.bgmGainNode.connect(this.audioContext.destination);

      const response = await fetch(this.bgmUrl);
      if (!response.ok) throw new Error(`HTTP Error`);
      const arrayBuffer = await response.arrayBuffer();
      this.bgmBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("[Audio] Init Failed:", e);
    }
  }

  startLoopBGM() {
    // (元のコードと同じ)
    if (!this.audioContext || !this.bgmBuffer || this.isPlaying) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.bgmBuffer;
    source.loop = true;
    source.connect(this.bgmGainNode);
    source.start(0);
    this.isPlaying = true;
  }

  async toggleAudio() {
    // (元のコードと同じ)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!this.isPlaying) this.startLoopBGM();
    
    this.isMuted = !this.isMuted;
    const btn = document.getElementById("btn-audio-toggle");
    if (this.isMuted) {
      if (this.bgmGainNode) this.bgmGainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
      if (btn) {
          btn.textContent = "🔇 BGM: OFF";
          btn.style.opacity = "0.5";
      }
    } else {
      if (this.bgmGainNode) this.bgmGainNode.gain.setTargetAtTime(this.defaultVolume, this.audioContext.currentTime, 0.1);
      if (btn) {
          btn.textContent = "🔊 BGM: ON";
          btn.style.opacity = "1.0";
      }
    }
  }

  init() {
    // アクションのバインド (開始、リトライ、リタイアのみ)
    this.ui.bindActions({
      onStartGame: (name) => this.handleStartGame(name),
      onRetry: () => this.handleRetry(),
      onRetire: () => this.handleRetire(),
      onBackToHome: () => this.handleBackToHome(),
    });

    // オーディオボタン
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => this.toggleAudio());
    }

    // ▼▼▼ 修正: 初期化フローの簡略化 ▼▼▼
    // 常にゲストとして匿名ログインを行い、完了したらホーム画面を表示する
    this.firebase.authenticateAnonymously("Guest")
      .then((user) => {
        this.game.setAuthenticatedPlayer(user);
        this.ui.showScreen("home");
      })
      .catch((e) => {
        console.error("Auto login failed", e);
        this.ui.showErrorScreen("Login Failed", e);
      });
  }

  // ゲーム開始処理
  async handleStartGame(playerName) {
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");
    try {
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "none";

      // 既にログイン済みだが念のため再確認
      const user = await this.firebase.authenticateAnonymously("Guest");
      this.game.setAuthenticatedPlayer(user);

      // サーバー接続
      const joinData = await this.network.connect(user.uid, "Guest", this.isDebugMode);
      this.ui.showScreen("game");
      this.game.startGameLoop(joinData.worldConfig);
    } catch (error) {
      this.ui.showErrorScreen("接続失敗", error);
    }
  }

  async handleRetry() {
    this.ui.setLoadingText("再接続中...");
    this.ui.showScreen("loading");
    try {
      const joinData = await this.network.connect(this.game.userId, "Guest");
      this.ui.showScreen("game");
      this.game.startGameLoop(joinData.worldConfig);
    } catch (error) {
      this.ui.showErrorScreen("接続失敗", error);
    }
  }

  handleRetire() {
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) bgVideo.style.display = "block";

    this.game.stopGameLoop();
    this.network.stopListening();
    this.ui.showScreen("home");
  }

  handleBackToHome() {
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) bgVideo.style.display = "block";
    this.ui.showScreen("home");
  }
}