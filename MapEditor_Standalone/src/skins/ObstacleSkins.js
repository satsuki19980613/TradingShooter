import { NeonCrateSkin } from "./obstacles/NeonCrate.js";
// import { MagmaWallSkin } from "./obstacles/MagmaWall.js"; // 今後追加

export const ObstacleSkins = {
  // ID と スキン関数の紐付け
  // ここで color を指定してバリエーションを作ることも可能
  "obs-neon-crate": NeonCrateSkin("#00e5ff"),
  
  // デフォルト（未定義の場合用）
  "default": (ctx, w, h) => {
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(0, 0, w, h);
  }
};