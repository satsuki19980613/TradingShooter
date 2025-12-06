import { MovementLogic } from "../../logic/MovementLogic.js";
import { CollisionLogic } from "../../logic/CollisionLogic.js";
import { GameConstants } from "../../core/constants/GameConstants.js";

/**
 * 簡易空間分割グリッド（内部利用）
 */
class SpatialGrid {
  constructor(width, height, cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
  clear() {
    this.grid.clear();
  }
  insert(entity) {
    const r = entity.radius || 0;
    const minX = Math.floor((entity.x - r) / this.cellSize);
    const maxX = Math.floor((entity.x + r) / this.cellSize);
    const minY = Math.floor((entity.y - r) / this.cellSize);
    const maxY = Math.floor((entity.y + r) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(entity);
      }
    }
  }
  getNearby(entity) {
    const r = entity.radius || 0;
    const minX = Math.floor((entity.x - r) / this.cellSize);
    const maxX = Math.floor((entity.x + r) / this.cellSize);
    const minY = Math.floor((entity.y - r) / this.cellSize);
    const maxY = Math.floor((entity.y + r) / this.cellSize);

    const result = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = this.grid.get(`${x},${y}`);
        if (cell) {
          for (const e of cell) {
            if (e !== entity) result.add(e);
          }
        }
      }
    }
    return result;
  }
}

/**
 * 物理演算と移動、衝突判定を行うシステム
 */
export class PhysicsSystem {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.grid = new SpatialGrid(
      worldWidth,
      worldHeight,
      GameConstants.GRID_CELL_SIZE
    );
    this.staticGrid = new SpatialGrid(
      worldWidth,
      worldHeight,
      GameConstants.GRID_CELL_SIZE
    );
    this.staticInitialized = false;
  }

  initStatic(obstacles) {
    if (this.staticInitialized) return;
    obstacles.forEach((obs) => {
      const r = Math.max(obs.width, obs.height);
      this.staticGrid.insert({
        x: obs.centerX,
        y: obs.centerY,
        radius: r,
        _ref: obs,
      });
    });
    this.staticInitialized = true;
  }

  update(worldState, dt = 1.0) {
    if (!this.staticInitialized) this.initStatic(worldState.obstacles);
    this.grid.clear();

    worldState.players.forEach((p) => !p.isDead && this.grid.insert(p));
    worldState.enemies.forEach((e) => this.grid.insert(e));
    worldState.bullets.forEach((b) => this.grid.insert(b));

    worldState.players.forEach((player) => {
      if (player.isDead) return;

      const { vx, vy, angle } = MovementLogic.calculatePlayerVelocity(
        player.inputs,
        player.speed
      );
      player.vx = vx;
      player.vy = vy;
      if (angle !== null) player.angle = angle;

      const nextPos = MovementLogic.updatePosition(
        player.x,
        player.y,
        player.vx,
        player.vy
      );
      player.x = nextPos.x;
      player.y = nextPos.y;

      this.resolveObstacleCollisions(player, worldState);

      const clamped = CollisionLogic.clampPosition(
        player.x,
        player.y,
        player.radius,
        this.worldWidth,
        this.worldHeight
      );
      player.x = clamped.x;
      player.y = clamped.y;
    });

    worldState.enemies.forEach((enemy) => {
      const nextPos = MovementLogic.updatePosition(
        enemy.x,
        enemy.y,
        enemy.vx,
        enemy.vy
      );
      enemy.x = nextPos.x;
      enemy.y = nextPos.y;

      this.resolveObstacleCollisions(enemy, worldState);

      const clamped = CollisionLogic.clampPosition(
        enemy.x,
        enemy.y,
        enemy.radius,
        this.worldWidth,
        this.worldHeight
      );
      enemy.x = clamped.x;
      enemy.y = clamped.y;
    });

    this.resolveEntityCollisions(worldState);

    for (let i = worldState.bullets.length - 1; i >= 0; i--) {
      const b = worldState.bullets[i];
      const nextPos = MovementLogic.updatePosition(b.x, b.y, b.vx, b.vy);
      b.x = nextPos.x;
      b.y = nextPos.y;

      if (
        b.x < 0 ||
        b.x > this.worldWidth ||
        b.y < 0 ||
        b.y > this.worldHeight
      ) {
        worldState.bullets.splice(i, 1);
        continue;
      }

      let hitWall = false;

      const nearbyWalls = this.staticGrid.getNearby(b);
      for (const wallWrapper of nearbyWalls) {
        const obs = wallWrapper._ref;
        if (
          CollisionLogic.solveSingleCollider(
            b.x,
            b.y,
            b.radius,
            obs.centerX,
            obs.centerY,
            obs.colliders[0]
          ).hit
        ) {
          for (const c of obs.colliders) {
            if (
              CollisionLogic.solveSingleCollider(
                b.x,
                b.y,
                b.radius,
                obs.centerX,
                obs.centerY,
                c
              ).hit
            ) {
              hitWall = true;
              break;
            }
          }
        }
        if (hitWall) break;
      }

      if (hitWall) {
        worldState.bullets.splice(i, 1);
        continue;
      }

      const nearby = this.grid.getNearby(b);
      let hitEntity = false;

      for (const target of nearby) {
        if (target.type === "player" || target.type === "enemy") {
          if (target.id === b.ownerId || target.isDead) continue;
          if (
            CollisionLogic.getDistance(b.x, b.y, target.x, target.y) <
            b.radius + target.radius
          ) {
            target.hp -= b.damage;
            worldState.frameEvents.push({
              type: "hit",
              x: b.x,
              y: b.y,
              color: "#ff9800",
            });
            hitEntity = true;
            break;
          }
        }
      }

      if (hitEntity) {
        worldState.bullets.splice(i, 1);
      }
    }
  }

  resolveObstacleCollisions(entity, worldState) {
    const nearbyWalls = this.staticGrid.getNearby(entity);
    const ITERATIONS = 4;

    for (let i = 0; i < ITERATIONS; i++) {
      let moved = false;
      for (const wallWrapper of nearbyWalls) {
        const obs = wallWrapper._ref;

        if (
          CollisionLogic.getDistance(
            entity.x,
            entity.y,
            obs.centerX,
            obs.centerY
          ) >
          entity.radius + obs.maxColliderRadius + 10
        ) {
          continue;
        }

        for (const c of obs.colliders) {
          const res = CollisionLogic.solveSingleCollider(
            entity.x,
            entity.y,
            entity.radius,
            obs.centerX,
            obs.centerY,
            c
          );
          if (res.hit) {
            entity.x += res.pushX;
            entity.y += res.pushY;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  resolveEntityCollisions(worldState) {
    const entities = [
      ...Array.from(worldState.players.values()),
      ...worldState.enemies,
    ].filter((e) => !e.isDead);

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        const push = CollisionLogic.resolveEntityOverlap(
          e1.x,
          e1.y,
          e1.radius,
          e2.x,
          e2.y,
          e2.radius
        );
        if (push) {
          e1.x += push.pushX;
          e1.y += push.pushY;
          e2.x -= push.pushX;
          e2.y -= push.pushY;
        }
      }
    }
  }
}
