import { CollisionLogic } from "./CollisionLogic.js";

/**
 * 敵の行動決定（索敵、移動方向）に関する純粋ロジック
 */
export const AILogic = {
  /**
   * 最も近いプレイヤーを探す
   */
  findClosestPlayer(enemyX, enemyY, players) {
    let closestPlayer = null;
    let minDistance = Infinity;

    for (const player of players) {
      if (player.isDead) continue;
      const dist = CollisionLogic.getDistance(enemyX, enemyY, player.x, player.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestPlayer = player;
      }
    }
    return { player: closestPlayer, distance: minDistance };
  },

  /**
   * 敵の移動目標角度を決定する
   */
  decideTargetAngle(enemyX, enemyY, targetPlayer, currentAngle, distanceToPlayer) {
    let newAngle = currentAngle;
    
    if (targetPlayer) {
      if (distanceToPlayer < 500) {
        newAngle = Math.atan2(targetPlayer.y - enemyY, targetPlayer.x - enemyX);
      } else {
        newAngle += (Math.random() - 0.5) * 0.5;
      }
    } else {
      newAngle += (Math.random() - 0.5) * 1.0;
    }
    
    return newAngle;
  },

  /**
   * 射撃可能か判定する
   */
  shouldShoot(distanceToPlayer) {
    return distanceToPlayer < 500;
  }
};