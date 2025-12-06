import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";/**
 * 敵クラス (サイバーパンク・ヘビータンク ver)
 */
export class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y, 45, "#f44336");
    this.targetAngle = 0;
    this.isInitialized = false;
    this.animationTick = 0;
  }
  updateFromNengi() {
    if (this.nengiEntity) {
      // 補間済みの座標・回転を使用
      this.x = this.nengiEntity.x;
      this.y = this.nengiEntity.y;
      
      // ServerEnemy.targetAngle を rotation として受信した場合など、
      // 定義に合わせてプロパティを読み取ります (nengiConfig依存)
      // 今回のnengiConfigでは 'rotation' は定義せず、Enemyには 'targetAngle' を定義しましたか？
      // Step 1を確認すると、Enemyには `rotation: nengi.Float32` はなく、
      // `targetAngle: nengi.Float32` が定義されています。
      // ですが、GameObjectの描画には rotationプロパティを使うのが一般的です。
      // ここではサーバーのtargetAngleをそのまま向きとして使います。
      
      this.targetAngle = this.nengiEntity.targetAngle; 
      
      // 描画用の rotation に反映（nengiが自動補間した値）
      // または、もしサーバーが `rotation` プロパティも送っているならそれを使います
      this.hp = this.nengiEntity.hp;
    }
  }
  update(deltaFrames = 1.0) {
    super.update(deltaFrames); // 親クラスに渡す
    this.animationTick++;
  }

  setState(state) {
    this.id = state.i;

    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.isInitialized = true;
    }

    this.targetX = state.x;
    this.targetY = state.y;

    this.targetAngle = state.ta;
    this.hp = state.h;
  }

}
