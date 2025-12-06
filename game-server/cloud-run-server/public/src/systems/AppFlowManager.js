import { BGM_PLAYLIST } from "../playlist.js";

export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;

    this.bgmAudio = new Audio();
    this.bgmAudio.loop = false;
    this.bgmAudio.volume = 0.2;

    this.audioContext = null;

    this.isPlaying = false;
    this.isMuted = true;
    this.defaultVolume = 0.2;
    this.playlist = BGM_PLAYLIST;

    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;

    this.currentTrackIndex = -1;
    this.playableIndices = [1, 2, 3];
    this.shuffledQueue = [];
    this.isFirstTrackPlayed = false;
    this.notificationTimer = null;
    this.isConnecting = false;

    this.bgmAudio.addEventListener("ended", () => {
      if (this.isPlaying) {
        if (!this.isFirstTrackPlayed) this.isFirstTrackPlayed = true;
        this.playNextShuffle();
      }
    });

    this.bgmAudio.addEventListener("error", (e) => {
      console.warn("BGM Error:", e);

      if (this.isPlaying) setTimeout(() => this.playNextShuffle(), 1000);
    });

    this.init();
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

  async toggleAudio() {
    if (this.isAudioLoading) return;
    const btn = document.getElementById("btn-audio-toggle");

    if (!this.isAudioLoaded) {
      await this.startLoadingSequence(btn);
      return;
    }

    this.isMuted = !this.isMuted;

    if (!this.isMuted) {
      this.bgmAudio.volume = this.defaultVolume;

      if (this.bgmAudio.paused) {
        if (!this.bgmAudio.src) {
          this.startLoopBGM();
        } else {
          this.bgmAudio.play().catch((e) => console.warn("Resume failed:", e));
        }
      }
      this.isPlaying = true;

      if (btn) {
        btn.textContent = "🔊 BGM: ON";
        btn.style.opacity = "1.0";
      }
    } else {
      this.bgmAudio.pause();
      this.isPlaying = false;

      if (btn) {
        btn.textContent = "🔇 BGM: OFF";
        btn.style.opacity = "0.5";
      }
    }
  }
// AppFlowManager.js

// AppFlowManager.js

  async startLoadingSequence(btn) {
    this.isAudioLoading = true;
    if (btn) btn.textContent = "⏳ LOADING...";

    // --- UI操作: ゲーム開始をブロックし、注意文を出す ---
    
    // 1. ローディングバーを表示
    const barContainer = document.getElementById("audio-loading-container");
    const barFill = document.getElementById("audio-loading-bar");
    if (barContainer) barContainer.style.display = "block";

    // 2. 「Join Game」ボタンを取得して無効化する
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn) {
        startBtn.disabled = true;       // クリック不可にする
        startBtn.style.opacity = "0.5"; // 半透明にして無効感を出す
        startBtn.style.cursor = "not-allowed";
    }

    // 3. 注意文を動的に生成して表示する
    // (HTMLをいじらなくて済むよう、ここで生成します)
    let warningEl = document.getElementById("bgm-warning-text");
    if (!warningEl && barContainer) {
        warningEl = document.createElement("p");
        warningEl.id = "bgm-warning-text";
        warningEl.style.color = "#ff9800"; // オレンジ色
        warningEl.style.fontSize = "12px";
        warningEl.style.marginTop = "8px";
        warningEl.style.textAlign = "center";
        warningEl.textContent = "※ BGMデータをダウンロード中です。完了するまで開始できません。";
        // バーの下（コンテナの直後）に挿入
        barContainer.parentNode.insertBefore(warningEl, barContainer.nextSibling);
    }
    if (warningEl) warningEl.style.display = "block";


    // --- ダウンロード処理 (変更なし) ---
    let loadedCount = 0;
    const totalCount = this.playlist.length;

    for (const track of this.playlist) {
      try {
        const response = await fetch(track.url);
        if (!response.ok) throw new Error(`Failed to load ${track.title}`);
        
        const blob = await response.blob();
        track.blobUrl = URL.createObjectURL(blob);

      } catch (e) {
        console.warn(`Pre-fetch failed for ${track.title}`, e);
      }

      loadedCount++;
      const percent = (loadedCount / totalCount) * 100;
      if (barFill) barFill.style.width = `${percent}%`;
      
      await new Promise((r) => setTimeout(r, 10));
    }

    console.log("[Audio] Ready to stream (Cached in Memory).");
    this.isAudioLoaded = true;
    this.isAudioLoading = false;
    this.isMuted = false;

    // --- 完了後のUI復帰 ---

    // バーを隠す
    setTimeout(() => {
      if (barContainer) barContainer.style.display = "none";
    }, 500);

    // 注意文を隠す
    if (warningEl) warningEl.style.display = "none";

    // 「Join Game」ボタンを有効化
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = "1.0";
        startBtn.style.cursor = "pointer";
    }

    // BGMボタンの表記を戻す
    if (btn) {
      btn.textContent = "🔊 BGM: ON";
      btn.style.opacity = "1.0";
    }

    // 再生開始
    this.bgmAudio.volume = this.defaultVolume;
    this.startLoopBGM();

    // もし「Join Game」を押した流れでロードが始まった場合のみ自動遷移
    // (ホームでBGMボタンを押しただけなら、ホームに留まる)
    if (this.pendingGameStartName) {
      this.ui.setLoadingText("音楽の準備完了。接続中...");
      this.handleStartGame(this.pendingGameStartName);
      this.pendingGameStartName = null;
    }
  }
