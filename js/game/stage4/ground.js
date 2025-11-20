// Stage4 ground module: handles platform creation, drawing and collisions
(function () {
  'use strict';

  /**
   * Stage4 Ground Module
   * - Responsible for platform creation, drawing and collision detection.
   * - Supports loading platforms from `window.Stage4Maps[mapName]` (map files)
   *   and also falls back to procedural generation if no map is provided.
   * - Uses `worldHeight` (separate from canvas height) so levels can be taller
   *   than the visible viewport.
   */
  const Stage4Ground = {
    platforms: [],
    finish: null,
    worldWidth: null,

    // Initialize world/platforms. Supports larger world width via `worldScale` (default 8).
    // opts: { floorHeight, worldScale, startPlatformX, startPlatformWidth, startPlatformHeight }
    init(canvas, opts = {}) {
      const floorHeight = typeof opts.floorHeight === 'number' ? opts.floorHeight : 10;
      const worldScale = typeof opts.worldScale === 'number' ? Math.max(1, opts.worldScale) : 8;
      const startPlatformX = typeof opts.startPlatformX === 'number' ? opts.startPlatformX : 0;
      const startPlatformWidth = typeof opts.startPlatformWidth === 'number' ? opts.startPlatformWidth : 100;
      const startPlatformHeight = typeof opts.startPlatformHeight === 'number' ? opts.startPlatformHeight : floorHeight;

      // The visible canvas width remains `canvas.width`, but the world extends horizontally by worldScale.
      const worldWidth = Math.max(1, Math.round(canvas.width * worldScale));
      // allow caller to provide a separate worldHeight (world may be taller than visible canvas)
      const worldHeight = (typeof opts.worldHeight === 'number') ? Math.max(canvas.height, Math.round(opts.worldHeight)) : canvas.height;
      const floorY = worldHeight - floorHeight;
      const startPlatformY = worldHeight - startPlatformHeight;

      // Base ground (floor) spans the entire world width
      this.platforms = [{ x: 0, y: floorY, width: worldWidth, height: floorHeight }];

      // Add a start platform at the requested X (useful for spawning the player)
      this.platforms.push({ x: startPlatformX, y: startPlatformY, width: startPlatformWidth, height: startPlatformHeight });

      // Try to load platforms from a map file if available (map name from opts.mapName or 'map_1')
      const mapName = typeof opts.mapName === 'string' ? opts.mapName : 'map_1';
      const maps = (typeof window !== 'undefined' && window.Stage4Maps) ? window.Stage4Maps : null;
      const mapData = maps && maps[mapName] ? maps[mapName] : null;

      if (mapData && Array.isArray(mapData.platforms)) {
        // If the map provides an explicit startPlatform meta, let it override caller opts
        if (mapData.startPlatform && typeof mapData.startPlatform === 'object'){
          try{
            if (typeof mapData.startPlatform.x === 'number') startPlatformX = mapData.startPlatform.x;
            if (typeof mapData.startPlatform.width === 'number') startPlatformWidth = mapData.startPlatform.width;
            if (typeof mapData.startPlatform.height === 'number') startPlatformHeight = mapData.startPlatform.height;
            // update the already-pushed start platform so it matches the map (replace last element)
            this.platforms[this.platforms.length - 1] = { x: startPlatformX, y: startPlatformY, width: startPlatformWidth, height: startPlatformHeight };
          }catch(e){ /* ignore malformed startPlatform */ }
        }
        // Convert platform definitions that may use percent coordinates into absolute pixels
        mapData.platforms.forEach(p => {
          // Allow platforms to be specified in absolute coords (`x`/`y`) or as percents (`xPercent`/`yPercent`).
          const platform = { x: 0, width: p.width || 100, height: p.height || 10 };
          // X: prefer xPercent when provided so maps can be resolution-independent
          if (typeof p.xPercent === 'number') platform.x = Math.round(worldWidth * p.xPercent);
          else platform.x = (typeof p.x === 'number') ? p.x : 0;
          // Y: percent relative to worldHeight if provided, else absolute y or fallback
          if (typeof p.yPercent === 'number') platform.y = Math.round(worldHeight * p.yPercent);
          else platform.y = (typeof p.y === 'number') ? p.y : Math.max(40, startPlatformY - 80);
          // Include platform if it lies within world bounds (allow touching the right edge)
          if (platform.x + platform.width <= worldWidth) this.platforms.push(platform);
        });

        // finish area if provided; supports xPercent/yPercent
        if (mapData.finish) {
          const f = mapData.finish;
          let fx = (typeof f.x === 'number') ? f.x : Math.round((typeof f.xPercent === 'number' ? f.xPercent : 0.95) * worldWidth);
          let fy = (typeof f.y === 'number') ? f.y : Math.round((typeof f.yPercent === 'number' ? f.yPercent : 0.08) * worldHeight);
          const fw = f.width || 80;
          const fh = f.height || 18;
          // clamp inside world
          fx = Math.min(Math.max(0, fx), Math.max(0, worldWidth - fw));
          this.finish = { x: fx, y: fy, width: fw, height: fh };
        }
      } else {
        // Fallback: generate platforms procedurally if no map file found
        const marginFromRight = 120;
        const finishWidth = 80;
        const finishHeight = 18;
        const finishX = Math.max(startPlatformX + 400, worldWidth - marginFromRight - finishWidth);
        const finishY = Math.max(20, Math.round(worldHeight * 0.08));
        this.finish = { x: finishX, y: finishY, width: finishWidth, height: finishHeight };

        // Create ascending "stair" platforms that lead to the finish area
        const steps = 8;
        const stairStartX = Math.max(startPlatformX + 300, finishX - 800);
        for (let i = 0; i < steps; i++) {
          const sx = stairStartX + i * 100;
          const sy = Math.max(40, startPlatformY - (i + 1) * Math.round(worldHeight / 12));
          this.platforms.push({ x: sx, y: sy, width: 100, height: 10 });
        }

        // Add a few fixed floating obstacles earlier in the level
        const floats = [
          { x: 600, y: Math.max(80, worldHeight - 180), width: 120, height: 10 },
          { x: 1100, y: Math.max(60, worldHeight - 260), width: 140, height: 10 },
          { x: 1700, y: Math.max(80, worldHeight - 220), width: 120, height: 10 },
          { x: 2400, y: Math.max(100, worldHeight - 300), width: 160, height: 10 }
        ];
        floats.forEach(fp => { if (fp.x + fp.width < worldWidth) this.platforms.push(fp); });
      }
      // expose world dimensions for camera/minimap/player logic
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      return { startPlatformY, startPlatformX, worldWidth, worldHeight };
    },

    // draw platforms to ctx. `offsetX` is subtracted from platform world-x to render camera
    // draw platforms to ctx. `offsetX`/`offsetY` are subtracted from platform world coords to render camera
    drawPlatforms(ctx, offsetX = 0, offsetY = 0) {
      if (!ctx) return;
      ctx.fillStyle = 'green';
      this.platforms.forEach(p => ctx.fillRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height));
      // draw finish marker if present
      if (this.finish) {
        try {
          ctx.fillStyle = '#f1c40f'; // gold
          ctx.fillRect(Math.round(this.finish.x - offsetX), Math.round(this.finish.y - offsetY), this.finish.width, this.finish.height);
          // small flag pole
          ctx.fillStyle = '#bdc3c7';
          ctx.fillRect(Math.round(this.finish.x - offsetX) + Math.round(this.finish.width / 2) - 1, Math.round(this.finish.y - offsetY) - 12, 2, 12);
          // flag triangle
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.moveTo(Math.round(this.finish.x - offsetX) + Math.round(this.finish.width / 2) + 1, Math.round(this.finish.y - offsetY) - 12);
          ctx.lineTo(Math.round(this.finish.x - offsetX) + Math.round(this.finish.width / 2) + 20, Math.round(this.finish.y - offsetY) - 6);
          ctx.lineTo(Math.round(this.finish.x - offsetX) + Math.round(this.finish.width / 2) + 1, Math.round(this.finish.y - offsetY) - 2);
          ctx.closePath();
          ctx.fill();
        } catch (e) { /* ignore drawing errors */ }
      }
    },
    // Check collision between a player and platforms using the player's inner collision rect
    // Returns true if player is grounded after resolution.
    checkCollision(player) {
      if (!player) return false;
      // If player provides getCollisionRect, use it. Otherwise use centered inner rect based on player box.
      let rect;
      try {
        if (typeof player.getCollisionRect === 'function') {
          rect = player.getCollisionRect();
        }
      } catch (e) { rect = null; }
      if (!rect) {
        // Fallback inner collision rect: width = 2/5 of draw box, height = 4/5 of draw box
        const w = Math.max(1, Math.round(player.width * 2 / 5));
        const h = Math.max(1, Math.round(player.height * 4 / 5));
        const x = player.x + Math.round((player.width - w) / 2);
        const y = player.y + Math.round((player.height - h) / 2);
        rect = { x, y, width: w, height: h };
      }

      player.grounded = false;
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        // quick AABB horizontal check
        if (rect.x + rect.width <= p.x || rect.x >= p.x + p.width) continue;

        const rectBottom = rect.y + rect.height;
        // estimate previous frame bottom using current ySpeed (simple Euler approximation)
        const prevBottom = rectBottom - (player.ySpeed || 0);

        // Landing detection: player was above (or touching) the platform previous frame
        // and now is at or below the platform top. Also only consider when moving downwards.
        if ((player.ySpeed || 0) >= 0 && prevBottom <= p.y && rectBottom >= p.y) {
          // Align player's vertical position so that the inner rect bottom sits on platform.y
          const offsetY = rect.y - player.y; // distance from player.y to inner rect.y
          player.y = p.y - offsetY - rect.height;
          player.ySpeed = 0;
          player.grounded = true;
          return true;
        }

        // Optional: handle head bump (player moving up into underside of platform)
        // If player is moving upwards and inner rect top is below platform bottom, push player down a bit
        if ((player.ySpeed || 0) < 0 && rect.y <= p.y + p.height && rect.y + rect.height > p.y + p.height) {
          // resolve upward collision by placing player just below the platform bottom
          const offsetY = rect.y - player.y;
          player.y = (p.y + p.height) - offsetY + 1; // +1 to avoid immediate re-collision
          player.ySpeed = 0;
          return false;
        }
      }
      return false;
    }
    ,

    // Check whether the player's collision rect overlaps the finish area
    checkFinish(player) {
      if (!player || !this.finish) return false;
      let rect = null;
      try { if (typeof player.getCollisionRect === 'function') rect = player.getCollisionRect(); } catch (e) { rect = null; }
      if (!rect) {
        const w = Math.max(1, Math.round(player.width * 2 / 5));
        const h = Math.max(1, Math.round(player.height * 4 / 5));
        const x = player.x + Math.round((player.width - w) / 2);
        const y = player.y + Math.round((player.height - h) / 2);
        rect = { x, y, width: w, height: h };
      }
      const f = this.finish;
      const overlap = rect.x + rect.width > f.x && rect.x < f.x + f.width && rect.y + rect.height > f.y && rect.y < f.y + f.height;
      return !!overlap;
    }
  };

  window.Stage4Ground = Stage4Ground;

})();
