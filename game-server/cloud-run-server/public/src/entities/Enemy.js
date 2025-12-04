import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";/**
 * 敵クラス (サイバーパンク・ヘビータンク ver)
 */
export class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y, 45, "#f44336");
    this.targetAngle = 0;
    this.isInitialized = false;
    this.animationTick = 0;
  }

  update(deltaFrames = 1.0) {
    super.update(deltaFrames); // 親クラスに渡す
    this.animationTick++;
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

    this.targetAngle = state.ta;
    this.hp = state.h;
  }
  draw(ctx) {
    const skinSize = 120;

    const enemySkin = skinManager.getSkin(
      "enemy_heavy_tank",
      skinSize,
      skinSize,
      EnemySkins.heavyTank()
    );

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.targetAngle);

    ctx.drawImage(enemySkin, -skinSize / 2, -skinSize / 2);

    ctx.restore();
  }
}
