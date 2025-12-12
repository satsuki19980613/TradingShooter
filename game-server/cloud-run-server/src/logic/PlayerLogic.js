import { BulletType } from "../core/constants/Protocol.js"; // 必要であればインポート

export const PlayerLogic = {
  /**
   * 旋回と慣性移動の計算（常時前進）
   * @param {Object} inputs 入力
   * @param {number} speed 基本速度
   * @param {number} currentAngle 現在の角度
   * @param {number} currentVx 現在の速度X
   * @param {number} currentVy 現在の速度Y
   * @param {Object} outResult 結果格納用
   */
  calculateVelocity(
    inputs,
    speed,
    currentAngle,
    currentVx,
    currentVy,
    outResult
  ) {
    const ROTATION_SPEED = 0.035;
    const INERTIA = 0.04;

    let nextAngle = currentAngle || 0;

    if (inputs.move_left) nextAngle -= ROTATION_SPEED;
    if (inputs.move_right) nextAngle += ROTATION_SPEED;

    const targetVx = Math.cos(nextAngle) * speed;
    const targetVy = Math.sin(nextAngle) * speed;

    const nextVx = currentVx + (targetVx - currentVx) * INERTIA;
    const nextVy = currentVy + (targetVy - currentVy) * INERTIA;

    if (!outResult) {
      outResult = { vx: 0, vy: 0, angle: 0 };
    }

    outResult.vx = nextVx;
    outResult.vy = nextVy;
    outResult.angle = nextAngle;

    return outResult;
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

    for (const entity of nearbyEntities) {
      if (entity.id === player.id) continue;

      if ((entity.hp !== undefined && entity.hp <= 0) || entity.isDead)
        continue;

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
    let params = {
      speed: 16,
      radius: 6,
      delay: 0,       // ★変更: 遅延なし
      cooldown: 23,   // ★追加: 連射間隔 (元のdelay 8 + 15)
      follow: false,
      damage: 10,
    };
    if (type === BulletType.SLASH || type === "player_special_2") {
      params.speed = 18;
      params.radius = 12;
      params.delay = 0;      // ★変更
      params.cooldown = 27;  // ★追加 (元のdelay 12 + 15)
    } else if (type === BulletType.ORB || type === "player_special_3") {
      params.speed = 16;
      params.radius = 30;
      params.delay = 0;      // ★変更
      params.cooldown = 25;  // ★追加 (元のdelay 10 + 15)
    } else if (type === BulletType.FIREBALL || type === "player_special_4") {
      params.speed = 24;
      params.radius = 45;
      params.delay = 0;      // ★変更
      params.cooldown = 87;  // ★追加 (元のdelay 72 + 15)
      params.follow = false; // ★変更: 追従も不要
    } else {
      params.speed = 16;
    }

    return params;
  },
};
