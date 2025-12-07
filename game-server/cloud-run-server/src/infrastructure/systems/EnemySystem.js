import { AILogic } from "../../logic/AILogic.js";
import { EnemyState } from "../../domain/EnemyState.js";
import { BulletState } from "../../domain/BulletState.js";

export class EnemySystem {
  constructor(game) {
    this.game = game;
    this.SEARCH_RADIUS = 500;
  }

  update() {
    this.game.worldState.enemies.forEach(enemy => {
      this.updateEnemyAI(enemy);
    });
  }

  updateEnemyAI(enemy) {
    // 1. ターゲット探索
    const player = AILogic.findClosestPlayer(
        enemy, 
        this.game.worldState.players, 
        this.SEARCH_RADIUS
    );

    // 2. 移動思考 (60フレームごとに更新)
    enemy.moveTimer--;
    if (enemy.moveTimer <= 0) {
        enemy.targetAngle = AILogic.decideTargetAngle(enemy, player);
        enemy.moveTimer = 60;
    }

    // 速度ベクトルの適用
    enemy.vx = Math.cos(enemy.targetAngle) * enemy.speed;
    enemy.vy = Math.sin(enemy.targetAngle) * enemy.speed;
    
    if (enemy.vx !== 0 || enemy.vy !== 0) {
        enemy.isDirty = true;
    }

    // 3. 射撃思考
    enemy.shootCooldown--;
    if (enemy.shootCooldown <= 0) {
        const { shouldShoot, angle, nextCooldown } = AILogic.shouldShoot(enemy, player);
        
        if (shouldShoot) {
            this.spawnEnemyBullet(enemy, angle);
        }
        enemy.shootCooldown = nextCooldown;
    }
  }

  spawnEnemyBullet(enemy, angle) {
    const bullet = new BulletState(
        enemy.x, 
        enemy.y, 
        6, 
        angle, 
        5, 
        "enemy", 
        10, 
        enemy.id
    );
    this.game.addBullet(bullet);
  }

  spawnEnemy() {
    const margin = 50;
    const x = Math.random() * (this.game.worldState.width - margin * 2) + margin;
    const y = Math.random() * (this.game.worldState.height - margin * 2) + margin;
    
    // 障害物と重ならないかチェックが必要だが、ここでは簡易配置
    const enemy = new EnemyState(x, y, this.game.worldState.width, this.game.worldState.height);
    enemy.id = `e_${this.game.worldState.enemyIdCounter++}`;
    
    this.game.worldState.enemies.push(enemy);
  }
}