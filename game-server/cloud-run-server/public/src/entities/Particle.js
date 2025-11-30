import { GameObject } from "./GameObject.js";

/**
 * パーティクルクラス
 * type: 'spark', 'smoke', 'ring', 'rect', 'bolt'
 */
export class Particle extends GameObject {
  constructor(x, y, radius, color, vx, vy, type = "spark") {
    super(x, y, radius, color);
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.alpha = 1.0;
    this.friction = 0.95; // 摩擦追加
    this.decay = Math.random() * 0.03 + 0.02;

    this.boltSegments = [];
    if (this.type === 'bolt') {
        this.decay = 0.1;
        this.generateBolt();
    }
  }

  generateBolt() {
      let currX = 0;
      let currY = 0;
      const len = this.radius * 3; 
      const segments = 4;
      this.boltSegments.push({x:0, y:0});
      for(let i=0; i<segments; i++) {
          currX += len / segments;
          currY += (Math.random() - 0.5) * 15; 
          this.boltSegments.push({x: currX, y: currY});
      }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // 摩擦
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.alpha -= this.decay;

    if (this.type === 'smoke') {
        this.radius *= 0.96; 
        this.y -= 0.5;
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    if (this.type === "ring") {
      const ringSize = this.radius * (2 - this.alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringSize, 0, Math.PI * 2);
      ctx.stroke();

    } else if (this.type === "spark") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === "smoke") {
       ctx.globalCompositeOperation = 'source-over';
       ctx.globalAlpha = this.alpha * 0.6;
       ctx.beginPath();
       ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
       ctx.fill();

    } else if (this.type === "rect") {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.alpha * 5);
        ctx.fillRect(-this.radius/2, -this.radius/2, this.radius, this.radius);

    } else if (this.type === "bolt") {
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx)); 
        
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        this.boltSegments.forEach((seg, i) => {
            if(i===0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
        });
        ctx.stroke();
    } else {
        // Fallback (for generic GameObject draw)
        // ここでsuper.drawを呼ぶと、rect型などでradiusがマイナスになった時にクラッシュする可能性があるため、
        // 念のため単純な円描画にしておきます
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.abs(this.radius), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }
}