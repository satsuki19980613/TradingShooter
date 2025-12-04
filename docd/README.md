# TradingShooter

**TradingShooter** は、リアルタイムのマルチプレイヤーシューティングと、架空の市場チャート予測（トレード）を融合させた、実験的なオンラインIOゲームです。
プレイヤーは弾幕を回避しながら、市場価格の変動（Long/Short）にBETし、利益をエネルギーに変えて強力な攻撃を繰り出します。

## 🎮 ゲーム概要

- **ジャンル**: マルチプレイヤー・オンライン・シューティング (io-game style)
- **コアメカニクス**:
    - **Shooting**: WASD移動とマウスエイムによる直感的な操作。
    - **Trading**: ゲーム内にリアルタイムで変動するチャートが表示されます。価格の上昇(Long)・下落(Short)を予測し、EP（エネルギー）を投資します。
    - **Risk & Return**: 予測が当たれば強力な特殊弾薬を獲得。外せばダメージを受けます。
- **勝利条件**: 他のプレイヤーや敵AIを倒し、スコアランキングの上位を目指します。

## 🛠 技術スタック

- **Frontend**:
    - Vanilla JavaScript (ES Modules)
    - HTML5 Canvas API (No Game Engine)
    - CSS3 (UI Overlay)
- **Backend**:
    - Node.js
    - WebSocket (`ws` library)
    - Google Cloud Run (Server Hosting)
- **Infrastructure & BaaS**:
    - Firebase Authentication (匿名/Googleログイン)
    - Firebase Firestore (スコア、ランキング永続化)
    - Firebase Hosting (クライアント配信)

## 📐 開発方針とアーキテクチャ (Development Philosophy)

本プロジェクトは、大規模な同時接続に耐えうるパフォーマンスと、保守性の高いコードベースを維持するために、以下の技術的指針に基づいて設計・リファクタリングされています。

### 1. パフォーマンス最適化と計算コストの抑制

ブラウザゲーム特有の制約とサーバー負荷を考慮し、徹底的な最適化を行っています。

- **通信のバイナリ化**:
    - 従来のJSON形式による通信を廃止し、`PacketWriter`/`PacketReader` を用いた独自のバイナリプロトコルを採用。
    - 通信データ量を大幅に削減し、JSONパースに伴うGC（ガベージコレクション）スパイクを排除しました。
- **メモリアロケーションの最小化**:
    - ゲームループ内での一時オブジェクト（`new Object`, `new Array`）の生成を極力回避。
    - パーティクルシステムにはオブジェクトプール（Object Pooling）を導入し、頻繁な生成・破棄によるメモリ断片化を防いでいます。
- **描画パフォーマンス (Canvas API)**:
    - 重い処理である `ctx.shadowBlur` を全廃し、`globalCompositeOperation = "lighter"`（加算合成）とグラデーション描画による擬似発光表現へ移行。これにより、低スペック端末やモバイルでも高いFPSを維持します。
- **空間分割 (Spatial Partitioning)**:
    - サーバー側の衝突判定にグリッドベースの空間分割を採用。総当たり判定（O(N^2)）を回避し、エンティティが増加しても計算負荷を線形に抑えています。

### 2. アーキテクチャの健全性 (Refactoring & Clean Code)

開発が進むにつれて肥大化しがちなクラス（God Class）を適切に分割し、責務の分離を徹底しました。

- **神クラスの回避**:
    - 初期に肥大化した `ServerGame.js` から、マップ読み込み責務を `ServerMapLoader` へ、物理演算責務を `ServerPhysicsSystem` へ分離。
    - クライアント側でも、エフェクト処理を `ParticleSystem` へ、描画ロジックを `RenderSystem` や `SkinManager` へ委譲し、`Game` クラスを軽量なコンテナとして再定義しました。
- **サーバー権威 (Server-Authoritative)**:
    - ゲームの状態（位置、HP、スコア）はすべてサーバーが管理し、クライアントは「描画と入力送信」に徹する（Dumb Client）設計。チート耐性を高めています。
- **スキンとロジックの分離**:
    - 見た目（Skin）と物理的実体（Entity）を分離。`SkinManager` がCanvasを動的に生成・キャッシュすることで、描画コストを下げつつ多彩な表現を実現しています。

## 📂 ディレクトリ構成

`root/
├── game-server/
│   └── cloud-run-server/
│       ├── game-logic/       # サーバーサイドのコアロジック
│       │   ├── ServerGame.js # ゲームループ管理
│       │   ├── ServerNetworkSystem.js # バイナリ通信処理
│       │   └── ...
│       └── public/           # クライアントサイド
│           └── src/
│               ├── entities/ # Player, Enemy, Bullet等の定義
│               ├── systems/  # Rendering, Input, Network等のシステム
│               └── skins/    # 描画用アセット定義
├── MapEditor_Standalone/     # マップ作成用ツール
└── TradingShooter_Assets/    # 静的アセット（画像・動画）配信サーバー`

## 🚀 セットアップとデプロイ

### ローカル開発

1. **依存関係のインストール**:Bash
    
    `cd game-server/cloud-run-server
    npm install`
    
2. **サーバー起動**:Bash
    
    `npm start`
    
    `localhost:8080` でサーバーが起動します。
    

### デプロイ手順

本番環境へのデプロイは、サーバー（Cloud Run）とクライアント（Firebase Hosting）の両方を更新する必要があります。

1. **サーバー側 (Cloud Run)**:Bash
    
    `cd game-server/cloud-run-server
    gcloud run deploy`
    
2. **クライアント側 (Firebase Hosting)**:Bash
    
    `cd ../..  # プロジェクトルートまたはgame-serverへ移動
    npm run deploy`
    
3. **アセットサーバー (CDN)**:Bash
    
    `cd TradingShooter_Assets
    firebase deploy --only hosting`
    

## 📝 今後の展望

- **モバイル対応の強化**: バーチャルパッドの操作性向上。
- **新チャートパターンの追加**: より戦略的なトレード要素の実装。
- **観戦モード**: WebSocketのブロードキャストを活用した観戦機能。