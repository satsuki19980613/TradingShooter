import { SkinFactoryUI } from "./SkinFactoryUI.js";
import { InitialScene } from "./scenes/InitialScene.js";
import { HomeScene } from "./scenes/HomeScene.js";
import { ModalScene } from "./scenes/ModalScene.js";

export class CyberUIRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;

    this.frame = 0;
    this.speed = 2;
    this.stars = [];
    this.glitchIntensity = 0;
    this.glitchTimer = 0;
    this.gridOffset = 0;
    this.colors = {
      bg: "#050505",
      cyan: "#00f3ff",
      pink: "#ff0055",
      purple: "#bc13fe",
      yellow: "#f9f002",
      white: "#ffffff",
    };

    this.skinFactory = new SkinFactoryUI();
    this.scenes = {
      initial: new InitialScene(this.skinFactory),
      home: new HomeScene(this.skinFactory),
      modal: new ModalScene(this.skinFactory),
    };
    this.currentScene = this.scenes.initial;
    this.overlayScene = null;
    this.mousePos = { x: 0, y: 0 };
    this.onAction = null;

    this.scanlineCanvas = document.createElement("canvas");
    this.scanlineCtx = this.scanlineCanvas.getContext("2d");

    if (this.canvas) {
      this.setupEvents();
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }
  }
  setOverlay(sceneKey) {
    if (sceneKey && this.scenes[sceneKey]) {
      this.overlayScene = this.scenes[sceneKey];
    } else {
      this.overlayScene = null;
    }
  }

  setScene(sceneKey, data = null) {
    if (this.scenes[sceneKey]) {
      this.currentScene = this.scenes[sceneKey];
      if (data && typeof this.currentScene.setUserState === "function") {
        this.currentScene.setUserState(data);
      }
    }
  }

  setCallback(fn) {
    this.onAction = fn;
  }

  setupEvents() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (this.currentScene) {
        const actionId = this.currentScene.handleClick(
          this.mousePos.x,
          this.mousePos.y
        );
        if (actionId && this.onAction) {
          this.onAction(actionId);
        }
      }
    });
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;

    this.scanlineCanvas.width = this.width;
    this.scanlineCanvas.height = this.height;
    this.updateScanlineCache();

    this.initStars();
  }

  start() {
    if (!this.animationId) {
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: this.random(-this.width, this.width),
        y: this.random(-this.height, this.height),
        z: this.random(1, 1000),
      });
    }
  }

  updateScanlineCache() {
    const ctx = this.scanlineCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    for (let i = 0; i < this.height; i += 4) {
      ctx.fillRect(0, i, this.width, 2);
    }
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  updateGlitch() {
    if (this.glitchTimer > 0) {
      this.glitchTimer--;
      this.glitchIntensity = this.random(0, 10);
    } else {
      if (Math.random() < 0.02) {
        this.glitchTimer = this.random(5, 15);
      } else {
        this.glitchIntensity = 0;
      }
    }
  }

  drawGrid(cx, cy) {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = this.colors.cyan;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = "lighter";

    this.gridOffset = (this.gridOffset + this.speed) % 40;
    const gridSize = 40;

    ctx.beginPath();
    for (let x = -this.width; x <= this.width; x += gridSize * 2) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + x * 4, this.height * 1.5);
    }
    ctx.stroke();

    for (let i = 0; i < 20; i++) {
      const z = 200 + i * 40 - this.gridOffset;
      const yPos = cy + 20000 / z;
      if (yPos > this.height) continue;

      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(this.width, yPos);
      ctx.globalAlpha = Math.min(1, (yPos - cy) / 200) * 0.5;
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const z = 200 + i * 40 - this.gridOffset;
      const yPos = cy - 20000 / z;
      if (yPos < 0) continue;

      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(this.width, yPos);
      ctx.globalAlpha = Math.min(1, (cy - yPos) / 200) * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawStars(cx, cy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = this.colors.white;

    this.stars.forEach((star) => {
      star.z -= this.speed;
      if (star.z <= 0) {
        star.z = 1000;
        star.x = this.random(-this.width, this.width);
        star.y = this.random(-this.height, this.height);
      }

      const k = 500 / star.z;
      const x = star.x * k;
      const y = star.y * k;

      if (x < -cx || x > cx || y < -cy || y > cy) return;

      const size = (1 - star.z / 1000) * 3;

      if (this.speed > 50) {
        const prevK = 500 / (star.z + this.speed * 2);
        const prevX = star.x * prevK;
        const prevY = star.y * prevK;

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.lineWidth = size;
        ctx.strokeStyle = this.colors.cyan;
        ctx.globalAlpha = Math.min(1, (this.speed - 50) / 100);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawALV(cx, cy, scale) {
    const ctx = this.ctx;
    const size = 100 * scale;

    const shakeX = this.glitchIntensity > 0 ? this.random(-2, 2) : 0;
    const shakeY = this.glitchIntensity > 0 ? this.random(-2, 2) : 0;

    const drawPath = (color, offsetX, offsetY, isGlow) => {
      ctx.save();
      ctx.translate(cx + offsetX + shakeX, cy + offsetY + shakeY);
      ctx.strokeStyle = color;

      if (isGlow) {
        ctx.lineWidth = 8 * scale;
        ctx.globalAlpha = 0.3;
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "lighter";
      } else {
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = "miter";
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.6);
      ctx.lineTo(-size * 0.6, size * 0.6);
      ctx.lineTo(0, size * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-size * 0.6, size * 0.2);
      ctx.lineTo(0, -size * 0.8);
      ctx.lineTo(size * 0.6, size * 0.2);
      ctx.moveTo(-size * 0.3, -size * 0.2);
      ctx.lineTo(size * 0.3, -size * 0.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.6);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(size * 0.6, -size * 0.6);
      ctx.stroke();

      if (!isGlow) {
        ctx.fillStyle = this.colors.yellow;
        ctx.beginPath();
        ctx.arc(0, -size * 0.8, 3 * scale, 0, Math.PI * 2);
        ctx.arc(-size * 0.6, size * 0.6, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    if (this.glitchIntensity > 0) {
      ctx.globalCompositeOperation = "screen";
      drawPath(this.colors.pink, -2, -2, false);
      drawPath(this.colors.cyan, 2, 2, false);
      ctx.globalCompositeOperation = "source-over";
    } else {
      drawPath(this.colors.cyan, 0, 0, true);

      drawPath(this.colors.white, 0, 0, false);
    }
  }

  drawText(cx, cy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = 'bold 40px "Orbitron", sans-serif';

    const text = "ALVOLT";
    const textY = cy + 180;
    const offsetX = this.glitchIntensity > 0 ? this.random(-3, 3) : 0;

    if (this.glitchIntensity > 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = this.colors.pink;
      ctx.fillText(text, cx + offsetX + 2, textY + 2);
      ctx.fillStyle = this.colors.cyan;
      ctx.fillText(text, cx + offsetX - 2, textY - 2);
    }

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.colors.white;
    ctx.fillText(text, cx + offsetX, textY);

    ctx.restore();
  }

  drawRing(cx, cy, radius, color, rotationSpeed, segments, width) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    const rotation = this.frame * rotationSpeed;
    ctx.rotate(rotation);

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;

    ctx.globalAlpha = 0.8;
    ctx.lineWidth = width;

    const step = (Math.PI * 2) / segments;
    const gap = 0.2;

    for (let i = 0; i < segments; i++) {
      if (Math.sin(i * 5 + this.frame * 0.01) > 0.8) continue;
      ctx.beginPath();
      ctx.arc(0, 0, radius, i * step, (i + 1) * step - gap);
      ctx.stroke();
    }

    ctx.lineWidth = width * 3;
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < segments; i++) {
      if (Math.sin(i * 5 + this.frame * 0.01) > 0.8) continue;
      ctx.beginPath();
      ctx.arc(0, 0, radius, i * step, (i + 1) * step - gap);
      ctx.stroke();
    }

    ctx.restore();
  }

  animate() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    this.updateGlitch();
    this.drawGrid(cx, cy);
    this.drawStars(cx, cy);
    this.drawRing(cx, cy, 130, this.colors.cyan, 0.005, 3, 2);

    this.drawALV(cx, cy, 1.0);
    this.drawText(cx, cy);

    if (this.currentScene) {
      this.currentScene.render(
        this.ctx,
        this.width,
        this.height,
        this.mousePos
      );
    }

    if (this.overlayScene) {
      this.overlayScene.render(
        this.ctx,
        this.width,
        this.height,
        this.mousePos
      );
    }

    this.ctx.drawImage(this.scanlineCanvas, 0, 0);

    this.frame++;
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}
