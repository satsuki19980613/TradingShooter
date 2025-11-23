import { v4 as uuidv4 } from "uuid";

/**
 * すべてのサーバー側ゲームオブジェクトの基底クラス (描画ロジックなし)
 */
export class ServerGameObject {
  constructor(x, y, radius, type) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.isDirty = true;
    this.createdAt = Date.now();
    this.borderRadius = 0;
    this.borderBottomLeftRadius = 0;
    this.borderBottomRightRadius = 0;
    this.borderTopLeftRadius = 0;
    this.borderTopRightRadius = 0;
  }
}
