import { GameObject } from "./GameObject.js";

/**
 * 弾クラス (SFエネルギー弾 ver)
 */
export class Bullet extends GameObject {
  constructor(x, y, angle, type) {
    const color = type === "enemy" ? "#ff9800" : "#00ffff";
    super(x, y, type === "enemy" ? 6 : 8, color);

    this.angle = angle;
    this.type = type;
    this.isInitialized = false;
  }

  update() {
    super.update();
  }

  setState(state) {
    this.id = state.id;
    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.isInitialized = true;
    }
    this.targetX = state.x;
    this.targetY = state.y;
    this.angle = state.angle;
  }

  draw(ctx) {
    const isEnemy = this.type === "enemy";

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (!isEnemy) {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 15;

      ctx.beginPath();

      ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#00bcd4";
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-20, 0);
      ctx.lineTo(-5, 3);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ff5722";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}
