import { BGM_PLAYLIST } from "../playlist.js";
export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;

    this.audioContext = null;
    this.bgmGainNode = null;
    this.bgmBuffer = null;
    this.isPlaying = false;
    this.isMuted = true;
    this.defaultVolume = 0.2;
    this.playlist = BGM_PLAYLIST;
    this.initAudioSystem();
  }

  async initAudioSystem() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.bgmGainNode = this.audioContext.createGain();

      this.bgmGainNode.gain.value = this.isMuted ? 0 : this.defaultVolume;
      this.bgmGainNode.connect(this.audioContext.destination);
    } catch (e) {
      console.error("[Audio] Init Failed:", e);
    }
  }

  startLoopBGM() {
    if (!this.audioContext || !this.bgmBuffer || this.isPlaying) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.bgmBuffer;
    source.loop = true;
    source.connect(this.bgmGainNode);
    source.start(0);
    this.isPlaying = true;
  }

  async toggleAudio() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    if (!this.isPlaying) this.startLoopBGM();

    this.isMuted = !this.isMuted;
    const btn = document.getElementById("btn-audio-toggle");
    if (this.isMuted) {
      if (this.bgmGainNode)
        this.bgmGainNode.gain.setTargetAtTime(
          0,
          this.audioContext.currentTime,
          0.1
        );
      if (btn) {
        btn.textContent = "🔇 BGM: OFF";
        btn.style.opacity = "0.5";
      }
    } else {
      if (this.bgmGainNode)
        this.bgmGainNode.gain.setTargetAtTime(
          this.defaultVolume,
          this.audioContext.currentTime,
          0.1
        );
      if (btn) {
        btn.textContent = "🔊 BGM: ON";
        btn.style.opacity = "1.0";
      }
    }
  }

  init() {
    this.ui.bindActions({
      onStartGame: (name) => this.handleStartGame(name),
      onRetry: () => this.handleRetry(),
      onRetire: () => this.handleRetire(),
      onBackToHome: () => this.handleBackToHome(),
    });

    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => this.toggleAudio());
    }

    this.firebase
      .authenticateAnonymously("Guest")
      .then((user) => {
        this.game.setAuthenticatedPlayer(user);
        this.ui.showScreen("home");
      })
      .catch((e) => {
        console.error("Auto login failed", e);
        this.ui.showErrorScreen("Login Failed", e);
      });
  }

  async handleStartGame(playerName) {
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");
    try {
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "none";

      const user = await this.firebase.authenticateAnonymously("Guest");
      this.game.setAuthenticatedPlayer(user);

      const joinData = await this.network.connect(
        user.uid,
        "Guest",
        this.isDebugMode
      );
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
  /**
   * トラック再生のメイン処理 (修正版)
   */
  async playTrack(index) {
    if (!this.audioContext) return;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }

    const track = this.playlist[index];
    const url = track.url;
    const title = track.title;

    console.log(`[Audio] Playing: ${title}`);

    this.showMusicNotification(title);

    const buffer = await this.loadAudio(url);
    if (!buffer) {
      setTimeout(() => this.playNextShuffle(), 1000);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(this.bgmGainNode);

    source.onended = () => {
      if (this.isPlaying) {
        this.playNextShuffle();
      }
    };

    source.start(0);
    this.currentSource = source;
    this.isPlaying = true;
    this.currentTrackIndex = index;
  }

  /**
   * ★新規追加: 曲名テロップを表示して、数秒後に隠す
   */
  showMusicNotification(title) {
    const container = document.getElementById("music-notification");
    const titleEl = document.getElementById("music-title");

    if (!container || !titleEl) return;

    titleEl.textContent = title;

    container.classList.remove("hidden");

    requestAnimationFrame(() => {
      container.classList.add("show");
    });

    if (this.notificationTimer) clearTimeout(this.notificationTimer);

    this.notificationTimer = setTimeout(() => {
      container.classList.remove("show");

      setTimeout(() => container.classList.add("hidden"), 600);
    }, 5000);
  }
}
