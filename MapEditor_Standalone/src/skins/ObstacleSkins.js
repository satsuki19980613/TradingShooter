import { NeonCrateSkin } from "./obstacles/NeonCrate.js";
import { PowerPlantSkin } from "./obstacles/PowerPlant.js";
import { PlasmaGeneratorSkin } from "./obstacles/PlasmaGenerator.js";

export const ObstacleSkins = {
  "obs-neon-crate": NeonCrateSkin("#00e5ff"),
  "obs-power-plant": PowerPlantSkin("#00e5ff"),
  "obs-plasma-gen": PlasmaGeneratorSkin(),

  default: (ctx, w, h) => {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(0, 0, w, h);
  },
};
