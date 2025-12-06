import { WebSocket } from "ws";
import { PacketWriter } from "../utils/PacketWriter.js";
import { Protocol } from "../../core/constants/Protocol.js";

/**
 * 通信処理を担当するシステム
 */
export class NetworkSystem {
  constructor() {
    this.playerWriters = new WeakMap();
  }

  broadcastGameState(players, worldState) {
    players.forEach((player) => {
      if (!player.ws || player.ws.readyState !== WebSocket.OPEN) return;

      let writer = this.playerWriters.get(player);
      if (!writer) {
        writer = new PacketWriter();
        this.playerWriters.set(player, writer);
      }
      writer.reset();

      this.writeDeltaPacket(writer, worldState);

      const data = writer.getData();
      if (data.length > 0) {
        try {
          player.ws.send(data);
        } catch (e) {}
      }
    });
  }

  writeDeltaPacket(writer, worldState) {
    writer.u8(Protocol.MSG_TYPE_DELTA);

    writer.u8(0);

    writer.u8(0);

    writer.u16(0);

    writer.u8(Math.min(worldState.players.size, 255));
    for (const p of worldState.players.values()) {
      writer.string(p.id);
      writer.f32(p.x);
      writer.f32(p.y);
      writer.u8(Math.ceil(p.hp));
      writer.f32(p.angle);
      writer.string(p.name || "Guest");
      writer.u32(p.lastProcessedInputSeq || 0);
      writer.u8(p.isDead ? 1 : 0);
      writer.u16(Math.floor(p.ep));
      writer.u16(p.chargeBetAmount);

      if (p.chargePosition) {
        writer.u8(1);
        writer.f32(p.chargePosition.entryPrice);
        writer.f32(p.chargePosition.amount);
        writer.u8(p.chargePosition.type === "short" ? 1 : 0);
      } else {
        writer.u8(0);
      }

      const bullets = p.stockedBullets || [];
      writer.u8(Math.min(bullets.length, 255));
      for (const b of bullets) {
        const dmg = typeof b === "object" ? b.damage : b;
        writer.u16(Math.ceil(dmg));
      }
    }

    writer.u8(Math.min(worldState.enemies.length, 255));
    for (const e of worldState.enemies) {
      writer.string(e.id);
      writer.f32(e.x);
      writer.f32(e.y);
      writer.u8(Math.ceil(e.hp));
      writer.f32(e.targetAngle);
    }

    writer.u16(Math.min(worldState.bullets.length, 65535));
    for (const b of worldState.bullets) {
      writer.string(b.id);
      writer.f32(b.x);
      writer.f32(b.y);
      writer.f32(Math.atan2(b.vy, b.vx));

      let typeId = 0;
      if (b.type === "enemy") typeId = 1;
      else if (b.type === "player_special_1") typeId = 2;

      writer.u8(typeId);
    }

    const events = worldState.frameEvents || [];
    writer.u8(Math.min(events.length, 255));
    for (const ev of events) {
      let typeId = 1;
      if (ev.type === "explosion") typeId = 2;
      writer.u8(typeId);
      writer.f32(ev.x);
      writer.f32(ev.y);
      writer.string(ev.color || "#ffffff");
    }
  }

  sendSnapshot(player, worldState) {
    const snapshot = {
      type: "game_state_snapshot",
      payload: {
        players: Array.from(worldState.players.values()).map((p) => ({
          i: p.id,
          x: p.x,
          y: p.y,
          h: p.hp,
          e: p.ep,
          n: p.name,
          d: p.isDead ? 1 : 0,
        })),
        enemies: worldState.enemies.map((e) => ({
          i: e.id,
          x: e.x,
          y: e.y,
          h: e.hp,
        })),
        bullets: [],
      },
    };
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(snapshot));
    }
  }
}
