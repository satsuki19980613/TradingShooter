export class PixiParticleRenderer {
  constructor(container) {
    this.container = container;
    this.sprites = new Map();
  }

  render(particles) {
    const activeParticles = new Set(particles);

    particles.forEach(p => {
        let visual = this.sprites.get(p);
        if (!visual) {
            visual = this.createVisual(p);
            this.sprites.set(p, visual);
            this.container.addChild(visual);
        }

        visual.x = p.x;
        visual.y = p.y;
        visual.alpha = p.alpha;
        
        if (p.type === "ring") {
            visual.scale.set(p.scale.x, p.scale.y);
        } else if (p.type === "smoke") {
            visual.width = p.radius * 2;
            visual.height = p.radius * 2;
        }
    });

    for (const [p, visual] of this.sprites) {
        if (!activeParticles.has(p)) {
            this.container.removeChild(visual);
            visual.destroy();
            this.sprites.delete(p);
        }
    }
  }

  createVisual(p) {
      const g = new PIXI.Graphics();
      
      if (p.type === "ring") {
          g.circle(0, 0, p.radius * 3).stroke({ width: 2, color: p.color });
      } else if (p.type === "bolt") {
          g.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 2).fill({ color: p.color });
      } else {
          g.circle(0, 0, p.radius).fill({ color: p.color });
      }
      
      g.blendMode = 'add';
      return g;
  }
}