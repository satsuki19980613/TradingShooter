// src_v2/application/services/SessionMonitor.js

export class SessionMonitor {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.checkIntervalId = null;
    this.CHECK_INTERVAL_MS = 5000;
  }

  /**
   * セッション監視を開始する
   * 多重起動防止のため、既に動いている場合は一度停止してから再開します
   */
  start() {
    this.stop();

    this.checkIntervalId = setInterval(async () => {
      try {
        // FirebaseAuthAdapter経由、あるいは直接Authオブジェクトを参照してcurrentUserを確認
        // ※Adapterの構造上、this.auth.auth.currentUser でアクセス可能
        if (!this.auth.auth.currentUser) return;

        // forceRefresh: true でサーバーに問い合わせる
        await this.auth.auth.currentUser.getIdToken(true);
      } catch (error) {
        console.warn("[SessionMonitor] Session revoked or expired:", error);
        this.stop();
        
        // セッション切れ時の処理
        await this.auth.logout();
        alert("データが他の端末に引き継がれました。初期画面に戻ります。");
        location.reload();
      }
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * セッション監視を停止する
   */
  stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
}