import { BGM_PLAYLIST } from "../playlist.js";

export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;

    // BGM用: HTML5 Audio要素を使用（メモリ負荷が低い）
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = false; // 自前で次曲再生を制御するためfalse
    this.bgmAudio.volume = 0.2; // 初期音量

    // AudioContextはSE用などに残すが、BGMには使わない
    this.audioContext = null; 

    this.isPlaying = false;
    this.isMuted = true;
    this.defaultVolume = 0.2;
    this.playlist = BGM_PLAYLIST;

    // 状態フラグ
    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;

    this.currentTrackIndex = -1;
    this.playableIndices = [1, 2, 3];
    this.shuffledQueue = [];
    this.isFirstTrackPlayed = false;
    this.notificationTimer = null;
    this.isConnecting = false;

    // BGM終了時のイベント
    this.bgmAudio.addEventListener("ended", () => {
        if (this.isPlaying) {
            if (!this.isFirstTrackPlayed) this.isFirstTrackPlayed = true;
            this.playNextShuffle();
        }
    });

    // エラーハンドリング
    this.bgmAudio.addEventListener("error", (e) => {
        console.warn("BGM Error:", e);
        // エラーが出たら次の曲へ
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
    
    // まだ準備できていない場合 -> ロード開始シーケンスへ
    if (!this.isAudioLoaded) {
        await this.startLoadingSequence(btn);
        return;
    }

    // ON/OFF 切り替え
    this.isMuted = !this.isMuted;
    
    if (!this.isMuted) {
      // ON
      if (!this.isPlaying) {
        this.startLoopBGM();
      }
      this.bgmAudio.volume = this.defaultVolume;
      
      if (btn) {
        btn.textContent = "🔊 BGM: ON";
        btn.style.opacity = "1.0";
      }
    } else {
      // OFF
      this.bgmAudio.volume = 0;
      if (btn) {
        btn.textContent = "🔇 BGM: OFF";
        btn.style.opacity = "0.5";
      }
    }
  }

  async startLoadingSequence(btn) {
    this.isAudioLoading = true;
    if (btn) btn.textContent = "⏳ LOADING...";

    const barContainer = document.getElementById("audio-loading-container");
    const barFill = document.getElementById("audio-loading-bar");
    if (barContainer) barContainer.style.display = "block";

    // ★重要: HTML5 Audioの場合、全曲デコードは不要。
    // その代わり、ブラウザキャッシュに乗せるために「fetchだけ」しておくのが効果的です。
    // これにより、再生時の通信ラグを防ぎます。
    let loadedCount = 0;
    const totalCount = this.playlist.length;

    for (const track of this.playlist) {
        try {
            await fetch(track.url, { method: 'HEAD' }); // 存在確認と接続確立
            // 必要なら blob で取得しても良いが、ストリーミングの利点が薄れるため
            // ここでは簡易的な接続チェック程度、あるいは軽量なプリフェッチに留める
        } catch (e) {
            console.warn(`Pre-fetch failed for ${track.title}`, e);
        }
        
        loadedCount++;
        const percent = (loadedCount / totalCount) * 100;
        if (barFill) barFill.style.width = `${percent}%`;
        
        // UI更新のために少し待機（演出）
        await new Promise(r => setTimeout(r, 50)); 
    }

    console.log("[Audio] Ready to stream.");
    this.isAudioLoaded = true;
    this.isAudioLoading = false;
    this.isMuted = false;

    setTimeout(() => {
        if (barContainer) barContainer.style.display = "none";
    }, 500);

    if (btn) {
        btn.textContent = "🔊 BGM: ON";
        btn.style.opacity = "1.0";
    }

    this.bgmAudio.volume = this.defaultVolume;
    this.startLoopBGM();

    if (this.pendingGameStartName) {
        this.ui.setLoadingText("音楽の準備完了。接続中...");
        this.handleStartGame(this.pendingGameStartName);
        this.pendingGameStartName = null;
    }
  }

  playTrack(index) {
    const track = this.playlist[index];
    const url = track.url;
    const title = track.title;

    console.log(`[Audio] Streaming: ${title}`);
    this.showMusicNotification(title);

    // ★HTML5 Audioでの再生
    this.bgmAudio.src = url;
    
    // 再生試行（ブラウザの自動再生ポリシー対策）
    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                this.isPlaying = true;
                this.currentTrackIndex = index;
            })
            .catch((error) => {
                console.warn("Auto-play prevented:", error);
                this.isPlaying = false;
            });
    } else {
        this.isPlaying = true;
        this.currentTrackIndex = index;
    }
  }

  startLoopBGM() {
    if (this.isPlaying) return;
    let trackToLoadIndex = !this.isFirstTrackPlayed ? 0 : this.shuffledQueue[0] || 0;
    this.playTrack(trackToLoadIndex);
  }

  // ... (showMusicNotification, init, handleStartGameなどは変更なし、そのまま記述) ...
  
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

  // ★修正: 二重ログイン防止のためのフラグと切断処理を追加
  async handleStartGame(playerName) {
    // 1. すでに接続処理中なら何もしない（連打防止）
    if (this.isConnecting) return;
    
    // BGMロード中なら待機フラグを立てて終了
    if (this.isAudioLoading) {
        this.pendingGameStartName = playerName;
        this.ui.showScreen("loading");
        this.ui.setLoadingText("音楽データを準備中...");
        return;
    }

    this.isConnecting = true; // ★ロック開始
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");

    try {
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "none";

      // 2. 念のため既存の接続があれば切断する
      this.network.disconnect();

      // 3. すでに認証済みなら再利用する（重要）
      let user;
      if (this.game.userId) {
          user = { uid: this.game.userId, displayName: this.game.playerName };
      } else {
          user = await this.firebase.authenticateAnonymously("Guest");
          this.game.setAuthenticatedPlayer(user);
      }

      const joinData = await this.network.connect(
        user.uid,
        "Guest", // playerName は固定または引数を使用
        this.isDebugMode
      );

      this.ui.showScreen("game");
      this.game.startGameLoop(joinData.worldConfig);

    } catch (error) {
      this.ui.showErrorScreen("接続失敗", error);
      this.pendingGameStartName = null;
    } finally {
      this.isConnecting = false; // ★ロック解除
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