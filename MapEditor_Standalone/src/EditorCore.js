import { skinManager } from "../../../game-server/cloud-run-server/public/src/systems/SkinManager.js";
import { ObstacleSkins } from "../../../game-server/cloud-run-server/public/src/skins/ObstacleSkins.js";

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

  /**
   * プリセットからオブジェクトを追加
   */
  addObjectFromPreset(preset, x, y) {
    const snapX = Math.floor(x / 25) * 25;
    const snapY = Math.floor(y / 25) * 25;

    // ★修正: プリセットのサイズ（見た目のサイズ）を正とする
    let w = preset.width;
    let h = preset.height;

    let calculatedColliders = [];

    if (preset.colliders) {
      // プリセット内のコライダー座標は「中心からの相対座標（オフセット）」としてそのまま扱う
      // （以前のようにバウンディングボックスを再計算して w, h を上書きしない）
      const rawColliders = JSON.parse(JSON.stringify(preset.colliders));

      calculatedColliders = rawColliders.map((c) => ({
        ...c,
        // プリセットの時点で中心相対になっている前提 (例: Hexagon Fortressは -18.5 など)
        // もしプリセットが絶対座標なら調整が必要ですが、現状のpresets.jsonは相対座標です
        offsetX: c.x,
        offsetY: c.y,
      }));
    }

    // 2. オブジェクト生成
    const obj = {
      id: this.nextId++,
      type: preset.type || "obstacle_wall",
      x: snapX,
      y: snapY,
      rotation: 0,
      styleType: preset.id,
      className: preset.className || "",
      domElement: null,

      isComposite: !!preset.colliders,
      colliders: calculatedColliders, 

      w: w,
      h: h,
      borderRadius: preset.borderRadius || 0,

      // ▼▼▼ スケーリング計算用に「元のサイズとコライダー」を保存 ▼▼▼
      originalW: w,
      originalH: h,
      originalColliders: JSON.parse(JSON.stringify(calculatedColliders)),
      // ▲▲▲
    };

    this.objects.push(obj);
    this.createObjectDOM(obj);
    this.selectObject(obj);
  }

  /**
   * 現在のオブジェクトリストから、サーバー用JSONデータを生成する
   * ここで拡大縮小に合わせたコライダーの再計算を行います。
   */
  /**
   * 現在のオブジェクトリストから、サーバー用JSONデータを生成する
   * ★修正点: 拡大縮小に加え、「回転」に合わせてコライダー座標と角度を再計算します。
   */
  getExportData() {
    return this.objects.map((obj) => {
      // 基本データのコピー
      const exportObj = {
        id: obj.styleType,
        type: obj.type,
        x: obj.x,
        y: obj.y,
        width: obj.w,
        height: obj.h,
        rotation: obj.rotation,
        className: obj.className,
        borderRadius: obj.borderRadius,
      };

      // コライダーがある場合、現在のサイズと「回転」に合わせて再計算
      if (
        obj.isComposite &&
        obj.originalColliders &&
        obj.originalW > 0 &&
        obj.originalH > 0
      ) {
        // 1. 拡大率を計算
        const scaleX = obj.w / obj.originalW;
        const scaleY = obj.h / obj.originalH;

        // 2. 回転の準備 (度 -> ラジアン)
        const rad = (obj.rotation || 0) * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        exportObj.colliders = obj.originalColliders.map((c) => {
          // まず拡大縮小を適用（中心相対座標）
          const scaledX = c.offsetX * scaleX;
          const scaledY = c.offsetY * scaleY;

          // 次に回転行列を適用して座標を変換
          // x' = x cosθ - y sinθ
          // y' = x sinθ + y cosθ
          const rotatedX = scaledX * cos - scaledY * sin;
          const rotatedY = scaledX * sin + scaledY * cos;

          return {
            type: "rect",
            x: rotatedX, 
            y: rotatedY,
            w: c.w * scaleX,
            h: c.h * scaleY,
            // ★コライダー自体の角度に、親オブジェクトの回転を加算
            angle: (c.angle || 0) + obj.rotation, 
          };
        });
      }

      return exportObj;
    });
  }

 createObjectDOM(obj) {
    const container = document.createElement("div");
    container.className = `obs-base ${obj.className || ""}`;
    container.style.position = "absolute";
    let rawFunc = ObstacleSkins[obj.className];

    const skinFunc =
      typeof rawFunc === "function" && rawFunc.length === 1
        ? rawFunc(0.0)
        : rawFunc || ObstacleSkins["default"];

    // キャッシュされた元画像を取得
    const cachedSkin = skinManager.getSkin(
      `editor_${obj.className}_${obj.w}_${obj.h}`,
      obj.w,
      obj.h,
      skinFunc
    );

    // ★修正: このオブジェクト専用のCanvasを作成してコピーする
    const objCanvas = document.createElement("canvas");
    objCanvas.width = obj.w;
    objCanvas.height = obj.h;
    const ctx = objCanvas.getContext("2d");
    
    // キャッシュ画像をここに描画（コピー）
    ctx.drawImage(cachedSkin, 0, 0);

    // 専用のCanvasを追加する
    container.appendChild(objCanvas);
    
    this.domLayer.appendChild(container);
    obj.domElement = container;
    this.updateObjectDOM(obj);
  }
  updateObjectDOM(obj) {
    if (!obj.domElement) return;
    const el = obj.domElement;

    const screenPos = this.worldToScreen(obj.x, obj.y);
    const screenW = obj.w * this.camera.zoom;
    const screenH = obj.h * this.camera.zoom;
    
    // DOMは左上基準なので、中心座標からサイズ半分を引く
    const left = screenPos.x - screenW / 2;
    const top = screenPos.y - screenH / 2;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${screenW}px`;
    el.style.height = `${screenH}px`;

    if (obj.isComposite) {
      // 子要素（コライダー可視化用）があれば更新
      Array.from(el.children).forEach((child, index) => {
        if (child.tagName === "CANVAS") return;
        
        const c = obj.colliders[index];
        if(c) {
            child.style.width = `${c.w * this.camera.zoom}px`;
            child.style.height = `${c.h * this.camera.zoom}px`;
            // offsetX/Y は中心からの相対位置なので、width/2 を足して左上基準に直す
            child.style.left = `${(obj.w / 2 + c.offsetX) * this.camera.zoom}px`;
            child.style.top = `${(obj.h / 2 + c.offsetY) * this.camera.zoom}px`;
        }
      });
    }

    el.style.transform = `rotate(${obj.rotation}deg)`;
    el.style.transformOrigin = "50% 50%";
    el.style.outline = "none";
    if (this.selectedObj === obj) {
      el.style.outline = "1px dashed #00ffff";
    }
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

    // ★修正: 中心座標をそのまま使う (以前はここで +sw/2 してズレていました)
    const cx = screenPos.x;
    const cy = screenPos.y;

    ctx.translate(cx, cy);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    const localLeft = -sw / 2;
    const localTop = -sh / 2;
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(localLeft, localTop, sw, sh);
    
    // ハンドル（四隅）
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
    
    // ★修正: 中心座標をそのまま使う
    const cx = screenPos.x;
    const cy = screenPos.y;

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

      // ★修正: 中心座標をそのまま使う
      const cx = screenPos.x;
      const cy = screenPos.y;

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