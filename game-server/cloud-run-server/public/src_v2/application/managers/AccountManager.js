export class AccountManager {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.currentUser = null;
    this.onUserUpdated = null;
    this.sessionCheckInterval = null;
  }

  init(onUserUpdatedCallback) {
    this.onUserUpdated = onUserUpdatedCallback;
    
    this.auth.observeAuthState(async (userEntity) => {
      // 【追加】ログイン状態に応じて監視を開始・停止
      if (userEntity) {
        // ゲストでもメンバーでも、他の端末で引き継がれたら無効になるので監視する
        this.startSessionWatch();
      } else {
        this.stopSessionWatch();
      }

      this.currentUser = userEntity;
      if (this.onUserUpdated) {
        this.onUserUpdated(userEntity);
      }
    });
  }
    startSessionWatch() {
    this.stopSessionWatch(); // 多重起動防止
    
    // 5秒ごとにトークンの有効性を確認
    this.sessionCheckInterval = setInterval(async () => {
      try {
        if (!this.auth.auth.currentUser) return;
        // forceRefresh: true でサーバーに問い合わせる
        await this.auth.auth.currentUser.getIdToken(true);
      } catch (error) {
        console.warn("Session revoked:", error);
        this.stopSessionWatch();
        await this.auth.logout();
        alert("データが他の端末に引き継がれました。初期画面に戻ります。");
        location.reload();
      }
    }, 5000);
  }
  stopSessionWatch() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
  async loginGuest() {
    return await this.auth.loginAsGuest();
  }

  async registerPlayerName(name) {
    if (!name || name.length > 10) {
      throw new Error("Invalid name length");
    }

    if (!this.auth.auth.currentUser) {
      console.log(
        "[AccountManager] No user found. Creating guest account first..."
      );
      await this.auth.loginAsGuest();
    }

    await this.auth.registerName(name);

    location.reload();
  }

  async issueCode() {
    return await this.auth.issueTransferCode();
  }

  async recover(code) {
    if (!code || code.length < 4) throw new Error("Invalid code format");
    this.stopSessionWatch();
    await this.auth.recoverAccount(code);
  }
  async deleteUser() {
    try {
      await this.auth.deleteAccount();
      alert("アカウントとデータを削除しました。");
      location.reload();
    } catch (error) {
      console.error("Delete failed:", error);

      if (error.code === "auth/requires-recent-login") {
        alert(
          "セキュリティ保護のため、再ログインが必要です。ページをリロードしますので、もう一度削除操作を行ってください。"
        );

        await this.auth.logout();
        location.reload();
      } else {
        alert("削除中にエラーが発生しました: " + error.message);
        location.reload();
      }
    }
  }
}
