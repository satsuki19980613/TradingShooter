// common/PlayerPhysics.js

/**
 * サーバーとクライアントで共有する移動ロジック
 * nengiのコマンド(入力)を受け取り、エンティティの座標を直接更新します。
 */
export const processPlayerInput = (entity, command) => {
    // ServerPlayer.js [cite: 408] の defaultSpeed と同じ値
    const speed = 6.5; 
    
    // nengiConfigで定義した delta (経過時間) を使用します
    // これによりフレームレートに依存しないスムーズな移動が可能になります
    const dt = command.delta; 

    let dx = 0;
    let dy = 0;

    // nengiConfig.js の commands.PlayerInput と一致するプロパティ名を使用
    if (command.move_up) dy -= 1;
    if (command.move_down) dy += 1;
    if (command.move_left) dx -= 1;
    if (command.move_right) dx += 1;

    // 移動入力がある場合のみ計算
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // ベクトルの正規化 (Normalize)
        const ndx = dx / length;
        const ndy = dy / length;

        // 座標更新
        // PhysicsUtils.js [cite: 1693-1694] と同様の計算式
        // ※ 壁との衝突判定はここには含めず、サーバー側の物理システムで補正された結果を最終的に正とします
        //   (nengiはズレが発生した場合、自動的にサーバーの位置へ滑らかに補間します)
        entity.x += ndx * speed * dt;
        entity.y += ndy * speed * dt;

        // 向き(Rotation)の更新
        // ServerPlayer.js [cite: 419] と同じ計算
        entity.rotation = Math.atan2(ndy, ndx);
    }
};