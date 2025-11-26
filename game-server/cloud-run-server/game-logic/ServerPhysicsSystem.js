import { getDistance } from "./ServerUtils.js";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";
import { ServerObstacle } from "./ServerObstacle.js";
import { ServerSlowZone } from "./ServerSlowZone.js";

/**
 * 物理演算と衝突判定を担当するシステムクラス
 */
export class ServerPhysicsSystem {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * 弾とエンティティ/障害物の衝突判定
   * @param {ServerGame} game
   */
  checkCollisions(game) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const bullet = game.bullets[i];
      let bulletRemoved = false;
      if (bullet.type === "item_ep") {
        const nearbyEntities = game.grid.getNearbyEntities(bullet);
        for (const entity of nearbyEntities) {
          if (
            entity instanceof ServerBullet ||
            entity instanceof ServerObstacle
          ) {
            continue; // 次のループへ（衝突判定を行わない）
          }
          if (entity instanceof ServerPlayer && !entity.isDead) {
            if (
              getDistance(bullet.x, bullet.y, entity.x, entity.y) <
              bullet.radius + entity.radius
            ) {
              if (entity.ep < 100) {
                entity.ep = Math.min(100, entity.ep + 10);
                entity.isDirty = true;

                game.frameEvents.push({
                  type: "hit",
                  x: bullet.x,
                  y: bullet.y,
                  color: "#00ff00",
                });
              }
              game.removeBullet(bullet, i);
              bulletRemoved = true;
              break;
            }
          }
        }
        if (bulletRemoved) continue;

        continue;
      }
      for (const obstacle of game.obstacles) {
        if (obstacle.checkCollisionWithCircle(bullet)) {
          game.removeBullet(bullet, i);
          bulletRemoved = true;
          break;
        }
      }
      if (bulletRemoved) continue;

      const nearbyEntities = game.grid.getNearbyEntities(bullet);

