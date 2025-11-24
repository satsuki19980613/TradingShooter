import { NeonCrateSkin } from "./obstacles/NeonCrate.js";
import { HexagonFortressSkin } from "./obstacles/HexagonFortress.js";
import { LongCornerMagentaSkin } from "./obstacles/LongCornerMagenta.js";
import { WideNeonSkin } from "./obstacles/WideNeon.js";
import { UShapeHangarSkin } from "./obstacles/UShapeHangar.js";
import { LongCrossSkin } from "./obstacles/LongCross.js";
import { StandardCyberSkin } from "./obstacles/StandardCyber.js";

export const ObstacleSkins = {
  "obs-neon-crate": NeonCrateSkin("#00e5ff"),

  // ▼ 追加: IDと関数の紐付け (progressを渡すラッパー関数)
  "obs-hexagon-fortress-animated": (progress) => HexagonFortressSkin(progress, "#00ffea"),
  "obs-long-corner": (progress) => LongCornerMagentaSkin(progress),
  "obs-wide-neon": (progress) => WideNeonSkin(progress),
  "obs-ushape-hangar": (progress) => UShapeHangarSkin(progress),
  "obs-long-cross": (progress) => LongCrossSkin(progress),
  "obs-standard-cyber": (progress) => StandardCyberSkin(progress),

  "default": (ctx, w, h) => {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(0, 0, w, h);
    // ↓ これが表示されているはずです
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("NoSkin", 2, 12);
  },
};