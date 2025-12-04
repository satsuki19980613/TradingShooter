import express from "express";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ServerGame } from "./game-logic/ServerGame.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_BIT_MAP = {
  move_up: 1 << 0,
  move_down: 1 << 1,
  move_left: 1 << 2,
  move_right: 1 << 3,
  shoot: 1 << 4,
  trade_long: 1 << 5,
  bet_up: 1 << 6,
  bet_down: 1 << 7,
  bet_all: 1 << 8,
  bet_min: 1 << 9,
  trade_short: 1 << 10,
  trade_settle: 1 << 11,
};
initializeApp({
  projectId: "trading-charge-shooter",
});

const firestore = getFirestore();
console.log("Firebase Admin SDK (Firestore) が初期化されました。");
const app = express();

app.use(cors());
app.use(express.json());

const staticPath = path.join(__dirname, "public");
console.log("📁 Static files serving from:", staticPath);
app.use(express.static(staticPath));

const PORT = process.env.PORT || 8080;
const server = createServer(app);
const wss = new WebSocketServer({ server });
console.log("WebSocketサーバーを起動します...");

/**
 * 現在稼働中のゲームルームを管理
 * (キー: roomId, バリュー: ServerGame インスタンス)
 */
const activeRooms = new Map();
const MAX_PLAYERS_PER_ROOM = 8;

/**
 * ルームが空になった時に ServerGame から呼ばれるコールバック
 */
function onRoomEmpty(roomId) {
  if (activeRooms.has(roomId)) {
    activeRooms.delete(roomId);
    console.log(
      `[Manager] ルーム ${roomId} は空になったため、リストから削除しました。`
    );
    console.log(`[Manager] 現在のアクティブルーム数: ${activeRooms.size}`);
  }
}

/**
 * 参加可能なルームを探す (なければ新しいルームを作る)
 */
function findOrCreateRoom() {
  for (const [roomId, game] of activeRooms.entries()) {
    if (game.players.size < MAX_PLAYERS_PER_ROOM && game.isRunning) {
      console.log(`[Manager] 既存ルーム ${roomId} に空きを発見。`);
      return game;
    }
  }
  const newRoomId = `room_${Date.now()}`;
  console.log(`[Manager] 新しいルーム ${newRoomId} を作成します。`);
  const newGame = new ServerGame(newRoomId, firestore, onRoomEmpty);
  activeRooms.set(newRoomId, newGame);
  console.log(`[Manager] 現在のアクティブルーム数: ${activeRooms.size}`);
  return newGame;
}

wss.on("connection", (ws, req) => {
  let userId = null;
  let game = null;
  try {
    const params = new URLSearchParams(req.url.split("?")[1]);
    userId = params.get("userId");
    const playerName = params.get("playerName") || "Guest";
    const isDebug = params.get("debug") === "true";
    if (!userId) {
      console.warn("userId がない接続を拒否しました。");
      ws.close(1008, "userId is required");
      return;
    }
    console.log(`[WebSocket] 接続要求: ${playerName} (ID: ${userId})`);
    game = findOrCreateRoom();
    const playerState = game.addPlayer(userId, playerName, ws, isDebug);
    console.log(`プレイヤーが参加: ${playerName} (Room: ${game.roomId})`);
    const joinData = {
      type: "join_success",
      roomId: game.roomId,
      playerState: playerState,
      worldConfig: {
        width: game.WORLD_WIDTH,
        height: game.WORLD_HEIGHT,
      },
    };
    ws.send(JSON.stringify(joinData));
  } catch (error) {
    console.error("[WebSocket] 接続処理中にエラー:", error);
    ws.close(1011, "Server error during connection");
    return;
  }
  async function handleAccountRequest(actionPayload) {
    const type = actionPayload.subtype;

    if (type === "register_name") {
      const requestedName = actionPayload.name;
      const result = await accountManager.registerName(userId, requestedName);

      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "register_name",
          success: result.success,
          message: result.message,
          name: result.name,
        })
      );

      if (result.success && game) {
        game.updatePlayerName(userId, result.name);
      }
    } else if (type === "issue_code") {
      const code = await accountManager.issueTransferCode(userId);
      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "issue_code",
          success: true,
          code: code,
        })
      );
    } else if (type === "recover") {
      const inputCode = actionPayload.code;
      const result = await accountManager.recoverAccount(inputCode);
      ws.send(
        JSON.stringify({
          type: "account_response",
          subtype: "recover",
          success: result.success,
          message: result.message,
          token: result.token,
          name: result.name,
        })
      );
    }
  }
  ws.on("message", async (message) => {
    try {
      const isBinary =
        Buffer.isBuffer(message) || message instanceof ArrayBuffer;

      if (isBinary) {
        const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);

        if (buf.length >= 15) {
          const msgType = buf.readUInt8(0);

          if (msgType === 2 && game && userId) {
            const mask = buf.readUInt16LE(1);

            const seq = buf.readUInt32LE(3);

            const mouseX = buf.readFloatLE(7);
            const mouseY = buf.readFloatLE(11);

            const reconstructedInput = {
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
              mouseWorldPos: {
                x: mouseX,
                y: mouseY,
              },
            };

            game.handlePlayerInput(userId, reconstructedInput, seq);
            return;
          }
        }
      }

      const data = JSON.parse(message.toString());

      if (data.type === "account_action" && userId) {
        await handleAccountRequest(data.payload);
        return;
      }
      if (data.type === "input" && game && userId) {
        game.handlePlayerInput(userId, data.payload);
      } else if (data.type === "pause" && game && userId) {
        game.pausePlayer(userId);
      } else if (data.type === "resume" && game && userId) {
        game.resumePlayer(userId);
      }
    } catch (e) {
      console.warn("[WebSocket] 不正なメッセージ形式:", e.message);
    }
  });

  ws.on("close", () => {
    console.log(`[WebSocket] 接続切断: (ID: ${userId})`);
    if (game && userId) {
      game.removePlayer(userId);
    }
  });

  ws.on("error", (error) => {
    console.error(`[WebSocket] エラー (ID: ${userId}):`, error);
    if (game && userId) {
      game.removePlayer(userId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`サーバー (HTTP + WebSocket) がポート ${PORT} で起動しました。`);
});
