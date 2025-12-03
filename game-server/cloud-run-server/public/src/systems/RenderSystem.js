import { skinManager } from "./SkinManager.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";

/**
 * ゲームの描画を一手に引き受けるシステムクラス
 * エンティティの状態(x, y, angleなど)を受け取り、Canvasに描画する
 */
export class RenderSystem {
  constructor() {
    this.PLAYER_SKIN_SIZE = 150;
    this.ENEMY_SKIN_SIZE = 120;
  }

  /**
   * ★新規追加: HPゲージを描画するヘルパーメソッド
   * ctxは既にエンティティの中心にtranslateされている前提
   */
  drawHPBar(ctx, yOffset, currentHp, maxHp, width = 60, height = 6) {
    ctx.save();

    ctx.translate(0, yOffset);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(-width / 2, 0, width, height);

    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    const barW = width * ratio;

    let color = "#00ff0080";
    if (ratio < 0.3) color = "#ff00007c";
    else if (ratio < 0.6) color = "#ffff0071";

    ctx.fillStyle = color;
    ctx.fillRect(-width / 2, 0, barW, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-width / 2, 0, width, height);

    ctx.restore();
  }

  /**
   * プレイヤー（自分・他者）を描画
   */
  renderPlayer(ctx, player) {
    if (player.isDead) return;
    const color = player.color || "#00e5ff";

    const chassisSkin = skinManager.getSkin(
      `player_chassis_${color}`,
      this.PLAYER_SKIN_SIZE,
      this.PLAYER_SKIN_SIZE,
      PlayerSkins.chassis(color)
    );
    const turretSkin = skinManager.getSkin(
      `player_turret_${color}`,
      this.PLAYER_SKIN_SIZE,
      this.PLAYER_SKIN_SIZE,
      PlayerSkins.turret(color)
    );

    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = "white";
    ctx.font = "bold 12px 'Roboto Mono', monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;

    ctx.fillText(player.name, 0, -55);
    ctx.shadowBlur = 0;

    if (!player.isMe) {
      this.drawHPBar(ctx, -70, player.hp, 100, 60, 6);
    }

    ctx.save();
    ctx.rotate(player.rotationAngle + Math.PI / 2);
    ctx.drawImage(
      chassisSkin,
      -this.PLAYER_SKIN_SIZE / 2,
      -this.PLAYER_SKIN_SIZE / 2
    );
    ctx.restore();

    ctx.save();
    const turretAngle =
      player.aimAngle !== undefined ? player.aimAngle : player.rotationAngle;
    ctx.rotate(turretAngle);

    ctx.drawImage(
      turretSkin,
      -this.PLAYER_SKIN_SIZE / 2,
      -this.PLAYER_SKIN_SIZE / 2
    );

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(300, 0);
    ctx.stroke();

    ctx.restore();

    if (player.isMe && player.lockedTarget) {
      this.renderLockOnSight(ctx, player.lockedTarget, player);
    }

    ctx.restore();
  }

  /**
   * ロックオンマーカーを描画
   */
  renderLockOnSight(ctx, target, player) {
    if (!target || (target.hp !== undefined && target.hp <= 0)) return;

    ctx.save();

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    ctx.translate(dx, dy);

    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff0055";
    ctx.shadowBlur = 5;

    const size = 40;
    const corner = 10;

    ctx.beginPath();

    ctx.moveTo(-size / 2 + corner, -size / 2);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 2, -size / 2 + corner);

    ctx.moveTo(size / 2 - corner, -size / 2);
    ctx.lineTo(size / 2, -size / 2);
    ctx.lineTo(size / 2, -size / 2 + corner);

    ctx.moveTo(size / 2, size / 2 - corner);
    ctx.lineTo(size / 2, size / 2);
    ctx.lineTo(size / 2 - corner, size / 2);

    ctx.moveTo(-size / 2, size / 2 - corner);
    ctx.lineTo(-size / 2, size / 2);
    ctx.lineTo(-size / 2 + corner, size / 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 0, 85, 0.5)";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 敵を描画
   */
  renderEnemy(ctx, enemy) {
    if (enemy.x === undefined || enemy.y === undefined) return;

    const enemySkin = skinManager.getSkin(
      "enemy_heavy_tank",
      this.ENEMY_SKIN_SIZE,
      this.ENEMY_SKIN_SIZE,
      EnemySkins.heavyTank()
    );

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    this.drawHPBar(ctx, -60, enemy.hp, 50, 50, 5);

    const angle =
      enemy.targetAngle !== undefined ? enemy.targetAngle : enemy.angle || 0;
    ctx.rotate(angle);

    ctx.drawImage(
      enemySkin,
      -this.ENEMY_SKIN_SIZE / 2,
      -this.ENEMY_SKIN_SIZE / 2
    );

    ctx.restore();
  }
}
