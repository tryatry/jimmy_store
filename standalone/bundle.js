(() => {
  // js/adapter.js
  var g = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
  function createWebWx() {
    const canvas = document.getElementById("game-canvas") || document.createElement("canvas");
    if (!canvas.parentNode) document.body.appendChild(canvas);
    canvas.id = "game-canvas";
    const style = canvas.style;
    style.position = "fixed";
    style.left = "0";
    style.top = "0";
    style.width = "100%";
    style.height = "100%";
    style.display = "block";
    style.touchAction = "none";
    const listeners = { touchstart: [], touchmove: [], touchend: [], touchcancel: [] };
    function toTouchEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const p = { clientX: e.clientX - rect.left, clientY: e.clientY - rect.top, identifier: 0 };
      return { touches: e.type === "touchend" || e.type === "touchcancel" ? [] : [p], changedTouches: [p] };
    }
    function bind(type) {
      if (type === "touchstart") {
        canvas.addEventListener("pointerdown", (e) => {
          canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
          listeners[type].forEach((cb) => cb(toTouchEvent(e)));
        });
      } else if (type === "touchmove") {
        canvas.addEventListener("pointermove", (e) => listeners[type].forEach((cb) => cb(toTouchEvent(e))));
      } else {
        const handler = (e) => listeners[type].forEach((cb) => cb(toTouchEvent(e)));
        canvas.addEventListener("pointerup", handler);
        canvas.addEventListener("pointercancel", handler);
      }
    }
    const store = {
      setItem(k, v) {
        try {
          localStorage.setItem(k, v);
        } catch (err) {
        }
      },
      getItem(k) {
        try {
          return localStorage.getItem(k);
        } catch (err) {
          return null;
        }
      },
      removeItem(k) {
        try {
          localStorage.removeItem(k);
        } catch (err) {
        }
      }
    };
    return {
      createCanvas() {
        return canvas;
      },
      getSystemInfoSync() {
        const rect = canvas.getBoundingClientRect();
        return {
          windowWidth: Math.round(rect.width) || window.innerWidth,
          windowHeight: Math.round(rect.height) || window.innerHeight,
          pixelRatio: window.devicePixelRatio || 1,
          platform: "web"
        };
      },
      onTouchStart(cb) {
        bindOnce("touchstart");
        listeners.touchstart.push(cb);
      },
      onTouchMove(cb) {
        bindOnce("touchmove");
        listeners.touchmove.push(cb);
      },
      onTouchEnd(cb) {
        bindOnce("touchend");
        listeners.touchend.push(cb);
      },
      onTouchCancel(cb) {
        bindOnce("touchcancel");
        listeners.touchcancel.push(cb);
      },
      offTouchStart() {
      },
      offTouchMove() {
      },
      offTouchEnd() {
      },
      offTouchCancel() {
      },
      setStorageSync(k, v) {
        store.setItem(k, JSON.stringify(v));
      },
      getStorageSync(k) {
        const s = store.getItem(k);
        if (s == null) return "";
        try {
          return JSON.parse(s);
        } catch (e) {
          return s;
        }
      },
      removeStorageSync(k) {
        store.removeItem(k);
      },
      onShow(cb) {
        window.addEventListener("focus", cb);
      },
      onHide(cb) {
        window.addEventListener("blur", cb);
      },
      offShow() {
      },
      offHide() {
      },
      triggerGC() {
      },
      showLoading() {
      },
      hideLoading() {
      },
      vibrateShort() {
      },
      shareAppMessage() {
      },
      getLaunchOptionsSync() {
        return { scene: 1001, query: {} };
      }
    };
    function bindOnce(type) {
      if (bindOnce[type]) return;
      bindOnce[type] = true;
      bind(type);
    }
  }
  if (!g.wx) g.wx = createWebWx();
  var wx2 = g.wx;
  var IS_WEB = g.wx.getSystemInfoSync().platform === "web";

  // js/core/tween.js
  var tweens = [];
  var timers = [];
  var Ease = {
    linear: (t) => t,
    quadOut: (t) => 1 - (1 - t) * (1 - t),
    quadIn: (t) => t * t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    backOut: (t) => {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },
    elasticOut: (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1
  };
  function tween(target, opt) {
    const item = {
      target,
      from: {},
      to: opt.to || {},
      dur: Math.max(1, opt.dur || 300),
      delay: opt.delay || 0,
      ease: opt.ease || Ease.quadOut,
      time: 0,
      onUpdate: opt.onUpdate,
      onComplete: opt.onComplete,
      dead: false
    };
    for (const k in item.to) item.from[k] = target[k] || 0;
    tweens.push(item);
    return item;
  }
  function delay(ms, cb) {
    const t = { time: 0, dur: ms, cb, dead: false };
    timers.push(t);
    return t;
  }
  function update(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      if (t.dead) {
        tweens.splice(i, 1);
        continue;
      }
      if (t.delay > 0) {
        t.delay -= dt;
        continue;
      }
      t.time += dt;
      const p = Math.min(1, t.time / t.dur);
      const e = t.ease(p);
      for (const k in t.to) t.target[k] = t.from[k] + (t.to[k] - t.from[k]) * e;
      if (t.onUpdate) t.onUpdate(e, t.target);
      if (p >= 1) {
        if (t.onComplete) t.onComplete(t.target);
        tweens.splice(i, 1);
      }
    }
    for (let i = timers.length - 1; i >= 0; i--) {
      const t = timers[i];
      if (t.dead) {
        timers.splice(i, 1);
        continue;
      }
      t.time += dt;
      if (t.time >= t.dur) {
        timers.splice(i, 1);
        t.cb && t.cb();
      }
    }
  }

  // js/art/paint.js
  var FONT = "sans-serif";
  var Theme = {
    ink: "#0d1220",
    ink2: "#161d31",
    gold: "#e9c887",
    goldLight: "#fff2cf",
    goldDark: "#a97a3c",
    red: "#c8452f",
    cyan: "#59a7b6",
    text: "#f2e7d3",
    textDim: "#a99e8c",
    line: "rgba(233,200,135,0.35)"
  };
  var Elements = {
    metal: { name: "\u91D1", color: "#e8d9a0", color2: "#c19a3f", glow: "rgba(232,217,160,0.5)" },
    wood: { name: "\u6728", color: "#8fdcaa", color2: "#2f8f5b", glow: "rgba(143,220,170,0.5)" },
    water: { name: "\u6C34", color: "#9ad7f5", color2: "#2f6fa0", glow: "rgba(154,215,245,0.5)" },
    fire: { name: "\u706B", color: "#ffb08a", color2: "#e0533c", glow: "rgba(255,176,138,0.5)" },
    earth: { name: "\u571F", color: "#e8cba2", color2: "#a2753f", glow: "rgba(232,203,162,0.5)" }
  };
  var Quality = {
    R: { name: "R", label: "\u5730\u7947", color: "#9fb0c4", color2: "#5d6b7d" },
    SR: { name: "SR", label: "\u661F\u541B", color: "#8fb0f0", color2: "#3f5ba8" },
    SSR: { name: "SSR", label: "\u5929\u795E", color: "#f0c961", color2: "#a97a26" },
    UR: { name: "UR", label: "\u5723\u5C0A", color: "#e08ce0", color2: "#8a3fa0" }
  };
  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
  function fillRoundRect(ctx, x, y, w, h, r, fill) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function strokeRoundRect(ctx, x, y, w, h, r, stroke, lw) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 2;
    ctx.stroke();
  }
  var measureCache = /* @__PURE__ */ new Map();
  function setFont(ctx, size, weight) {
    ctx.font = `${weight || "normal"} ${size}px ${FONT}`;
  }
  function measure(ctx, text, size, weight) {
    const key = `${size}|${weight || ""}|${text}`;
    let v = measureCache.get(key);
    if (v === void 0) {
      setFont(ctx, size, weight);
      v = ctx.measureText(text).width;
      measureCache.set(key, v);
    }
    return v;
  }
  function drawText(ctx, text, x, y, opt) {
    opt = opt || {};
    const size = opt.size || 24;
    const weight = opt.weight || "normal";
    setFont(ctx, size, weight);
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = opt.baseline || "alphabetic";
    if (opt.maxWidth) {
      let t = String(text);
      while (measure(ctx, t, size, weight) > opt.maxWidth && t.length > 1) t = t.slice(0, -1);
      text = t;
    }
    if (opt.shadow) {
      ctx.fillStyle = opt.shadow;
      ctx.fillText(String(text), x + 1, y + 2);
    }
    if (opt.stroke) {
      ctx.lineWidth = opt.stroke;
      ctx.strokeStyle = opt.strokeColor || "rgba(0,0,0,0.65)";
      ctx.lineJoin = "round";
      ctx.strokeText(String(text), x, y);
    }
    ctx.fillStyle = opt.color || Theme.text;
    ctx.fillText(String(text), x, y);
  }
  function drawCloud(ctx, x, y, s, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha === void 0 ? 1 : alpha;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(-24, -14, -12, -10);
    ctx.quadraticCurveTo(-6, -22, 8, -12);
    ctx.quadraticCurveTo(20, -16, 24, -2);
    ctx.quadraticCurveTo(34, 4, 22, 8);
    ctx.quadraticCurveTo(6, 16, -10, 8);
    ctx.quadraticCurveTo(-24, 12, -30, 0);
    ctx.stroke();
    ctx.restore();
  }
  function drawCorner(ctx, x, y, w, h, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "square";
    const corners = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + c[3] * 22 * s);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + c[2] * 22 * s, c[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c[0] + c[2] * 8 * s, c[1] + c[3] * 10 * s);
      ctx.lineTo(c[0] + c[2] * 14 * s, c[1] + c[3] * 10 * s);
      ctx.lineTo(c[0] + c[2] * 14 * s, c[1] + c[3] * 16 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPanel(ctx, x, y, w, h, opt) {
    opt = opt || {};
    const r = opt.radius === void 0 ? 18 : opt.radius;
    const g2 = ctx.createLinearGradient(x, y, x, y + h);
    g2.addColorStop(0, opt.c1 || "rgba(30,38,60,0.96)");
    g2.addColorStop(1, opt.c2 || "rgba(16,21,36,0.96)");
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = g2;
    ctx.fill();
    if (opt.border !== false) {
      ctx.strokeStyle = opt.borderColor || "rgba(233,200,135,0.45)";
      ctx.lineWidth = opt.borderWidth || 2;
      ctx.stroke();
    }
    if (opt.corner !== false) drawCorner(ctx, x + 6, y + 6, w - 12, h - 12, opt.cornerScale || 1, opt.borderColor || "rgba(233,200,135,0.5)");
    return { x, y, w, h };
  }
  function drawBar(ctx, x, y, w, h, p, opt) {
    opt = opt || {};
    const r = h / 2;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = opt.bg || "rgba(0,0,0,0.45)";
    ctx.fill();
    const pw = Math.max(0, Math.min(1, p)) * (w - 4);
    if (pw > 1) {
      const g2 = ctx.createLinearGradient(x, y, x, y + h);
      g2.addColorStop(0, opt.c1 || "#f3d79a");
      g2.addColorStop(1, opt.c2 || "#c8862f");
      roundRectPath(ctx, x + 2, y + 2, pw, h - 4, r);
      ctx.fillStyle = g2;
      ctx.fill();
    }
    if (opt.text) {
      drawText(ctx, opt.text, x + w / 2, y + h / 2 + (opt.size || 16) * 0.36, {
        size: opt.size || 16,
        align: "center",
        color: "#fff",
        weight: "bold",
        stroke: 3,
        strokeColor: "rgba(0,0,0,0.5)"
      });
    }
  }
  function drawStars(ctx, x, y, count, size, color) {
    for (let i = 0; i < count; i++) drawStar(ctx, x + i * (size * 1.15), y, size, color || Theme.gold);
  }
  function drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 5 * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  function glow(ctx, x, y, r, color, alpha) {
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, color);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alpha === void 0 ? 0.5 : alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.restore();
  }

  // js/art/widgets.js
  function drawToast(ctx, text, x, y, type) {
    const size = 26;
    const w = Math.min(680, ctx.measureText ? Math.max(200, String(text).length * size + 90) : 320);
    const h = 62;
    ctx.save();
    ctx.globalAlpha = 0.96;
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    const g2 = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    if (type === "error") {
      g2.addColorStop(0, "#b8392a");
      g2.addColorStop(1, "#7d2318");
    } else if (type === "success") {
      g2.addColorStop(0, "#3a8f5a");
      g2.addColorStop(1, "#225c39");
    } else {
      g2.addColorStop(0, "#3a4362");
      g2.addColorStop(1, "#1d2339");
    }
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.strokeStyle = "rgba(233,200,135,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, text, x, y + size * 0.34, { size, align: "center", color: "#fff4e2", weight: "bold" });
    ctx.restore();
  }
  function drawResourceIcon(ctx, x, y, r, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineJoin = "round";
    switch (type) {
      case "coin": {
        const g2 = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g2.addColorStop(0, "#ffe9a8");
        g2.addColorStop(1, "#c8942f");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#8a6420";
        ctx.stroke();
        ctx.fillStyle = "#8a6420";
        ctx.fillRect(-r * 0.18, -r * 0.42, r * 0.36, r * 0.84);
        ctx.fillRect(-r * 0.42, -r * 0.18, r * 0.84, r * 0.36);
        break;
      }
      case "jade": {
        const g2 = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g2.addColorStop(0, "#b8f2c8");
        g2.addColorStop(1, "#2f8f5b");
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r, -r * 0.4, r * 0.7, r * 0.5);
        ctx.quadraticCurveTo(0, r, -r * 0.7, r * 0.5);
        ctx.quadraticCurveTo(-r, -r * 0.4, 0, -r);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#1f6b42";
        ctx.stroke();
        break;
      }
      case "ticket": {
        ctx.fillStyle = "#f2e2b8";
        roundRectPath(ctx, -r * 0.68, -r, r * 1.36, r * 2, r * 0.2);
        ctx.fill();
        ctx.strokeStyle = "#b08a4a";
        ctx.stroke();
        ctx.strokeStyle = "#c8452f";
        ctx.lineWidth = Math.max(1.5, r * 0.16);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6);
        ctx.lineTo(0, r * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.2);
        ctx.lineTo(r * 0.35, -r * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, r * 0.3);
        ctx.lineTo(r * 0.3, r * 0.3);
        ctx.stroke();
        break;
      }
      case "exp": {
        const g2 = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g2.addColorStop(0, "#ffd0a0");
        g2.addColorStop(1, "#c85a2f");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#8a3a18";
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.25, r * 0.35, Math.PI, Math.PI * 1.6);
        ctx.stroke();
        break;
      }
      case "stamina": {
        const g2 = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        g2.addColorStop(0, "#d8f0ff");
        g2.addColorStop(1, "#3f8fc0");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#20587e";
        ctx.stroke();
        ctx.fillStyle = "#c8452f";
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6);
        ctx.bezierCurveTo(r * 0.5, -r * 0.1, r * 0.35, r * 0.6, 0, r * 0.62);
        ctx.bezierCurveTo(-r * 0.35, r * 0.6, -r * 0.5, -r * 0.1, 0, -r * 0.6);
        ctx.fill();
        break;
      }
      case "soul": {
        const g2 = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        g2.addColorStop(0, "#e8b8ff");
        g2.addColorStop(1, "#7a3fa8");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#4a2070";
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.2, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default: {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = "#888";
        ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawTopBar(ctx, x, y, w, h, resources) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(10,14,24,0.72)";
    ctx.fill();
    ctx.strokeStyle = "rgba(233,200,135,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    const n = resources.length;
    const cellW = w / n;
    for (let i = 0; i < n; i++) {
      const r = resources[i];
      const cx = x + cellW * i + cellW / 2;
      drawResourceIcon(ctx, x + cellW * i + 22, y + h / 2, h * 0.32, r.type);
      drawText(ctx, r.text, x + cellW * i + 44, y + h / 2 + 8, {
        size: 22,
        color: r.color || "#f2e7d3",
        weight: "bold",
        stroke: 2,
        strokeColor: "rgba(0,0,0,0.5)"
      });
    }
    ctx.restore();
  }
  function drawHoverTip(ctx, x, y, text) {
    const w = text.length * 21 + 40;
    const tx = Math.max(10, Math.min(750 - w - 10, x - w / 2));
    roundRectPath(ctx, tx, y, w, 46, 12);
    ctx.fillStyle = "rgba(8,10,18,0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(233,200,135,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, text, tx + w / 2, y + 31, { size: 21, align: "center", color: "#ffe9b8", weight: "bold" });
  }
  function drawTitleBar(ctx, title, sub) {
    const h = 92;
    const g2 = ctx.createLinearGradient(0, 0, 0, h);
    g2.addColorStop(0, "rgba(24,30,50,0.96)");
    g2.addColorStop(1, "rgba(24,30,50,0.55)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, 750, h);
    ctx.strokeStyle = "rgba(233,200,135,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(750, h);
    ctx.stroke();
    drawText(ctx, title, 375, 48, { size: 34, align: "center", color: "#fff2d8", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.55)" });
    if (sub) drawText(ctx, sub, 375, 78, { size: 20, align: "center", color: Theme.textDim });
  }
  function drawBackArrow(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color || "#f2e7d3";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -10);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-14, -4);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fillStyle = color || "#f2e7d3";
    ctx.fill();
    ctx.restore();
  }
  function drawRoleTag(ctx, x, y, role) {
    const map = { \u653B: "#c8452f", \u9632: "#3f7fb0", \u8F85: "#2f8f5b", \u63A7: "#7a5ac0" };
    const color = map[role] || "#666";
    fillRoundRect(ctx, x, y, 34, 34, 8, color);
    strokeRoundRect(ctx, x, y, 34, 34, 8, "rgba(255,255,255,0.5)", 1.5);
    drawText(ctx, role, x + 17, y + 24, { size: 20, align: "center", color: "#fff", weight: "bold" });
  }

  // js/core/engine.js
  var DESIGN_W = 750;
  var DESIGN_H = 1334;
  var Engine = class {
    constructor() {
      this.canvas = wx2.createCanvas();
      this.ctx = this.canvas.getContext("2d");
      this._layout();
      this.scene = null;
      this.nextScene = null;
      this.fade = 0;
      this.lastTime = Date.now();
      this.toasts = [];
      this.running = false;
      this.frames = 0;
      this.pointer = null;
      this.hoverTip = null;
      this._bindTouch();
    }
    /** 计算适配参数（含浏览器窗口尺寸变化时重新计算） */
    _layout() {
      const info = wx2.getSystemInfoSync();
      this.dpr = Math.min(info.pixelRatio || 1, 3);
      this.W = info.windowWidth;
      this.H = info.windowHeight;
      this.canvas.width = Math.floor(this.W * this.dpr);
      this.canvas.height = Math.floor(this.H * this.dpr);
      this.scale = Math.min(this.W / DESIGN_W, this.H / DESIGN_H);
      this.offsetX = (this.W - DESIGN_W * this.scale) / 2;
      this.offsetY = (this.H - DESIGN_H * this.scale) / 2;
    }
    /** 浏览器窗口尺寸变化时调用 */
    resize() {
      this._layout();
    }
    _bindTouch() {
      const handler = (type) => (e) => {
        const list = e.changedTouches && e.changedTouches.length ? e.changedTouches : e.touches;
        if (!list || !list.length) return;
        const p = list[0];
        const x = (p.clientX - this.offsetX) / this.scale;
        const y = (p.clientY - this.offsetY) / this.scale;
        this._dispatch(type, x, y);
      };
      wx2.onTouchStart(handler("start"));
      wx2.onTouchMove(handler("move"));
      wx2.onTouchEnd(handler("end"));
      wx2.onTouchCancel(handler("end"));
    }
    _dispatch(type, x, y) {
      if (!this.scene) return;
      if (type === "move") this.pointer = { x, y };
      if (type === "start") this.scene.onTouchStart(x, y);
      else if (type === "move") this.scene.onTouchMove(x, y);
      else this.scene.onTouchEnd(x, y);
    }
    /** 切换场景（带淡入淡出） */
    setScene(scene, opt) {
      opt = opt || {};
      this.nextScene = scene;
      tween(this, {
        to: { fade: 1 },
        dur: 130,
        ease: Ease.quadOut,
        onComplete: () => {
          if (!this.nextScene) return;
          if (this.scene && this.scene.onExit) this.scene.onExit();
          this.scene = this.nextScene;
          this.nextScene = null;
          if (this.scene.onEnter) this.scene.onEnter();
          tween(this, { to: { fade: 0 }, dur: 200 });
        }
      });
      return scene;
    }
    toast(text, type) {
      const item = { text, type: type || "info", life: 0, dur: 1800, y: 0 };
      this.toasts.push(item);
      tween(item, { to: { y: -14 }, dur: 200, ease: Ease.quadOut });
      if (this.toasts.length > 3) this.toasts.shift();
    }
    start() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        const now = Date.now();
        let dt = now - this.lastTime;
        this.lastTime = now;
        if (dt > 100) dt = 100;
        this.frames++;
        update(dt);
        this.update(dt);
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    update(dt) {
      for (let i = this.toasts.length - 1; i >= 0; i--) {
        const t = this.toasts[i];
        t.life += dt;
        if (t.life > t.dur) {
          if (t.life > t.dur + 260) this.toasts.splice(i, 1);
          else if (!t.fading) {
            t.fading = true;
            tween(t, { to: { y: -40 }, dur: 240 });
          }
        }
      }
      if (this.scene && this.scene.update) this.scene.update(dt);
    }
    render() {
      const ctx = this.ctx;
      this.hoverTip = null;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.save();
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);
      const padX = -this.offsetX / this.scale;
      const padY = -this.offsetY / this.scale;
      const bw = this.W / this.scale;
      const bh = this.H / this.scale;
      ctx.save();
      ctx.translate(padX, padY);
      if (this.scene && this.scene.drawBackground) {
        this.scene.drawBackground(ctx, bw, bh);
      } else {
        const g2 = ctx.createLinearGradient(0, 0, 0, bh);
        g2.addColorStop(0, "#141a2c");
        g2.addColorStop(1, "#0b0e18");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, bw, bh);
      }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, DESIGN_W, DESIGN_H);
      ctx.clip();
      if (this.scene && this.scene.draw) this.scene.draw(ctx);
      let ty = DESIGN_H - 260;
      for (const t of this.toasts) {
        drawToast(ctx, t.text, DESIGN_W / 2, ty + t.y, t.type);
        ty -= 76;
      }
      if (this.hoverTip) drawHoverTip(ctx, this.hoverTip.x, this.hoverTip.y, this.hoverTip.text);
      ctx.restore();
      ctx.restore();
      if (this.fade > 1e-3) {
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.fillStyle = `rgba(6,8,14,${this.fade})`;
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }
    /** 设计坐标 -> 屏幕像素，用于调试 */
    toScreen(x, y) {
      return { x: this.offsetX + x * this.scale, y: this.offsetY + y * this.scale };
    }
  };
  var engine = new Engine();

  // js/core/storage.js
  var PREFIX = "shhj_";
  var memory = {};
  var Storage = {
    set(key, value) {
      memory[key] = value;
      try {
        wx2.setStorageSync(PREFIX + key, value);
      } catch (e) {
      }
    },
    get(key, def) {
      if (memory[key] !== void 0) return memory[key];
      let v;
      try {
        v = wx2.getStorageSync(PREFIX + key);
      } catch (e) {
        v = null;
      }
      if (v === null || v === void 0 || v === "") v = def;
      memory[key] = v;
      return v;
    },
    remove(key) {
      delete memory[key];
      try {
        wx2.removeStorageSync(PREFIX + key);
      } catch (e) {
      }
    },
    clearAll() {
      for (const k in memory) delete memory[k];
      try {
        wx2.removeStorageSync(PREFIX + "save");
      } catch (e) {
      }
    }
  };

  // js/data/heroes.js
  var QUALITY_BASE = {
    R: { hp: 720, atk: 84, def: 44, spd: 92 },
    SR: { hp: 1040, atk: 114, def: 58, spd: 100 },
    SSR: { hp: 1440, atk: 150, def: 74, spd: 110 },
    UR: { hp: 1900, atk: 198, def: 94, spd: 122 }
  };
  var ROLE_MOD = {
    \u653B: { hp: 0.9, atk: 1.16, def: 0.88, spd: 1.05 },
    \u9632: { hp: 1.28, atk: 0.84, def: 1.32, spd: 0.9 },
    \u8F85: { hp: 1, atk: 0.94, def: 1.02, spd: 1.08 },
    \u63A7: { hp: 1.06, atk: 0.96, def: 1.04, spd: 1.12 }
  };
  function baseStats(hero) {
    const q = QUALITY_BASE[hero.quality] || QUALITY_BASE.R;
    const m = ROLE_MOD[hero.role] || ROLE_MOD.\u653B;
    const t = hero.tweak || {};
    return {
      hp: Math.round(q.hp * m.hp * (t.hp || 1)),
      atk: Math.round(q.atk * m.atk * (t.atk || 1)),
      def: Math.round(q.def * m.def * (t.def || 1)),
      spd: Math.round(q.spd * m.spd * (t.spd || 1))
    };
  }
  var LIST = [
    {
      id: "nezha",
      name: "\u54EA\u5412",
      title: "\u4E09\u575B\u6D77\u4F1A\u5927\u795E",
      element: "fire",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#d0392e", "#7c1a14"], trim: "#f0c060", hair: "#181114", style: "nezha", vest: true, weapon: "spear", ribbon: "rgba(255,64,40,0.8)", ribbonW: 0.05 },
      skill: { name: "\u4E09\u6627\u771F\u706B", target: "all", power: 1.28, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210128%\u653B\u51FB\u4F24\u5BB3\uFF0C60%\u51E0\u7387\u9644\u52A0\u707C\u70E72\u56DE\u5408", effect: { burn: { chance: 0.6, power: 0.35, turns: 2 } } },
      passive: { name: "\u83B2\u82B1\u5316\u8EAB", desc: "\u6B7B\u4EA1\u540E\u4EE530%\u6C14\u8840\u590D\u6D3B\u4E00\u6B21\uFF08\u6BCF\u573A\u9650\u4E00\u6B21\uFF09", special: "revive", mods: {} }
    },
    {
      id: "wukong",
      name: "\u5B59\u609F\u7A7A",
      title: "\u9F50\u5929\u5927\u5723",
      element: "metal",
      quality: "UR",
      role: "\u653B",
      art: { robe: ["#ffd98a", "#c8862f"], trim: "#fff2cf", hair: "#5a3a22", style: "wild", wear: "jingu", weapon: "staff", ribbon: "rgba(255,220,150,0.7)" },
      skill: { name: "\u5927\u95F9\u5929\u5BAB", target: "all", power: 1.35, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210135%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u63D0\u5347\u81EA\u8EAB20%\u653B\u51FB2\u56DE\u5408", effect: { selfAtkUp: { value: 0.2, turns: 2 } } },
      passive: { name: "\u706B\u773C\u91D1\u775B", desc: "\u66B4\u51FB\u7387+15%\uFF0C\u5BF9\u707C\u70E7\u76EE\u6807\u4F24\u5BB3+25%", mods: { crit: 0.15 }, special: "burnBonus" }
    },
    {
      id: "yangjian",
      name: "\u6768\u622C",
      title: "\u662D\u60E0\u7075\u663E\u738B",
      element: "metal",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#cdd8ea", "#3f5b8f"], trim: "#e9c887", hair: "#22242c", style: "long", wear: "crown", weapon: "blade3" },
      skill: { name: "\u516B\u4E5D\u7384\u529F", target: "front3", power: 1.5, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210150%\u653B\u51FB\u4F24\u5BB3\uFF0C30%\u51E0\u7387\u7729\u66551\u56DE\u5408", effect: { stun: { chance: 0.3, turns: 1 } } },
      passive: { name: "\u5929\u773C\u901A", desc: "\u547D\u4E2D\u76EE\u6807\u540E\u81EA\u8EAB\u6012\u6C14\u989D\u5916+15", mods: {}, special: "rageGain" }
    },
    {
      id: "jiangziya",
      name: "\u59DC\u5B50\u7259",
      title: "\u5C01\u795E\u4E4B\u4E3B",
      element: "earth",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#e8dcc0", "#8a7a55"], trim: "#e9c887", hair: "#cfcfcf", style: "daoist", weapon: "whip" },
      skill: { name: "\u5C01\u795E\u699C", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u6062\u590D18%\u6700\u5927\u6C14\u8840\uFF0C\u5E76\u63D0\u534715%\u9632\u5FA12\u56DE\u5408", effect: { heal: { power: 0.18 }, allyDefUp: { value: 0.15, turns: 2 } } },
      passive: { name: "\u592A\u516C\u5728\u6B64", desc: "\u6218\u6597\u5F00\u59CB\u65F6\u5DF1\u65B9\u5168\u4F53\u83B7\u5F97\u521D\u59CB\u6012\u6C1420", mods: {}, special: "teamRage" }
    },
    {
      id: "nvwa",
      name: "\u5973\u5A32",
      title: "\u8865\u5929\u5723\u6BCD",
      element: "earth",
      quality: "UR",
      role: "\u8F85",
      art: { robe: ["#f2c8d8", "#a05a80"], trim: "#ffe9a8", hair: "#3a2a2a", style: "high", wear: "halo", weapon: "stone", ribbon: "rgba(255,220,235,0.7)" },
      skill: { name: "\u4E94\u8272\u8865\u5929", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u6062\u590D26%\u6700\u5927\u6C14\u8840\u5E76\u9644\u52A012%\u62A4\u76FE", effect: { heal: { power: 0.26 }, shield: { power: 0.12 } } },
      passive: { name: "\u9020\u5316\u4F17\u751F", desc: "\u5DF1\u65B9\u5168\u4F53\u53D7\u5230\u7684\u4F24\u5BB3\u964D\u4F4E8%", mods: {}, special: "teamReduce" }
    },
    {
      id: "fuxi",
      name: "\u4F0F\u7FB2",
      title: "\u4EBA\u6587\u521D\u7956",
      element: "wood",
      quality: "UR",
      role: "\u8F85",
      art: { robe: ["#b8e8c8", "#2f7a52"], trim: "#e9c887", hair: "#2b2b33", style: "bun", wear: "crown", weapon: "qin" },
      skill: { name: "\u5148\u5929\u516B\u5366", target: "enemyAll", power: 0.95, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u621095%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u964D\u4F4E\u517620%\u653B\u51FB2\u56DE\u5408", effect: { enemyAtkDown: { value: 0.2, turns: 2 } } },
      passive: { name: "\u4E00\u753B\u5F00\u5929", desc: "\u5DF1\u65B9\u5168\u4F53\u653B\u51FB+10%", mods: {}, special: "teamAtk" }
    },
    {
      id: "shennong",
      name: "\u795E\u519C",
      title: "\u708E\u5E1D",
      element: "wood",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#d8f0b8", "#4f7a3a"], trim: "#e9c887", hair: "#3a3020", style: "daoist", weapon: "gourd" },
      skill: { name: "\u767E\u8349\u56DE\u6625", target: "allyLow", power: 0, desc: "\u4E3A\u6C14\u8840\u6700\u4F4E\u76843\u540D\u961F\u53CB\u6062\u590D30%\u6700\u5927\u6C14\u8840", effect: { heal: { power: 0.3 }, targetLow: 3 } },
      passive: { name: "\u5C1D\u767E\u8349", desc: "\u6BCF\u56DE\u5408\u7ED3\u675F\u4E3A\u5DF1\u65B9\u5168\u4F53\u6062\u590D4%\u6700\u5927\u6C14\u8840", mods: {}, special: "regen" }
    },
    {
      id: "huangdi",
      name: "\u9EC4\u5E1D",
      title: "\u8F69\u8F95\u6C0F",
      element: "earth",
      quality: "UR",
      role: "\u9632",
      art: { robe: ["#f0e0a8", "#a08030"], trim: "#fff2cf", hair: "#2b2b33", style: "long", wear: "crown", weapon: "sword", ribbon: "rgba(255,235,180,0.6)" },
      skill: { name: "\u8F69\u8F95\u5251\u6C14", target: "front3", power: 1.32, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210132%\u653B\u51FB\u4F24\u5BB3\uFF0C\u81EA\u8EAB\u83B7\u5F9720%\u62A4\u76FE", effect: { selfShield: { power: 0.2 } } },
      passive: { name: "\u571F\u5FB7\u9547\u4E16", desc: "\u53D7\u5230\u4F24\u5BB3\u65F630%\u51E0\u7387\u53CD\u5F3930%\u4F24\u5BB3", mods: {}, special: "counter" }
    },
    {
      id: "chiyou",
      name: "\u86A9\u5C24",
      title: "\u5175\u4E3B\u6218\u795E",
      element: "metal",
      quality: "UR",
      role: "\u653B",
      art: { robe: ["#e88a6a", "#7a2a1a"], trim: "#c8a04a", hair: "#2b2b33", style: "horns", weapon: "axe" },
      skill: { name: "\u4E5D\u9ECE\u94C1\u8840", target: "enemyLow", power: 2.1, desc: "\u5BF9\u6C14\u8840\u6700\u5C11\u7684\u654C\u4EBA\u9020\u6210210%\u653B\u51FB\u4F24\u5BB3\uFF0C\u82E5\u51FB\u6740\u5219\u518D\u884C\u52A8\u4E00\u6B21", effect: { killAgain: true } },
      passive: { name: "\u94DC\u5934\u94C1\u81C2", desc: "\u81EA\u8EAB\u6C14\u8840\u8D8A\u4F4E\uFF0C\u653B\u51FB\u8D8A\u9AD8\uFF08\u6700\u591A+30%\uFF09", mods: {}, special: "rage" }
    },
    {
      id: "houyi",
      name: "\u540E\u7FBF",
      title: "\u5C04\u65E5\u795E\u7BAD",
      element: "fire",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#ffc8a0", "#b05a2a"], trim: "#e9c887", hair: "#2b2b33", style: "bun", wear: "headband", weapon: "bow" },
      skill: { name: "\u4E5D\u65E5\u540C\u8F89", target: "enemyAll", power: 1.1, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210110%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5BF9\u540E\u6392\u76EE\u6807\u4F24\u5BB3+40%", effect: { backBonus: 0.4 } },
      passive: { name: "\u767E\u6B65\u7A7F\u6768", desc: "\u66B4\u51FB\u7387+12%\uFF0C\u66B4\u51FB\u4F24\u5BB3+30%", mods: { crit: 0.12, critDmg: 0.3 } }
    },
    {
      id: "change",
      name: "\u5AE6\u5A25",
      title: "\u5E7F\u5BD2\u4ED9\u5B50",
      element: "water",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#d8e8ff", "#4f6fa0"], trim: "#e9c887", hair: "#2b2b33", style: "high", wear: "halo", weapon: "orb", ribbon: "rgba(220,235,255,0.7)" },
      skill: { name: "\u6708\u534E\u6E05\u8F89", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u6062\u590D16%\u6C14\u8840\uFF0C\u5E76\u51C0\u5316\u6240\u6709\u707C\u70E7\u6548\u679C", effect: { heal: { power: 0.16 }, cleanse: true } },
      passive: { name: "\u5E7F\u5BD2\u5E87\u4F51", desc: "\u5DF1\u65B9\u5168\u4F53\u901F\u5EA6+10%", mods: {}, special: "teamSpd" }
    },
    {
      id: "kuafu",
      name: "\u5938\u7236",
      title: "\u9010\u65E5\u5DE8\u4EBA",
      element: "earth",
      quality: "SR",
      role: "\u9632",
      art: { robe: ["#e0c8a0", "#7a5a30"], trim: "#c8a04a", hair: "#3a2a20", style: "wild", weapon: "axe" },
      skill: { name: "\u9010\u65E5\u4E4B\u529B", target: "front", power: 1.75, desc: "\u5BF9\u654C\u65B9\u524D\u6392\u9020\u6210175%\u653B\u51FB\u4F24\u5BB3\uFF0C\u81EA\u8EAB\u9632\u5FA1+20%2\u56DE\u5408", effect: { selfDefUp: { value: 0.2, turns: 2 } } },
      passive: { name: "\u996E\u6CB3\u541E\u6C5F", desc: "\u6C14\u8840+15%", mods: { hp: 0.15 } }
    },
    {
      id: "pangu",
      name: "\u76D8\u53E4",
      title: "\u5F00\u5929\u4E4B\u795E",
      element: "earth",
      quality: "UR",
      role: "\u9632",
      art: { robe: ["#d8d0c0", "#5a5040"], trim: "#ffe9a8", hair: "#4a4a55", style: "long", wear: "halo", weapon: "axe", ribbon: "rgba(240,235,215,0.6)" },
      skill: { name: "\u5F00\u5929\u8F9F\u5730", target: "enemyAll", power: 1.15, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210115%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u7729\u6655\u4E3B\u76EE\u68071\u56DE\u5408", effect: { stun: { chance: 0.5, turns: 1 } } },
      passive: { name: "\u9876\u5929\u7ACB\u5730", desc: "\u6C14\u8840+20%\uFF0C\u9632\u5FA1+15%", mods: { hp: 0.2, def: 0.15 } }
    },
    {
      id: "zhulong",
      name: "\u70DB\u9F99",
      title: "\u949F\u5C71\u4E4B\u795E",
      element: "fire",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#ff9a5a", "#8a2a1a"], trim: "#ffd98a", hair: "#2b2b33", style: "horns", weapon: "orb" },
      skill: { name: "\u663C\u591C\u4EA4\u66FF", target: "enemyAll", power: 1.2, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210120%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u9644\u52A0\u707C\u70E72\u56DE\u5408", effect: { burn: { chance: 0.8, power: 0.3, turns: 2 } } },
      passive: { name: "\u70DB\u7167\u4E5D\u9634", desc: "\u653B\u51FB\u707C\u70E7\u76EE\u6807\u65F6\u4F24\u5BB3+30%", mods: {}, special: "burnBonus" }
    },
    {
      id: "baize",
      name: "\u767D\u6CFD",
      title: "\u745E\u517D\u77E5\u8005",
      element: "water",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#e8f4ff", "#5a7a9a"], trim: "#e9c887", hair: "#d8d8e0", style: "bun", weapon: "scroll" },
      skill: { name: "\u4E07\u7269\u56FE\u9274", target: "allyAll", power: 0, desc: "\u5DF1\u65B9\u5168\u4F53\u653B\u51FB+18%\u4E14\u514D\u75AB\u7729\u66552\u56DE\u5408", effect: { allyAtkUp: { value: 0.18, turns: 2 }, immune: { turns: 2 } } },
      passive: { name: "\u77E5\u5929\u4E0B\u4E8B", desc: "\u5DF1\u65B9\u5168\u4F53\u66B4\u51FB\u7387+8%", mods: {}, special: "teamCrit" }
    },
    {
      id: "qinglong",
      name: "\u9752\u9F99",
      title: "\u4E1C\u65B9\u4E4B\u795E",
      element: "wood",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#8fe0b0", "#1f7a52"], trim: "#e9c887", hair: "#1f3a2a", style: "horns", weapon: "sword", ribbon: "rgba(160,240,190,0.6)" },
      skill: { name: "\u82CD\u9F99\u51FA\u6C34", target: "front3", power: 1.42, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210142%\u653B\u51FB\u4F24\u5BB3", effect: {} },
      passive: { name: "\u9752\u6728\u957F\u751F", desc: "\u6BCF\u56DE\u5408\u6062\u590D6%\u6700\u5927\u6C14\u8840", mods: {}, special: "selfRegen" }
    },
    {
      id: "baihu",
      name: "\u767D\u864E",
      title: "\u897F\u65B9\u4E4B\u795E",
      element: "metal",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#f4f4f8", "#8a8a9a"], trim: "#c8a04a", hair: "#e8e8f0", style: "wild", weapon: "blade3", mood: "angry" },
      skill: { name: "\u767D\u864E\u8854\u5203", target: "enemyLow", power: 2, desc: "\u5BF9\u6C14\u8840\u6700\u5C11\u7684\u654C\u4EBA\u9020\u6210200%\u653B\u51FB\u4F24\u5BB3", effect: {} },
      passive: { name: "\u6740\u4F10\u4E4B\u5A01", desc: "\u66B4\u51FB\u7387+18%", mods: { crit: 0.18 } }
    },
    {
      id: "zhuque",
      name: "\u6731\u96C0",
      title: "\u5357\u65B9\u4E4B\u795E",
      element: "fire",
      quality: "SSR",
      role: "\u653B",
      art: { robe: ["#ffb0a0", "#c03a3a"], trim: "#ffe9a8", hair: "#5a2a2a", style: "high", wear: "feather", weapon: "fan", ribbon: "rgba(255,190,160,0.7)" },
      skill: { name: "\u6D85\u69C3\u711A\u5929", target: "enemyAll", power: 1.12, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210112%\u653B\u51FB\u4F24\u5BB3\uFF0C\u81EA\u8EAB\u83B7\u5F9715%\u62A4\u76FE", effect: { selfShield: { power: 0.15 } } },
      passive: { name: "\u6D74\u706B\u91CD\u751F", desc: "\u6B7B\u4EA1\u540E\u4EE525%\u6C14\u8840\u590D\u6D3B\u4E00\u6B21", mods: {}, special: "revive" }
    },
    {
      id: "xuanwu",
      name: "\u7384\u6B66",
      title: "\u5317\u65B9\u4E4B\u795E",
      element: "water",
      quality: "SSR",
      role: "\u9632",
      art: { robe: ["#a8c8d8", "#2f5a7a"], trim: "#e9c887", hair: "#2b3340", style: "long", wear: "helmet", weapon: "shieldAxe" },
      skill: { name: "\u7384\u51A5\u62A4\u4F53", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u9644\u52A022%\u62A4\u76FE2\u56DE\u5408", effect: { shieldAll: { power: 0.22, turns: 2 } } },
      passive: { name: "\u9F9F\u86C7\u540C\u4F53", desc: "\u9632\u5FA1+25%\uFF0C\u53D7\u5230\u66B4\u51FB\u4F24\u5BB3-30%", mods: { def: 0.25 } }
    },
    {
      id: "taibai",
      name: "\u592A\u767D\u91D1\u661F",
      title: "\u957F\u5E9A\u661F\u541B",
      element: "metal",
      quality: "SR",
      role: "\u8F85",
      art: { robe: ["#f0f0e0", "#9a9a80"], trim: "#e9c887", hair: "#d8d8d0", style: "daoist", weapon: "brush" },
      skill: { name: "\u592A\u767D\u4F20\u65E8", target: "allyAtk", power: 0, desc: "\u5DF1\u65B9\u653B\u51FB\u6700\u9AD8\u7684\u795E\u5C06\u653B\u51FB+30%\u4E14\u7ACB\u523B\u83B7\u5F9740\u6012\u6C14", effect: { allyAtkUp: { value: 0.3, turns: 2 }, rage: 40 } },
      passive: { name: "\u7965\u745E\u4E4B\u661F", desc: "\u5DF1\u65B9\u5168\u4F53\u6012\u6C14\u83B7\u53D6+10%", mods: {}, special: "rageGainTeam" }
    },
    {
      id: "litianwang",
      name: "\u674E\u5929\u738B",
      title: "\u6258\u5854\u5929\u738B",
      element: "earth",
      quality: "SR",
      role: "\u9632",
      art: { robe: ["#e8d0a0", "#8a6a30"], trim: "#e9c887", hair: "#3a3a44", style: "long", wear: "helmet", weapon: "tower" },
      skill: { name: "\u73B2\u73D1\u9547\u5996", target: "enemyAll", power: 0.88, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u621088%\u653B\u51FB\u4F24\u5BB3\uFF0C40%\u51E0\u7387\u7729\u66551\u56DE\u5408", effect: { stun: { chance: 0.4, turns: 1 } } },
      passive: { name: "\u5929\u738B\u62A4\u6301", desc: "\u5DF1\u65B9\u524D\u6392\u53D7\u5230\u4F24\u5BB3-12%", mods: {}, special: "frontGuard" }
    },
    {
      id: "niumowang",
      name: "\u725B\u9B54\u738B",
      title: "\u5E73\u5929\u5927\u5723",
      element: "earth",
      quality: "SR",
      role: "\u9632",
      art: { robe: ["#c8a080", "#5a3a20"], trim: "#c8a04a", hair: "#2b2b33", style: "horns", weapon: "axe", mood: "angry" },
      skill: { name: "\u61BE\u5730\u8E0F\u5929", target: "front3", power: 1.25, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210125%\u653B\u51FB\u4F24\u5BB3", effect: {} },
      passive: { name: "\u529B\u5927\u65E0\u7A77", desc: "\u6C14\u8840+18%\uFF0C\u9632\u5FA1+10%", mods: { hp: 0.18, def: 0.1 } }
    },
    {
      id: "honghaier",
      name: "\u7EA2\u5B69\u513F",
      title: "\u5723\u5A74\u5927\u738B",
      element: "fire",
      quality: "SR",
      role: "\u653B",
      art: { robe: ["#ff8a6a", "#a02a1a"], trim: "#ffe9a8", hair: "#2b2b33", style: "double", weapon: "spear" },
      skill: { name: "\u4E09\u6627\u771F\u706B", target: "front3", power: 1.3, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210130%\u653B\u51FB\u4F24\u5BB3\uFF0C\u9644\u52A0\u707C\u70E72\u56DE\u5408", effect: { burn: { chance: 0.7, power: 0.28, turns: 2 } } },
      passive: { name: "\u5723\u5A74\u4E4B\u6012", desc: "\u5BF9\u707C\u70E7\u76EE\u6807\u4F24\u5BB3+20%", mods: {}, special: "burnBonus" }
    },
    {
      id: "aoguang",
      name: "\u6556\u5E7F",
      title: "\u4E1C\u6D77\u9F99\u738B",
      element: "water",
      quality: "SR",
      role: "\u8F85",
      art: { robe: ["#a8d8f0", "#2f5a8a"], trim: "#e9c887", hair: "#2b3340", style: "long", wear: "crown", weapon: "water" },
      skill: { name: "\u56DB\u6D77\u7FFB\u817E", target: "enemyAll", power: 0.92, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u621092%\u653B\u51FB\u4F24\u5BB3\uFF0C\u964D\u4F4E\u517615%\u901F\u5EA62\u56DE\u5408", effect: { enemySpdDown: { value: 0.15, turns: 2 } } },
      passive: { name: "\u884C\u4E91\u5E03\u96E8", desc: "\u5DF1\u65B9\u5168\u4F53\u6BCF\u56DE\u5408\u6062\u590D3%\u6C14\u8840", mods: {}, special: "regen" }
    },
    {
      id: "leizhenzi",
      name: "\u96F7\u9707\u5B50",
      title: "\u96F7\u90E8\u5929\u541B",
      element: "metal",
      quality: "SR",
      role: "\u653B",
      art: { robe: ["#d8d8f0", "#4a4a8a"], trim: "#ffe9a8", hair: "#3a3a55", style: "wild", wear: "feather", weapon: "hammer" },
      skill: { name: "\u96F7\u9706\u4E07\u94A7", target: "enemyAll", power: 1, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210100%\u653B\u51FB\u4F24\u5BB3\uFF0C30%\u51E0\u7387\u7729\u66551\u56DE\u5408", effect: { stun: { chance: 0.3, turns: 1 } } },
      passive: { name: "\u98CE\u96F7\u53CC\u7FFC", desc: "\u901F\u5EA6+20%", mods: { spd: 0.2 } }
    },
    {
      id: "xuannv",
      name: "\u4E5D\u5929\u7384\u5973",
      title: "\u6218\u795E\u4E4B\u5E08",
      element: "water",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#d0e0ff", "#4f5aa0"], trim: "#e9c887", hair: "#2b2b33", style: "high", weapon: "scroll", ribbon: "rgba(210,225,255,0.7)" },
      skill: { name: "\u5929\u4E66\u6388\u7B56", target: "allyAll", power: 0, desc: "\u5DF1\u65B9\u5168\u4F53\u653B\u51FB+20%\u3001\u66B4\u51FB+10%\uFF0C\u6301\u7EED2\u56DE\u5408", effect: { allyAtkUp: { value: 0.2, turns: 2 }, allyCritUp: { value: 0.1, turns: 2 } } },
      passive: { name: "\u7384\u673A\u5999\u7B97", desc: "\u5DF1\u65B9\u5168\u4F53\u6280\u80FD\u4F24\u5BB3+12%", mods: {}, special: "teamSkillUp" }
    },
    {
      id: "xiwangmu",
      name: "\u897F\u738B\u6BCD",
      title: "\u7476\u6C60\u91D1\u6BCD",
      element: "earth",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#f8e0c0", "#a06a30"], trim: "#ffe9a8", hair: "#3a2a2a", style: "high", wear: "crown", weapon: "peach" },
      skill: { name: "\u87E0\u6843\u732E\u5BFF", target: "allyLow", power: 0, desc: "\u4E3A\u6C14\u8840\u6700\u4F4E\u7684\u961F\u53CB\u6062\u590D45%\u6700\u5927\u6C14\u8840\u5E76\u6E05\u9664\u8D1F\u9762", effect: { heal: { power: 0.45 }, targetLow: 1, cleanse: true } },
      passive: { name: "\u957F\u751F\u4E0D\u8001", desc: "\u5DF1\u65B9\u5168\u4F53\u6C14\u8840+8%", mods: {}, special: "teamHp" }
    },
    {
      id: "laojun",
      name: "\u592A\u4E0A\u8001\u541B",
      title: "\u9053\u5FB7\u5929\u5C0A",
      element: "fire",
      quality: "UR",
      role: "\u8F85",
      art: { robe: ["#f0d8a8", "#8a6a20"], trim: "#fff2cf", hair: "#e8e8e8", style: "daoist", wear: "halo", weapon: "censer", ribbon: "rgba(255,235,190,0.65)" },
      skill: { name: "\u4E39\u706B\u70BC\u5929", target: "enemyAll", power: 1.25, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210125%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u9644\u52A0\u707C\u70E73\u56DE\u5408", effect: { burn: { chance: 1, power: 0.3, turns: 3 } } },
      passive: { name: "\u9053\u6CD5\u81EA\u7136", desc: "\u5DF1\u65B9\u5168\u4F53\u6280\u80FD\u4F24\u5BB3+15%\uFF0C\u81EA\u8EAB\u6012\u6C14\u56DE\u590D\u66F4\u5FEB", mods: {}, special: "teamSkillUp" }
    },
    {
      id: "jingwei",
      name: "\u7CBE\u536B",
      title: "\u586B\u6D77\u4E4B\u9E1F",
      element: "water",
      quality: "R",
      role: "\u653B",
      art: { robe: ["#c8e8f0", "#4a7a8a"], trim: "#e9c887", hair: "#3a3a44", style: "double", weapon: "orb" },
      skill: { name: "\u8854\u77F3\u586B\u6D77", target: "front", power: 1.7, desc: "\u5BF9\u654C\u65B9\u524D\u6392\u9020\u6210170%\u653B\u51FB\u4F24\u5BB3", effect: {} },
      passive: { name: "\u77E2\u5FD7\u4E0D\u6E1D", desc: "\u653B\u51FB+10%", mods: { atk: 0.1 } }
    },
    {
      id: "xingtian",
      name: "\u5211\u5929",
      title: "\u4E0D\u5C48\u6218\u795E",
      element: "metal",
      quality: "SR",
      role: "\u653B",
      art: { robe: ["#e0a080", "#7a3a20"], trim: "#c8a04a", hair: "#2b2b33", style: "wild", weapon: "shieldAxe", mood: "angry" },
      skill: { name: "\u5E72\u621A\u821E", target: "front3", power: 1.35, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210135%\u653B\u51FB\u4F24\u5BB3", effect: {} },
      passive: { name: "\u731B\u5FD7\u5E38\u5728", desc: "\u6C14\u8840\u4F4E\u4E8E40%\u65F6\u653B\u51FB+35%", mods: {}, special: "rage" }
    },
    {
      id: "gonggong",
      name: "\u5171\u5DE5",
      title: "\u6C34\u795E",
      element: "water",
      quality: "SR",
      role: "\u653B",
      art: { robe: ["#a0d0f0", "#2f5a8a"], trim: "#e9c887", hair: "#2b3340", style: "horns", weapon: "water" },
      skill: { name: "\u6012\u89E6\u4E0D\u5468", target: "enemyAll", power: 0.95, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u621095%\u653B\u51FB\u4F24\u5BB3\uFF0C\u964D\u4F4E\u5176\u9632\u5FA120%2\u56DE\u5408", effect: { enemyDefDown: { value: 0.2, turns: 2 } } },
      passive: { name: "\u6C34\u52BF\u6ED4\u5929", desc: "\u5BF9\u707C\u70E7\u76EE\u6807\u4F24\u5BB3+25%", mods: {}, special: "burnBonus" }
    },
    {
      id: "zhurong",
      name: "\u795D\u878D",
      title: "\u706B\u795E",
      element: "fire",
      quality: "SR",
      role: "\u653B",
      art: { robe: ["#ffa070", "#a03020"], trim: "#ffe9a8", hair: "#3a2a20", style: "wild", weapon: "whip", mood: "angry" },
      skill: { name: "\u70C8\u7130\u97AD\u631E", target: "front3", power: 1.28, desc: "\u5BF9\u654C\u65B9\u524D\u63923\u4EBA\u9020\u6210128%\u653B\u51FB\u4F24\u5BB3\uFF0C\u9644\u52A0\u707C\u70E72\u56DE\u5408", effect: { burn: { chance: 0.6, power: 0.25, turns: 2 } } },
      passive: { name: "\u706B\u6B63\u4E4B\u5B98", desc: "\u707C\u70E7\u4F24\u5BB3+30%", mods: {}, special: "burnUp" }
    },
    {
      id: "tudigong",
      name: "\u571F\u5730\u516C",
      title: "\u798F\u5FB7\u6B63\u795E",
      element: "earth",
      quality: "R",
      role: "\u9632",
      art: { robe: ["#e8d8b0", "#8a7a50"], trim: "#c8a04a", hair: "#d8d8d0", style: "daoist", weapon: "ruyi" },
      skill: { name: "\u5B89\u571F\u606F\u707E", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u6062\u590D12%\u6700\u5927\u6C14\u8840", effect: { heal: { power: 0.12 } } },
      passive: { name: "\u539A\u5FB7\u8F7D\u7269", desc: "\u9632\u5FA1+15%", mods: { def: 0.15 } }
    },
    {
      id: "mengpo",
      name: "\u5B5F\u5A46",
      title: "\u5E7D\u51A5\u5F15\u8005",
      element: "water",
      quality: "R",
      role: "\u63A7",
      art: { robe: ["#c0d0e0", "#4a5a7a"], trim: "#e9c887", hair: "#d8d8d8", style: "high", weapon: "gourd" },
      skill: { name: "\u5FD8\u5DDD\u6C34", target: "enemyAll", power: 0.7, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u621070%\u653B\u51FB\u4F24\u5BB3\uFF0C25%\u51E0\u7387\u7729\u66551\u56DE\u5408", effect: { stun: { chance: 0.25, turns: 1 } } },
      passive: { name: "\u5FD8\u5374\u524D\u5C18", desc: "\u654C\u65B9\u5168\u4F53\u901F\u5EA6-8%", mods: {}, special: "enemySlow" }
    },
    {
      id: "yanluo",
      name: "\u960E\u7F57",
      title: "\u5E7D\u51A5\u4E4B\u4E3B",
      element: "earth",
      quality: "SSR",
      role: "\u63A7",
      art: { robe: ["#8a7a8a", "#2f2a3a"], trim: "#c8a04a", hair: "#2b2b33", style: "long", wear: "crown", weapon: "brush" },
      skill: { name: "\u751F\u6B7B\u7C3F", target: "enemyLow", power: 1.85, desc: "\u5BF9\u6C14\u8840\u6700\u5C11\u7684\u654C\u4EBA\u9020\u6210185%\u653B\u51FB\u4F24\u5BB3\uFF0C50%\u51E0\u7387\u7729\u66551\u56DE\u5408", effect: { stun: { chance: 0.5, turns: 1 } } },
      passive: { name: "\u960E\u541B\u5BA1\u5224", desc: "\u5BF9\u6C14\u8840\u4F4E\u4E8E30%\u7684\u654C\u4EBA\u4F24\u5BB3+40%", mods: {}, special: "execute" }
    },
    {
      id: "houtu",
      name: "\u540E\u571F",
      title: "\u5927\u5730\u4E4B\u6BCD",
      element: "earth",
      quality: "SSR",
      role: "\u9632",
      art: { robe: ["#e0c8a8", "#7a5a3a"], trim: "#e9c887", hair: "#3a2a2a", style: "high", wear: "halo", weapon: "stone" },
      skill: { name: "\u539A\u571F\u8F7D\u7269", target: "allyAll", power: 0, desc: "\u4E3A\u5DF1\u65B9\u5168\u4F53\u9644\u52A018%\u62A4\u76FE\uFF0C\u524D\u6392\u989D\u5916\u83B7\u5F97\u9632\u5FA1+25%2\u56DE\u5408", effect: { shieldAll: { power: 0.18, turns: 2 }, selfDefUp: { value: 0.25, turns: 2 } } },
      passive: { name: "\u7687\u5929\u540E\u571F", desc: "\u5DF1\u65B9\u5168\u4F53\u9632\u5FA1+12%", mods: {}, special: "teamDef" }
    },
    {
      id: "donghuang",
      name: "\u4E1C\u7687\u592A\u4E00",
      title: "\u5929\u754C\u81F3\u5C0A",
      element: "fire",
      quality: "UR",
      role: "\u653B",
      art: { robe: ["#ffd0a0", "#a03a2a"], trim: "#fff2cf", hair: "#2b2b33", style: "long", wear: "crown", weapon: "orb", ribbon: "rgba(255,210,160,0.7)" },
      skill: { name: "\u4E1C\u7687\u949F\u54CD", target: "enemyAll", power: 1.3, desc: "\u5BF9\u654C\u65B9\u5168\u4F53\u9020\u6210130%\u653B\u51FB\u4F24\u5BB3\uFF0C\u5E76\u964D\u4F4E\u517625%\u6012\u6C14", effect: { rageDown: 25 } },
      passive: { name: "\u592A\u4E00\u81F3\u4E0A", desc: "\u653B\u51FB+15%\uFF0C\u6280\u80FD\u4F24\u5BB3+20%", mods: { atk: 0.15 }, special: "selfSkillUp" }
    },
    {
      id: "taiyi",
      name: "\u592A\u4E59\u771F\u4EBA",
      title: "\u6E05\u5FAE\u6559\u4E3B",
      element: "wood",
      quality: "SSR",
      role: "\u8F85",
      art: { robe: ["#d8f0d0", "#4f8a5a"], trim: "#e9c887", hair: "#e8e8e0", style: "daoist", weapon: "lotus" },
      skill: { name: "\u83B2\u82B1\u91CD\u751F", target: "allyDead", power: 0, desc: "\u590D\u6D3B\u4E00\u540D\u9635\u4EA1\u961F\u53CB\u5E76\u6062\u590D35%\u6700\u5927\u6C14\u8840", effect: { revive: { power: 0.35 } } },
      passive: { name: "\u4E7E\u5764\u9020\u5316", desc: "\u5DF1\u65B9\u5168\u4F53\u53D7\u5230\u7684\u6CBB\u7597\u6548\u679C+25%", mods: {}, special: "healUp" }
    }
  ];
  var HERO_LIST = LIST.map((h) => Object.assign({ star: 1, level: 1 }, h));
  var HERO_MAP = {};
  for (const h of HERO_LIST) HERO_MAP[h.id] = h;
  function getHero(id) {
    return HERO_MAP[id];
  }
  var BEAT = { metal: "wood", wood: "earth", earth: "water", water: "fire", fire: "metal" };
  function elementRelation(a, b) {
    if (!a || !b) return 0;
    if (BEAT[a] === b) return 1;
    if (BEAT[b] === a) return -1;
    return 0;
  }
  function heroesByQuality(q) {
    return HERO_LIST.filter((h) => h.quality === q);
  }
  var WEAPON_NAMES = {
    spear: "\u706B\u5C16\u67AA",
    axe: "\u5BA3\u82B1\u65A7",
    sword: "\u4E09\u5C16\u4E24\u5203\u5200",
    bow: "\u843D\u65E5\u795E\u5F13",
    staff: "\u6253\u795E\u97AD",
    fan: "\u82AD\u8549\u6247",
    bottle: "\u7389\u51C0\u74F6",
    bell: "\u7D2B\u91D1\u94C3",
    blade: "\u8F69\u8F95\u5251",
    sword2: "\u9752\u950B\u5251",
    halberd: "\u65B9\u5929\u753B\u621F",
    hammer: "\u5F00\u5C71\u9524",
    whip: "\u6346\u4ED9\u7EF3",
    mirror: "\u6606\u4ED1\u955C",
    cauldron: "\u516B\u5366\u4E39\u7089",
    gourd: "\u7D2B\u91D1\u846B\u82A6",
    pagoda: "\u73B2\u73D1\u5B9D\u5854",
    pipa: "\u78A7\u7389\u7435\u7436",
    umbrella: "\u6DF7\u5143\u4F1E",
    lotus: "\u83B2\u82B1\u5B9D\u5EA7"
  };
  var TALENTS = {
    fire: { name: "\u70C8\u7130\u711A\u5929", desc: "\u88C5\u5907\u4E13\u5C5E\u795E\u5175\u540E\u6FC0\u6D3B\uFF1A\u653B\u51FB\u5927\u5E45\u63D0\u5347\uFF0C\u666E\u653B\u6709\u51E0\u7387\u9644\u52A0\u707C\u70E7" },
    water: { name: "\u5BD2\u6E0A\u9501\u9B42", desc: "\u88C5\u5907\u4E13\u5C5E\u795E\u5175\u540E\u6FC0\u6D3B\uFF1A\u901F\u5EA6\u63D0\u5347\uFF0C\u6280\u80FD\u6709\u51E0\u7387\u51BB\u7ED3\u654C\u4EBA" },
    metal: { name: "\u9510\u91D1\u7834\u9635", desc: "\u88C5\u5907\u4E13\u5C5E\u795E\u5175\u540E\u6FC0\u6D3B\uFF1A\u653B\u51FB\u63D0\u5347\uFF0C\u5E76\u6709\u51E0\u7387\u65E0\u89C6\u654C\u65B9\u9632\u5FA1" },
    wood: { name: "\u957F\u751F\u9752\u6728", desc: "\u88C5\u5907\u4E13\u5C5E\u795E\u5175\u540E\u6FC0\u6D3B\uFF1A\u6C14\u8840\u5927\u5E45\u63D0\u5347\uFF0C\u53D7\u6CBB\u7597\u6548\u679C\u589E\u5F3A" },
    earth: { name: "\u539A\u571F\u9547\u5CB3", desc: "\u88C5\u5907\u4E13\u5C5E\u795E\u5175\u540E\u6FC0\u6D3B\uFF1A\u9632\u5FA1\u63D0\u5347\uFF0C\u53D7\u5230\u4F24\u5BB3\u51CF\u514D" }
  };
  var EQUIP_MAX_TECH = 15;
  var EQUIP_MAX_STAGE = 6;
  function exEquipOf(hero) {
    const wname = WEAPON_NAMES[hero.art && hero.art.weapon] || `${hero.name}\xB7\u672C\u547D\u795E\u5175`;
    const talent = TALENTS[hero.element] || TALENTS.earth;
    return {
      name: wname,
      talentName: talent.name,
      talentDesc: talent.desc,
      maxTech: EQUIP_MAX_TECH,
      maxStage: EQUIP_MAX_STAGE
    };
  }

  // js/data/equipment.js
  var PARTS = [
    { key: "weapon", name: "\u6B66\u5668", main: "atk" },
    { key: "helmet", name: "\u5934\u76D4", main: "def" },
    { key: "armor", name: "\u8863\u670D", main: "hp" },
    { key: "hat", name: "\u5E3D\u5B50", main: "spd" },
    { key: "boots", name: "\u978B\u5B50", main: "spd" },
    { key: "necklace", name: "\u9879\u94FE", main: "atk" }
  ];
  var PART_NAMES = PARTS.reduce((o, p) => {
    o[p.key] = p.name;
    return o;
  }, {});
  var EQ_QUALITY = {
    R: { label: "\u51E1\u54C1", color: "#b9c2cf" },
    SR: { label: "\u826F\u54C1", color: "#7fe0a0" },
    SSR: { label: "\u73CD\u54C1", color: "#7fb6ff" },
    UR: { label: "\u795E\u54C1", color: "#ffb84d" }
  };
  var MAIN_STAT = { hp: "\u6C14\u8840", atk: "\u653B\u51FB", def: "\u9632\u5FA1", spd: "\u901F\u5EA6" };
  var PART_BASE = {
    weapon: { atk: 140 },
    helmet: { def: 90 },
    armor: { hp: 700, def: 70 },
    hat: { spd: 35 },
    boots: { spd: 55 },
    necklace: { atk: 70, hp: 350 }
  };
  var Q_MULT = { R: 1, SR: 1.5, SSR: 2.3, UR: 3.4 };
  var EQ_MAX_LEVEL = 15;
  function rollEquipQuality() {
    const r = Math.random();
    if (r < 0.45) return "R";
    if (r < 0.78) return "SR";
    if (r < 0.95) return "SSR";
    return "UR";
  }
  function equipMain(inst) {
    const base = PART_BASE[inst.part] || {};
    const qm = Q_MULT[inst.quality] || 1;
    const lv = 1 + (inst.level - 1) * 0.08;
    const out = {};
    for (const k in base) out[k] = Math.round(base[k] * qm * lv);
    return out;
  }
  function equipScore(inst) {
    const m = equipMain(inst);
    return (m.hp || 0) / 10 + (m.atk || 0) + (m.def || 0) * 1.2 + (m.spd || 0) * 3;
  }
  function bestInBag(bag, part, excludeIid) {
    let best = null, bs = -1;
    for (const iid in bag) {
      const e = bag[iid];
      if (e.part !== part) continue;
      if (iid === excludeIid) continue;
      const s = equipScore(e);
      if (s > bs) {
        bs = s;
        best = iid;
      }
    }
    return best;
  }
  function enhanceCost(inst) {
    const qm = { R: 1, SR: 1.3, SSR: 1.7, UR: 2.2 }[inst.quality] || 1;
    return {
      iron: 2 + inst.level,
      coin: Math.round(260 * inst.level * qm)
    };
  }

  // js/data/growth.js
  var MAX_STAR = 5;
  function levelCap(star) {
    return 20 + star * 10;
  }
  function expNeed(level) {
    return Math.round(120 + level * 26 + Math.pow(level, 1.35));
  }
  function starCost(star) {
    return { soul: Math.round(10 * Math.pow(star, 1.6)), coin: Math.round(800 * Math.pow(star, 1.5)) };
  }
  function statsAtLevel(hero, level, star) {
    const base = hero.__base;
    const grow = 0.085 + (star - 1) * 0.012;
    const k = 1 + (level - 1) * grow;
    const starK = 1 + (star - 1) * 0.14;
    return {
      hp: Math.round(base.hp * k * starK),
      atk: Math.round(base.atk * k * starK),
      def: Math.round(base.def * k * starK),
      spd: Math.round(base.spd * (1 + (star - 1) * 0.03))
    };
  }
  function powerOf(stats, hero, star) {
    const qk = { R: 1, SR: 1.15, SSR: 1.35, UR: 1.6 }[hero.quality] || 1;
    return Math.round((stats.hp * 0.5 + stats.atk * 4 + stats.def * 2.2 + stats.spd * 1.2) * qk * (1 + (star - 1) * 0.08));
  }
  var COIN_PER_EXP = 0.6;

  // js/data/gacha.js
  var POOLS = [
    {
      id: "tianjie",
      name: "\u5929\u754C\u7948\u613F",
      desc: "\u5E38\u5E38\u9A7B\u5361\u6C60\uFF1A\u4E09\u754C\u795E\u5C06\u7686\u53EF\u964D\u4E34",
      color: "#e9c887",
      up: [],
      rates: { UR: 0.012, SSR: 0.075, SR: 0.26 },
      upRate: 0
    },
    {
      id: "fengshen",
      name: "\u5C01\u795E\u518D\u4E34",
      desc: "\u9650\u5B9A\u7948\u613F\uFF1A\u9F50\u5929\u5927\u5723\xB7\u5B59\u609F\u7A7A / \u4E09\u575B\u6D77\u4F1A\u5927\u795E\xB7\u54EA\u5412 \u6982\u7387\u63D0\u5347",
      color: "#e08ce0",
      up: ["wukong", "nezha"],
      rates: { UR: 0.02, SSR: 0.12, SR: 0.28 },
      upRate: 0.55
    }
  ];
  var PITY_SSR = 60;
  var PITY_SR = 10;
  function pickQuality(rates, pitySSR, pitySR) {
    if (pitySSR >= PITY_SSR) return Math.random() < 0.18 ? "UR" : "SSR";
    if (pitySR >= PITY_SR) return ["UR", "SSR", "SR"][Math.floor(Math.random() * 3) > 1 ? 2 : Math.random() < 0.12 ? 0 : 1];
    const r = Math.random();
    const ur = rates.UR;
    const ssr = rates.UR + rates.SSR;
    const sr = ssr + rates.SR;
    if (r < ur) return "UR";
    if (r < ssr) return "SSR";
    if (r < sr) return "SR";
    return "R";
  }
  function drawOnce(pool, state) {
    const quality = pickQuality(pool.rates, state.pitySSR, state.pitySR);
    let heroId = null;
    let isUp = false;
    const upHeroes = (pool.up || []).map((id) => HERO_LIST.find((h) => h.id === id)).filter(Boolean);
    const upInQuality = upHeroes.filter((h) => h.quality === quality);
    if (upInQuality.length && Math.random() < (pool.upRate || 0)) {
      heroId = upInQuality[Math.floor(Math.random() * upInQuality.length)].id;
      isUp = true;
    } else {
      const pool2 = heroesByQuality(quality);
      heroId = pool2[Math.floor(Math.random() * pool2.length)].id;
    }
    state.pitySSR++;
    state.pitySR++;
    if (quality === "SSR" || quality === "UR") {
      state.pitySSR = 0;
      state.pitySR = 0;
    } else if (quality === "SR") state.pitySR = 0;
    return { heroId, quality, isUp };
  }
  function drawTen(pool, state) {
    const results = [];
    for (let i = 0; i < 10; i++) results.push(drawOnce(pool, state));
    return results;
  }
  function soulOfQuality(q) {
    return { R: 5, SR: 20, SSR: 80, UR: 300 }[q] || 5;
  }

  // js/data/stages.js
  var CHAPTER_META = [
    { name: "\u6606\u4ED1\u95EE\u9053", boss: "niumowang", tip: "\u521D\u5165\u4ED9\u95E8\uFF0C\u7FA4\u5996\u62E6\u8DEF", pool: ["tudigong", "jingwei", "mengpo", "kuafu", "honghaier", "niumowang", "gonggong", "zhurong"] },
    { name: "\u4E1C\u6D77\u60CA\u6D9B", boss: "aoguang", tip: "\u9F99\u5BAB\u5174\u6CE2\uFF0C\u6C34\u65CF\u6C79\u6D8C", pool: ["jingwei", "mengpo", "gonggong", "aoguang", "kuafu", "zhurong", "leizhenzi", "xuanwu"] },
    { name: "\u706B\u4E91\u6D1E\u5929", boss: "honghaier", tip: "\u4E09\u6627\u771F\u706B\uFF0C\u711A\u5C71\u716E\u6D77", pool: ["honghaier", "zhurong", "zhulong", "zhuque", "leizhenzi", "xingtian", "niumowang", "nezha"] },
    { name: "\u96F7\u6CFD\u5929\u52AB", boss: "leizhenzi", tip: "\u98CE\u96F7\u4EA4\u52A0\uFF0C\u6DEC\u4F53\u6210\u94A2", pool: ["leizhenzi", "baihu", "xingtian", "yangjian", "qinglong", "baize", "houyi", "taibai"] },
    { name: "\u5E7D\u51A5\u9EC4\u6CC9", boss: "yanluo", tip: "\u751F\u6B7B\u7C3F\u4E0A\uFF0C\u547D\u6570\u7531\u5929", pool: ["mengpo", "yanluo", "xuanwu", "gonggong", "houtu", "shennong", "change", "baize"] },
    { name: "\u4E5D\u9ECE\u6218\u573A", boss: "chiyou", tip: "\u94DC\u5934\u94C1\u81C2\uFF0C\u4E5D\u9ECE\u94C1\u8840", pool: ["xingtian", "chiyou", "baihu", "qinglong", "huangdi", "yangjian", "yanluo", "zhuque"] },
    { name: "\u5929\u754C\u51CC\u9704", boss: "donghuang", tip: "\u51CC\u9704\u6BBF\u524D\uFF0C\u5929\u5175\u5217\u9635", pool: ["taibai", "litianwang", "yangjian", "nezha", "wukong", "xuannv", "xiwangmu", "donghuang"] },
    { name: "\u6DF7\u6C8C\u521D\u5F00", boss: "pangu", tip: "\u5929\u5730\u7384\u9EC4\uFF0C\u5B87\u5B99\u6D2A\u8352", pool: ["pangu", "nvwa", "fuxi", "laojun", "donghuang", "wukong", "huangdi", "chiyou"] }
  ];
  var STAGE_NAMES = [
    "\u521D\u5165\u4ED9\u9014",
    "\u4E91\u6D77\u8BD5\u5FC3",
    "\u65A9\u5996\u9664\u795F",
    "\u7075\u6CC9\u6C90\u6D74",
    "\u53E4\u9635\u5F00\u542F",
    "\u95EE\u9053\u8DEF\u65AD",
    "\u5996\u738B\u73B0\u8EAB",
    "\u5929\u96F7\u6DEC\u4F53",
    "\u767B\u4E34\u4ED9\u95E8",
    "\u9053\u5FC3\u65E2\u660E"
  ];
  function enemyCount(chapter, index) {
    if (index >= 10) return 5;
    if (index >= 8) return 4;
    if (index >= 4) return 3;
    return 2;
  }
  function buildStage(chapter, index) {
    const meta = CHAPTER_META[chapter - 1];
    const level = (chapter - 1) * 8 + index + 4;
    const count = enemyCount(chapter, index);
    const isBoss = index === 10;
    const pool = meta.pool;
    const enemies = [];
    if (isBoss) enemies.push(meta.boss);
    for (let i = 0; i < count; i++) {
      const id = pool[(chapter * 7 + index * 3 + i * 5) % pool.length];
      if (id !== meta.boss) enemies.push(id);
    }
    while (enemies.length > 5) enemies.pop();
    return {
      id: `${chapter}-${index}`,
      chapter,
      index,
      name: isBoss ? `${meta.name}\xB7\u7EC8` : STAGE_NAMES[(index - 1) % STAGE_NAMES.length],
      desc: isBoss ? `${meta.name}\u7684\u6700\u7EC8\u8003\u9A8C` : meta.tip,
      level,
      isBoss,
      enemies,
      reward: {
        coin: Math.round(260 + chapter * 150 + index * 34),
        exp: Math.round(240 + chapter * 120 + index * 40),
        ticket: isBoss ? 3 : index % 4 === 0 ? 1 : 0,
        soul: isBoss ? 40 : index % 5 === 0 ? 8 : 0
      },
      cost: 6
    };
  }
  var CHAPTERS = CHAPTER_META.map((m, i) => {
    const ch = i + 1;
    return {
      id: ch,
      name: `\u7B2C${"\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B"[i]}\u7AE0 ${m.name}`,
      short: m.name,
      tip: m.tip,
      boss: m.boss,
      stages: Array.from({ length: 10 }, (_, k) => buildStage(ch, k + 1))
    };
  });
  var STAGE_MAP = {};
  for (const c of CHAPTERS) for (const s of c.stages) STAGE_MAP[s.id] = s;
  function getStage(id) {
    return STAGE_MAP[id];
  }
  function nextStageId(id) {
    const s = getStage(id);
    if (!s) return "1-1";
    if (s.index < 10) return `${s.chapter}-${s.index + 1}`;
    if (s.chapter < CHAPTERS.length) return `${s.chapter + 1}-1`;
    return null;
  }
  function chapterUnlocked(chapter, progress) {
    if (chapter === 1) return true;
    const prev = CHAPTERS[chapter - 2];
    let cleared = 0;
    for (const s of prev.stages) if (progress.cleared[s.id]) cleared++;
    return cleared >= 6;
  }
  function stageUnlocked(stage, progress) {
    if (!chapterUnlocked(stage.chapter, progress)) return false;
    if (stage.index === 1) return true;
    return !!progress.cleared[`${stage.chapter}-${stage.index - 1}`];
  }

  // js/model/player.js
  var SAVE_KEY = "save";
  var EXP_PER_PILL = 100;
  var STAMINA_MAX = 120;
  var STAMINA_RECOVER_MS = 3 * 60 * 1e3;
  var REDEEM_CODES = {
    SHENHUA2026: {
      res: { coin: 888888, jade: 288, iron: 200, crystal: 30, soul: 300, exp: 2e4, stamina: 120, ticket: 20 },
      box: 3
      // 额外获得 3 个装备箱
    }
  };
  for (const id in HERO_MAP) HERO_MAP[id].__base = baseStats(HERO_MAP[id]);
  var QUALITY_K = { R: 1, SR: 1.18, SSR: 1.4, UR: 1.7 };
  function emptyBonus() {
    return { hp: 0, atk: 0, def: 0, spd: 0, tech: 0, stage: 0, owned: false, techMul: 0, stageMul: 0, talentMul: 0, talentActive: false };
  }
  function defaultData() {
    return {
      version: 1,
      name: "\u65B0\u664B\u4ED9\u541B",
      res: { coin: 6e3, jade: 300, ticket: 10, soul: 60, exp: 3e3, stamina: 60, iron: 30, crystal: 8 },
      heroes: {
        nezha: { id: "nezha", level: 8, star: 2, exp: 0 },
        honghaier: { id: "honghaier", level: 6, star: 1, exp: 0 },
        jingwei: { id: "jingwei", level: 5, star: 1, exp: 0 },
        tudigong: { id: "tudigong", level: 5, star: 1, exp: 0 },
        mengpo: { id: "mengpo", level: 5, star: 1, exp: 0 }
      },
      equips: {},
      bag: {},
      // 常规装备背包：{ iid: {iid,part,quality,level} }
      slots: {},
      // 每英雄 6 部位穿戴：{ heroId: {weapon,helmet,armor,hat,boots,necklace} }
      _eid: 0,
      // 装备实例自增 id
      team: ["tudigong", "nezha", "jingwei", "honghaier", "mengpo"],
      progress: { cleared: {}, current: "1-1" },
      gacha: {
        tianjie: { pitySSR: 0, pitySR: 0, count: 0 },
        fengshen: { pitySSR: 0, pitySR: 0, count: 0 }
      },
      stats: { battles: 0, wins: 0, gacha: 0, loginDays: 1 },
      time: { lastStamina: Date.now(), lastLogin: Date.now() }
    };
  }
  var Player = class _Player {
    constructor(data) {
      this.data = data || defaultData();
      this.refreshStamina();
    }
    static load() {
      const raw = Storage.get(SAVE_KEY, null);
      let data;
      try {
        data = raw && typeof raw === "object" ? raw : null;
      } catch (e) {
        data = null;
      }
      if (!data || !data.res) data = defaultData();
      const def = defaultData();
      for (const k in def) if (data[k] === void 0) data[k] = def[k];
      if (!data.equips) data.equips = {};
      for (const id in data.heroes) {
        if (!data.equips[id]) data.equips[id] = { owned: true, tech: 1, stage: 1 };
      }
      if (!data.slots) data.slots = {};
      for (const id in data.heroes) {
        if (!data.slots[id]) data.slots[id] = { weapon: null, helmet: null, armor: null, hat: null, boots: null, necklace: null };
      }
      if (!data.bag) data.bag = {};
      if (!data._eid) data._eid = 0;
      if (!data.bag || !Object.keys(data.bag).length) {
        let e = 0;
        for (const p of PARTS) {
          const iid = "e" + ++e;
          data.bag[iid] = { iid, part: p.key, quality: "R", level: 1 };
          if (data.heroes.nezha) data.slots.nezha[p.key] = iid;
        }
        data._eid = e;
      }
      return new _Player(data);
    }
    save() {
      Storage.set(SAVE_KEY, this.data);
    }
    reset() {
      this.data = defaultData();
      this.save();
    }
    /* ---------- 资源 ---------- */
    get res() {
      return this.data.res;
    }
    get(key) {
      return this.data.res[key] || 0;
    }
    add(key, n) {
      this.data.res[key] = Math.max(0, (this.data.res[key] || 0) + n);
      if (key === "stamina") this.data.res[key] = Math.min(STAMINA_MAX, this.data.res[key]);
      return this.data.res[key];
    }
    canAfford(cost) {
      for (const k in cost) if ((this.data.res[k] || 0) < cost[k]) return false;
      return true;
    }
    spend(cost) {
      if (!this.canAfford(cost)) return false;
      for (const k in cost) this.data.res[k] -= cost[k];
      return true;
    }
    spendDesc(cost) {
      const names = { coin: "\u7075\u77F3", jade: "\u4ED9\u7389", ticket: "\u8BF7\u795E\u7B26", soul: "\u5C06\u9B42", exp: "\u7384\u9EC4\u4E39", stamina: "\u4E91\u6C14" };
      return Object.keys(cost).map((k) => `${names[k] || k}\xD7${cost[k]}`).join("\uFF0C");
    }
    refreshStamina() {
      const now = Date.now();
      const last = this.data.time.lastStamina || now;
      const gain = Math.floor((now - last) / STAMINA_RECOVER_MS);
      if (gain > 0 && this.data.res.stamina < STAMINA_MAX) {
        this.data.res.stamina = Math.min(STAMINA_MAX, this.data.res.stamina + gain);
        this.data.time.lastStamina = last + gain * STAMINA_RECOVER_MS;
      } else if (this.data.res.stamina >= STAMINA_MAX) {
        this.data.time.lastStamina = now;
      }
    }
    get staminaMax() {
      return STAMINA_MAX;
    }
    /* ---------- 神将 ---------- */
    has(id) {
      return !!this.data.heroes[id];
    }
    hero(id) {
      return this.data.heroes[id];
    }
    get heroList() {
      return Object.keys(this.data.heroes).map((k) => this.data.heroes[k]);
    }
    get sortedHeroes() {
      const order = { UR: 4, SSR: 3, SR: 2, R: 1 };
      return this.heroList.slice().sort((a, b) => {
        const ha = getHero(a.id), hb = getHero(b.id);
        if (order[hb.quality] !== order[ha.quality]) return order[hb.quality] - order[ha.quality];
        if (b.star !== a.star) return b.star - a.star;
        if (b.level !== a.level) return b.level - a.level;
        return ha.id.localeCompare(hb.id);
      });
    }
    /** 获得神将（重复转化为将魂） */
    gainHero(id) {
      const info = getHero(id);
      if (!info) return null;
      if (this.has(id)) {
        const soul = soulOfQuality(info.quality);
        this.add("soul", soul);
        return { id, isNew: false, soul };
      }
      this.data.heroes[id] = { id, level: 1, star: 1, exp: 0 };
      this.data.stats.gacha++;
      return { id, isNew: true, soul: 0 };
    }
    /** 神将当前属性（含专属装备加成） */
    statsOf(id) {
      const h = this.hero(id);
      const info = getHero(id);
      if (!h || !info) return null;
      const s = statsAtLevel(info, h.level, h.star);
      const b = this.equipBonus(id);
      const r = this.regularEquipBonus(id);
      s.hp += b.hp + r.hp;
      s.atk += b.atk + r.atk;
      s.def += b.def + r.def;
      s.spd += b.spd + r.spd;
      s.power = powerOf(s, info, h.star);
      return s;
    }
    /** 常规装备（6 部位）数值加成 */
    regularEquipBonus(id) {
      const slots = this.data.slots[id];
      if (!slots) return { hp: 0, atk: 0, def: 0, spd: 0 };
      const bag = this.data.bag;
      let hp = 0, atk = 0, def = 0, spd = 0;
      for (const part in slots) {
        const iid = slots[part];
        if (!iid || !bag[iid]) continue;
        const m = equipMain(bag[iid]);
        hp += m.hp || 0;
        atk += m.atk || 0;
        def += m.def || 0;
        spd += m.spd || 0;
      }
      return { hp, atk, def, spd };
    }
    /** 专属装备数值加成 */
    equipBonus(id) {
      const h = this.hero(id);
      const info = getHero(id);
      if (!h || !info) return emptyBonus();
      const eq = this.data.equips[id];
      if (!eq || !eq.owned) return emptyBonus();
      const base = info.__base;
      const qk = QUALITY_K[info.quality] || 1;
      const techMul = (eq.tech - 1) * 0.045 * qk;
      const stageMul = (eq.stage - 1) * 0.13 * qk;
      const talentMul = eq.stage >= 2 ? (eq.stage - 1) * 0.06 : 0;
      const f = (k) => Math.round(base[k] * (techMul + stageMul + talentMul));
      return {
        hp: f("hp"),
        atk: f("atk"),
        def: f("def"),
        spd: f("spd"),
        tech: eq.tech,
        stage: eq.stage,
        owned: true,
        techMul,
        stageMul,
        talentMul,
        talentActive: eq.stage >= 2
      };
    }
    /** 科技升级（提升专属装备属性） */
    equipTechUp(id) {
      const eq = this.data.equips[id];
      if (!eq || !eq.owned) return { ok: false, msg: "\u672A\u62E5\u6709\u4E13\u5C5E\u88C5\u5907" };
      if (eq.tech >= EQUIP_MAX_TECH) return { ok: false, msg: "\u79D1\u6280\u5DF2\u6EE1\u7EA7" };
      const info = getHero(id);
      const k = QUALITY_K[info.quality] || 1;
      const cost = { iron: 2 + eq.tech, coin: Math.round(300 * eq.tech * k) };
      if (!this.canAfford(cost)) return { ok: false, msg: "\u7CBE\u94C1\u6216\u7075\u77F3\u4E0D\u8DB3" };
      this.spend(cost);
      eq.tech++;
      return { ok: true, msg: `\u79D1\u6280\u63D0\u5347 \u2192 ${eq.tech} \u7EA7` };
    }
    /** 进阶（提升阶位，解锁并强化专属特技） */
    equipAdvance(id) {
      const eq = this.data.equips[id];
      if (!eq || !eq.owned) return { ok: false, msg: "\u672A\u62E5\u6709\u4E13\u5C5E\u88C5\u5907" };
      if (eq.stage >= EQUIP_MAX_STAGE) return { ok: false, msg: "\u5DF2\u8FBE\u6700\u9AD8\u9636" };
      const info = getHero(id);
      const k = QUALITY_K[info.quality] || 1;
      const cost = {
        crystal: 1 + Math.floor(eq.stage / 2),
        soul: 5 * eq.stage,
        coin: Math.round(800 * eq.stage * k)
      };
      if (!this.canAfford(cost)) return { ok: false, msg: "\u7384\u6676/\u5C06\u9B42/\u7075\u77F3\u4E0D\u8DB3" };
      this.spend(cost);
      eq.stage++;
      return { ok: true, msg: `\u8FDB\u9636\u6210\u529F \u2192 ${eq.stage} \u9636` };
    }
    /* ---------- 常规装备 ---------- */
    /** 穿戴某部位最优装备（无则提示去购买） */
    equipWear(id, part) {
      const slots = this.data.slots[id];
      if (!slots) return { ok: false, msg: "\u65E0\u8BE5\u795E\u5C06" };
      const best = bestInBag(this.data.bag, part, null);
      if (!best) return { ok: false, msg: "\u80CC\u5305\u65E0\u8BE5\u90E8\u4F4D\u88C5\u5907\uFF0C\u53BB\u4ED9\u5E02\u8D2D\u4E70\u88C5\u5907\u7BB1" };
      if (slots[part] === best) return { ok: false, msg: "\u5DF2\u662F\u6700\u4F18\u88C5\u5907" };
      slots[part] = best;
      return { ok: true, msg: `\u5DF2\u7A7F\u6234 ${PART_NAMES[part]}`, iid: best };
    }
    /** 卸下某部位 */
    equipTakeOff(id, part) {
      const slots = this.data.slots[id];
      if (!slots) return { ok: false, msg: "\u65E0\u8BE5\u795E\u5C06" };
      if (!slots[part]) return { ok: false, msg: "\u8BE5\u90E8\u4F4D\u672A\u7A7F\u6234" };
      slots[part] = null;
      return { ok: true, msg: `\u5DF2\u5378\u4E0B ${PART_NAMES[part]}` };
    }
    /** 强化某部位已穿戴装备 */
    equipEnhance(id, part) {
      const slots = this.data.slots[id];
      if (!slots) return { ok: false, msg: "\u65E0\u8BE5\u795E\u5C06" };
      const iid = slots[part];
      const inst = iid && this.data.bag[iid];
      if (!inst) return { ok: false, msg: "\u8BE5\u90E8\u4F4D\u672A\u7A7F\u6234\u88C5\u5907" };
      if (inst.level >= EQ_MAX_LEVEL) return { ok: false, msg: "\u5F3A\u5316\u5DF2\u6EE1\u7EA7" };
      const cost = enhanceCost(inst);
      if (!this.canAfford(cost)) return { ok: false, msg: "\u7CBE\u94C1\u6216\u7075\u77F3\u4E0D\u8DB3" };
      this.spend(cost);
      inst.level++;
      return { ok: true, msg: `\u5F3A\u5316\u6210\u529F \u2192 +${inst.level}` };
    }
    /** 一键强化某英雄全部已穿戴装备 */
    equipEnhanceAll(id) {
      const slots = this.data.slots[id];
      if (!slots) return { ok: false, msg: "\u65E0\u8BE5\u795E\u5C06" };
      let n = 0;
      for (const part in slots) {
        const r = this.equipEnhance(id, part);
        if (r.ok) n++;
      }
      return n > 0 ? { ok: true, msg: `\u5F3A\u5316 ${n} \u4EF6\u88C5\u5907` } : { ok: false, msg: "\u65E0\u53EF\u5F3A\u5316\u6216\u8D44\u6E90\u4E0D\u8DB3" };
    }
    /** 开装备箱（随机部位 + 随机品质） */
    openEquipBox(n) {
      n = n || 1;
      const got = [];
      for (let i = 0; i < n; i++) {
        const part = PARTS[Math.floor(Math.random() * PARTS.length)].key;
        const quality = rollEquipQuality();
        const iid = "e" + ++this.data._eid;
        const inst = { iid, part, quality, level: 1 };
        this.data.bag[iid] = inst;
        got.push(inst);
      }
      return got;
    }
    /** 装备是否已穿戴（任一英雄槽位占用） */
    isWorn(iid) {
      const slots = this.data.slots;
      for (const id in slots) for (const p in slots[id]) if (slots[id][p] === iid) return true;
      return false;
    }
    /** 分解单件装备返还的精铁（按品质基础 × 强化等级） */
    disbandIron(inst) {
      const base = { R: 30, SR: 60, SSR: 120, UR: 240 };
      return Math.round((base[inst.quality] || 30) * inst.level);
    }
    /** 分解单件装备（已穿戴不可分解） */
    disbandEquip(iid) {
      const inst = this.data.bag[iid];
      if (!inst) return { ok: false, msg: "\u88C5\u5907\u4E0D\u5B58\u5728" };
      if (this.isWorn(iid)) return { ok: false, msg: "\u8BE5\u88C5\u5907\u5DF2\u7A7F\u6234\uFF0C\u8BF7\u5148\u8131\u4E0B" };
      const iron = this.disbandIron(inst);
      delete this.data.bag[iid];
      this.add("iron", iron);
      return { ok: true, iron, msg: `\u5206\u89E3\u6210\u529F\uFF0C\u8FD4\u8FD8\u7CBE\u94C1 ${iron}` };
    }
    /** 按品质一键分解（仅分解未穿戴的） */
    disbandByQuality(quality) {
      let n = 0, iron = 0;
      for (const iid in this.data.bag) {
        const inst = this.data.bag[iid];
        if (inst.quality !== quality) continue;
        if (this.isWorn(iid)) continue;
        iron += this.disbandIron(inst);
        delete this.data.bag[iid];
        n++;
      }
      if (n) this.add("iron", iron);
      const label = EQ_QUALITY[quality] && EQ_QUALITY[quality].label || quality;
      return { ok: n > 0, n, iron, msg: n > 0 ? `\u5206\u89E3 ${n} \u4EF6${label}\u88C5\u5907\uFF0C\u8FD4\u8FD8\u7CBE\u94C1 ${iron}` : `\u6CA1\u6709\u53EF\u5206\u89E3\u7684${label}\u88C5\u5907` };
    }
    /** 商店购买（支持装备箱：item.box = 箱数） */
    shopBuy(item) {
      if (!this.canAfford(item.cost)) return { ok: false, msg: "\u8D44\u6E90\u4E0D\u8DB3" };
      this.spend(item.cost);
      if (item.box) {
        const got = this.openEquipBox(item.box);
        const parts = got.map((e) => PART_NAMES[e.part]).join("\u3001");
        return { ok: true, msg: `\u5F00\u542F ${item.box} \u4E2A\u88C5\u5907\u7BB1\uFF0C\u83B7\u5F97\uFF1A${parts}` };
      }
      for (const g2 in item.gain || {}) this.add(g2, item.gain[g2]);
      return { ok: true, msg: item.okMsg || "\u8D2D\u4E70\u6210\u529F" };
    }
    /** 礼包码兑换（可重复使用，不记录已兑换） */
    redeemCode(code) {
      const g2 = REDEEM_CODES[code];
      if (!g2) return { ok: false, msg: "\u793C\u5305\u7801\u65E0\u6548" };
      for (const k in g2.res) this.add(k, g2.res[k]);
      if (g2.box) this.openEquipBox(g2.box);
      return { ok: true, msg: "\u5151\u6362\u6210\u529F\uFF0C\u83B7\u5F97\u6D77\u91CF\u8D44\u6E90\uFF01" };
    }
    /** 战斗单位 */
    unitOf(id) {
      const h = this.hero(id);
      const info = getHero(id);
      if (!h || !info) return null;
      const stats = this.statsOf(id);
      return { id, hero: info, level: h.level, star: h.star, stats };
    }
    get teamUnits() {
      return this.data.team.filter(Boolean).map((id) => this.unitOf(id)).filter(Boolean);
    }
    get teamPower() {
      return this.teamUnits.reduce((s, u) => s + u.stats.power, 0);
    }
    setTeamSlot(slot, heroId) {
      for (let i = 0; i < this.data.team.length; i++) {
        if (this.data.team[i] === heroId) this.data.team[i] = null;
      }
      this.data.team[slot] = heroId;
    }
    inTeam(id) {
      return this.data.team.indexOf(id) >= 0;
    }
    /* ---------- 养成 ---------- */
    expNeeded(id) {
      const h = this.hero(id);
      return h ? expNeed(h.level) : 0;
    }
    isMaxLevel(id) {
      const h = this.hero(id);
      return h ? h.level >= levelCap(h.star) : true;
    }
    /**
     * 升级：消耗玄黄丹与灵石
     * @returns {object} {ok, msg, leveled, level}
     */
    levelUp(id, times) {
      const h = this.hero(id);
      if (!h) return { ok: false, msg: "\u795E\u5C06\u4E0D\u5B58\u5728" };
      let count = 0;
      for (let i = 0; i < (times || 1); i++) {
        if (h.level >= levelCap(h.star)) return { ok: false, msg: "\u5DF2\u8FBE\u5F53\u524D\u661F\u7EA7\u7B49\u7EA7\u4E0A\u9650\uFF0C\u9700\u5148\u5347\u661F", leveled: count };
        const need = expNeed(h.level) - h.exp;
        const pills = Math.max(1, Math.ceil(need / EXP_PER_PILL));
        const coin = Math.round(need * COIN_PER_EXP);
        if (!this.canAfford({ exp: pills, coin })) {
          return { ok: false, msg: count > 0 ? `\u5347\u7EA7${count}\u7EA7\uFF0C\u8D44\u6E90\u4E0D\u8DB3` : "\u7384\u9EC4\u4E39\u6216\u7075\u77F3\u4E0D\u8DB3", leveled: count };
        }
        this.spend({ exp: pills, coin });
        h.exp += pills * EXP_PER_PILL;
        while (h.level < levelCap(h.star) && h.exp >= expNeed(h.level)) {
          h.exp -= expNeed(h.level);
          h.level++;
        }
        if (h.level >= levelCap(h.star)) h.exp = 0;
        count++;
      }
      return { ok: true, leveled: count, level: h.level, msg: `\u5347\u7EA7\u6210\u529F \xD7${count}` };
    }
    /** 升星 */
    starUp(id) {
      const h = this.hero(id);
      if (!h) return { ok: false, msg: "\u795E\u5C06\u4E0D\u5B58\u5728" };
      if (h.star >= MAX_STAR) return { ok: false, msg: "\u5DF2\u8FBE\u6700\u9AD8\u661F\u7EA7" };
      const cost = starCost(h.star);
      if (!this.canAfford(cost)) return { ok: false, msg: "\u5C06\u9B42\u6216\u7075\u77F3\u4E0D\u8DB3" };
      this.spend(cost);
      h.star++;
      return { ok: true, star: h.star, msg: `\u5347\u661F\u6210\u529F\uFF01\u5F53\u524D ${h.star} \u661F` };
    }
    /* ---------- 战役 ---------- */
    get progress() {
      return this.data.progress;
    }
    isCleared(id) {
      return !!this.data.progress.cleared[id];
    }
    clearStage(id) {
      const first = !this.data.progress.cleared[id];
      this.data.progress.cleared[id] = true;
      const next = nextStageId(id);
      if (next) this.data.progress.current = next;
      return first;
    }
    get currentStage() {
      return getStage(this.data.progress.current) || getStage("1-1");
    }
    get chapterProgress() {
      return CHAPTERS.map((c) => {
        let n = 0;
        for (const s of c.stages) if (this.data.progress.cleared[s.id]) n++;
        return { chapter: c, cleared: n, total: c.stages.length };
      });
    }
  };
  var player = Player.load();

  // js/scenes/registry.js
  var builders = {};
  function register(name, builder) {
    builders[name] = builder;
  }
  function goto(name, params) {
    const b = builders[name];
    if (!b) {
      console.warn("\u672A\u6CE8\u518C\u7684\u573A\u666F\uFF1A", name);
      return;
    }
    const scene = b(params || {});
    engine.setScene(scene);
    return scene;
  }

  // js/core/ui.js
  var Widget = class {
    constructor(o) {
      o = o || {};
      this.x = o.x || 0;
      this.y = o.y || 0;
      this.w = o.w || 0;
      this.h = o.h || 0;
      this.visible = o.visible === void 0 ? true : o.visible;
      this.alpha = o.alpha === void 0 ? 1 : o.alpha;
      this.scale = o.scale === void 0 ? 1 : o.scale;
      this.onClick = o.onClick || null;
      this.onLongPress = null;
      this.pressed = false;
      this.disabled = false;
      this.tag = o.tag || "";
      this.data = o.data || null;
      this.children = [];
      this.parent = null;
    }
    get interactive() {
      return !!(this.onClick || this.onTouchStart || this.onTouchMove || this.onTouchEnd);
    }
    add(child) {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    remove(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) {
        this.children.splice(i, 1);
        child.parent = null;
      }
    }
    clear() {
      this.children.forEach((c) => {
        c.parent = null;
      });
      this.children = [];
    }
    draw(ctx) {
      if (!this.visible) return;
      ctx.save();
      ctx.globalAlpha *= this.alpha * (this.disabled ? 0.5 : 1);
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      if (this.scale !== 1) ctx.scale(this.scale, this.scale);
      ctx.translate(-this.w / 2, -this.h / 2);
      this.onDraw(ctx);
      for (const c of this.children) c.draw(ctx);
      ctx.restore();
    }
    onDraw() {
    }
    /** 命中测试：返回最深的可交互节点 */
    pick(x, y) {
      if (!this.visible || this.disabled) return null;
      const lx = x - this.x;
      const ly = y - this.y;
      if (lx < 0 || ly < 0 || lx > this.w || ly > this.h) return null;
      for (let i = this.children.length - 1; i >= 0; i--) {
        const r = this.children[i].pick(lx, ly);
        if (r) return r;
      }
      return this.interactive ? this : null;
    }
    /** 局部坐标转换 */
    local(x, y) {
      return { x: x - this.x, y: y - this.y };
    }
    press() {
      this.pressed = true;
      tween(this, { to: { scale: 0.94 }, dur: 90, ease: Ease.quadOut });
    }
    release() {
      this.pressed = false;
      tween(this, { to: { scale: 1 }, dur: 140, ease: Ease.backOut });
    }
  };
  var Scene = class extends Widget {
    constructor(o) {
      super(Object.assign({ w: 750, h: 1334 }, o));
      this.popups = [];
      this.pressedTarget = null;
      this.touchMoved = false;
    }
    onEnter() {
    }
    onExit() {
    }
    update() {
    }
    drawBackground(ctx, W, H) {
      const g2 = ctx.createLinearGradient(0, 0, 0, H);
      g2.addColorStop(0, "#1a2138");
      g2.addColorStop(0.5, "#121829");
      g2.addColorStop(1, "#0b0e18");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
    }
    /** 场景自身不参与命中，避免触摸事件自递归 */
    get interactive() {
      return false;
    }
    addPopup(p) {
      p._scene = this;
      this.popups.push(p);
      return p;
    }
    removePopup(p) {
      const i = this.popups.indexOf(p);
      if (i >= 0) this.popups.splice(i, 1);
    }
    get hasPopup() {
      return this.popups.length > 0;
    }
    pickAt(x, y) {
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const r = this.popups[i].pick(x, y);
        if (r) return r;
      }
      return this.pick(x, y);
    }
    onTouchStart(x, y) {
      this.touchMoved = false;
      const t = this.pickAt(x, y);
      this.pressedTarget = t;
      if (t && t !== this) {
        t.press && t.press();
        if (t.onTouchStart) t.onTouchStart(x, y);
      }
    }
    onTouchMove(x, y) {
      this.touchMoved = true;
      const t = this.pressedTarget;
      if (t && t !== this && t.onTouchMove) t.onTouchMove(x, y);
    }
    onTouchEnd(x, y) {
      const t = this.pressedTarget;
      this.pressedTarget = null;
      if (!t || t === this) return;
      t.release && t.release();
      if (t.onTouchEnd) t.onTouchEnd(x, y);
      const hit = this.pickAt(x, y);
      if (hit === t && t.onClick && !t.disabled) t.onClick(t);
    }
    draw(ctx) {
      super.draw(ctx);
      for (const p of this.popups) p.draw(ctx);
    }
  };
  var Sprite = class extends Widget {
    /** render(ctx, w, h, self) */
    constructor(o) {
      super(o);
      this.render = o.render || (() => {
      });
    }
    onDraw(ctx) {
      this.render(ctx, this.w, this.h, this);
    }
  };
  var ButtonStyles = {
    gold: { c1: "#f5dc9e", c2: "#c8963e", text: "#3a2408", border: "#fff2cf" },
    red: { c1: "#e0684a", c2: "#a8301c", text: "#fff3e4", border: "rgba(255,220,190,0.6)" },
    ghost: { c1: "rgba(255,255,255,0.10)", c2: "rgba(255,255,255,0.04)", text: Theme.gold, border: "rgba(233,200,135,0.6)" },
    dark: { c1: "rgba(40,48,72,0.96)", c2: "rgba(24,29,48,0.96)", text: Theme.text, border: "rgba(233,200,135,0.35)" },
    green: { c1: "#8fdcaa", c2: "#2f8f5b", text: "#0f2f1c", border: "rgba(255,255,255,0.5)" }
  };
  var Button = class extends Widget {
    constructor(o) {
      super(o);
      this.label = o.label || "";
      this.style = o.style || "gold";
      this.size = o.size || 28;
      this.radius = o.radius === void 0 ? Math.min(this.h / 2, 16) : o.radius;
      this.iconRender = o.icon || null;
      this.textColor = o.textColor || null;
    }
    onDraw(ctx) {
      const s = ButtonStyles[this.style] || ButtonStyles.gold;
      const w = this.w, h = this.h;
      const g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, this.pressed ? s.c2 : s.c1);
      g2.addColorStop(1, this.pressed ? s.c1 : s.c2);
      roundRectPath(ctx, 0, 0, w, h, this.radius);
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.strokeStyle = s.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.25;
      roundRectPath(ctx, 3, 3, w - 6, h * 0.38, this.radius * 0.7);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
      if (this.iconRender) this.iconRender(ctx, this);
      if (this.label) {
        drawText(ctx, this.label, w / 2, h / 2 + this.size * 0.35, {
          size: this.size,
          align: "center",
          weight: "bold",
          color: this.textColor || s.text,
          stroke: 2,
          strokeColor: "rgba(0,0,0,0.18)"
        });
      }
    }
  };
  var ScrollView = class extends Widget {
    constructor(o) {
      super(o);
      this.contentH = o.contentH || this.h;
      this.offset = 0;
      this.velocity = 0;
      this.lastY = 0;
      this.dragging = false;
      this.bg = o.bg || null;
      this.radius = o.radius || 0;
      this.padding = o.padding || 0;
    }
    get maxOffset() {
      return Math.max(0, this.contentH - this.h);
    }
    onTouchStart(x, y) {
      this.dragging = true;
      this.lastY = y;
      this.velocity = 0;
      this._lastT = Date.now();
    }
    onTouchMove(x, y) {
      if (!this.dragging) return;
      const dy = y - this.lastY;
      this.lastY = y;
      this.offset -= dy;
      if (this.offset < 0) this.offset = 0;
      if (this.offset > this.maxOffset) this.offset = this.maxOffset;
      const now = Date.now();
      const dt = Math.max(1, now - (this._lastT || now));
      this.velocity = -dy / dt * 16;
      this._lastT = now;
    }
    onTouchEnd() {
      this.dragging = false;
    }
    update(dt) {
      if (!this.dragging && Math.abs(this.velocity) > 0.05) {
        this.offset += this.velocity * (dt / 16);
        this.velocity *= 0.92;
        if (this.offset < 0) {
          this.offset = 0;
          this.velocity = 0;
        }
        if (this.offset > this.maxOffset) {
          this.offset = this.maxOffset;
          this.velocity = 0;
        }
      }
      for (const c of this.children) if (c.update) c.update(dt);
    }
    draw(ctx) {
      if (!this.visible) return;
      ctx.save();
      ctx.globalAlpha *= this.alpha;
      ctx.translate(this.x, this.y);
      roundRectPath(ctx, 0, 0, this.w, this.h, this.radius);
      ctx.clip();
      if (this.bg) {
        ctx.fillStyle = this.bg;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      ctx.translate(0, -this.offset);
      for (const c of this.children) c.draw(ctx);
      ctx.restore();
      if (this.maxOffset > 0) {
        const th = Math.max(30, this.h * this.h / this.contentH);
        const ty = this.y + (this.h - th) * (this.offset / this.maxOffset);
        ctx.save();
        ctx.globalAlpha = 0.5;
        roundRectPath(ctx, this.x + this.w - 6, ty, 4, th, 2);
        ctx.fillStyle = Theme.gold;
        ctx.fill();
        ctx.restore();
      }
    }
    /** 命中测试需要考虑滚动偏移 */
    pick(x, y) {
      if (!this.visible) return null;
      const lx = x - this.x;
      const ly = y - this.y;
      if (lx < 0 || ly < 0 || lx > this.w || ly > this.h) return null;
      const cy = ly + this.offset;
      for (let i = this.children.length - 1; i >= 0; i--) {
        const r = this.children[i].pick(lx, cy);
        if (r) return r;
      }
      return this.interactive ? this : null;
    }
  };
  var Popup = class extends Widget {
    constructor(o) {
      o = o || {};
      super(Object.assign({ w: 750, h: 1334 }, o));
      this.closeOnMask = o.closeOnMask !== false;
      this.onClose = o.onClose || null;
      this.anim = 0;
      tween(this, { to: { anim: 1 }, dur: 220, ease: Ease.backOut });
    }
    close() {
      tween(this, { to: { anim: 0 }, dur: 160, onComplete: () => {
        if (this.parent && this.parent.removePopup) this.parent.removePopup(this);
        else if (this._scene) this._scene.removePopup(this);
        if (this.onClose) this.onClose();
      } });
    }
    onDraw(ctx) {
      ctx.save();
      ctx.globalAlpha = 0.62 * this.anim;
      ctx.fillStyle = "#05070d";
      ctx.fillRect(-this.x, -this.y, 750, 1334);
      ctx.restore();
    }
  };

  // js/scenes/common.js
  var NAV_ITEMS = [
    { key: "home", label: "\u4E3B\u57CE" },
    { key: "heroes", label: "\u795E\u5C06" },
    { key: "gacha", label: "\u7948\u613F" },
    { key: "bag", label: "\u80CC\u5305" },
    { key: "shop", label: "\u4ED9\u5E02" },
    { key: "stage", label: "\u6218\u5F79" },
    { key: "lineup", label: "\u9635\u5BB9" }
  ];
  var RES_TIPS = [
    "\u7075\u77F3\uFF1A\u5347\u7EA7\u795E\u5C06\u7684\u901A\u7528\u8D27\u5E01",
    "\u4ED9\u7389\uFF1A\u7A00\u6709\u8D27\u5E01\uFF0C\u7948\u613F\u62BD\u5361\u7528",
    "\u5C06\u9B42\uFF1A\u795E\u5C06\u5347\u661F\u6750\u6599\uFF0C\u7948\u613F\u4E0E\u6218\u6597\u4E2D\u83B7\u5F97",
    "\u8BF7\u795E\u7B26\uFF1A\u7948\u613F\u62BD\u5361\u6240\u9700\u9053\u5177",
    "\u4E91\u6C14\uFF1A\u51FA\u5F81\u6D88\u8017\uFF0C\u968F\u65F6\u95F4\u6062\u590D"
  ];
  function addTopBar(scene, opt) {
    opt = opt || {};
    const s = new Sprite({
      x: opt.x !== void 0 ? opt.x : 24,
      y: 26,
      w: opt.w || 702,
      h: 64,
      render: (ctx, w, h) => {
        drawTopBar(ctx, 0, 0, w, h, [
          { type: "coin", text: fmt(player.get("coin")) },
          { type: "jade", text: fmt(player.get("jade")) },
          { type: "soul", text: fmt(player.get("soul")) },
          { type: "ticket", text: fmt(player.get("ticket")) },
          { type: "stamina", text: `${player.get("stamina")}/${player.staminaMax}` }
        ]);
        const p = engine.pointer;
        if (p) {
          const mx = p.x - s.x;
          const my = p.y - s.y;
          const cellW = w / RES_TIPS.length;
          const R = h * 0.32 + 12;
          for (let i = 0; i < RES_TIPS.length; i++) {
            const ix = cellW * i + 22;
            const iy = h / 2;
            if ((mx - ix) ** 2 + (my - iy) ** 2 <= R * R) {
              engine.hoverTip = { x: p.x, y: s.y + h + 12, text: RES_TIPS[i] };
              break;
            }
          }
        }
      }
    });
    scene.add(s);
    scene.topBar = s;
    return s;
  }
  function fmt(n) {
    n = Math.max(0, Math.floor(n || 0));
    if (n >= 1e5) return (n / 1e4).toFixed(1) + "\u4E07";
    if (n >= 1e4) return (n / 1e4).toFixed(2) + "\u4E07";
    return String(n);
  }
  function addBackButton(scene, onBack) {
    const b = new Button({
      x: 20,
      y: 22,
      w: 96,
      h: 64,
      style: "dark",
      radius: 32,
      onClick: onBack || (() => goto("home")),
      icon: (ctx) => drawBackArrow(ctx, 48, 32, 1.1, "#f2e7d3")
    });
    scene.add(b);
    return b;
  }
  function addBottomNav(scene, current) {
    const nav = new Sprite({
      x: 0,
      y: 1224,
      w: 750,
      h: 110,
      render: (ctx, w, h) => {
        const g2 = ctx.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, "rgba(14,18,30,0.75)");
        g2.addColorStop(1, "rgba(8,10,18,0.98)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(233,200,135,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(w, 1);
        ctx.stroke();
      }
    });
    NAV_ITEMS.forEach((item, i) => {
      const bw = 750 / NAV_ITEMS.length;
      const b = new Button({
        x: i * bw,
        y: 0,
        w: bw,
        h: 110,
        style: "ghost",
        radius: 0,
        onClick: () => {
          if (item.key !== current) goto(item.key);
        }
      });
      b.render = null;
      b.onDraw = (ctx) => {
        const active = item.key === current;
        const cx = b.w / 2;
        if (active) {
          glow(ctx, cx, 48, 46, "rgba(233,200,135,0.45)", 0.6);
          roundRectPath(ctx, cx - 46, 12, 92, 66, 16);
          ctx.fillStyle = "rgba(233,200,135,0.18)";
          ctx.fill();
        }
        drawNavIcon(ctx, cx, 44, item.key, active);
        drawText(ctx, item.label, cx, 88, {
          size: 22,
          align: "center",
          weight: active ? "bold" : "normal",
          color: active ? "#ffe9b8" : Theme.textDim
        });
      };
      nav.add(b);
    });
    scene.add(nav);
    scene.nav = nav;
    return nav;
  }
  function drawNavIcon(ctx, cx, cy, key, active) {
    const color = active ? "#ffe9b8" : "#9aa4b8";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    switch (key) {
      case "home":
        ctx.beginPath();
        ctx.moveTo(-16, 4);
        ctx.lineTo(0, -12);
        ctx.lineTo(16, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, 2);
        ctx.lineTo(-12, 14);
        ctx.lineTo(12, 14);
        ctx.lineTo(12, 2);
        ctx.stroke();
        break;
      case "heroes":
        ctx.beginPath();
        ctx.arc(0, -4, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-11, 14);
        ctx.quadraticCurveTo(0, 0, 11, 14);
        ctx.stroke();
        break;
      case "gacha":
        ctx.beginPath();
        ctx.arc(0, 2, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, -2);
        ctx.lineTo(7, -2);
        ctx.stroke();
        break;
      case "stage":
        ctx.beginPath();
        ctx.moveTo(-12, 14);
        ctx.lineTo(-12, -12);
        ctx.lineTo(-2, -4);
        ctx.lineTo(-2, 14);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, 14);
        ctx.lineTo(2, -12);
        ctx.lineTo(13, -6);
        ctx.stroke();
        break;
      case "lineup":
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * 11, i % 2 === 0 ? -4 : 6, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case "bag":
        roundRectPath(ctx, -13, -7, 26, 19, 5);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-13, -3);
        ctx.quadraticCurveTo(0, -14, 13, -3);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
  function drawMountainBg(ctx, W, H, t) {
    const g2 = ctx.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0, "#1b2440");
    g2.addColorStop(0.45, "#182038");
    g2.addColorStop(1, "#0c1020");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.85;
    glow(ctx, W * 0.76, H * 0.16, 90, "rgba(255,240,200,0.5)", 0.55);
    ctx.beginPath();
    ctx.arc(W * 0.76, H * 0.16, 34, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,246,220,0.85)";
    ctx.fill();
    ctx.restore();
    const mountains = [
      { y: H * 0.42, h: 130, c: "rgba(30,42,68,0.9)" },
      { y: H * 0.52, h: 170, c: "rgba(22,30,52,0.95)" },
      { y: H * 0.62, h: 200, c: "rgba(14,18,34,0.98)" }
    ];
    for (const m of mountains) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, m.y);
      let x = 0;
      let dir = 1;
      while (x < W) {
        const w = 90 + x % 70;
        ctx.quadraticCurveTo(x + w / 2, m.y - m.h * (0.5 + x % 100 / 200) * dir, x + w, m.y);
        x += w;
        dir = dir === 1 ? 0.7 : 1;
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = m.c;
      ctx.fill();
    }
    const t2 = (t || 0) / 60;
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 5; i++) {
      const cx = (i * 210 + t2 * (14 + i * 4)) % (W + 300) - 150;
      const cy = H * (0.48 + i * 0.09);
      drawCloud(ctx, cx, cy, 1.4 + i * 0.2, "rgba(200,220,255,0.35)", 0.6);
    }
    ctx.restore();
  }
  function addTitleBar(scene, title, sub, onBack) {
    const s = new Sprite({
      x: 0,
      y: 0,
      w: 750,
      h: 100,
      render: () => {
      }
    });
    s.onDraw = (ctx) => drawTitleBar(ctx, title, sub);
    scene.add(s);
    if (onBack !== false) addBackButton(scene, onBack);
    return s;
  }
  function toast(text, type) {
    engine.toast(text, type);
  }

  // js/scenes/boot.js
  var BootScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      this.progress = 0;
      this.entered = false;
      const logo = new Sprite({
        x: 0,
        y: 380,
        w: 750,
        h: 300,
        render: (ctx, w, h) => {
          ctx.save();
          ctx.globalAlpha = Math.min(1, this.t / 500);
          glow(ctx, 375, 460, 200, "rgba(233,200,135,0.35)", 0.6);
          drawText(ctx, "\u795E\u8BDD\u7ED8\u5377", 375, 460, {
            size: 88,
            align: "center",
            weight: "bold",
            color: "#fff2cf",
            stroke: 6,
            strokeColor: "rgba(40,20,0,0.7)"
          });
          drawText(ctx, "\u4E2D \u56FD \u4F20 \u7EDF \u795E \u8BDD \xB7 \u5361 \u724C \u517B \u6210", 375, 530, {
            size: 26,
            align: "center",
            color: "#d8c8a8",
            stroke: 3,
            strokeColor: "rgba(0,0,0,0.5)"
          });
          ctx.restore();
        }
      });
      this.add(logo);
      this.bar = new Sprite({
        x: 195,
        y: 720,
        w: 360,
        h: 16,
        render: (ctx, w, h) => {
          roundRectPath(ctx, 0, 0, w, h, h / 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fill();
          roundRectPath(ctx, 2, 2, (w - 4) * this.progress, h - 4, (h - 4) / 2);
          ctx.fillStyle = Theme.gold;
          ctx.fill();
        }
      });
      this.add(this.bar);
      this.tipText = new Sprite({
        x: 0,
        y: 760,
        w: 750,
        h: 40,
        render: (ctx) => {
          drawText(ctx, this.progress >= 1 ? "\u8F7B\u89E6\u4EFB\u610F\u5904\u8FDB\u5165\u4E09\u754C" : "\u6B63\u5728\u5F00\u542F\u753B\u5377\u2026", 375, 20, {
            size: 24,
            align: "center",
            color: Theme.textDim
          });
        }
      });
      this.add(this.tipText);
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
      this.progress = Math.min(1, this.t / 1500);
    }
    onTouchStart() {
    }
    onTouchEnd() {
      if (this.progress >= 1 && !this.entered) {
        this.entered = true;
        goto("home");
      }
    }
    onClickAny() {
    }
  };
  register("boot", () => new BootScene());

  // js/art/images.js
  var HERO_FILES = {
    // 'wukong': ['assets/wukong2.png', '../assets/wukong2.png']
  };
  var loaded = /* @__PURE__ */ Object.create(null);
  var INLINE = typeof globalThis !== "undefined" && globalThis.__ASSETS__ || null;
  function supported() {
    return typeof Image !== "undefined" || typeof wx !== "undefined" && wx.createImage;
  }
  function makeImage() {
    if (typeof Image !== "undefined") return new Image();
    if (typeof wx !== "undefined" && wx.createImage) return wx.createImage();
    return null;
  }
  function candidatesFor(id) {
    if (HERO_FILES[id]) return HERO_FILES[id];
    return [
      `assets/${id}.png`,
      `../assets/${id}.png`,
      `web/assets/${id}.png`
    ];
  }
  function ensureLoad(id) {
    if (loaded[id] !== void 0) return;
    loaded[id] = null;
    if (INLINE && INLINE[id]) {
      const img2 = makeImage();
      if (img2) {
        img2.onload = () => {
          loaded[id] = img2;
        };
        img2.src = INLINE[id];
        return;
      }
    }
    if (!supported()) return;
    const cands = candidatesFor(id);
    const img = makeImage();
    if (!img) {
      loaded[id] = null;
      return;
    }
    let i = 0;
    img.onload = () => {
      loaded[id] = img;
    };
    img.onerror = () => {
      i++;
      if (i < cands.length) img.src = cands[i];
      else loaded[id] = null;
    };
    img.src = cands[0];
  }
  function heroImage(id) {
    ensureLoad(id);
    return loaded[id] || null;
  }
  function heroImageReady(id) {
    ensureLoad(id);
    const v = loaded[id];
    return !!(v && (v.width || v.naturalWidth));
  }

  // js/art/heroart.js
  var SKIN = "#f7ddc4";
  var SKIN_SHADOW = "#e3bfa1";
  var ART_FX = {
    nezha: { eyes: "fierce", brow: "angry", mark: "lotus", faceW: 0.92, shoulder: 0.92 },
    wukong: { eyes: "round", brow: "thick", mark: "fur", furColor: "#a8722f", faceW: 0.95, shoulder: 1.05, nose: "monkey" },
    yangjian: { eyes: "narrow", brow: "thick", mark: "thirdEye", shoulder: 1.12, armor: true },
    jiangziya: { eyes: "narrow", brow: "thin", beard: "long", beardColor: "#eaeaea", browColor: "#e6e6e6" },
    nvwa: { eyes: "narrow", brow: "thin", blush: 0.45, lip: "#d86a7a", faceW: 0.82, shoulder: 0.82, feminine: true },
    fuxi: { eyes: "narrow", brow: "thin", beard: "goatee", shoulder: 0.95 },
    shennong: { eyes: "narrow", brow: "thin", beard: "goatee", beardColor: "#6a5a3a" },
    huangdi: { eyes: "narrow", brow: "thick", beard: "goatee", shoulder: 1.15, armor: true },
    chiyou: { eyes: "fierce", brow: "angry", beard: "full", mark: "bone", shoulder: 1.25, armor: true, faceW: 1, hornScale: 1.3 },
    houyi: { eyes: "fierce", brow: "thick", shoulder: 1.05, armor: true },
    change: { eyes: "narrow", brow: "thin", blush: 0.45, lip: "#d86a7a", faceW: 0.82, shoulder: 0.8, feminine: true },
    kuafu: { eyes: "fierce", brow: "thick", beard: "full", shoulder: 1.28, faceW: 1.02 },
    pangu: { eyes: "fierce", brow: "thick", beard: "full", beardColor: "#6a6a75", shoulder: 1.3, armor: true },
    zhulong: { eyes: "fierce", brow: "angry", mark: "scale", shoulder: 1.1, hornScale: 1.25 },
    baize: { eyes: "narrow", brow: "thin", beard: "goatee", beardColor: "#e8e8f0", browColor: "#e8e8f0" },
    qinglong: { eyes: "narrow", brow: "angry", mark: "scale", shoulder: 1.1, hornScale: 1.35 },
    baihu: { eyes: "fierce", brow: "angry", mark: "fur", furColor: "#f0f0f8", shoulder: 1.15 },
    zhuque: { eyes: "narrow", brow: "thin", blush: 0.4, lip: "#d86060", faceW: 0.84, shoulder: 0.88, feminine: true },
    xuanwu: { eyes: "narrow", brow: "thick", beard: "full", shoulder: 1.25, armor: true },
    taibai: { eyes: "narrow", brow: "thin", beard: "long", beardColor: "#f0f0e8", browColor: "#f0f0e8", faceW: 0.95 },
    litianwang: { eyes: "fierce", brow: "thick", beard: "goatee", shoulder: 1.2, armor: true },
    niumowang: { eyes: "fierce", brow: "thick", beard: "full", shoulder: 1.32, faceW: 1.05, nose: "bull", hornScale: 1.55 },
    honghaier: { eyes: "round", brow: "thin", blush: 0.5, faceW: 0.95, mark: "lotus", shoulder: 0.85 },
    aoguang: { eyes: "narrow", brow: "thick", beard: "goatee", mark: "scale", shoulder: 1.05 },
    leizhenzi: { eyes: "fierce", brow: "angry", skin: "#cfe0ec", shoulder: 1.1 },
    xuannv: { eyes: "narrow", brow: "thin", blush: 0.42, lip: "#d86a7a", faceW: 0.83, shoulder: 0.82, feminine: true },
    xiwangmu: { eyes: "narrow", brow: "thin", blush: 0.35, lip: "#c86a6a", faceW: 0.86, shoulder: 0.86, feminine: true },
    laojun: { eyes: "narrow", brow: "thin", beard: "long", beardColor: "#f4f4f4", browColor: "#f4f4f4", faceW: 0.98 },
    jingwei: { eyes: "round", brow: "thin", blush: 0.5, faceW: 0.92, shoulder: 0.8, feminine: true },
    xingtian: { eyes: "fierce", brow: "angry", shoulder: 1.28, faceW: 1, armor: true },
    gonggong: { eyes: "fierce", brow: "angry", mark: "scale", shoulder: 1.2, hornScale: 1.2 },
    zhurong: { eyes: "fierce", brow: "angry", beard: "full", shoulder: 1.15 },
    tudigong: { eyes: "narrow", brow: "thin", beard: "goatee", beardColor: "#f0f0e8", browColor: "#f0f0e8", blush: 0.38, faceW: 1.08, nose: "red" },
    mengpo: { eyes: "narrow", brow: "thin", blush: 0.15, faceW: 0.9, shoulder: 0.85, feminine: true },
    yanluo: { eyes: "fierce", brow: "angry", beard: "goatee", faceW: 0.95, shoulder: 1.1 },
    houtu: { eyes: "narrow", brow: "thin", blush: 0.3, lip: "#c87a6a", faceW: 0.88, shoulder: 0.9, feminine: true },
    donghuang: { eyes: "narrow", brow: "thick", beard: "goatee", shoulder: 1.15 },
    taiyi: { eyes: "narrow", brow: "thin", beard: "goatee", beardColor: "#4a4038" }
  };
  function fxOf(hero) {
    return Object.assign({}, ART_FX[hero.id] || {}, hero.art || {});
  }
  function drawWeapon(ctx, type, x, y, s, art) {
    const gold = art.trim || "#e9c887";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const shaft = (len, w, c) => {
      ctx.strokeStyle = c || "#6b4a2c";
      ctx.lineWidth = w || 7;
      ctx.beginPath();
      ctx.moveTo(0, -len / 2);
      ctx.lineTo(0, len / 2);
      ctx.stroke();
    };
    const blade = (w, h, c) => {
      const g2 = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g2.addColorStop(0, "#ffffff");
      g2.addColorStop(0.5, c || "#cfd8e6");
      g2.addColorStop(1, "#8b95a8");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.quadraticCurveTo(w / 2, -h / 6, w / 2, h / 6);
      ctx.quadraticCurveTo(0, h / 2 - 4, -w / 2, h / 6);
      ctx.quadraticCurveTo(-w / 2, -h / 6, 0, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    switch (type) {
      case "spear":
        shaft(150, 7);
        blade(22, 62, "#ffd8a8");
        ctx.fillStyle = "#e0533c";
        ctx.beginPath();
        ctx.moveTo(0, -74);
        ctx.quadraticCurveTo(12, -52, 0, -30);
        ctx.quadraticCurveTo(-12, -52, 0, -74);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.lineTo(14, -18);
        ctx.stroke();
        break;
      case "staff":
        shaft(160, 11, "#b9863c");
        ctx.strokeStyle = gold;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(0, -78);
        ctx.lineTo(0, -66);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 66);
        ctx.lineTo(0, 78);
        ctx.stroke();
        ctx.strokeStyle = "#fff6dd";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-3, -60);
        ctx.lineTo(-3, 60);
        ctx.stroke();
        break;
      case "blade3":
        shaft(150, 7);
        ctx.fillStyle = "#d8e2f0";
        ctx.beginPath();
        ctx.moveTo(0, -86);
        ctx.lineTo(20, -40);
        ctx.lineTo(26, -6);
        ctx.lineTo(0, -14);
        ctx.lineTo(-26, -6);
        ctx.lineTo(-20, -40);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;
      case "bow":
        ctx.strokeStyle = "#7a4a28";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 62, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.strokeStyle = "rgba(240,240,240,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(46 * Math.cos(-0.42 * Math.PI), 46 * Math.sin(-0.42 * Math.PI));
        ctx.lineTo(46 * Math.cos(0.42 * Math.PI), 46 * Math.sin(0.42 * Math.PI));
        ctx.stroke();
        ctx.strokeStyle = "#ffdca0";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(56, 0);
        ctx.stroke();
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.moveTo(64, 0);
        ctx.lineTo(50, -7);
        ctx.lineTo(50, 7);
        ctx.closePath();
        ctx.fill();
        break;
      case "sword":
        shaft(30, 9, "#5a4630");
        blade(20, 110, "#e8f0ff");
        ctx.strokeStyle = gold;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-16, 42);
        ctx.lineTo(16, 42);
        ctx.stroke();
        ctx.fillStyle = "#c8452f";
        ctx.beginPath();
        ctx.moveTo(0, 78);
        ctx.lineTo(-8, 96);
        ctx.lineTo(8, 96);
        ctx.closePath();
        ctx.fill();
        break;
      case "axe":
        shaft(140, 9, "#6b4a2c");
        {
          const g2 = ctx.createLinearGradient(-40, 0, 40, 0);
          g2.addColorStop(0, "#c3ccdb");
          g2.addColorStop(1, "#7d879a");
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.moveTo(0, -46);
          ctx.quadraticCurveTo(46, -56, 52, -14);
          ctx.quadraticCurveTo(30, -2, 0, -2);
          ctx.quadraticCurveTo(-30, -2, -52, -14);
          ctx.quadraticCurveTo(-46, -56, 0, -46);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = gold;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        break;
      case "gourd":
        ctx.fillStyle = "#d99a3e";
        ctx.beginPath();
        ctx.arc(0, -22, 20, Math.PI, 0);
        ctx.quadraticCurveTo(26, -4, 14, 12);
        ctx.arc(0, 34, 32, 0, Math.PI, true);
        ctx.quadraticCurveTo(-26, -4, -14, 12);
        ctx.arc(0, -22, 20, Math.PI, 0, true);
        ctx.fill();
        ctx.strokeStyle = "#8a5a20";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#7a4a18";
        ctx.fillRect(-7, -44, 14, 12);
        break;
      case "fan":
        ctx.fillStyle = "#8fc98a";
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.quadraticCurveTo(-58, 20, -46, -36);
        ctx.quadraticCurveTo(0, -52, 46, -36);
        ctx.quadraticCurveTo(58, 20, 0, 40);
        ctx.fill();
        ctx.strokeStyle = "#4f7a4a";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 38);
          ctx.lineTo(i * 18, -40);
          ctx.stroke();
        }
        break;
      case "tower":
        for (let i = 0; i < 4; i++) {
          const w = 46 - i * 8;
          const yy = 40 - i * 30;
          ctx.fillStyle = i % 2 ? "#d9b463" : "#e8cf94";
          ctx.beginPath();
          ctx.moveTo(-w, yy);
          ctx.quadraticCurveTo(0, yy - 12, w, yy);
          ctx.lineTo(w, yy + 8);
          ctx.lineTo(-w, yy + 8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#8a6420";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.moveTo(0, -74);
        ctx.lineTo(-8, -56);
        ctx.lineTo(8, -56);
        ctx.closePath();
        ctx.fill();
        break;
      case "brush":
        shaft(120, 6, "#4a3a2a");
        ctx.fillStyle = "#f2f2f2";
        ctx.beginPath();
        ctx.moveTo(0, -78);
        ctx.quadraticCurveTo(10, -56, 0, -50);
        ctx.quadraticCurveTo(-10, -56, 0, -78);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-10, 52);
        ctx.lineTo(10, 52);
        ctx.stroke();
        break;
      case "lotus":
        ctx.fillStyle = "#ffd5e2";
        for (let i = -2; i <= 2; i++) {
          ctx.save();
          ctx.rotate(i * 0.34);
          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.quadraticCurveTo(-16, -18, 0, -46);
          ctx.quadraticCurveTo(16, -18, 0, 20);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#ffe9a8";
        circleAt(ctx, 0, -14, 10);
        break;
      case "scroll":
        ctx.fillStyle = "#f2e6c8";
        roundRectPath(ctx, -42, -26, 84, 52, 6);
        ctx.fill();
        ctx.strokeStyle = "#b09a68";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#7a5a30";
        ctx.fillRect(-50, -30, 12, 60);
        ctx.fillRect(38, -30, 12, 60);
        ctx.strokeStyle = "rgba(120,90,50,0.55)";
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-28, i * 12);
          ctx.lineTo(28, i * 12);
          ctx.stroke();
        }
        break;
      case "hammer":
        shaft(120, 9, "#5a4630");
        ctx.fillStyle = "#8f98ad";
        roundRectPath(ctx, -26, -74, 52, 44, 8);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = "#ffe9a8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -66);
        ctx.lineTo(-6, -54);
        ctx.lineTo(-14, -46);
        ctx.stroke();
        break;
      case "shieldAxe":
        ctx.fillStyle = "#a8b0c2";
        ctx.beginPath();
        ctx.arc(-24, -10, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.save();
        ctx.translate(30, 0);
        ctx.rotate(-0.3);
        shaft(90, 8, "#6b4a2c");
        {
          const g3 = ctx.createLinearGradient(-30, 0, 30, 0);
          g3.addColorStop(0, "#cfd8e6");
          g3.addColorStop(1, "#7d879a");
          ctx.fillStyle = g3;
          ctx.beginPath();
          ctx.moveTo(0, -34);
          ctx.quadraticCurveTo(34, -40, 38, -6);
          ctx.quadraticCurveTo(20, 0, 0, 0);
          ctx.quadraticCurveTo(-20, 0, -34, -4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        break;
      case "orb":
        {
          const g4 = ctx.createRadialGradient(-8, -10, 4, 0, 0, 34);
          g4.addColorStop(0, "#ffffff");
          g4.addColorStop(0.4, art.robe ? art.robe[0] : "#9ad7f5");
          g4.addColorStop(1, art.robe ? art.robe[1] : "#2f6fa0");
          circleAt(ctx, 0, 0, 32, g4);
          ctx.strokeStyle = gold;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case "peach":
        ctx.fillStyle = "#ffcfd8";
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e08f9f";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#7fc98a";
        ctx.beginPath();
        ctx.moveTo(8, -26);
        ctx.quadraticCurveTo(38, -34, 34, -12);
        ctx.quadraticCurveTo(20, -22, 8, -26);
        ctx.fill();
        break;
      case "ruyi":
        ctx.strokeStyle = gold;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-30, 40);
        ctx.quadraticCurveTo(10, 10, 26, -22);
        ctx.stroke();
        ctx.fillStyle = "#f6e2b0";
        ctx.beginPath();
        ctx.ellipse(30, -28, 16, 12, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b8894a";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "qin":
        ctx.save();
        ctx.rotate(-0.35);
        ctx.fillStyle = "#7a4a28";
        roundRectPath(ctx, -60, -12, 120, 26, 12);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,240,200,0.7)";
        ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(-50, i * 4);
          ctx.lineTo(50, i * 4);
          ctx.stroke();
        }
        ctx.restore();
        break;
      case "censer":
        ctx.fillStyle = "#8f7a5a";
        ctx.beginPath();
        ctx.arc(0, 6, 36, 0, Math.PI);
        ctx.lineTo(36, 22);
        ctx.lineTo(-36, 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#6a5640";
        ctx.fillRect(-40, -14, 80, 14);
        glow(ctx, 0, -30, 34, "rgba(255,180,90,0.9)", 0.85);
        break;
      case "whip":
        ctx.strokeStyle = "#4a3a2a";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-20, 60);
        ctx.quadraticCurveTo(30, 20, 10, -20);
        ctx.quadraticCurveTo(-6, -50, 24, -70);
        ctx.stroke();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 60);
        ctx.quadraticCurveTo(30, 20, 10, -20);
        ctx.stroke();
        break;
      case "stone":
        {
          const g6 = ctx.createLinearGradient(-30, -30, 30, 30);
          g6.addColorStop(0, "#ffe9b0");
          g6.addColorStop(1, "#c98a4a");
          ctx.fillStyle = g6;
          ctx.beginPath();
          ctx.moveTo(-28, 10);
          ctx.lineTo(-14, -30);
          ctx.lineTo(18, -26);
          ctx.lineTo(30, 8);
          ctx.lineTo(6, 30);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#8a5a20";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          glow(ctx, 0, 0, 40, "rgba(255,220,150,0.8)", 0.6);
        }
        break;
      case "water":
        ctx.strokeStyle = "#7fc4e8";
        ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-40, -20 + i * 22);
          ctx.quadraticCurveTo(-14, -40 + i * 22, 0, -20 + i * 22);
          ctx.quadraticCurveTo(16, -2 + i * 22, 40, -20 + i * 22);
          ctx.stroke();
        }
        break;
      default:
        break;
    }
    ctx.restore();
  }
  function circleAt(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.width || img.naturalWidth;
    const ih = img.height || img.naturalHeight;
    if (!iw || !ih) return false;
    const s = Math.max(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    return true;
  }
  function drawHair(ctx, cx, headCY, hr, style, hair, art) {
    ctx.fillStyle = hair;
    ctx.strokeStyle = hair;
    ctx.lineCap = "round";
    const hs = art.hornScale || 1;
    const top = () => {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 1.02, headCY + hr * 0.25);
      ctx.quadraticCurveTo(cx - hr * 1.1, headCY - hr * 1.15, cx, headCY - hr * 1.18);
      ctx.quadraticCurveTo(cx + hr * 1.1, headCY - hr * 1.15, cx + hr * 1.02, headCY + hr * 0.25);
      ctx.quadraticCurveTo(cx + hr * 0.7, headCY - hr * 0.42, cx, headCY - hr * 0.38);
      ctx.quadraticCurveTo(cx - hr * 0.7, headCY - hr * 0.42, cx - hr * 1.02, headCY + hr * 0.25);
      ctx.closePath();
      ctx.fill();
    };
    switch (style) {
      case "double":
        top();
        circleAt(ctx, cx - hr * 1.05, headCY - hr * 0.95, hr * 0.46, hair);
        circleAt(ctx, cx + hr * 1.05, headCY - hr * 0.95, hr * 0.46, hair);
        ctx.fillStyle = art.trim || "#e9c887";
        circleAt(ctx, cx - hr * 1.05, headCY - hr * 1.28, hr * 0.15, art.trim || "#e9c887");
        circleAt(ctx, cx + hr * 1.05, headCY - hr * 1.28, hr * 0.15, art.trim || "#e9c887");
        break;
      case "nezha":
        {
          ctx.beginPath();
          ctx.moveTo(cx - hr * 1.02, headCY + hr * 0.2);
          ctx.quadraticCurveTo(cx - hr * 1.1, headCY - hr * 1.05, cx, headCY - hr * 1.1);
          ctx.quadraticCurveTo(cx + hr * 1.1, headCY - hr * 1.05, cx + hr * 1.02, headCY + hr * 0.2);
          ctx.quadraticCurveTo(cx, headCY - hr * 0.3, cx - hr * 1.02, headCY + hr * 0.2);
          ctx.closePath();
          ctx.fill();
          const spike = (bx, bh, tip, curve) => {
            ctx.beginPath();
            ctx.moveTo(cx + (bx - 0.2) * hr, headCY - hr * 0.5);
            ctx.quadraticCurveTo(cx + (bx + curve) * hr, headCY - hr * (bh + 0.5), cx + (bx + tip) * hr, headCY - hr * (bh + 1));
            ctx.quadraticCurveTo(cx + (bx + 0.22 + curve * 0.5) * hr, headCY - hr * (bh + 0.25), cx + (bx + 0.2) * hr, headCY - hr * 0.55);
            ctx.closePath();
            ctx.fill();
          };
          spike(-1, 0.5, -0.15, -0.2);
          spike(-0.62, 0.72, -0.2, -0.12);
          spike(-0.24, 0.95, -0.05, -0.08);
          spike(0.16, 0.92, 0.3, 0.06);
          spike(0.56, 0.72, 0.6, 0.14);
          spike(0.95, 0.45, 0.85, 0.2);
          ctx.beginPath();
          ctx.moveTo(cx - hr * 0.5, headCY - hr * 0.55);
          ctx.quadraticCurveTo(cx - hr * 0.3, headCY - hr * 0.95, cx - hr * 0.05, headCY - hr * 0.6);
          ctx.quadraticCurveTo(cx - hr * 0.28, headCY - hr * 0.5, cx - hr * 0.5, headCY - hr * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx + hr * 0.1, headCY - hr * 0.58);
          ctx.quadraticCurveTo(cx + hr * 0.4, headCY - hr * 1, cx + hr * 0.62, headCY - hr * 0.6);
          ctx.quadraticCurveTo(cx + hr * 0.36, headCY - hr * 0.5, cx + hr * 0.1, headCY - hr * 0.58);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case "bun":
        top();
        circleAt(ctx, cx, headCY - hr * 1.4, hr * 0.52, hair);
        ctx.strokeStyle = art.trim || "#e9c887";
        ctx.lineWidth = hr * 0.16;
        ctx.beginPath();
        ctx.arc(cx, headCY - hr * 1.4, hr * 0.52, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "wild":
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.15, headCY + hr * 0.5);
        ctx.quadraticCurveTo(cx - hr * 1.5, headCY - hr * 1.4, cx, headCY - hr * 1.3);
        ctx.quadraticCurveTo(cx + hr * 1.5, headCY - hr * 1.4, cx + hr * 1.15, headCY + hr * 0.5);
        ctx.quadraticCurveTo(cx + hr * 0.6, headCY - hr * 0.3, cx, headCY - hr * 0.28);
        ctx.quadraticCurveTo(cx - hr * 0.6, headCY - hr * 0.3, cx - hr * 1.15, headCY + hr * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.ellipse(cx - hr * 1.2, headCY + hr * 0.2, hr * 0.34, hr * 0.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + hr * 1.2, headCY + hr * 0.2, hr * 0.34, hr * 0.7, -0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "daoist":
        top();
        ctx.fillStyle = hair;
        roundRectPath(ctx, cx - hr * 0.4, headCY - hr * 1.95, hr * 0.8, hr * 0.9, hr * 0.3);
        ctx.fill();
        ctx.strokeStyle = art.trim || "#e9c887";
        ctx.lineWidth = hr * 0.13;
        ctx.beginPath();
        ctx.arc(cx, headCY - hr * 1.05, hr * 1.02, Math.PI * 0.95, Math.PI * 0.05);
        ctx.stroke();
        break;
      case "long":
        top();
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.05, headCY);
        ctx.quadraticCurveTo(cx - hr * 1.9, headCY + hr * 2.6, cx - hr * 0.7, headCY + hr * 3.1);
        ctx.lineTo(cx - hr * 0.35, headCY + hr * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + hr * 1.05, headCY);
        ctx.quadraticCurveTo(cx + hr * 1.9, headCY + hr * 2.6, cx + hr * 0.7, headCY + hr * 3.1);
        ctx.lineTo(cx + hr * 0.35, headCY + hr * 0.9);
        ctx.closePath();
        ctx.fill();
        break;
      case "helmet":
        top();
        ctx.fillStyle = "#c8b48a";
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.15, headCY - hr * 0.15);
        ctx.quadraticCurveTo(cx, headCY - hr * 1.9, cx + hr * 1.15, headCY - hr * 0.15);
        ctx.quadraticCurveTo(cx, headCY - hr * 0.75, cx - hr * 1.15, headCY - hr * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = art.trim || "#e9c887";
        ctx.lineWidth = hr * 0.12;
        ctx.stroke();
        ctx.fillStyle = "#c8452f";
        ctx.beginPath();
        ctx.moveTo(cx, headCY - hr * 1.85);
        ctx.quadraticCurveTo(cx + hr * 0.3, headCY - hr * 2.5, cx + hr * 0.55, headCY - hr * 2.1);
        ctx.quadraticCurveTo(cx + hr * 0.3, headCY - hr * 1.8, cx, headCY - hr * 1.85);
        ctx.fill();
        break;
      case "horns":
        top();
        {
          const hc = art.hornColor || "#dcd2b8";
          ctx.strokeStyle = hc;
          ctx.lineWidth = hr * 0.3 * hs;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(cx - hr * 0.85, headCY - hr * 0.95);
          ctx.quadraticCurveTo(cx - hr * (0.85 + 0.65 * hs), headCY - hr * (0.95 + 0.65 * hs), cx - hr * (0.65 + 0.4 * hs), headCY - hr * (0.95 + 1.05 * hs));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + hr * 0.85, headCY - hr * 0.95);
          ctx.quadraticCurveTo(cx + hr * (0.85 + 0.65 * hs), headCY - hr * (0.95 + 0.65 * hs), cx + hr * (0.65 + 0.4 * hs), headCY - hr * (0.95 + 1.05 * hs));
          ctx.stroke();
        }
        break;
      case "high":
        top();
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.ellipse(cx, headCY - hr * 1.5, hr * 0.75, hr * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - hr * 0.9, headCY - hr * 0.3, hr * 0.4, hr * 0.9, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + hr * 0.9, headCY - hr * 0.3, hr * 0.4, hr * 0.9, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = art.trim || "#e9c887";
        circleAt(ctx, cx - hr * 0.95, headCY - hr * 1.1, hr * 0.1, art.trim || "#e9c887");
        circleAt(ctx, cx + hr * 0.95, headCY - hr * 1.1, hr * 0.1, art.trim || "#e9c887");
        break;
      default:
        top();
    }
  }
  function drawHeadwear(ctx, type, cx, headCY, hr, art) {
    const gold = art.trim || "#e9c887";
    switch (type) {
      case "jingu":
        ctx.strokeStyle = gold;
        ctx.lineWidth = hr * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.05, headCY - hr * 0.42);
        ctx.quadraticCurveTo(cx, headCY - hr * 0.78, cx + hr * 1.05, headCY - hr * 0.42);
        ctx.stroke();
        circleAt(ctx, cx, headCY - hr * 0.62, hr * 0.1, "#fff6dd");
        break;
      case "crown":
        ctx.fillStyle = "#2f2a22";
        roundRectPath(ctx, cx - hr * 0.85, headCY - hr * 1.15, hr * 1.7, hr * 0.5, hr * 0.12);
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = hr * 0.12;
        ctx.stroke();
        ctx.fillStyle = gold;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * hr * 0.55, headCY - hr * 1.2);
          ctx.lineTo(cx + i * hr * 0.55, headCY - hr * 1.75);
          ctx.stroke();
        }
        break;
      case "lotus":
        ctx.fillStyle = "#ffd5e2";
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * hr * 0.6 - hr * 0.2, headCY - hr * 0.7);
          ctx.quadraticCurveTo(cx + i * hr * 0.6 - hr * 0.45, headCY - hr * 1.3, cx + i * hr * 0.6, headCY - hr * 1.5);
          ctx.quadraticCurveTo(cx + i * hr * 0.6 + hr * 0.45, headCY - hr * 1.3, cx + i * hr * 0.6 + hr * 0.2, headCY - hr * 0.7);
          ctx.fill();
        }
        break;
      case "headband":
        ctx.strokeStyle = "#c8452f";
        ctx.lineWidth = hr * 0.26;
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.02, headCY - hr * 0.3);
        ctx.quadraticCurveTo(cx, headCY - hr * 0.62, cx + hr * 1.02, headCY - hr * 0.3);
        ctx.stroke();
        ctx.strokeStyle = gold;
        ctx.lineWidth = hr * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx - hr * 1.02, headCY - hr * 0.3);
        ctx.quadraticCurveTo(cx, headCY - hr * 0.62, cx + hr * 1.02, headCY - hr * 0.3);
        ctx.stroke();
        break;
      case "feather":
        ctx.strokeStyle = "#8fdcaa";
        ctx.lineWidth = hr * 0.14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + hr * 0.7, headCY - hr * 1);
        ctx.quadraticCurveTo(cx + hr * 1.9, headCY - hr * 2, cx + hr * 1.4, headCY - hr * 2.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.7, headCY - hr * 1);
        ctx.quadraticCurveTo(cx - hr * 1.9, headCY - hr * 2, cx - hr * 1.4, headCY - hr * 2.6);
        ctx.stroke();
        break;
      case "halo":
        ctx.strokeStyle = "rgba(255,240,190,0.9)";
        ctx.lineWidth = hr * 0.13;
        ctx.beginPath();
        ctx.arc(cx, headCY - hr * 0.1, hr * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        break;
      default:
        break;
    }
  }
  function drawBeard(ctx, cx, cy, hr, art) {
    const type = art.beard;
    if (!type || type === "none") return;
    const color = art.beardColor || art.hair || "#e8e8e8";
    const fw = art.faceW || 1;
    ctx.fillStyle = color;
    if (type === "goatee") {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.3, cy + hr * 0.5);
      ctx.quadraticCurveTo(cx, cy + hr * 1.35, cx + hr * 0.3, cy + hr * 0.5);
      ctx.quadraticCurveTo(cx, cy + hr * 0.72, cx - hr * 0.3, cy + hr * 0.5);
      ctx.fill();
    } else if (type === "long") {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.52 * fw, cy + hr * 0.42);
      ctx.quadraticCurveTo(cx - hr * 0.6 * fw, cy + hr * 1.7, cx, cy + hr * 2.1);
      ctx.quadraticCurveTo(cx + hr * 0.6 * fw, cy + hr * 1.7, cx + hr * 0.52 * fw, cy + hr * 0.42);
      ctx.quadraticCurveTo(cx, cy + hr * 0.88, cx - hr * 0.52 * fw, cy + hr * 0.42);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = hr * 0.09;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.05, cy + hr * 0.4);
      ctx.quadraticCurveTo(cx - hr * 0.28, cy + hr * 0.46, cx - hr * 0.4, cy + hr * 0.36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + hr * 0.05, cy + hr * 0.4);
      ctx.quadraticCurveTo(cx + hr * 0.28, cy + hr * 0.46, cx + hr * 0.4, cy + hr * 0.36);
      ctx.stroke();
    } else if (type === "full") {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.95 * fw, cy - hr * 0.05);
      ctx.quadraticCurveTo(cx - hr * 1 * fw, cy + hr * 0.85, cx, cy + hr * 1.3);
      ctx.quadraticCurveTo(cx + hr * 1 * fw, cy + hr * 0.85, cx + hr * 0.95 * fw, cy - hr * 0.05);
      ctx.quadraticCurveTo(cx + hr * 0.5 * fw, cy + hr * 0.5, cx, cy + hr * 0.55);
      ctx.quadraticCurveTo(cx - hr * 0.5 * fw, cy + hr * 0.5, cx - hr * 0.95 * fw, cy - hr * 0.05);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,30,20,0.6)";
      ctx.lineWidth = hr * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.13, cy + hr * 0.5);
      ctx.quadraticCurveTo(cx, cy + hr * 0.58, cx + hr * 0.13, cy + hr * 0.5);
      ctx.stroke();
    }
  }
  function drawMark(ctx, cx, cy, hr, art) {
    const mark = art.mark;
    if (!mark || mark === "fur") return;
    if (mark === "thirdEye") {
      ctx.fillStyle = "#fff8e8";
      ctx.strokeStyle = "#c8a04a";
      ctx.lineWidth = hr * 0.05;
      ctx.beginPath();
      ctx.ellipse(cx, cy - hr * 0.42, hr * 0.09, hr * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7a5a20";
      ctx.beginPath();
      ctx.ellipse(cx, cy - hr * 0.42, hr * 0.035, hr * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mark === "lotus") {
      ctx.fillStyle = "#e0392a";
      ctx.beginPath();
      ctx.moveTo(cx, cy - hr * 0.74);
      ctx.quadraticCurveTo(cx + hr * 0.1, cy - hr * 0.52, cx, cy - hr * 0.28);
      ctx.quadraticCurveTo(cx - hr * 0.1, cy - hr * 0.52, cx, cy - hr * 0.74);
      ctx.fill();
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * hr * 0.05, cy - hr * 0.66);
        ctx.quadraticCurveTo(cx + dir * hr * 0.22, cy - hr * 0.5, cx + dir * hr * 0.07, cy - hr * 0.32);
        ctx.quadraticCurveTo(cx + dir * hr * 0.01, cy - hr * 0.5, cx + dir * hr * 0.05, cy - hr * 0.66);
        ctx.fill();
      }
    } else if (mark === "scale") {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = art.trim || "#e9c887";
      ctx.lineWidth = hr * 0.06;
      for (const dir of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(cx + dir * hr * 0.72, cy - hr * 0.25 + i * hr * 0.3, hr * 0.16, dir > 0 ? Math.PI * 0.9 : Math.PI * 0.1, dir > 0 ? Math.PI * 2.1 : Math.PI * 1.1);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (mark === "bone") {
      ctx.strokeStyle = "rgba(200,60,40,0.85)";
      ctx.lineWidth = hr * 0.07;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.5, cy - hr * 0.55);
      ctx.quadraticCurveTo(cx - hr * 0.2, cy - hr * 0.35, cx - hr * 0.3, cy - hr * 0.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + hr * 0.5, cy - hr * 0.55);
      ctx.quadraticCurveTo(cx + hr * 0.2, cy - hr * 0.35, cx + hr * 0.3, cy - hr * 0.05);
      ctx.stroke();
    }
  }
  function drawFurRing(ctx, cx, cy, hr, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + Math.PI * i / n;
      const r = i % 2 === 0 ? hr * 1.02 : hr * 1.24;
      const px = cx + Math.cos(a) * r * 0.92;
      const py = cy + Math.sin(a) * r * 0.88;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = hr * 0.06;
    ctx.lineCap = "round";
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * hr * 0.85, cy + hr * (0.18 + i * 0.16));
        ctx.lineTo(cx + dir * hr * (1.15 + i * 0.08), cy + hr * (0.24 + i * 0.16));
        ctx.stroke();
      }
    }
  }
  function drawFace(ctx, cx, cy, hr, art) {
    const eyes = art.eyes || "normal";
    const fw = art.faceW || 1;
    const browC = art.browColor || "#3a2c22";
    const ex = hr * 0.36;
    const ey = cy + hr * 0.1;
    ctx.strokeStyle = browC;
    ctx.lineCap = "round";
    ctx.lineWidth = hr * (art.brow === "thick" ? 0.17 : art.brow === "thin" ? 0.075 : 0.11);
    const tilt = art.brow === "angry" || eyes === "fierce" ? hr * 0.18 : 0;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      if (art.brow === "thin") {
        ctx.moveTo(cx + dir * (ex + hr * 0.28), cy - hr * (0.1 - 0.1));
        ctx.quadraticCurveTo(cx + dir * ex, cy - hr * 0.3, cx + dir * (ex - hr * 0.26), cy - hr * 0.12);
      } else if (tilt) {
        ctx.moveTo(cx + dir * (ex + hr * 0.3), cy - hr * 0.3 - tilt);
        ctx.quadraticCurveTo(cx + dir * ex, cy - hr * 0.22, cx + dir * (ex - hr * 0.24), cy - hr * 0.06 + tilt * 0.6);
      } else {
        ctx.moveTo(cx + dir * (ex + hr * 0.28), cy - hr * 0.16);
        ctx.quadraticCurveTo(cx + dir * ex, cy - hr * 0.3, cx + dir * (ex - hr * 0.24), cy - hr * 0.14);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#2a2118";
    const dims = {
      narrow: [0.17, 0.07, 0.06],
      round: [0.14, 0.19, 0],
      fierce: [0.16, 0.13, -0.08],
      normal: [0.13, 0.17, 0]
    }[eyes];
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + dir * ex, ey + dims[2], hr * dims[0], hr * dims[1], dir * dims[2] * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    for (const dir of [-1, 1]) {
      circleAt(ctx, cx + dir * (ex + hr * 0.03), ey + dims[2] - hr * 0.05, hr * 0.045, "#ffffff");
    }
    if (eyes === "narrow") {
      ctx.strokeStyle = "#2a2118";
      ctx.lineWidth = hr * 0.05;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * (ex + hr * 0.1), ey);
        ctx.lineTo(cx + dir * (ex + hr * 0.32), ey - hr * 0.06);
        ctx.stroke();
      }
    }
    if (art.nose === "monkey") {
      ctx.fillStyle = "#8a5a3a";
      ctx.beginPath();
      ctx.ellipse(cx, cy + hr * 0.32, hr * 0.1, hr * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (art.nose === "bull") {
      ctx.fillStyle = "#d8a8a0";
      ctx.beginPath();
      ctx.ellipse(cx, cy + hr * 0.38, hr * 0.16, hr * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a4038";
      circleAt(ctx, cx - hr * 0.06, cy + hr * 0.38, hr * 0.035, "#5a4038");
      circleAt(ctx, cx + hr * 0.06, cy + hr * 0.38, hr * 0.035, "#5a4038");
      ctx.strokeStyle = "#e9c887";
      ctx.lineWidth = hr * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy + hr * 0.42, hr * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (art.nose === "red") {
      circleAt(ctx, cx, cy + hr * 0.34, hr * 0.09, "rgba(230,110,90,0.75)");
    }
    ctx.strokeStyle = art.lip || "#b5603f";
    ctx.lineWidth = hr * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.14, cy + hr * 0.48);
    ctx.quadraticCurveTo(cx, cy + hr * 0.58, cx + hr * 0.14, cy + hr * 0.48);
    ctx.stroke();
    const blush = art.blush === void 0 ? 0.28 : art.blush;
    if (blush > 0.01) {
      ctx.save();
      ctx.globalAlpha = blush;
      circleAt(ctx, cx - hr * 0.55 * fw, cy + hr * 0.3, hr * 0.16, "#f09a8a");
      circleAt(ctx, cx + hr * 0.55 * fw, cy + hr * 0.3, hr * 0.16, "#f09a8a");
      ctx.restore();
    }
  }
  function drawRobeBody(ctx, cx, baseY, H, sw, shoulderY, art, skin) {
    const robe = art.robe || ["#5a6a8c", "#2b3350"];
    const trim = art.trim || "#e9c887";
    const g2 = ctx.createLinearGradient(cx - sw / 2, shoulderY, cx + sw / 2, baseY);
    g2.addColorStop(0, robe[0]);
    g2.addColorStop(1, robe[1]);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.5, shoulderY);
    ctx.quadraticCurveTo(cx - sw * 0.72, baseY - H * 0.28, cx - sw * 0.78, baseY);
    ctx.quadraticCurveTo(cx, baseY + H * 0.03, cx + sw * 0.78, baseY);
    ctx.quadraticCurveTo(cx + sw * 0.72, baseY - H * 0.28, cx + sw * 0.5, shoulderY);
    ctx.quadraticCurveTo(cx, shoulderY - H * 0.05, cx - sw * 0.5, shoulderY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = H * 0.018;
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.3, shoulderY + H * 0.02);
    ctx.lineTo(cx + sw * 0.06, shoulderY + H * 0.2);
    ctx.lineTo(cx + sw * 0.3, shoulderY + H * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + sw * 0.06, shoulderY + H * 0.2);
    ctx.lineTo(cx + sw * 0.02, baseY - H * 0.42);
    ctx.stroke();
    ctx.fillStyle = trim;
    roundRectPath(ctx, cx - sw * 0.72, baseY - H * 0.42, sw * 1.44, H * 0.05, H * 0.02);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff6dd";
    roundRectPath(ctx, cx - sw * 0.14, baseY - H * 0.42, sw * 0.28, H * 0.05, H * 0.01);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = robe[1];
    ctx.lineWidth = H * 0.075;
    ctx.lineCap = "round";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * sw * 0.46, shoulderY + H * 0.03);
      ctx.quadraticCurveTo(cx + dir * sw * 0.82, shoulderY + H * 0.2, cx + dir * sw * 0.72, baseY - H * 0.3);
      ctx.stroke();
    }
    circleAt(ctx, cx - sw * 0.72, baseY - H * 0.28, H * 0.038, skin);
    circleAt(ctx, cx + sw * 0.72, baseY - H * 0.28, H * 0.038, skin);
  }
  function drawVestBody(ctx, cx, baseY, H, sw, shoulderY, art, skin) {
    const robe = art.robe || ["#d0392e", "#7c1a14"];
    const trim = art.trim || "#f0c060";
    ctx.fillStyle = robe[1];
    roundRectPath(ctx, cx - sw * 0.5, baseY - H * 0.32, sw, H * 0.34, H * 0.04);
    ctx.fill();
    const tg = ctx.createLinearGradient(cx - sw * 0.4, shoulderY, cx + sw * 0.4, baseY - H * 0.28);
    tg.addColorStop(0, skin);
    tg.addColorStop(1, SKIN_SHADOW);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.4, shoulderY);
    ctx.quadraticCurveTo(cx - sw * 0.52, baseY - H * 0.26, cx - sw * 0.46, baseY - H * 0.28);
    ctx.lineTo(cx + sw * 0.46, baseY - H * 0.28);
    ctx.quadraticCurveTo(cx + sw * 0.52, baseY - H * 0.26, cx + sw * 0.4, shoulderY);
    ctx.quadraticCurveTo(cx, shoulderY - H * 0.05, cx - sw * 0.4, shoulderY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(140,70,50,0.42)";
    ctx.lineWidth = H * 6e-3;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY + H * 0.06);
    ctx.lineTo(cx, baseY - H * 0.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.3, shoulderY + H * 0.09);
    ctx.quadraticCurveTo(cx, shoulderY + H * 0.15, cx + sw * 0.3, shoulderY + H * 0.09);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - sw * 0.26, shoulderY + H * 0.19);
    ctx.quadraticCurveTo(cx, shoulderY + H * 0.24, cx + sw * 0.26, shoulderY + H * 0.19);
    ctx.stroke();
    for (const dir of [-1, 1]) {
      const vg = ctx.createLinearGradient(cx, shoulderY, cx + dir * sw * 0.5, baseY - H * 0.28);
      vg.addColorStop(0, robe[0]);
      vg.addColorStop(1, robe[1]);
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.moveTo(cx + dir * sw * 0.44, shoulderY - H * 0.01);
      ctx.quadraticCurveTo(cx + dir * sw * 0.56, baseY - H * 0.3, cx + dir * sw * 0.5, baseY - H * 0.26);
      ctx.lineTo(cx + dir * sw * 0.14, baseY - H * 0.31);
      ctx.lineTo(cx + dir * sw * 0.06, shoulderY + H * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = H * 0.012;
      ctx.stroke();
    }
    ctx.fillStyle = trim;
    roundRectPath(ctx, cx - sw * 0.52, baseY - H * 0.37, sw * 1.04, H * 0.06, H * 0.015);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff6dd";
    roundRectPath(ctx, cx - sw * 0.12, baseY - H * 0.37, sw * 0.24, H * 0.06, H * 0.01);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = skin;
    ctx.lineWidth = H * 0.068;
    ctx.lineCap = "round";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * sw * 0.4, shoulderY + H * 0.03);
      ctx.quadraticCurveTo(cx + dir * sw * 0.8, shoulderY + H * 0.22, cx + dir * sw * 0.7, baseY - H * 0.3);
      ctx.stroke();
    }
    ctx.strokeStyle = trim;
    ctx.lineWidth = H * 0.012;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + dir * sw * 0.58, shoulderY + H * 0.17, H * 0.05, 0, Math.PI * 2);
      ctx.stroke();
    }
    circleAt(ctx, cx - sw * 0.7, baseY - H * 0.28, H * 0.038, skin);
    circleAt(ctx, cx + sw * 0.7, baseY - H * 0.28, H * 0.038, skin);
  }
  function drawHeroFigure(ctx, cx, baseY, H, hero) {
    const pimg = heroImage(hero.id);
    if (pimg && (pimg.width || pimg.naturalWidth)) {
      const pw = H * 0.78;
      drawImageCover(ctx, pimg, cx - pw / 2, baseY - H * 1.02, pw, H * 1.02);
      return;
    }
    const art = fxOf(hero);
    const robe = art.robe || ["#5a6a8c", "#2b3350"];
    const trim = art.trim || "#e9c887";
    const hair = art.hair || "#2b2b33";
    const skin = art.skin || SKIN;
    const headR = H * 0.108;
    const headCY = baseY - H * 0.86;
    const shoulderY = headCY + headR * 1.55;
    const shoulder = art.shoulder || 1;
    const sw = H * 0.34 * shoulder;
    ctx.save();
    if (art.cape) {
      ctx.fillStyle = art.capeColor || robe[1];
      ctx.beginPath();
      ctx.moveTo(cx - sw * 0.6, shoulderY);
      ctx.quadraticCurveTo(cx - sw * 1.08, baseY - H * 0.2, cx - sw * 0.7, baseY);
      ctx.lineTo(cx + sw * 0.7, baseY);
      ctx.quadraticCurveTo(cx + sw * 1.08, baseY - H * 0.2, cx + sw * 0.6, shoulderY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = H * 8e-3;
      ctx.stroke();
    }
    ctx.strokeStyle = art.ribbon || "rgba(230,220,190,0.55)";
    ctx.lineWidth = H * (art.ribbonW || 0.035);
    ctx.lineCap = "round";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * sw * 0.5, shoulderY + H * 0.06);
      ctx.quadraticCurveTo(cx + dir * sw * 1.5, shoulderY + H * 0.28, cx + dir * sw * 1.1, baseY - H * 0.16);
      ctx.stroke();
    }
    if (art.vest) drawVestBody(ctx, cx, baseY, H, sw, shoulderY, art, skin);
    else drawRobeBody(ctx, cx, baseY, H, sw, shoulderY, art, skin);
    if (art.armor) {
      for (const dir of [-1, 1]) {
        const ax = cx + dir * sw * 0.5;
        const ag = ctx.createLinearGradient(ax - H * 0.05, 0, ax + H * 0.05, 0);
        ag.addColorStop(0, "#dfe6f0");
        ag.addColorStop(1, "#8b95a8");
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.ellipse(ax, shoulderY + H * 0.012, sw * 0.2, H * 0.042, dir * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = trim;
        ctx.lineWidth = H * 8e-3;
        ctx.stroke();
      }
    }
    ctx.fillStyle = SKIN_SHADOW;
    roundRectPath(ctx, cx - headR * 0.32, headCY + headR * 0.7, headR * 0.64, headR * 0.9, headR * 0.2);
    ctx.fill();
    drawHead(ctx, cx, headCY, headR, art, hair, skin);
    if (art.weapon) {
      const wx3 = cx + sw * 0.86;
      const wy = baseY - H * 0.46;
      drawWeapon(ctx, art.weapon, wx3, wy, H / 420, art);
    }
    ctx.restore();
  }
  function drawHead(ctx, cx, headCY, hr, art, hair, skin) {
    const fw = art.faceW || 1;
    if (art.mark === "fur") drawFurRing(ctx, cx, headCY, hr, art.furColor || "#a8722f");
    const hg = ctx.createLinearGradient(cx - hr, headCY - hr, cx + hr, headCY + hr);
    hg.addColorStop(0, skin);
    hg.addColorStop(1, SKIN_SHADOW);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(cx, headCY, hr * 0.9 * fw, hr * 1.06, 0, 0, Math.PI * 2);
    ctx.fill();
    const earR = hr * (art.feminine ? 0.13 : 0.15);
    circleAt(ctx, cx - hr * 0.88 * fw, headCY + hr * 0.1, earR, skin);
    circleAt(ctx, cx + hr * 0.88 * fw, headCY + hr * 0.1, earR, skin);
    if (art.feminine) {
      circleAt(ctx, cx - hr * 0.88 * fw, headCY + hr * 0.26, earR * 0.55, art.trim || "#e9c887");
      circleAt(ctx, cx + hr * 0.88 * fw, headCY + hr * 0.26, earR * 0.55, art.trim || "#e9c887");
    }
    drawHair(ctx, cx, headCY, hr, art.style || "bun", hair, art);
    drawBeard(ctx, cx, headCY, hr, art);
    drawFace(ctx, cx, headCY, hr, art);
    drawMark(ctx, cx, headCY, hr, art);
    if (art.wear) drawHeadwear(ctx, art.wear, cx, headCY, hr, art);
  }
  function drawHeroHead(ctx, cx, cy, size, hero, opt) {
    opt = opt || {};
    const art = fxOf(hero);
    const e = Elements[hero.element] || Elements.earth;
    const r = size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    const g2 = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g2.addColorStop(0, e.color);
    g2.addColorStop(1, e.color2);
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.save();
    ctx.clip();
    glow(ctx, cx, cy - r * 0.3, r * 0.9, "rgba(255,255,255,0.35)", 0.5);
    drawCloud(ctx, cx - r * 0.55, cy + r * 0.45, r / 40, "rgba(255,255,255,0.35)", 0.5);
    const himg = heroImage(hero.id);
    if (himg && (himg.width || himg.naturalWidth)) {
      drawImageCover(ctx, himg, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else {
      drawProceduralHeadBody(ctx, cx, cy, r, art);
      ctx.restore();
    }
    const q = Quality[hero.quality] || Quality.R;
    ctx.strokeStyle = opt.frameColor || q.color;
    ctx.lineWidth = opt.frameWidth || Math.max(2, size * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawProceduralHeadBody(ctx, cx, cy, r, art) {
    ctx.fillStyle = art.robe && art.robe[1] || "#2b3350";
    ctx.beginPath();
    const shw = r * 0.9 * (art.shoulder || 1) / 1;
    ctx.moveTo(cx - Math.min(shw, r), cy + r);
    ctx.quadraticCurveTo(cx, cy + r * 0.28, cx + Math.min(shw, r), cy + r);
    ctx.closePath();
    ctx.fill();
    if (art.armor) {
      ctx.fillStyle = "rgba(200,210,224,0.9)";
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.62, cy + r * 0.82, r * 0.24, r * 0.12, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.62, cy + r * 0.82, r * 0.24, r * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const headR = r * 0.44;
    const headCY = cy - r * 0.12;
    drawHead(ctx, cx, headCY, headR, art, art.hair || "#2b2b33", art.skin || SKIN);
  }
  function drawHeroCard(ctx, x, y, w, h, hero, opt) {
    opt = opt || {};
    const e = Elements[hero.element] || Elements.earth;
    const q = Quality[hero.quality] || Quality.R;
    const r = opt.radius === void 0 ? 16 : opt.radius;
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.save();
    ctx.clip();
    const g2 = ctx.createLinearGradient(x, y, x + w, y + h);
    g2.addColorStop(0, e.color2);
    g2.addColorStop(0.55, "#1b2136");
    g2.addColorStop(1, "#0e1220");
    ctx.fillStyle = g2;
    ctx.fillRect(x, y, w, h);
    glow(ctx, x + w / 2, y + h * 0.42, w * 0.62, e.glow, 0.55);
    drawCloud(ctx, x + w * 0.18, y + h * 0.24, w / 300, "rgba(255,255,255,0.28)", 0.7);
    drawCloud(ctx, x + w * 0.86, y + h * 0.62, w / 380, "rgba(255,255,255,0.22)", 0.7);
    drawHeroFigure(ctx, x + w / 2, y + h * 0.88, h * 0.92, hero);
    const barH = h * 0.2;
    const bg = ctx.createLinearGradient(x, y + h - barH, x, y + h);
    bg.addColorStop(0, "rgba(8,10,18,0)");
    bg.addColorStop(0.45, "rgba(8,10,18,0.82)");
    bg.addColorStop(1, "rgba(8,10,18,0.96)");
    ctx.fillStyle = bg;
    ctx.fillRect(x, y + h - barH, w, barH);
    drawText(ctx, hero.name, x + w / 2, y + h - barH * 0.44, {
      size: opt.nameSize || w * 0.17,
      align: "center",
      color: "#fff5e2",
      weight: "bold",
      stroke: 3,
      strokeColor: "rgba(0,0,0,0.6)"
    });
    if (opt.sub !== false) {
      drawText(ctx, `${q.label}\xB7${e.name}`, x + w / 2, y + h - barH * 0.14, {
        size: opt.subSize || w * 0.1,
        align: "center",
        color: q.color,
        stroke: 2,
        strokeColor: "rgba(0,0,0,0.5)"
      });
    }
    if (opt.stars !== false) {
      const n = opt.stars || hero.star || 1;
      const ss = w * 0.075;
      for (let i = 0; i < n; i++) {
        const sx = x + w / 2 + (i - (n - 1) / 2) * (ss * 1.3);
        starShape(ctx, sx, y + h * 0.09, ss * 0.5, "#ffdf9a");
      }
    }
    ctx.restore();
    ctx.strokeStyle = opt.border || q.color;
    ctx.lineWidth = opt.borderWidth || w * 0.022;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, x + 4, y + 4, w - 8, h - 8, r - 3);
    ctx.stroke();
    ctx.restore();
  }
  function starShape(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 5 * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(60,30,0,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // js/scenes/home.js
  var HomeScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      this.mainIndex = 0;
      addTopBar(this);
      this.add(new Sprite({
        x: 24,
        y: 106,
        w: 380,
        h: 92,
        render: (ctx, w, h) => {
          drawPanel(ctx, 0, 0, w, h, { radius: 16, c1: "rgba(28,34,56,0.8)", c2: "rgba(16,20,34,0.8)" });
          drawText(ctx, player.data.name, 20, 38, { size: 26, color: "#fff2cf", weight: "bold" });
          drawText(ctx, "\u6218\u529B", 20, 74, { size: 22, color: Theme.textDim });
          drawText(ctx, fmt(player.teamPower), 100, 74, { size: 26, color: "#ffd98a", weight: "bold" });
          drawText(ctx, `\u795E\u5C06 ${Object.keys(player.data.heroes).length}`, 210, 74, { size: 22, color: "#c8d8f0" });
        }
      }));
      this.add(new Sprite({
        x: 640,
        y: 106,
        w: 96,
        h: 400,
        render: (ctx, w, h) => {
          const units = player.teamUnits;
          for (let i = 0; i < 5; i++) {
            const u = units[i];
            const cy = 44 + i * 78;
            if (u) {
              if (i === this.mainIndex) glow(ctx, 48, cy, 46, "rgba(233,200,135,0.55)", 0.65);
              drawHeroHead(ctx, 48, cy, 66, u.hero);
              if (i === this.mainIndex) {
                ctx.strokeStyle = "#ffe9b8";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(48, cy, 37, 0, Math.PI * 2);
                ctx.stroke();
              }
              drawText(ctx, `Lv${u.level}`, 48, cy + 44, { size: 16, align: "center", color: Theme.textDim });
            } else {
              roundRectPath(ctx, 14, cy - 33, 68, 66, 12);
              ctx.strokeStyle = "rgba(255,255,255,0.16)";
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }));
      for (let i = 0; i < 5; i++) {
        const idx = i;
        const b = new Button({
          x: 648,
          y: 112 + idx * 78,
          w: 80,
          h: 76,
          label: "",
          style: "ghost",
          radius: 36,
          onClick: () => {
            const units = player.teamUnits;
            if (units[idx]) this.mainIndex = idx;
          }
        });
        b.render = null;
        b.onDraw = () => {
        };
        this.add(b);
      }
      this.heroSprite = new Sprite({
        x: 0,
        y: 240,
        w: 750,
        h: 760,
        render: (ctx) => {
          const units = player.teamUnits;
          if (!units.length) return;
          const main = units[this.mainIndex % units.length] || units[0];
          const float = Math.sin(this.t / 700) * 8;
          ctx.save();
          ctx.translate(0, float);
          if (heroImageReady(main.hero.id)) {
            const img = heroImage(main.hero.id);
            const iw = img.width || img.naturalWidth;
            const ih = img.height || img.naturalHeight;
            const top = 175, bottom = 735;
            const maxW = 400, maxH = bottom - top;
            const s = Math.min(maxW / iw, maxH / ih);
            const dw = iw * s, dh = ih * s;
            const dx = 375 - dw / 2;
            const dy = top + (maxH - dh) / 2;
            glow(ctx, 375, 640, 240, (Elements[main.hero.element] || Elements.earth).glow, 0.3);
            ctx.drawImage(img, dx, dy, dw, dh);
            const fg = ctx.createLinearGradient(0, dy + dh - 130, 0, dy + dh);
            fg.addColorStop(0, "rgba(12,16,32,0)");
            fg.addColorStop(1, "rgba(12,16,32,0.5)");
            ctx.fillStyle = fg;
            ctx.fillRect(dx - 8, dy + dh - 130, dw + 16, 130);
            ctx.restore();
          } else {
            glow(ctx, 375, 660, 240, (Elements[main.hero.element] || Elements.earth).glow, 0.35);
            drawHeroFigure(ctx, 375, 700, 620, main.hero);
            ctx.restore();
          }
          drawText(ctx, main.hero.name, 375, 120, {
            size: 40,
            align: "center",
            color: "#fff2cf",
            weight: "bold",
            stroke: 4,
            strokeColor: "rgba(0,0,0,0.6)"
          });
          drawText(ctx, main.hero.title, 375, 158, { size: 22, align: "center", color: "#c8b898" });
        }
      });
      this.add(this.heroSprite);
      const stage = player.currentStage;
      this.add(new Button({
        x: 175,
        y: 990,
        w: 400,
        h: 96,
        label: "",
        style: "gold",
        radius: 48,
        size: 32,
        onClick: () => goto("stage"),
        icon: (ctx, b) => {
          drawText(ctx, "\u51FA \u5F81", 200, 42, { size: 34, align: "center", weight: "bold", color: "#3a2408" });
          drawText(ctx, `${stage.name} \xB7 Lv${stage.level}`, 200, 76, { size: 22, align: "center", color: "#5a3a18" });
        }
      }));
      const quick = [
        { key: "heroes", label: "\u795E\u5C06", icon: "heroes" },
        { key: "gacha", label: "\u7948\u613F", icon: "gacha" },
        { key: "lineup", label: "\u9635\u5BB9", icon: "lineup" }
      ];
      quick.forEach((q, i) => {
        const b = new Button({
          x: 60 + i * 220,
          y: 1104,
          w: 180,
          h: 86,
          style: "dark",
          radius: 20,
          onClick: () => goto(q.key),
          icon: (ctx, btn) => drawText(ctx, q.label, 90, 52, { size: 28, align: "center", color: "#ffe9b8", weight: "bold" })
        });
        this.add(b);
      });
      addBottomNav(this, "home");
      this.add(new Button({
        x: 430,
        y: 116,
        w: 88,
        h: 64,
        style: "ghost",
        radius: 16,
        onClick: () => this.confirmReset(),
        icon: (ctx) => drawText(ctx, "\u91CD\u7F6E", 44, 40, { size: 22, align: "center", color: Theme.textDim })
      }));
    }
    confirmReset() {
      const p = new Popup({ closeOnMask: true });
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawPanel(ctx, 95, 520, 560, 300, { radius: 24 });
        drawText(ctx, "\u662F\u5426\u91CD\u7F6E\u5B58\u6863\uFF1F", 375, 590, { size: 32, align: "center", color: "#fff2cf", weight: "bold" });
        drawText(ctx, "\u6240\u6709\u795E\u5C06\u3001\u8D44\u6E90\u4E0E\u8FDB\u5EA6\u5C06\u6E05\u7A7A", 375, 640, { size: 24, align: "center", color: Theme.textDim });
        drawText(ctx, "\uFF08\u4EC5\u7528\u4E8E\u6D4B\u8BD5\uFF09", 375, 676, { size: 20, align: "center", color: "#a08060" });
        drawText(ctx, "\u53D6\u6D88", 235, 766, { size: 28, align: "center", color: Theme.textDim });
        drawText(ctx, "\u786E\u5B9A\u91CD\u7F6E", 515, 766, { size: 28, align: "center", color: "#e0684a", weight: "bold" });
      };
      const cancel = new Button({ x: 155, y: 726, w: 160, h: 66, style: "dark", label: "\u53D6\u6D88", size: 26, onClick: () => p.close() });
      const ok = new Button({ x: 435, y: 726, w: 160, h: 66, style: "red", label: "\u786E\u5B9A", size: 26, onClick: () => {
        player.reset();
        p.close();
        toast("\u5B58\u6863\u5DF2\u91CD\u7F6E");
        goto("home");
      } });
      p.add(cancel);
      p.add(ok);
      this.addPopup(p);
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
    }
  };
  register("home", () => new HomeScene());

  // js/scenes/heroes.js
  var SORTS = [
    { key: "quality", label: "\u6309\u54C1\u8D28" },
    { key: "power", label: "\u6309\u6218\u529B" },
    { key: "level", label: "\u6309\u7B49\u7EA7" }
  ];
  var HeroesScene = class extends Scene {
    constructor(params) {
      super();
      params = params || {};
      this.t = 0;
      this.sortIndex = 0;
      this.selectMode = !!params.select;
      this.onSelect = params.onSelect || null;
      this.slot = params.slot;
      addTopBar(this, { x: 132, w: 594 });
      this.add(new Sprite({ x: 0, y: 0, w: 750, h: 100, render: (ctx) => drawTitleBar(ctx, this.selectMode ? "\u9009\u62E9\u795E\u5C06" : "\u795E\u5C06", `\u5DF2\u6536\u5F55 ${this.list.length} \u4F4D`) }));
      this.addBackBtn = new Button({
        x: 20,
        y: 22,
        w: 96,
        h: 64,
        style: "dark",
        radius: 32,
        onClick: () => this.selectMode ? goto("lineup") : goto("home"),
        icon: (ctx) => {
          ctx.save();
          ctx.translate(48, 32);
          ctx.fillStyle = "#f2e7d3";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-14, -4);
          ctx.lineTo(-14, 4);
          ctx.lineTo(-6, 4);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
      this.add(this.addBackBtn);
      this.sortBtn = new Button({
        x: 560,
        y: 112,
        w: 150,
        h: 60,
        style: "dark",
        radius: 16,
        onClick: () => {
          this.sortIndex = (this.sortIndex + 1) % SORTS.length;
          this.buildList();
        },
        icon: (ctx) => drawText(ctx, SORTS[this.sortIndex].label, 75, 38, { size: 22, align: "center", color: "#ffe9b8" })
      });
      this.add(this.sortBtn);
      this.scroll = new ScrollView({ x: 0, y: 186, w: 750, h: 1030 });
      this.add(this.scroll);
      this.buildList();
      if (!this.selectMode) addBottomNav(this, "heroes");
    }
    get list() {
      const sort = SORTS[this.sortIndex].key;
      const order = { UR: 4, SSR: 3, SR: 2, R: 1 };
      const arr = player.heroList.slice();
      arr.sort((a, b) => {
        const ha = getHero(a.id), hb = getHero(b.id);
        if (sort === "power") return player.statsOf(b.id).power - player.statsOf(a.id).power;
        if (sort === "level") return b.level - a.level || b.star - a.star;
        if (order[hb.quality] !== order[ha.quality]) return order[hb.quality] - order[ha.quality];
        return player.statsOf(b.id).power - player.statsOf(a.id).power;
      });
      return arr;
    }
    buildList() {
      this.scroll.clear();
      const arr = this.list;
      const cols = 3;
      const cw = 224;
      const chh = 296;
      const gapX = 22;
      const gapY = 22;
      const startX = (750 - (cw * cols + gapX * (cols - 1))) / 2;
      const rows = Math.ceil(arr.length / cols);
      this.scroll.contentH = Math.max(this.scroll.h + 1, rows * (chh + gapY) + 30);
      arr.forEach((h, i) => {
        const info = getHero(h.id);
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = startX + c * (cw + gapX);
        const y = 16 + r * (chh + gapY);
        const card = new Sprite({
          x,
          y,
          w: cw,
          h: chh,
          data: h,
          onClick: (self) => {
            if (this.selectMode && this.onSelect) this.onSelect(h.id);
            else goto("heroDetail", { id: h.id });
          },
          render: (ctx, w, hh) => {
            const st = player.statsOf(h.id);
            drawHeroCard(ctx, 0, 0, w, hh - 34, info, { stars: h.star, nameSize: w * 0.16 });
            roundRectPath(ctx, 0, hh - 30, w, 28, 8);
            ctx.fillStyle = "rgba(10,14,24,0.9)";
            ctx.fill();
            ctx.strokeStyle = "rgba(233,200,135,0.3)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            drawText(ctx, `Lv${h.level}`, 10, hh - 10, { size: 20, color: "#ffe9b8", weight: "bold" });
            drawText(ctx, fmt(st.power), w - 10, hh - 10, { size: 20, align: "right", color: "#ffd98a" });
            if (player.inTeam(h.id)) {
              roundRectPath(ctx, w - 62, 6, 56, 30, 8);
              ctx.fillStyle = "rgba(47,143,91,0.92)";
              ctx.fill();
              drawText(ctx, "\u51FA\u6218", w - 34, 26, { size: 18, align: "center", color: "#fff", weight: "bold" });
            }
          }
        });
        this.scroll.add(card);
      });
      if (!arr.length) {
        this.scroll.add(new Sprite({
          x: 0,
          y: 200,
          w: 750,
          h: 100,
          render: (ctx) => drawText(ctx, "\u5C1A\u65E0\u795E\u5C06\uFF0C\u53BB\u7948\u613F\u53F0\u53EC\u5524\u5427", 375, 40, { size: 26, align: "center", color: Theme.textDim })
        }));
      }
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
      this.scroll.update(dt);
    }
  };
  register("heroes", (p) => new HeroesScene(p));

  // js/scenes/heroDetail.js
  var HeroDetailScene = class extends Scene {
    constructor(params) {
      super();
      this.id = params && params.id || player.teamUnits[0] && player.teamUnits[0].id;
      this.t = 0;
      this.flash = 0;
      addTopBar(this, { x: 132, w: 594 });
      this.backBtn = new Button({
        x: 20,
        y: 22,
        w: 96,
        h: 64,
        style: "dark",
        radius: 32,
        onClick: () => goto("heroes"),
        icon: (ctx) => {
          ctx.save();
          ctx.translate(48, 32);
          ctx.fillStyle = "#f2e7d3";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-14, -4);
          ctx.lineTo(-14, 4);
          ctx.lineTo(-6, 4);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
      this.add(this.backBtn);
      this.add(new Sprite({
        x: 24,
        y: 118,
        w: 320,
        h: 470,
        render: (ctx, w, h) => {
          const info = getHero(this.id);
          if (!info) return;
          drawPanel(ctx, 0, 0, w, h, { radius: 20 });
          ctx.save();
          roundRectPath(ctx, 4, 4, w - 8, h - 8, 18);
          ctx.clip();
          const e = Elements[info.element];
          const g2 = ctx.createLinearGradient(0, 0, 0, h);
          g2.addColorStop(0, e.color2);
          g2.addColorStop(1, "#111629");
          ctx.fillStyle = g2;
          ctx.fillRect(0, 0, w, h);
          glow(ctx, w / 2, h * 0.42, w * 0.6, e.glow, 0.45);
          drawHeroFigure(ctx, w / 2, h * 0.96, h * 0.98, info);
          ctx.restore();
          ctx.strokeStyle = Quality[info.quality].color;
          ctx.lineWidth = 3;
          roundRectPath(ctx, 0, 0, w, h, 20);
          ctx.stroke();
        }
      }));
      this.info = new Sprite({
        x: 356,
        y: 118,
        w: 370,
        h: 470,
        render: (ctx, w, h) => this.renderInfo(ctx, w, h)
      });
      this.add(this.info);
      this.add(new Sprite({
        x: 24,
        y: 604,
        w: 702,
        h: 250,
        render: (ctx, w, h) => {
          const info = getHero(this.id);
          if (!info) return;
          drawPanel(ctx, 0, 0, w, h, { radius: 20 });
          drawText(ctx, "\u795E\u901A", 24, 40, { size: 28, color: "#ffe9b8", weight: "bold" });
          ctx.save();
          roundRectPath(ctx, 16, 60, w - 32, 82, 12);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fill();
          ctx.restore();
          drawText(ctx, info.skill.name, 32, 92, { size: 26, color: "#ffd98a", weight: "bold" });
          drawText(ctx, "\u6012\u6C14\u6280", 32 + measureText(ctx, info.skill.name, 26) + 16, 92, { size: 18, color: Theme.textDim });
          wrapText(ctx, info.skill.desc, 32, 118, w - 64, 22, 26, 2);
          ctx.save();
          roundRectPath(ctx, 16, 150, w - 32, 82, 12);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fill();
          ctx.restore();
          drawText(ctx, info.passive.name, 32, 182, { size: 26, color: "#8fdcaa", weight: "bold" });
          drawText(ctx, "\u5929\u8D4B", 32 + measureText(ctx, info.passive.name, 26) + 16, 182, { size: 18, color: Theme.textDim });
          wrapText(ctx, info.passive.desc, 32, 208, w - 64, 22, 26, 2);
        }
      }));
      this.up1 = new Button({
        x: 24,
        y: 872,
        w: 220,
        h: 92,
        style: "gold",
        radius: 18,
        onClick: () => this.doLevelUp(1),
        icon: (ctx, b) => this.renderUpBtn(ctx, b, "\u5347 1 \u7EA7")
      });
      this.up10 = new Button({
        x: 259,
        y: 872,
        w: 220,
        h: 92,
        style: "gold",
        radius: 18,
        onClick: () => this.doLevelUp(10),
        icon: (ctx, b) => this.renderUpBtn(ctx, b, "\u5347 10 \u7EA7")
      });
      this.starBtn = new Button({
        x: 494,
        y: 872,
        w: 232,
        h: 92,
        style: "green",
        radius: 18,
        onClick: () => this.doStarUp(),
        icon: (ctx, b) => {
          const h = player.hero(this.id);
          const cost = starCost(h.star);
          if (h.star >= MAX_STAR) {
            drawText(ctx, "\u5DF2\u6EE1\u661F", 116, 46, { size: 28, align: "center", weight: "bold", color: "#0f2f1c" });
            return;
          }
          const enough = player.get("soul") >= cost.soul && player.get("coin") >= cost.coin;
          drawText(ctx, "\u5347 \u661F", 116, 30, { size: 26, align: "center", weight: "bold", color: "#0f2f1c" });
          drawText(ctx, `\u5C06\u9B42${cost.soul} \u7075\u77F3${fmt(cost.coin)}`, 116, 58, { size: 18, align: "center", color: "#1f4a30" });
          drawText(ctx, `\u62E5\u6709\u5C06\u9B42 ${fmt(player.get("soul"))}`, 116, 80, { size: 17, align: "center", weight: "bold", color: enough ? "#1f4a30" : "#8a2418" });
        }
      });
      this.add(this.up1);
      this.add(this.up10);
      this.add(this.starBtn);
      this.teamBtn = new Button({
        x: 24,
        y: 982,
        w: 336,
        h: 92,
        style: "red",
        radius: 18,
        onClick: () => this.toggleTeam(),
        icon: (ctx, b) => {
          const inTeam = player.inTeam(this.id);
          drawText(ctx, inTeam ? "\u4E0B \u9635" : "\u4E0A \u9635", b.w / 2, 42, { size: 30, align: "center", weight: "bold", color: "#fff3e4" });
          drawText(ctx, inTeam ? "\u4ECE\u9635\u5BB9\u4E2D\u79FB\u9664" : "\u52A0\u5165\u51FA\u6218\u9635\u5BB9", b.w / 2, 74, { size: 20, align: "center", color: "rgba(255,240,220,0.8)" });
        }
      });
      this.equipBtn = new Button({
        x: 376,
        y: 982,
        w: 350,
        h: 92,
        style: "gold",
        radius: 18,
        onClick: () => goto("equip", { id: this.id }),
        icon: (ctx, b) => {
          drawText(ctx, "\u4E13\u5C5E\u88C5\u5907", b.w / 2, 42, { size: 30, align: "center", weight: "bold", color: "#3a2408" });
          drawText(ctx, "\u79D1\u6280\u5347\u7EA7 / \u8FDB\u9636 / \u7279\u6280", b.w / 2, 74, { size: 20, align: "center", color: "#5a3a18" });
        }
      });
      this.add(this.teamBtn);
      this.add(this.equipBtn);
      this.statBtn = new Button({
        x: 536,
        y: 500,
        w: 186,
        h: 60,
        style: "dark",
        radius: 14,
        onClick: () => this.showStats(),
        icon: (ctx, b) => drawText(ctx, "\u8BE6\u7EC6\u5C5E\u6027", b.w / 2, b.h / 2 + 8, { size: 24, align: "center", weight: "bold", color: "#f2e7d3" })
      });
      this.add(this.statBtn);
      this.add(new Sprite({
        x: 24,
        y: 1092,
        w: 702,
        h: 120,
        render: (ctx, w, h) => {
          drawPanel(ctx, 0, 0, w, h, { radius: 16, c1: "rgba(24,30,50,0.7)", c2: "rgba(14,18,32,0.7)" });
          const hh = player.hero(this.id);
          drawText(ctx, "\u517B\u6210\u5C0F\u8D34\u58EB", 24, 34, { size: 24, color: "#ffe9b8", weight: "bold" });
          const tips = [
            `\u5F53\u524D\u661F\u7EA7\u7B49\u7EA7\u4E0A\u9650 ${levelCap(hh.star)} \u7EA7\uFF0C\u5347\u661F\u540E\u53EF\u7EE7\u7EED\u63D0\u5347`,
            `\u7384\u9EC4\u4E39\u7528\u4E8E\u5347\u7EA7\uFF0C\u5C06\u9B42\u7528\u4E8E\u5347\u661F\uFF0C\u5747\u53EF\u5728\u6218\u5F79\u4E0E\u7948\u613F\u4E2D\u83B7\u5F97`
          ];
          drawText(ctx, tips[0], 24, 68, { size: 21, color: Theme.textDim });
          drawText(ctx, tips[1], 24, 98, { size: 21, color: Theme.textDim });
        }
      }));
    }
    renderInfo(ctx, w, h) {
      const info = getHero(this.id);
      if (!info) return;
      const hh = player.hero(this.id);
      const st = player.statsOf(this.id);
      drawPanel(ctx, 0, 0, w, h, { radius: 20 });
      const q = Quality[info.quality];
      const e = Elements[info.element];
      drawText(ctx, info.name, 24, 46, { size: 36, color: "#fff2cf", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.5)" });
      drawText(ctx, info.title, 24, 78, { size: 22, color: Theme.textDim });
      roundRectPath(ctx, w - 140, 24, 116, 40, 10);
      ctx.fillStyle = q.color;
      ctx.fill();
      drawText(ctx, `${q.name}\xB7${q.label}`, w - 82, 50, { size: 22, align: "center", color: "#201408", weight: "bold" });
      drawStars(ctx, 26, 112, hh.star, 16);
      drawText(ctx, `${hh.star}\u661F`, 26 + hh.star * 19 + 10, 118, { size: 20, color: "#ffd98a" });
      roundRectPath(ctx, 24, 130, 96, 40, 10);
      ctx.fillStyle = e.color;
      ctx.fill();
      drawText(ctx, `${e.name}\u7CFB`, 72, 156, { size: 22, align: "center", color: "#201408", weight: "bold" });
      drawRoleTag(ctx, 132, 130, info.role);
      drawText(ctx, ["\u653B\u51FB\u578B", "\u9632\u5FA1\u578B", "\u8F85\u52A9\u578B", "\u63A7\u5236\u578B"][["\u653B", "\u9632", "\u8F85", "\u63A7"].indexOf(info.role)] || "", 178, 156, { size: 22, color: Theme.textDim });
      drawText(ctx, `\u7B49\u7EA7 ${hh.level}/${levelCap(hh.star)}`, 24, 208, { size: 26, color: "#ffe9b8", weight: "bold" });
      const need = expNeed(hh.level);
      drawBar(ctx, 24, 220, w - 48, 22, hh.exp / need, { text: `${hh.exp}/${need}` });
      drawText(ctx, "\u6218\u529B", 24, 288, { size: 24, color: Theme.textDim });
      drawText(ctx, fmt(st.power), 110, 288, { size: 30, color: "#ffd98a", weight: "bold" });
      const rows = [
        ["\u6C14\u8840", st.hp, "#ff9a8a"],
        ["\u653B\u51FB", st.atk, "#ffd98a"],
        ["\u9632\u5FA1", st.def, "#8fdcaa"],
        ["\u901F\u5EA6", st.spd, "#9ad7f5"]
      ];
      rows.forEach((r, i) => {
        const y = 330 + i * 34;
        drawText(ctx, r[0], 24, y, { size: 22, color: Theme.textDim });
        drawText(ctx, String(r[1]), w - 24, y, { size: 24, align: "right", color: r[2], weight: "bold" });
        drawBar(ctx, 90, y - 12, w - 190, 12, Math.min(1, r[1] / (rows[0][1] * 1.2)), { c1: r[2], c2: r[2] });
      });
    }
    renderUpBtn(ctx, b, label) {
      const hh = player.hero(this.id);
      const need = Math.max(1, Math.ceil((expNeed(hh.level) - hh.exp) / 100));
      const coin = Math.round((expNeed(hh.level) - hh.exp) * 0.6);
      drawText(ctx, label, 110, 38, { size: 28, align: "center", weight: "bold", color: "#3a2408" });
      drawText(ctx, player.isMaxLevel(this.id) ? "\u5DF2\u8FBE\u4E0A\u9650" : `\u4E39${need} \u77F3${fmt(coin)}`, 110, 70, { size: 20, align: "center", color: "#5a3a18" });
    }
    doLevelUp(times) {
      const r = player.levelUp(this.id, times);
      player.save();
      if (r.ok) {
        this.flash = 1;
        tween(this, { to: { flash: 0 }, dur: 400 });
        toast(`\u5347\u7EA7\u6210\u529F\uFF01\u5F53\u524D ${r.level} \u7EA7`, "success");
      } else {
        toast(r.msg + (r.leveled ? "" : ""), r.leveled ? "success" : "error");
      }
    }
    doStarUp() {
      const r = player.starUp(this.id);
      player.save();
      if (r.ok) {
        toast(r.msg, "success");
        this.flash = 1;
        tween(this, { to: { flash: 0 }, dur: 400 });
      } else toast(r.msg, "error");
    }
    showStats() {
      const info = getHero(this.id);
      const hh = player.hero(this.id);
      const st = player.statsOf(this.id);
      const base = baseStats(info, hh.level, hh.star);
      const eb = player.equipBonus(this.id);
      const rb = player.regularEquipBonus(this.id);
      const ex = player.data.equips[this.id] || {};
      const slots = player.data.slots[this.id] || {};
      const roleName = ["\u653B\u51FB\u578B", "\u9632\u5FA1\u578B", "\u8F85\u52A9\u578B", "\u63A7\u5236\u578B"][["\u653B", "\u9632", "\u8F85", "\u63A7"].indexOf(info.role)] || "";
      const exTech = ex.tech || 1;
      const exStage = ex.stage || 1;
      const p = new Popup();
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawText(ctx, `\u8BE6\u7EC6\u5C5E\u6027 \xB7 ${info.name}`, 375, 196, { size: 36, align: "center", color: "#fff2cf", weight: "bold", stroke: 4, strokeColor: "rgba(0,0,0,0.6)" });
        drawPanel(ctx, 80, 236, 590, 916, { radius: 24, c1: "rgba(34,40,64,0.98)", c2: "rgba(20,24,40,0.98)", border: Quality[info.quality].color, bw: 3 });
        drawText(ctx, `\u7B49\u7EA7 ${hh.level}   ${hh.star}\u661F`, 375, 296, { size: 26, align: "center", color: "#ffe9b8", weight: "bold" });
        drawText(ctx, `${Quality[info.quality].name}\xB7${Quality[info.quality].label}   ${Elements[info.element].name}\u7CFB   ${roleName}`, 375, 332, { size: 22, align: "center", color: Theme.textDim });
        drawText(ctx, `\u6218\u529B ${fmt(st.power)}`, 375, 378, { size: 32, align: "center", color: "#ffd98a", weight: "bold" });
        const rows = [
          ["\u6C14\u8840", st.hp, base.hp, eb.hp + rb.hp, "#ff9a8a"],
          ["\u653B\u51FB", st.atk, base.atk, eb.atk + rb.atk, "#ffd98a"],
          ["\u9632\u5FA1", st.def, base.def, eb.def + rb.def, "#8fdcaa"],
          ["\u901F\u5EA6", st.spd, base.spd, eb.spd + rb.spd, "#9ad7f5"]
        ];
        rows.forEach((r, i) => {
          const y = 452 + i * 76;
          drawText(ctx, r[0], 130, y, { size: 26, color: Theme.textDim });
          drawText(ctx, String(r[1]), 610, y, { size: 34, align: "right", color: r[4], weight: "bold" });
          drawText(ctx, `\u57FA\u7840 ${r[2]}   \u88C5\u5907 +${r[3]}`, 610, y + 32, { size: 20, align: "right", color: "rgba(255,255,255,0.6)" });
        });
        const yEx = 452 + 4 * 76 + 12;
        ctx.save();
        roundRectPath(ctx, 110, yEx - 28, 530, 70, 12);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.restore();
        drawText(ctx, "\u4E13\u5C5E\u88C5\u5907", 130, yEx - 2, { size: 24, color: "#ffe9b8", weight: "bold" });
        drawText(ctx, `\u79D1\u6280 ${exTech}\u9636 \xB7 \u8FDB\u9636 ${exStage}\u9636`, 130, yEx + 26, { size: 21, color: "#ffd98a" });
        drawText(ctx, exStage >= 2 ? "\u4E13\u5C5E\u7279\u6280 \u5DF2\u6FC0\u6D3B" : "\u8FDB\u96362\u9636\u6FC0\u6D3B\u7279\u6280", 610, yEx + 26, { size: 21, align: "right", color: exStage >= 2 ? "#8fdcaa" : Theme.textDim });
        const yReg = yEx + 78;
        drawText(ctx, "\u5E38\u89C4\u88C5\u5907", 130, yReg, { size: 24, color: "#ffe9b8", weight: "bold" });
        const partKeys = ["weapon", "helmet", "armor", "hat", "boots", "necklace"];
        const partLabel = { weapon: "\u6B66\u5668", helmet: "\u5934\u76D4", armor: "\u8863\u670D", hat: "\u5E3D\u5B50", boots: "\u978B\u5B50", necklace: "\u9879\u94FE" };
        partKeys.forEach((pk, i) => {
          const yy = yReg + 30 + i * 40;
          const iid = slots[pk];
          const inst = iid && player.data.bag[iid];
          drawText(ctx, partLabel[pk], 130, yy, { size: 21, color: Theme.textDim });
          if (inst) {
            const QLABEL = { R: "\u51E1\u54C1", SR: "\u826F\u54C1", SSR: "\u73CD\u54C1", UR: "\u795E\u54C1" };
            const qc = { R: "#b9c2cf", SR: "#7fe0a0", SSR: "#7fb6ff", UR: "#ffb84d" }[inst.quality] || "#fff";
            drawText(ctx, `${QLABEL[inst.quality] || inst.quality} \xB7 +${inst.level}`, 610, yy, { size: 21, align: "right", color: qc });
          } else {
            drawText(ctx, "\u672A\u7A7F\u6234", 610, yy, { size: 21, align: "right", color: Theme.textDim });
          }
        });
      };
      const close = new Button({
        x: 255,
        y: 1170,
        w: 240,
        h: 76,
        style: "gold",
        radius: 38,
        onClick: () => p.close(),
        icon: (ctx, b) => drawText(ctx, "\u5173 \u95ED", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      p.add(close);
      this.addPopup(p);
    }
    toggleTeam() {
      if (player.inTeam(this.id)) {
        const i = player.data.team.indexOf(this.id);
        player.data.team[i] = null;
        player.save();
        toast("\u5DF2\u4E0B\u9635");
      } else {
        const empty = player.data.team.indexOf(null);
        if (empty < 0) {
          toast("\u9635\u5BB9\u5DF2\u6EE1\uFF0C\u8BF7\u5148\u4E0B\u9635\u4E00\u4F4D\u795E\u5C06", "error");
          return;
        }
        player.setTeamSlot(empty, this.id);
        player.save();
        toast("\u5DF2\u4E0A\u9635");
      }
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
      if (this.flash > 0.01) {
        ctx.fillStyle = `rgba(255,240,200,${this.flash * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    update(dt) {
      this.t += dt;
    }
  };
  function measureText(ctx, text, size) {
    ctx.font = `${size}px sans-serif`;
    return ctx.measureText(text).width;
  }
  function wrapText(ctx, text, x, y, maxW, size, lh, maxLines) {
    ctx.font = `${size}px sans-serif`;
    let line = "";
    let lines = [];
    for (const ch of String(text)) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((l, i) => {
      ctx.font = `${size}px sans-serif`;
      ctx.fillStyle = Theme.text;
      ctx.fillText(l, x, y + i * lh);
    });
  }
  register("heroDetail", (p) => new HeroDetailScene(p));

  // js/scenes/lineup.js
  var SLOTS = [
    { slot: 0, x: 375 - 96, y: 470, size: 132, label: "\u524D\u6392" },
    { slot: 1, x: 375 + 96, y: 470, size: 132, label: "\u524D\u6392" },
    { slot: 2, x: 375 - 210, y: 660, size: 120, label: "\u540E\u6392" },
    { slot: 3, x: 375, y: 690, size: 120, label: "\u540E\u6392" },
    { slot: 4, x: 375 + 210, y: 660, size: 120, label: "\u540E\u6392" }
  ];
  var LineupScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      addTopBar(this);
      this.add(new Sprite({
        x: 0,
        y: 96,
        w: 750,
        h: 60,
        render: (ctx) => {
          drawText(ctx, "\u51FA\u6218\u9635\u5BB9", 375, 20, { size: 34, align: "center", color: "#fff2cf", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.5)" });
          drawText(ctx, "\u524D\u6392\u627F\u4F24 \xB7 \u540E\u6392\u8F93\u51FA", 375, 50, { size: 20, align: "center", color: Theme.textDim });
        }
      }));
      this.add(new Sprite({
        x: 0,
        y: 380,
        w: 750,
        h: 480,
        render: (ctx) => {
          ctx.save();
          ctx.globalAlpha = 0.35;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(375, 560, 300 - i * 60, 150 - i * 30, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(233,200,135,0.25)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
        }
      }));
      SLOTS.forEach((s) => {
        const b = new Button({
          x: s.x - s.size / 2,
          y: s.y - s.size / 2,
          w: s.size,
          h: s.size,
          style: "ghost",
          radius: s.size / 2,
          data: s,
          onClick: () => this.pickHero(s.slot)
        });
        b.onDraw = (ctx) => {
          const id = player.data.team[s.slot];
          if (id) {
            const u = player.unitOf(id);
            drawHeroHead(ctx, b.w / 2, b.h / 2, b.w - 6, u.hero);
            drawText(ctx, `Lv${u.level}`, b.w / 2, b.h - 6, {
              size: 18,
              align: "center",
              color: "#fff",
              weight: "bold",
              stroke: 3,
              strokeColor: "rgba(0,0,0,0.7)"
            });
          } else {
            roundRectPath(ctx, 4, 4, b.w - 8, b.h - 8, b.w / 2);
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
            drawText(ctx, "+", b.w / 2, b.h / 2 + 12, { size: 52, align: "center", color: "rgba(255,255,255,0.5)" });
          }
          if (id) {
            const h = player.hero(id);
            for (let i = 0; i < h.star; i++) {
              ctx.beginPath();
              ctx.arc(b.w / 2 + (i - (h.star - 1) / 2) * 16, b.h + 16, 5, 0, Math.PI * 2);
              ctx.fillStyle = "#ffdf9a";
              ctx.fill();
            }
          }
        };
        this.add(b);
      });
      this.add(new Sprite({
        x: 24,
        y: 830,
        w: 702,
        h: 120,
        render: (ctx, w, h) => {
          drawPanel(ctx, 0, 0, w, h, { radius: 18 });
          drawText(ctx, "\u603B\u6218\u529B", 30, 46, { size: 26, color: Theme.textDim });
          drawText(ctx, fmt(player.teamPower), 130, 48, { size: 34, color: "#ffd98a", weight: "bold" });
          const count = player.teamUnits.length;
          drawText(ctx, `\u51FA\u6218 ${count}/5`, 30, 96, { size: 24, color: "#c8d8f0" });
          const els = {};
          for (const u of player.teamUnits) els[u.hero.element] = (els[u.hero.element] || 0) + 1;
          let x = 200;
          for (const k in els) {
            const e = Elements[k];
            roundRectPath(ctx, x, 74, 74, 32, 8);
            ctx.fillStyle = e.color2;
            ctx.fill();
            drawText(ctx, `${e.name}\xD7${els[k]}`, x + 37, 95, { size: 20, align: "center", color: "#fff", weight: "bold" });
            x += 84;
          }
        }
      }));
      this.add(new Button({
        x: 24,
        y: 966,
        w: 340,
        h: 88,
        style: "dark",
        radius: 18,
        onClick: () => this.autoTeam(),
        icon: (ctx) => drawText(ctx, "\u4E00\u952E\u4E0A\u9635\uFF08\u6218\u529B\u6700\u4F18\uFF09", 170, 54, { size: 26, align: "center", color: "#ffe9b8", weight: "bold" })
      }));
      this.add(new Button({
        x: 386,
        y: 966,
        w: 340,
        h: 88,
        style: "ghost",
        radius: 18,
        onClick: () => {
          player.data.team = [null, null, null, null, null];
          player.save();
          toast("\u5DF2\u6E05\u7A7A\u9635\u5BB9");
        },
        icon: (ctx) => drawText(ctx, "\u6E05\u7A7A\u9635\u5BB9", 170, 54, { size: 26, align: "center", color: Theme.textDim })
      }));
      addBottomNav(this, "lineup");
    }
    pickHero(slot) {
      if (player.data.team[slot]) {
        player.data.team[slot] = null;
        player.save();
      }
      goto("heroes", {
        select: true,
        slot,
        onSelect: (id) => {
          player.setTeamSlot(slot, id);
          player.save();
          goto("lineup");
        }
      });
    }
    autoTeam() {
      const list = player.sortedHeroes.slice().sort((a, b) => player.statsOf(b.id).power - player.statsOf(a.id).power);
      const team = [null, null, null, null, null];
      list.slice(0, 5).forEach((h, i) => {
        team[i] = h.id;
      });
      player.data.team = team;
      player.save();
      toast("\u5DF2\u6309\u6218\u529B\u81EA\u52A8\u5E03\u9635");
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
    }
  };
  register("lineup", () => new LineupScene());

  // js/scenes/gacha.js
  var GachaScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      this.poolIndex = 0;
      this.busy = false;
      addTopBar(this);
      this.add(new Sprite({
        x: 0,
        y: 96,
        w: 750,
        h: 56,
        render: (ctx) => drawText(ctx, "\u7948 \u613F \u53F0", 375, 34, { size: 34, align: "center", color: "#fff2cf", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.5)" })
      }));
      POOLS.forEach((p, i) => {
        const b = new Button({
          x: 40 + i * 340,
          y: 166,
          w: 330,
          h: 76,
          style: i === 0 ? "gold" : "dark",
          radius: 16,
          onClick: () => {
            this.poolIndex = i;
            this.buildPool();
          }
        });
        b.onDraw = (ctx) => {
          const active = i === this.poolIndex;
          const g2 = ctx.createLinearGradient(0, 0, 0, b.h);
          g2.addColorStop(0, active ? "rgba(233,200,135,0.9)" : "rgba(40,48,72,0.9)");
          g2.addColorStop(1, active ? "rgba(180,140,70,0.9)" : "rgba(24,29,48,0.9)");
          roundRectPath(ctx, 0, 0, b.w, b.h, 16);
          ctx.fillStyle = g2;
          ctx.fill();
          ctx.strokeStyle = active ? "#fff2cf" : "rgba(233,200,135,0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
          drawText(ctx, p.name, b.w / 2, 34, { size: 26, align: "center", weight: "bold", color: active ? "#2a1a06" : Theme.text });
          drawText(ctx, p.up.length ? "\u9650\u5B9A UP" : "\u5E38\u9A7B", b.w / 2, 62, { size: 18, align: "center", color: active ? "#4a3418" : Theme.textDim });
        };
        this.add(b);
      });
      this.poolBox = new Sprite({ x: 0, y: 258, w: 750, h: 470, render: () => {
      } });
      this.add(this.poolBox);
      this.buildPool();
      this.oneBtn = new Button({
        x: 40,
        y: 1e3,
        w: 320,
        h: 110,
        style: "gold",
        radius: 20,
        onClick: () => this.doGacha(1),
        icon: (ctx) => {
          drawText(ctx, "\u7948\u613F\u4E00\u6B21", 160, 46, { size: 30, align: "center", weight: "bold", color: "#3a2408" });
          drawText(ctx, "\u8BF7\u795E\u7B26 \xD71", 160, 82, { size: 22, align: "center", color: "#5a3a18" });
        }
      });
      this.tenBtn = new Button({
        x: 390,
        y: 1e3,
        w: 320,
        h: 110,
        style: "red",
        radius: 20,
        onClick: () => this.doGacha(10),
        icon: (ctx) => {
          drawText(ctx, "\u7948\u613F\u5341\u6B21", 160, 46, { size: 30, align: "center", weight: "bold", color: "#fff3e4" });
          drawText(ctx, "\u8BF7\u795E\u7B26 \xD710\uFF08\u5FC5\u51FA\u661F\u541B\u4EE5\u4E0A\uFF09", 160, 82, { size: 20, align: "center", color: "rgba(255,240,220,0.85)" });
        }
      });
      this.add(this.oneBtn);
      this.add(this.tenBtn);
      addBottomNav(this, "gacha");
    }
    get pool() {
      return POOLS[this.poolIndex];
    }
    get poolState() {
      const key = this.pool.id;
      if (!player.data.gacha[key]) player.data.gacha[key] = { pitySSR: 0, pitySR: 0, count: 0 };
      return player.data.gacha[key];
    }
    buildPool() {
      const p = this.pool;
      this.poolBox.clear();
      this.poolBox.add(new Sprite({
        x: 0,
        y: 0,
        w: 750,
        h: 470,
        render: (ctx) => {
          drawPanel(ctx, 40, 0, 670, 460, { radius: 24, c1: "rgba(28,34,56,0.85)", c2: "rgba(14,18,32,0.85)" });
          glow(ctx, 375, 200, 220, "rgba(233,200,135,0.22)", 0.7);
          drawText(ctx, p.desc, 375, 44, { size: 22, align: "center", color: "#c8b898" });
          if (p.up.length) {
            p.up.forEach((id, i) => {
              const hero = getHero(id);
              const cx = 375 + (i - (p.up.length - 1) / 2) * 240;
              drawHeroCard(ctx, cx - 96, 74, 192, 256, hero, { stars: 5 });
            });
          } else {
            const ids = ["wukong", "nezha", "nvwa"];
            ids.forEach((id, i) => {
              const hero = getHero(id);
              drawHeroCard(ctx, 375 + (i - 1) * 240 - 96, 74, 192, 256, hero, { stars: 5 });
            });
          }
          const st = this.poolState;
          drawText(ctx, `\u5929\u795E\u53CA\u4EE5\u4E0A ${(p.rates.SSR * 100).toFixed(1)}% \xB7 \u5723\u5C0A ${(p.rates.UR * 100).toFixed(1)}%`, 375, 372, { size: 22, align: "center", color: "#ffd98a" });
          drawText(ctx, `\u7948\u613F\u6B21\u6570 ${st.count} \xB7 \u518D\u7948\u613F ${Math.max(0, 60 - st.pitySSR)} \u6B21\u5FC5\u51FA\u5929\u795E`, 375, 410, { size: 20, align: "center", color: Theme.textDim });
          roundRectPath(ctx, 120, 424, 510, 12, 6);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fill();
          roundRectPath(ctx, 120, 424, 510 * Math.min(1, st.pitySSR / 60), 12, 6);
          ctx.fillStyle = "#ffd98a";
          ctx.fill();
        }
      }));
    }
    doGacha(times) {
      if (this.busy) return;
      if (player.get("ticket") < times) {
        toast("\u8BF7\u795E\u7B26\u4E0D\u8DB3\uFF0C\u53EF\u5728\u6218\u5F79\u4E2D\u83B7\u53D6", "error");
        return;
      }
      this.busy = true;
      player.spend({ ticket: times });
      const state = this.poolState;
      const results = times === 10 ? drawTen(this.pool, state) : [drawOnce(this.pool, state)];
      state.count += times;
      const gained = results.map((r) => {
        const g2 = player.gainHero(r.heroId);
        return Object.assign({}, r, g2);
      });
      player.save();
      this.buildPool();
      delay(320, () => {
        this.busy = false;
        this.showResult(gained);
      });
    }
    showResult(list) {
      const p = new Popup();
      const cards = [];
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawText(ctx, "\u7948 \u613F \u7ED3 \u679C", 375, 190, { size: 40, align: "center", color: "#fff2cf", weight: "bold", stroke: 4, strokeColor: "rgba(0,0,0,0.6)" });
        drawText(ctx, "\u8F7B\u89E6\u7A7A\u767D\u5904\u5173\u95ED", 375, 240, { size: 22, align: "center", color: Theme.textDim });
      };
      const cols = list.length > 1 ? 5 : 1;
      list.forEach((r, i) => {
        const hero = getHero(r.heroId);
        const cw = list.length > 1 ? 132 : 300;
        const chh = cw * 1.34;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 375 + (col - (cols - 1) / 2) * (cw + 12) - cw / 2;
        const y = 320 + row * (chh + 46);
        const s = new Sprite({
          x,
          y,
          w: cw,
          h: chh,
          onClick: () => {
            if (list.length === 1) {
              p.close();
              goto("heroDetail", { id: r.heroId });
            }
          }
        });
        s.scale = 0;
        tween(s, { to: { scale: 1 }, dur: 320, delay: 60 + i * 70, ease: Ease.backOut });
        s.onDraw = (ctx) => {
          drawHeroCard(ctx, 0, 0, cw, chh, hero, { stars: r.isNew ? 1 : 5 });
          if (r.isNew) {
            roundRectPath(ctx, cw / 2 - 34, -14, 68, 32, 8);
            ctx.fillStyle = "#c8452f";
            ctx.fill();
            drawText(ctx, "NEW", cw / 2, 8, { size: 20, align: "center", color: "#fff", weight: "bold" });
          } else {
            drawText(ctx, `\u5C06\u9B42+${r.soul}`, cw / 2, chh + 30, { size: 20, align: "center", color: "#e8b8ff" });
          }
        };
        p.add(s);
        cards.push(s);
      });
      const ok = new Button({
        x: 255,
        y: 1186,
        w: 240,
        h: 76,
        style: "gold",
        radius: 38,
        label: "\u786E\u8BA4",
        size: 28,
        onClick: () => p.close()
      });
      p.add(ok);
      this.addPopup(p);
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
    }
  };
  register("gacha", () => new GachaScene());

  // js/model/battle.js
  var MAX_ROUND = 16;
  var RAGE_MAX = 100;
  var uidSeq = 0;
  function createUnit(raw, side, slot) {
    const hero = raw.hero;
    const st = raw.stats;
    return {
      uid: ++uidSeq,
      side,
      slot,
      heroId: hero.id,
      hero,
      level: raw.level,
      star: raw.star,
      base: { hp: st.hp, atk: st.atk, def: st.def, spd: st.spd },
      maxHp: st.hp,
      hp: st.hp,
      rage: 0,
      shield: 0,
      buffs: [],
      alive: true,
      revived: false,
      special: hero.passive && hero.passive.special || "",
      mods: hero.passive && hero.passive.mods || {}
    };
  }
  function teamMods(units) {
    const m = { atk: 0, def: 0, spd: 0, hp: 0, crit: 0, skillUp: 0, reduce: 0, rageGain: 0, healUp: 0, regen: 0 };
    for (const u of units) {
      switch (u.special) {
        case "teamAtk":
          m.atk += 0.1;
          break;
        case "teamDef":
          m.def += 0.12;
          break;
        case "teamSpd":
          m.spd += 0.1;
          break;
        case "teamHp":
          m.hp += 0.08;
          break;
        case "teamCrit":
          m.crit += 0.08;
          break;
        case "teamSkillUp":
          m.skillUp += 0.15;
          break;
        case "teamReduce":
          m.reduce += 0.08;
          break;
        case "rageGainTeam":
          m.rageGain += 0.1;
          break;
        case "healUp":
          m.healUp += 0.25;
          break;
        case "regen":
          m.regen += 0.04;
          break;
        case "enemySlow":
          m.enemySlow = (m.enemySlow || 0) + 0.08;
          break;
        default:
          break;
      }
    }
    return m;
  }
  function statOf(u, key, mods) {
    let v = u.base[key];
    if (key === "hp") v *= 1 + mods.hp;
    if (key === "atk") v *= 1 + mods.atk;
    if (key === "def") v *= 1 + mods.def;
    if (key === "spd") v *= 1 + mods.spd;
    for (const b of u.buffs) {
      if (b.type === "atkUp") v += u.base.atk * b.value;
      if (b.type === "atkDown") v -= u.base.atk * b.value;
      if (b.type === "defUp" && key === "def") v += u.base.def * b.value;
      if (b.type === "defDown" && key === "def") v -= u.base.def * b.value;
      if (b.type === "spdDown" && key === "spd") v -= u.base.spd * b.value;
    }
    if (key === "atk" && u.special === "rage") {
      const ratio = u.hp / u.maxHp;
      v *= 1 + Math.max(0, 1 - ratio - 0.5) * 0.6;
    }
    return Math.max(1, v);
  }
  function hasBuff(u, type) {
    return u.buffs.some((b) => b.type === type);
  }
  function addBuff(u, type, value, turns) {
    u.buffs = u.buffs.filter((b) => b.type !== type);
    u.buffs.push({ type, value, turns });
  }
  function removeBuff(u, type) {
    u.buffs = u.buffs.filter((b) => b.type !== type);
  }
  function aliveOf(units, side) {
    return units.filter((u) => u.alive && u.side === side).sort((a, b) => a.slot - b.slot);
  }
  function enemiesOf(units, u) {
    return aliveOf(units, u.side === "ally" ? "enemy" : "ally");
  }
  function alliesOf(units, u) {
    return aliveOf(units, u.side);
  }
  function pickTargets(units, u, mode, count) {
    const foes = enemiesOf(units, u);
    if (!foes.length) return [];
    const front = foes.filter((f) => f.slot <= 1);
    switch (mode) {
      case "front":
        return [front[0] || foes[0]];
      case "front3":
        return front.concat(foes.filter((f) => f.slot > 1)).slice(0, 3);
      case "enemyAll":
        return foes;
      case "enemyLow":
        return [foes.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      case "allyAll":
        return alliesOf(units, u);
      case "allyLow": {
        const list = alliesOf(units, u).slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        return list.slice(0, count || 1);
      }
      case "allyAtk": {
        const list = alliesOf(units, u).slice().sort((a, b) => statOf(b, "atk", u.mods) - statOf(a, "atk", u.mods));
        return list.slice(0, 1);
      }
      case "allyDead": {
        const dead = units.filter((x) => !x.alive && x.side === u.side && !x.revived);
        return dead.slice(0, 1);
      }
      default:
        return [foes[0]];
    }
  }
  function dealDamage(units, src, dst, power, opt, events, isSkill) {
    opt = opt || {};
    const mods = src.modsRef;
    const atk = statOf(src, "atk", mods);
    const def = statOf(dst, "def", dst.modsRef);
    const rel = elementRelation(src.hero.element, dst.hero.element);
    const elemK = rel === 1 ? 1.25 : rel === -1 ? 0.85 : 1;
    let dmg = atk * power * elemK * (1 + mods.skillUp);
    if (dst.slot <= 1 && alliesOf(units, dst).some((a) => a.special === "frontGuard")) dmg *= 0.88;
    if (src.special === "burnBonus" && hasBuff(dst, "burn")) dmg *= opt.burnBonusK || 1.25;
    if (src.special === "execute" && dst.hp / dst.maxHp < 0.3) dmg *= 1.4;
    dmg -= def * 0.4;
    const critRate = 0.05 + (src.mods.crit || 0) + mods.crit + (hasBuff(src, "critUp") ? 0.1 : 0);
    const crit = Math.random() < critRate;
    if (crit) dmg *= 1.5 + (src.mods.critDmg || 0);
    dmg *= 0.95 + Math.random() * 0.1;
    dmg = Math.max(atk * 0.08, dmg) * (1 - mods.reduce);
    dmg = Math.round(dmg);
    const ev = { t: "hit", uid: src.uid, tid: dst.uid, dmg, crit, isSkill: !!isSkill, elem: rel };
    applyDamage(units, dst, dmg, ev, events);
    gainRage(dst, 10 * (1 + dst.modsRef.rageGain), events);
    if (dst.alive && dst.special === "counter" && Math.random() < 0.3) {
      const back = Math.round(statOf(dst, "atk", dst.modsRef) * 0.3);
      const ev2 = { t: "hit", uid: dst.uid, tid: src.uid, dmg: back, crit: false, isSkill: false, elem: 0, counter: true };
      applyDamage(units, src, back, ev2, events);
      events.push(ev2);
    }
    events.push(ev);
    return dmg;
  }
  function applyDamage(units, dst, dmg, ev, events) {
    let rest = dmg;
    if (dst.shield > 0) {
      const absorb = Math.min(dst.shield, rest);
      dst.shield -= absorb;
      rest -= absorb;
      ev.absorb = absorb;
    }
    dst.hp -= rest;
    ev.hp = Math.max(0, dst.hp);
    ev.shield = dst.shield;
    if (dst.hp <= 0) {
      if (dst.special === "revive" && !dst.revived) {
        dst.revived = true;
        dst.hp = Math.round(dst.maxHp * 0.3);
        ev.revive = true;
        ev.hp = dst.hp;
        events.push({ t: "revive", uid: dst.uid, hp: dst.hp });
      } else {
        dst.hp = 0;
        dst.alive = false;
        ev.dead = true;
        events.push({ t: "dead", uid: dst.uid });
      }
    }
  }
  function healUnit(units, src, dst, amount, events) {
    const k = 1 + dst.modsRef.healUp;
    const v = Math.min(dst.maxHp - dst.hp, Math.round(amount * k));
    if (v <= 0) return 0;
    dst.hp += v;
    events.push({ t: "heal", uid: src.uid, tid: dst.uid, heal: v, hp: dst.hp });
    return v;
  }
  function gainRage(u, v, events) {
    if (!u.alive) return;
    u.rage = Math.min(RAGE_MAX, u.rage + v * (1 + u.modsRef.rageGain));
    if (events) events.push({ t: "rage", uid: u.uid, rage: u.rage });
  }
  function simulate(allyTeam, enemyTeam) {
    const events = [{ t: "start" }];
    const units = [];
    allyTeam.forEach((u, i) => units.push(createUnit(u, "ally", i)));
    enemyTeam.forEach((u, i) => units.push(createUnit(u, "enemy", i)));
    const allyMods = teamMods(units.filter((u) => u.side === "ally"));
    const enemyMods = teamMods(units.filter((u) => u.side === "enemy"));
    allyMods.slow = enemyMods.enemySlow || 0;
    enemyMods.slow = allyMods.enemySlow || 0;
    for (const u of units) u.modsRef = u.side === "ally" ? allyMods : enemyMods;
    for (const u of units) {
      if (u.special === "teamRage") {
        for (const a of units) if (a.side === u.side) gainRage(a, 20);
      }
    }
    for (const u of units) {
      u.maxHp = Math.round(u.base.hp * (1 + u.modsRef.hp));
      u.hp = u.maxHp;
    }
    let round = 0;
    let win = null;
    while (round < MAX_ROUND) {
      round++;
      events.push({ t: "round", n: round });
      const order = units.filter((u) => u.alive).sort((a, b) => {
        const sa = statOf(a, "spd", a.modsRef) * (1 - (a.modsRef.slow || 0));
        const sb = statOf(b, "spd", b.modsRef) * (1 - (b.modsRef.slow || 0));
        if (sb !== sa) return sb - sa;
        return a.side === "ally" ? -1 : 1;
      });
      for (const u of order) {
        if (!u.alive || win !== null) continue;
        if (hasBuff(u, "stun")) {
          events.push({ t: "stun", uid: u.uid });
          continue;
        }
        let extra = 0;
        do {
          act(units, u, events);
          extra++;
        } while (u.lastKillAgain && extra < 2);
        u.lastKillAgain = false;
        if (!aliveOf(units, "enemy").length) {
          win = true;
          break;
        }
        if (!aliveOf(units, "ally").length) {
          win = false;
          break;
        }
      }
      for (const u of units) {
        if (!u.alive) continue;
        const burn = u.buffs.find((b) => b.type === "burn");
        if (burn) {
          const src = units.find((x) => x.uid === burn.src) || u;
          let dmg = Math.round(statOf(src, "atk", src.modsRef) * burn.value * (u.hero.element === "fire" ? 0.8 : 1));
          if (src.special === "burnUp") dmg = Math.round(dmg * 1.3);
          const ev = { t: "burn", uid: u.uid, dmg };
          applyDamage(units, u, dmg, ev, events);
          events.push(ev);
          if (!u.alive) continue;
        }
        if (u.special === "selfRegen") healUnit(units, u, u, u.maxHp * 0.06, events);
        if (u.modsRef.regen > 0) healUnit(units, u, u, u.maxHp * u.modsRef.regen, events);
        u.buffs = u.buffs.filter((b) => {
          b.turns--;
          return b.turns > 0;
        });
      }
      if (!aliveOf(units, "enemy").length) win = true;
      if (!aliveOf(units, "ally").length) win = false;
      if (win !== null) break;
    }
    if (win === null) win = false;
    events.push({ t: "end", win, rounds: round });
    return {
      events,
      win,
      rounds: round,
      units: units.map((u) => ({
        uid: u.uid,
        side: u.side,
        slot: u.slot,
        heroId: u.heroId,
        hero: u.hero,
        level: u.level,
        star: u.star,
        maxHp: u.maxHp,
        hp: Math.max(0, u.hp),
        alive: u.alive,
        rage: u.rage
      }))
    };
  }
  function act(units, u, events) {
    const hero = u.hero;
    const useSkill = u.rage >= RAGE_MAX;
    const skill = hero.skill || { name: "\u666E\u653B", target: "front", power: 1, desc: "" };
    const isHeal = !!skill.effect && (skill.effect.heal || skill.effect.shieldAll || skill.effect.revive || skill.effect.allyAtkUp || skill.effect.allyDefUp || skill.effect.allyCritUp);
    if (useSkill) {
      u.rage = 0;
      events.push({ t: "rage", uid: u.uid, rage: 0 });
      events.push({ t: "cast", uid: u.uid, name: skill.name, isSkill: true, desc: skill.desc });
      if (isHeal) castSupport(units, u, skill, events);
      else castAttack(units, u, skill, events, true);
    } else {
      events.push({ t: "cast", uid: u.uid, name: "\u666E\u653B", isSkill: false });
      const tgt = pickTargets(units, u, "front", 1);
      for (const t of tgt) dealDamage(units, u, t, 1.15, {}, events, false);
      gainRage(u, 35 + (u.special === "rageGain" ? 15 : 0), events);
    }
  }
  function castAttack(units, u, skill, events, isSkill) {
    const targets = pickTargets(units, u, skill.target, 1);
    for (const t of targets) {
      let power = skill.power || 1;
      if (skill.effect && skill.effect.backBonus && t.slot > 1) power *= 1 + skill.effect.backBonus;
      const before = t.alive;
      dealDamage(units, u, t, power, {}, events, isSkill);
      if (before && !t.alive && skill.effect && skill.effect.killAgain) u.lastKillAgain = true;
      applyEffects(units, u, t, skill.effect, events);
    }
  }
  function castSupport(units, u, skill, events) {
    const eff = skill.effect || {};
    if (eff.revive) {
      const list = pickTargets(units, u, "allyDead", 1);
      for (const t of list) {
        t.alive = true;
        t.revived = true;
        t.hp = Math.round(t.maxHp * eff.revive.power);
        events.push({ t: "revive", uid: t.uid, hp: t.hp });
      }
    }
    const healTargets = pickTargets(units, u, skill.target, eff.targetLow || 0);
    if (eff.heal) {
      for (const t of healTargets) healUnit(units, u, t, u.maxHp * eff.heal.power, events);
    }
    if (eff.cleanse) {
      for (const t of healTargets) {
        removeBuff(t, "burn");
        removeBuff(t, "stun");
        events.push({ t: "cleanse", uid: t.uid });
      }
    }
    if (eff.shield) {
      for (const t of healTargets) {
        t.shield += Math.round(t.maxHp * eff.shield.power);
        events.push({ t: "shield", uid: t.uid, shield: t.shield });
      }
    }
    if (eff.shieldAll) {
      for (const t of alliesOf(units, u)) {
        t.shield += Math.round(t.maxHp * eff.shieldAll.power);
        events.push({ t: "shield", uid: t.uid, shield: t.shield });
      }
    }
    if (eff.allyAtkUp) for (const t of alliesOf(units, u)) {
      addBuff(t, "atkUp", eff.allyAtkUp.value, eff.allyAtkUp.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u653B\u51FB\u63D0\u5347" });
    }
    if (eff.allyDefUp) for (const t of alliesOf(units, u)) {
      addBuff(t, "defUp", eff.allyDefUp.value, eff.allyDefUp.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u9632\u5FA1\u63D0\u5347" });
    }
    if (eff.allyCritUp) for (const t of alliesOf(units, u)) {
      addBuff(t, "critUp", eff.allyCritUp.value, eff.allyCritUp.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u66B4\u51FB\u63D0\u5347" });
    }
    if (eff.immune) for (const t of alliesOf(units, u)) {
      addBuff(t, "immune", 1, eff.immune.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u514D\u75AB" });
    }
    if (eff.rage) {
      const list = pickTargets(units, u, "allyAtk", 1);
      for (const t of list) gainRage(t, eff.rage, events);
    }
    if (eff.enemyAtkDown) for (const t of enemiesOf(units, u)) {
      addBuff(t, "atkDown", eff.enemyAtkDown.value, eff.enemyAtkDown.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u653B\u51FB\u964D\u4F4E" });
    }
    if (eff.enemyDefDown) for (const t of enemiesOf(units, u)) {
      addBuff(t, "defDown", eff.enemyDefDown.value, eff.enemyDefDown.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u9632\u5FA1\u964D\u4F4E" });
    }
    if (eff.enemySpdDown) for (const t of enemiesOf(units, u)) {
      addBuff(t, "spdDown", eff.enemySpdDown.value, eff.enemySpdDown.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u901F\u5EA6\u964D\u4F4E" });
    }
    if (eff.rageDown) for (const t of enemiesOf(units, u)) {
      t.rage = Math.max(0, t.rage - eff.rageDown);
      events.push({ t: "rage", uid: t.uid, rage: t.rage });
    }
  }
  function applyEffects(units, u, t, eff, events) {
    if (!eff || !t) return;
    if (eff.burn && Math.random() < eff.burn.chance) {
      addBuff(t, "burn", eff.burn.power, eff.burn.turns);
      const b = t.buffs.find((x) => x.type === "burn");
      if (b) b.src = u.uid;
      events.push({ t: "buff", uid: t.uid, name: "\u707C\u70E7" });
    }
    if (eff.stun && Math.random() < eff.stun.chance && !hasBuff(t, "immune")) {
      addBuff(t, "stun", 1, eff.stun.turns);
      events.push({ t: "buff", uid: t.uid, name: "\u7729\u6655" });
    }
    if (eff.selfAtkUp) {
      addBuff(u, "atkUp", eff.selfAtkUp.value, eff.selfAtkUp.turns);
      events.push({ t: "buff", uid: u.uid, name: "\u653B\u51FB\u63D0\u5347" });
    }
    if (eff.selfDefUp) {
      addBuff(u, "defUp", eff.selfDefUp.value, eff.selfDefUp.turns);
      events.push({ t: "buff", uid: u.uid, name: "\u9632\u5FA1\u63D0\u5347" });
    }
    if (eff.selfShield) {
      u.shield += Math.round(u.maxHp * eff.selfShield.power);
      events.push({ t: "shield", uid: u.uid, shield: u.shield });
    }
  }
  function buildEnemyTeam(stage, heroGetter) {
    const star = 1 + Math.floor(stage.chapter / 3);
    const scale = 1 + (5 - stage.enemies.length) * 0.14;
    return stage.enemies.map((id) => {
      const hero = heroGetter(id);
      const lv = stage.level;
      const g2 = 0.085 + (star - 1) * 0.012;
      const k = (1 + (lv - 1) * g2) * scale;
      const sk = 1 + (star - 1) * 0.14;
      const stats = {
        hp: Math.round(hero.__base.hp * k * sk),
        atk: Math.round(hero.__base.atk * k * sk),
        def: Math.round(hero.__base.def * k * sk),
        spd: Math.round(hero.__base.spd),
        power: 0
      };
      stats.power = powerOf(stats, hero, star);
      return { id, hero, level: lv, star, stats };
    });
  }
  var powerCache = {};
  function enemyTeamPower(stage) {
    if (powerCache[stage.id] === void 0) {
      powerCache[stage.id] = buildEnemyTeam(stage, getHero).reduce((s, u) => s + u.stats.power, 0);
    }
    return powerCache[stage.id];
  }

  // js/scenes/stage.js
  var StageScene = class extends Scene {
    constructor(params) {
      super();
      params = params || {};
      this.t = 0;
      this.chapter = params.chapter || player.currentStage.chapter;
      addTopBar(this, { x: 132, w: 594 });
      this.add(new Sprite({ x: 0, y: 0, w: 750, h: 100, render: (ctx) => drawTitleBar(ctx, "\u5F81 \u6218", "\u4E3B\u7EBF\u6218\u5F79") }));
      this.add(new Button({
        x: 20,
        y: 22,
        w: 96,
        h: 64,
        style: "dark",
        radius: 32,
        onClick: () => goto("home"),
        icon: (ctx) => {
          ctx.save();
          ctx.translate(48, 32);
          ctx.fillStyle = "#f2e7d3";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-14, -4);
          ctx.lineTo(-14, 4);
          ctx.lineTo(-6, 4);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }));
      CHAPTERS.forEach((c, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const b = new Button({
          x: 24 + col * 180,
          y: 116 + row * 84,
          w: 168,
          h: 72,
          style: "dark",
          radius: 14,
          data: c.id,
          onClick: (self) => {
            this.chapter = self.data;
            this.buildList();
          }
        });
        b.onDraw = (ctx) => {
          const unlocked = chapterUnlocked(c.id, player.progress);
          const active = c.id === this.chapter;
          const g2 = ctx.createLinearGradient(0, 0, 0, b.h);
          if (active) {
            g2.addColorStop(0, "#e9c887");
            g2.addColorStop(1, "#b8894a");
          } else if (unlocked) {
            g2.addColorStop(0, "rgba(48,58,86,0.95)");
            g2.addColorStop(1, "rgba(26,32,52,0.95)");
          } else {
            g2.addColorStop(0, "rgba(30,34,48,0.7)");
            g2.addColorStop(1, "rgba(18,20,32,0.7)");
          }
          roundRectPath(ctx, 0, 0, b.w, b.h, 14);
          ctx.fillStyle = g2;
          ctx.fill();
          ctx.strokeStyle = active ? "#fff2cf" : "rgba(233,200,135,0.25)";
          ctx.lineWidth = 2;
          ctx.stroke();
          const prog = player.chapterProgress[c.id - 1];
          drawText(ctx, c.short, b.w / 2, 30, {
            size: 24,
            align: "center",
            weight: "bold",
            color: !unlocked ? "#5c6480" : active ? "#2a1a06" : "#e8dcbf"
          });
          drawText(ctx, !unlocked ? "\u672A\u89E3\u9501" : `${prog.cleared}/${prog.total}`, b.w / 2, 58, {
            size: 18,
            align: "center",
            color: !unlocked ? "#5c6480" : active ? "#4a3418" : Theme.textDim
          });
        };
        this.add(b);
      });
      this.scroll = new ScrollView({ x: 0, y: 300, w: 750, h: 920 });
      this.add(this.scroll);
      this.buildList();
      addBottomNav(this, "stage");
    }
    buildList() {
      this.scroll.clear();
      const c = CHAPTERS[this.chapter - 1];
      this.scroll.contentH = c.stages.length * 142 + 30;
      c.stages.forEach((s, i) => {
        const unlocked = stageUnlocked(s, player.progress);
        const cleared = player.isCleared(s.id);
        const item = new Sprite({
          x: 30,
          y: 16 + i * 142,
          w: 690,
          h: 126,
          onClick: () => this.showStage(s, unlocked)
        });
        item.onDraw = (ctx) => {
          drawPanel(ctx, 0, 0, 690, 126, {
            radius: 16,
            c1: cleared ? "rgba(38,62,52,0.92)" : unlocked ? "rgba(34,42,66,0.92)" : "rgba(24,28,42,0.75)",
            c2: cleared ? "rgba(22,40,32,0.92)" : unlocked ? "rgba(18,24,40,0.92)" : "rgba(14,16,26,0.75)",
            borderColor: unlocked ? "rgba(233,200,135,0.45)" : "rgba(255,255,255,0.1)"
          });
          ctx.beginPath();
          ctx.arc(64, 63, 34, 0, Math.PI * 2);
          ctx.fillStyle = cleared ? "#2f8f5b" : unlocked ? "#b8894a" : "#3a4056";
          ctx.fill();
          drawText(ctx, String(s.index), 64, 72, { size: 30, align: "center", weight: "bold", color: "#fff" });
          drawText(ctx, s.name, 116, 46, { size: 28, color: unlocked ? "#fff2cf" : "#6a7290", weight: "bold" });
          drawText(ctx, `\u654C\u5C06 Lv${s.level} \xB7 ${s.enemies.length} \u4EBA \xB7 \u63A8\u8350\u6218\u529B ${fmt(enemyTeamPower(s))}`, 116, 82, {
            size: 21,
            color: unlocked ? Theme.textDim : "#5c6480"
          });
          const sx = 560;
          if (cleared) {
            roundRectPath(ctx, sx - 55, 16, 110, 32, 8);
            ctx.fillStyle = "rgba(47,143,91,0.9)";
            ctx.fill();
            drawText(ctx, "\u5DF2\u901A\u5173", sx, 38, { size: 20, align: "center", color: "#fff", weight: "bold" });
          } else if (!unlocked) {
            drawText(ctx, "\u672A\u89E3\u9501", sx, 38, { size: 20, align: "center", color: "#6a7290" });
          } else {
            drawText(ctx, `\u4E91\u6C14 ${s.cost}`, sx, 38, { size: 20, align: "center", color: "#9ad7f5" });
          }
          const rw = s.reward;
          drawResourceIcon(ctx, 505, 66, 16, "coin");
          drawText(ctx, fmt(rw.coin), 527, 72, { size: 19, color: "#ffd98a" });
          drawResourceIcon(ctx, 600, 66, 16, "exp");
          drawText(ctx, fmt(rw.exp), 622, 72, { size: 19, color: "#ffb08a" });
          if (rw.ticket) {
            drawResourceIcon(ctx, 505, 96, 16, "ticket");
            drawText(ctx, `\xD7${rw.ticket}`, 527, 102, { size: 19, color: "#ffe9b8" });
          }
          if (rw.soul) {
            drawResourceIcon(ctx, 600, 96, 16, "soul");
            drawText(ctx, `\xD7${rw.soul}`, 622, 102, { size: 19, color: "#e8b8ff" });
          }
          if (s.isBoss) {
            roundRectPath(ctx, 116, 92, 60, 28, 8);
            ctx.fillStyle = "#c8452f";
            ctx.fill();
            drawText(ctx, "BOSS", 146, 111, { size: 18, align: "center", color: "#fff", weight: "bold" });
          }
        };
        this.scroll.add(item);
      });
    }
    showStage(s, unlocked) {
      if (!unlocked) {
        toast("\u901A\u5173\u524D\u7F6E\u5173\u5361\u540E\u89E3\u9501", "error");
        return;
      }
      const p = new Popup();
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawPanel(ctx, 55, 400, 640, 560, { radius: 24 });
        drawText(ctx, s.name, 375, 452, { size: 34, align: "center", color: "#fff2cf", weight: "bold" });
        drawText(ctx, `${s.desc} \xB7 \u654C\u5C06 Lv${s.level}`, 375, 488, { size: 22, align: "center", color: Theme.textDim });
        s.enemies.forEach((id, i) => {
          const hero = getHero(id);
          const cx = 375 + (i - (s.enemies.length - 1) / 2) * 116;
          drawHeroHead(ctx, cx, 580, 96, hero);
          drawText(ctx, hero.name, cx, 646, { size: 20, align: "center", color: "#e8dcbf" });
        });
        drawText(ctx, "\u63A8\u8350\u6218\u529B", 120, 700, { size: 24, color: Theme.textDim });
        drawText(ctx, fmt(enemyTeamPower(s)), 250, 702, { size: 26, color: "#ffd98a", weight: "bold" });
        drawText(ctx, "\u6211\u65B9\u6218\u529B", 120, 740, { size: 24, color: Theme.textDim });
        drawText(ctx, fmt(player.teamPower), 250, 742, {
          size: 26,
          weight: "bold",
          color: player.teamPower >= s.power ? "#8fdcaa" : "#e0684a"
        });
        drawText(ctx, "\u901A\u5173\u5956\u52B1", 120, 800, { size: 24, color: "#ffe9b8", weight: "bold" });
        const rw = s.reward;
        const list = [
          { type: "coin", text: fmt(rw.coin) },
          { type: "exp", text: fmt(rw.exp) }
        ];
        if (rw.ticket) list.push({ type: "ticket", text: `\xD7${rw.ticket}` });
        if (rw.soul) list.push({ type: "soul", text: `\xD7${rw.soul}` });
        list.forEach((r, i) => {
          const x = 130 + i * 130;
          drawResourceIcon(ctx, x, 850, 22, r.type);
          drawText(ctx, r.text, x + 30, 858, { size: 22, color: "#f2e7d3" });
        });
        if (!player.isCleared(s.id)) {
          drawText(ctx, "\u9996\u6B21\u901A\u5173\u989D\u5916\u5956\u52B1", 130, 900, { size: 20, color: "#8fdcaa" });
        }
        drawText(ctx, `\u6D88\u8017\u4E91\u6C14 ${s.cost}\uFF08\u5F53\u524D ${player.get("stamina")}\uFF09`, 375, 930, { size: 22, align: "center", color: "#9ad7f5" });
      };
      const challenge = new Button({
        x: 115,
        y: 826,
        w: 240,
        h: 84,
        style: "gold",
        radius: 20,
        label: "\u51FA \u5F81",
        size: 30,
        onClick: () => {
          p.close();
          this.startBattle(s);
        }
      });
      const close = new Button({
        x: 395,
        y: 826,
        w: 240,
        h: 84,
        style: "dark",
        radius: 20,
        label: "\u8FD4 \u56DE",
        size: 30,
        onClick: () => p.close()
      });
      p.add(challenge);
      p.add(close);
      this.addPopup(p);
    }
    startBattle(s) {
      if (!player.teamUnits.length) {
        toast("\u8BF7\u5148\u524D\u5F80\u9635\u5BB9\u4E0A\u9635\u795E\u5C06", "error");
        return;
      }
      if (player.get("stamina") < s.cost) {
        toast("\u4E91\u6C14\u4E0D\u8DB3\uFF0C\u7A0D\u540E\u518D\u6765", "error");
        return;
      }
      player.spend({ stamina: s.cost });
      player.save();
      goto("battle", { stageId: s.id });
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
      this.scroll.update(dt);
    }
  };
  register("stage", (p) => new StageScene(p));

  // js/scenes/battle.js
  function posOf(u, count) {
    if (u.side === "ally") {
      if (u.slot < 2) return { x: 375 + (u.slot === 0 ? -120 : 120), y: 790, size: 124 };
      return { x: 375 + (u.slot - 3) * 190, y: 676, size: 108 };
    }
    if (u.slot < 2) return { x: 375 + (u.slot === 0 ? -120 : 120), y: 430, size: 124 };
    return { x: 375 + (u.slot - 3) * 190, y: 316, size: 108 };
  }
  var BattleScene = class extends Scene {
    constructor(params) {
      super();
      params = params || {};
      this.t = 0;
      this.stage = getStage(params.stageId) || getStage("1-1");
      this.result = simulate(player.teamUnits, buildEnemyTeam(this.stage, getHero));
      this.events = this.result.events;
      this.idx = 0;
      this.timer = 0;
      this.speed = 1;
      this.finished = false;
      this.floats = [];
      this.banner = null;
      this.rewarded = false;
      this.units = {};
      for (const u of this.result.units) {
        const p = posOf(u);
        this.units[u.uid] = {
          uid: u.uid,
          side: u.side,
          slot: u.slot,
          hero: u.hero,
          level: u.level,
          star: u.star,
          maxHp: u.maxHp,
          hp: u.maxHp,
          dispHp: u.maxHp,
          rage: 0,
          dispRage: 0,
          alive: true,
          dead: false,
          flash: 0,
          scale: 1,
          x: p.x,
          y: p.y,
          size: p.size,
          buffs: []
        };
      }
      this.add(new Sprite({
        x: 0,
        y: 20,
        w: 750,
        h: 70,
        render: (ctx) => {
          drawText(ctx, this.stage.name, 375, 30, { size: 28, align: "center", color: "#fff2cf", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.6)" });
          drawText(ctx, `\u7B2C ${this.roundNo} \u56DE\u5408`, 375, 62, { size: 22, align: "center", color: Theme.textDim });
        }
      }));
      this.speedBtn = new Button({
        x: 610,
        y: 24,
        w: 120,
        h: 60,
        style: "dark",
        radius: 16,
        onClick: () => {
          this.speed = this.speed >= 3 ? 1 : this.speed + 1;
        },
        icon: (ctx) => drawText(ctx, `${this.speed} \u500D\u901F`, 60, 38, { size: 22, align: "center", color: "#ffe9b8" })
      });
      this.add(this.speedBtn);
      this.skipBtn = new Button({
        x: 470,
        y: 24,
        w: 120,
        h: 60,
        style: "ghost",
        radius: 16,
        onClick: () => this.skip(),
        icon: (ctx) => drawText(ctx, "\u8DF3\u8FC7", 60, 38, { size: 22, align: "center", color: Theme.textDim })
      });
      this.add(this.skipBtn);
      this.field = new Sprite({ x: 0, y: 100, w: 750, h: 1e3, render: (ctx) => this.renderField(ctx) });
      this.add(this.field);
      this.add(new Button({
        x: 20,
        y: 24,
        w: 96,
        h: 60,
        style: "dark",
        radius: 16,
        onClick: () => {
          this.confirmLeave();
        },
        icon: (ctx) => drawText(ctx, "\u64A4\u9000", 48, 38, { size: 22, align: "center", color: "#e08c8c" })
      }));
    }
    get roundNo() {
      return this._round || 1;
    }
    drawBackground(ctx, W, H) {
      const g2 = ctx.createLinearGradient(0, 0, 0, H);
      g2.addColorStop(0, "#202a48");
      g2.addColorStop(0.42, "#2a2038");
      g2.addColorStop(0.58, "#1a2038");
      g2.addColorStop(1, "#0c1020");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#e9c887";
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(0, H * 0.45);
      ctx.lineTo(W, H * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    renderField(ctx) {
      const list = Object.values(this.units);
      for (const u of list) {
        if (u.side === "enemy") this.renderUnit(ctx, u);
      }
      for (const u of list) {
        if (u.side === "ally") this.renderUnit(ctx, u);
      }
      for (const f of this.floats) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - f.life / f.dur);
        drawText(ctx, f.text, f.x, f.y, {
          size: f.size,
          align: "center",
          weight: "bold",
          color: f.color,
          stroke: 4,
          strokeColor: "rgba(0,0,0,0.65)"
        });
        ctx.restore();
      }
      if (this.banner && this.banner.life < this.banner.dur) {
        const b = this.banner;
        const p = b.life / b.dur;
        const alpha = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        const w = 520;
        const x = 375 - w / 2 + (1 - Math.min(1, p / 0.2)) * 120;
        const g2 = ctx.createLinearGradient(x, 0, x + w, 0);
        g2.addColorStop(0, "rgba(12,16,28,0)");
        g2.addColorStop(0.3, "rgba(12,16,28,0.9)");
        g2.addColorStop(0.7, "rgba(12,16,28,0.9)");
        g2.addColorStop(1, "rgba(12,16,28,0)");
        ctx.fillStyle = g2;
        ctx.fillRect(x, 520, w, 96);
        ctx.strokeStyle = "rgba(233,200,135,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 40, 568);
        ctx.lineTo(x + w - 40, 568);
        ctx.stroke();
        drawText(ctx, b.name, 375, 556, { size: 38, align: "center", weight: "bold", color: b.isSkill ? "#ffe9b8" : "#e8dcbf", stroke: 4, strokeColor: "rgba(0,0,0,0.7)" });
        if (b.sub) drawText(ctx, b.sub, 375, 594, { size: 22, align: "center", color: "#c8b898" });
        ctx.restore();
      }
    }
    renderUnit(ctx, u) {
      const cx = u.x;
      const cy = u.y;
      const s = u.size;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(u.scale, u.scale);
      if (u.dead) ctx.globalAlpha = 0.32;
      if (u.side === "ally") glow(ctx, 0, s * 0.5, s * 0.6, "rgba(120,180,255,0.35)", 0.5);
      else glow(ctx, 0, s * 0.5, s * 0.6, "rgba(255,120,120,0.3)", 0.5);
      if (u.flash > 0.01) {
        ctx.save();
        ctx.globalAlpha = u.flash * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }
      drawHeroHead(ctx, 0, 0, s, u.hero, { frameColor: u.side === "ally" ? "#8fc0ff" : "#ff9a8a" });
      const bw = s * 0.86;
      const by = s * 0.58;
      drawBar(ctx, -bw / 2, by, bw, 12, u.dispHp / u.maxHp, {
        c1: u.side === "ally" ? "#8fdcaa" : "#ff8a7a",
        c2: u.side === "ally" ? "#2f8f5b" : "#a8301c"
      });
      drawBar(ctx, -bw / 2, by + 16, bw, 7, u.dispRage / 100, { c1: "#ffe9a8", c2: "#c8862f" });
      drawText(ctx, `${u.hero.name}`, 0, by + 42, {
        size: 20,
        align: "center",
        color: u.dead ? "#7a8298" : "#f2e7d3",
        weight: "bold",
        stroke: 3,
        strokeColor: "rgba(0,0,0,0.6)"
      });
      if (u.side === "ally") drawText(ctx, `Lv${u.level}`, 0, by + 62, { size: 16, align: "center", color: Theme.textDim });
      if (u.buffs.length) {
        const icons = { burn: "\u707C", stun: "\u6655", atkUp: "\u653B\u2191", defUp: "\u9632\u2191", immune: "\u514D" };
        u.buffs.forEach((b, i) => {
          const t = icons[b] || "\xB7";
          roundRectPath(ctx, -u.buffs.length * 14 + i * 28 + 2, -s * 0.62, 24, 24, 6);
          ctx.fillStyle = b === "burn" ? "rgba(232,83,60,0.9)" : "rgba(60,90,140,0.9)";
          ctx.fill();
          drawText(ctx, t, -u.buffs.length * 14 + i * 28 + 14, -s * 0.62 + 17, { size: 16, align: "center", color: "#fff" });
        });
      }
      if (u.dead) {
        drawText(ctx, "\u8D25", 0, 8, { size: 36, align: "center", color: "#ff8a7a", weight: "bold", stroke: 4, strokeColor: "rgba(0,0,0,0.7)" });
      }
      ctx.restore();
    }
    /* ---------- 事件播放 ---------- */
    addFloat(uid, text, color, size) {
      const u = this.units[uid];
      if (!u) return;
      this.floats.push({ x: u.x + (Math.random() * 40 - 20), y: u.y - 20, text, color, size: size || 30, life: 0, dur: 800 });
      if (this.floats.length > 24) this.floats.shift();
    }
    playEvent(ev) {
      const s = this.speed;
      switch (ev.t) {
        case "start":
          return 0;
        case "round":
          this._round = ev.n;
          this.banner = { name: `\u7B2C ${ev.n} \u56DE\u5408`, sub: "", isSkill: false, life: 0, dur: 700 / s };
          return 420 / s;
        case "cast": {
          const u = this.units[ev.uid];
          if (!u) return 0;
          this.banner = { name: ev.name, sub: u.hero.name, isSkill: ev.isSkill, life: 0, dur: 900 / s };
          tween(u, { to: { scale: 1.18 }, dur: 140 / s, ease: Ease.quadOut, onComplete: () => tween(u, { to: { scale: 1 }, dur: 200 / s }) });
          return 480 / s;
        }
        case "hit": {
          const src = this.units[ev.uid];
          const dst = this.units[ev.tid];
          if (!dst) return 0;
          dst.hp = ev.hp;
          dst.flash = 1;
          tween(dst, { to: { flash: 0 }, dur: 320 / s });
          const crit = ev.crit;
          this.addFloat(ev.tid, `${crit ? "\u66B4\u51FB " : ""}${ev.dmg}`, crit ? "#ffd54a" : ev.counter ? "#8fdcaa" : "#ff8a7a", crit ? 40 : 30);
          if (ev.dead) this.markDead(ev.tid);
          return 300 / s;
        }
        case "heal": {
          const dst = this.units[ev.tid];
          if (!dst) return 0;
          dst.hp = ev.hp;
          this.addFloat(ev.tid, `+${ev.heal}`, "#8fdcaa", 30);
          return 220 / s;
        }
        case "burn": {
          const dst = this.units[ev.uid];
          if (!dst) return 0;
          dst.hp = ev.hp;
          dst.buffs = dst.buffs.includes("burn") ? dst.buffs : dst.buffs.concat("burn");
          this.addFloat(ev.uid, `${ev.dmg}`, "#ffb08a", 26);
          if (ev.dead) this.markDead(ev.uid);
          return 240 / s;
        }
        case "shield": {
          const u = this.units[ev.uid];
          if (u) this.addFloat(ev.uid, "\u62A4\u76FE", "#9ad7f5", 24);
          return 160 / s;
        }
        case "buff": {
          const u = this.units[ev.uid];
          if (u) {
            this.addFloat(ev.uid, ev.name, "#c8b898", 22);
            if (!u.buffs.includes(ev.name)) u.buffs.push(ev.name);
          }
          return 160 / s;
        }
        case "cleanse": {
          const u = this.units[ev.uid];
          if (u) u.buffs = [];
          return 120 / s;
        }
        case "rage": {
          const u = this.units[ev.uid];
          if (u) u.rage = ev.rage;
          return 0;
        }
        case "stun": {
          const u = this.units[ev.uid];
          if (u) this.addFloat(ev.uid, "\u7729\u6655", "#c8a0ff", 24);
          return 220 / s;
        }
        case "revive": {
          const u = this.units[ev.uid];
          if (u) {
            u.hp = ev.hp;
            u.dead = false;
            u.alive = true;
            this.addFloat(ev.uid, "\u590D\u6D3B\uFF01", "#ffe9a8", 30);
          }
          return 340 / s;
        }
        case "dead":
          return 0;
        case "end":
          this.finish(ev.win);
          return 0;
        default:
          return 0;
      }
    }
    markDead(uid) {
      const u = this.units[uid];
      if (!u) return;
      u.dead = true;
      u.alive = false;
      tween(u, { to: { scale: 0.8 }, dur: 260 });
    }
    skip() {
      while (this.idx < this.events.length) {
        const ev = this.events[this.idx++];
        this.applySilent(ev);
      }
      this.finish(this.result.win);
    }
    applySilent(ev) {
      if (ev.t === "hit" || ev.t === "burn" || ev.t === "heal") {
        const dst = this.units[ev.tid || ev.uid];
        if (dst) dst.hp = ev.hp !== void 0 ? ev.hp : dst.hp;
        if (ev.dead) this.markDead(ev.tid || ev.uid);
      } else if (ev.t === "dead") {
        this.markDead(ev.uid);
      } else if (ev.t === "end") {
        this.finish(ev.win);
      }
    }
    finish(win) {
      if (this.finished) return;
      this.finished = true;
      this.win = win;
      player.data.stats.battles++;
      if (win) player.data.stats.wins++;
      player.save();
      delay(win ? 700 : 500, () => this.showResult(win));
    }
    showResult(win) {
      const s = this.stage;
      let first = false;
      if (win) {
        first = player.clearStage(s.id);
        player.add("coin", s.reward.coin);
        player.add("exp", s.reward.exp);
        if (s.reward.ticket) player.add("ticket", s.reward.ticket);
        if (s.reward.soul) player.add("soul", s.reward.soul);
        player.save();
      }
      const p = new Popup();
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawPanel(ctx, 75, 380, 600, 600, { radius: 26, c1: "rgba(30,36,58,0.97)", c2: "rgba(16,20,34,0.97)" });
        glow(ctx, 375, 470, 160, win ? "rgba(255,220,140,0.5)" : "rgba(120,140,180,0.4)", 0.6);
        drawText(ctx, win ? first ? "\u9996\u6B21\u901A\u5173\uFF01" : "\u6218 \u6597 \u80DC \u5229" : "\u6218 \u6597 \u5931 \u8D25", 375, 460, {
          size: 44,
          align: "center",
          weight: "bold",
          color: win ? "#ffe9b8" : "#a8b4d0",
          stroke: 5,
          strokeColor: "rgba(0,0,0,0.6)"
        });
        drawText(ctx, `${s.name} \xB7 ${this.result.rounds} \u56DE\u5408`, 375, 506, { size: 24, align: "center", color: Theme.textDim });
        if (win) {
          drawText(ctx, "\u83B7\u5F97\u5956\u52B1", 375, 560, { size: 26, align: "center", color: "#8fdcaa", weight: "bold" });
          const rw = s.reward;
          const list = [{ type: "coin", text: fmt(rw.coin) }, { type: "exp", text: fmt(rw.exp) }];
          if (rw.ticket) list.push({ type: "ticket", text: `\xD7${rw.ticket}` });
          if (rw.soul) list.push({ type: "soul", text: `\xD7${rw.soul}` });
          list.forEach((r, i) => {
            const x = 375 + (i - (list.length - 1) / 2) * 130;
            drawResourceIcon(ctx, x - 40, 620, 24, r.type);
            drawText(ctx, r.text, x + 0, 630, { size: 24, color: "#f2e7d3", weight: "bold" });
          });
          drawText(ctx, "\u63D0\u793A\uFF1A\u63D0\u5347\u795E\u5C06\u7B49\u7EA7\u4E0E\u661F\u7EA7\u53EF\u589E\u5F3A\u6218\u529B", 375, 700, { size: 22, align: "center", color: Theme.textDim });
        } else {
          drawText(ctx, "\u518D\u63D0\u5347\u4E00\u4E0B\u795E\u5C06\u7684\u7B49\u7EA7\u4E0E\u661F\u7EA7\u5427", 375, 600, { size: 24, align: "center", color: Theme.textDim });
          drawText(ctx, "\u53EF\u5728\u9635\u5BB9\u4E2D\u8C03\u6574\u7AD9\u4F4D\u4E0E\u51FA\u6218\u795E\u5C06", 375, 640, { size: 22, align: "center", color: Theme.textDim });
        }
      };
      const nextId = nextStageId(s.id);
      const btns = [];
      if (win && nextId) {
        btns.push(new Button({
          x: 115,
          y: 830,
          w: 240,
          h: 84,
          style: "gold",
          radius: 20,
          label: "\u4E0B\u4E00\u5173",
          size: 28,
          onClick: () => {
            p.close();
            if (player.get("stamina") < (getStage(nextId).cost || 6)) {
              toast("\u4E91\u6C14\u4E0D\u8DB3", "error");
              goto("stage");
              return;
            }
            player.spend({ stamina: getStage(nextId).cost || 6 });
            player.save();
            goto("battle", { stageId: nextId });
          }
        }));
      } else {
        btns.push(new Button({
          x: 115,
          y: 830,
          w: 240,
          h: 84,
          style: "dark",
          radius: 20,
          label: "\u518D\u6218\u4E00\u6B21",
          size: 28,
          onClick: () => {
            p.close();
            if (player.get("stamina") < s.cost) {
              toast("\u4E91\u6C14\u4E0D\u8DB3", "error");
              goto("stage");
              return;
            }
            player.spend({ stamina: s.cost });
            player.save();
            goto("battle", { stageId: s.id });
          }
        }));
      }
      btns.push(new Button({
        x: 395,
        y: 830,
        w: 240,
        h: 84,
        style: win ? "dark" : "gold",
        radius: 20,
        label: win ? "\u8FD4\u56DE\u6218\u5F79" : "\u53BB\u9635\u5BB9",
        size: 28,
        onClick: () => {
          p.close();
          goto(win ? "stage" : "lineup");
        }
      }));
      btns.forEach((b) => p.add(b));
      this.addPopup(p);
    }
    confirmLeave() {
      const p = new Popup();
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawPanel(ctx, 155, 560, 440, 240, { radius: 20 });
        drawText(ctx, "\u64A4\u9000\u5C06\u5931\u53BB\u672C\u6B21\u6311\u6218\u7684\u4E91\u6C14", 375, 620, { size: 26, align: "center", color: "#fff2cf" });
        drawText(ctx, "\u786E\u5B9A\u64A4\u9000\u5417\uFF1F", 375, 660, { size: 22, align: "center", color: Theme.textDim });
      };
      p.add(new Button({ x: 195, y: 700, w: 160, h: 70, style: "dark", label: "\u7EE7\u7EED\u6218\u6597", size: 24, onClick: () => p.close() }));
      p.add(new Button({ x: 395, y: 700, w: 160, h: 70, style: "red", label: "\u64A4\u9000", size: 24, onClick: () => {
        p.close();
        goto("stage");
      } }));
      this.addPopup(p);
    }
    update(dt) {
      this.t += dt;
      if (!this.finished) {
        this.timer += dt;
        let guard = 0;
        while (this.idx < this.events.length && guard++ < 40) {
          const ev = this.events[this.idx++];
          const d = this.playEvent(ev);
          if (d <= 0) continue;
          this.timer -= d;
          if (this.timer < 0) break;
        }
        if (this.idx >= this.events.length && !this.finished) this.finish(this.result.win);
      }
      if (this.banner) this.banner.life += dt;
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life += dt;
        f.y -= dt * 0.045;
        if (f.life >= f.dur) this.floats.splice(i, 1);
      }
      for (const k in this.units) {
        const u = this.units[k];
        u.dispHp += (u.hp - u.dispHp) * Math.min(1, dt / 120);
        u.dispRage += (u.rage - u.dispRage) * Math.min(1, dt / 120);
      }
    }
  };
  register("battle", (p) => new BattleScene(p));

  // js/scenes/shop.js
  var SHOP_ITEMS = [
    {
      key: "stamina",
      name: "\u4F53\u529B\u4E39",
      desc: "\u7ACB\u5373\u6062\u590D 60 \u70B9\u4E91\u6C14",
      icon: "stamina",
      cost: { jade: 20 },
      gain: { stamina: 60 },
      okMsg: "\u4E91\u6C14 +60"
    },
    {
      key: "coin",
      name: "\u7075\u77F3\u888B",
      desc: "\u83B7\u5F97 2000 \u7075\u77F3",
      icon: "coin",
      cost: { jade: 30 },
      gain: { coin: 2e3 },
      okMsg: "\u7075\u77F3 +2000"
    },
    {
      key: "iron",
      name: "\u7CBE\u94C1 \xD75",
      desc: "\u4E13\u5C5E\u88C5\u5907\u79D1\u6280\u5347\u7EA7\u6750\u6599",
      icon: "iron",
      cost: { coin: 3e3 },
      gain: { iron: 5 },
      okMsg: "\u7CBE\u94C1 +5"
    },
    {
      key: "crystal",
      name: "\u7384\u6676 \xD71",
      desc: "\u4E13\u5C5E\u88C5\u5907\u8FDB\u9636\u6750\u6599",
      icon: "crystal",
      cost: { coin: 9e3 },
      gain: { crystal: 1 },
      okMsg: "\u7384\u6676 +1"
    },
    {
      key: "soul",
      name: "\u5C06\u9B42 \xD710",
      desc: "\u795E\u5C06\u5347\u661F\u6750\u6599",
      icon: "soul",
      cost: { jade: 50 },
      gain: { soul: 10 },
      okMsg: "\u5C06\u9B42 +10"
    },
    {
      key: "box",
      name: "\u88C5\u5907\u7BB1",
      desc: "\u5F00\u542F\u83B7\u5F97\u968F\u673A\u90E8\u4F4D\u5E38\u89C4\u88C5\u5907",
      icon: "box",
      cost: { coin: 5e3 },
      box: 1,
      okMsg: ""
    },
    {
      key: "box10",
      name: "\u88C5\u5907\u7BB1 \xD710",
      desc: "\u6279\u91CF\u5F00\u542F\uFF0C\u66F4\u6613\u51FA\u9AD8\u54C1\u8D28",
      icon: "box",
      cost: { jade: 60 },
      box: 10,
      okMsg: ""
    }
  ];
  var ShopScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      addTopBar(this, { x: 132, w: 594 });
      this.add(new Sprite({ x: 0, y: 0, w: 750, h: 100, render: (ctx) => drawTitleBar2(ctx, "\u4ED9 \u5E02", "\u7075\u6750\u767E\u8D27 \xB7 \u5E94\u6709\u5C3D\u6709") }));
      this.add(new Button({
        x: 20,
        y: 22,
        w: 96,
        h: 64,
        style: "dark",
        radius: 32,
        onClick: () => goto("home"),
        icon: (ctx) => {
          ctx.save();
          ctx.translate(48, 32);
          ctx.fillStyle = "#f2e7d3";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-14, -4);
          ctx.lineTo(-14, 4);
          ctx.lineTo(-6, 4);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }));
      const rowH = 132;
      const scroll = new ScrollView({ x: 24, y: 112, w: 702, h: 1100, contentH: (SHOP_ITEMS.length + 1) * (rowH + 16) });
      const giftRow = new Sprite({ x: 0, y: 0, w: 702, h: rowH });
      giftRow.render = (ctx, w, h) => {
        drawPanel(ctx, 0, 0, w, h, { radius: 18, c1: "rgba(60,46,20,0.92)", c2: "rgba(40,30,12,0.92)" });
        ctx.save();
        roundRectPath(ctx, 16, 16, 100, 100, 14);
        ctx.fillStyle = "rgba(255,217,138,0.15)";
        ctx.fill();
        ctx.strokeStyle = "#ffd98a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        drawText(ctx, "\u798F", 66, 66, { size: 48, align: "center", color: "#ffd98a", weight: "bold" });
        drawText(ctx, "\u798F\u5229\u793C\u5305\u7801 \xB7 \u53EF\u91CD\u590D\u4F7F\u7528", 140, 44, { size: 30, color: "#ffe9b8", weight: "bold" });
        drawText(ctx, "\u70B9\u51FB\u5151\u6362\uFF0C\u65E0\u9650\u6B21\u9886\u53D6\u6D77\u91CF\u8D44\u6E90", 140, 84, { size: 22, color: "#ffd98a" });
      };
      scroll.add(giftRow);
      const giftBtn = new Button({
        x: 510,
        y: 34,
        w: 168,
        h: 64,
        style: "gold",
        radius: 16,
        onClick: () => this.openCode(),
        icon: (ctx, b) => drawText(ctx, "\u5151 \u6362", 84, 40, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      scroll.add(giftBtn);
      SHOP_ITEMS.forEach((item, i) => {
        const y = (i + 1) * (rowH + 16);
        const row = new Sprite({ x: 0, y, w: 702, h: rowH });
        row.render = (ctx, w, h) => {
          drawPanel(ctx, 0, 0, w, h, { radius: 18, c1: "rgba(28,34,56,0.82)", c2: "rgba(16,20,34,0.82)" });
          ctx.save();
          roundRectPath(ctx, 16, 16, 100, 100, 14);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fill();
          ctx.restore();
          drawItemIcon(ctx, 66, 66, item);
          drawText(ctx, item.name, 140, 40, { size: 30, color: "#ffe9b8", weight: "bold" });
          drawText(ctx, item.desc, 140, 80, { size: 24, color: Theme.textDim });
          let px = 140;
          for (const k in item.cost) {
            drawResourceIcon(ctx, px, 112, 16, k);
            const nm = { coin: "\u7075\u77F3", jade: "\u4ED9\u7389", ticket: "\u8BF7\u795E\u7B26", soul: "\u5C06\u9B42", exp: "\u7384\u9EC4\u4E39", stamina: "\u4E91\u6C14", iron: "\u7CBE\u94C1", crystal: "\u7384\u6676" }[k] || k;
            drawText(ctx, `${nm} ${fmt(item.cost[k])}`, px + 22, 118, { size: 22, color: "#ffd98a" });
            px += 22 + ctx.measureText(`${nm} ${fmt(item.cost[k])}`).width + 16;
          }
        };
        scroll.add(row);
        const buy = new Button({
          x: 510,
          y: y + 34,
          w: 168,
          h: 64,
          style: "gold",
          radius: 16,
          onClick: () => {
            const r = player.shopBuy(item);
            player.save();
            toast(r.ok ? r.msg : r.msg, r.ok ? "success" : "error");
          },
          icon: (ctx, b) => drawText(ctx, "\u8D2D \u4E70", 84, 40, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
        });
        scroll.add(buy);
      });
      this.add(scroll);
      this.codeLayer = new Sprite({ x: 0, y: 0, w: 750, h: 1334, visible: false, onClick: () => this.closeCode() });
      this.codeLayer.render = (ctx, w, h) => {
        ctx.fillStyle = "rgba(0,0,0,0.66)";
        ctx.fillRect(0, 0, w, h);
        const px = 75, py = 400, pw = 600, ph = 520;
        drawPanel(ctx, px, py, pw, ph, { radius: 24, c1: "rgba(34,40,64,0.98)", c2: "rgba(20,24,40,0.98)" });
        drawText(ctx, "\u798F\u5229\u793C\u5305\u7801", px + pw / 2, py + 56, { size: 38, align: "center", color: "#ffe9b8", weight: "bold" });
        drawText(ctx, "SHENHUA2026", px + pw / 2, py + 150, { size: 44, align: "center", color: "#ffd98a", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.5)" });
        drawText(ctx, "\u590D\u5236\u6B64\u7801\u5151\u6362 \xB7 \u53EF\u91CD\u590D\u4F7F\u7528", px + pw / 2, py + 200, { size: 24, align: "center", color: "#9ad7f5" });
        drawText(ctx, "\u6BCF\u6B21\u83B7\u5F97\uFF1A", px + pw / 2, py + 256, { size: 22, align: "center", color: Theme.textDim });
        drawText(ctx, "\u7075\u77F388\u4E07 \u4ED9\u7389288 \u7CBE\u94C1200 \u7384\u667630", px + pw / 2, py + 292, { size: 21, align: "center", color: "#ffd98a" });
        drawText(ctx, "\u5C06\u9B42300 \u7384\u9EC4\u4E392\u4E07 \u4E91\u6C14120 \u8BF7\u795E\u7B2620 \u88C5\u5907\u7BB1\xD73", px + pw / 2, py + 322, { size: 21, align: "center", color: "#ffd98a" });
      };
      const claimBtn = new Button({
        x: 135,
        y: 760,
        w: 480,
        h: 84,
        style: "gold",
        radius: 20,
        onClick: () => this.doRedeem(),
        icon: (ctx, b) => drawText(ctx, "\u7ACB\u5373\u5151\u6362\uFF08\u53EF\u91CD\u590D\u4F7F\u7528\uFF09", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      const closeBtn = new Button({
        x: 135,
        y: 860,
        w: 480,
        h: 60,
        style: "dark",
        radius: 16,
        onClick: () => this.closeCode(),
        icon: (ctx, b) => drawText(ctx, "\u5173\u95ED", b.w / 2, b.h / 2 + 8, { size: 26, align: "center", color: "#f2e7d3" })
      });
      this.codeLayer.add(claimBtn);
      this.codeLayer.add(closeBtn);
      this.add(this.codeLayer);
      addBottomNav(this, "shop");
    }
    openCode() {
      this.codeLayer.visible = true;
    }
    closeCode() {
      this.codeLayer.visible = false;
    }
    doRedeem() {
      const r = player.redeemCode("SHENHUA2026");
      player.save();
      toast(r.ok ? r.msg : r.msg, r.ok ? "success" : "error");
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
    }
  };
  function drawItemIcon(ctx, cx, cy, item) {
    ctx.save();
    ctx.translate(cx, cy);
    const colors = { stamina: "#ff8a6a", coin: "#ffd98a", iron: "#9aa6b8", crystal: "#9a7bff", soul: "#d9a8ff" };
    const c = colors[item.icon] || "#c8d8f0";
    if (item.icon === "iron") {
      ctx.fillStyle = c;
      roundRectPath(ctx, -22, -22, 44, 44, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.lineTo(8, 10);
      ctx.moveTo(8, -10);
      ctx.lineTo(-12, 10);
      ctx.stroke();
    } else if (item.icon === "crystal") {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(22, 0);
      ctx.lineTo(0, 26);
      ctx.lineTo(-22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (item.icon === "box") {
      ctx.fillStyle = "#b07d44";
      roundRectPath(ctx, -24, -16, 48, 34, 6);
      ctx.fill();
      ctx.fillStyle = "#8a5e30";
      roundRectPath(ctx, -24, -16, 48, 12, 6);
      ctx.fill();
      ctx.strokeStyle = "#ffd98a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.lineTo(24, -4);
      ctx.stroke();
    } else {
      drawResourceIcon(ctx, 0, 0, 24, item.icon);
    }
    ctx.restore();
  }
  function drawTitleBar2(ctx, title, sub) {
    const h = 92;
    const g2 = ctx.createLinearGradient(0, 0, 0, h);
    g2.addColorStop(0, "rgba(24,30,50,0.96)");
    g2.addColorStop(1, "rgba(24,30,50,0.55)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, 750, h);
    ctx.strokeStyle = "rgba(233,200,135,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(750, h);
    ctx.stroke();
    drawText(ctx, title, 375, 48, { size: 34, align: "center", color: "#fff2d8", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.55)" });
    if (sub) drawText(ctx, sub, 375, 78, { size: 20, align: "center", color: Theme.textDim });
  }
  register("shop", () => new ShopScene());

  // js/scenes/equip.js
  var EquipScene = class extends Scene {
    constructor(params) {
      super();
      this.id = params && params.id || player.teamUnits[0].id;
      this.t = 0;
      this.flash = 0;
      this.tab = "ex";
      addTopBar(this, { x: 132, w: 594 });
      this.add(new Button({
        x: 20,
        y: 22,
        w: 96,
        h: 64,
        style: "dark",
        radius: 32,
        onClick: () => goto("heroes"),
        icon: (ctx) => {
          ctx.save();
          ctx.translate(48, 32);
          ctx.fillStyle = "#f2e7d3";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-14, -4);
          ctx.lineTo(-14, 4);
          ctx.lineTo(-6, 4);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }));
      this.add(new Button({
        x: 24,
        y: 100,
        w: 339,
        h: 56,
        style: "dark",
        radius: 16,
        onClick: () => this.switchTab("ex"),
        icon: (ctx, b) => drawText(ctx, "\u4E13\u5C5E\u88C5\u5907", b.w / 2, 36, { size: 26, align: "center", weight: "bold", color: this.tab === "ex" ? "#ffe9b8" : Theme.textDim })
      }));
      this.add(new Button({
        x: 387,
        y: 100,
        w: 339,
        h: 56,
        style: "dark",
        radius: 16,
        onClick: () => this.switchTab("reg"),
        icon: (ctx, b) => drawText(ctx, "\u5E38\u89C4\u88C5\u5907", b.w / 2, 36, { size: 26, align: "center", weight: "bold", color: this.tab === "reg" ? "#ffe9b8" : Theme.textDim })
      }));
      const exC = new Sprite({ x: 0, y: 0, w: 750, h: 1334 });
      exC.add(new Sprite({ x: 24, y: 170, w: 702, h: 300, render: (ctx, w, h) => this.renderMain(ctx, w, h) }));
      exC.add(new Sprite({ x: 24, y: 486, w: 702, h: 230, render: (ctx, w, h) => this.renderBonus(ctx, w, h) }));
      exC.add(new Sprite({ x: 24, y: 732, w: 702, h: 210, render: (ctx, w, h) => this.renderTalent(ctx, w, h) }));
      this.techBtn = new Button({
        x: 24,
        y: 980,
        w: 342,
        h: 100,
        style: "gold",
        radius: 18,
        onClick: () => this.doTechUp(),
        icon: (ctx, b) => {
          const eq = this.eq;
          if (!eq) {
            drawText(ctx, "\u79D1\u6280\u5347\u7EA7", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" });
            return;
          }
          const maxed = eq.tech >= EQUIP_MAX_TECH;
          this.drawCost(ctx, b, maxed ? "\u79D1\u6280" : "\u79D1\u6280\u5347\u7EA7", this._cost(true), maxed);
        }
      });
      this.advBtn = new Button({
        x: 384,
        y: 980,
        w: 342,
        h: 100,
        style: "green",
        radius: 18,
        onClick: () => this.doAdvance(),
        icon: (ctx, b) => {
          const eq = this.eq;
          if (!eq) {
            drawText(ctx, "\u8FDB\u9636", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#0f2f1c" });
            return;
          }
          const maxed = eq.stage >= EQUIP_MAX_STAGE;
          this.drawCost(ctx, b, "\u8FDB\u9636", this._cost(false), maxed);
        }
      });
      exC.add(this.techBtn);
      exC.add(this.advBtn);
      this.add(exC);
      this.exC = exC;
      const regC = new Sprite({ x: 0, y: 0, w: 750, h: 1334, visible: false });
      regC.add(new Sprite({ x: 24, y: 170, w: 702, h: 60, render: (ctx, w, h) => {
        drawText(ctx, "\u4E3A\u795E\u5C06\u7A7F\u6234 6 \u90E8\u4F4D\u5E38\u89C4\u88C5\u5907\uFF0C\u5F3A\u5316\u53EF\u63D0\u5347\u5C5E\u6027\uFF08\u5168\u82F1\u96C4\u5171\u4EAB\u80CC\u5305\uFF09", 24, 38, { size: 22, color: Theme.textDim });
      } }));
      this.regEnh = [];
      this.regWear = [];
      PARTS.forEach((p, i) => {
        const y = 246 + i * 120;
        regC.add(new Sprite({ x: 24, y, w: 702, h: 104, render: (ctx, w, h) => this.drawRegRow(ctx, w, h, p.key) }));
        const enh = new Button({
          x: 392,
          y: y + 22,
          w: 150,
          h: 60,
          style: "gold",
          radius: 14,
          onClick: () => this.after(player.equipEnhance(this.id, p.key)),
          icon: (ctx, b) => {
            const inst = this.worn(p.key);
            if (!inst) {
              drawText(ctx, "\u672A\u7A7F\u6234", b.w / 2, b.h / 2 + 8, { size: 22, align: "center", color: "#9aa4b8" });
              return;
            }
            if (inst.level >= EQ_MAX_LEVEL) {
              drawText(ctx, "\u5DF2\u6EE1\u7EA7", b.w / 2, b.h / 2 + 8, { size: 22, align: "center", color: "#9aa4b8" });
              return;
            }
            this.drawMiniCost(ctx, b, enhanceCost(inst), "\u5F3A\u5316");
          }
        });
        const wear = new Button({
          x: 552,
          y: y + 22,
          w: 138,
          h: 60,
          style: "green",
          radius: 14,
          onClick: () => this.after(this.worn(p.key) ? player.equipTakeOff(this.id, p.key) : player.equipWear(this.id, p.key)),
          icon: (ctx, b) => drawText(
            ctx,
            this.worn(p.key) ? "\u8131 \u4E0B" : "\u7A7F \u6234",
            b.w / 2,
            b.h / 2 + 8,
            { size: 24, align: "center", weight: "bold", color: "#0f2f1c" }
          )
        });
        this.regEnh.push(enh);
        this.regWear.push(wear);
        regC.add(enh);
        regC.add(wear);
      });
      this.regEnhAll = new Button({
        x: 24,
        y: 980,
        w: 342,
        h: 100,
        style: "gold",
        radius: 18,
        onClick: () => this.after(player.equipEnhanceAll(this.id)),
        icon: (ctx, b) => drawText(ctx, "\u4E00\u952E\u5F3A\u5316", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      this.regShop = new Button({
        x: 384,
        y: 980,
        w: 342,
        h: 100,
        style: "dark",
        radius: 18,
        onClick: () => goto("shop"),
        icon: (ctx, b) => drawText(ctx, "\u53BB\u4ED9\u5E02", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#f2e7d3" })
      });
      regC.add(this.regEnhAll);
      regC.add(this.regShop);
      this.add(regC);
      this.regC = regC;
    }
    switchTab(t) {
      this.tab = t;
      this.exC.visible = t === "ex";
      this.regC.visible = t === "reg";
    }
    after(r, silent) {
      player.save();
      if (!r) return;
      if (r.ok) {
        toast(r.msg, "success");
        this.flash = 1;
        tween(this, { to: { flash: 0 }, dur: 400 });
      } else toast(r.msg, "error");
    }
    get info() {
      return getHero(this.id);
    }
    get eq() {
      return this.info && player.data.equips[this.id];
    }
    /** 某部位当前已穿戴的装备实例 */
    worn(part) {
      const slots = player.data.slots[this.id] || {};
      return slots[part] && player.data.bag[slots[part]];
    }
    /* ---------- 专属装备 ---------- */
    renderMain(ctx, w, h) {
      const info = this.info, eq = this.eq;
      if (!info || !eq) return;
      const ex = exEquipOf(info);
      drawPanel(ctx, 0, 0, w, h, { radius: 20 });
      const q = Quality[info.quality];
      drawText(ctx, ex.name, 28, 52, { size: 38, color: "#ffe9b8", weight: "bold", stroke: 3, strokeColor: "rgba(0,0,0,0.5)" });
      drawText(ctx, `${info.name}\xB7\u4E13\u5C5E\u88C5\u5907`, 28, 90, { size: 22, color: Theme.textDim });
      roundRectPath(ctx, w - 150, 28, 122, 44, 12);
      ctx.fillStyle = q.color;
      ctx.fill();
      drawText(ctx, q.label, w - 89, 56, { size: 24, align: "center", color: "#201408", weight: "bold" });
      drawText(ctx, "\u79D1\u6280", 28, 150, { size: 24, color: Theme.textDim });
      drawText(ctx, `${eq.tech} / ${EQUIP_MAX_TECH}`, 110, 150, { size: 26, color: "#ffd98a", weight: "bold" });
      drawBar(ctx, 28, 166, w - 56, 18, eq.tech / EQUIP_MAX_TECH, { c1: "#6ad0ff", c2: "#3a8fd0" });
      drawText(ctx, "\u8FDB\u9636", 28, 222, { size: 24, color: Theme.textDim });
      drawText(ctx, `${eq.stage} / ${EQUIP_MAX_STAGE} \u9636`, 110, 222, { size: 26, color: "#ffd98a", weight: "bold" });
      drawBar(ctx, 28, 238, w - 56, 18, eq.stage / EQUIP_MAX_STAGE, { c1: "#e8b8ff", c2: "#9a6fd0" });
      ctx.save();
      roundRectPath(ctx, w - 200, 250, 170, 96, 14);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle = q.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      drawText(ctx, "\u672C\u547D\u795E\u5175", w - 115, 302, { size: 26, align: "center", color: q.color, weight: "bold" });
    }
    renderBonus(ctx, w, h) {
      const b = player.equipBonus(this.id);
      const r = player.regularEquipBonus(this.id);
      drawPanel(ctx, 0, 0, w, h, { radius: 20 });
      drawText(ctx, "\u5F53\u524D\u88C5\u5907\u52A0\u6210", 28, 46, { size: 28, color: "#ffe9b8", weight: "bold" });
      const rows = [
        ["\u6C14\u8840", b.hp + r.hp, "#ff9a8a"],
        ["\u653B\u51FB", b.atk + r.atk, "#ffd98a"],
        ["\u9632\u5FA1", b.def + r.def, "#8fdcaa"],
        ["\u901F\u5EA6", b.spd + r.spd, "#9ad7f5"]
      ];
      rows.forEach((row, i) => {
        const y = 92 + i * 34;
        drawText(ctx, row[0], 28, y, { size: 22, color: Theme.textDim });
        drawText(ctx, (row[1] > 0 ? "+" : "") + fmt(row[1]), w - 28, y, { size: 24, align: "right", color: row[1] > 0 ? row[2] : Theme.textDim, weight: "bold" });
      });
    }
    renderTalent(ctx, w, h) {
      const info = this.info, eq = this.eq;
      const ex = exEquipOf(info);
      drawPanel(ctx, 0, 0, w, h, { radius: 20 });
      drawText(ctx, "\u4E13\u5C5E\u7279\u6280", 28, 46, { size: 28, color: "#ffe9b8", weight: "bold" });
      const active = eq.stage >= 2;
      roundRectPath(ctx, w - 150, 26, 122, 42, 12);
      ctx.fillStyle = active ? "rgba(47,143,91,0.9)" : "rgba(80,86,110,0.7)";
      ctx.fill();
      drawText(ctx, active ? "\u5DF2\u6FC0\u6D3B" : "\u672A\u6FC0\u6D3B", w - 89, 52, { size: 22, align: "center", color: "#fff", weight: "bold" });
      drawText(ctx, ex.talentName, 28, 92, { size: 28, color: active ? "#ffd98a" : Theme.textDim, weight: "bold" });
      drawText(ctx, ex.talentDesc, 28, 134, { size: 22, color: Theme.textDim });
      drawText(ctx, active ? "\u7279\u6280\u52A0\u6210\u5DF2\u751F\u6548\uFF08\u6BCF\u9636\u989D\u5916 +6% \u5168\u5C5E\u6027\uFF09" : "\u8FDB\u9636\u8FBE\u5230 2 \u9636\u540E\u6FC0\u6D3B\u7279\u6280\u5E76\u5F3A\u5316\u5C5E\u6027", 28, 172, { size: 20, color: active ? "#8fdcaa" : "#9a8290" });
    }
    /* ---------- 常规装备 ---------- */
    drawRegRow(ctx, w, h, part) {
      const slots = player.data.slots[this.id] || {};
      const iid = slots[part];
      const inst = iid && player.data.bag[iid];
      drawPanel(ctx, 0, 0, w, h, { radius: 16 });
      const pq = inst ? EQ_QUALITY[inst.quality] : null;
      ctx.save();
      roundRectPath(ctx, 14, h / 2 - 34, 68, 68, 14);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      if (pq) {
        ctx.strokeStyle = pq.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
      drawPartIcon(ctx, 48, h / 2, part, pq);
      drawText(ctx, PART_NAMES[part], 100, 40, { size: 26, color: "#ffe9b8", weight: "bold" });
      if (inst) {
        const q = EQ_QUALITY[inst.quality];
        drawText(ctx, `${q.label} +${inst.level}`, 100, 78, { size: 22, color: q.color, weight: "bold" });
        const m = equipMain(inst);
        const ms = Object.keys(m).map((k) => `${MAIN_STAT[k]}+${m[k]}`).join("   ");
        drawText(ctx, ms, 100, 104, { size: 20, color: "#9ad7f5" });
      } else {
        drawText(ctx, "\u672A\u7A7F\u6234", 100, 78, { size: 22, color: Theme.textDim });
      }
    }
    drawCost(ctx, b, label, cost, maxed) {
      drawText(ctx, label, b.w / 2, 40, { size: 28, align: "center", weight: "bold", color: maxed ? "#9aa4b8" : b.style === "gold" ? "#3a2408" : "#0f2f1c" });
      if (maxed) {
        drawText(ctx, "\u5DF2\u8FBE\u4E0A\u9650", b.w / 2, 74, { size: 20, align: "center", color: "#9aa4b8" });
        return;
      }
      let px = b.w / 2 - 40;
      for (const k in cost) {
        const nm = { coin: "\u7075\u77F3", jade: "\u4ED9\u7389", iron: "\u7CBE\u94C1", crystal: "\u7384\u6676", soul: "\u5C06\u9B42" }[k] || k;
        drawResourceIcon(ctx, px, 68, 15, k);
        drawText(ctx, `${nm}${fmt(cost[k])}`, px + 20, 74, { size: 19, color: b.style === "gold" ? "#5a3a18" : "#1f4a30" });
        px += 20 + ctx.measureText(`${nm}${fmt(cost[k])}`).width + 14;
      }
    }
    drawMiniCost(ctx, b, cost, label) {
      drawText(ctx, label, b.w / 2, 24, { size: 24, align: "center", weight: "bold", color: "#3a2408" });
      let px = b.w / 2 - 30;
      for (const k in cost) {
        const nm = { coin: "\u7075\u77F3", jade: "\u4ED9\u7389", iron: "\u7CBE\u94C1", crystal: "\u7384\u6676", soul: "\u5C06\u9B42" }[k] || k;
        drawResourceIcon(ctx, px, 44, 13, k);
        drawText(ctx, `${fmt(cost[k])}`, px + 18, 50, { size: 17, color: "#5a3a18" });
        px += 18 + ctx.measureText(`${fmt(cost[k])}`).width + 12;
      }
    }
    _cost(tech) {
      const info = this.info, eq = this.eq;
      const k = QUALITY_K[info.quality] || 1;
      if (tech) return { iron: 2 + eq.tech, coin: Math.round(300 * eq.tech * k) };
      return { crystal: 1 + Math.floor(eq.stage / 2), soul: 5 * eq.stage, coin: Math.round(800 * eq.stage * k) };
    }
    doTechUp() {
      this.after(player.equipTechUp(this.id));
    }
    doAdvance() {
      this.after(player.equipAdvance(this.id));
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
      if (this.flash > 0.01) {
        ctx.fillStyle = `rgba(255,240,200,${this.flash * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    update(dt) {
      this.t += dt;
    }
  };
  function drawPartIcon(ctx, cx, cy, part, pq) {
    ctx.save();
    ctx.translate(cx, cy);
    const c = pq ? pq.color : "#9aa6b8";
    ctx.strokeStyle = c;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 3;
    if (part === "weapon") {
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(20, -20);
      ctx.lineTo(28, -12);
      ctx.lineTo(-14, 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (part === "helmet" || part === "hat") {
      ctx.beginPath();
      ctx.arc(0, 4, 20, Math.PI, 0);
      ctx.lineTo(20, 4);
      ctx.lineTo(-20, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (part === "hat") {
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(0, -16);
        ctx.stroke();
      }
    } else if (part === "armor") {
      ctx.beginPath();
      ctx.moveTo(-18, -16);
      ctx.lineTo(18, -16);
      ctx.lineTo(14, 24);
      ctx.lineTo(-14, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (part === "boots") {
      ctx.beginPath();
      ctx.moveTo(-14, -18);
      ctx.lineTo(8, -18);
      ctx.lineTo(8, 14);
      ctx.lineTo(18, 14);
      ctx.lineTo(18, 24);
      ctx.lineTo(-14, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (part === "necklace") {
      ctx.beginPath();
      ctx.arc(0, 2, 18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  register("equip", (p) => new EquipScene(p));

  // js/scenes/bag.js
  var RES_LIST = [
    { k: "coin", n: "\u7075\u77F3" },
    { k: "jade", n: "\u4ED9\u7389" },
    { k: "soul", n: "\u5C06\u9B42" },
    { k: "ticket", n: "\u8BF7\u795E\u7B26" },
    { k: "iron", n: "\u7CBE\u94C1" },
    { k: "crystal", n: "\u7384\u6676" },
    { k: "exp", n: "\u7384\u9EC4\u4E39" },
    { k: "stamina", n: "\u4E91\u6C14" }
  ];
  var QUALITY_ORDER = ["R", "SR", "SSR", "UR"];
  var BagScene = class extends Scene {
    constructor() {
      super();
      this.t = 0;
      addTitleBar(this, "\u80CC \u5305", null, () => goto("home"));
      this.add(new Sprite({
        x: 24,
        y: 112,
        w: 702,
        h: 140,
        render: (ctx, w, h) => {
          drawPanel(ctx, 0, 0, w, h, { radius: 18, c1: "rgba(28,34,56,0.82)", c2: "rgba(16,20,34,0.82)" });
          drawText(ctx, "\u8D44\u6E90", 24, 34, { size: 24, color: "#ffe9b8", weight: "bold" });
          RES_LIST.forEach((r, i) => {
            const col = i % 4, row = Math.floor(i / 4);
            const x = 36 + col * 168, y = 72 + row * 56;
            const val = r.k === "stamina" ? `${player.get("stamina")}/${player.staminaMax}` : fmt(player.get(r.k));
            drawResourceIcon(ctx, x, y, 16, r.k);
            drawText(ctx, r.n, x + 28, y - 9, { size: 20, color: Theme.textDim });
            drawText(ctx, val, x + 28, y + 13, { size: 21, color: "#f2e7d3", weight: "bold" });
          });
        }
      }));
      this.countLabel = new Sprite({
        x: 24,
        y: 268,
        w: 702,
        h: 32,
        render: (ctx, w, h) => {
          const n = Object.keys(player.data.bag).length;
          drawText(ctx, `\u5E38\u89C4\u88C5\u5907\uFF08\u5171 ${n} \u4EF6\uFF09`, 0, 18, { size: 24, color: "#ffe9b8", weight: "bold" });
        }
      });
      this.add(this.countLabel);
      QUALITY_ORDER.forEach((q, i) => {
        const pq = EQ_QUALITY[q];
        const btn = new Button({
          x: 24 + i * 171,
          y: 304,
          w: 162,
          h: 52,
          style: "dark",
          radius: 14,
          onClick: () => this.confirmDisband(q),
          icon: (ctx, b) => {
            const cnt = this.unwornCount(q);
            drawText(ctx, `${pq.label}\u5206\u89E3`, b.w / 2, 22, { size: 22, align: "center", weight: "bold", color: pq.color });
            drawText(ctx, cnt > 0 ? `\u53EF\u5206\u89E3 ${cnt} \u4EF6` : "\u65E0", b.w / 2, 44, { size: 17, align: "center", color: cnt > 0 ? "#ffd98a" : Theme.textDim });
          }
        });
        this.add(btn);
      });
      this.list = new ScrollView({ x: 24, y: 372, w: 702, h: 832, contentH: 1 });
      this.add(this.list);
      this.buildList();
    }
    /** 重建装备列表 */
    buildList() {
      this.list.children.length = 0;
      const items = Object.values(player.data.bag);
      const rowH = 104;
      this.list.contentH = Math.max(1, items.length) * rowH + 16;
      items.forEach((inst, i) => {
        const s = new Sprite({ x: 0, y: i * rowH, w: 702, h: rowH - 12, onClick: () => this.showDetail(inst) });
        s.render = (ctx, w, hh) => this.renderRow(ctx, w, hh, inst);
        this.list.add(s);
      });
    }
    /** 某品质未穿戴件数（用于按钮提示） */
    unwornCount(quality) {
      let n = 0;
      for (const iid in player.data.bag) {
        const inst = player.data.bag[iid];
        if (inst.quality !== quality) continue;
        if (!player.isWorn(iid)) n++;
      }
      return n;
    }
    renderRow(ctx, w, h, inst) {
      const pq = EQ_QUALITY[inst.quality];
      drawPanel(ctx, 0, 0, w, h, { radius: 14, c1: "rgba(28,34,56,0.82)", c2: "rgba(16,20,34,0.82)" });
      ctx.save();
      roundRectPath(ctx, 16, h / 2 - 32, 64, 64, 12);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle = pq.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      drawText(ctx, PART_NAMES[inst.part], 48, h / 2, { size: 22, align: "center", weight: "bold", color: pq.color });
      drawText(ctx, PART_NAMES[inst.part], 100, 30, { size: 26, color: "#fff2cf", weight: "bold" });
      drawText(ctx, `${pq.label} \xB7 +${inst.level}`, 100, 62, { size: 22, color: pq.color, weight: "bold" });
      const m = equipMain(inst);
      drawText(ctx, [m.hp && `\u6C14\u8840+${m.hp}`, m.atk && `\u653B\u51FB+${m.atk}`, m.def && `\u9632\u5FA1+${m.def}`, m.spd && `\u901F\u5EA6+${m.spd}`].filter(Boolean).join("  "), 100, 92, { size: 21, color: "#9ad7f5" });
      const owner = this.ownerOf(inst.iid);
      if (owner) {
        roundRectPath(ctx, w - 170, h / 2 - 20, 150, 40, 10);
        ctx.fillStyle = "rgba(143,220,170,0.18)";
        ctx.fill();
        ctx.strokeStyle = "rgba(143,220,170,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        drawText(ctx, `\u5DF2\u88C5\u5907\xB7${getHero(owner).name}`, w - 95, h / 2 + 8, { size: 20, align: "center", color: "#8fdcaa", weight: "bold" });
      } else {
        drawText(ctx, "\u672A\u88C5\u5907", w - 95, h / 2 + 8, { size: 20, align: "center", color: Theme.textDim });
      }
    }
    ownerOf(iid) {
      const slots = player.data.slots;
      for (const id in slots) {
        for (const p in slots[id]) if (slots[id][p] === iid) return id;
      }
      return null;
    }
    showDetail(inst) {
      const p = new Popup();
      const pq = EQ_QUALITY[inst.quality];
      const m = equipMain(inst);
      const owner = this.ownerOf(inst.iid);
      const worn = !!owner;
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawText(ctx, "\u88C5 \u5907 \u8BE6 \u60C5", 375, 200, { size: 38, align: "center", color: "#fff2cf", weight: "bold", stroke: 4, strokeColor: "rgba(0,0,0,0.6)" });
        drawPanel(ctx, 135, 270, 480, 540, { radius: 24, c1: "rgba(34,40,64,0.98)", c2: "rgba(20,24,40,0.98)", border: pq.color, bw: 3 });
        drawText(ctx, PART_NAMES[inst.part], 375, 340, { size: 36, align: "center", color: "#fff2cf", weight: "bold" });
        drawText(ctx, pq.label, 375, 392, { size: 30, align: "center", color: pq.color, weight: "bold" });
        drawText(ctx, `\u5F3A\u5316\u7B49\u7EA7 +${inst.level}`, 375, 436, { size: 24, align: "center", color: Theme.textDim });
        const lines = [m.hp && `\u6C14\u8840  +${m.hp}`, m.atk && `\u653B\u51FB  +${m.atk}`, m.def && `\u9632\u5FA1  +${m.def}`, m.spd && `\u901F\u5EA6  +${m.spd}`].filter(Boolean);
        lines.forEach((ln, i) => drawText(ctx, ln, 375, 500 + i * 42, { size: 26, align: "center", color: "#9ad7f5" }));
        drawText(ctx, worn ? `\u5F53\u524D\u88C5\u5907\u4E8E\uFF1A${getHero(owner).name}` : "\u5F53\u524D\uFF1A\u672A\u88C5\u5907", 375, 700, { size: 22, align: "center", color: worn ? "#8fdcaa" : Theme.textDim });
      };
      const disBtn = new Button({
        x: 130,
        y: 1120,
        w: 250,
        h: 76,
        radius: 38,
        style: worn ? "ghost" : "dark",
        onClick: () => {
          if (worn) {
            toast("\u5DF2\u7A7F\u6234\u4E2D\uFF0C\u8BF7\u5148\u8131\u4E0B", "error");
            return;
          }
          const r = player.disbandEquip(inst.iid);
          player.save();
          p.close();
          this.buildList();
          toast(r.ok ? `\u5206\u89E3\u6210\u529F\uFF0C\u8FD4\u8FD8\u7CBE\u94C1 ${r.iron}` : r.msg, r.ok ? "success" : "error");
        },
        icon: (ctx, b) => drawText(
          ctx,
          worn ? "\u5DF2\u7A7F\u6234\u4E2D" : "\u5206 \u89E3",
          b.w / 2,
          b.h / 2 + 8,
          { size: 28, align: "center", weight: "bold", color: worn ? Theme.textDim : "#f2e7d3" }
        )
      });
      const close = new Button({
        x: 370,
        y: 1120,
        w: 250,
        h: 76,
        style: "gold",
        radius: 38,
        onClick: () => p.close(),
        icon: (ctx, b) => drawText(ctx, "\u5173 \u95ED", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      p.add(disBtn);
      p.add(close);
      this.addPopup(p);
    }
    /** 按品质分解：先确认弹窗 */
    confirmDisband(quality) {
      const pq = EQ_QUALITY[quality];
      let n = 0, iron = 0;
      for (const iid in player.data.bag) {
        const inst = player.data.bag[iid];
        if (inst.quality !== quality) continue;
        if (player.isWorn(iid)) continue;
        n++;
        iron += player.disbandIron(inst);
      }
      const p = new Popup();
      p.onDraw = (ctx) => {
        Popup.prototype.onDraw.call(p, ctx);
        drawText(ctx, `\u5206\u89E3${pq.label}\u88C5\u5907`, 375, 260, { size: 38, align: "center", color: "#ffd98a", weight: "bold", stroke: 4, strokeColor: "rgba(0,0,0,0.6)" });
        drawText(ctx, `\u5C06\u5206\u89E3 ${n} \u4EF6\uFF08\u5DF2\u7A7F\u6234\u7684\u4E0D\u5206\u89E3\uFF09`, 375, 348, { size: 26, align: "center", color: "#f2e7d3" });
        drawText(ctx, `\u8FD4\u8FD8\u7CBE\u94C1 ${fmt(iron)}`, 375, 404, { size: 28, align: "center", color: "#ffd98a", weight: "bold" });
      };
      const ok = new Button({
        x: 130,
        y: 1120,
        w: 250,
        h: 76,
        style: "dark",
        radius: 38,
        onClick: () => {
          const r = player.disbandByQuality(quality);
          player.save();
          p.close();
          this.buildList();
          toast(r.msg, r.ok ? "success" : "info");
        },
        icon: (ctx, b) => drawText(ctx, "\u786E\u8BA4\u5206\u89E3", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#f2e7d3" })
      });
      const cancel = new Button({
        x: 370,
        y: 1120,
        w: 250,
        h: 76,
        style: "gold",
        radius: 38,
        onClick: () => p.close(),
        icon: (ctx, b) => drawText(ctx, "\u53D6 \u6D88", b.w / 2, b.h / 2 + 8, { size: 28, align: "center", weight: "bold", color: "#3a2408" })
      });
      p.add(ok);
      p.add(cancel);
      this.addPopup(p);
    }
    drawBackground(ctx, W, H) {
      drawMountainBg(ctx, W, H, this.t);
    }
    update(dt) {
      this.t += dt;
    }
  };
  register("bag", () => new BagScene());

  // js/main.js
  function startGame() {
    player.refreshStamina();
    goto("boot");
    engine.start();
    wx2.onHide && wx2.onHide(() => {
      player.save();
    });
    wx2.onShow && wx2.onShow(() => {
      player.refreshStamina();
    });
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => player.save());
      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => engine.resize(), 120);
      });
    }
    return engine;
  }

  // tools/_entry.js
  startGame();
})();
