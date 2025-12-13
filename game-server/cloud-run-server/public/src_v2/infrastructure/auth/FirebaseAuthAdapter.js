import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  updateProfile
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
}