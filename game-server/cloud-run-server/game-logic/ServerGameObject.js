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
    // ▼▼▼ 新しく追加 ▼▼▼
    this.borderRadius = 0; // デフォルトは0 (角ばった四角)
    this.borderBottomLeftRadius = 0; // 個別の角設定
    this.borderBottomRightRadius = 0;
    this.borderTopLeftRadius = 0;
    this.borderTopRightRadius = 0;
    // ▲▲▲ ここまで ▲▲▲
  }
}
