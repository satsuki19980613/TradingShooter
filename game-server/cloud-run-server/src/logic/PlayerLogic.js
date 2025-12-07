export const PlayerLogic = {
  /**
   * 入力状態から移動速度と角度を計算
   */
  calculateVelocity(inputs, speed) {
    let dx = 0;
    let dy = 0;

    if (inputs.move_up) dy -= 1;
    if (inputs.move_down) dy += 1;
    if (inputs.move_left) dx -= 1;
    if (inputs.move_right) dx += 1;

    let vx = 0;
    let vy = 0;
    let angle = null;
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      vx = dx * speed;
      vy = dy * speed;
      angle = Math.atan2(dy, dx);
    }

    return { vx, vy, angle };
  },

  /**
   * オートエイム: 最も近いターゲットを探して角度を返す
   * @param {Object} player 
   * @param {Set|Array} nearbyEntities 
   * @param {number} searchRadius 
   */
  calculateAutoAimAngle(player, nearbyEntities, searchRadius = 750) {
    let closestTarget = null;
    let minDistSq = searchRadius * searchRadius;

    // Set または Array のエンティティリストを走査
    for (const entity of nearbyEntities) {
      if (entity.id === player.id) continue;
      // 死亡フラグのチェック (hp <= 0 または isDead)
      if ((entity.hp !== undefined && entity.hp <= 0) || entity.isDead) continue;
      
      // 敵または他プレイヤーを対象 (typeプロパティを持っている前提)
      if (entity.type === "enemy" || entity.type === "player") {
        const dx = entity.x - player.x;
        const dy = entity.y - player.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestTarget = entity;
        }
      }
    }

    if (closestTarget) {
      return Math.atan2(closestTarget.y - player.y, closestTarget.x - player.x);
    }
    
    return null; 
  },

  /**
   * 弾の種類に応じたパラメータを取得
   */
  getBulletParams(type) {
    let speed = 9;
    let radius = 6;

    if (type === "player_special_2") {
      speed = 10;
      radius = 12;
    } else if (type === "player_special_3") {
      speed = 11;
      radius = 30;
    } else if (type === "player_special_4") {
      speed = 24;
      radius = 45;
    }

    return { speed, radius };
  }
};