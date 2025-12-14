const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------
// 1. 引継ぎコードの発行 (Issue Transfer Code)
// ---------------------------------------------------------
exports.issueTransferCode = functions.https.onCall(async (data, context) => {
  // 自動認証チェック: ログインしていないユーザーは弾く
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;
  
  // コード生成 (6桁の英数字)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24時間有効

  try {
    // Firestoreに保存
    await db.collection("transfer_codes").doc(code).set({
      uid: uid,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });

    console.log(`[Transfer] Code issued for ${uid}: ${code}`);
    return { code: code };
    
  } catch (error) {
    console.error("[Transfer] Issue failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to issue code.");
  }
});

// ---------------------------------------------------------
// 2. 引継ぎの実行 (Recover Account)
// ---------------------------------------------------------
exports.recoverAccount = functions.https.onCall(async (data, context) => {
  const code = data.code;

  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Code is required.");
  }

  try {
    const docRef = db.collection("transfer_codes").doc(code.toUpperCase());
    const doc = await docRef.get();

    // コードの有効性チェック
    if (!doc.exists) {
      throw new functions.https.HttpsError("not-found", "Invalid code.");
    }

    const record = doc.data();
    if (record.expiresAt < Date.now()) {
      throw new functions.https.HttpsError("cancelled", "Code expired.");
    }

    const targetUid = record.uid;

    // 【重要】セキュリティ対策: 古い端末のセッションを無効化
    // これにより、元の端末(Device A)は次回アクセス時に拒否されます
    await admin.auth().revokeRefreshTokens(targetUid);

    // 引継ぎ用のカスタムトークンを発行
    // ※ Cloud Functionsのサービスアカウントにはデフォルトでこの権限があります
    const customToken = await admin.auth().createCustomToken(targetUid);

    // 使用済みコードを削除
    await docRef.delete();

    console.log(`[Transfer] Recovery successful for ${targetUid}`);
    return { customToken: customToken };

  } catch (error) {
    console.error("[Transfer] Recover failed:", error);
    // すでにHttpsErrorならそのまま投げ、それ以外はinternalエラーにする
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Recovery failed.");
  }
});