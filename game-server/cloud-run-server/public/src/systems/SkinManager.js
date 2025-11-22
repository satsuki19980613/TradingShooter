// public/src/systems/SkinManager.js

export class SkinManager {
    constructor() {
        // 生成済み画像のキャッシュ { key: HTMLCanvasElement }
        this.cache = new Map();
    }

    /**
     * キャッシュされたCanvasを取得する。無ければ生成する。
     * @param {string} key - キャッシュの識別キー (例: "grid_tile_50", "player_red")
     * @param {number} width - 生成する画像の幅
     * @param {number} height - 生成する画像の高さ
     * @param {Function} drawFn - (ctx, w, h) => void 描画ロジック関数
     * @returns {HTMLCanvasElement}
     */
    getSkin(key, width, height, drawFn) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // オフスクリーンキャンバス（メモリ上の画用紙）を作成
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 描画実行 (重い処理はここでのみ走る)
        drawFn(ctx, width, height);

        // 保存
        this.cache.set(key, canvas);
        // console.log(`[SkinManager] Cached: ${key}`);
        return canvas;
    }
    
    /**
     * パターン（繰り返しテクスチャ）を生成して取得する
     * グリッド描画などに最適
     */
    getPattern(ctx, key, sourceCanvas) {
        const patternKey = `${key}_pattern`;
        if (this.cache.has(patternKey)) {
            return this.cache.get(patternKey);
        }
        const pattern = ctx.createPattern(sourceCanvas, 'repeat');
        this.cache.set(patternKey, pattern);
        return pattern;
    }
}

export const skinManager = new SkinManager();