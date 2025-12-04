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
    this.currentSource = null;
    this.currentTrackIndex = -1;
    this.playableIndices = [1, 2, 3];
    this.shuffledQueue = [];
    this.isFirstTrackPlayed = false;
  }
  /**
   * ★新規追加: 曲名テロップを表示して、数秒後に隠す
   * (修正版: 表示ロジックをより確実に制御)
   */
  showMusicNotification(title) {
    const container = document.getElementById("music-notification");
    const titleEl = document.getElementById("music-title");

    if (!container || !titleEl) return;

    titleEl.textContent = title;

    if (this.notificationTimer) clearTimeout(this.notificationTimer);

    container.classList.remove("hidden");
    container.classList.remove("hide");

    container.offsetWidth;

    requestAnimationFrame(() => {
      container.classList.add("show");
    });

    this.notificationTimer = setTimeout(() => {
      container.classList.remove("show");

      setTimeout(() => container.classList.add("hidden"), 600);
    }, 5000);
  }
  playNextShuffle() {
    if (this.playableIndices.length === 0) return;

    if (this.shuffledQueue.length === 0) {
      const arr = [...this.playableIndices];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      this.shuffledQueue = arr;
    }

    const nextIndex = this.shuffledQueue.shift();
    this.playTrack(nextIndex);
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
  async loadAudio(url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error(`[Audio] Failed to load ${url}:`, e);
      return null;
    }
  }

  async startLoopBGM() {
    if (!this.audioContext || this.isPlaying) return;

    let trackToLoadIndex;
    if (!this.isFirstTrackPlayed) {
      trackToLoadIndex = 0;
    } else {
      return;
    }

    const track = this.playlist[trackToLoadIndex];
    this.bgmBuffer = await this.loadAudio(track.url);

    if (!this.bgmBuffer) {
      console.error("[Audio] Failed to load initial BGM track.");
      return;
    }

    this.showMusicNotification(track.title);

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = this.bgmBuffer;
    this.currentSource.loop = false;
    this.currentSource.connect(this.bgmGainNode);

    this.currentSource.onended = () => {
      if (this.isPlaying) {
        this.isFirstTrackPlayed = true;
        this.playNextShuffle();
      }
    };

    this.currentSource.start(0);
    this.isPlaying = true;
    this.currentTrackIndex = trackToLoadIndex;
  }

  async toggleAudio() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.isMuted = !this.isMuted;

    const btn = document.getElementById("btn-audio-toggle");

    if (!this.isMuted) {
      if (!this.isPlaying) {
        await this.startLoopBGM();
      }

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
    } else {
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
      console.error("[Audio] Failed to load BGM track:", title);

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
