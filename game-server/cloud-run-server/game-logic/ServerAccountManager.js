import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export class ServerAccountManager {
  constructor(firestore) {
    this.firestore = firestore;
  }

  /**
   * ユーザー名を登録する（初回のみ、一意性チェックあり）
   * @param {string} uid - Firebase User ID
   * @param {string} requestedName - 希望する名前
   * @returns {Promise<{success: boolean, message?: string, name?: string}>}
   */
  async registerName(uid, requestedName) {
    // 1. 名前のバリデーション (文字数、禁止文字など)
    if (!requestedName || requestedName.length < 3 || requestedName.length > 12) {
      return { success: false, message: "名前は3文字以上12文字以下にしてください。" };
    }
    if (requestedName.toLowerCase() === "guest") {
        return { success: false, message: "その名前は使用できません。" };
    }
    // 使用可能文字の制限 (例: 英数字と一部記号のみ) ※必要に応じて調整
    const nameRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!nameRegex.test(requestedName)) {
      return { success: false, message: "英数字、アンダースコア、ハイフンのみ使用できます。" };
    }

    const userRef = this.firestore.collection("users").doc(uid);
    const usernameRef = this.firestore.collection("usernames").doc(requestedName.toLowerCase()); // 小文字で正規化して管理

    try {
      const result = await this.firestore.runTransaction(async (t) => {
        // A. ユーザーが既に名前を持っているかチェック (変更不可の強制)
        const userDoc = await t.get(userRef);
        if (userDoc.exists && userDoc.data().isNameFinalized) {
          throw new Error("NAME_ALREADY_SET");
        }

        // B. 名前が既に使用されていないかチェック (一意性の保証)
        const usernameDoc = await t.get(usernameRef);
        if (usernameDoc.exists) {
          throw new Error("NAME_TAKEN");
        }

        // C. 書き込み実行
        // usersコレクションへの保存
        t.set(userRef, {
          displayName: requestedName,
          isNameFinalized: true, // 名前変更不可フラグ
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // usernamesコレクションへの予約 (逆引き用)
        t.set(usernameRef, {
          uid: uid,
          originalName: requestedName,
          createdAt: FieldValue.serverTimestamp()
        });

        return requestedName;
      });

      return { success: true, name: result };

    } catch (error) {
      if (error.message === "NAME_ALREADY_SET") {
        return { success: false, message: "名前は一度しか設定できません。" };
      }
      if (error.message === "NAME_TAKEN") {
        return { success: false, message: "その名前は既に使用されています。" };
      }
      console.error("Name registration error:", error);
      return { success: false, message: "サーバーエラーが発生しました。" };
    }
  }

  /**
   * 引継ぎコードを発行する
   * @param {string} uid 
   * @returns {Promise<string>} ユーザーに見せる平文のコード
   */
  async issueTransferCode(uid) {
    // ランダムなコード生成 (例: 12文字の16進数)
    const rawCode = crypto.randomBytes(6).toString('hex').toUpperCase(); // 例: A1B2C3D4E5F6
    
    // ハッシュ化 (SHA-256)
    const hashedCode = crypto.createHash('sha256').update(rawCode).digest('hex');

    const userRef = this.firestore.collection("users").doc(uid);

    // DBにハッシュ値を保存
    await userRef.set({
      transferCode: hashedCode,
      transferCodeUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return rawCode; // ユーザーには平文を返す
  }

  /**
   * 引継ぎコードを使ってアカウントを復旧する
   * @param {string} inputCode - ユーザーが入力したコード
   * @returns {Promise<{success: boolean, token?: string, message?: string}>}
   */
  async recoverAccount(inputCode) {
    if (!inputCode) return { success: false, message: "コードを入力してください。" };

    // 入力されたコードをハッシュ化して検索
    const hashedInput = crypto.createHash('sha256').update(inputCode.toUpperCase()).digest('hex');

    // transferCodeフィールドが一致するユーザーを検索
    const usersRef = this.firestore.collection("users");
    const snapshot = await usersRef.where("transferCode", "==", hashedInput).limit(1).get();

    if (snapshot.empty) {
      return { success: false, message: "コードが無効です。" };
    }

    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    // カスタムトークンの発行 (Firebase Admin SDK)
    try {
      const customToken = await getAuth().createCustomToken(uid);
      return { 
        success: true, 
        token: customToken, 
        name: userData.displayName || "Unknown"
      };
    } catch (error) {
      console.error("Token creation error:", error);
      return { success: false, message: "トークンの発行に失敗しました。" };
    }
  }
}