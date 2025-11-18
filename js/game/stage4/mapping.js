// Stage4 mapping/minimap module
(function () {
  'use strict';

  // Expose `window.Stage4Map` with basic control methods.
  const Stage4Map = {
    canvas: null,
    ctx: null,
    width: 200, // CSS pixels
    height: 120,
    deviceRatio: 1,
    visible: true,
    pollInterval: null,
    running: false,

    // Wait until required modules (player & ground) are available
    waitForModules(timeoutMs = 3000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (window.Stage4Player && window.Stage4Ground && window.Stage4Player.player && Array.isArray(window.Stage4Ground.platforms)) {
            resolve();
            return;
          }
          if (Date.now() - start > timeoutMs) { reject(new Error('Required modules not available')); return; }
          setTimeout(check, 100);
        };
        check();
      });
    },

    init() {
      const gameCanvas = document.getElementById('gameCanvas');
      if (!gameCanvas) return;

      // create overlay canvas
      const map = document.createElement('canvas');
      map.className = 'stage4-minimap';
      // style via inline to ensure proper placement
      map.style.position = 'absolute';
      map.style.left = '8px';
      map.style.top = '8px';
      map.style.width = this.width + 'px';
      map.style.height = this.height + 'px';
      map.style.zIndex = 1000;
      map.style.border = '1px solid rgba(0,0,0,0.6)';
      map.style.background = 'rgba(255,255,255,0.05)';
      map.style.pointerEvents = 'none';

      // place inside same parent as gameCanvas so it overlays correctly
      const parent = gameCanvas.parentNode || document.body;
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(map);

      this.canvas = map;
      this.deviceRatio = window.devicePixelRatio || 1;
      // set actual pixel buffer size for crisp rendering
      this.canvas.width = Math.max(1, Math.round(this.width * this.deviceRatio));
      this.canvas.height = Math.max(1, Math.round(this.height * this.deviceRatio));
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx = this.canvas.getContext('2d');
      if (this.deviceRatio !== 1) this.ctx.setTransform(this.deviceRatio, 0, 0, this.deviceRatio, 0, 0);

      this.startLoop();
    },

    startLoop() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        try { this.draw(); } catch (e) { /* ignore */ }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    stopLoop() { this.running = false; },

    toggle() { this.visible = !this.visible; if (this.canvas) this.canvas.style.display = this.visible ? 'block' : 'none'; },

    draw() {
      const ctx = this.ctx;
      if (!ctx || !this.canvas) return;

      const gameCanvas = document.getElementById('gameCanvas');
      if (!gameCanvas) return;

      const gw = gameCanvas.width;
      const gh = gameCanvas.height;
      if (!gw || !gh) return;

      // logical minimap size (CSS pixels)
      const mw = this.width;
      const mh = this.height;

      // clear
      ctx.clearRect(0, 0, mw, mh);

      // draw semi-transparent background
      ctx.fillStyle = 'rgba(10,10,10,0.45)';
      ctx.fillRect(0, 0, mw, mh);

      // draw border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);

      // scale factors from world -> minimap
      const scaleX = mw / gw;
      const scaleY = mh / gh;

      // draw platforms
      const ground = window.Stage4Ground;
      if (ground && Array.isArray(ground.platforms)) {
        ctx.fillStyle = '#2ecc71';
        ground.platforms.forEach(p => {
          const rx = p.x * scaleX;
          const ry = p.y * scaleY;
          const rw = Math.max(1, p.width * scaleX);
          const rh = Math.max(1, p.height * scaleY);
          ctx.fillRect(rx, ry, rw, rh);
        });
      }

      // draw player
      const playerModule = window.Stage4Player;
      if (playerModule && playerModule.player) {
        const p = playerModule.player;
        // map player's center
        const cx = (p.x + p.width / 2) * scaleX;
        const cy = (p.y + p.height / 2) * scaleY;
        ctx.fillStyle = '#e74c3c';
        const r = Math.max(2, Math.min(6, Math.round(4 * Math.min(scaleX, scaleY))));
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

        // optional: draw player bounds (small rect)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect((p.x * scaleX) + 0.5, (p.y * scaleY) + 0.5, Math.max(1, p.width * scaleX - 1), Math.max(1, p.height * scaleY - 1));
      }

      // draw viewport rectangle (the entire gameCanvas in this project)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, 2, mw - 4, mh - 4);
    }
  };

  // attach to window for debugging/control
  window.Stage4Map = Stage4Map;

  // auto-init after DOM ready and modules available. Poll for Stage4Player/Stage4Ground.
  function tryInit() {
    Stage4Map.waitForModules(4000).then(() => {
      // small delay to ensure canvas exists and ground init ran
      setTimeout(() => { Stage4Map.init(); }, 0);
    }).catch(() => {
      // silently fail if modules never appear
      // but still attempt to initialize once DOM has canvas
      const gameCanvas = document.getElementById('gameCanvas');
      if (gameCanvas) setTimeout(() => { Stage4Map.init(); }, 0);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') tryInit(); else document.addEventListener('DOMContentLoaded', tryInit);

})();
