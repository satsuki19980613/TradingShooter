import { FieldValue } from "firebase-admin/firestore";

/**
 * ゲームデータの永続化（DB保存）を担当するクラス
 * ServerGameから「保存の詳細」を隠蔽する
 */
export class ServerPersistenceManager {
  constructor(firestore) {
    this.firestore = firestore;
  }

  /**
   * スコアをFirestoreに保存・更新する
   * @param {string} userId
   * @param {string} name
   * @param {number} score
   */
  async saveScore(userId, name, score) {
    if (!this.firestore) {
      console.warn("[Persistence] Firestore instance is missing.");
      return;
    }

    const finalScore = Math.round(score);
    // スコアが0以下の場合は保存しない、などのビジネスロジックをここに集約できる
    if (finalScore <= 0) return;

    const rankDocRef = this.firestore.collection("ranking").doc(userId);

    try {
      await this.firestore.runTransaction(async (transaction) => {
        const docSnapshot = await transaction.get(rankDocRef);
        const currentData = docSnapshot.data();
        const currentHighScore =
          currentData && currentData.highScore ? currentData.highScore : 0;

        // ハイスコア更新時のみ書き込み
        if (finalScore > currentHighScore) {
          const newScoreData = {
            uid: userId,
            name: name,
            highScore: finalScore,
            lastPlayed: FieldValue.serverTimestamp(),
          };
          transaction.set(rankDocRef, newScoreData, { merge: true });
          console.log(`[Persistence] High score updated for ${name}: ${finalScore}`);
        } else {
          // スコア更新がなくてもプレイ日時は更新する
          if (docSnapshot.exists) {
            transaction.update(rankDocRef, {
              lastPlayed: FieldValue.serverTimestamp(),
            });
          }
        }
      });
    } catch (error) {
      console.error(
        `[Persistence] Failed to save score for ${name} (ID: ${userId}):`,
        error
      );
    }
  }
}