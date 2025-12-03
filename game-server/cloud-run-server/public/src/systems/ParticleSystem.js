// public/src/systems/ParticleSystem.js (New)
import { Particle } from "../entities/Particle.js";

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.particlePool = [];
  }

  createHitEffect(x, y, color, count, type = "hit") {
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
    let p;
    if (this.particlePool.length > 0) {
      p = this.particlePool.pop();
      p.reset(x, y, radius, color, vx, vy, type);
    } else {
      p = new Particle(x, y, radius, color, vx, vy, type);
    }
    this.particles.push(p);
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.alpha <= 0) {
        this.particlePool.push(p);
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach((p) => p.draw(ctx));
  }
}