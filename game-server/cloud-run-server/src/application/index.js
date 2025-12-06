import express from "express";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

import { ServerGame } from "./ServerGame.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Init
initializeApp({ projectId: "trading-charge-shooter" });
const firestore = getFirestore();

// Express Setup
const app = express();
app.use(cors());
app.use(express.json());

// Static Files (Client)
const staticPath = path.join(__dirname, "../../public"); // Adjust path to point to public
app.use(express.static(staticPath));

const PORT = process.env.PORT || 8080;
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Room Management
const activeRooms = new Map();

function onRoomEmpty(roomId) {
  if (activeRooms.has(roomId)) {
    activeRooms.delete(roomId);
    console.log(`[Manager] Room ${roomId} removed.`);
  }
}

function findOrCreateRoom() {
  for (const [roomId, game] of activeRooms.entries()) {
    if (game.worldState.players.size < 8 && game.worldState.isRunning && game.worldState.isReady) {
      return game;
    }
  }
  const newRoomId = `room_${Date.now()}`;
  const newGame = new ServerGame(newRoomId, firestore, onRoomEmpty);
  newGame.warmup().catch(e => console.error("Warmup failed", e));
  activeRooms.set(newRoomId, newGame);
  return newGame;
}

// WebSocket Handling
wss.on("connection", (ws, req) => {
  let userId = null;
  let game = null;

  try {
    const params = new URLSearchParams(req.url.split("?")[1]);
    userId = params.get("userId");
    const playerName = params.get("playerName") || "Guest";
    const isDebug = params.get("debug") === "true";

    if (!userId) {
      ws.close(1008, "userId required");
      return;
    }

    game = findOrCreateRoom();
    const joinResult = game.addPlayer(userId, playerName, ws, isDebug);

    if (joinResult) {
      const joinData = {
        type: "join_success",
        roomId: game.roomId,
        worldConfig: { width: game.worldState.width, height: game.worldState.height }
      };
      ws.send(JSON.stringify(joinData));
    }

    ws.on("message", (message) => {
        // Binary Input Parsing
        const isBinary = Buffer.isBuffer(message) || message instanceof ArrayBuffer;
        if (isBinary) {
            const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
            if (buf.length >= 15) {
                const msgType = buf.readUInt8(0);
                if (msgType === 2 && game) {
                    const mask = buf.readUInt16LE(1);
                    const seq = buf.readUInt32LE(3);
                    const mouseX = buf.readFloatLE(7);
                    const mouseY = buf.readFloatLE(11);
                    
                    const input = {
                        states: {
                            move_up: !!(mask & 1),
                            move_down: !!(mask & 2),
                            move_left: !!(mask & 4),
                            move_right: !!(mask & 8),
                        },
                        wasPressed: {
                            shoot: !!(mask & 16),
                            trade_long: !!(mask & 32),
                            bet_up: !!(mask & 64),
                            bet_down: !!(mask & 128),
                            bet_all: !!(mask & 256),
                            bet_min: !!(mask & 512),
                            trade_short: !!(mask & 1024),
                            trade_settle: !!(mask & 2048),
                        },
                        mouseWorldPos: { x: mouseX, y: mouseY }
                    };
                    game.handlePlayerInput(userId, input);
                }
            }
            return;
        }

        // JSON Message Handling
        try {
            const data = JSON.parse(message.toString());
            if (data.type === "pause" && game) {
                const p = game.worldState.players.get(userId);
                if(p) p.isPaused = true;
            } else if (data.type === "resume" && game) {
                const p = game.worldState.players.get(userId);
                if(p) p.isPaused = false;
            }
        } catch (e) {}
    });

    ws.on("close", () => {
        if (game) game.removePlayer(userId);
    });

    ws.on("error", () => {
        if (game) game.removePlayer(userId);
    });

  } catch (e) {
    ws.close(1011, "Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});