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
    this.MA_PERIODS = { short: 20, medium: 50, long: 100 };
    this.chartData = [];
    this.currentPrice = 2000;
    this.minPrice = 1000;
    this.maxPrice = 1000;
    this.maData = { short: [], medium: [], long: [] };
  }

  /**
   * トレードシステムを初期化 (リセット)
   */
  init() {
    this.chartData = [];
    this.currentPrice = 800;
    this.maData = { short: [], medium: [], long: [] };
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

      newMaPoint: {
        short: this.maData.short[this.maData.short.length - 1],
        medium: this.maData.medium[this.maData.medium.length - 1],
        long: this.maData.long[this.maData.long.length - 1],
      },
    };
  }

  /**
   * 価格をランダムに更新
   */
  updatePrice() {
    let change;

    if (Math.random() < 0.005) {
      change = (Math.random() - 0.5) * 18;
    } else {
      const r = Math.random();

      if (r < 0.6) {
        change = (Math.random() - 0.5) * 0.23;
      } else if (r < 0.8) {
        change = (Math.random() - 0.5) * 0.6;
      } else {
        change = (Math.random() - 0.5) * 2;
      }
    }

    this.currentPrice += change;

    if (this.currentPrice < 200) this.currentPrice = 200;
    if (this.currentPrice > 5000) this.currentPrice = 5000;
  }
  /**
   * 最小/最大値と移動平均を計算する
   */
  /**
   * 最小/最大値と移動平均を計算する (全計算)
   */
  /**
   * 最小/最大値と移動平均を計算する (全計算)
   */
  calculateMetrics() {
    if (this.chartData.length < 1) return;

    this.minPrice = this.chartData[0];
    this.maxPrice = this.chartData[0];
    for (let i = 1; i < this.chartData.length; i++) {
      if (this.chartData[i] < this.minPrice) this.minPrice = this.chartData[i];
      if (this.chartData[i] > this.maxPrice) this.maxPrice = this.chartData[i];
    }

    const types = ["short", "medium", "long"];

    types.forEach((type) => {
      const period = this.MA_PERIODS[type];

      this.maData[type] = [];

      for (let i = 0; i < this.chartData.length; i++) {
        if (i < period - 1) {
          this.maData[type].push(null);
        } else {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += this.chartData[i - j];
          }
          this.maData[type].push(sum / period);
        }
      }
    });
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
  startCharge(player, type) {
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
        type: type,
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
    const type = player.chargePosition.type || "long";

    let priceDiff;
    if (type === "short") {
      priceDiff = player.chargePosition.entryPrice - this.currentPrice;
    } else {
      priceDiff = this.currentPrice - player.chargePosition.entryPrice;
    }

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

    const type = chargePosition.type || "long";
    let priceDiff;

    if (type === "short") {
      priceDiff = chargePosition.entryPrice - this.currentPrice;
    } else {
      priceDiff = this.currentPrice - chargePosition.entryPrice;
    }

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
