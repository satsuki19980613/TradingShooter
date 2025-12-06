sequenceDiagram
    participant User
    participant UI as UIManager
    participant App as AppFlowManager
    participant Net as NetworkManager
    participant Server

    User->>UI: "Start Game" クリック
    UI->>App: onStartGame(name)
    App->>UI: showScreen("loading")
    App->>Net: connect(userId, name)
    Net->>Server: WebSocket 接続要求
    Server-->>Net: join_success (WorldConfig)
    Net-->>App: 接続完了通知
    App->>Game: startGameLoop(config)
    App->>UI: showScreen("game")
    loop ゲームループ
        Net->>Game: applyDelta(state)
        Game->>UI: syncHUD(state)
    end