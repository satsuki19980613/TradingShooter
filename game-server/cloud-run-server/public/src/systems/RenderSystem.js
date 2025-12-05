import { skinManager } from "./SkinManager.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";

export class RenderSystem {
  constructor(gameLayer) {
    this.gameLayer = gameLayer;
    // ★重要: 重なり順（Z-Index）を有効にする設定
    this.gameLayer.sortableChildren = true;
    
    this.PLAYER_SKIN_SIZE = 150;
    this.ENEMY_SKIN_SIZE = 120;
    this.sprites = new Map();
  }

  render(playerEntities, enemyEntities, bulletEntities, obstacleEntities) {
    this.syncEntities(playerEntities, "player");
    this.syncEntities(enemyEntities, "enemy");
    this.syncEntities(bulletEntities, "bullet");
    this.syncEntities(obstacleEntities, "obstacle");
    this.cleanupSprites(playerEntities, enemyEntities, bulletEntities, obstacleEntities);
  }

  syncEntities(entities, type) {
    entities.forEach((entity) => {
      let visual = this.sprites.get(entity.id);

      // 初回生成
      if (!visual) {
        visual = this.createVisual(entity, type);
        this.sprites.set(entity.id, visual);
        this.gameLayer.addChild(visual.container);
      }

      // 座標更新
      visual.container.x = entity.x;
      visual.container.y = entity.y;

      // 個別更新
      if (type === "player") {
        visual.chassis.rotation = entity.rotationAngle + Math.PI / 2;
        visual.turret.rotation = (entity.aimAngle !== undefined) ? entity.aimAngle : entity.rotationAngle;
        this.updateHPBar(visual.hpBar, entity.hp, 100, 60);
      } else if (type === "enemy") {
        visual.body.rotation = (entity.targetAngle !== undefined) ? entity.targetAngle : (entity.angle || 0);
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

    // ★重要: ここで重なり順（Z-Index）を指定します
    // 数字が小さいほど奥、大きいほど手前に表示されます
    if (type === "obstacle") container.zIndex = 10;
    else if (type === "enemy") container.zIndex = 50;
    else if (type === "player") container.zIndex = 100;
    else if (type === "bullet") container.zIndex = 200;

    if (type === "player") {
        const color = entity.color || "#00e5ff";
        const chassisTex = skinManager.getTexture(`player_chassis_${color}`, this.PLAYER_SKIN_SIZE, this.PLAYER_SKIN_SIZE, PlayerSkins.chassis(color));
        const turretTex = skinManager.getTexture(`player_turret_${color}`, this.PLAYER_SKIN_SIZE, this.PLAYER_SKIN_SIZE, PlayerSkins.turret(color));
        const chassis = new PIXI.Sprite(chassisTex);
        chassis.anchor.set(0.5);
        const turret = new PIXI.Sprite(turretTex); turret.anchor.set(0.5);
        const textStyle = new PIXI.TextStyle({ fontFamily: "'Roboto Mono', monospace", fontSize: 12, fontWeight: "bold", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 });
        const text = new PIXI.Text({ text: entity.name || "Guest", style: textStyle });
        text.anchor.set(0.5); text.y = -110;
        container.addChild(chassis, turret, text);
        if (!entity.isMe) { hpBar.y = -95; container.addChild(hpBar); }
        return { container, chassis, turret, text, hpBar, type };

    } else if (type === "enemy") {
        const bodyTex = skinManager.getTexture("enemy_heavy_tank", this.ENEMY_SKIN_SIZE, this.ENEMY_SKIN_SIZE, EnemySkins.heavyTank());
        const body = new PIXI.Sprite(bodyTex); body.anchor.set(0.5);
        hpBar.y = -60; container.addChild(body, hpBar);
        return { container, body, hpBar, type };

    } else if (type === "bullet") {
        const size = entity.radius ? entity.radius * 4 : 32;
        const bulletType = entity.type || "player";
        const drawFunc = BulletSkins[bulletType] || BulletSkins["player"];
        const funcToUse = (ctx, w, h) => { const f = drawFunc(3000); if (typeof f === "function") f(ctx, w, h); else drawFunc()(ctx, w, h); };
        const texture = skinManager.getTexture(`bullet_${bulletType}`, size, size, funcToUse);
        const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5);
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
    
    // アニメーション判定
    const isAnimated = styleType.includes("animated");

    // アニメーションしない場合（通常のキャッシュ使用）
    if (!isAnimated) {
        const skinKey = `obs_${styleType}_${width}_${height}`;
        if (visual.currentSkinKey !== skinKey) {
            let drawFunc = ObstacleSkins[styleType];
            if (typeof drawFunc === 'function' && drawFunc.length >= 1) {
                drawFunc = drawFunc(0.0);
            }
            if (typeof drawFunc !== 'function') {
                drawFunc = ObstacleSkins["default"];
            }
            const texture = skinManager.getTexture(skinKey, width, height, drawFunc);
            visual.sprite.texture = texture;
            visual.currentSkinKey = skinKey;
            visual.sprite.width = width;
            visual.sprite.height = height;
        }
    } 
    // アニメーションする場合（毎フレーム更新）
    else {
        // 時間経過で 0.0 ~ 1.0 を繰り返す (2秒周期)
        const progress = (Date.now() % 4000) / 4000;
        
        // スキン関数を取得
        const skinFactory = ObstacleSkins[styleType];
        if (typeof skinFactory === 'function') {
            const drawFunc = skinFactory(progress);
            
            // Canvasを生成して描画
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            drawFunc(ctx, width, height);

            // メモリリーク防止のため古いテクスチャを破棄
            if (visual.sprite.texture) {
                visual.sprite.texture.destroy(true); 
            }
            
            // 新しいテクスチャを適用
            visual.sprite.texture = PIXI.Texture.from(canvas);
            visual.sprite.width = width;
            visual.sprite.height = height;
            visual.currentSkinKey = "animated"; // キャッシュキーは使わない
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
    graphics.rect(-width / 2, 0, width, height).fill({ color: 0x000000, alpha: 0.6 });
    graphics.rect(-width / 2, 0, barW, height).fill({ color: color, alpha: 0.8 });
    graphics.rect(-width / 2, 0, width, height).stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }

  cleanupSprites(players, enemies, bullets, obstacles) {
    for (const [id, visual] of this.sprites) {
      let exists = false;
      if (visual.type === "player") exists = players.has(id);
      else if (visual.type === "enemy") exists = enemies.has(id);
      else if (visual.type === "bullet") exists = bullets.has(id);
      else if (visual.type === "obstacle") exists = obstacles.has(id);
      
      if (!exists) {
        this.gameLayer.removeChild(visual.container);
        visual.container.destroy({ children: true });
        this.sprites.delete(id);
      }
    }
  }
}