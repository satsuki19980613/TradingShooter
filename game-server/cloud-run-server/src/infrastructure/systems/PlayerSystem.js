import { PlayerLogic } from "../../logic/PlayerLogic.js";
import { BulletState } from "../../domain/BulletState.js";
import { AimingService } from "../../domain/services/AimingService.js";

export class PlayerSystem {
  constructor(game) {
    this.game = game;
    this.tempVelocityResult = { vx: 0, vy: 0, angle: null };
  }

  update() {
    this.game.worldState.players.forEach((player) => {
      this.updatePlayer(player);
    });
  }

  updatePlayer(player) {
    if (player.isDead) {
      player.vx = 0;
      player.vy = 0;
      return;
    }

    PlayerLogic.calculateVelocity(
      player.inputs,
      player.speed,
      player.angle,
      player.vx,
      player.vy,
      this.tempVelocityResult
    );

    player.vx = this.tempVelocityResult.vx;
    player.vy = this.tempVelocityResult.vy;

    if (this.tempVelocityResult.angle !== null) {
      player.angle = this.tempVelocityResult.angle;
    }

    const autoAimAngle = AimingService.determineShootAngle(
      player,
      this.game.physicsSystem
    );

    if (autoAimAngle !== null && autoAimAngle !== undefined) {
      player.aimAngle = autoAimAngle;
    } else if (angle !== null) {
      player.aimAngle = angle;
    }

    if (player.vx !== 0 || player.vy !== 0) {
      player.isDirty = true;
    }
    if (player.shootCooldown > 0) {
      player.shootCooldown--;
    }

    if (player.ep > 100) {
      player.score = Math.floor(player.ep - 100);
    }
  }

  /**
   * 射撃処理の実行
   * @param {Object} player
   */
  handleShoot(player) {
    if (player.shootCooldown > 0 || player.stockedBullets.length === 0) {
      return;
    }

    const bulletData = player.stockedBullets.pop();
    const damage =
      typeof bulletData === "object" ? bulletData.damage : bulletData;
    const type =
      typeof bulletData === "object" ? bulletData.type : "player_special_1";
    player.isDirty = true;

    const shootAngle = AimingService.determineShootAngle(
      player,
      this.game.physicsSystem
    );
    player.angle = shootAngle;

    const params = PlayerLogic.getBulletParams(type);

    const offsetDist = 85;
    const spawnX = player.x + Math.cos(shootAngle) * offsetDist;
    const spawnY = player.y + Math.sin(shootAngle) * offsetDist;

    const initialSpeed = params.speed;
    
    const bullet = new BulletState(
      spawnX,
      spawnY,
      params.radius,
      shootAngle,
      initialSpeed,
      type,
      damage,
      player.id
    );

    if (params.delay > 0) {
      bullet.chargeTimer = params.delay;
      bullet.realSpeed = params.speed;
      bullet.shouldFollow = params.follow;
    }


    player.shootCooldown = params.cooldown || 15;
  }
}
