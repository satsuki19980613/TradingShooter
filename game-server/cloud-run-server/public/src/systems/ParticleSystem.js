export class ParticleSystem {
  /**
   * @param {PIXI.Container} effectLayer - PixiManagerから渡されるエフェクト用レイヤー
   */
  constructor(effectLayer) {
    this.effectLayer = effectLayer;
    this.particles = [];
  }

  createHitEffect(x, y, colorStr, count, type = "hit") {
    // colorStr ("#RRGGBB") を Hex数値 (0xRRGGBB) に変換
    const color = parseInt(colorStr.replace("#", "0x"), 16);

    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = Math.random() * 2 + 1;
      this.spawn(x, y, radius, color, vx, vy, "spark");
    }
    if (type === "explosion" || count > 8) {
      this.spawn(x, y, 10, color, 0, 0, "ring");
    }
  }

  spawn(x, y, radius, color, vx, vy, type = "spark") {
    if (!this.effectLayer) return;

    // Pixi Graphicsでパーティクルを作成
    const graphics = new PIXI.Graphics();
    
    if (type === "rect" || type === "bolt") {
      graphics.rect(-radius, -radius, radius * 2, radius * 2);
    } else if (type === "ring") {
      graphics.circle(0, 0, radius * 3); // リングは大きめに
      graphics.stroke({ width: 2, color: color });
    } else {
      graphics.circle(0, 0, radius);
      graphics.fill({ color: color });
    }
    
    // リング以外は塗りつぶし
    if (type !== "ring") {
        graphics.fill({ color: color });
    }

    // ブレンドモード（加算合成）で光らせる
    graphics.blendMode = 'add';
    
    graphics.x = x;
    graphics.y = y;

    this.effectLayer.addChild(graphics);

    const particle = {
      graphics: graphics,
      vx: vx,
      vy: vy,
      life: 1.0,
      decay: Math.random() * 0.03 + 0.02,
      type: type
    };

    if (type === "ring") {
        particle.decay = 0.05;
        particle.life = 1.0;
    }

    this.particles.push(particle);
  }

  update(deltaFrames = 1.0) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 物理更新
      p.graphics.x += p.vx * deltaFrames;
      p.graphics.y += p.vy * deltaFrames;

      const frictionAdjust = Math.pow(0.95, deltaFrames);
      p.vx *= frictionAdjust;
      p.vy *= frictionAdjust;

      p.life -= p.decay * deltaFrames;
      p.graphics.alpha = p.life;

      if (p.type === "ring") {
          p.graphics.scale.x += 0.1 * deltaFrames;
          p.graphics.scale.y += 0.1 * deltaFrames;
      }

      // 寿命切れ
      if (p.life <= 0) {
        this.effectLayer.removeChild(p.graphics);
        p.graphics.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}