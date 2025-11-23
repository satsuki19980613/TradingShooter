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
    if (
      !requestedName ||
      requestedName.length < 3 ||
      requestedName.length > 12
    ) {
      return {
        success: false,
        message: "名前は3文字以上12文字以下にしてください。",
      };
    }
    if (requestedName.toLowerCase() === "guest") {
      return { success: false, message: "その名前は使用できません。" };
    }

    const nameRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!nameRegex.test(requestedName)) {
      return {
        success: false,
        message: "英数字、アンダースコア、ハイフンのみ使用できます。",
      };
    }

    const userRef = this.firestore.collection("users").doc(uid);
    const usernameRef = this.firestore
      .collection("usernames")
      .doc(requestedName.toLowerCase());

    try {
      const result = await this.firestore.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (userDoc.exists && userDoc.data().isNameFinalized) {
          throw new Error("NAME_ALREADY_SET");
        }

        const usernameDoc = await t.get(usernameRef);
        if (usernameDoc.exists) {
          throw new Error("NAME_TAKEN");
        }

        t.set(
          userRef,
          {
            displayName: requestedName,
            isNameFinalized: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        t.set(usernameRef, {
          uid: uid,
          originalName: requestedName,
          createdAt: FieldValue.serverTimestamp(),
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
    const rawCode = crypto.randomBytes(6).toString("hex").toUpperCase();

    const hashedCode = crypto
      .createHash("sha256")
      .update(rawCode)
      .digest("hex");

    const userRef = this.firestore.collection("users").doc(uid);

    await userRef.set(
      {
        transferCode: hashedCode,
        transferCodeUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return rawCode;
  }

  /**
   * 引継ぎコードを使ってアカウントを復旧する
   * @param {string} inputCode - ユーザーが入力したコード
   * @returns {Promise<{success: boolean, token?: string, message?: string}>}
   */
  async recoverAccount(inputCode) {
    if (!inputCode)
      return { success: false, message: "コードを入力してください。" };

    const hashedInput = crypto
      .createHash("sha256")
      .update(inputCode.toUpperCase())
      .digest("hex");

    const usersRef = this.firestore.collection("users");
    const snapshot = await usersRef
      .where("transferCode", "==", hashedInput)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, message: "コードが無効です。" };
    }

    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    try {
      const customToken = await getAuth().createCustomToken(uid);
      return {
        success: true,
        token: customToken,
        name: userData.displayName || "Unknown",
      };
    } catch (error) {
      console.error("Token creation error:", error);
      return { success: false, message: "トークンの発行に失敗しました。" };
    }
  }
}
