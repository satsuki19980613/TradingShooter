export class SkinManager {
  constructor() {
    this.cache = new Map();

    this.textureCache = new Map();
  }

  getSkin(key, width, height, drawFn) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (drawFn) {
      drawFn(ctx, width, height);
    } else {
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  getTexture(key, width, height, drawFn) {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }

    const canvas = this.getSkin(key, width, height, drawFn);

    const texture = PIXI.Texture.from(canvas);

    this.textureCache.set(key, texture);
    return texture;
  }
}

export const skinManager = new SkinManager();
