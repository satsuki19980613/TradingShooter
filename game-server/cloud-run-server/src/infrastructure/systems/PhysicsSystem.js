import { CollisionLogic } from "../../logic/CollisionLogic.js";
import { MovementLogic } from "../../logic/MovementLogic.js";
import { GameConstants } from "../../core/constants/GameConstants.js";

class SpatialGrid {
  constructor(width, height, cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.staticGrid = new Map();
  }

  clearDynamic() {
    this.grid.clear();
  }
  insertStatic(entity) {
    this._addToGrid(entity, this.staticGrid);
  }
  insertDynamic(entity) {
    this._addToGrid(entity, this.grid);
  }

  _addToGrid(entity, map) {
    const r =
      entity.radius || Math.max(entity.width || 0, entity.height || 0) / 2;
    const minX = Math.floor((entity.x - r) / this.cellSize);
    const maxX = Math.floor((entity.x + r) / this.cellSize);
    const minY = Math.floor((entity.y - r) / this.cellSize);
    const maxY = Math.floor((entity.y + r) / this.cellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(entity);
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
        const key = `${x},${y}`;
        if (this.staticGrid.has(key)) {
          this.staticGrid.get(key).forEach((e) => result.add(e));
        }
        if (this.grid.has(key)) {
          this.grid.get(key).forEach((e) => {
            if (e !== entity) result.add(e);
          });
        }
      }
    }
    return result;
  }
}

export class PhysicsSystem {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.grid = new SpatialGrid(
      worldWidth,
      worldHeight,
      GameConstants.GRID_CELL_SIZE
    );
    this.staticInitialized = false;
  }

  initStatic(obstacles) {
    if (this.staticInitialized) return;
    obstacles.forEach((obs) => this.grid.insertStatic(obs));
    this.staticInitialized = true;
  }

  update(worldState, dt = 1.0) {
    if (!this.staticInitialized) this.initStatic(worldState.obstacles);

    this.grid.clearDynamic();
    worldState.players.forEach((p) => !p.isDead && this.grid.insertDynamic(p));
    worldState.enemies.forEach((e) => this.grid.insertDynamic(e));

    worldState.bullets.forEach((b) => this.grid.insertDynamic(b));

    const activeEntities = [
      ...Array.from(worldState.players.values()).filter((p) => !p.isDead),
      ...worldState.enemies,
    ];

    activeEntities.forEach((entity) => {
      if (entity.vx !== 0 || entity.vy !== 0) {
        const nextPos = MovementLogic.updatePosition(
          entity.x,
          entity.y,
          entity.vx,
          entity.vy
        );
        entity.x = nextPos.x;
        entity.y = nextPos.y;
      }

      this.resolveObstacleCollisions(entity);

      const clamped = CollisionLogic.clampPosition(
        entity.x,
        entity.y,
        entity.radius,
        this.worldWidth,
        this.worldHeight
      );
      entity.x = clamped.x;
      entity.y = clamped.y;
    });

    this.resolveEntityCollisions(worldState);

    this.updateBullets(worldState);
  }

  resolveObstacleCollisions(entity) {
    const nearby = this.grid.getNearby(entity);
    for (const other of nearby) {
      if (other.type === "obstacle_wall") {
        const correctedPos = CollisionLogic.resolveObstacleCollision(
          entity.x,
          entity.y,
          entity.radius,
          other
        );
        if (correctedPos) {
          entity.x = correctedPos.x;
          entity.y = correctedPos.y;
        }
      }
    }
  }

  resolveEntityCollisions(worldState) {
    worldState.players.forEach((player) => {
      if (player.isDead) return;

      const nearby = this.grid.getNearby(player);

      for (const target of nearby) {
        if (target === player) continue;

        if (target.type === "player" || target.type === "enemy") {
          if (target.isDead) continue;

          if (target.type === "player" && player.id > target.id) continue;

          const push = CollisionLogic.resolveEntityOverlap(
            player.x,
            player.y,
            player.radius,
            target.x,
            target.y,
            target.radius
          );

          if (push) {
            player.x += push.pushX;
            player.y += push.pushY;
            target.x -= push.pushX;
            target.y -= push.pushY;

            this.resolveObstacleCollisions(player);
            this.resolveObstacleCollisions(target);
          }
        }
      }
    });
  }

  updateBullets(worldState) {
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

      let hit = false;

      const nearby = this.grid.getNearby(b);

      for (const target of nearby) {
        if (target.type === "obstacle_wall") {
          const collision = CollisionLogic.resolveObstacleCollision(
            b.x,
            b.y,
            b.radius,
            target
          );
          if (collision) {
            hit = true;
            break;
          }
        } else if (target.type === "player" || target.type === "enemy") {
          if (target.isDead) continue;
          if (b.ownerId === target.id) continue;

          const distSq = CollisionLogic.getDistanceSq(
            b.x,
            b.y,
            target.x,
            target.y
          );
          const hitRadius = b.radius + target.radius;

          if (distSq < hitRadius * hitRadius) {
            target.hp -= b.damage;
            worldState.frameEvents.push({
              type: "hit",
              x: b.x,
              y: b.y,
              color: b.type === "enemy" ? "#ff0000" : "#00ffff",
            });
            hit = true;

            if (target.hp <= 0) {
              worldState.frameEvents.push({
                type: "explosion",
                x: target.x,
                y: target.y,
                color: "#ffffff",
              });
              if (target.type === "player") target.isDead = true;
              else if (target.type === "enemy") {
                const index = worldState.enemies.indexOf(target);
                if (index > -1) worldState.enemies.splice(index, 1);
              }
            }
            break;
          }
        }
      }

      if (hit) {
        worldState.bullets.splice(i, 1);
      }
    }
  }
}
