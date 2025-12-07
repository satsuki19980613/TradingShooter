export class PixiParticleRenderer {
  constructor(container) {
    this.container = container;
    this.sprites = new Map();
    this.pool = [];

    this.textures = {};
    this.initTextures();
  }

  initTextures() {
    const c1 = document.createElement("canvas");
    c1.width = 16;
    c1.height = 16;
    const ctx1 = c1.getContext("2d");
    const g1 = ctx1.createRadialGradient(8, 8, 0, 8, 8, 8);
    g1.addColorStop(0, "white");
    g1.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx1.fillStyle = g1;
    ctx1.fillRect(0, 0, 16, 16);
    this.textures["spark"] = PIXI.Texture.from(c1);

    const c2 = document.createElement("canvas");
    c2.width = 32;
    c2.height = 32;
    const ctx2 = c2.getContext("2d");
    const g2 = ctx2.createRadialGradient(16, 16, 0, 16, 16, 16);
    g2.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    g2.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx2.fillStyle = g2;
    ctx2.fillRect(0, 0, 32, 32);
    this.textures["smoke"] = PIXI.Texture.from(c2);

    const c3 = document.createElement("canvas");
    c3.width = 64;
    c3.height = 64;
    const ctx3 = c3.getContext("2d");
    ctx3.strokeStyle = "white";
    ctx3.lineWidth = 4;
    ctx3.beginPath();
    ctx3.arc(32, 32, 28, 0, Math.PI * 2);
    ctx3.stroke();
    this.textures["ring"] = PIXI.Texture.from(c3);

    this.textures["bolt"] = PIXI.Texture.WHITE;
  }

  render(particles) {
    const activeParticles = new Set(particles);

    particles.forEach((p) => {
      let sprite = this.sprites.get(p);

      if (!sprite) {
        sprite = this.getSpriteFromPool();

        let texName = "spark";
        if (p.type === "ring" || p.type === "smoke") texName = p.type;
        else if (p.type === "bolt") texName = "bolt";

        sprite.texture = this.textures[texName];

        sprite.anchor.set(0.5);
        sprite.blendMode = "add";

        this.sprites.set(p, sprite);
        this.container.addChild(sprite);
      }

      sprite.x = p.x;
      sprite.y = p.y;
      sprite.alpha = p.alpha;
      sprite.tint = p.color;

      if (p.type === "ring") {
        sprite.scale.set(p.scale.x, p.scale.y);
      } else if (p.type === "smoke") {
        const s = (p.radius * 2) / 32;
        sprite.scale.set(s);
      } else if (p.type === "bolt") {
        sprite.scale.set(p.radius * 0.2);
      } else {
        const s = (p.radius * 2) / 16;
        sprite.scale.set(s);
      }
    });

    for (const [p, sprite] of this.sprites) {
      if (!activeParticles.has(p)) {
        this.container.removeChild(sprite);
        this.returnSpriteToPool(sprite);
        this.sprites.delete(p);
      }
    }
  }

  getSpriteFromPool() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new PIXI.Sprite();
  }

  returnSpriteToPool(sprite) {
    sprite.scale.set(1);
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    this.pool.push(sprite);
  }
}
