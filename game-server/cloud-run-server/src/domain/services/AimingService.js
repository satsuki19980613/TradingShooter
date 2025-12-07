import { PlayerLogic } from "../../logic/PlayerLogic.js";

/**
 * エイム（射撃方向決定）に関するドメインサービス
 */
export class AimingService {
  /**
   * 最終的な射撃角度を決定する
   * @param {Object} player - プレイヤーエンティティ
   * @param {Object} physicsSystem - 物理システム（近隣エンティティ取得用）
   * @returns {number} 決定された射撃角度(ラジアン)
   */
  static determineShootAngle(player, physicsSystem) {
    const nearby = physicsSystem.grid.getNearby(player);

    const autoAimAngle = PlayerLogic.calculateAutoAimAngle(player, nearby);

    if (autoAimAngle !== null) {
      return autoAimAngle;
    }

    return player.angle;
  }
}

