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

  draw(ctx) {
    if (this.type === "item_ep") {
      this.drawItemEp(ctx);
      return;
    }
    if (this.type === "enemy") {
      this.drawEnemyBullet(ctx);
      return;
    }
    let alpha = 1.0;
    if (this.type === "player_special_4") {
      if (this.age < 100) {
        alpha = this.age / 100;
      } else if (this.age > 800) {
        alpha = Math.max(0, 1 - (this.age - 800) / 200);
      }
    }

    if (BulletSkins[this.type]) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = alpha;

      if (this.type === "player_special_4") {
        const dist = getDistance(this.x, this.y, this.initialX, this.initialY);

        const drawFunc = BulletSkins[this.type](dist);
        drawFunc(ctx, 0, 0);
      } else {
        const drawFunc = BulletSkins[this.type]();
        drawFunc(ctx, 0, 0);
      }

      ctx.restore();
      return;
    }
    this.drawNormalBullet(ctx);
  }

  drawItemEp(ctx) {
    const baseSize = 64;
    const crystalSize = 48;
    const ringSize = 48;
    const baseSkin = skinManager.getSkin(
      "item_ep_base",
      baseSize,
      baseSize,
      BulletSkins.item_ep_base()
    );
    const crystalSkin = skinManager.getSkin(
      "item_ep_crystal",
      crystalSize,
      crystalSize,
      BulletSkins.item_ep_crystal()
    );
    const ringSkin = skinManager.getSkin(
      "item_ep_ring",
      ringSize,
      ringSize,
      BulletSkins.item_ep_ring()
    );

    ctx.save();
    ctx.translate(this.x, this.y);
    const time = Date.now();
    const bobOffset = Math.sin(time / 400) * 4;
    const rotation = time / 800;
    const pulse = 1 + Math.sin(time / 200) * 0.1;

    ctx.translate(0, bobOffset);
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.drawImage(baseSkin, -baseSize / 2, -baseSize / 2);
    ctx.restore();
    ctx.save();
    ctx.rotate(rotation);
    ctx.scale(pulse, pulse);
    ctx.drawImage(crystalSkin, -crystalSize / 2, -crystalSize / 2);
    ctx.restore();
    ctx.save();
    ctx.rotate(-rotation * 1.5);
    ctx.drawImage(ringSkin, -ringSize / 2, -ringSize / 2);
    ctx.restore();
    ctx.restore();
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
