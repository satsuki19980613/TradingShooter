import { GameObject } from "./GameObject.js";
import { skinManager } from "../systems/SkinManager.js";
import { PlayerSkins } from "../skins/PlayerSkins.js";
/**
 * 角度を滑らかに補間 (Lerp) する
 */
function lerpAngle(current, target, rate) {
  let delta = target - current;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * rate;
}

/**
 * プレイヤークラス (サイバーパンク・ホバータンク ver)
 * 修正: トレード情報の同期漏れを解消 & 回転ロジックを改善
 */
export class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 45, "#00bcd4");
    this.rotationAngle = 0; // 車体の向き
    this.aimAngle = 0;      // 砲塔の向き
    this.targetAimAngle = 0;
    this.isInitialized = false;
    
    // --- ステータス ---
    this.hp = 100;
    this.ep = 100;
    this.name = "";
    
    // --- トレード・弾薬データ (重要: これらを同期させる) ---
    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;
    
    // --- フラグ ---
    this.isDead = false;
    
    // アニメーション用
    this.hoverOffset = 0;
  }

  update() {
    super.update();

    // 【修正】勝手な回転を削除し、移動方向に車体を向ける
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    // ある程度移動している場合のみ向きを変える (静止時は維持)
    if (dx * dx + dy * dy > 1) {
        const moveAngle = Math.atan2(dy, dx);
        this.rotationAngle = lerpAngle(this.rotationAngle, moveAngle, 0.1);
    }

    // 砲塔はマウスに追従
    this.aimAngle = lerpAngle(this.aimAngle, this.targetAimAngle, 0.3);
    
    // ホバリングの浮遊感
    this.hoverOffset = Math.sin(Date.now() / 200) * 3;
  }

  /**
   * サーバーからの状態同期
   * 【修正】消えてしまっていたチャージ情報等の同期を復活
   */
  setState(state) {
    this.id = state.id;
    if (!this.isInitialized) {
      this.x = state.x;
      this.y = state.y;
      this.aimAngle = state.aimAngle;
      this.rotationAngle = state.aimAngle; // 初期向き
      this.isInitialized = true;
    }
    
    this.name = state.name;
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetAimAngle = state.aimAngle;
    
    this.hp = state.hp;
    this.ep = state.ep;
    this.isDead = state.isDead;

    // ▼▼▼ 復活させた同期処理 ▼▼▼
    this.chargeBetAmount = state.chargeBetAmount;
    this.chargePosition = state.chargePosition;
    this.stockedBullets = state.stockedBullets;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  }

  draw(ctx) {
    if (this.isDead) return;

    // キャッシュ画像のサイズ (回転しても切れないよう大きめに)
    const skinSize = 120; 
    const color = "#00e5ff"; // 将来的に this.color などに変えれば色変更可能

    // 1. 車体 (Chassis) の取得
    const chassisSkin = skinManager.getSkin(
        `player_chassis_${color}`, 
        skinSize, skinSize, 
        PlayerSkins.chassis(color)
    );

    // 2. 砲塔 (Turret) の取得
    const turretSkin = skinManager.getSkin(
        `player_turret_${color}`, 
        skinSize, skinSize, 
        PlayerSkins.turret(color)
    );

    ctx.save();
    ctx.translate(this.x, this.y);

    // 名前表示 (動的なので毎回描画)
    ctx.fillStyle = "white";
    ctx.font = "bold 12px 'Roboto Mono', monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(this.name, 0, -this.radius - 15);
    ctx.shadowBlur = 0;

    // --- 車体描画 (画像) ---
    ctx.save();
    // 移動方向へ回転
    ctx.rotate(this.rotationAngle + Math.PI / 2); 
    // 画像の中心を合わせるためのオフセット
    ctx.drawImage(chassisSkin, -skinSize/2, -skinSize/2);
    ctx.restore();

    // --- 砲塔描画 (画像) ---
    ctx.save();
    // マウス方向へ回転
    ctx.rotate(this.aimAngle);
    ctx.drawImage(turretSkin, -skinSize/2, -skinSize/2);
    
    // レーザーサイト (長い線は画像化すると巨大になるので、ここだけコード描画でOK)
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(300, 0);
    ctx.stroke();
    
    ctx.restore();

    ctx.restore();
  }


}