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
    
    // nengiのエンティティへの参照
    this.nengiEntity = null;
  }

  // ★ nengiから最新の補間済み座標・ステータスを反映
  updateFromNengi() {
    if (this.nengiEntity) {
      // 座標の同期
      this.x = this.nengiEntity.x;
      this.y = this.nengiEntity.y;
      
      // 回転の同期 (nengiConfigで rotation として定義)
      this.rotationAngle = this.nengiEntity.rotation;
      this.aimAngle = this.nengiEntity.rotation; // 仮: 照準も体の向きと同じにする

      // ステータスの同期
      this.hp = this.nengiEntity.hp;
      this.ep = this.nengiEntity.ep;
      this.isDead = this.nengiEntity.isDead;
      this.name = this.nengiEntity.name;
      
      // トレード情報の同期 (nengiConfigでフラット化されているものを構造体に戻す)
      this.chargeBetAmount = this.nengiEntity.chargeBetAmount;
      
      if (this.nengiEntity.hasCharge) {
          this.chargePosition = {
              entryPrice: this.nengiEntity.chargeEntryPrice,
              amount: this.nengiEntity.chargeAmount,
              type: this.nengiEntity.chargeType === 1 ? "short" : "long"
          };
      } else {
          this.chargePosition = null;
      }
    }
  }

  update(gameInstance, deltaFrames = 1.0) {
    // GameObject.js の update（Lerp移動）は nengi が管理するため不要だが、
    // 親クラスの処理があれば呼ぶ（現状はLerpのみならコメントアウトでも可）
    // super.update(deltaFrames); 

    // ホバーアニメーション（見た目だけ）
    this.hoverOffset = Math.sin(Date.now() / 200) * 3;

    this.lockedTarget = null;

    if (this.isMe && gameInstance) {
      const target = gameInstance.findNearestTarget(this, 5);

      if (target) {
        this.lockedTarget = target;
        // ロックオン時は見た目の照準をターゲットに向ける
        this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
      }
    }
  }

  // 独自バイナリパケット用の setState は不要になったため削除
}