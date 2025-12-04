/**
 * 【AppFlowManager】
 * 計算コスト削減・常時ループ再生特化版 + アカウント引継ぎ実装
 */
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
    this.bgmSource = null;
    
    
    this.isPlaying = false;
    this.isMuted = true;
    this.defaultVolume = 0.2;

    this.bgmUrl =  "https://trading-charge-shooter.web.app/audio/StellarSignals.mp3";
    this.initAudioSystem();
  }

  async initAudioSystem() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.bgmGainNode = this.audioContext.createGain();
      this.bgmGainNode.gain.value = 0;
      this.bgmGainNode.connect(this.audioContext.destination);

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

  startLoopBGM() {
    if (!this.audioContext || !this.bgmBuffer || this.isPlaying) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.bgmBuffer;
    source.loop = true;
    source.connect(this.bgmGainNode);
    source.start(0);
    this.isPlaying = true;
    console.log("[Audio] BGM Loop Started.");
  }

  async toggleAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!this.isPlaying) {
        this.startLoopBGM();
    }
    this.isMuted = !this.isMuted;
    const btn = document.getElementById("btn-audio-toggle");

    if (this.isMuted) {
      if (this.bgmGainNode) {
        this.bgmGainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
      }
      if (btn) {
        btn.textContent = "🔇 BGM: OFF";
        btn.style.opacity = "0.5";
      }
    } else {
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
      
      
      onTransferRequest: () => this.handleTransferRequest(), 
      onIssueCode: () => this.handleIssueCode(),
      onRecoverAccount: (code) => this.handleRecoverAccount(code),
    });

    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        this.toggleAudio();
      });
    }

    
    
    this.network.onAccountResponse = (res) => this.handleAccountResponse(res);

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

  

  /**
   * 引継ぎ画面が開かれた時の処理
   * サーバー未接続なら、一時的に接続してアカウント操作を行えるようにする
   */
  async handleTransferRequest() {
    
    if (this.network.ws && this.network.ws.readyState === WebSocket.OPEN) {
      return;
    }

    
    const name = this.ui.displayNameEl.textContent || "Guest";
    try {
        const user = await this.firebase.authenticateAnonymously(name);
        this.game.setAuthenticatedPlayer(user);
        
        await this.network.connect(user.uid, name, this.isDebugMode);
        console.log("[AppFlow] Account Action Connection Established.");
    } catch (e) {
        console.error("Temp Connect Error", e);
        alert("サーバー接続エラー: " + e.message);
    }
  }

  /**
   * 引継ぎコード発行リクエスト
   */
  handleIssueCode() {
    
    this.network.sendAccountAction("issue_code", {}, (res) => this.handleAccountResponse(res));
  }

  /**
   * アカウント復旧リクエスト
   */
  handleRecoverAccount(code) {
    this.network.sendAccountAction("recover", { code: code }, (res) => this.handleAccountResponse(res));
  }

  /**
   * サーバーからのアカウント操作レスポンスを一括ハンドリング
   */
  handleAccountResponse(response) {
    if (!response) return;

    
    if (response.subtype === "issue_code") {
      if (response.success) {
        
        if (this.ui.accountTransferManager) {
            this.ui.accountTransferManager.displayIssuedCode(response.code);
        } else {
            
            const display = document.getElementById("transfer-code-display");
            if (display) display.textContent = response.code;
        }
      } else {
        alert("コード発行エラー: " + response.message);
      }
    }
    
    
    else if (response.subtype === "recover") {
      if (response.success) {
        alert("復旧成功: " + response.name + " さんとしてログインします。");
        
        location.reload();
      } else {
        alert("復旧エラー: " + response.message);
      }
    }

    
    else if (response.subtype === "register_name") {
        if (!response.success) {
            
            console.warn("Register Name Error via handler:", response.message);
        }
    }
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
    this.ui.showScreen("home");
  }

  handleBackToHome() {
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) bgVideo.style.display = "block";
    this.ui.showScreen("home");
  }
}