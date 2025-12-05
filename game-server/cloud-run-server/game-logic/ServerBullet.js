import { ServerGameObject } from "./ServerGameObject.js";

// nengiConfigの定義に合わせてタイプIDをマッピング
const BULLET_TYPE_MAP = {
    "player": 0,
    "enemy": 1,
    "player_special_1": 2,
    "item_ep": 3,
    "player_special_2": 4,
    "player_special_3": 5,
    "player_special_4": 6
};

export class ServerBullet extends ServerGameObject {
  constructor(x, y, radius, angle, speed, type, damage, ownerId) {
        super(x, y, radius);
        
        // ▼ 追加: nengiプロトコル定義
        this.protocol = { name: 'Bullet' };

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.type = type;
        
        // ▼ 追加: nengiConfig用のプロパティ
        this.rotation = angle;
        this.typeId = BULLET_TYPE_MAP[type] || 0;

        this.damage = damage;
        this.ownerId = ownerId;
        this.id = null; // ServerGameでセット
    }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // 角度が変わる弾（誘導弾など）の場合はここでも更新が必要
    this.rotation = Math.atan2(this.vy, this.vx);
    
    this.isDirty = true;
  }
}