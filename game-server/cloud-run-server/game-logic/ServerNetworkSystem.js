/**
 * 【ServerNetworkSystem の役割: 通信・シリアライズ】
 * ゲームの状態をクライアントが理解できる形式（JSON/バイナリ）に変換し、配信します。
 * * ■ 担当する責務 (Do):
 * - ゲーム状態の軽量化・圧縮 (Delta Compression)
 * - バイナリパケットの生成
 * - クライアントへのブロードキャスト (Broadcast)
 * - 特定プレイヤーへのスナップショット送信
 * * ■ 担当しない責務 (Don't):
 * - ゲーム状態の変更 (Read Only であるべき)
 * - 物理演算やゲームロジックの実行
 * - データベース操作
 */
import { WebSocket } from "ws";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";
import { PacketWriter } from "./PacketWriter.js";

const R = (val) => Math.round(val * 100) / 100;
const R1 = (val) => Math.round(val * 10) / 10;
const MSG_TYPE_DELTA = 1;

export class ServerNetworkSystem {
  constructor(game) {
    this.game = game;
    this.playerWriters = new WeakMap();
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
        let writer = this.playerWriters.get(player);
        if (!writer) {
          writer = new PacketWriter();
          this.playerWriters.set(player, writer);
        }
        writer.reset();

        const binaryData = this.createBinaryDelta(
          player.lastBroadcastState,
          relevantEntityMaps,
          writer
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
  createBinaryDelta(oldEntityMaps, newEntityMaps, writer) {

    writer.u8(MSG_TYPE_DELTA);

    const removedPlayers = [];
    if (oldEntityMaps && oldEntityMaps.players) {
      for (const id of oldEntityMaps.players.keys()) {
        if (!newEntityMaps.players.has(id)) removedPlayers.push(id);
      }
    }
    writer.u8(Math.min(removedPlayers.length, 255));
    for (const id of removedPlayers) writer.string(id);

    const removedEnemies = [];
    if (oldEntityMaps && oldEntityMaps.enemies) {
      for (const id of oldEntityMaps.enemies.keys()) {
        if (!newEntityMaps.enemies.has(id)) removedEnemies.push(id);
      }
    }
    writer.u8(Math.min(removedEnemies.length, 255));
    for (const id of removedEnemies) writer.string(id);

    const removedBullets = [];
    if (oldEntityMaps && oldEntityMaps.bullets) {
      for (const id of oldEntityMaps.bullets.keys()) {
        if (!newEntityMaps.bullets.has(id)) removedBullets.push(id);
      }
    }
    writer.u16(Math.min(removedBullets.length, 65535));
    for (const id of removedBullets) writer.string(id);

    const players = Array.from(newEntityMaps.players.values());
    writer.u8(Math.min(players.length, 255));
    for (const p of players) {
      const s = p.getState();
      writer.string(s.id);
      writer.f32(R(s.x));
      writer.f32(R(s.y));
      writer.u8(Math.min(Math.max(0, Math.ceil(s.hp)), 255));
      writer.f32(R1(s.aimAngle));
      writer.u8(s.isDead ? 1 : 0);
      writer.u16(Math.floor(s.ep));
      writer.u16(s.chargeBetAmount || 10);

      if (s.chargePosition) {
        writer.u8(1);
        writer.f32(s.chargePosition.entryPrice);
        writer.f32(s.chargePosition.amount);
        const typeId = s.chargePosition.type === "short" ? 1 : 0;
        writer.u8(typeId);
      } else {
        writer.u8(0);
      }

      const bullets = s.stockedBullets || [];
      writer.u8(Math.min(bullets.length, 255));
      for (const dmg of bullets) {
        writer.u16(Math.ceil(dmg));
      }
    }

    const enemies = Array.from(newEntityMaps.enemies.values());
    writer.u8(Math.min(enemies.length, 255));
    for (const e of enemies) {
      const s = e.getState();
      writer.string(s.id);
      writer.f32(R(s.x));
      writer.f32(R(s.y));
      writer.u8(Math.min(Math.max(0, Math.ceil(s.hp)), 255));
      writer.f32(R1(s.targetAngle || 0));
    }

    const bullets = Array.from(newEntityMaps.bullets.values());
    writer.u16(Math.min(bullets.length, 65535));
    for (const b of bullets) {
      const s = b.getState();
      writer.string(s.id);
      writer.f32(R(s.x));
      writer.f32(R(s.y));
      writer.f32(R1(s.angle));

    let typeId = 0; // デフォルト (player normal)

    if (s.type === "enemy") {
        typeId = 1;
    } else if (s.type === "player_special" || s.type === "player_special_1") {
        typeId = 2; // Tier 1
    } else if (s.type === "item_ep") {
        typeId = 3;
    } else if (s.type === "player_special_2") {
        typeId = 4; // ★Tier 2
    } else if (s.type === "player_special_3") {
        typeId = 5; // ★Tier 3
    } else if (s.type === "player_special_4") {
        typeId = 6; // ★Tier 4
    }

    writer.u8(typeId);
    }

    return writer.getData();
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
        ? {
            ep: s.chargePosition.entryPrice,
            a: s.chargePosition.amount,
            t: s.chargePosition.type,
          }
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
    const viewport = { x: player.x, y: player.y, radius: 500 };
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
