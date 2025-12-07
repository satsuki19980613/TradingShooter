import { VisualPlayer } from "../../domain/view_models/VisualPlayer.js";
import { InterpolationLogic } from "../../logic/InterpolationLogic.js";
import { ParticleFactory } from "../../domain/factories/ParticleFactory.js";

export class StateSyncManager {
  constructor(userId) {
    this.userId = userId;
    this.visualState = {
      players: new Map(),
      enemies: new Map(),
      bullets: new Map(),
      obstacles: new Map(),
      effects: [],
    };
  }

  applySnapshot(snapshot) {
    if (!snapshot) return;
    this.visualState.players.clear();
    this.visualState.enemies.clear();
    this.visualState.bullets.clear();
    if (snapshot.players) {
      snapshot.players.forEach((p) => {
        const vp = new VisualPlayer(p.i, p.x, p.y);
        this.updatePlayerModel(vp, p);
        if (p.i === this.userId) vp.isMe = true;
        this.visualState.players.set(p.i, vp);
      });
    }
    if (snapshot.enemies) {
      snapshot.enemies.forEach((e) => {
        const ve = {
          id: e.i,
          x: e.x,
          y: e.y,
          hp: e.h,
          targetAngle: e.ta,
          type: "enemy",
        };
        this.visualState.enemies.set(e.i, ve);
      });
    }
    if (snapshot.bullets) {
      snapshot.bullets.forEach((b) => {
        const vb = { id: b.i, x: b.x, y: b.y, angle: b.a, type: b.t };
        this.visualState.bullets.set(b.i, vb);
      });
    }
  }

  applyDelta(delta) {
    if (!delta) return;
    if (delta.events) {
      delta.events.forEach((ev) => {
        let newParticles = [];
        if (ev.type === "hit") {
          newParticles = ParticleFactory.createHitEffect(
            ev.x,
            ev.y,
            ev.color,
            8
          );
        } else if (ev.type === "explosion") {
          newParticles = ParticleFactory.createExplosionEffect(
            ev.x,
            ev.y,
            ev.color
          );
        }
        this.visualState.effects.push(...newParticles);
      });
    }

    if (delta.removed) {
      delta.removed.players.forEach((id) =>
        this.visualState.players.delete(id)
      );
      delta.removed.enemies.forEach((id) =>
        this.visualState.enemies.delete(id)
      );
      delta.removed.bullets.forEach((id) =>
        this.visualState.bullets.delete(id)
      );
    }

    if (delta.updated) {
      if (delta.updated.players) {
        delta.updated.players.forEach((pState) => {
          let p = this.visualState.players.get(pState.i);
          if (!p) {
            p = new VisualPlayer(pState.i, pState.x, pState.y);
            if (pState.i === this.userId) p.isMe = true;
            this.visualState.players.set(pState.i, p);
          }
          this.updatePlayerModel(p, pState);
          if (!p.isDead && pState.d) {
            const deathEffects = ParticleFactory.createExplosionEffect(
              p.x,
              p.y,
              "#ffffff"
            );
            this.visualState.effects.push(...deathEffects);
          }
        });
      }
      if (delta.updated.enemies) {
        delta.updated.enemies.forEach((eState) => {
          let e = this.visualState.enemies.get(eState.i);
          if (!e) {
            e = {
              id: eState.i,
              x: eState.x,
              y: eState.y,
              hp: eState.h,
              targetAngle: eState.ta,
              type: "enemy",
            };
            this.visualState.enemies.set(eState.i, e);
          }
          e.targetX = eState.x;
          e.targetY = eState.y;
          e.targetAngle = eState.ta;
          e.hp = eState.h;
        });
      }
      if (delta.updated.bullets) {
        delta.updated.bullets.forEach((bState) => {
          let b = this.visualState.bullets.get(bState.i);
          if (!b) {
            b = {
              id: bState.i,
              x: bState.x,
              y: bState.y,
              angle: bState.a,
              type: bState.t,
            };
            this.visualState.bullets.set(bState.i, b);
          }
          b.targetX = bState.x;
          b.targetY = bState.y;
          b.angle = bState.a;
        });
      }
    }
  }

  updatePlayerModel(vp, state) {
    if (vp.isMe) {
      const dist = Math.sqrt(
        Math.pow(state.x - vp.x, 2) + Math.pow(state.y - vp.y, 2)
      );
      if (dist > 20.0) {
        vp.targetX = state.x;
        vp.targetY = state.y;
      } else {
        vp.targetX = vp.x;
        vp.targetY = vp.y;
      }
    } else {
      vp.targetX = state.x;
      vp.targetY = state.y;
    }

    vp.hp = state.h;
    vp.ep = state.e;
    vp.name = state.n;

    vp.targetAimAngle = state.a;
    vp.targetTurretAngle = state.ta;
    vp.isDead = !!state.d;
    vp.chargeBetAmount = state.ba;
    vp.stockedBullets = state.sb || [];
    if (state.cp) {
      vp.chargePosition = {
        entryPrice: state.cp.ep,
        amount: state.cp.a,
        type: state.cp.t,
      };
    } else {
      vp.chargePosition = null;
    }
  }

  setStaticState(staticData) {
    if (!staticData || !staticData.obstacles) return;
    this.visualState.obstacles.clear();
    staticData.obstacles.forEach((obs) => {
      const id = obs.id || `${obs.x},${obs.y}`;
      const vo = {
        id: id,
        x: obs.x,
        y: obs.y,
        width: obs.width,
        height: obs.height,
        styleType: obs.className || "default",
        rotation: obs.rotation || 0,
        type: "obstacle",
      };
      this.visualState.obstacles.set(id, vo);
    });
  }

  updateInterpolation(dt) {
    this.visualState.players.forEach((p) => {
      p.x = InterpolationLogic.calculateNextPosition(p.x, p.targetX, dt);
      p.y = InterpolationLogic.calculateNextPosition(p.y, p.targetY, dt);

      p.rotationAngle = InterpolationLogic.calculateNextAngle(
        p.rotationAngle,
        p.targetAimAngle,
        dt
      );

      p.aimAngle = InterpolationLogic.calculateNextAngle(
        p.aimAngle,
        p.targetTurretAngle,
        dt
      );
    });
    this.visualState.enemies.forEach((e) => {
      e.x = InterpolationLogic.calculateNextPosition(e.x, e.targetX || e.x, dt);
      e.y = InterpolationLogic.calculateNextPosition(e.y, e.targetY || e.y, dt);
    });
    this.visualState.bullets.forEach((b) => {
      b.x = InterpolationLogic.calculateNextPosition(b.x, b.targetX || b.x, dt);
      b.y = InterpolationLogic.calculateNextPosition(b.y, b.targetY || b.y, dt);
    });
    for (let i = this.visualState.effects.length - 1; i >= 0; i--) {
      const ef = this.visualState.effects[i];
      ef.update(dt);
      if (ef.isDead()) {
        this.visualState.effects.splice(i, 1);
      }
    }
  }
}
