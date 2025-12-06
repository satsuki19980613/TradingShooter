export const PhysicsUtils = {
  /**
   * 入力と経過時間に基づいて座標を更新する純粋関数
   */
  applyMovement: (entity, inputs, dt) => {
    const speed = entity.defaultSpeed || 6.5;
    let dx = 0;
    let dy = 0;

    if (inputs.move_up) dy -= 1;
    if (inputs.move_down) dy += 1;
    if (inputs.move_left) dx -= 1;
    if (inputs.move_right) dx += 1;

    // 速度ベクトルの計算
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      // 座標の更新
      entity.x += dx * speed * dt; // dtはフレーム単位(1.0=1frame)または秒
      entity.y += dy * speed * dt;
      
      // 向きの更新
      entity.angle = Math.atan2(dy, dx);
    }
    
    // ※本来はここで「障害物との衝突判定」も共通化して行うのが理想です
    return { x: entity.x, y: entity.y, angle: entity.angle };
  }
};