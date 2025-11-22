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

    const currentPrice = tradeState.currentPrice || 10000;
    let minPrice = tradeState.minPrice || 9900;
    let maxPrice = tradeState.maxPrice || 10100;

    if (chartData.length < 2) return;

    const chartWidth = Math.min(900, canvasWidth * 0.45);
    const chartHeight = Math.min(360, canvasHeight * 0.25);
    const chartX = 20;
    const chartY = canvasHeight - chartHeight - 20;
    ctx.save();
    ctx.fillStyle = "rgba(0, 50, 80, 0.3)";
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);

    const visibleData = chartData;

    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;

    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;

    const getX_Dynamic = (index) =>
      chartX + (index / (visibleData.length - 1)) * chartWidth;
    const getY = (price) =>
      chartY +
      chartHeight -
      ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;

    ctx.beginPath();
    ctx.moveTo(getX_Dynamic(0), getY(visibleData[0]));
    for (let i = 1; i < visibleData.length; i++) {
      ctx.lineTo(getX_Dynamic(i), getY(visibleData[i]));
    }

    const lastPrice = visibleData[visibleData.length - 1];
    const firstPrice = visibleData[0];
    ctx.strokeStyle = lastPrice >= firstPrice ? "#4caf4fb2" : "#f443369f";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(chartX, chartY, chartWidth, chartHeight);
    ctx.clip();

    const currentY = getY(currentPrice);
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.moveTo(chartX, currentY);
    ctx.lineTo(chartX + chartWidth, currentY);
    const lastPriceColor =
      lastPrice >= (chartData[chartData.length - 2] || 0)
        ? "#4caf50"
        : "#f44336";
    ctx.strokeStyle = lastPriceColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (playerState && playerState.chargePosition) {
      const entryPrice = playerState.chargePosition.entryPrice;
      const entryY = getY(entryPrice);

      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(chartX, entryY);
      ctx.lineTo(chartX + chartWidth, entryY);

      const isProfit = currentPrice > entryPrice;
      ctx.strokeStyle = isProfit ? "#4caf50" : "#f44336";

      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = "#00e1ffb0";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    let maStarted = false;
    for (let i = 0; i < visibleData.length; i++) {
      if (maData[i] === null || maData[i] === undefined) continue;

      const x = getX_Dynamic(i);
      const y = getY(maData[i]);

      if (!maStarted) {
        ctx.moveTo(x, y);
        maStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = lastPriceColor;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const textX = chartX + chartWidth + 5;
    const textY = Math.max(chartY, Math.min(currentY, chartY + chartHeight));
    ctx.fillText(currentPrice.toFixed(0), textX, textY);
    ctx.restore();
  }
}
