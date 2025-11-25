import { ServerGameObject } from "./ServerGameObject.js";

/**
 * 障害物クラス（RigidBody風・反復解決・ブロードフェーズ実装版）
 */
export class ServerObstacle extends ServerGameObject {
  constructor(
    x,
    y,
    width,
    height,
    type,
    borderRadius,
    individualRadii,
    rotation,
    className
  ) {
    super(x, y, Math.max(width, height), type);
    this.width = width;
    this.height = height;
    this.className = className;
    // 障害物の中心（絶対座標）
    this.rotation = (rotation || 0) * (Math.PI / 180);
    this.centerX = x + width / 2;
    this.centerY = y + height / 2;

    this.colliders = [];
    // フォールバック
    if (this.colliders.length === 0) {
      this.colliders.push({
        type: "rect",
        x: 0,
        y: 0,
        w: width,
        h: height,
        angle: 0,
      });
    }

    // ★ブロードフェーズ用：コライダー全体を包む最大半径の計算
    this.maxColliderRadius = Math.max(width, height) / 2;
  }

  setColliders(collidersData) {
    if (collidersData && collidersData.length > 0) {
      this.colliders = collidersData.filter((c) => c.type === "rect");
      
      // ★コライダー更新時に最大半径を再計算（負荷対策）
      let maxDist = 0;
      for (const c of this.colliders) {
        // コライダーの中心オフセット距離 + 対角線の半分（回転してもはみ出さない距離）
        const dist = Math.sqrt((c.x || 0) ** 2 + (c.y || 0) ** 2);
        const diag = Math.sqrt(c.w * c.w + c.h * c.h) / 2;
        if (dist + diag > maxDist) {
          maxDist = dist + diag;
        }
      }
      this.maxColliderRadius = maxDist;
    }
  }

  // 判定のみ（敵のスポーン位置確認などに使用）
  checkCollisionWithCircle(circle) {
    // 押し出し処理なし(false)で呼び出す
    return this.resolveCollision(circle, false);
  }

  // 物理的な衝突解決（プレイヤーの移動処理に使用）
  collideWith(circle) {
    this.resolveCollision(circle, true);
  }

  /**
   * ★RigidBody化のキモ：反復型ソルバー
   * 複数のコライダー間の競合を、複数回の反復計算で収束させます。
   */
  resolveCollision(circle, applyPush) {
    // 1. 【ブロードフェーズ】明らかに遠い場合は計算しない
    const distX = circle.x - this.centerX;
    const distY = circle.y - this.centerY;
    // プレイヤー半径 + 障害物の最大半径 + マージン
    const threshold = circle.radius + this.maxColliderRadius + 10;
    
    if (distX * distX + distY * distY > threshold * threshold) {
      return false;
    }

    // 2. 【ナローフェーズ】反復解決
    // 仮想的な座標を用意
    let tempX = circle.x;
    let tempY = circle.y;
    let hasCollision = false;

    // ★ここが重要: 衝突判定を複数回繰り返す（イテレーション）
    // これにより「Aから出たらBに入った」という問題を解決し、自然な位置に落ち着く
    const ITERATIONS = 4; 

    for (let i = 0; i < ITERATIONS; i++) {
      let movedInThisLoop = false;

      for (const c of this.colliders) {
        // 各コライダーとの判定と「仮想座標」の押し出しを行う
        const result = this.solveSingleCollider(tempX, tempY, circle.radius, c);
        if (result.hit) {
          hasCollision = true;
          movedInThisLoop = true;
          // 即座に座標を更新（累積させる）
          tempX += result.pushX;
          tempY += result.pushY;
        }
      }

      // この周回で一度も押されなければ、もう解決しているのでループを抜ける
      if (!movedInThisLoop) break;
    }

    // 3. 結果の適用
    if (hasCollision && applyPush) {
      circle.x = tempX;
      circle.y = tempY;
      circle.isDirty = true;
    }

    return hasCollision;
  }

  /**
   * 単一の矩形コライダーとの衝突判定＆押し出しベクトル計算
   */
  solveSingleCollider(cx, cy, radius, c) {
    // 1. コライダーの中心（絶対座標）
    const boxCenterX = this.centerX + (c.x || 0);
    const boxCenterY = this.centerY + (c.y || 0);

    // 2. 円の座標を、このコライダーの「ローカル座標系」へ変換
    const dx = cx - boxCenterX;
    const dy = cy - boxCenterY;

    // コライダーの回転角 (度 -> ラジアン) + 親の回転も考慮する場合はここに足す
    const totalAngle = (c.angle || 0) * (Math.PI / 180); // + this.rotation;
    const cos = Math.cos(-totalAngle);
    const sin = Math.sin(-totalAngle);

    // ローカル座標 (矩形の回転を打ち消した状態)
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // 3. AABB vs Circle 判定
    const halfW = c.w / 2;
    const halfH = c.h / 2;

    // 円の中心に最も近い矩形上の点
    const closestLocX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocY = Math.max(-halfH, Math.min(localY, halfH));

    // 距離チェック
    const distLocX = localX - closestLocX;
    const distLocY = localY - closestLocY;
    const distSq = distLocX * distLocX + distLocY * distLocY;

    // 衝突していない
    if (distSq > radius * radius || distSq === 0) {
        // ※ distSq === 0 (完全埋没) の処理は複雑になるため、
        //   前のループで弾かれている前提で簡易化しています。
        //   必要なら以前の埋没脱出ロジックをここに追加してください。
        return { hit: false, pushX: 0, pushY: 0 };
    }

    // 4. 押し出しベクトルの計算
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;

    // ローカル空間での押し出しベクトル
    // (中心に向かっていたベクトルを正規化して overlap 分だけ伸ばす)
    let pushLocX = 0;
    let pushLocY = 0;

    if (dist > 0) {
      pushLocX = (distLocX / dist) * overlap;
      pushLocY = (distLocY / dist) * overlap;
    }

    // 5. ワールド座標系に戻す
    const cosR = Math.cos(totalAngle);
    const sinR = Math.sin(totalAngle);

    const bestPushX = pushLocX * cosR - pushLocY * sinR;
    const bestPushY = pushLocX * sinR + pushLocY * cosR;

    return { hit: true, pushX: bestPushX, pushY: bestPushY };
  }

  getState() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      radius: Math.max(this.width, this.height),
      className: this.className,
    };
  }
}