// game-server/cloud-run-server/game-logic/ServerNetworkSystem.js

import { WebSocket } from "ws";
import { ServerPlayer } from "./ServerPlayer.js";
import { ServerEnemy } from "./ServerEnemy.js";
import { ServerBullet } from "./ServerBullet.js";
import { PacketWriter } from "./PacketWriter.js";

const MSG_TYPE_DELTA = 1;

export class ServerNetworkSystem {
  constructor(game) {
    this.game = game;
    this.playerWriters = new WeakMap();
  }

  broadcastGameState(players, frameEvents) {
    players.forEach((player) => {
      if (!player.ws || player.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const relevantEntityMaps = this.getRelevantEntityMapsFor(player);

      let writer = this.playerWriters.get(player);
      if (!writer) {
        writer = new PacketWriter();
        this.playerWriters.set(player, writer);
      }
      writer.reset();

      const binaryData = this.createBinaryDelta(
        player.lastBroadcastState,
        relevantEntityMaps,
        writer,
        frameEvents
      );

      if (binaryData.length > 0) {
        this.safeSend(player.ws, binaryData);
      }

      // Dirtyフラグのリセット
      // (Mapのvaluesイテレータを使って直接リセット)
      for (const p of relevantEntityMaps.players.values()) p.isDirty = false;
      for (const e of relevantEntityMaps.enemies.values()) e.isDirty = false;
      for (const b of relevantEntityMaps.bullets.values()) b.isDirty = false;

      player.lastBroadcastState = relevantEntityMaps;
    });
  }

  /**
   * バイナリデータの生成（最適化版）
   * - Array.from() の削除
   * - getState() の廃止（直接アクセス）
   */
  createBinaryDelta(oldEntityMaps, newEntityMaps, writer, events) {
    writer.u8(MSG_TYPE_DELTA);

    // --- 1. 削除されたエンティティ ---
    // (ここは削除リストを作る必要があるため配列操作は許容)
    let removedCount = 0;
    const removedPlayersStart = writer.offset; // 後で個数を書き込む位置
    writer.u8(0); // 仮の個数

    if (oldEntityMaps && oldEntityMaps.players) {
      for (const id of oldEntityMaps.players.keys()) {
        if (!newEntityMaps.players.has(id)) {
            writer.string(id);
            removedCount++;
        }
      }
    }
    // 個数を上書き
    writer.buffer.writeUInt8(Math.min(removedCount, 255), removedPlayersStart);

    removedCount = 0;
    const removedEnemiesStart = writer.offset;
    writer.u8(0);
    if (oldEntityMaps && oldEntityMaps.enemies) {
      for (const id of oldEntityMaps.enemies.keys()) {
        if (!newEntityMaps.enemies.has(id)) {
            writer.string(id);
            removedCount++;
        }
      }
    }
    writer.buffer.writeUInt8(Math.min(removedCount, 255), removedEnemiesStart);

    removedCount = 0;
    const removedBulletsStart = writer.offset;
    writer.u16(0);
    if (oldEntityMaps && oldEntityMaps.bullets) {
      for (const id of oldEntityMaps.bullets.keys()) {
        if (!newEntityMaps.bullets.has(id)) {
            writer.string(id);
            removedCount++;
        }
      }
    }
    writer.buffer.writeUInt16LE(Math.min(removedCount, 65535), removedBulletsStart);


    // --- 2. 更新されたエンティティ (直接ループ・直接アクセス) ---
    
    // Players
    writer.u8(Math.min(newEntityMaps.players.size, 255));
    for (const p of newEntityMaps.players.values()) {
      writer.string(p.id);
      writer.f32(Math.round(p.x * 100) / 100);
      writer.f32(Math.round(p.y * 100) / 100);
      writer.u8(Math.min(Math.max(0, Math.ceil(p.hp)), 255));
      writer.f32(Math.round(p.angle * 10) / 10); // aimAngle -> angle (ServerPlayer参照)
      writer.u8(p.isDead ? 1 : 0);
      writer.u16(Math.floor(p.ep));
      writer.u16(p.chargeBetAmount || 10);
      
      if (p.chargePosition) {
        writer.u8(1);
        writer.f32(p.chargePosition.entryPrice);
        writer.f32(p.chargePosition.amount);
        const typeId = p.chargePosition.type === "short" ? 1 : 0;
        writer.u8(typeId);
      } else {
        writer.u8(0);
      }

      // Stocked Bullets (getStateを使わず直接処理)
      const bullets = p.stockedBullets || [];
      writer.u8(Math.min(bullets.length, 255));
      for (const b of bullets) {
        // オブジェクトか数値かを判定してダメージ値を取得
        const dmg = typeof b === "object" ? b.damage : b;
        writer.u16(Math.ceil(dmg));
      }
    }

    // Enemies
    writer.u8(Math.min(newEntityMaps.enemies.size, 255));
    for (const e of newEntityMaps.enemies.values()) {
      writer.string(e.id);
      writer.f32(Math.round(e.x * 100) / 100);
      writer.f32(Math.round(e.y * 100) / 100);
      writer.u8(Math.min(Math.max(0, Math.ceil(e.hp)), 255));
      writer.f32(Math.round((e.targetAngle || 0) * 10) / 10);
    }

    // Bullets
    writer.u16(Math.min(newEntityMaps.bullets.size, 65535));
    for (const b of newEntityMaps.bullets.values()) {
      writer.string(b.id);
      writer.f32(Math.round(b.x * 100) / 100);
      writer.f32(Math.round(b.y * 100) / 100);
      
      // 弾の角度は vx, vy から計算 (getStateを使わないため)
      const angle = Math.atan2(b.vy, b.vx);
      writer.f32(Math.round(angle * 10) / 10);

      let typeId = 0;
      if (b.type === "enemy") typeId = 1;
      else if (b.type === "player_special" || b.type === "player_special_1") typeId = 2;
      else if (b.type === "item_ep") typeId = 3;
      else if (b.type === "player_special_2") typeId = 4;
      else if (b.type === "player_special_3") typeId = 5;
      else if (b.type === "player_special_4") typeId = 6;
      writer.u8(typeId);
    }

    // --- 3. イベントデータの書き込み ---
    const safeEvents = events || [];
    writer.u8(Math.min(safeEvents.length, 255)); 

    for (const ev of safeEvents) {
        let typeId = 1; 
        if (ev.type === "explosion") typeId = 2;
        
        writer.u8(typeId);
        writer.f32(ev.x);
        writer.f32(ev.y);
        writer.string(ev.color || "#ffffff");
    }

    return writer.getData();
  }

  // Helper
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

  // --- 不要になったJSONメソッド群は削除済み ---

  // Snapshot送信 (JSONのまま維持)
  // 初回接続時や再開時のみなので、ここは最適化の優先度低
  sendSnapshot(player) {
    const entityMaps = this.getRelevantEntityMapsFor(player);
    // Snapshot用には一時的に簡易オブジェクトを作る(頻度低いため許容)
    const snapshotPayload = {
      players: Array.from(entityMaps.players.values()).map((p) => ({
          i: p.id, x: p.x, y: p.y, h: p.hp, e: p.ep, a: p.angle, n: p.name,
          ba: p.chargeBetAmount,
          cp: p.chargePosition ? { ep: p.chargePosition.entryPrice, a: p.chargePosition.amount, t: p.chargePosition.type } : null,
          sb: p.stockedBullets ? p.stockedBullets.map(b => typeof b === 'object' ? b.damage : b) : [],
          d: p.isDead ? 1 : 0
      })),
      enemies: Array.from(entityMaps.enemies.values()).map((e) => ({
          i: e.id, x: e.x, y: e.y, h: e.hp, ta: e.targetAngle
      })),
      bullets: Array.from(entityMaps.bullets.values()).map((b) => ({
          i: b.id, x: b.x, y: b.y, r: b.radius, t: b.type, a: Math.atan2(b.vy, b.vx)
      })),
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