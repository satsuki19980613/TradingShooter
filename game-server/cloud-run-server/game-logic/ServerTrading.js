/**
 * 【ServerAccountManager の役割: アカウント・認証ロジック】
 * ユーザー名登録、引継ぎコード発行、アカウント復旧などの「メタデータ」を管理します。
 * * ■ 担当する責務 (Do):
 * - ユーザー名のバリデーションとDB登録
 * - 引継ぎコードの生成・ハッシュ化・保存
 * - アカウント復旧時のトークン発行
 * * ■ 担当しない責務 (Don't):
 * - ゲーム進行への関与
 * - WebSocketメッセージの直接送信 (戻り値を返すのみとし、呼び出し元が送信する)
 */
export class ServerTrading {
  constructor() {
    this.MIN_BET = 10;
    this.MAX_CHART_POINTS = 300;
    this.MA_PERIOD = 20;
    this.chartData = [];
    this.currentPrice = 1000;
    this.minPrice = 1000;
    this.maxPrice = 1000;
    this.maData = [];
  }

  /**
   * トレードシステムを初期化 (リセット)
   */
  init() {
    this.chartData = [];
    this.currentPrice = 1000;
    this.maData = [];

    for (let i = 0; i < this.MAX_CHART_POINTS; i++) {
      this.updatePrice();
      this.chartData.push(this.currentPrice);
      if (i === 0) {
        this.minPrice = this.currentPrice;
        this.maxPrice = this.currentPrice;
      }
    }

    this.calculateMetrics();
  }

  /**
   * チャートデータを更新 (ServerGame の chartLoop から呼ばれる)
   */
  updateChartData() {
    this.updatePrice();
    this.chartData.push(this.currentPrice);
    if (this.chartData.length > this.MAX_CHART_POINTS) {
      this.chartData.shift();
    }

    this.calculateMetrics();

    return {
      currentPrice: this.currentPrice,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      newChartPoint: this.chartData[this.chartData.length - 1],
      newMaPoint: this.maData[this.maData.length - 1],
    };
  }

  /**
   * 価格をランダムに更新
   */
  updatePrice() {
    let change;

    if (Math.random() < 0.01) {
      change = (Math.random() - 0.5) * 15;
    } else {
      change = (Math.random() - 0.5) * 2.5;
    }

    this.currentPrice += change;

    if (this.currentPrice < 200) this.currentPrice = 200;
    if (this.currentPrice > 3000) this.currentPrice = 3000;
  }

  /**
   * 最小/最大値と移動平均を計算する
   */
  calculateMetrics() {
    if (this.chartData.length < 1) return;

    this.minPrice = this.chartData[0];
    this.maxPrice = this.chartData[0];
    for (let i = 1; i < this.chartData.length; i++) {
      if (this.chartData[i] < this.minPrice) this.minPrice = this.chartData[i];
      if (this.chartData[i] > this.maxPrice) this.maxPrice = this.chartData[i];
    }

    const newMaData = [];
    for (let i = 0; i < this.chartData.length; i++) {
      if (i < this.MA_PERIOD - 1) {
        newMaData.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < this.MA_PERIOD; j++) {
          sum += this.chartData[i - j];
        }
        newMaData.push(sum / this.MA_PERIOD);
      }
    }
    this.maData = newMaData;
  }

  /**
   * サーバー側でBET額の調整 (ServerGame から呼ばれる)
   */
  handleBetInput(player, action) {
    if (player.chargePosition) return;

    if (action === "bet_up") {
      player.chargeBetAmount = Math.min(player.ep, player.chargeBetAmount + 10);
    } else if (action === "bet_down") {
      player.chargeBetAmount = Math.max(
        this.MIN_BET,
        player.chargeBetAmount - 10
      );
    } else if (action === "bet_all") {
      player.chargeBetAmount = Math.max(this.MIN_BET, player.ep);
    } else if (action === "bet_min") {
      player.chargeBetAmount = this.MIN_BET;
    }
  }

  /**
   * トレード (チャージ) を開始 (ServerGame から呼ばれる)
   */
  startCharge(player) {
    const playerEp = player.ep;
    const betAmount = player.chargeBetAmount;

    if (
      !player.chargePosition &&
      betAmount >= this.MIN_BET &&
      playerEp >= betAmount
    ) {
      player.chargePosition = {
        entryPrice: this.currentPrice,
        amount: betAmount,
      };
      return betAmount;
    }
    return 0;
  }

  /**
   * トレード (チャージ) を解放 (決済)
   * @param {ServerPlayer} player - プレイヤーインスタンス
   * @returns {object | null} - 決済結果 ( {type, ...} )
   */
  releaseCharge(player) {
    if (!player.chargePosition) return null;

    const betAmount = player.chargePosition.amount;

    const priceDiff = this.currentPrice - player.chargePosition.entryPrice;

    const powerValue = priceDiff * betAmount;

    let intPowerValue;
    if (powerValue > 0) {
      intPowerValue = Math.ceil(powerValue);
    } else {
      intPowerValue = Math.floor(powerValue);
    }

    player.chargePosition = null;

    if (intPowerValue > 0) {
      return {
        type: "profit",
        profitAmount: intPowerValue,
        betAmount: betAmount,
      };
    } else {
      return {
        type: "loss",
        lossAmount: Math.abs(intPowerValue),
      };
    }
  }

  /**
   * 決済後のBET額をリセット
   */
  resetBetAmount(player) {
    player.chargeBetAmount = Math.min(player.ep, this.MIN_BET);
  }

  /**
   * 現在の損益レベルを計算
   */
  calculateChargeLevel(chargePosition) {
    if (!chargePosition) return { level: 0, rawLevel: 0 };

    const priceDiff = this.currentPrice - chargePosition.entryPrice;
    let rawLevel =
      priceDiff * (chargePosition.amount / chargePosition.entryPrice);
    const level = Math.max(-chargePosition.amount, rawLevel);

    return { level, rawLevel };
  }

  /**
   * クライアントへのブロードキャスト用に、軽量な状態を返す
   */
  getState() {
    return {
      chartData: this.chartData,
      maData: this.maData,

      currentPrice: this.currentPrice,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
    };
  }
}
