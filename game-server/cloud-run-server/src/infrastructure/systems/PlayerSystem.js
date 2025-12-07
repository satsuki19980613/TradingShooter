import { PlayerLogic } from "../../logic/PlayerLogic.js";
import { BulletState } from "../../domain/BulletState.js";

export class PlayerSystem {
  constructor(game) {
    this.game = game;
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

    const { vx, vy, angle } = PlayerLogic.calculateVelocity(
      player.inputs,
      player.speed
    );
    player.vx = vx;
    player.vy = vy;

    if (angle !== null) {
      player.angle = angle;
    }

    if (vx !== 0 || vy !== 0) {
      player.isDirty = true;
    }

    if (player.shootCooldown > 0) {
      player.shootCooldown--;
    }

    if (player.ep > 100) {
      player.score = Math.floor(player.ep - 100);
    }
  }

  handleShoot(player, inputMousePos) {
    if (player.shootCooldown > 0 || player.stockedBullets.length === 0) {
      return;
    }

    const bulletData = player.stockedBullets.pop();
    const damage =
      typeof bulletData === "object" ? bulletData.damage : bulletData;
    const type =
      typeof bulletData === "object" ? bulletData.type : "player_special_1";
    player.isDirty = true;

    let shootAngle = player.angle;

    if (inputMousePos) {
      shootAngle = Math.atan2(
        inputMousePos.y - player.y,
        inputMousePos.x - player.x
      );
    } else {
      const nearby = this.game.physicsSystem.grid.getNearbyEntities(player);
      shootAngle = PlayerLogic.calculateAutoAimAngle(
        player,
        nearby,
        player.angle
      );
    }

    player.angle = shootAngle;

    const { speed, radius } = PlayerLogic.getBulletParams(type);

    const bullet = new BulletState(
      player.x,
      player.y,
      radius,
      shootAngle,
      speed,
      type,
      damage,
      player.id
    );
    this.game.addBullet(bullet);

    player.shootCooldown = 15;
  }
}
