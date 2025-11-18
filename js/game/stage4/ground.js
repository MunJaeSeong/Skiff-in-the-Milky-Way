// Stage4 ground module: handles platform creation, drawing and collisions
(function () {
  'use strict';

  const Stage4Ground = {
    platforms: [],

    init(canvas, opts = {}) {
      const floorHeight = typeof opts.floorHeight === 'number' ? opts.floorHeight : 10;
      const startPlatformY = canvas.height - floorHeight;

      this.platforms = [{ x: 0, y: startPlatformY, width: canvas.width, height: floorHeight }];
      return { startPlatformY };
    },

    drawPlatforms(ctx) {
      if (!ctx) return;
      ctx.fillStyle = 'green';
      this.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
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
        const isColliding =
          rect.x + rect.width > p.x &&
          rect.x < p.x + p.width &&
          rect.y + rect.height > p.y &&
          rect.y + rect.height < p.y + p.height &&
          player.ySpeed > 0;
        if (isColliding) {
          // Align player's vertical position so that the inner rect bottom sits on platform.y
          const offsetY = rect.y - player.y; // distance from player.y to inner rect.y
          player.y = p.y - offsetY - rect.height;
          player.ySpeed = 0;
          player.grounded = true;
          return true;
        }
      }
      return false;
    }
  };

  window.Stage4Ground = Stage4Ground;

})();