// AppFlowManager.js 内の playTrack メソッドを修正

playTrack(index) {
    const track = this.playlist[index];
    const url = track.url;
    const title = track.title;

    console.log(`[Audio] Streaming: ${title}`);
    this.showMusicNotification(title);

    this.bgmAudio.src = url;

    const playPromise = this.bgmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // ★修正: 再生準備ができた時点で「現在ミュート(OFF)かどうか」を確認する
          if (this.isMuted) {
             this.bgmAudio.pause(); // ミュートなら即停止
             this.isPlaying = false;
          } else {
             this.isPlaying = true;
             this.currentTrackIndex = index;
          }
        })
        .catch((error) => {
          console.warn("Auto-play prevented:", error);
          this.isPlaying = false;
        });
    } else {
      // 古いブラウザ向けフォールバック（基本的には上の分岐に入ります）
      if (this.isMuted) {
          this.bgmAudio.pause();
          this.isPlaying = false;
      } else {
          this.isPlaying = true;
          this.currentTrackIndex = index;
      }
    }
  }
  startLoopBGM() {
    if (this.isPlaying) return;
    let trackToLoadIndex = !this.isFirstTrackPlayed
      ? 0
      : this.shuffledQueue[0] || 0;
    this.playTrack(trackToLoadIndex);
  }

  showMusicNotification(title) {
    const container = document.getElementById("music-notification");
    const titleEl = document.getElementById("music-title");
    if (!container || !titleEl) return;
    titleEl.textContent = title;
    container.classList.remove("hidden");
    void container.offsetWidth;
    requestAnimationFrame(() => {
      container.classList.add("show");
    });
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => {
      container.classList.remove("show");
      setTimeout(() => container.classList.add("hidden"), 600);
    }, 5000);
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
    if (this.isConnecting) return;

    if (this.isAudioLoading) {
      this.pendingGameStartName = playerName;
      this.ui.showScreen("loading");
      this.ui.setLoadingText("音楽データを準備中...");
      return;
    }

    this.isConnecting = true;
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");

    try {
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "none";

      this.network.disconnect();

      let user;
      if (this.game.userId) {
        user = { uid: this.game.userId, displayName: this.game.playerName };
      } else {
        user = await this.firebase.authenticateAnonymously("Guest");
        this.game.setAuthenticatedPlayer(user);
      }

      const joinData = await this.network.connect(
        user.uid,
        "Guest",
        this.isDebugMode
      );

      this.ui.showScreen("game");
      this.game.startGameLoop(joinData.worldConfig);
    } catch (error) {
      this.ui.showErrorScreen("接続失敗", error);
      this.pendingGameStartName = null;
    } finally {
      this.isConnecting = false;
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
