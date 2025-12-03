/**
 * 【AppFlowManager の役割: コントローラー (Controller)】
 * アプリケーション全体の状態遷移（フロー）を管理し、各マネージャーを調整します。
 * * ■ 担当する責務 (Do):
 * - アプリの起動シーケンス (認証 → 接続 → ゲーム開始)
 * - UIイベント(ボタン押下)に対するロジックの実行
 * - 外部システム (Firebase, Network, Game) の連携
 * * ■ 担当しない責務 (Don't):
 * - 描画処理 (UI / Canvas)
 * - ゲーム内の物理演算やエンティティ更新
 */
export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;
    this.bgmAudio = document.getElementById("bg-music");
    if (this.bgmAudio) {
        this.bgmAudio.volume = 0.3; // 音量を30%に設定（適宜調整）
    }
  
  }

  init() {
    // UIManager に「ボタンが押されたら何をするか」の定義（アクション）を渡す
    this.ui.bindActions({
      onStartGame: (name) => this.handleStartGame(name),
      onGuestLogin: () => this.handleGuestLogin(),
      onRegisterName: (name) => this.handleRegisterName(name),
      onIssueCode: () => this.handleIssueCode(),
      onRecoverAccount: (code) => this.handleRecoverAccount(code),
      onRankingRequest: () => this.handleRankingRequest(),
      onRetry: () => this.handleRetry(),
      onRetire: () => this.handleRetire(),
    });

    // 初期ログイン状態の監視
    this.firebase.onAuthStateChanged(async (user) => {
      // 登録処理中はスキップ(フラグ管理はUI側に任せるか、ここで管理するか要調整だが一旦UI依存)
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
    this.playBGM();
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

      // 一時接続して名前登録
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

  // 他のロジック（ランキング取得、引継ぎ、リトライなど）も同様に移動...
  // ※長くなるため、ここでは主要なフローのみ抜粋して実装します
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
  playBGM() {
    if (this.bgmAudio) {
      // ユーザーインタラクション内（クリックイベントなど）で呼ぶ必要があります
      this.bgmAudio.play().catch(e => {
        console.warn("BGM autoplay prevented:", e);
      });
    }
  }

  // ▼▼▼ BGM停止メソッド ▼▼▼
  stopBGM() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0; // 最初に戻す
    }
  }

  handleRetire() {
    const bgVideo = document.getElementById("bg-video");
      if (bgVideo) bgVideo.style.display = "block";
      this.game.stopGameLoop();
      this.network.stopListening();
      this.ui.showScreen("home");
  }

  // コード発行や復旧処理も同様に実装可能
  handleIssueCode() { /* ... */ }
  handleRecoverAccount(code) { /* ... */ }
}