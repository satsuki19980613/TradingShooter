// src_v2/core/config/EffectConfig.js

export const EffectConfig = {
  // ★重要: ステップ1でデプロイしたあなたのURLに書き換えてください
  // 例: "https://trading-charge-shooter.web.app/assets/effects"
  BASE_URL: "https://trading-charge-shooter.web.app/assets/effects",

  ASSETS: {
    // === 弾本体 (Projectile) ===
    "bullet_orb": "NS_Orb03_Blue/NS_Projectile_Orb03_Blue_Json/NS_Projectile_Orb03_Blue.json",
    "bullet_slash": "NS_Slash01_Blue/NS_Projectile_Slash01_Blue_Json/NS_Projectile_Slash01_Blue.json",
    "bullet_fireball": "NS_Fireball03_Orange/NS_Projectile_Fireball03_Orange_Json/NS_Projectile_Fireball03_Orange.json",

    // === マズル (発射エフェクト) ===
    "muzzle_orb": "NS_Orb03_Blue/NS_Muzzle_Orb03_Blue_Json/NS_Muzzle_Orb03_Blue.json",
    "muzzle_slash": "NS_Slash01_Blue/NS_Muzzle_Slash01_Blue_Json/NS_Muzzle_Slash01_Blue.json",
    "muzzle_fireball": "NS_Fireball03_Orange/NS_Muzzle_Fireball03_Orange_Json/NS_Muzzle_Fireball03_Orange.json",

    // === ヒット (着弾エフェクト) ===
    "hit_orb": "NS_Orb03_Blue/NS_Hit_Orb03_Blue_Json/NS_Hit_Orb03_Blue.json",
    "hit_slash": "NS_Slash01_Blue/NS_Hit_Slash01_Blue_Json/NS_Hit_Slash01_Blue.json",
    "hit_fireball": "NS_Fireball03_Orange/NS_Hit_Fireball03_Orange_Json/NS_Hit_Fireball03_Orange.json"
  }
};