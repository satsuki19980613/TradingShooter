import { VisualParticle } from "../view_models/VisualParticle.js";

export class ParticleFactory {
  static createHitEffect(x, y, colorStr, count) {
    const particles = [];
    const color = parseInt(colorStr.replace("#", "0x"), 16);

    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = Math.random() * 2 + 1;
      
      particles.push(new VisualParticle(x, y, radius, color, vx, vy, "spark"));
    }
    return particles;
  }

  static createExplosionEffect(x, y, colorStr) {
    const particles = this.createHitEffect(x, y, colorStr, 20);
    const color = parseInt(colorStr.replace("#", "0x"), 16);
    
    particles.push(new VisualParticle(x, y, 10, color, 0, 0, "ring"));
    
    return particles;
  }

  static createTrailEffect(x, y, colorStr, type) {
      const color = parseInt(colorStr.replace("#", "0x"), 16);
      
      if (type === "smoke") {
          return [new VisualParticle(x, y, 5, color, (Math.random() - 0.5), (Math.random() - 0.5), "smoke")];
      }
      return [];
  }
}