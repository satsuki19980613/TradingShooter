import { ServerObstacle } from "./ServerObstacle.js";

export class ServerMapLoader {
  static loadMapData(game, mapData) {
    if (
      !mapData.definitions &&
      mapData.obstacles &&
      !Array.isArray(mapData.obstacles)
    ) {
      console.log("[MapLoader] データの階層を補正します。");
      mapData = mapData.obstacles;
    }

    game.WORLD_WIDTH = (mapData.worldSize && mapData.worldSize.width) || 3000;
    game.WORLD_HEIGHT = (mapData.worldSize && mapData.worldSize.height) || 3000;

    let obstacleConfigs = [];
    if (mapData.definitions && mapData.placements) {
      console.log(`[MapLoader] パレット形式のマップデータを読み込みます。`);
      obstacleConfigs = mapData.placements
        .map((placement) => {
          const def = mapData.definitions[placement.defId];
          if (!def) return null;
          return {
            ...def,
            ...placement,
            id: placement.id || `obs_${Math.random()}`,
          };
        })
        .filter(Boolean);
    } else if (mapData.obstacles) {
      obstacleConfigs = mapData.obstacles;
    }

    game.obstacles = obstacleConfigs
      .map((obsData) => {
        if (obsData.type === "obstacle_wall" || obsData.type === "WALL") {
          const obs = new ServerObstacle(
            obsData.x,
            obsData.y,
            obsData.width,
            obsData.height,
            "obstacle_wall",
            obsData.borderRadius || 0,
            obsData.individualRadii || {},
            obsData.rotation || 0,
            obsData.className
          );
          if (obsData.colliders) obs.setColliders(obsData.colliders);
          return obs;
        }
        return null;
      })
      .filter(Boolean);

    game.playerSpawns = mapData.playerSpawns || [{ x: 500, y: 500 }];
    game.enemySpawns = mapData.enemySpawns || [{ x: 1500, y: 1500 }];

    game.obstacles.forEach((obs) => game.grid.insertStatic(obs));
  }
}
