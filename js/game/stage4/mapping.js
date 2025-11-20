// Stage4 mapping/minimap module
(function () {
  'use strict';

  /**
   * Stage4 Minimap Module
   * - Renders a small overlay canvas which shows a local window of the world
   *   centered on the player (not necessarily the entire map).
   * - The minimap draws nearby platforms and the finish marker (if visible).
   */
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

      // world dimensions: prefer ground.worldWidth if available (world may be larger than canvas)
      const gw = (window.Stage4Ground && typeof window.Stage4Ground.worldWidth === 'number') ? window.Stage4Ground.worldWidth : gameCanvas.width;
      const gh = (window.Stage4Ground && typeof window.Stage4Ground.worldHeight === 'number') ? window.Stage4Ground.worldHeight : gameCanvas.height;
      if (!gw || !gh) return;

      // logical minimap size (CSS pixels)
      const mw = this.width;
      const mh = this.height;

      // clear and background
      ctx.clearRect(0, 0, mw, mh);
      ctx.fillStyle = 'rgba(10,10,10,0.45)';
      ctx.fillRect(0, 0, mw, mh);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);

      // Choose a local world window centered on the player (minimap doesn't need to show the whole map)
      const playerModule = window.Stage4Player;
      const p = playerModule && playerModule.player ? playerModule.player : null;
      // window size in world coords: show at least 4x the visible screen area (but no larger than the world)
      // this gives the player a broader situational view while keeping the minimap focused.
      const viewWorldW = Math.min(gw, Math.max(Math.round(gameCanvas.width * 4), Math.round(gameCanvas.width * 1.6)));
      const viewWorldH = Math.min(gh, Math.max(Math.round(gameCanvas.height * 4), Math.max(64, Math.round(gameCanvas.height * 0.35))));

      let viewX = 0;
      let viewY = 0;
      if (p) {
        viewX = Math.round(Math.max(0, Math.min(gw - viewWorldW, p.x - Math.round(viewWorldW / 2))));
        viewY = Math.round(Math.max(0, Math.min(gh - viewWorldH, p.y - Math.round(viewWorldH / 2))));
      }

      // scale factors from the chosen world window -> minimap
      const scaleX = mw / viewWorldW;
      const scaleY = mh / viewWorldH;

      // draw platforms that intersect the chosen window
      const ground = window.Stage4Ground;
      if (ground && Array.isArray(ground.platforms)) {
        ctx.fillStyle = '#2ecc71';
        ground.platforms.forEach(pl => {
          if (pl.x + pl.width < viewX || pl.x > viewX + viewWorldW || pl.y + pl.height < viewY || pl.y > viewY + viewWorldH) return;
          const rx = (pl.x - viewX) * scaleX;
          const ry = (pl.y - viewY) * scaleY;
          const rw = Math.max(1, pl.width * scaleX);
          const rh = Math.max(1, pl.height * scaleY);
          ctx.fillRect(rx, ry, rw, rh);
        });
        // draw finish marker if within the window
        if (ground.finish) {
          try {
            const f = ground.finish;
            if (!(f.x + f.width < viewX || f.x > viewX + viewWorldW || f.y + f.height < viewY || f.y > viewY + viewWorldH)) {
              ctx.fillStyle = '#f39c12';
              const fx = (f.x - viewX) * scaleX;
              const fy = (f.y - viewY) * scaleY;
              const fw = Math.max(2, f.width * scaleX);
              const fh = Math.max(2, f.height * scaleY);
              ctx.fillRect(fx, fy - Math.max(2, fh), fw, fh + 2);
              ctx.fillStyle = '#c0392b';
              ctx.fillRect(fx + Math.round(fw / 2), fy - Math.max(6, fh + 4), Math.max(1, Math.round(fw / 6)), Math.max(1, Math.round(fh / 2)));
            }
          } catch (e) { /* ignore */ }
        }
      }

      // draw player as a dot in the minimap window
      if (p) {
        const cx = (p.x + p.width / 2 - viewX) * scaleX;
        const cy = (p.y + p.height / 2 - viewY) * scaleY;
        // draw a simple yellow circular marker for the player (no rectangular border)
        ctx.fillStyle = '#f1c40f'; // yellow
        const r = Math.max(2, Math.min(6, Math.round(4 * Math.min(scaleX, scaleY))));
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }

      // Optionally draw a small frame representing the chosen window inside the minimap (already whole minimap shows the window)
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
