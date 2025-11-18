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
  };

  window.Stage4Ground = Stage4Ground;

})();
