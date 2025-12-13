import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithCustomToken,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// パスが間違っていないか確認してください
import { FirebaseConfig } from "../../core/config/FirebaseConfig.js";
import { UserEntity } from "../../domain/auth/UserEntity.js";

export class FirebaseAuthAdapter {
  constructor() {
    console.log("[AuthAdapter] Initializing with config:", FirebaseConfig); // デバッグ用ログ
    this.app = initializeApp(FirebaseConfig);
    this.auth = getAuth(this.app);
    this.currentUserEntity = UserEntity.createGuest();
  }
  async getIdToken() {
    if (!this.auth.currentUser) throw new Error("Not logged in");
    return await this.auth.currentUser.getIdToken(true);
  }

  /**
   * [Step 5] 引継ぎコードの発行リクエスト
   */
  async issueTransferCode() {
    const token = await this.getIdToken();
    
    // サーバーAPIを叩く
    const response = await fetch("/api/transfer/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    if (!response.ok) throw new Error("Failed to issue code");
    
    const data = await response.json();
    return data.code;
  }

  /**
   * [Step 5] コードを使って復旧（カスタムトークンでログイン）
   */
  async recoverAccount(code) {
    // 1. サーバーにコードを送ってカスタムトークンをもらう
    const response = await fetch("/api/transfer/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Recovery failed");
    }

    const data = await response.json();
    const customToken = data.customToken;

    // 2. カスタムトークンを使ってFirebaseにサインイン
    // これにより、クライアントのUser状態がコードに紐付いたアカウントに切り替わる
    await signInWithCustomToken(this.auth, customToken);
    
    return true;
  }

  /**
   * 認証状態の監視を開始
   * @param {Function} onUserChanged - (UserEntity) => void
   */
  observeAuthState(onUserChanged) {
    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (firebaseUser) {
        // ログイン済み (ゲスト or 登録済み)
        const name = firebaseUser.displayName || "Guest";
        // displayNameが "Guest" ならゲスト扱い、それ以外ならメンバー扱いというルール
        const isGuest = name === "Guest";
        
        this.currentUserEntity = isGuest 
          ? new UserEntity(firebaseUser.uid, "Guest", true)
          : UserEntity.createMember(firebaseUser.uid, name);
      } else {
        // 未ログイン
        this.currentUserEntity = null;
      }
      onUserChanged(this.currentUserEntity);
    });
  }

  /**
   * ゲストとしてログイン (匿名認証)
   */
  async loginAsGuest() {
    try {
      const result = await signInAnonymously(this.auth);
      // 初回は名前がないので "Guest" を設定しておく
      if (!result.user.displayName) {
        await updateProfile(result.user, { displayName: "Guest" });
      }
      return result.user;
    } catch (error) {
      console.error("[Auth] Guest login failed:", error);
      throw error;
    }
  }

  /**
   * プレイヤー名の登録（ゲストからの昇格）
   */
  async registerName(name) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No user logged in.");
    
    try {
      await updateProfile(user, { displayName: name });
      // ステート更新のためにリロードするか、手動で通知を発火させる運用になる
      return true;
    } catch (error) {
      console.error("[Auth] Name registration failed:", error);
      throw error;
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    await signOut(this.auth);
  }
  async deleteAccount() {
    const user = this.auth.currentUser;
    if (user) {
      await deleteUser(user);
    }
  }
}