      for (const entity of nearbyEntities) {
        if (
          entity instanceof ServerBullet ||
          entity instanceof ServerObstacle
        ) {
          continue;
        }

        if (
          getDistance(bullet.x, bullet.y, entity.x, entity.y) <
          bullet.radius + entity.radius
        ) {
          if (
            (bullet.type === "player" || bullet.type === "player_special") &&
            entity instanceof ServerEnemy
          ) {
            const attackerPlayer = game.players.get(bullet.ownerId);
            entity.takeDamage(bullet.damage, bullet.type, game, attackerPlayer);

            game.frameEvents.push({
              type: "hit",
              x: bullet.x,
              y: bullet.y,
              color: "#ff9800",
            });

            game.removeBullet(bullet, i);
            bulletRemoved = true;
            break;
          }

          if (bullet.type === "enemy" && entity instanceof ServerPlayer) {
            if (entity.isDead) continue;
            entity.takeDamage(bullet.damage, game, null);

            game.frameEvents.push({
              type: "hit",
              x: bullet.x,
              y: bullet.y,
              color: "#f44336",
            });

            game.removeBullet(bullet, i);
            bulletRemoved = true;
            break;
          }

          if (
            (bullet.type === "player" || bullet.type === "player_special") &&
            entity instanceof ServerPlayer
          ) {
            if (entity.id === bullet.ownerId || entity.isDead) {
              continue;
            }

            const attackerPlayer = game.players.get(bullet.ownerId);
            entity.takeDamage(bullet.damage, game, attackerPlayer);

            game.frameEvents.push({
              type: "hit",
              x: bullet.x,
              y: bullet.y,
              color: "#00ffff",
            });

            game.removeBullet(bullet, i);
            bulletRemoved = true;
            break;
          }
        }
      }
    }
  }

  /**
   * キャラクター vs 障害物、キャラクター vs キャラクター の押し出し処理
   * @param {ServerGame} game
   */
  handleObstacleCollisions(game) {
    const checkedPairs = new Set();

    game.players.forEach((player1) => {
      if (player1.isDead) return;

      const nearbyEntities = game.grid.getNearbyEntities(player1);
      for (const entity of nearbyEntities) {
        if (entity instanceof ServerObstacle) {
          entity.collideWith(player1);
          continue;
        }

        if (entity instanceof ServerPlayer) {
          const player2 = entity;

          if (player2.isDead || player1.id === player2.id) continue;

          const pairKey =
            player1.id < player2.id
              ? `${player1.id}:${player2.id}`
              : `${player2.id}:${player1.id}`;

          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);

          const dist = getDistance(player1.x, player1.y, player2.x, player2.y);
          const totalRadius = player1.radius + player2.radius;
          const overlap = totalRadius - dist;

          if (overlap > 0) {
            const dx = player1.x - player2.x;
            const dy = player1.y - player2.y;
            let pushX = 0;
            let pushY = 0;

            if (dist === 0) {
              pushX = 0.1;
              pushY = 0;
            } else {
              pushX = dx / dist;
              pushY = dy / dist;
            }

            const pushAmount = overlap / 2;

            player1.x += pushX * pushAmount;
            player1.y += pushY * pushAmount;

            player2.x -= pushX * pushAmount;
            player2.y -= pushY * pushAmount;

            this.clampPosition(player1);
            this.clampPosition(player2);

            player1.isDirty = true;
            player2.isDirty = true;
          }
        }
        if (entity instanceof ServerEnemy) {
          const enemy = entity;
          if (
            getDistance(player1.x, player1.y, enemy.x, enemy.y) <
            player1.radius + enemy.radius
          ) {
            this.resolveOverlap(player1, enemy);
          }
        }
      }
    });

    game.enemies.forEach((enemy) => {
      const nearbyEntities = game.grid.getNearbyEntities(enemy);
      for (const entity of nearbyEntities) {
        if (!(entity instanceof ServerObstacle)) {
          continue;
        }
        entity.collideWith(enemy);
      }
    });
  }
  /**
   * 2つのエンティティ間の重なりを解消する（押し出し処理）
   */
  resolveOverlap(entity1, entity2) {
    const dist = getDistance(entity1.x, entity1.y, entity2.x, entity2.y);
    const totalRadius = entity1.radius + entity2.radius;
    const overlap = totalRadius - dist;

    if (overlap > 0) {
      const dx = entity1.x - entity2.x;
      const dy = entity1.y - entity2.y;
      let pushX = 0;
      let pushY = 0;

      if (dist === 0) {
        pushX = 0.1;
        pushY = 0;
      } else {
        pushX = dx / dist;
        pushY = dy / dist;
      }

      const pushAmount = overlap / 2;

      entity1.x += pushX * pushAmount;
      entity1.y += pushY * pushAmount;
      entity2.x -= pushX * pushAmount;
      entity2.y -= pushY * pushAmount;

      this.clampPosition(entity1);
      this.clampPosition(entity2);

      entity1.isDirty = true;
      entity2.isDirty = true;
    }
  }

  /**
   * スローゾーン等の特殊エリア効果の適用
   * @param {ServerGame} game
   */
  applyZoneEffects(game) {
    const slowZones = game.obstacles.filter(
      (obs) => obs instanceof ServerSlowZone
    );
    if (slowZones.length === 0) return;

    game.players.forEach((player) => {
      if (player.isDead) return;

      let isInSlowZone = false;
      for (const zone of slowZones) {
        if (zone.checkCollisionWithCircle(player)) {
          isInSlowZone = true;
          break;
        }
      }

      if (isInSlowZone) {
        player.speed = player.defaultSpeed * 0.5;
        player.isDirty = true;
      }
    });
  }

  /**
   * ヘルパー: キャラクターがワールド外に出ないように補正
   */
  clampPosition(entity) {
    entity.x = Math.max(
      entity.radius,
      Math.min(this.worldWidth - entity.radius, entity.x)
    );
    entity.y = Math.max(
      entity.radius,
      Math.min(this.worldHeight - entity.radius, entity.y)
    );
  }
}
