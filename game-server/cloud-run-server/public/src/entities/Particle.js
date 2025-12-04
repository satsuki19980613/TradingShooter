import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";

export class Particle extends GameObject {
  constructor(x, y, radius, color, vx, vy, type = "spark") {
    super(x, y, radius, color);
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.alpha = 1.0;
    this.friction = 0.95;
    this.decay = Math.random() * 0.03 + 0.02;

    this.boltSegments = [];
    if (this.type === "bolt") {
      this.decay = 0.1;
      this.generateBolt();
    }

    this.skinKey = `particle_${this.type}_${this.color}`;
  }
  reset(x, y, radius, color, vx, vy, type = "spark") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.type = type;

    this.alpha = 1.0;
    this.decay = Math.random() * 0.03 + 0.02;

    this.skinKey = `particle_${this.type}_${this.color}`;

    if (this.type === "bolt") {
      this.decay = 0.1;
      this.boltSegments = [];
      this.generateBolt();
    }
  }

  update(deltaFrames = 1.0) {
    this.x += this.vx * deltaFrames;
    this.y += this.vy * deltaFrames;

    const frictionAdjust = Math.pow(this.friction, deltaFrames);
    this.vx *= frictionAdjust;
    this.vy *= frictionAdjust;

    this.alpha -= this.decay * deltaFrames;

    if (this.type === "smoke") {
      this.radius *= Math.pow(0.96, deltaFrames);
      this.y -= 0.5 * deltaFrames;
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    const baseSize = 32;

    const skin = skinManager.getSkin(
      this.skinKey,
      baseSize,
      baseSize,
      (g, w, h) => {
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 4;

        g.fillStyle = this.color;

        if (this.type === "rect" || this.type === "bolt") {
          g.fillRect(cx - r, cy - r, r * 2, r * 2);
        } else {
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    );

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.alpha;

    ctx.globalCompositeOperation = "lighter";

    const scale = this.radius / (baseSize / 4);
    ctx.scale(scale, scale);

    ctx.drawImage(skin, -baseSize / 2, -baseSize / 2);

    ctx.restore();
  }
}
