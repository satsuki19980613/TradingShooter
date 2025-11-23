
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut, 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Firebaseの認証とデータベースを管理するクラス
 */
export class FirebaseManager {
  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyD-ENfUOH8089F9r7OT96yCcm1DFudymHI",
      authDomain: "trading-charge-shooter.firebaseapp.com",
      projectId: "trading-charge-shooter",
      storageBucket: "trading-charge-shooter.firebasestorage.app",
      messagingSenderId: "765745474291",
      appId: "1:765745474291:web:eb2358adc707a81ca1e586",
      measurementId: "G-H1N0QJNQWE",
    };

    try {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      console.log("Firebase Manager (Firestore/Auth) が初期化されました。");
    } catch (error) {
      console.error("Firebase の初期化に失敗しました:", error);
      alert("Firebaseの初期化に失敗しました。設定を確認してください。");
    }
  }

  async signInWithCustomToken(token) {
    if (!this.auth) throw new Error("Auth未初期化");
    return await signInWithCustomToken(this.auth, token);
  }

  /**
   * 匿名認証でサインインし、プレイヤー名を登録する
   * @param {string} playerName
   * @returns {Promise<User>} Firebase User オブジェクト
   */
  async authenticateAnonymously(playerName) {
    if (!this.auth) throw new Error("Firebase Auth が初期化されていません。");

    try {
      const userCredential = await signInAnonymously(this.auth);
      const user = userCredential.user;
      console.log("匿名認証に成功:", user.uid);

      await updateProfile(user, {
        displayName: playerName,
      });
      console.log("プレイヤー名を設定:", playerName);

      return user;
    } catch (error) {
      console.error("匿名認証またはプロフィール更新に失敗:", error);
      throw error;
    }
  }

  /**
   * グローバルランキングを取得する
   * @returns {Promise<Array>} ランキングデータの配列
   */
  async fetchRanking() {
    if (!this.db) throw new Error("Firestore が初期化されていません。");

    console.log("ランキングデータを取得中...");

    try {
      const rankingColRef = collection(this.db, "ranking");

      const q = query(rankingColRef, orderBy("highScore", "desc"), limit(100));

      const querySnapshot = await getDocs(q);

      const rankingData = [];
      querySnapshot.forEach((doc) => {
        rankingData.push(doc.data());
      });

      console.log("ランキングの取得に成功:", rankingData);
      return rankingData;
    } catch (error) {
      console.error("ランキングの取得に失敗:", error);
      throw error;
    }
  }

  onAuthStateChanged(callback) {
    if (!this.auth) return;
    onAuthStateChanged(this.auth, callback);
  }

  async signOut() {
    if (!this.auth) return;
    try {
      await signOut(this.auth);
      console.log("サインアウトしました。");
    } catch (error) {
      console.error("サインアウト失敗:", error);
    }
  }
}