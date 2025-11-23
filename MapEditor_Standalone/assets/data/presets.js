// assets/data/presets.js

export const OBSTACLE_PRESETS = [
  {
    id: "neon_crate",
    name: "Neon Crate",
    type: "obstacle_wall",
    width: 100,
    height: 100,
    borderRadius: 4,
    className: "obs-neon-crate",
    shape: "rect",
  },
  {
    id: "magma_wall",
    name: "Magma Wall",
    type: "obstacle_wall",
    width: 200,
    height: 50,
    borderRadius: 0,
    className: "obs-magma-wall",
    shape: "rect",
  },
  {
    id: "data_server",
    name: "Data Server",
    type: "obstacle_wall",
    width: 80,
    height: 120,
    borderRadius: 2,
    className: "obs-data-server",
    shape: "rect",
  },
  {
    id: "holo_barrier",
    name: "Holo Barrier",
    type: "obstacle_wall",
    width: 150,
    height: 150,
    borderRadius: 8,
    className: "obs-holo-barrier",
    shape: "rect",
  },
  {
    id: "reactor_core",
    name: "Reactor Core",
    type: "obstacle_wall",
    width: 120,
    height: 120,
    borderRadius: 60,
    className: "obs-reactor-core",
    shape: "circle",
    radius: 60,
  },
  // --- 新規追加アセット ---
  {
    id: "bio_tank",
    name: "Bio Tank v2",
    type: "obstacle_wall",
    width: 80,
    height: 140,
    borderRadius: 16, // 角丸を少し大きくしました
    className: "obs-bio-tank",
    shape: "rect",
  },
  {
    id: "glitch_node",
    name: "Glitch Node",
    type: "obstacle_wall",
    width: 100,
    height: 100,
    borderRadius: 0,
    className: "obs-glitch-node",
    shape: "rect",
  },
  {
    id: "cp_cargo",
    name: "Night City Cargo",
    type: "obstacle_wall",
    width: 120,
    height: 80,
    borderRadius: 2,
    className: "obs-cp-cargo",
    shape: "rect",
  },
  {
    id: "void_monolith",
    name: "Void Monolith",
    type: "obstacle_wall",
    width: 60,
    height: 180,
    borderRadius: 0,
    className: "obs-void-monolith",
    shape: "rect",
  },
  {
        id: "anime_pop",
        name: "Anime Pop",
        type: "obstacle_wall",
        width: 100,
        height: 100,
        borderRadius: 8,
        className: "obs-anime-pop",
        shape: "rect"
    },
    {
        id: "mecha_plate",
        name: "Mecha Armor",
        type: "obstacle_wall",
        width: 120,
        height: 60,
        borderRadius: 0,
        className: "obs-mecha-plate",
        shape: "rect"
    },
 
    {
    id: "complex_fort_01",
    name: "Fortress Wall",
    type: "complex_obstacle", // 識別用
    // width, height は自動計算されるので不要（または目安として記述）
    className: "obs-mecha-plate", // 全体に適用する見た目
    colliders: [
      // メインの壁 (横長)
      { x: 0, y: 20, w: 200, h: 40, borderRadius: 4 },
      // 左の柱
      { x: 0, y: 0, w: 40, h: 80, borderRadius: 2 },
      // 右の柱
      { x: 160, y: 0, w: 40, h: 80, borderRadius: 2 },
      // 中央の出っ張り
      { x: 80, y: 60, w: 40, h: 20, borderRadius: 0 }
    ]
  },
  {
    id: "complex_cross",
    name: "Cross Barrier",
    type: "complex_obstacle",
    className: "obs-neon-crate",
    colliders: [
      // 十字型
      { x: 50, y: 0, w: 50, h: 150 },
      { x: 0, y: 50, w: 150, h: 50 }
    ]
  }
];

