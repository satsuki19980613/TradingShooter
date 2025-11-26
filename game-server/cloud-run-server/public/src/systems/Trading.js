export class Trading {
  constructor() {
    this.MAX_CHART_POINTS = 300;
    this.MA_PERIOD = 20;

    this.tradeState = {
      chartData: [],
      maData: [],
      currentPrice: 1000,
      minPrice: 990,
      maxPrice: 1010,
    };
  }

  setFullChartData(state) {
    this.tradeState = state;
  }

  addNewChartPoint(delta) {
    if (!this.tradeState.chartData) {
      this.tradeState.chartData = [];
    }
    if (!this.tradeState.maData) {
      this.tradeState.maData = [];
    }

    this.tradeState.currentPrice = delta.currentPrice;
    this.tradeState.minPrice = delta.minPrice;
    this.tradeState.maxPrice = delta.maxPrice;

    if (delta.newChartPoint !== undefined) {
      this.tradeState.chartData.push(delta.newChartPoint);
      if (this.tradeState.chartData.length > this.MAX_CHART_POINTS) {
        this.tradeState.chartData.shift();
      }
    }

    if (delta.newMaPoint !== undefined) {
      this.tradeState.maData.push(delta.newMaPoint);
      if (this.tradeState.maData.length > this.MAX_CHART_POINTS) {
        this.tradeState.maData.shift();
      }
    }
  }

  drawChart(ctx, canvasWidth, canvasHeight, playerState) {
    const tradeState = this.tradeState;
    const chartData = tradeState.chartData || [];
    const maData = tradeState.maData || [];

    const currentPrice = tradeState.currentPrice || 1000;
    let minPrice = tradeState.minPrice || 990;
    let maxPrice = tradeState.maxPrice || 1010;

    // データ不足時はリターン
    if (chartData.length < 2) return;

    // ★修正ポイント: キャンバス全体をチャート領域として使う
    // パディング（余白）を少し設ける
    const padding = { top: 20, right: 60, bottom: 20, left: 10 };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    // 背景（グリッド線など）
    ctx.save();
    // 背景クリアは呼び出し元で行っているが念のため透過で塗りつぶし
    // ctx.clearRect(0, 0, canvasWidth, canvasHeight); 

    const visibleData = chartData;
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;

    // 上下に少し余裕を持たせる
    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;
    const renderRange = maxPrice - minPrice;

    // 座標変換関数
    const getX = (index) => chartX + (index / (visibleData.length - 1)) * chartWidth;
    const getY = (price) => chartY + chartHeight - ((price - minPrice) / renderRange) * chartHeight;

    // --- チャート線の描画 ---
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(visibleData[0]));
    for (let i = 1; i < visibleData.length; i++) {
      ctx.lineTo(getX(i), getY(visibleData[i]));
    }

    const lastPrice = visibleData[visibleData.length - 1];
    const firstPrice = visibleData[0];
    // 上昇なら緑、下降なら赤
    ctx.strokeStyle = lastPrice >= firstPrice ? "#00ff00" : "#ff0055";
    ctx.lineWidth = 2; // ★線を太くして見やすく
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10; // ★発光エフェクト追加
    ctx.stroke();
    ctx.shadowBlur = 0; // リセット

    // --- 移動平均線 (MA) ---
    ctx.beginPath();
    ctx.strokeStyle = "#00e1ff80"; // 半透明のシアン
    ctx.lineWidth = 1;
    let maStarted = false;
    for (let i = 0; i < visibleData.length; i++) {
      if (maData[i] === null || maData[i] === undefined) continue;
      const x = getX(i);
      const y = getY(maData[i]);
      if (!maStarted) {
        ctx.moveTo(x, y);
        maStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // --- 現在価格ライン ---
    const currentY = getY(currentPrice);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.moveTo(chartX, currentY);
    ctx.lineTo(chartX + chartWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- エントリーライン（自分のポジション） ---
    if (playerState && playerState.chargePosition) {
      const entryPrice = playerState.chargePosition.entryPrice;
      const entryY = getY(entryPrice);
      const isProfit = currentPrice > entryPrice;

      ctx.beginPath();
      ctx.strokeStyle = isProfit ? "#00ff00" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(chartX, entryY);
      ctx.lineTo(chartX + chartWidth, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // --- 現在価格のテキスト表示 ---
    ctx.font = "bold 24px 'Roboto Mono', monospace"; // ★文字を大きく
    ctx.fillStyle = lastPrice >= (chartData[chartData.length - 2] || 0) ? "#00ff00" : "#ff0055";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    // チャートの右側に配置
    ctx.fillText(currentPrice.toFixed(0), chartX + chartWidth + 5, Math.max(chartY + 12, Math.min(currentY, chartY + chartHeight - 12)));
    
    ctx.restore();
  }
}
