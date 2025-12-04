TradingShooter アカウント管理・画面遷移仕様書
1. 概要
本ドキュメントは、ゲーム「TradingShooter」における初回起動、プレイヤー登録、データ引継ぎ、およびメニュー画面のステート（状態）管理に関する仕様を定義する。

アーキテクチャ: SPA (Single Page Application)。index.html 内の div 要素の表示・非表示を切り替えて遷移を実現する。

アカウント状態: Firebase Authentication を使用し、「ゲスト（未登録）」と「登録済みプレイヤー」の2つの状態を管理する。

2. 画面定義 (UI Definitions)
各画面（Screen / Modal）の構成要素とID定義です。

2.1. 初回画面 (Screen: Initial / Welcome)
表示条件: ローカルストレージ/Firebaseにログイン情報がない、またはデータ削除直後の状態。

ID: modal-initial (または screen-initial)

構成要素:

プレイヤー名入力欄: input#initial-name-input

登録して開始ボタン: button#btn-initial-register

挙動: 入力された名前でアカウント作成 → [メニュー画面B] へ遷移。

ゲストプレイボタン: button#btn-initial-guest

挙動: 名前 "Guest" で一時アカウント作成 → [メニュー画面A] へ遷移。

データ引継ぎボタン: button#btn-initial-transfer

挙動: [データ引継ぎ画面] (復旧のみ) を開く。

2.2. メニュー画面 (Screen: Home)
ID: screen-home

状態: プレイヤーの状態により「A (ゲスト)」と「B (登録済み)」の表示を切り替える。

共通要素:

タイトルロゴ: h1

プレイヤー名表示: span#display-player-name

Join Gameボタン: button#btn-start-game (→ ゲーム開始)

Leaderboardボタン: button#btn-goto-ranking (→ リーダーボード画面)

[メニュー画面A] (ゲスト状態)
表示要素:

データ引継ぎボタン: button#btn-menu-transfer

ラベル: 「データ引継ぎ」

挙動: [データ引継ぎ画面] (復旧のみ) を開く。

プレイヤー名登録ボタン: button#btn-menu-register

挙動: [プレイヤー名登録画面] を開く。

非表示要素:

データ削除ボタン

[メニュー画面B] (登録済み状態)
表示要素:

データ引継ぎ/発行ボタン: button#btn-menu-transfer

ラベル: 「データ引継ぎ / 発行」

挙動: [データ引継ぎ/発行画面] (復旧＋発行) を開く。

データ削除ボタン: button#btn-menu-delete (新規追加)

挙動: 警告ダイアログ後、アカウント削除 → [初回画面] へリロード。

非表示要素:

プレイヤー名登録ボタン

2.3. データ引継ぎモーダル (Modal: Transfer)
ID: modal-transfer

状態: 呼び出し元の状態により、表示内容を動的に変更する。

構成要素:

[セクション1] 復旧 (常時表示)

コード入力欄: input#recover-code-input

復旧ボタン: button#btn-do-recover

[セクション2] 発行 (登録済みユーザーのみ表示)

コード表示エリア: div#transfer-code-display

コード発行ボタン: button#btn-issue-code

※ゲスト時はこのセクション全体を display: none にする

閉じるボタン: button#btn-close-transfer

2.4. プレイヤー名登録モーダル (Modal: Register)
ID: modal-register

用途: メニュー画面A（ゲスト）から、正式登録を行うための画面。

構成要素:

名前入力欄: input#reg-name-input

登録決定ボタン: button#btn-do-register

挙動: 名前更新処理 → 成功すれば [メニュー画面B] に切り替え。

閉じるボタン: button#btn-close-register

2.5. リーダーボード画面 (Screen: Ranking)
ID: screen-ranking

構成要素:

ランキングリスト (Top 1000): div#ranking-list

戻るボタン: button#btn-ranking-back

3. ロジック・フロー詳細
3.1. 状態判定ロジック (UIManager)
AppFlowManager から現在のユーザー情報を受け取り、index.html の body クラス、または各ボタンの hidden クラスを操作する。

判定基準: user.displayName が "Guest" かどうか。

"Guest" → Mode A (Guest)

それ以外 → Mode B (Member)

3.2. 画面遷移フロー
初回アクセス (未ログイン)

[初回画面] を表示。

A. 「登録」→ 名前入力 → register_name API → 成功 → [メニュー画面B]

B. 「ゲスト」→ [メニュー画面A]

C. 「引継ぎ」→ [引継ぎモーダル(発行なし)] → 復旧成功 → リロード → [メニュー画面B]

ゲストプレイ中 (Menu A)

A. 「プレイヤー登録」押下 → [登録モーダル] → 名前入力 → 成功 → [メニュー画面B] へ即時切り替え。

B. 「データ引継ぎ」押下 → [引継ぎモーダル(発行なし)] 表示。

登録済みプレイ中 (Menu B)

A. 「データ引継ぎ/発行」押下 → [引継ぎモーダル(発行あり)] 表示。

B. 「データ削除」押下 → 確認アラート → 削除実行 → 成功 → location.reload() (初回画面へ戻る)。

4. 実装方針 (Technical Strategy)
4.1. HTML構造 (index.html)
ファイルを物理的に分けず、可読性を高めるためにコメントでセクションを区切る。 メニュー画面のボタン出し分けは、CSSクラス guest-only と member-only を活用し、JavaScriptで body にクラスを付与することで一括制御する（推奨）。

CSS

/* 例: CSSによる表示制御 */
body.mode-guest .member-only { display: none !important; }
body.mode-member .guest-only { display: none !important; }
4.2. JavaScriptクラスの責務
UIManager

updateDisplayName(name): ここで body クラス (mode-guest / mode-member) を切り替え、画面A/Bを制御する。

各画面の show/hide メソッドを提供。

AppFlowManager

handleDeleteAccount(): 新規実装。Firebase Auth currentUser.delete() および Firestoreのデータ削除呼び出しを行う。

handleAccountResponse(): 登録や復旧の結果を受け取り、UI更新またはリロードを行う。

AccountTransferManager

openModal(isGuest): 引数を受け取り、発行セクション (#section-issue-code) の表示/非表示を切り替える。