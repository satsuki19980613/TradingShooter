import { CyberUIRenderer } from "../rendering/ui/CyberUIRenderer.js";
import { FullscreenManager } from "./FullscreenManager.js";
// 新しいモジュールをインポート
import { ScreenManager } from "./modules/ScreenManager.js";
import { HudManager } from "./modules/HudManager.js";
import { ModalManager } from "./modules/ModalManager.js";
import { AudioUiManager } from "./modules/AudioUiManager.js";
import { DebugUiManager } from "./modules/DebugUiManager.js";

export class DomManipulator {
  constructor() {
    this.uiRenderer = new CyberUIRenderer("menu-canvas");
    this.fullscreenManager = new FullscreenManager();
    this.mobileControlManager = null;
    this.isDebugMode = false;

    // サブマネージャーの初期化
    this.screenManager = new ScreenManager(this.uiRenderer, null);
    this.hudManager = new HudManager(null);
    this.modalManager = new ModalManager(this.uiRenderer);
    this.audioManager = new AudioUiManager(this.uiRenderer);
    this.debugManager = new DebugUiManager();

    this.fullscreenManager.init();
    this.uiRenderer.start();
  }

  // --- 初期化・設定関連 ---
  setMobileControlManager(manager) {
    this.mobileControlManager = manager;
    // 依存するサブマネージャーにも渡す
    this.screenManager.setMobileControlManager(manager);
    this.hudManager.setMobileControlManager(manager);
  }

  setMenuActionCallback(callback) {
    this.uiRenderer.setCallback(callback);
  }

  // --- 画面遷移関連 (ScreenManagerへ委譲) ---
  showScreen(screenId) {
    this.screenManager.show(screenId);
  }
  
  setBodyMode(mode) {
    this.screenManager.setBodyMode(mode);
  }

  setLoadingText(text) {
    this.screenManager.setLoadingText(text);
  }

  showGameOverScreen(score) {
    this.screenManager.showGameOver(score);
  }

  showErrorScreen(message, error) {
    this.screenManager.showError(message, error);
  }

  switchCanvasScene(sceneKey, data = null) {
    this.uiRenderer.setScene(sceneKey, data);
  }

  // --- HUD/ゲーム内表示関連 (HudManagerへ委譲) ---
  updateHUD(playerState, tradeState) {
    this.hudManager.update(playerState, tradeState);
  }

  updateLeaderboard(leaderboardData, myUserId) {
    this.hudManager.updateLeaderboard(leaderboardData, myUserId);
  }

  // --- モーダル関連 (ModalManagerへ委譲) ---
  openModal(modalType) {
    this.modalManager.open(modalType);
  }

  closeAllModals() {
    this.modalManager.closeAll();
  }

  // --- オーディオ関連 (AudioUiManagerへ委譲) ---
  setAudioLoadingState(isLoading) {
    this.audioManager.setLoadingState(isLoading);
  }

  updateAudioLoadingProgress(percent) {
    this.audioManager.updateLoadingProgress(percent);
  }

  updateAudioButton(isMuted) {
    this.audioManager.updateButton(isMuted);
  }

  showMusicNotification(title) {
    this.audioManager.showNotification(title);
  }

  // --- デバッグ関連 (DebugUiManagerへ委譲) ---
  enableDebugMode() {
    this.isDebugMode = true;
    this.debugManager.enable();
  }

  setupDebugListeners(onDownload) {
    this.debugManager.setupListeners(onDownload);
  }

  getDebugCanvas() {
    return this.debugManager.getCanvas();
  }

  updateDebugHUD(stats, simStats, serverStats) {
    this.debugManager.update(stats, simStats, serverStats);
  }

  // --- その他 ---
  tryFullscreen() {
    this.fullscreenManager.request();
  }
}