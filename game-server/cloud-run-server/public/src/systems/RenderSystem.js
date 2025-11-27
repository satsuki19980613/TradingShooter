import { skinManager } from "./SkinManager.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
// 必要に応じて GMSkins や ObstacleSkins もインポート

/**
 * ゲームの描画を一手に引き受けるシステムクラス
 * エンティティの状態(x, y, angleなど)を受け取り、Canvasに描画する
 */
export class RenderSystem {
  constructor() {
    // 汎用スキンサイズ設定（定数化）
    this.PLAYER_SKIN_SIZE = 150;
    this.ENEMY_SKIN_SIZE = 120;
  }

  /**
   * プレイヤー（自分・他者）を描画
   */
  renderPlayer(ctx, player) {
    if (player.isDead) return;

    const color = player.color || "#00e5ff";
    
    // スキンの取得 (SkinManagerへの依存はここに集約)
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

    // 名前表示
    ctx.fillStyle = "white";
    ctx.font = "bold 12px 'Roboto Mono', monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(player.name, 0, -player.radius - 15);
    ctx.shadowBlur = 0;

    // 車体描画 (進行方向)
    ctx.save();
    ctx.rotate(player.rotationAngle + Math.PI / 2);
    ctx.drawImage(chassisSkin, -this.PLAYER_SKIN_SIZE / 2, -this.PLAYER_SKIN_SIZE / 2);
    ctx.restore();

    // 砲塔描画 (エイム方向)
    ctx.save();
    ctx.rotate(player.aimAngle);
    ctx.drawImage(turretSkin, -this.PLAYER_SKIN_SIZE / 2, -this.PLAYER_SKIN_SIZE / 2);

    // レーザーサイト
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

  /**
   * 敵を描画
   */
  renderEnemy(ctx, enemy) {
    const enemySkin = skinManager.getSkin(
      "enemy_heavy_tank",
      this.ENEMY_SKIN_SIZE,
      this.ENEMY_SKIN_SIZE,
      EnemySkins.heavyTank()
    );

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.targetAngle); // Enemyは aimAngle ではなく targetAngle を使用している想定
    ctx.drawImage(enemySkin, -this.ENEMY_SKIN_SIZE / 2, -this.ENEMY_SKIN_SIZE / 2);
    ctx.restore();
  }

  // 同様に renderBullet, renderObstacle などを実装...
}