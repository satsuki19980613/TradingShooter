/**
 * 【AppFlowManager】
 * 計算コスト削減・常時ループ再生特化版
 */
export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;

    // --- Web Audio API 管理用 ---
    this.audioContext = null;
    this.bgmGainNode = null;
    this.bgmBuffer = null;
    this.bgmSource = null;
    
    // 状態管理
    this.isPlaying = false; // 再生中かどうか
    this.isMuted = true;    // 初期状態はミュート（ボタンを押すまで鳴らさない）
    this.defaultVolume = 0.2;

    // BGMパス (Cloud Run内の public/audio/StellarSignals.mp3 を想定)
   this.bgmUrl = "https://trading-charge-shooter.web.app/audio/StellarSignals.mp3";

    // 起動時にオーディオシステムを準備
    this.initAudioSystem();
  }

  // 初期化とロード (デコードは最初の一回だけ行う)
  async initAudioSystem() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();

      // 音量調整ノード
      this.bgmGainNode = this.audioContext.createGain();
      this.bgmGainNode.gain.value = 0; // 最初は音量0
      this.bgmGainNode.connect(this.audioContext.destination);

      // ファイルをロード
      console.log("[Audio] Loading BGM...");
      const response = await fetch(this.bgmUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      this.bgmBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      console.log("[Audio] BGM Ready.");
    } catch (e) {
      console.error("[Audio] Init Failed:", e);
    }
  }

  // ★ BGMループ再生開始 (一度呼べばずっと回り続ける)
  startLoopBGM() {
    if (!this.audioContext || !this.bgmBuffer || this.isPlaying) return;

    // ソース作成
    const source = this.audioContext.createBufferSource();
    source.buffer = this.bgmBuffer;
    source.loop = true; // 永遠にループ
    source.connect(this.bgmGainNode);
    
    source.start(0);
    this.isPlaying = true;
    console.log("[Audio] BGM Loop Started.");
  }

  // ★ オーディオボタンが押された時の処理
  async toggleAudio() {
    // まだコンテキストがサスペンド(停止)していたら起こす (スマホ対策)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // まだ再生が始まっていなければ開始する
    if (!this.isPlaying) {
        this.startLoopBGM();
    }

    this.isMuted = !this.isMuted;
    const btn = document.getElementById("btn-audio-toggle");

    if (this.isMuted) {
      // OFF: 音量を0にする (再生は止めない＝負荷が低い)
      if (this.bgmGainNode) {
        this.bgmGainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
      }
      if (btn) {
        btn.textContent = "🔇 BGM: OFF";
        btn.style.opacity = "0.5";
      }
    } else {
      // ON: 音量を上げる
      if (this.bgmGainNode) {
        this.bgmGainNode.gain.setTargetAtTime(this.defaultVolume, this.audioContext.currentTime, 0.1);
      }
      if (btn) {
        btn.textContent = "🔊 BGM: ON";
        btn.style.opacity = "1.0";
      }
    }
  }

  init() {
    this.ui.bindActions({
      onStartGame: (name) => this.handleStartGame(name),
      onGuestLogin: () => this.handleGuestLogin(),
      onRegisterName: (name) => this.handleRegisterName(name),
      onRankingRequest: () => this.handleRankingRequest(),
      onRetry: () => this.handleRetry(),
      onRetire: () => this.handleRetire(),
      onBackToHome: () => this.handleBackToHome(),
      onIssueCode: () => this.handleIssueCode(),
      onRecoverAccount: (code) => this.handleRecoverAccount(code),
    });

    // オーディオボタンのイベント
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        this.toggleAudio();
      });
    }

    this.firebase.onAuthStateChanged(async (user) => {
      if (this.ui.isRegistering) return;

      if (user) {
        if (!user.displayName) {
          try { await user.reload(); } catch (e) {}
        }
        const name = (user.displayName && user.displayName !== "Guest") ? user.displayName : "Guest";
        this.ui.updateDisplayName(name);
        this.ui.hideInitialModal();
      } else {
        this.ui.updateDisplayName("Guest");
        this.ui.showInitialModal();
      }
    });
  }

  async handleStartGame(playerName) {
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");
    try {
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "none";

      const user = await this.firebase.authenticateAnonymously(playerName);
      this.game.setAuthenticatedPlayer(user);

      const joinData = await this.network.connect(user.uid, playerName, this.isDebugMode);
      this.ui.showScreen("game");
      this.game.startGameLoop(joinData.worldConfig);
    } catch (error) {
      this.ui.showErrorScreen("接続失敗", error);
    }
  }

  async handleGuestLogin() {
    try {
      const user = await this.firebase.authenticateAnonymously("Guest");
      this.game.setAuthenticatedPlayer(user);
      this.ui.updateDisplayName("Guest");
      this.ui.hideInitialModal();
      this.ui.showScreen("home");
    } catch (e) {
      alert("ゲストログイン失敗");
    }
  }

  async handleRegisterName(name) {
    this.ui.isRegistering = true;
    this.ui.setLoadingText("登録中...");
    try {
      const user = await this.firebase.authenticateAnonymously(name);
      this.game.setAuthenticatedPlayer(user);
      await this.network.connect(user.uid, name, this.isDebugMode);
      this.network.sendAccountAction("register_name", { name: name }, async (res) => {
        this.ui.isRegistering = false;
        if (res.success) {
          alert("ようこそ " + res.name + " さん！");
          this.ui.hideInitialModal();
          this.ui.hideRegisterModal();
          this.ui.updateDisplayName(res.name);
          this.network.disconnect();
          this.ui.showScreen("home");
        } else {
          alert("登録エラー: " + res.message);
          this.network.disconnect();
          await this.firebase.signOut();
        }
      });
    } catch (e) {
      this.ui.isRegistering = false;
      alert("エラーが発生しました: " + e.message);
      this.network.disconnect();
      await this.firebase.signOut();
    }
  }

  async handleRankingRequest() {
    this.ui.showScreen("loading");
    this.ui.setLoadingText("ランキング取得中...");
    this.ui.clearRankingList();
    try {
      const data = await this.firebase.fetchRanking();
      this.ui.displayRanking(data);
      this.ui.showScreen("ranking");
    } catch (error) {
      this.ui.showErrorScreen("取得失敗", error);
    }
  }

  async handleRetry() {
    this.ui.setLoadingText("再接続中...");
    this.ui.showScreen("loading");
    try {
      const joinData = await this.network.connect(this.game.userId, this.game.playerName);
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
    
    // BGM停止処理は削除しました (流しっぱなし)

    this.ui.showScreen("home");
  }

  handleBackToHome() {
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) bgVideo.style.display = "block";

    // BGM停止処理は削除しました (流しっぱなし)

    this.ui.showScreen("home");
  }

  handleIssueCode() { /* ... */ }
  handleRecoverAccount(code) { /* ... */ }
}