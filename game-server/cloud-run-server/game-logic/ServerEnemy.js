import { ServerGameObject } from "./ServerGameObject.js";
import { ServerBullet } from "./ServerBullet.js";
import { getDistance } from "./ServerUtils.js";
import { ServerPlayer } from "./ServerPlayer.js";

/**
 * サーバー側の敵クラス (AIロジックのみ)
 */
export class ServerEnemy extends ServerGameObject {
  constructor(x, y, worldWidth, worldHeight) {
    super(x, y, 45);
    this.id = null;
    this.hp = 50;
    this.speed = 1.5;
    this.shootCooldown = Math.random() * 100 + 100;
    this.targetAngle = Math.random() * Math.PI * 2;
    this.moveTimer = 0;
    this.WORLD_WIDTH = worldWidth;
    this.WORLD_HEIGHT = worldHeight;
  }

  update(game) {
    const SEARCH_RADIUS = 700;
    const searchArea = { x: this.x, y: this.y, radius: SEARCH_RADIUS };

    const nearbyEntities = game.grid.getNearbyEntities(searchArea);

    const nearbyPlayers = [];
    for (const entity of nearbyEntities) {
      if (entity instanceof ServerPlayer) {
        nearbyPlayers.push(entity);
      }
    }

    const player = this.findClosestPlayer(nearbyPlayers);

    if (!player) return;

    this.moveTimer--;
    if (this.moveTimer <= 0) {
      const distToPlayer = getDistance(this.x, this.y, player.x, player.y);

      if (distToPlayer < 500) {
        this.targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
      } else {
        this.targetAngle += (Math.random() - 0.5) * 0.5;
      }
      this.moveTimer = 60;
    }

    this.x += Math.cos(this.targetAngle) * this.speed;
    this.y += Math.sin(this.targetAngle) * this.speed;
    this.isDirty = true;

    this.x = Math.max(
      this.radius,
      Math.min(this.WORLD_WIDTH - this.radius, this.x)
    );
    this.y = Math.max(
      this.radius,
      Math.min(this.WORLD_HEIGHT - this.radius, this.y)
    );

    this.shootCooldown--;
    if (this.shootCooldown <= 0) {
      const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
      if (distToPlayer < 700) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        game.addBullet(
          new ServerBullet(this.x, this.y, 6, angle, 5, "enemy", 10, this.id)
        );
        this.shootCooldown = 120;
      } else {
        this.shootCooldown = 60;
      }
    }
  }

  findClosestPlayer(nearbyPlayers) {
    let closestPlayer = null;
    let minDistance = Infinity;

    for (const player of nearbyPlayers) {
      if (player.isDead) continue;
      const dist = getDistance(this.x, this.y, player.x, player.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestPlayer = player;
      }
    }
    return closestPlayer;
  }

  takeDamage(amount, type, game, attackerPlayer = null) {
    this.hp -= Math.ceil(amount);

    if (this.hp <= 0) {
      if (attackerPlayer && !attackerPlayer.isDead) {
        const epBonus = type === "player_special" ? 100 : 25;

        attackerPlayer.ep += epBonus;

        attackerPlayer.isDirty = true;
      }

      game.removeEnemy(this);
    }
  }

  /**
   * クライアントへのブロードキャスト用に、軽量な状態を返す
   */
  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      hp: this.hp,
      targetAngle: this.targetAngle,
    };
  }
}
