import express from "express";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ServerGame } from "./game-logic/ServerGame.js";

// ▼▼▼ 【修正箇所】ここから追加 ▼▼▼
import path from "path";
import { fileURLToPath } from "url";

// ES Modules で __dirname を使うための定型文
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ▲▲▲ ここまで追加 ▲▲▲

initializeApp({
  projectId: "trading-charge-shooter" 
});

const firestore = getFirestore();
console.log("Firebase Admin SDK (Firestore) が初期化されました。");
const app = express();

app.use(cors());
app.use(express.json());

// ▼これで path と __dirname が使えるようになります
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

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "input" && game && userId) {
        game.handlePlayerInput(userId, data.payload);
      } else if (data.type === "pause" && game && userId) {
        game.pausePlayer(userId);
      } else if (data.type === "resume" && game && userId) {
        game.resumePlayer(userId);
      }else if (data.type === "account_action" && game && userId) {
        game.handleAccountAction(ws, data.payload, userId);
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
