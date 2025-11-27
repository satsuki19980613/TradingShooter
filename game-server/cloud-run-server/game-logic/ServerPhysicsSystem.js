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
update(game) {
    // 1. プレイヤーの移動
    game.players.forEach(player => {
      this.moveEntity(player, game.obstacles);
    });

    // 2. 敵の移動
    game.enemies.forEach(enemy => {
      this.moveEntity(enemy, game.obstacles);
    });

    // 3. エンティティ同士の衝突（押し合い）
    // 既存の handleObstacleCollisions を呼びますが、
    // 後述の通り handleObstacleCollisions から壁判定を削除するのがベストです
    this.handleEntityCollisions(game); 
    
    // 4. 弾の判定（既存）
    this.checkCollisions(game);
    
    // 5. ゾーン効果（既存）
    this.applyZoneEffects(game);
  }

  /**
   * ★追加: 壁判定を行いながら移動させる (Move & Slide)
   */
  moveEntity(entity, obstacles) {
    if (entity.vx === 0 && entity.vy === 0) return;

    // --- X軸の移動 ---
    entity.x += entity.vx;
    
    // 壁との衝突チェック (X)
    for (const obs of obstacles) {
      // 既存の checkCollisionWithCircle は判定のみを行うメソッドとして使用
      if (obs.checkCollisionWithCircle(entity)) {
        // 衝突したら、障害物が押し出してくれる (resolveCollision) か、
        // 単純に移動をキャンセルする
        
        // ここでは既存の優秀な resolveCollision を使って「押し出し」てもらいます
        const hit = obs.resolveCollision(entity, true); 
        // もし resolveCollision が座標を直接直してくれるならこれでOK
        // 単純なキャンセルにするなら: entity.x -= entity.vx;
      }
    }

    // --- Y軸の移動 ---
    entity.y += entity.vy;
    
    // 壁との衝突チェック (Y)
    for (const obs of obstacles) {
       if (obs.checkCollisionWithCircle(entity)) {
         obs.resolveCollision(entity, true);
       }
    }

    // 画面端の制限
    this.clampPosition(entity);

    // 動きがあったらフラグを立てる
    if (entity.vx !== 0 || entity.vy !== 0) {
       entity.isDirty = true;
    }
  }

  /**
   * 既存の handleObstacleCollisions をリネームまたは修正推奨
   * 壁判定は moveEntity でやったので、ここは「キャラ同士」の処理にします
   */
  handleEntityCollisions(game) {
    const checkedPairs = new Set();
    
    // プレイヤー vs プレイヤー / 敵
    game.players.forEach((player1) => {
       if (player1.isDead) return;
       const nearby = game.grid.getNearbyEntities(player1);
       
       for (const entity of nearby) {
         // ★変更: 壁(ServerObstacle)との判定は moveEntity で終わってるのでスキップ
         if (entity instanceof ServerObstacle) continue; 

         // 以下、PvP, PvE の押し合いロジックはそのまま維持
         // [cite: 384-392] のロジック
         if (entity instanceof ServerPlayer) {
            // ... (既存のPvP判定コード) ...
            this.resolveOverlap(player1, entity); // 共通化したメソッドがあればそれを使う
         }
         else if (entity instanceof ServerEnemy) {
            // ... (既存のPvE判定コード) ...
             this.resolveOverlap(player1, entity);
         }
       }
    });
    
    // 敵同士の重なり解消が必要ならここに追加
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
