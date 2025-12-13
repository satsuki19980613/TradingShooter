// src_v2/infrastructure/rendering/ui/scenes/HomeScene.js
import { BaseScene } from "./BaseScene.js";

export class HomeScene extends BaseScene {
  constructor(skinFactory) {
    super(skinFactory);
    this.isGuest = true; // デフォルト
    this.userName = "Guest";
    this.buttons = [];
  }

  /**
   * 状態をセットしてボタン構成を再構築
   */
  setUserState(userEntity) {
    this.isGuest = userEntity.isGuest;
    this.userName = userEntity.name || "Guest";
    this.rebuildButtons();
  }

  rebuildButtons() {
    // 画面サイズが未定の場合はrenderで再計算されるので、ここでは定義のみ
    // 実際の座標計算は render() または resize() で行うのが安全です
    this.needsLayout = true;
  }

  updateLayout(cx, cy) {
    const btnW = 260;
    const btnH = 50;
    const gap = 15;
    let currentY = cy;

    this.buttons = [];

    // 1. GAME START (共通)
    this.buttons.push({
      id: "game_start", text: "JOIN GAME", 
      w: btnW, h: btnH, active: true,
      // 中央配置
    });

    // 2. LEADERBOARD (共通)
    this.buttons.push({
      id: "open_ranking", text: "LEADERBOARD", 
      w: btnW, h: btnH, active: false
    });

    // 3. TRANSFER / REGISTER (状態分岐)
    if (this.isGuest) {
      // Menu A: Transfer, Register
      this.buttons.push({
        id: "open_transfer", text: "DATA TRANSFER", 
        w: btnW, h: btnH, active: false
      });
      this.buttons.push({
        id: "open_register", text: "REGISTER NAME", 
        w: btnW, h: btnH, active: false // 重要: これがゲストのみ
      });
    } else {
      // Menu B: Transfer/Issue, Delete
      this.buttons.push({
        id: "open_transfer", text: "TRANSFER / ISSUE", 
        w: btnW, h: btnH, active: false
      });
      this.buttons.push({
        id: "menu_delete", text: "DELETE DATA", 
        w: btnW, h: btnH, active: false
      });
    }

    // Y座標の割り当て (下から積み上げたり、中央揃えしたり)
    // ここではシンプルに中央から下へ並べる
    const totalH = this.buttons.length * (btnH + gap);
    let startY = cy - totalH / 2 + 50; // 少し下にオフセット

    this.buttons.forEach((btn, index) => {
      btn.x = cx - btn.w / 2;
      btn.y = startY + index * (btnH + gap);
    });

    this.needsLayout = false;
  }

  render(ctx, width, height, mousePos) {
    const cx = width / 2;
    const cy = height / 2;

    if (this.needsLayout) {
      this.updateLayout(cx, cy);
    }

    // 1. ヘッダー情報の描画 (プレイヤー名など)
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = this.isGuest ? "#aaaaaa" : "#00ff00";
    ctx.font = "14px 'Orbitron'";
    ctx.fillText(`PILOT: ${this.userName}`, width - 20, 30);
    
    // 状態表示
    ctx.textAlign = "left";
    ctx.fillStyle = "#555";
    ctx.fillText(this.isGuest ? "STATUS: GUEST" : "STATUS: REGISTERED", 20, 30);
    ctx.restore();

    // 2. ボタン描画
    this.checkHover(mousePos.x, mousePos.y);
    this.buttons.forEach(btn => {
      const img = this.skinFactory.getButton(btn.w, btn.h, btn.text, btn.active, btn.isHover);
      ctx.drawImage(img, btn.x - 10, btn.y - 10);
    });
  }
}