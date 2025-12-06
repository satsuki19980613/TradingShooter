/**
 * エフェクト（パーティクル）の描画用データモデル
 */
export class VisualEffect {
  constructor(x, y, radius, color, vx, vy, type = "spark") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    
    this.alpha = 1.0;
    this.friction = 0.95;
    this.decay = Math.random() * 0.03 + 0.02;
    
    if (this.type === "bolt") {
      this.decay = 0.1;
    } else if (this.type === "ring") {
      this.decay = 0.05;
    }
    
    this.graphics = null; 
  }
}