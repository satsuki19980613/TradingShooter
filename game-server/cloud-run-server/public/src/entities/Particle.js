import { GameObject } from "./GameObject.js";

/**
 * パーティクルクラス (サイバーパンク・エフェクト ver)
 * type: 'spark' (火花), 'ring' (衝撃波), 'smoke' (煙)
 */
export class Particle extends GameObject {
  constructor(x, y, radius, color, vx, vy, type = "spark") {
    super(x, y, radius, color);
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.alpha = 1.0;
    this.friction = 0.92;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.alpha -= this.decay;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.type === "ring") {
      this.radius += 2;
      ctx.lineWidth = 2 * this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === "spark") {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const length = Math.max(this.radius, speed * 3);

      const angle = Math.atan2(this.vy, this.vx);

      ctx.translate(this.x, this.y);
      ctx.rotate(angle);

      ctx.beginPath();

      ctx.moveTo(0, 0);
      ctx.lineTo(-length, -this.radius / 2);
      ctx.lineTo(-length, this.radius / 2);
      ctx.closePath();
      ctx.fill();
      
    } else {
      super.draw(ctx);
    }

    ctx.restore();
  }
}
