export class VisualParticle {
  constructor(x, y, radius, color, vx, vy, type = "spark") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    
    this.life = 1.0;
    this.alpha = 1.0;
    this.friction = 0.95;
    this.decay = Math.random() * 0.03 + 0.02;
    this.scale = { x: 1.0, y: 1.0 };

    if (this.type === "ring") {
        this.decay = 0.05;
    } else if (this.type === "bolt") {
        this.decay = 0.1;
    } else if (this.type === "smoke") {
        this.decay = 0.015;
    }
  }

  update(deltaFrames) {
    this.x += this.vx * deltaFrames;
    this.y += this.vy * deltaFrames;

    const frictionAdjust = Math.pow(this.friction, deltaFrames);
    this.vx *= frictionAdjust;
    this.vy *= frictionAdjust;

    this.life -= this.decay * deltaFrames;
    this.alpha = this.life;

    if (this.type === "ring") {
        this.scale.x += 0.1 * deltaFrames;
        this.scale.y += 0.1 * deltaFrames;
    } else if (this.type === "smoke") {
        this.radius *= Math.pow(0.96, deltaFrames);
        this.y -= 0.5 * deltaFrames;
    }
  }

  isDead() {
      return this.life <= 0;
  }
}