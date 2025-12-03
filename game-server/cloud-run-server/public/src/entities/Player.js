import { GameObject } from "./GameObject.js";

function lerpAngle(current, target, rate) {
  let delta = target - current;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * rate;
}

export class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 45, "#00bcd4");
    this.rotationAngle = 0;
    this.aimAngle = 0;
    this.targetAimAngle = 0;
    this.isInitialized = false;

    this.hp = 100;
    this.ep = 100;
    this.name = "";

    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;

    this.isDead = false;

    this.hoverOffset = 0;
  }

  update(gameInstance) {
    super.update();

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    if (dx * dx + dy * dy > 1) {
      const moveAngle = Math.atan2(dy, dx);
      this.rotationAngle = lerpAngle(this.rotationAngle, moveAngle, 0.1);
    }

    this.hoverOffset = Math.sin(Date.now() / 200) * 3;

    this.lockedTarget = null;

    if (this.isMe && gameInstance) {
      const target = gameInstance.findNearestTarget(this, 5);

      if (target) {
        this.lockedTarget = target;

        this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
      } else {
        this.aimAngle = this.rotationAngle;
      }
    } else if (!this.isMe) {
    }
  }

  /**
   * サーバーからの状態同期
   * 【修正】消えてしまっていたチャージ情報等の同期を復活
   */
  setState(state) {
    this.id = state.i;

    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.aimAngle = state.a;
      this.rotationAngle = state.a;
      this.isInitialized = true;
    }

    if (state.n) this.name = state.n;
    if (this.isMe) {
      const dist = Math.sqrt(
        Math.pow(state.x - this.x, 2) + Math.pow(state.y - this.y, 2)
      );

      const TOLERANCE = 20.0;

      if (dist > TOLERANCE) {
        this.targetX = state.x;
        this.targetY = state.y;
      } else {
        this.targetX = this.x;
        this.targetY = this.y;
      }
    } else {
      this.targetX = state.x;
      this.targetY = state.y;
    }
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetAimAngle = state.a;

    this.hp = state.h;
    this.ep = state.e;
    this.isDead = !!state.d;

    this.chargeBetAmount = state.ba;

    if (state.cp) {
      this.chargePosition = {
        entryPrice: state.cp.ep,
        amount: state.cp.a,
        type: state.cp.t || "long",
      };
    } else {
      this.chargePosition = null;
    }

    this.stockedBullets = state.sb;
  }
}
