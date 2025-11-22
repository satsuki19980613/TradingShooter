
export class EditorCore {
  constructor(canvasId, domLayerId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.domLayer = document.getElementById(domLayerId);

    this.WORLD_SIZE = 3000;

    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.objects = [];
    this.nextId = 1;
    this.selectedObj = null;

    this.input = {
      isDragging: false,
      isPanning: false,
      dragMode: null,
      startX: 0,
      startY: 0,
      initialObjState: null,
    };

    this.init();
  }

  init() {
    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    if (this.canvas.parentElement) {
      resizeObserver.observe(this.canvas.parentElement);
    }

    this.resize();

    this.fitCameraToWorld();
    this.startLoop();
  }

  fitCameraToWorld() {
    if (this.canvas.width === 0 || this.canvas.height === 0) return;

    const margin = 50;
    const availableW = this.canvas.width - margin * 2;
    const availableH = this.canvas.height - margin * 2;

    const zoomX = availableW / this.WORLD_SIZE;
    const zoomY = availableH / this.WORLD_SIZE;

    let newZoom = Math.min(zoomX, zoomY);
    newZoom = Math.max(newZoom, 0.05);

    this.camera.zoom = newZoom;

    const worldCx = this.WORLD_SIZE / 2;
    const worldCy = this.WORLD_SIZE / 2;
    const screenCx = this.canvas.width / 2;
    const screenCy = this.canvas.height / 2;

    this.camera.x = worldCx - screenCx / newZoom;
    this.camera.y = worldCy - screenCy / newZoom;

    this.render();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
    this.render();
  }

  addObjectFromPreset(preset, x, y) {
    const snapX = Math.floor(x / 25) * 25;
    const snapY = Math.floor(y / 25) * 25;

    const obj = {
      id: this.nextId++,
      type: preset.type,
      x: snapX,
      y: snapY,
      w: preset.width,
      h: preset.height,
      rotation: 0,
      borderRadius: preset.borderRadius,
      styleType: preset.id,
      className: preset.className,
      domElement: null,
    };

    this.objects.push(obj);
    this.createObjectDOM(obj);
    this.selectObject(obj);
  }

  createObjectDOM(obj) {
    const el = document.createElement("div");
    el.className = `obs-base ${obj.className}`;
    this.domLayer.appendChild(el);
    obj.domElement = el;
    this.updateObjectDOM(obj);
  }

  updateObjectDOM(obj) {
    if (!obj.domElement) return;
    const el = obj.domElement;
    const screenPos = this.worldToScreen(obj.x, obj.y);
    const screenW = obj.w * this.camera.zoom;
    const screenH = obj.h * this.camera.zoom;

    el.style.left = `${screenPos.x}px`;
    el.style.top = `${screenPos.y}px`;
    el.style.width = `${screenW}px`;
    el.style.height = `${screenH}px`;
    el.style.transform = `rotate(${obj.rotation}deg)`;
    el.style.transformOrigin = "50% 50%";
    el.style.outline = "none";
  }

  deleteSelected() {
    if (!this.selectedObj) return;

    if (this.selectedObj.domElement) {
      this.selectedObj.domElement.remove();
    }

    this.objects = this.objects.filter((o) => o !== this.selectedObj);

    this.selectObject(null);
  }

  selectObject(obj) {
    this.selectedObj = obj;
    const event = new CustomEvent("selectionChanged", { detail: obj });
    window.dispatchEvent(event);
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.camera.zoom + this.camera.x,
      y: sy / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.camera.x) * this.camera.zoom,
      y: (wy - this.camera.y) * this.camera.zoom,
    };
  }

  startLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid(ctx);
    this.objects.forEach((obj) => this.updateObjectDOM(obj));

    if (this.selectedObj) {
      this.drawSelectionUI(ctx, this.selectedObj);
    }
  }

  drawGrid(ctx) {
    ctx.save();

    const worldScreenPos = this.worldToScreen(0, 0);
    const worldScreenSize = this.WORLD_SIZE * this.camera.zoom;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(
      worldScreenPos.x,
      worldScreenPos.y,
      worldScreenSize,
      worldScreenSize
    );

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= this.WORLD_SIZE; x += 100) {
      const sX = this.worldToScreen(x, 0).x;
      ctx.moveTo(sX, worldScreenPos.y);
      ctx.lineTo(sX, worldScreenPos.y + worldScreenSize);
    }
    for (let y = 0; y <= this.WORLD_SIZE; y += 100) {
      const sY = this.worldToScreen(0, y).y;
      ctx.moveTo(worldScreenPos.x, sY);
      ctx.lineTo(worldScreenPos.x + worldScreenSize, sY);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 50, 50, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      worldScreenPos.x,
      worldScreenPos.y,
      worldScreenSize,
      worldScreenSize
    );

    ctx.restore();
  }

  drawSelectionUI(ctx, obj) {
    ctx.save();

    const screenPos = this.worldToScreen(obj.x, obj.y);
    const sw = obj.w * this.camera.zoom;
    const sh = obj.h * this.camera.zoom;

    const cx = screenPos.x + sw / 2;
    const cy = screenPos.y + sh / 2;
    ctx.translate(cx, cy);
    ctx.rotate((obj.rotation * Math.PI) / 180);

    const localLeft = -sw / 2;
    const localTop = -sh / 2;

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(localLeft, localTop, sw, sh);

    ctx.fillStyle = "#00ff00";
    const handleSize = 8;

    const handles = [
      { x: localLeft, y: localTop },
      { x: localLeft + sw, y: localTop },
      { x: localLeft + sw, y: localTop + sh },
      { x: localLeft, y: localTop + sh },
    ];

    handles.forEach((h) => {
      ctx.fillRect(
        h.x - handleSize / 2,
        h.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        h.x - handleSize / 2,
        h.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });

    ctx.restore();
  }

  hitTestHandle(sx, sy, obj) {
    if (!obj) return null;

    const screenPos = this.worldToScreen(obj.x, obj.y);
    const sw = obj.w * this.camera.zoom;
    const sh = obj.h * this.camera.zoom;
    const hitSize = 16;

    const cx = screenPos.x + sw / 2;
    const cy = screenPos.y + sh / 2;
    const rad = -(obj.rotation * Math.PI) / 180;

    const dx = sx - cx;
    const dy = sy - cy;

    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    const halfW = sw / 2;
    const halfH = sh / 2;

    const corners = {
      nw: { x: -halfW, y: -halfH },
      ne: { x: halfW, y: -halfH },
      se: { x: halfW, y: halfH },
      sw: { x: -halfW, y: halfH },
    };

    for (const key in corners) {
      const c = corners[key];
      if (Math.abs(lx - c.x) <= hitSize && Math.abs(ly - c.y) <= hitSize) {
        return key;
      }
    }
    return null;
  }

  hitTestObject(sx, sy) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];

      const screenPos = this.worldToScreen(obj.x, obj.y);
      const sw = obj.w * this.camera.zoom;
      const sh = obj.h * this.camera.zoom;

      const cx = screenPos.x + sw / 2;
      const cy = screenPos.y + sh / 2;
      const rad = -(obj.rotation * Math.PI) / 180;

      const dx = sx - cx;
      const dy = sy - cy;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (lx >= -sw / 2 && lx <= sw / 2 && ly >= -sh / 2 && ly <= sh / 2) {
        return obj;
      }
    }
    return null;
  }
}
