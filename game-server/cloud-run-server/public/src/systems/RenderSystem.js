import { skinManager } from "./SkinManager.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { BulletSkins } from "../skins/bullets/BulletSkins.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";

export class RenderSystem {
  constructor(gameLayer) {
    this.gameLayer = gameLayer;
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

    if (type === "player") {
        // ... (プレイヤー生成処理は変更なし) ...
        const color = entity.color || "#00e5ff";
        const chassisTex = skinManager.getTexture(`player_chassis_${color}`, this.PLAYER_SKIN_SIZE, this.PLAYER_SKIN_SIZE, PlayerSkins.chassis(color));
        const turretTex = skinManager.getTexture(`player_turret_${color}`, this.PLAYER_SKIN_SIZE, this.PLAYER_SKIN_SIZE, PlayerSkins.turret(color));
        const chassis = new PIXI.Sprite(chassisTex); chassis.anchor.set(0.5);
        const turret = new PIXI.Sprite(turretTex); turret.anchor.set(0.5);
        const textStyle = new PIXI.TextStyle({ fontFamily: "'Roboto Mono', monospace", fontSize: 12, fontWeight: "bold", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 });
        const text = new PIXI.Text({ text: entity.name || "Guest", style: textStyle });
        text.anchor.set(0.5); text.y = -110;
        container.addChild(chassis, turret, text);
        if (!entity.isMe) { hpBar.y = -95; container.addChild(hpBar); }
        return { container, chassis, turret, text, hpBar, type };

    } else if (type === "enemy") {
        // ... (敵生成処理は変更なし) ...
        const bodyTex = skinManager.getTexture("enemy_heavy_tank", this.ENEMY_SKIN_SIZE, this.ENEMY_SKIN_SIZE, EnemySkins.heavyTank());
        const body = new PIXI.Sprite(bodyTex); body.anchor.set(0.5);
        hpBar.y = -60; container.addChild(body, hpBar);
        return { container, body, hpBar, type };

    } else if (type === "bullet") {
        // ... (弾生成処理は変更なし) ...
        const size = entity.radius ? entity.radius * 4 : 32;
        const bulletType = entity.type || "player";
        const drawFunc = BulletSkins[bulletType] || BulletSkins["player"];
        const funcToUse = (ctx, w, h) => { const f = drawFunc(3000); if (typeof f === "function") f(ctx, w, h); else drawFunc()(ctx, w, h); };
        const texture = skinManager.getTexture(`bullet_${bulletType}`, size, size, funcToUse);
        const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5);
        container.addChild(sprite);
        return { container, sprite, type };

    } else if (type === "obstacle") {
      // ★修正: 障害物用のスプライトを初期作成
      // テクスチャは updateObstacleTexture で設定されますが、
      // ここで一旦空のスプライトを作っておきます。
      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);
      container.addChild(sprite);
      
      // 生成直後に一度更新をかける
      const visual = { container, sprite, type, currentSkinKey: null };
      this.updateObstacleTexture(visual, entity);
      
      return visual;
    }
  }

  updateObstacleTexture(visual, entity) {
    const styleType = entity.styleType || "default";
    const width = entity.width || 100;
    const height = entity.height || 100;
    const skinKey = `obs_${styleType}_${width}_${height}`; // アニメーション簡略化のため固定キーを使用

    // スキンがまだセットされていない、または変更された場合のみ更新
    if (visual.currentSkinKey !== skinKey) {
        
        // スキン関数の取得 (なければデフォルト)
        let drawFunc = ObstacleSkins[styleType];
        
        // アニメーション関数の場合、frame 0 (progress 0.0) を取得
        if (typeof drawFunc === 'function' && drawFunc.length >= 1) {
            drawFunc = drawFunc(0.0);
        }
        
        // それでも関数でなければデフォルト
        if (typeof drawFunc !== 'function') {
            // console.warn(`Skin not found: ${styleType}, using default.`);
            drawFunc = ObstacleSkins["default"];
        }

        const texture = skinManager.getTexture(skinKey, width, height, drawFunc);
        visual.sprite.texture = texture;
        visual.currentSkinKey = skinKey;
        
        // 明示的にサイズを設定 (PixiJSのスプライトサイズ補正)
        visual.sprite.width = width;
        visual.sprite.height = height;
    }
  }

  // ... (updateHPBar, cleanupSprites は変更なし) ...
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