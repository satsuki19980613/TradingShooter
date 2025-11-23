import { WebSocket } from "ws";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";

const R = (val) => Math.round(val * 100) / 100;
const R1 = (val) => Math.round(val * 10) / 10;
const MSG_TYPE_DELTA = 1;

export class ServerNetworkSystem {
  constructor(game) {
    this.game = game;
    this.buffer = Buffer.allocUnsafe(64 * 1024);
  }

  broadcastGameState(players, frameEvents) {
    const eventsToSend = frameEvents.length > 0 ? frameEvents : null;

    const useBinary = !eventsToSend;

    players.forEach((player) => {
      if (!player.ws || player.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const relevantEntityMaps = this.getRelevantEntityMapsFor(player);

      if (useBinary) {
        const binaryData = this.createBinaryDelta(
          player.lastBroadcastState,
          relevantEntityMaps
        );
        if (binaryData.length > 0) {
          this.safeSend(player.ws, binaryData);
        }
      } else {
        const delta = this.createDeltaPayload_Dirty(
          player.lastBroadcastState,
          relevantEntityMaps
        );
        if (eventsToSend) delta.events = eventsToSend;

        if (
          (delta.events && delta.events.length > 0) ||
          delta.updated.players.length > 0 ||
          delta.updated.enemies.length > 0 ||
          delta.updated.bullets.length > 0 ||
          delta.removed.players.length > 0 ||
          delta.removed.enemies.length > 0 ||
          delta.removed.bullets.length > 0
        ) {
          this.safeSend(
            player.ws,
            JSON.stringify({
              type: "game_state_delta",
              payload: delta,
            })
          );
        }
      }

      relevantEntityMaps.players.forEach((p) => (p.isDirty = false));
      relevantEntityMaps.enemies.forEach((e) => (e.isDirty = false));
      relevantEntityMaps.bullets.forEach((b) => (b.isDirty = false));

      player.lastBroadcastState = relevantEntityMaps;
    });
  }

  /**
   * 差分ペイロードの生成 (JSON用)
   * ※ステップ2の状態を維持
   */
  createDeltaPayload_Dirty(oldEntityMaps, newEntityMaps) {
    const delta = {
      updated: { players: [], enemies: [], bullets: [] },
      removed: { players: [], enemies: [], bullets: [] },
    };

    for (const [id, entity] of newEntityMaps.players.entries()) {
      delta.updated.players.push(this.compressPlayer(entity.getState()));
    }
    for (const id of oldEntityMaps.players.keys()) {
      if (!newEntityMaps.players.has(id)) delta.removed.players.push(id);
    }

    for (const [id, entity] of newEntityMaps.enemies.entries()) {
      delta.updated.enemies.push(this.compressEnemy(entity.getState()));
    }
    for (const id of oldEntityMaps.enemies.keys()) {
      if (!newEntityMaps.enemies.has(id)) delta.removed.enemies.push(id);
    }

    for (const [id, entity] of newEntityMaps.bullets.entries()) {
      delta.updated.bullets.push(this.compressBullet(entity.getState()));
    }
    for (const id of oldEntityMaps.bullets.keys()) {
      if (!newEntityMaps.bullets.has(id)) delta.removed.bullets.push(id);
    }
    return delta;
  }

  /**
   * バイナリデータの生成（削除情報とトレード情報を含む完全版）
   */
  createBinaryDelta(oldEntityMaps, newEntityMaps) {
    let offset = 0;
    offset = this.buffer.writeUInt8(MSG_TYPE_DELTA, offset);

    const removedPlayers = [];
    if (oldEntityMaps && oldEntityMaps.players) {
      for (const id of oldEntityMaps.players.keys()) {
        if (!newEntityMaps.players.has(id)) removedPlayers.push(id);
      }
    }
    offset = this.buffer.writeUInt8(
      Math.min(removedPlayers.length, 255),
      offset
    );
    for (const id of removedPlayers) offset = this.writeString(id, offset);

    const removedEnemies = [];
    if (oldEntityMaps && oldEntityMaps.enemies) {
      for (const id of oldEntityMaps.enemies.keys()) {
        if (!newEntityMaps.enemies.has(id)) removedEnemies.push(id);
      }
    }
    offset = this.buffer.writeUInt8(
      Math.min(removedEnemies.length, 255),
      offset
    );
    for (const id of removedEnemies) offset = this.writeString(id, offset);

    const removedBullets = [];
    if (oldEntityMaps && oldEntityMaps.bullets) {
      for (const id of oldEntityMaps.bullets.keys()) {
        if (!newEntityMaps.bullets.has(id)) removedBullets.push(id);
      }
    }
    offset = this.buffer.writeUInt16LE(
      Math.min(removedBullets.length, 65535),
      offset
    );
    for (const id of removedBullets) offset = this.writeString(id, offset);

    const players = Array.from(newEntityMaps.players.values());
    offset = this.buffer.writeUInt8(Math.min(players.length, 255), offset);

    for (const p of players) {
      const s = p.getState();
      offset = this.writeString(s.id, offset);
      offset = this.buffer.writeFloatLE(R(s.x), offset);
      offset = this.buffer.writeFloatLE(R(s.y), offset);
      offset = this.buffer.writeUInt8(
        Math.min(Math.max(0, Math.ceil(s.hp)), 255),
        offset
      );
      offset = this.buffer.writeFloatLE(R1(s.aimAngle), offset);
      offset = this.buffer.writeUInt8(s.isDead ? 1 : 0, offset);
      offset = this.buffer.writeUInt16LE(Math.floor(s.ep), offset);

      offset = this.buffer.writeUInt16LE(s.chargeBetAmount || 10, offset);

      if (s.chargePosition) {
        offset = this.buffer.writeUInt8(1, offset);
        offset = this.buffer.writeFloatLE(s.chargePosition.entryPrice, offset);
        offset = this.buffer.writeFloatLE(s.chargePosition.amount, offset);
      } else {
        offset = this.buffer.writeUInt8(0, offset);
      }

      const bullets = s.stockedBullets || [];
      offset = this.buffer.writeUInt8(Math.min(bullets.length, 255), offset);
      for (const dmg of bullets) {
        offset = this.buffer.writeUInt16LE(Math.ceil(dmg), offset);
      }
    }

    const enemies = Array.from(newEntityMaps.enemies.values());
    offset = this.buffer.writeUInt8(Math.min(enemies.length, 255), offset);
    for (const e of enemies) {
      const s = e.getState();
      offset = this.writeString(s.id, offset);
      offset = this.buffer.writeFloatLE(R(s.x), offset);
      offset = this.buffer.writeFloatLE(R(s.y), offset);
      offset = this.buffer.writeUInt8(
        Math.min(Math.max(0, Math.ceil(s.hp)), 255),
        offset
      );
      offset = this.buffer.writeFloatLE(R1(s.targetAngle || 0), offset);
    }

    const bullets = Array.from(newEntityMaps.bullets.values());
    offset = this.buffer.writeUInt16LE(Math.min(bullets.length, 65535), offset);
    for (const b of bullets) {
      const s = b.getState();
      offset = this.writeString(s.id, offset);
      offset = this.buffer.writeFloatLE(R(s.x), offset);
      offset = this.buffer.writeFloatLE(R(s.y), offset);
      offset = this.buffer.writeFloatLE(R1(s.angle), offset);

      let typeId = 0;
      if (s.type === "enemy") typeId = 1;
      else if (s.type === "player_special") typeId = 2;
      else if (s.type === 'item_ep') typeId = 3;
      offset = this.buffer.writeUInt8(typeId, offset);
    }

    return this.buffer.subarray(0, offset);
  }

  writeString(str, offset) {
    const len = Buffer.byteLength(str);
    offset = this.buffer.writeUInt8(len, offset);
    offset += this.buffer.write(str, offset, len, "utf8");
    return offset;
  }

  compressPlayer(s) {
    return {
      i: s.id,
      x: R(s.x),
      y: R(s.y),
      h: s.hp,
      e: Math.floor(s.ep),
      a: R1(s.aimAngle),
      n: s.name,
      ba: s.chargeBetAmount,
      cp: s.chargePosition
        ? { ep: s.chargePosition.entryPrice, a: s.chargePosition.amount }
        : null,
      sb: s.stockedBullets,
      d: s.isDead ? 1 : 0,
    };
  }
  compressEnemy(s) {
    return { i: s.id, x: R(s.x), y: R(s.y), h: s.hp, ta: R1(s.targetAngle) };
  }
  compressBullet(s) {
    return {
      i: s.id,
      x: R(s.x),
      y: R(s.y),
      r: s.radius,
      t: s.type,
      a: R1(s.angle),
    };
  }

  getRelevantEntityMapsFor(player) {
    const viewport = { x: player.x, y: player.y, radius: 700 };
    const nearbyEntities = this.game.grid.getNearbyEntities(viewport);
    const playersMap = new Map();
    const enemiesMap = new Map();
    const bulletsMap = new Map();
    nearbyEntities.forEach((entity) => {
      if (entity instanceof ServerPlayer) {
        if (entity.id !== player.id) playersMap.set(entity.id, entity);
      } else if (entity instanceof ServerEnemy) {
        enemiesMap.set(entity.id, entity);
      } else if (entity instanceof ServerBullet) {
        bulletsMap.set(entity.id, entity);
      }
    });
    playersMap.set(player.id, player);
    return { players: playersMap, enemies: enemiesMap, bullets: bulletsMap };
  }

  sendSnapshot(player) {
    const entityMaps = this.getRelevantEntityMapsFor(player);
    const snapshotPayload = {
      players: Array.from(entityMaps.players.values()).map((p) =>
        this.compressPlayer(p.getState())
      ),
      enemies: Array.from(entityMaps.enemies.values()).map((e) =>
        this.compressEnemy(e.getState())
      ),
      bullets: Array.from(entityMaps.bullets.values()).map((b) =>
        this.compressBullet(b.getState())
      ),
    };
    this.safeSend(
      player.ws,
      JSON.stringify({
        type: "game_state_snapshot",
        payload: snapshotPayload,
      })
    );
    player.lastBroadcastState = entityMaps;
  }

  broadcastLeaderboard(players, leaderboardData, serverStats) {
    const payload = { leaderboardData, serverStats };
    const message = JSON.stringify({ type: "leaderboard_update", payload });
    players.forEach((p) => this.safeSend(p.ws, message));
  }
  broadcastChartUpdate(players, chartDeltaState) {
    const message = JSON.stringify({
      type: "chart_update",
      payload: chartDeltaState,
    });
    players.forEach((p) => this.safeSend(p.ws, message));
  }
  safeSend(ws, msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (e) {}
    }
  }
}
