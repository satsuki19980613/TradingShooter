/**
 * BGMプレイリスト定義
 * title: 曲名（テロップ表示用）
 * url: 音源ファイルのパス（URL）
 */
export const BGM_PLAYLIST = [
  // 0番目: 固定（オープニング曲）- 既存のまま
  { 
    title: "Stellar Signals", 
    url: "https://trading-charge-shooter.web.app/audio/StellarSignals.mp3" 
  },

  // ▼▼▼ 追加した3曲 (シャッフル再生用) ▼▼▼
  // ※ファイルは public/audio/ フォルダにある前提です
  { 
    title: "Neon Drive", 
    url: "https://trading-charge-shooter.web.app/audio/NeonDrive.mp3" 
  },
  { 
    title: "Neon Velocity", 
    url: "https://trading-charge-shooter.web.app/audio/NeonVelocity.mp3" 
  },
  { 
    title: "Neon Blitzkrieg", 
    url: "https://trading-charge-shooter.web.app/audio/audio/NeonBlitzkrieg.mp3" 
  }
];