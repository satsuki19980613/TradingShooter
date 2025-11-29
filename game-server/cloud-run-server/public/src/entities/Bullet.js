import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";

export class Bullet extends GameObject {
  constructor(x, y, angle, type) {
    const color = type === "enemy" ? "#ff9800" : "#00ffff";

    let size = 8;
    if (type === "player_special_4") size = 20;
    else if (type === "player_special_3") size = 16;

    super(x, y, size, color);

    this.angle = angle;
    this.type = type;
    this.isInitialized = false;
  }

  update() {
    super.update();
  }

  setState(state) {
    this.id = state.i;
    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
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

    if (BulletSkins[this.type]) {
      ctx.save();

      ctx.translate(this.x, this.y);

      ctx.rotate(this.angle);

      const drawFunc = BulletSkins[this.type]();

      drawFunc(ctx, 0, 0);

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
