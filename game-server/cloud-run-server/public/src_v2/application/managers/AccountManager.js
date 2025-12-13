// src_v2/application/managers/AccountManager.js

export class AccountManager {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.currentUser = null;
    this.onUserUpdated = null; // コールバック
  }

  init(onUserUpdatedCallback) {
    this.onUserUpdated = onUserUpdatedCallback;
    
    // 認証状態の監視を開始
    this.auth.observeAuthState((userEntity) => {
      console.log("[AccountManager] User State Changed:", userEntity);
      this.currentUser = userEntity;
      if (this.onUserUpdated) {
        this.onUserUpdated(userEntity);
      }
    });
  }

  async loginGuest() {
    return await this.auth.loginAsGuest();
  }

  async registerPlayerName(name) {
    if (!name || name.length > 10) {
      throw new Error("Invalid name length");
    }
    await this.auth.registerName(name);
    // Note: onAuthStateChangedが発火しない場合があるので、リロードするか手動更新が必要
    // 今回はシンプルにリロード戦略を取るか、別途検討
    location.reload(); 
  }
}