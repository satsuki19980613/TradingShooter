/**
 * サーバーサイドのチューニング用パラメーター
 */
export const ServerConfig = {
  // 
  // ゲームの物理演算（ロジック）を実行する間隔 (ms)
  // 16ms = 1秒間に約60回 (60fps/60tick)
  //
  GAME_LOOP_INTERVAL: 16,

  // 
  // クライアントに "game_state_delta" を送信する間隔 (ms)
  // これがネットワーク負荷に最も影響します。
  // 16ms = 60fps (非常に滑らかだが、データ量が多い)
  // 32ms = 30fps (標準的)
  // 50ms = 20fps (データ量は少ないが、カクつきが見え始める)
  // 
  BROADCAST_INTERVAL: 33,

  // 
  // チャートを更新する間隔 (ms)
  // 
  CHART_UPDATE_INTERVAL: 500,
};

// 
// 
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const GRID_CELL_SIZE = 150;

// ServerGame.js が参照できるように、他の定数もエクスポートします
export const GameConstants = {
  WORLD_WIDTH: WORLD_WIDTH,
  WORLD_HEIGHT: WORLD_HEIGHT,
  GRID_CELL_SIZE: GRID_CELL_SIZE,
};