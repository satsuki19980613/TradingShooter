import { ServerGameObject } from "./ServerGameObject.js";
import { ServerBullet } from "./ServerBullet.js";

/**
 * サーバー側のプレイヤークラス (ロジックのみ)
 */
export class ServerPlayer extends ServerGameObject {
  constructor(id, name, x, y, ws, isDebug = false) {
    super(x, y, 45);
    this.ws = ws;
    this.id = id;
    this.name = name;
    this.score = 0;
    this.hp = 100;
    this.ep = 100;
    this.defaultSpeed = 6.5;
    this.speed = this.defaultSpeed;
    this.shootCooldown = 0;
    this.isDead = false;
    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;
    this.inputs = {};
    this.inputPressed = {};
    this.mouseWorldPos = { x: 0, y: 0 };
    this.lastInputTime = Date.now();
    this.isPaused = false;
    this.deathCleanupTimer = null;
    this.isDebugPlayer = isDebug;
    this.lastBroadcastState = {
      players: new Map(),
      enemies: new Map(),
      bullets: new Map(),
    };
  }

  /**
   * ServerGame からクライアントの入力がセットされる
   */
  setInput(inputActions) {
    if (this.isDead) {
      this.inputs = {};
      this.inputPressed = {};
      return;
    }
    this.inputs = inputActions.states || {};
    this.inputPressed = inputActions.wasPressed || {};
    if (inputActions.mouseWorldPos) {
      this.mouseWorldPos = inputActions.mouseWorldPos;
      this.isDirty = true;
    }
  }

  /**
   * サーバーのゲームループで呼ばれる
   */

  update(game) {
    if (this.isDead) return;
    this.speed = this.defaultSpeed;
    let moved = false;

    let dx = 0;
    let dy = 0;

    if (this.inputs["move_up"]) dy -= 1;
    if (this.inputs["move_down"]) dy += 1;
    if (this.inputs["move_left"]) dx -= 1;
    if (this.inputs["move_right"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);

      dx /= length;
      dy /= length;

      this.x += dx * this.speed;
      this.y += dy * this.speed;
      moved = true;
    }

    if (moved) {
      this.isDirty = true;
      this.x = Math.max(
        this.radius,
        Math.min(game.WORLD_WIDTH - this.radius, this.x)
      );
      this.y = Math.max(
        this.radius,
        Math.min(game.WORLD_HEIGHT - this.radius, this.y)
      );
    }

    if (this.shootCooldown > 0) this.shootCooldown--;
    this.score = Math.floor(this.ep - 100);
  }

  shoot(targetX, targetY, game) {
    if (this.shootCooldown > 0 || this.stockedBullets.length === 0) {
      return;
    }
    const damage = this.stockedBullets.pop();
    this.isDirty = true;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 8;
    const radius = 8;
    game.addBullet(
      new ServerBullet(
        this.x,
        this.y,
        radius,
        angle,
        speed,
        "player_special",
        damage,
        this.id
      )
    );
    this.shootCooldown = 15;
  }

  specialAttack(totalDamage) {
    if (this.stockedBullets.length < this.maxStock) {
      this.stockedBullets.push(totalDamage);
      this.isDirty = true;
    }
  }

  takeDamage(amount, game, attackerPlayer = null) {
    if (this.isDead) return;

    this.hp -= Math.ceil(amount);
    if (this.hp < 0) this.hp = 0;
    if (this.hp <= 0) {
      this.isDead = true;
      game.handlePlayerDeath(this, attackerPlayer);
    }
    this.isDirty = true;
  }

  /**
   * クライアントへのブロードキャスト用に、軽量な状態を返す
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      hp: this.hp,
      ep: this.ep,

      aimAngle: Math.atan2(
        this.mouseWorldPos.y - this.y,
        this.mouseWorldPos.x - this.x
      ),

      chargeBetAmount: this.chargeBetAmount,
      chargePosition: this.chargePosition,
      stockedBullets: this.stockedBullets,

      isDead: this.isDead,
    };
  }
}
