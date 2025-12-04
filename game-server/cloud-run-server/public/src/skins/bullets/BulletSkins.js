export const BulletSkins = {
  player: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#00bcd4";
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-5, 3);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  enemy: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "rgba(255, 152, 0, 0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-8, -5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  item_ep: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ccffcc";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = "#00ff00";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EP", 0, 0);
    };
  },
  item_ep_base: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
      gradient.addColorStop(0, "rgba(0, 255, 128, 0.8)");
      gradient.addColorStop(1, "rgba(0, 255, 128, 0)");

      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'Verdana', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EP", 0, 1);
    };
  },

  item_ep_crystal: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 2;

      const size = 12;
      ctx.beginPath();
      ctx.rect(-size, -size, size * 2, size * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 255, 170, 0.4)";
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  item_ep_ring: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
    };
  },

  player_special_1: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = "lighter";
      const color = "#00aaff";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  player_special_2: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      const color = "#ff00ff";
      const time = Date.now();
      const wobble = Math.sin(time * 0.02) * 2;

      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, 12 + wobble, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + wobble, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  player_special_3: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);

      const mainColor = "#ffeb3b";
      const subColor = "#ff5722";
      const time = Date.now();
      const pulse = Math.sin(time * 0.05) * 5;

      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "rgba(255, 87, 34, 0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, 40 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(0, 0, 25 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };
  },

  player_special_4: (currentLength = 3000) => {
    return (ctx, w, h) => {
      const color = "#b300ff";
      const secColor = "#ccff00";

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const jitter = Math.random() * 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(-currentLength, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3 + jitter;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(-currentLength, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 15;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(-currentLength, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      const segments = Math.max(5, Math.floor(currentLength / 50));
      const amplitude = 8;
      const lightningCount = 2;

      for (let i = 0; i < lightningCount; i++) {
        const isSecondary = i % 2 === 0;
        ctx.strokeStyle = isSecondary ? secColor : "#fff";
        ctx.lineWidth = Math.random() * 1.5 + 0.5;

        ctx.beginPath();

        let currX = -currentLength;
        let currY = 0;
        ctx.moveTo(currX, currY);

        const step = currentLength / segments;
        for (let s = 0; s <= segments; s++) {
          currX += step;
          const offset = (Math.random() - 0.5) * amplitude * 2;
          const taper = Math.min(1.0, Math.abs(currX) / 200);
          ctx.lineTo(currX, offset * taper);
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    };
  },
};
