# 通信プロトコル仕様

## 共通ヘッダー
| Offset | Type | Name | Description |
|---|---|---|---|
| 0 | Uint8 | msgType | 1: Delta, 2: Input, ... |

## Server -> Client: Game State Delta (msgType: 1)
動的なゲーム状態の差分更新。

| Order | Type | Name | Description |
|---|---|---|---|
| 1 | Uint8 | removedPlayersCount | 削除されたプレイヤー数 (N) |
| 2 | String[N] | removedPlayerIds | 削除IDリスト |
| 3 | Uint8 | removedEnemiesCount | 削除された敵数 (M) |
| ... | ... | ... | ... |
| X | Uint8 | updatedPlayersCount | 更新プレイヤー数 (K) |
| X+1 | Loop[K] | PlayerStruct | 以下のプレイヤーストラクトの繰り返し |

### PlayerStruct (詳細)
| Order | Type | Name | Note |
|---|---|---|---|
| 1 | String | id | UUID |
| 2 | Float32 | x | 座標X |
| 3 | Float32 | y | 座標Y |
| 4 | Uint8 | hp | HP (0-255) |
| ... | ... | ... | ... |