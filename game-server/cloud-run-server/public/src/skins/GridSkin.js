// public/src/skins/GridSkin.js

export const GridSkin = {
    /**
     * 1セル分のグリッド画像を生成する描画関数
     * @param {string} color - 線の色
     * @param {number} lineWidth - 線の太さ
     */
    drawTile: (color, lineWidth) => {
        return (ctx, w, h) => {
            // 背景を透明にクリア
            ctx.clearRect(0, 0, w, h);
            
            // 右と下の辺だけ描けば、並べた時にグリッドになる
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            
            // 縦線 (右端)
            ctx.moveTo(w, 0);
            ctx.lineTo(w, h);
            
            // 横線 (下端)
            ctx.moveTo(0, h);
            ctx.lineTo(w, h);
            
            ctx.stroke();
        };
    }
};