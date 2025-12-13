export class AccountManager {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.currentUser = null;
    this.onUserUpdated = null;
  }

  init(onUserUpdatedCallback) {
    this.onUserUpdated = onUserUpdatedCallback;

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
    await this.auth.recoverAccount(code);
  }
  async deleteUser() {
    await this.auth.deleteAccount();
    // 削除後は自動的に onAuthStateChanged が発火して null になり、初期画面へ戻るはずです
    location.reload(); 
  }
}
