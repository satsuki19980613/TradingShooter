// src_v2/infrastructure/rendering/ui/scenes/InitialScene.js
import { BaseScene } from "./BaseScene.js";

export class InitialScene extends BaseScene {
  constructor(skinFactory) {
    super(skinFactory);
    this.frameCount = 0;
  }

  render(ctx, width, height, mousePos) {
    this.frameCount++;
    const cx = width / 2;
    const cy = height / 2;

    // ★ロゴや背景は CyberUIRenderer が描画するので、ここではボタンのみ配置
    const btnW = 260;
    const btnH = 50;
    
    // ロゴ(ALVOLT)の下にボタンが来るようにY座標を調整
    const startY = cy + 120; 

    this.buttons = [
      { id: "start_register", text: "REGISTER & START", x: cx - btnW/2, y: startY, w: btnW, h: btnH, active: true },
      { id: "start_guest", text: "GUEST PLAY", x: cx - btnW/2, y: startY + 70, w: btnW, h: btnH, active: false }
    ];

    this.checkHover(mousePos.x, mousePos.y);

    this.buttons.forEach(btn => {
      const img = this.skinFactory.getButton(btn.w, btn.h, btn.text, btn.active, btn.isHover);
      ctx.drawImage(img, btn.x - 10, btn.y - 10);
    });
  }
}