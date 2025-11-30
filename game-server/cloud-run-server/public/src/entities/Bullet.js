import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
import { Particle } from "./Particle.js"; // ★追加: パーティクルクラスをインポート

export class Bullet extends GameObject {
  constructor(x, y, angle, type) {
    // ▼▼▼ 追加・変更: タイプごとのサイズと色の設定 ▼▼▼
    let size = 8; // Default (Standard)
    let color = "#00ffff";

    if (type === "player_special_2") { // Plasma
      size = 12;
      color = "#ff00ff";
    } else if (type === "player_special_3") { // Nova
      size = 16;
      color = "#ffeb3b";
    } else if (type === "player_special_4") { // Gamma
      size = 40; // 極太ビーム用の当たり判定サイズ
      color = "#b300ff";
    } else if (type === "enemy") {
      color = "#ff9800";
    }
    // ▲▲▲

    super(x, y, size, color);

    this.angle = angle;
    this.type = type;
    this.isInitialized = false;

    // エフェクト計算用に速度ベクトルを保持（実際の移動はサーバー補間だが、演出の方向計算に使う）
    this.vx = Math.cos(angle) * 10;
    this.vy = Math.sin(angle) * 10;
  }

  // ★変更: gameInstanceを受け取り、パーティクルを生成できるようにする
  update(gameInstance) {
    super.update();

    // --- パーティクルエフェクト (軌跡) の生成 ---
    if (!gameInstance) return;

    // 自分の弾（プレイヤーの弾）の場合のみエフェクトを出す
    if (this.type.startsWith("player")) {
      this.spawnTrailParticles(gameInstance);
    }
  }

  /**
   * 弾の種類に応じた軌跡エフェクトを生成
   */
  spawnTrailParticles(gameInstance) {
    // Tier 1: Standard (青い火花をたまに散らす)
    if (this.type === "player_special_1" || this.type === "player") {
      if (Math.random() < 0.3) {
        gameInstance.particles.push(
          new Particle(this.x, this.y, 0, 0, 0.5, "#00aaff", 2, "spark")
        );
      }
    }
    // Tier 2: Plasma (紫の煙を残す)
    else if (this.type === "player_special_2") {
      if (Math.random() < 0.5) {
        const spread = 2;
        // 進行方向の逆側に少し散らす
        const pX =
          this.x - Math.cos(this.angle) * 5 + (Math.random() - 0.5) * spread;
        const pY =
          this.y - Math.sin(this.angle) * 5 + (Math.random() - 0.5) * spread;

        gameInstance.particles.push(
          new Particle(
            pX,
            pY,
            Math.random() - 0.5,
            Math.random() - 0.5,
            0.8,
            "#9d00ff",
            5,
            "smoke"
          )
        );
      }
    }
    // Tier 3: Nova (オレンジの煙と火花)
    else if (this.type === "player_special_3") {
      if (Math.random() < 0.5) {
        gameInstance.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            1.0,
            "#ff5722",
            8,
            "smoke"
          )
        );
      }
    }
    // Tier 4: Gamma (ビーム周囲の稲妻と粒子)
    else if (this.type === "player_special_4") {
      // 稲妻や粒子を激しく散らす
      for (let i = 0; i < 2; i++) {
        const speed = Math.random() * 3 + 1;
        // ビームの進行方向に対して垂直に散らす
        const anglePerp =
          this.angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        const vx = Math.cos(anglePerp) * speed;
        const vy = Math.sin(anglePerp) * speed;
        const color = Math.random() > 0.5 ? "#b300ff" : "#ccff00"; // 紫 or ライム

        gameInstance.particles.push(
          new Particle(this.x, this.y, vx, vy, 0.6, color, Math.random() * 4 + 2, "rect")
        );
      }
    }
  }

  setState(state) {
    this.id = state.i;
    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.isInitialized = true;
    }
    this.targetX = state.x;
    this.targetY = state.y;
    this.angle = state.a;
    this.type = state.t;
  }

  draw(ctx) {
    // アイテムの描画
    if (this.type === "item_ep") {
      this.drawItemEp(ctx);
      return;
    }

    // 敵の弾の描画
    if (this.type === "enemy") {
      this.drawEnemyBullet(ctx);
      return;
    }

    // プレイヤーの弾（スキン定義がある場合）
    if (BulletSkins[this.type]) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // スキン関数の呼び出し
      const drawFunc = BulletSkins[this.type]();
      drawFunc(ctx, 0, 0);

      ctx.restore();
      return;
    }

    // デフォルト描画（フォールバック）
    this.drawNormalBullet(ctx);
  }

  drawItemEp(ctx) {
    const baseSize = 64;
    const crystalSize = 48;
    const ringSize = 48;
    const baseSkin = skinManager.getSkin(
      "item_ep_base",
      baseSize,
      baseSize,
      BulletSkins.item_ep_base()
    );
    const crystalSkin = skinManager.getSkin(
      "item_ep_crystal",
      crystalSize,
      crystalSize,
      BulletSkins.item_ep_crystal()
    );
    const ringSkin = skinManager.getSkin(
      "item_ep_ring",
      ringSize,
      ringSize,
      BulletSkins.item_ep_ring()
    );
    ctx.save();
    ctx.translate(this.x, this.y);
    const time = Date.now();
    const bobOffset = Math.sin(time / 400) * 4;
    const rotation = time / 800;
    const pulse = 1 + Math.sin(time / 200) * 0.1;

    ctx.translate(0, bobOffset);

    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.drawImage(baseSkin, -baseSize / 2, -baseSize / 2);
    ctx.restore();

    ctx.save();
    ctx.rotate(rotation);
    ctx.scale(pulse, pulse);
    ctx.drawImage(crystalSkin, -crystalSize / 2, -crystalSize / 2);
    ctx.restore();

    ctx.save();
    ctx.rotate(-rotation * 1.5);
    ctx.drawImage(ringSkin, -ringSize / 2, -ringSize / 2);
    ctx.restore();
    ctx.restore();
  }

  drawEnemyBullet(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ff5722";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  drawNormalBullet(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#00bcd4";
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-5, 3);
    ctx.fill();

    ctx.restore();
  }
}