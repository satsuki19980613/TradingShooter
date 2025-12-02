export class Trading {
  constructor() {
    this.MAX_CHART_POINTS = 300;
    this.tradeState = {
      chartData: [],
      maData: { short: [], medium: [], long: [] },
      currentPrice: 1000,
      minPrice: 990,
      maxPrice: 1010,
    };

    this.selectedMaTypes = new Set(["medium"]);
  }

  toggleMaType(type, isChecked) {
    if (isChecked) {
      this.selectedMaTypes.add(type);
    } else {
      this.selectedMaTypes.delete(type);
    }
  }

  setFullChartData(state) {
    this.tradeState = state;
    if (Array.isArray(this.tradeState.maData)) {
      this.tradeState.maData = {
        short: this.tradeState.maData,
        medium: [],
        long: [],
      };
    }
  }

  addNewChartPoint(delta) {
    if (!this.tradeState.chartData) this.tradeState.chartData = [];
    if (!this.tradeState.maData)
      this.tradeState.maData = { short: [], medium: [], long: [] };

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
      const types = ["short", "medium", "long"];
      types.forEach((type) => {
        if (!this.tradeState.maData[type]) this.tradeState.maData[type] = [];

        const val = delta.newMaPoint[type];
        this.tradeState.maData[type].push(val);

        if (this.tradeState.maData[type].length > this.MAX_CHART_POINTS) {
          this.tradeState.maData[type].shift();
        }
      });
    }
  }

  drawChart(ctx, canvasWidth, canvasHeight, playerState) {
    const tradeState = this.tradeState;
    const chartData = tradeState.chartData || [];

    const currentPrice = tradeState.currentPrice || 1000;
    let minPrice = tradeState.minPrice || 990;
    let maxPrice = tradeState.maxPrice || 1010;

    if (chartData.length < 2) return;

    const padding = { top: 20, right: 60, bottom: 20, left: 10 };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    const visibleData = chartData;
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;

    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;
    const renderRange = maxPrice - minPrice;

    const getX = (index) =>
      chartX + (index / (visibleData.length - 1)) * chartWidth;
    const getY = (price) =>
      chartY + chartHeight - ((price - minPrice) / renderRange) * chartHeight;

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(visibleData[0]));
    for (let i = 1; i < visibleData.length; i++) {
      ctx.lineTo(getX(i), getY(visibleData[i]));
    }
    const lastPrice = visibleData[visibleData.length - 1];
    const firstPrice = visibleData[0];

    ctx.strokeStyle = lastPrice >= firstPrice ? "#00ff00" : "#ff0055";
    ctx.lineWidth = 1;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const maColors = {
      short: "#00e1ff",
      medium: "#e1ff00",
      long: "#ff00e1",
    };

    this.selectedMaTypes.forEach((type) => {
      const maList = tradeState.maData[type];
      if (!maList || maList.length === 0) return;

      ctx.beginPath();

      ctx.strokeStyle = (maColors[type] || "#ffffff") + "80";
      ctx.lineWidth = 1;

      let maStarted = false;

      for (let i = 0; i < visibleData.length; i++) {
        const offsetFromEnd = visibleData.length - 1 - i;
        const maIndex = maList.length - 1 - offsetFromEnd;

        if (maIndex < 0) continue;

        const val = maList[maIndex];

        if (val === null || val === undefined) {
          maStarted = false;
          continue;
        }

        const x = getX(i);
        const y = getY(val);

        if (!maStarted) {
          ctx.moveTo(x, y);
          maStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });

    const currentY = getY(currentPrice);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.moveTo(chartX, currentY);
    ctx.lineTo(chartX + chartWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (playerState && playerState.chargePosition) {
      const entryPrice = playerState.chargePosition.entryPrice;
      const type = playerState.chargePosition.type || "long";
      const isShort = type === "short";

      const entryY = getY(entryPrice);

      ctx.beginPath();

      const color = isShort ? "#ff0055" : "#00ff00";
      const mark = isShort ? "▼" : "▲";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      ctx.moveTo(chartX, entryY);
      ctx.lineTo(chartX + chartWidth, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = "bold 12px sans-serif";

      const labelText = `${mark} ${isShort ? "SHORT ENTRY" : "LONG ENTRY"}`;
      ctx.fillText(labelText, chartX + 5, entryY - 5);

      ctx.textAlign = "right";
      ctx.fillText(mark, chartX + chartWidth - 5, entryY - 5);
      ctx.textAlign = "left";
    }

    ctx.font = "bold 14px 'Roboto Mono', monospace";
    const priceText = currentPrice.toFixed(0);
    const textMetrics = ctx.measureText(priceText);
    const textHeight = 14;
    const textX = chartX + chartWidth + 5;
    const textY = Math.max(
      chartY + textHeight / 2,
      Math.min(currentY, chartY + chartHeight - textHeight / 2)
    );

    ctx.save();
    

    ctx.fillStyle =
      lastPrice >= (chartData[chartData.length - 2] || 0)
        ? "#00ff00"
        : "#ff0055";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, textX, textY);
    ctx.restore();
  }
}
