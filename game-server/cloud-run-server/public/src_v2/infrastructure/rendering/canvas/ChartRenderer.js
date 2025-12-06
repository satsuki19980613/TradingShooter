/**
 * チャート描画レンダラー
 */
export class ChartRenderer {
  draw(ctx, width, height, tradeState, playerState) {
    const chartData = tradeState.chartData || [];
    if (chartData.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr; 
    const padding = { top: 10 * ratio, right: 30 * ratio, bottom: 5 * ratio, left: 0 };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    let minPrice = tradeState.minPrice || 990;
    let maxPrice = tradeState.maxPrice || 1010;
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;
    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;
    const renderRange = maxPrice - minPrice;

    const px = (val) => Math.floor(val) + 0.5;
    const getX = (index) => chartX + (index / (chartData.length - 1)) * chartWidth;
    const getY = (price) => chartY + chartHeight - ((price - minPrice) / renderRange) * chartHeight;

    ctx.clearRect(0, 0, width, height);

    // Main Line
    ctx.beginPath();
    ctx.moveTo(px(getX(0)), px(getY(chartData[0])));
    for (let i = 1; i < chartData.length; i++) {
      ctx.lineTo(px(getX(i)), px(getY(chartData[i])));
    }
    const currentPrice = tradeState.currentPrice;
    const lastPrice = chartData[chartData.length - 1];
    const firstPrice = chartData[0];
    ctx.strokeStyle = lastPrice >= firstPrice ? "#00ff00" : "#ff0055";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // MAs
    const maColors = { short: "#00e1ff", medium: "#e1ff00", long: "#ff00e1" };
    ["short", "medium", "long"].forEach(type => {
        const maList = tradeState.maData[type];
        if (!maList || maList.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = (maColors[type] || "#ffffff") + "80";
        ctx.lineWidth = 1.5;
        let started = false;
        for (let i = 0; i < chartData.length; i++) {
            const offset = chartData.length - 1 - i;
            const maIndex = maList.length - 1 - offset;
            if (maIndex < 0) continue;
            const val = maList[maIndex];
            if (val === null) { started = false; continue; }
            if (!started) { ctx.moveTo(px(getX(i)), px(getY(val))); started = true; }
            else { ctx.lineTo(px(getX(i)), px(getY(val))); }
        }
        ctx.stroke();
    });

    // Entry Line
    if (playerState && playerState.chargePosition) {
        const entryPrice = playerState.chargePosition.entryPrice;
        const entryY = getY(entryPrice);
        const isShort = playerState.chargePosition.type === "short";
        const color = isShort ? "#ff0055" : "#00ff00";
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.moveTo(px(chartX), px(entryY));
        ctx.lineTo(px(chartX + chartWidth), px(entryY));
        ctx.stroke();
        ctx.setLineDash([]);
    }
  }
}