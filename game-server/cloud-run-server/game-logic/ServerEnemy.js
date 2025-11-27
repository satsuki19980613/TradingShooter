/**
 * 【ServerPlayer / ServerEnemy の役割: データモデルと意思決定】
 * 自身のステータス（HP, EP）を管理し、「どう動きたいか」という意図（速度）を決定します。
 * * ■ 担当する責務 (Do):
 * - ステータス管理 (HP, EP, 名前, スコア)
 * - 入力またはAIに基づく「移動の意思決定」 (vx, vy の設定)
 * - 攻撃の意思決定 (弾の生成リクエスト)
 * * ■ 担当しない責務 (Don't):
 * - 自身の座標 (x, y) の直接更新 (物理演算は PhysicsSystem に任せる)
 * - 壁や他キャラとの衝突判定
 * - 通信ソケットの直接操作 (ws.send は NetworkSystem 経由で行う)
 */
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

    this.moveTimer--;

    if (this.moveTimer <= 0) {
      if (player) {
        const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
        if (distToPlayer < 500) {
          this.targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
        } else {
          this.targetAngle += (Math.random() - 0.5) * 0.5;
        }
      } else {
        this.targetAngle += (Math.random() - 0.5) * 1.0;
      }

      this.moveTimer = 60;
    }

    this.vx = Math.cos(this.targetAngle) * this.speed;
    this.vy = Math.sin(this.targetAngle) * this.speed;
    this.isDirty = true;

    this.shootCooldown--;

    if (player && this.shootCooldown <= 0) {
      const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
      if (distToPlayer < 500) {
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
        attackerPlayer.hp = Math.min(100, attackerPlayer.hp + 20);
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
