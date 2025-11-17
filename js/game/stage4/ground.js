// Stage4 ground module: handles platform creation, drawing and collisions
(function () {
  'use strict';

  const Stage4Ground = {
    platforms: [],

    init(canvas, opts = {}) {
      // Create a single flat ground that spans the canvas width.
      // opts.floorHeight: height in pixels of the ground platform (default 10)
      const floorHeight = typeof opts.floorHeight === 'number' ? opts.floorHeight : (opts.startPlatformHeight || 10);
      const startPlatformY = canvas.height - floorHeight;

      this.platforms = [];
      // single full-width platform
      this.platforms.push({ x: 0, y: startPlatformY, width: canvas.width, height: floorHeight });

      // expose start platform y for callers
      return { startPlatformY };
    },

    drawPlatforms(ctx) {
      if (!ctx) return;
      ctx.fillStyle = 'green';
      this.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    },

    // Collision: mutates provided player object (y, ySpeed, grounded)
    checkCollision(player) {
      if (!player) return false;
      player.grounded = false;
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        const isColliding =
          player.x + player.width > p.x &&
          player.x < p.x + p.width &&
          player.y + player.height > p.y &&
          player.y + player.height < p.y + p.height &&
          player.ySpeed > 0;
        if (isColliding) {
          player.y = p.y - player.height;
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
