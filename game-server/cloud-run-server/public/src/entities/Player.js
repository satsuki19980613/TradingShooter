import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { PlayerSkins } from "../skins/PlayerSkins.js";
/**
 * 角度を滑らかに補間 (Lerp) する
 */
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
    
    // --- ステータス ---
    this.hp = 100;
    this.ep = 100;
    this.name = "";
    
    // --- トレード・弾薬データ (重要: これらを同期させる) ---
    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;
    
    // --- フラグ ---
    this.isDead = false;
    
    // アニメーション用
    this.hoverOffset = 0;
  }

  update(inputManager) {
    if (this.isDead) return;

    if (this.isMe && inputManager) {
      const speed = 6.5;
      let dx = 0;
      let dy = 0;

      if (inputManager.actionStates["move_up"]) dy -= 1;
      if (inputManager.actionStates["move_down"]) dy += 1;
      if (inputManager.actionStates["move_left"]) dx -= 1;
      if (inputManager.actionStates["move_right"]) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        this.x += dx * speed;
        this.y += dy * speed;
      }

      const distSq =
        (this.x - this.targetX) ** 2 + (this.y - this.targetY) ** 2;

      if (distSq > 100 * 100) {
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        this.x += (this.targetX - this.x) * 0.1;
        this.y += (this.targetY - this.y) * 0.1;
      }

      if (dx !== 0 || dy !== 0) {
        const moveAngle = Math.atan2(dy, dx);

        this.rotationAngle = lerpAngle(
          this.rotationAngle,
          moveAngle,
          0.2
        );
      }
    } else {
      super.update();

    // 【修正】勝手な回転を削除し、移動方向に車体を向ける
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    // ある程度移動している場合のみ向きを変える (静止時は維持)
    if (dx * dx + dy * dy > 1) {
        const moveAngle = Math.atan2(dy, dx);
        this.rotationAngle = lerpAngle(this.rotationAngle, moveAngle, 0.1);
    }

    // 砲塔はマウスに追従
    this.aimAngle = lerpAngle(this.aimAngle, this.targetAimAngle, 0.3);
    
    // ホバリングの浮遊感
    this.hoverOffset = Math.sin(Date.now() / 200) * 3;
  }

  get lerpAngleFunc() {
    return (current, target, rate) => {
      let delta = target - current;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      return current + delta * rate;
    };
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
      this.aimAngle = state.aimAngle;
      this.rotationAngle = state.aimAngle; // 初期向き
      this.isInitialized = true;
    }
    
    this.name = state.name;
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetAimAngle = state.aimAngle;
    
    this.hp = state.hp;
    this.ep = state.ep;
    this.isDead = state.isDead;

    // ▼▼▼ 復活させた同期処理 ▼▼▼
    this.chargeBetAmount = state.chargeBetAmount;
    this.chargePosition = state.chargePosition;
    this.stockedBullets = state.stockedBullets;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  }
  draw(ctx) {
    if (this.isDead) return;

    const skinSize = 120;
    const color = "#00e5ff";

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
