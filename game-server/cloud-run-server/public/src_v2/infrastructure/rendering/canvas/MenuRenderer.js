export class MenuRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;

    // Animation State
    this.frame = 0;
    this.speed = 2;
    this.isWarping = false;
    this.warpProgress = 0;
    this.warpStartTime = null;

    // Visual State
    this.stars = [];
    this.glitchIntensity = 0;
    this.glitchTimer = 0;
    this.gridOffset = 0;

    // Colors (from logo.html)
    this.colors = {
      bg: '#050505',
      cyan: '#00f3ff',
      pink: '#ff0055',
      purple: '#bc13fe',
      yellow: '#f9f002',
      grid: '#1a1a2e',
      white: '#ffffff'
    };

    // Canvas Buttons
    this.buttons = [];
    this.hoveredButton = null;

    // Callbacks
    this.onJoinGame = null;
    this.onToggleAudio = null;

    // Audio Status Text
    this.audioStatusText = "AUDIO: OFF";

    // Cache Canvas (Scanlines)
    this.scanlineCanvas = document.createElement('canvas');
    this.scanlineCtx = this.scanlineCanvas.getContext('2d');

    this.resize();
    this.initButtons();
  }

  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    
    // Resize Cache Canvas
    this.scanlineCanvas.width = this.width;
    this.scanlineCanvas.height = this.height;
    this.updateScanlineCache();

    this.initStars();
    this.layoutButtons();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: this.random(-this.width, this.width),
        y: this.random(-this.height, this.height),
        z: this.random(1, 1000)
      });
    }
  }

  initButtons() {
    this.buttons = [
      {
        id: 'audio',
        text: () => this.audioStatusText,
        action: () => { if(this.onToggleAudio) this.onToggleAudio(); },
        isPrimary: false
      },
      {
        id: 'join',
        text: () => this.isWarping ? "INITIATING..." : "JOIN GAME",
        action: () => { this.startWarp(); },
        isPrimary: true
      }
    ];
    this.layoutButtons();
  }

  layoutButtons() {
    const btnW = 200;
    const btnH = 50;
    const gap = 20;
    const totalW = btnW * 2 + gap;
    const startX = (this.width - totalW) / 2;
    const y = this.height - 100;

    if (this.buttons[0]) {
        this.buttons[0].x = startX;
        this.buttons[0].y = y;
        this.buttons[0].w = btnW;
        this.buttons[0].h = btnH;
    }
    if (this.buttons[1]) {
        this.buttons[1].x = startX + btnW + gap;
        this.buttons[1].y = y;
        this.buttons[1].w = btnW;
        this.buttons[1].h = btnH;
    }
  }

  updateScanlineCache() {
    const ctx = this.scanlineCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let i = 0; i < this.height; i += 4) {
        ctx.fillRect(0, i, this.width, 2);
    }
  }

  random(min, max) { return Math.random() * (max - min) + min; }

  setCallbacks(onJoin, onAudio) {
    this.onJoinGame = onJoin;
    this.onToggleAudio = onAudio;
  }

  setAudioStatus(text) {
    this.audioStatusText = text;
  }

  start() {
    if (!this.animationId) {
      this.resize();
      this.animate();
      window.addEventListener('resize', () => this.resize());
      
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mousedown', this.handleMouseDown);
      this.canvas.addEventListener('touchstart', this.handleTouchStart, {passive: false});
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      window.removeEventListener('resize', () => this.resize());
      
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    }
    // ★追加: 停止時に画面をクリアする（残像防止）
    if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  handleMouseMove = (e) => {
    if (this.isWarping) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.checkHover(mx, my);
  }

  handleMouseDown = (e) => {
    if (this.isWarping) return;
    if (this.hoveredButton) {
        this.hoveredButton.action();
    }
  }

  handleTouchStart = (e) => {
    if (this.isWarping) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    const clicked = this.buttons.find(b => 
        mx >= b.x && mx <= b.x + b.w &&
        my >= b.y && my <= b.y + b.h
    );
    if (clicked) clicked.action();
  }

  checkHover(mx, my) {
    const prev = this.hoveredButton;
    this.hoveredButton = this.buttons.find(b => 
        mx >= b.x && mx <= b.x + b.w &&
        my >= b.y && my <= b.y + b.h
    );
    
    if (prev !== this.hoveredButton) {
        this.canvas.style.cursor = this.hoveredButton ? 'pointer' : 'default';
    }
  }

  startWarp() {
    if (this.isWarping) return;
    this.isWarping = true;
    this.warpStartTime = null;
    this.canvas.style.cursor = 'default';
  }

  reset() {
    this.isWarping = false;
    this.warpProgress = 0;
    this.speed = 2;
    this.frame = 0;
    this.glitchIntensity = 0;
    if (this.canvas) this.canvas.style.cursor = 'default';
  }

  animate(timestamp) {
    if (!this.ctx) return;

    if (this.isWarping) {
        if (!this.warpStartTime) this.warpStartTime = performance.now();
        const duration = 3000;
        this.warpProgress = (performance.now() - this.warpStartTime) / duration;

        if (this.warpProgress < 1) {
            this.speed = 2 + Math.pow(this.warpProgress * 10, 3);
            this.glitchIntensity = this.warpProgress * 50;
        } else {
            // ワープ完了
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            if (this.onJoinGame) {
                const cb = this.onJoinGame;
                // ★修正: ここで this.onJoinGame = null を削除しました
                // コールバックを保持し続けることで2回目以降も動作させます
                setTimeout(() => cb(), 100);
            }
            // ★追加: アニメーションループをここで終了させる（多重実行防止）
            return; 
        }
    }

    if (this.isWarping) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
        this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    this.updateGlitch();
    this.drawGrid(cx, cy);
    this.drawStars(cx, cy);

    if (!this.isWarping || this.warpProgress < 0.8) {
        this.drawRing(cx, cy, 130, this.colors.cyan, 0.005, 3, 2);
        this.drawRing(cx, cy, 145, this.colors.pink, -0.01, 5, 4);
        this.drawRing(cx, cy, 115, 'rgba(255,255,255,0.3)', 0.02, 12, 1);
        
        this.drawALV(cx, cy, 1.0);
        this.drawText(cx, cy);
        this.drawSystemText();
        this.drawButtons();
    }

    this.ctx.drawImage(this.scanlineCanvas, 0, 0);

    this.frame++;
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  updateGlitch() {
    if (this.isWarping) return;
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

  drawALV(cx, cy, scale) {
    let shakeX = 0;
    let shakeY = 0;
    if (this.isWarping) {
        shakeX = this.random(-5, 5) * this.warpProgress * 2;
        shakeY = this.random(-5, 5) * this.warpProgress * 2;
        scale *= (1 - this.warpProgress * 0.8);
    }

    const size = 100 * scale;
    
    const drawPath = (color, offsetX, offsetY, isGlow = false) => {
        this.ctx.save();
        this.ctx.translate(cx + offsetX + shakeX, cy + offsetY + shakeY);
        this.ctx.strokeStyle = color;
        
        if (isGlow) {
            this.ctx.lineWidth = 12 * scale;
            this.ctx.globalAlpha = 0.4;
            this.ctx.lineJoin = 'round';
        } else {
            this.ctx.lineWidth = 4 * scale;
            this.ctx.globalAlpha = 1.0;
            this.ctx.lineJoin = 'miter';
        }
        
        // L
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.6, -size * 0.6);
        this.ctx.lineTo(-size * 0.6, size * 0.6);
        this.ctx.lineTo(0, size * 0.6);
        this.ctx.stroke();

        // A
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.6, size * 0.2);
        this.ctx.lineTo(0, -size * 0.8);
        this.ctx.lineTo(size * 0.6, size * 0.2);
        this.ctx.moveTo(-size * 0.3, -size * 0.2);
        this.ctx.lineTo(size * 0.3, -size * 0.2);
        this.ctx.stroke();

        // V
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.6, -size * 0.6);
        this.ctx.lineTo(0, size * 0.4);
        this.ctx.lineTo(size * 0.6, -size * 0.6);
        this.ctx.stroke();

        if (!isGlow) {
            this.ctx.fillStyle = this.isWarping ? '#ffffff' : this.colors.yellow;
            this.ctx.beginPath();
            this.ctx.arc(0, -size * 0.8, 3 * scale, 0, Math.PI * 2);
            this.ctx.arc(-size * 0.6, size * 0.6, 3 * scale, 0, Math.PI * 2); 
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    if (this.glitchIntensity > 0 || this.isWarping) {
        this.ctx.globalCompositeOperation = 'screen';
        drawPath(this.colors.pink, this.random(-5, 5), this.random(-5, 5));
        drawPath(this.colors.cyan, this.random(-5, 5), this.random(-5, 5));
        this.ctx.globalCompositeOperation = 'source-over';
    } else {
        drawPath(this.colors.cyan, 0, 0, true);
        this.ctx.globalCompositeOperation = 'lighter'; 
        drawPath(this.colors.white, 0, 0, false);
        this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawText(cx, cy) {
    if (this.warpProgress > 0.5) return; 

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 40px Courier New';
    
    const text = "ALVOLT";
    const textY = cy + 180;
    const offsetX = this.glitchIntensity > 0 ? this.random(-5, 5) : 0;
    
    this.ctx.fillStyle = this.colors.pink;
    
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillText(text, cx + offsetX + 2, textY + 2);
    this.ctx.fillText(text, cx + offsetX - 2, textY - 2);
    
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillText(text, cx + offsetX, textY);
    
    this.ctx.restore();
  }

  drawSystemText() {
    this.ctx.save();
    this.ctx.fillStyle = this.colors.cyan;
    this.ctx.globalAlpha = 0.7;
    this.ctx.font = '14px "Courier New", monospace';
    this.ctx.textAlign = "left";
    
    const speed = (this.speed / 2).toFixed(1); 
    
 
    
    this.ctx.restore();
  }

  drawButtons() {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = 'bold 18px "Courier New", monospace'; 

    this.buttons.forEach(btn => {
        const isHover = (this.hoveredButton === btn);
        let offsetX = 0, offsetY = 0;

        if (isHover && btn.isPrimary) {
            offsetX = this.random(-2, 2);
            offsetY = this.random(-2, 2);
        }

        const x = btn.x + offsetX;
        const y = btn.y + offsetY;

        this.ctx.fillStyle = isHover ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, btn.w, btn.h);

        const borderColor = (isHover && btn.isPrimary) ? this.colors.pink : this.colors.cyan;
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = borderColor;
        this.ctx.strokeRect(x, y, btn.w, btn.h);

        if (isHover) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = 4;
            this.ctx.globalAlpha = 0.5;
            this.ctx.strokeRect(x, y, btn.w, btn.h);
            this.ctx.restore();
        }
        
        this.ctx.fillStyle = borderColor;
        const text = btn.text();
        if (isHover) {
             this.ctx.fillText(text.split('').join(String.fromCharCode(8202)), x + btn.w/2, y + btn.h/2);
        } else {
             this.ctx.fillText(text, x + btn.w/2, y + btn.h/2);
        }
    });
    this.ctx.restore();
  }

  drawStars(cx, cy) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.fillStyle = this.colors.white;

    this.stars.forEach(star => {
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
            
            this.ctx.beginPath();
            this.ctx.moveTo(prevX, prevY);
            this.ctx.lineTo(x, y);
            this.ctx.lineWidth = size;
            this.ctx.strokeStyle = this.colors.cyan; 
            this.ctx.globalAlpha = Math.min(1, (this.speed - 50) / 100);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        } else {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI*2);
            this.ctx.fill();
        }
    });
    this.ctx.restore();
  }

  drawGrid(cx, cy) {
    this.ctx.save();
    this.ctx.strokeStyle = this.isWarping ? this.colors.cyan : this.colors.grid;
    this.ctx.lineWidth = this.isWarping ? 2 : 1;
    if(this.isWarping) this.ctx.globalAlpha = 0.5;
    
    this.gridOffset = (this.gridOffset + this.speed) % 40;
    const gridSize = 40;
    
    for (let x = -this.width; x <= this.width; x += gridSize * 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(cx + x * 4, this.height * 1.5);
        this.ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
        const z = 200 + (i * 40) - this.gridOffset; 
        const yPos = cy + (20000 / z);
        if (yPos > this.height) continue;
        this.ctx.beginPath();
        this.ctx.moveTo(0, yPos);
        this.ctx.lineTo(this.width, yPos);
        this.ctx.globalAlpha = Math.min(1, (yPos - cy) / 200);
        this.ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
        const z = 200 + (i * 40) - this.gridOffset;
        const yPos = cy - (20000 / z);
        if (yPos < 0) continue;
        this.ctx.beginPath();
        this.ctx.moveTo(0, yPos);
        this.ctx.lineTo(this.width, yPos);
        this.ctx.globalAlpha = Math.min(1, (cy - yPos) / 200);
        this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawRing(cx, cy, radius, color, rotationSpeed, segments, width) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    const rotation = this.frame * rotationSpeed * (this.isWarping ? 5 : 1);
    this.ctx.rotate(rotation);
    
    this.ctx.strokeStyle = this.isWarping ? this.colors.white : color;
    this.ctx.lineWidth = width + (this.isWarping ? this.random(0, 2) : 0);

    if (!this.isWarping) {
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.globalAlpha = 0.8;
    }

    const step = (Math.PI * 2) / segments;
    const gap = 0.2; 

    for (let i = 0; i < segments; i++) {
        if (!this.isWarping && Math.sin(i * 5 + this.frame * 0.01) > 0.8) continue;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, i * step, (i + 1) * step - gap);
        this.ctx.stroke();
    }
    this.ctx.restore();
  }
}