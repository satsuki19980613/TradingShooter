import { HexagonFortressSkin } from "./obstacles/HexagonFortress.js";
// ▼▼▼ 新しいスキンのインポート ▼▼▼よふかしうた
import { LongCornerMagentaSkin } from "./obstacles/LongCornerMagenta.js";
import { WideNeonSkin } from "./obstacles/WideNeon.js";
import { UShapeHangarSkin } from "./obstacles/UShapeHangar.js";
import { LongCrossSkin } from "./obstacles/LongCross.js";
import { StandardCyberSkin } from "./obstacles/StandardCyber.js";
// ▲▲▲

export const ObstacleSkins = {
  // 既存のアニメーション要塞
  "obs-hexagon-fortress-animated": (progress) => HexagonFortressSkin(progress, "#00ffea"),

  // ▼▼▼ 新しいスキンの登録 ▼▼▼
  "obs-long-corner": (progress) => LongCornerMagentaSkin(progress),
  "obs-wide-neon": (progress) => WideNeonSkin(progress),
  "obs-ushape-hangar": (progress) => UShapeHangarSkin(progress),
  "obs-long-cross": (progress) => LongCrossSkin(progress),
  "obs-standard-cyber": (progress) => StandardCyberSkin(progress),
  // ▲▲▲

  "default": (ctx, w, h) => {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("NoSkin", 2, 12);
  },
};