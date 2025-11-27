/**
 * アプリケーション全体のフロー（状態遷移）を管理するクラス
 * UI、ネットワーク、ゲームロジックの調整役
 */
export class AppFlowManager {
  constructor(game, uiManager, firebaseManager, networkManager) {
    this.game = game;
    this.ui = uiManager;
    this.firebase = firebaseManager;
    this.network = networkManager;
    this.isDebugMode = uiManager.isDebugMode;
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
    this.ui.setLoadingText("接続中...");
    this.ui.showScreen("loading");

    try {
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

  handleRetire() {
      this.game.stopGameLoop();
      this.network.stopListening();
      this.ui.showScreen("home");
  }

  // コード発行や復旧処理も同様に実装可能
  handleIssueCode() { /* ... */ }
  handleRecoverAccount(code) { /* ... */ }
}