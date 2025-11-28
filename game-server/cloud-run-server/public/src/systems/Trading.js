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
    // ★変更: 複数選択用に Set で管理 (デフォルトで medium を選択状態に)
    this.selectedMaTypes = new Set(['medium']);
  }

  // ★追加: チェックボックスの切り替え用メソッド
  toggleMaType(type, isChecked) {
    if (isChecked) {
      this.selectedMaTypes.add(type);
    } else {
      this.selectedMaTypes.delete(type);
    }
  }

  // ... setFullChartData, addNewChartPoint は変更なし ...
  setFullChartData(state) {
    this.tradeState = state;
    if (Array.isArray(this.tradeState.maData)) {
        this.tradeState.maData = { short: this.tradeState.maData, medium: [], long: [] };
    }
  }

  addNewChartPoint(delta) {
    if (!this.tradeState.chartData) this.tradeState.chartData = [];
    if (!this.tradeState.maData) this.tradeState.maData = { short: [], medium: [], long: [] };

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
      const types = ['short', 'medium', 'long'];
      types.forEach(type => {
          if(!this.tradeState.maData[type]) this.tradeState.maData[type] = [];
          
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
    
    // 現在価格情報の取得
    const currentPrice = tradeState.currentPrice || 1000;
    let minPrice = tradeState.minPrice || 990;
    let maxPrice = tradeState.maxPrice || 1010;

    // データ不足時はリターン
    if (chartData.length < 2) return;

    // パディング設定
    const padding = { top: 20, right: 60, bottom: 20, left: 10 };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    // レンジ計算
    const visibleData = chartData;
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;

    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;
    const renderRange = maxPrice - minPrice;

    // 座標変換関数
    const getX = (index) => chartX + (index / (visibleData.length - 1)) * chartWidth;
    const getY = (price) => chartY + chartHeight - ((price - minPrice) / renderRange) * chartHeight;

    // --- チャート線（価格）の描画 ---
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

    // --- 移動平均線 (MA) の描画（複数対応・右揃え修正） ---
    // MAごとの色定義
    const maColors = { 
        short: "#00e1ff",   // Cyan
        medium: "#e1ff00",  // Yellow
        long: "#ff00e1"     // Magenta
    };

    // 選択されている全てのMAを描画
    this.selectedMaTypes.forEach(type => {
        const maList = tradeState.maData[type];
        if (!maList || maList.length === 0) return;

        ctx.beginPath();
        // 色設定（少し透明度を入れる）
        ctx.strokeStyle = (maColors[type] || "#ffffff") + "80"; 
        ctx.lineWidth = 1;
        
        let maStarted = false;

        // ★修正ポイント: 配列の「末尾（最新）」を基準にインデックスを合わせる
        // visibleData（チャート）の最後 = maList（MA）の最後 となるように描画
        for (let i = 0; i < visibleData.length; i++) {
            // 末尾からのオフセット値を計算
            const offsetFromEnd = visibleData.length - 1 - i;
            const maIndex = maList.length - 1 - offsetFromEnd;

            // MAデータが存在しない範囲（古すぎるデータ）はスキップ
            if (maIndex < 0) continue;

            const val = maList[maIndex];
            
            // データがnull（計算期間不足など）の場合は線を切る
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

    // --- エントリーライン ---
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

    // --- 価格テキスト ---
    ctx.font = "bold 14px 'Roboto Mono', monospace";
    const priceText = currentPrice.toFixed(0);
    const textMetrics = ctx.measureText(priceText);
    const textHeight = 14;
    const textX = chartX + chartWidth + 5;
    const textY = Math.max(chartY + textHeight/2, Math.min(currentY, chartY + chartHeight - textHeight/2));
    
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(textX - 2, textY - textHeight/2 - 2, textMetrics.width + 4, textHeight + 4);
    
    ctx.fillStyle = lastPrice >= (chartData[chartData.length - 2] || 0) ? "#00ff00" : "#ff0055";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, textX, textY);
    ctx.restore();
  }
}