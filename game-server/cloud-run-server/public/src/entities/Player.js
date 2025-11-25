import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { GMSkins } from "../skins/players/GMSkins.js";



function lerpAngle(current, target, rate) {
  let delta = target - current;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * rate;
}

/**
 * プレイヤークラス (サイバーパンク・ホバータンク ver)
 * 修正: トレード情報の同期漏れを解消 & 回転ロジックを改善
 */
export class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 45, "#00bcd4");
    this.rotationAngle = 0;
    this.aimAngle = 0;
    this.targetAimAngle = 0;
    this.isInitialized = false;

    this.hp = 100;
    this.ep = 100;
    this.name = "";

    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;

    this.isDead = false;

    this.hoverOffset = 0;
  }

  update() {
    super.update();

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    if (dx * dx + dy * dy > 1) {
      const moveAngle = Math.atan2(dy, dx);
      this.rotationAngle = lerpAngle(this.rotationAngle, moveAngle, 0.1);
    }

    this.aimAngle = lerpAngle(this.aimAngle, this.targetAimAngle, 0.3);

    this.hoverOffset = Math.sin(Date.now() / 200) * 3;
  }

  /**
   * サーバーからの状態同期
   * 【修正】消えてしまっていたチャージ情報等の同期を復活
   */
  setState(state) {
    this.id = state.i;

    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.aimAngle = state.a;
      this.rotationAngle = state.a;
      this.isInitialized = true;
    }

    if (state.n) this.name = state.n;
    if (this.isMe) {
      const dist = Math.sqrt(
        Math.pow(state.x - this.x, 2) + Math.pow(state.y - this.y, 2)
      );

      const TOLERANCE = 20.0;

      if (dist > TOLERANCE) {
        this.targetX = state.x;
        this.targetY = state.y;
      } else {
        this.targetX = this.x;
        this.targetY = this.y;
      }
    } else {
      this.targetX = state.x;
      this.targetY = state.y;
    }
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetAimAngle = state.a;

    this.hp = state.h;
    this.ep = state.e;
    this.isDead = !!state.d;

    this.chargeBetAmount = state.ba;

    if (state.cp) {
      this.chargePosition = {
        entryPrice: state.cp.ep,
        amount: state.cp.a,
      };
    } else {
      this.chargePosition = null;
    }

    this.stockedBullets = state.sb;
  }
  draw(ctx) {
    if (this.isDead) return;

    // const skinSize = 500;
    // const color = "#00e5ff";
    // const chassisSkin = skinManager.getSkin(
    //   "gm_chassis", // キャッシュキーも一意なものに変更
    //   skinSize,
    //   skinSize,
    //   GMSkins.chassis() // GMSkinsのメソッドを呼ぶ
    // );
    // const turretSkin = skinManager.getSkin(
    //   "gm_turret",
    //   skinSize,
    //   skinSize,
    //   GMSkins.turret()
    // );

    const chassisSkin = skinManager.getSkin(
      `player_chassis_${color}`,
      skinSize,
      skinSize,
      PlayerSkins.chassis(color)
    );

    const turretSkin = skinManager.getSkin(
      `player_turret_${color}`,
      skinSize,
      skinSize,
      PlayerSkins.turret(color)
    );

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "white";
    ctx.font = "bold 12px 'Roboto Mono', monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(this.name, 0, -this.radius - 15);
    ctx.shadowBlur = 0;

    ctx.save();

    ctx.rotate(this.rotationAngle + Math.PI / 2);

    ctx.drawImage(chassisSkin, -skinSize / 2, -skinSize / 2);
    ctx.restore();

    ctx.save();

    ctx.rotate(this.aimAngle);
    ctx.drawImage(turretSkin, -skinSize / 2, -skinSize / 2);

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(300, 0);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }
}
