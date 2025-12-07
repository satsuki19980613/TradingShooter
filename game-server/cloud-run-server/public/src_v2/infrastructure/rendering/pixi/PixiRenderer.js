import { skinFactory } from "../skins/SkinFactory.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";
import { GridSkin } from "../skins/environment/GridSkin.js";
import { PixiParticleRenderer } from "./PixiParticleRenderer.js";
import { PixiSpritePool } from "./PixiSpritePool.js";

export class PixiRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.app = null;
    this.layers = {
      background: new PIXI.Container(),
      game: new PIXI.Container(),
      effect: new PIXI.Container(),
    };
    this.layers.game.sortableChildren = true;
    this.sprites = new Map();
    this.gridSprite = null;

    this.PLAYER_SKIN_SIZE = 150;
    this.ENEMY_SKIN_SIZE = 120;

    this.particleRenderer = null;
    this.pool = new PixiSpritePool();
  }

  async init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;

    this.app = new PIXI.Application();
    await this.app.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: 0x1a1a1a,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });
    this.app.stage.addChild(this.layers.background);
    this.app.stage.addChild(this.layers.game);
    this.app.stage.addChild(this.layers.effect);

    this.particleRenderer = new PixiParticleRenderer(this.layers.effect);
  }

  setupBackground(worldW, worldH, cellSize = 150) {
    this.layers.background.removeChildren();
    const drawFn = GridSkin.drawTile("rgba(0, 100, 100, 0.2)", 2);
    const gridTexture = skinFactory.getTexture(
      "bg_grid",
      cellSize,
      cellSize,
      drawFn
    );
    this.gridSprite = new PIXI.TilingSprite(gridTexture, worldW, worldH);
    this.layers.background.addChild(this.gridSprite);

    const border = new PIXI.Graphics();
    border.rect(0, 0, worldW, worldH);
    border.stroke({ width: 4, color: 0x00ffff, alpha: 0.5 });
    this.layers.background.addChild(border);
  }

  resize(width, height) {
    if (this.app && this.app.renderer) {
      this.app.renderer.resize(width, height);
    }
  }

  updateCamera(centerX, centerY, scale) {
    if (!this.app) return;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    [this.layers.background, this.layers.game, this.layers.effect].forEach(
      (layer) => {
        layer.scale.set(scale);
        layer.pivot.set(centerX, centerY);
        layer.position.set(screenW / 2, screenH / 2);
      }
    );
  }

  render(visualState) {
    this.syncSprites(visualState.players, "player");
    this.syncSprites(visualState.enemies, "enemy");
    this.syncSprites(visualState.bullets, "bullet");
    this.syncSprites(visualState.obstacles, "obstacle");
    if (this.particleRenderer) {
      this.particleRenderer.render(visualState.effects);
    }

    this.cleanupSprites(visualState);
  }

  syncSprites(entities, type) {
    entities.forEach((entity) => {
      let visual = this.sprites.get(entity.id);

      if (!visual) {
        if (type === "bullet") {
          const bulletType = entity.type || "player";
          const poolKey = `bullet_${bulletType}`;

          visual = this.pool.get(poolKey, () =>
            this.createVisual(entity, type)
          );
          visual.poolKey = poolKey;
          visual.type = type;
        } else {
          visual = this.createVisual(entity, type);
        }

        this.sprites.set(entity.id, visual);
        this.layers.game.addChild(visual.container);
      }

      visual.container.x = entity.x;
      visual.container.y = entity.y;

      if (type === "player") {
        visual.chassis.rotation = entity.rotationAngle + Math.PI / 2;
        visual.turret.rotation =
          entity.aimAngle !== undefined
            ? entity.aimAngle
            : entity.rotationAngle;
        this.updateHPBar(visual.hpBar, entity.hp, 100, 60);
      } else if (type === "enemy") {
        visual.body.rotation =
          entity.targetAngle !== undefined
            ? entity.targetAngle
            : entity.angle || 0;
        this.updateHPBar(visual.hpBar, entity.hp, 50, 50);
      } else if (type === "bullet") {
        visual.container.rotation = entity.angle;
      } else if (type === "obstacle") {
        visual.container.rotation = entity.rotation || 0;
        this.updateObstacleTexture(visual, entity);
      }
    });
  }

  createVisual(entity, type) {
    const container = new PIXI.Container();
    const hpBar = new PIXI.Graphics();

    if (type === "obstacle") container.zIndex = 10;
    else if (type === "enemy") container.zIndex = 50;
    else if (type === "player") container.zIndex = 100;
    else if (type === "bullet") container.zIndex = 200;

    if (type === "player") {
      const color = entity.color || "#00e5ff";
      const chassisTex = skinFactory.getTexture(
        `player_chassis_${color}`,
        this.PLAYER_SKIN_SIZE,
        this.PLAYER_SKIN_SIZE,
        PlayerSkins.chassis(color)
      );
      const turretTex = skinFactory.getTexture(
        `player_turret_${color}`,
        this.PLAYER_SKIN_SIZE,
        this.PLAYER_SKIN_SIZE,
        PlayerSkins.turret(color)
      );

      const chassis = new PIXI.Sprite(chassisTex);
      chassis.anchor.set(0.5);
      const turret = new PIXI.Sprite(turretTex);
      turret.anchor.set(0.5);

      const textStyle = new PIXI.TextStyle({
        fontFamily: "'Roboto Mono', monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      });
      const text = new PIXI.Text({
        text: entity.name || "Guest",
        style: textStyle,
      });
      text.anchor.set(0.5);
      text.y = -110;

      container.addChild(chassis, turret, text);
      if (!entity.isMe) {
        hpBar.y = -95;
        container.addChild(hpBar);
      }
      return { container, chassis, turret, text, hpBar, type };
    } else if (type === "enemy") {
      const bodyTex = skinFactory.getTexture(
        "enemy_heavy_tank",
        this.ENEMY_SKIN_SIZE,
        this.ENEMY_SKIN_SIZE,
        EnemySkins.heavyTank()
      );
      const body = new PIXI.Sprite(bodyTex);
      body.anchor.set(0.5);
      hpBar.y = -60;
      container.addChild(body, hpBar);
      return { container, body, hpBar, type };
    } else if (type === "bullet") {
      const size = entity.radius ? entity.radius * 4 : 32;
      const bulletType = entity.type || "player";
      const drawFunc = BulletSkins[bulletType] || BulletSkins["player"];
      const funcToUse = (ctx, w, h) => {
        const f = drawFunc(3000);
        if (typeof f === "function") f(ctx, w, h);
        else drawFunc()(ctx, w, h);
      };
      const texture = skinFactory.getTexture(
        `bullet_${bulletType}`,
        size,
        size,
        funcToUse
      );
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      container.addChild(sprite);
      return { container, sprite, type };
    } else if (type === "obstacle") {
      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);
      container.addChild(sprite);
      const visual = { container, sprite, type, currentSkinKey: null };
      this.updateObstacleTexture(visual, entity);
      return visual;
    }
  }

  updateObstacleTexture(visual, entity) {
    const styleType = entity.styleType || "default";
    const width = entity.width || 100;
    const height = entity.height || 100;
    const isAnimated = styleType.includes("animated");

    if (!isAnimated) {
      const skinKey = `obs_${styleType}_${width}_${height}`;
      if (visual.currentSkinKey !== skinKey) {
        let drawFunc = ObstacleSkins[styleType];
        if (typeof drawFunc === "function" && drawFunc.length >= 1) {
          drawFunc = drawFunc(0.0);
        }
        if (typeof drawFunc !== "function") {
          drawFunc = ObstacleSkins["default"];
        }
        const texture = skinFactory.getTexture(
          skinKey,
          width,
          height,
          drawFunc
        );
        visual.sprite.texture = texture;
        visual.currentSkinKey = skinKey;
        visual.sprite.width = width;
        visual.sprite.height = height;
      }
    } else {
      const skinKey = `obs_anim_${styleType}_${width}_${height}`;
      const skinFactoryFunc = ObstacleSkins[styleType];

      if (typeof skinFactoryFunc === "function") {
        const totalFrames = 60;

        const textures = skinFactory.getAnimationTextures(
          skinKey,
          width,
          height,
          skinFactoryFunc,
          totalFrames
        );

        const loopTime = 4000;
        const progress = (Date.now() % loopTime) / loopTime;
        const frameIndex = Math.floor(progress * totalFrames);

        visual.sprite.texture = textures[frameIndex];
        visual.sprite.width = width;
        visual.sprite.height = height;
        visual.currentSkinKey = skinKey;
      }
    }
  }

  updateHPBar(graphics, currentHp, maxHp, width) {
    if (!graphics) return;
    graphics.clear();
    if (currentHp <= 0) return;
    const height = 6;
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    const barW = width * ratio;
    let color = 0x00ff00;
    if (ratio < 0.3) color = 0xff0000;
    else if (ratio < 0.6) color = 0xffff00;

    graphics
      .rect(-width / 2, 0, width, height)
      .fill({ color: 0x000000, alpha: 0.6 });
    graphics
      .rect(-width / 2, 0, barW, height)
      .fill({ color: color, alpha: 0.8 });
    graphics
      .rect(-width / 2, 0, width, height)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }

  cleanupSprites(visualState) {
    const activeIds = new Set();
    visualState.players.forEach((e) => activeIds.add(e.id));
    visualState.enemies.forEach((e) => activeIds.add(e.id));
    visualState.bullets.forEach((e) => activeIds.add(e.id));
    visualState.obstacles.forEach((e) => activeIds.add(e.id));

    for (const [id, visual] of this.sprites) {
      if (!activeIds.has(id)) {
        this.layers.game.removeChild(visual.container);

        if (visual.type === "bullet" && visual.poolKey) {
          this.pool.returnObject(visual.poolKey, visual);
        } else {
          visual.container.destroy({ children: true });
        }

        this.sprites.delete(id);
      }
    }
  }
}
