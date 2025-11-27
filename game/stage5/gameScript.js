(function () {
  'use strict';

  // Minimal stage script to show Noel animations and respond to arrow keys
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!canvas || !ctx) return;

  const player = window.NoelPlayer;
  player.init();

  function fitCanvasImmediate() {
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(240, Math.floor(window.innerHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  window.addEventListener('resize', fitCanvasImmediate);
  fitCanvasImmediate();

  // place player in center
  player.setPosition(canvas.width / 2, canvas.height / 2 + 20);
  player.setScale(0.7);

  const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

  window.addEventListener('keydown', (e) => {
    if (e.key in keys) {
      keys[e.key] = true;
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
      keys[e.key] = false;
      e.preventDefault();
    }
  }, { passive: false });

  function getDirectionFromKeys() {
    if (keys.ArrowLeft && !keys.ArrowRight) return 'left';
    if (keys.ArrowRight && !keys.ArrowLeft) return 'right';
    if (keys.ArrowUp && !keys.ArrowDown) return 'back';
    if (keys.ArrowDown && !keys.ArrowUp) return 'front';
    return 'idle';
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.max(0, now - lastTime);
    lastTime = now;

    // update
    const dir = getDirectionFromKeys();
    player.setDirection(dir);
    player.update(dt);

    // clear only; no background/ground/other graphics per request
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw player only
    player.draw(ctx);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
