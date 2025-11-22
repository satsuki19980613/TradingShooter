/**
 * 2点間の距離を計算
 */
export function getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

// ▼▼▼ これを必ず追加してください ▼▼▼
/**
 * 2点間の「距離の二乗」を計算（高速化用）
 */
export function getDistanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}