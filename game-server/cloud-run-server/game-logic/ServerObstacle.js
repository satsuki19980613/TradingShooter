/**
 * 【ServerObstacle の役割: 障害物と衝突解決】
 * 障害物の形状（矩形、回転）を定義し、他オブジェクトとの衝突判定・押し出し計算を行います。
 * * ■ 担当する責務 (Do):
 * - コライダー（衝突判定領域）の管理
 * - 反復計算による衝突解決 (resolveCollision)
 * * ■ 担当しない責務 (Don't):
 * - ワールド全体の管理
 * - 破壊された際のエフェクトやゲームルールの処理
 */
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

    this.rotation = (rotation || 0) * (Math.PI / 180);
    this.centerX = x + width / 2;
    this.centerY = y + height / 2;

    this.colliders = [];

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

    this.maxColliderRadius = Math.max(width, height) / 2;
  }

  setColliders(collidersData) {
    if (Array.isArray(collidersData)) {
      this.colliders = collidersData.filter((c) => c.type === "rect");

      if (this.colliders.length === 0) {
        this.maxColliderRadius = 0;
        return;
      }

      let maxDist = 0;
      for (const c of this.colliders) {
        const dist = Math.sqrt((c.x || 0) ** 2 + (c.y || 0) ** 2);
        const diag = Math.sqrt(c.w * c.w + c.h * c.h) / 2;
        if (dist + diag > maxDist) {
          maxDist = dist + diag;
        }
      }
      this.maxColliderRadius = maxDist;
    }
  }

  checkCollisionWithCircle(circle) {
    return this.resolveCollision(circle, false);
  }

  collideWith(circle) {
    this.resolveCollision(circle, true);
  }

  /**
   * ★RigidBody化のキモ：反復型ソルバー
   * 複数のコライダー間の競合を、複数回の反復計算で収束させます。a
   */
  resolveCollision(circle, applyPush) {
    const distX = circle.x - this.centerX;
    const distY = circle.y - this.centerY;

    const threshold = circle.radius + this.maxColliderRadius + 10;

    if (distX * distX + distY * distY > threshold * threshold) {
      return false;
    }

    let tempX = circle.x;
    let tempY = circle.y;
    let hasCollision = false;

    const ITERATIONS = 4;

    for (let i = 0; i < ITERATIONS; i++) {
      let movedInThisLoop = false;

      for (const c of this.colliders) {
        const result = this.solveSingleCollider(tempX, tempY, circle.radius, c);
        if (result.hit) {
          hasCollision = true;
          movedInThisLoop = true;

          tempX += result.pushX;
          tempY += result.pushY;
        }
      }

      if (!movedInThisLoop) break;
    }

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
    const boxCenterX = this.centerX + (c.x || 0);
    const boxCenterY = this.centerY + (c.y || 0);

    const dx = cx - boxCenterX;
    const dy = cy - boxCenterY;

    const totalAngle = (c.angle || 0) * (Math.PI / 180);
    const cos = Math.cos(-totalAngle);
    const sin = Math.sin(-totalAngle);

    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const halfW = c.w / 2;
    const halfH = c.h / 2;

    const closestLocX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocY = Math.max(-halfH, Math.min(localY, halfH));

    const distLocX = localX - closestLocX;
    const distLocY = localY - closestLocY;
    const distSq = distLocX * distLocX + distLocY * distLocY;

    if (distSq > radius * radius || distSq === 0) {
      return { hit: false, pushX: 0, pushY: 0 };
    }

    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;

    let pushLocX = 0;
    let pushLocY = 0;

    if (dist > 0) {
      pushLocX = (distLocX / dist) * overlap;
      pushLocY = (distLocY / dist) * overlap;
    }

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
