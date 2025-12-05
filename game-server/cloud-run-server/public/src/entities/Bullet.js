import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
import { getDistance } from "../utils.js";

export class Bullet extends GameObject {
  constructor(x, y, angle, type) {
    let size = 8;
    let color = "#00ffff";

    if (type === "player_special_2") {
      size = 12;
      color = "#ff00ff";
    } else if (type === "player_special_3") {
      size = 16;
      color = "#ffeb3b";
    } else if (type === "player_special_4") {
      size = 40;
      color = "#b300ff";
    } else if (type === "enemy") {
      color = "#ff9800";
    }

    super(x, y, size, color);

    this.angle = angle;
    this.type = type;
    this.isInitialized = false;

    this.vx = Math.cos(angle) * 10;
    this.vy = Math.sin(angle) * 10;
    this.age = 0;
    this.initialX = x;
    this.initialY = y;
  }

  update(gameInstance, deltaFrames = 1.0) {
    super.update(deltaFrames);
    this.age += 16 * deltaFrames;

    if (!gameInstance) return;

    if (this.type.startsWith("player")) {
      this.spawnTrailParticles(gameInstance);
    }
  }

  /**
   * 弾の種類に応じた軌跡エフェクトを生成
   * ★修正箇所: Particleコンストラクタの引数順序を (x, y, radius, color, vx, vy, type) に統一
   */
  spawnTrailParticles(gameInstance) {
    if (this.type === "player_special_4") {
      return;
    }
    if (this.type === "player_special_1" || this.type === "player") {
      if (Math.random() < 0.3) {
        gameInstance.spawnParticle(this.x, this.y, 2, "#00aaff", 0, 0, "spark");
      }
    } else if (this.type === "player_special_2") {
      if (Math.random() < 0.5) {
        const spread = 2;
        const pX =
          this.x - Math.cos(this.angle) * 5 + (Math.random() - 0.5) * spread;
        const pY =
          this.y - Math.sin(this.angle) * 5 + (Math.random() - 0.5) * spread;

        gameInstance.particleSystem.spawn(
          pX,
          pY,
          5,
          "#9d00ff",
          Math.random() - 0.5,
          Math.random() - 0.5,
          "smoke"
        );
      }
    } else if (this.type === "player_special_3") {
      if (Math.random() < 0.5) {
        gameInstance.particleSystem.spawn(
          pX,
          pY,
          5,
          "#9d00ff",
          Math.random() - 0.5,
          Math.random() - 0.5,
          "smoke"
        );
      }
    } else if (this.type === "player_special_4") {
      for (let i = 0; i < 2; i++) {
        const speed = Math.random() * 3 + 1;
        const anglePerp =
          this.angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        const vx = Math.cos(anglePerp) * speed;
        const vy = Math.sin(anglePerp) * speed;
        const color = Math.random() > 0.5 ? "#b300ff" : "#ccff00";

        gameInstance.particleSystem.spawn(
          pX,
          pY,
          5,
          "#9d00ff",
          Math.random() - 0.5,
          Math.random() - 0.5,
          "smoke"
        );
      }
    }
  }

  setState(state) {
    this.id = state.i;
    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.initialX = state.x;
      this.initialY = state.y;
      this.isInitialized = true;
    }
    this.targetX = state.x;
    this.targetY = state.y;
    this.angle = state.a;
    this.type = state.t;
  }



  drawEnemyBullet(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ff5722";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawNormalBullet(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
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
    ctx.restore();
  }
}
