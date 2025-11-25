export const GridSkin = {
  /**
   * 1セル分のグリッド画像を生成する描画関数
   * @param {string} color - 線の色
   * @param {number} lineWidth - 線の太さ
   */
  drawTile: (color, lineWidth) => {
    return (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(0, h);
      ctx.lineTo(w, h);
      ctx.stroke();
    };
  },
};
