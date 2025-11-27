/**
 * 【SkinManager の役割: 画像リソース管理】
 * ゲーム内で使用する画像（スキン）を動的に生成・キャッシュし、提供します。
 * * ■ 担当する責務 (Do):
 * - Canvas API を使ったテクスチャの動的生成
 * - 生成した画像のキャッシュ管理 (メモ化)
 * * ■ 担当しない責務 (Don't):
 * - メイン画面への描画 (RenderSystem に画像データだけ渡す)
 */
export class SkinManager {
  constructor() {
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

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    drawFn(ctx, width, height);

    this.cache.set(key, canvas);

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
    const pattern = ctx.createPattern(sourceCanvas, "repeat");
    this.cache.set(patternKey, pattern);
    return pattern;
  }
}

export const skinManager = new SkinManager();
