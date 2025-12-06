/**
 * アプリケーション全体のフロー、BGM、画面遷移を管理
 */
export class AppFlowManager {
  constructor(uiManipulator, gameApp) {
    this.ui = uiManipulator;
    this.game = gameApp;
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = false;
    this.bgmAudio.volume = 0.2;
    this.playlist = [
        { title: "Stellar Signals", url: "https://trading-charge-shooter.web.app/audio/StellarSignals.mp3" },
        { title: "Neon Drive", url: "https://trading-charge-shooter.web.app/audio/NeonDrive.mp3" },
        { title: "Neon Velocity", url: "https://trading-charge-shooter.web.app/audio/NeonVelocity.mp3" },
        { title: "Fading Neon", url: "https://trading-charge-shooter.web.app/audio/FadingNeon.mp3" }
    ];
    this.isMuted = true;
    this.isPlaying = false;
    this.playableIndices = [1, 2, 3];
    this.shuffledQueue = [];
    
    this.bgmAudio.addEventListener("ended", () => {
        if(this.isPlaying) this.playNextShuffle();
    });
    
    this.setupUI();
  }

  setupUI() {
      const startBtn = document.getElementById("btn-start-game");
      if(startBtn) startBtn.addEventListener("click", () => this.handleStartGame());
      
      const audioBtn = document.getElementById("btn-audio-toggle");
      if(audioBtn) audioBtn.addEventListener("click", () => this.toggleAudio());
      
      const retryBtn = document.getElementById("btn-gameover-retry");
      if(retryBtn) retryBtn.addEventListener("click", () => {
          this.ui.showScreen("loading");
          this.game.connect("Guest").then(() => this.ui.showScreen("game"));
      });
  }

  async handleStartGame() {
      this.ui.showScreen("loading");
      this.ui.setLoadingText("Connecting...");
      try {
          await this.game.connect("Guest");
          this.ui.showScreen("game");
          this.game.startLoop();
      } catch(e) {
          console.error(e);
          this.ui.showScreen("error");
      }
  }

  playNextShuffle() {
      if(this.shuffledQueue.length === 0) {
          this.shuffledQueue = [...this.playableIndices].sort(() => Math.random() - 0.5);
      }
      const nextIndex = this.shuffledQueue.shift();
      const track = this.playlist[nextIndex];
      this.bgmAudio.src = track.url;
      this.bgmAudio.play().catch(e => console.warn(e));
      this.isPlaying = true;
  }

  toggleAudio() {
      this.isMuted = !this.isMuted;
      const btn = document.getElementById("btn-audio-toggle");
      if(!this.isMuted) {
          if(this.bgmAudio.paused) this.playNextShuffle();
          else this.bgmAudio.play();
          if(btn) { btn.textContent = "🔊 BGM: ON"; btn.style.opacity = "1.0"; }
      } else {
          this.bgmAudio.pause();
          this.isPlaying = false;
          if(btn) { btn.textContent = "🔇 BGM: OFF"; btn.style.opacity = "0.5"; }
      }
  }
}