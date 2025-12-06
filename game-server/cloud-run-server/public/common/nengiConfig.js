import nengi from 'nengi';

const nengiConfig = {
    UPDATE_RATE: 30, 

    commands: {
        'PlayerInput': {
            move_up: nengi.Boolean,
            move_down: nengi.Boolean,
            move_left: nengi.Boolean,
            move_right: nengi.Boolean,
            shoot: nengi.Boolean,
            trade_long: nengi.Boolean,
            trade_short: nengi.Boolean,
            trade_settle: nengi.Boolean,
            bet_up: nengi.Boolean,
            bet_down: nengi.Boolean,
            bet_all: nengi.Boolean,
            bet_min: nengi.Boolean,
            mouseX: nengi.Float32,
            mouseY: nengi.Float32,
            delta: nengi.Number
        }
    },

    messages: {
        // ▼ 既存: ゲーム内イベント
        'GameEvent': {
            type: nengi.UInt8, // 1: hit, 2: explosion
            x: nengi.Float32,
            y: nengi.Float32,
            color: nengi.String
        },
        // ▼ 追加: 大きなデータはJSON文字列として送る
        'StaticState': {
            json: nengi.String
        },
        'ChartState': {
            json: nengi.String
        },
        'ChartUpdate': {
            json: nengi.String
        },
        'LeaderboardUpdate': {
            json: nengi.String
        },
        'IdleWarning': {
            // 空のメッセージでも定義が必要（中身なしでOK）
        }
    },

    entities: {
        'Player': {
            x: nengi.Float32,
            y: nengi.Float32,
            rotation: nengi.Float32,
            hp: nengi.UInt8,
            ep: nengi.UInt16,
            isDead: nengi.Boolean,
            id: nengi.String,
            name: nengi.String,
            chargeBetAmount: nengi.UInt16,
            hasCharge: nengi.Boolean, 
            chargeEntryPrice: nengi.Float32,
            chargeAmount: nengi.Float32,
            chargeType: nengi.UInt8
        },
        'Enemy': {
            x: nengi.Float32,
            y: nengi.Float32,
            targetAngle: nengi.Float32,
            hp: nengi.UInt8,
            id: nengi.String
        },
        'Bullet': {
            x: nengi.Float32,
            y: nengi.Float32,
            rotation: nengi.Float32,
            typeId: nengi.UInt8,
            id: nengi.String
        }
    }
};

export default nengiConfig;