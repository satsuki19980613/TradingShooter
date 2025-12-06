
export class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);

    this.staticGrid = new Map();

    this.dynamicGrid = new Map();
  }

  /**
   * 動的グリッドのみをクリア (毎フレーム呼び出し)
   */
  clear() {
    this.dynamicGrid.clear();
  }

  /**
   * 座標からセルキーを取得
   */
  _getCellKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col}_${row}`;
  }

  /**
   * 内部用: 指定したグリッドマップにエンティティを登録
   */
  _addToGrid(entity, gridMap) {
    let minX, maxX, minY, maxY;

    if (entity.radius !== undefined) {
      minX = Math.max(0, entity.x - entity.radius);
      maxX = entity.x + entity.radius;
      minY = Math.max(0, entity.y - entity.radius);
      maxY = entity.y + entity.radius;
    } else if (entity.width !== undefined && entity.height !== undefined) {
      minX = Math.max(0, entity.x);
      maxX = entity.x + entity.width;
      minY = Math.max(0, entity.y);
      maxY = entity.y + entity.height;
    } else {
      return;
    }

    const startCol = Math.floor(minX / this.cellSize);
    const endCol = Math.floor(maxX / this.cellSize);
    const startRow = Math.floor(minY / this.cellSize);
    const endRow = Math.floor(maxY / this.cellSize);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}_${row}`;
        if (!gridMap.has(key)) {
          gridMap.set(key, new Set());
        }
        gridMap.get(key).add(entity);
      }
    }
  }

  /**
   * 静的エンティティ（壁など）を登録
   * ※初期化時のみ呼び出す
   */
  insertStatic(entity) {
    this._addToGrid(entity, this.staticGrid);
  }

  /**
   * 動的エンティティ（プレイヤー、弾など）を登録
   * ※毎フレーム呼び出す
   */
  insert(entity) {
    this._addToGrid(entity, this.dynamicGrid);
  }

  /**
   * 指定されたエンティティの近くにいる可能性のあるエンティティを取得
   * (静的グリッドと動的グリッドの両方を検索して結合する)
   */
  getNearbyEntities(entity) {
    const nearby = new Set();

    const minX = Math.max(0, entity.x - (entity.radius || 0));
    const maxX = entity.x + (entity.radius || entity.width || 0);
    const minY = Math.max(0, entity.y - (entity.radius || 0));
    const maxY = entity.y + (entity.radius || entity.height || 0);

    const startCol = Math.floor(minX / this.cellSize);
    const endCol = Math.floor(maxX / this.cellSize);
    const startRow = Math.floor(minY / this.cellSize);
    const endRow = Math.floor(maxY / this.cellSize);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}_${row}`;

        if (this.staticGrid.has(key)) {
          this.staticGrid.get(key).forEach((e) => {
            if (e !== entity) nearby.add(e);
          });
        }

        if (this.dynamicGrid.has(key)) {
          this.dynamicGrid.get(key).forEach((e) => {
            if (e !== entity) nearby.add(e);
          });
        }
      }
    }
    return nearby;
  }
}
