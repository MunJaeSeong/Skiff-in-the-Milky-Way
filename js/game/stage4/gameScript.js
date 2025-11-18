// ========================================
// Platformer Jump 게임 JavaScript 코드 (stage4)
// This file is a corrected copy of the existing `gameScirpt.js` (typo) so
// the dynamic loader that expects `gameScript.js` will find and run it.
// ========================================

(function () {
  'use strict';

  // Initialize when DOM (and canvas) are available
  function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('stage4 gameScript: canvas #gameCanvas not found. Aborting init.');
      return;
    }
    const ctx = canvas.getContext('2d');

    // 플레이어는 `player.js`에서 관리합니다.
    // Require the player API; abort with error message if missing.
    const playerModule = window.Stage4Player;
    if (!playerModule || !playerModule.player) {
      const msg = 'Stage4 error: player module not found. Ensure js/game/stage4/player.js is loaded before gameScript.js.';
      console.error(msg);
      try { alert(msg); } catch (e) {}
      return; // abort init
    }
    const player = playerModule.player;

    // 플랫폼은 `ground.js` 모듈에서 관리합니다. Require it and abort if missing.
    const groundModule = window.Stage4Ground;
    if (!groundModule || !Array.isArray(groundModule.platforms) || typeof groundModule.init !== 'function') {
      const msg = 'Stage4 error: ground module not found. Ensure js/game/stage4/ground.js is loaded before gameScript.js.';
      console.error(msg);
      try { alert(msg); } catch (e) {}
      return; // abort init
    }
    let platforms = groundModule.platforms;

    // 게임 시간 관리
    let startTime = Date.now();
    let elapsedTime = 0;

    // 키 입력 처리 (keeps set of pressed keys and forwards to player module)
    let keys = {};
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    // 기본 플랫폼
    const startPlatformY = canvas.height - 50;
    const startPlatformX = 150;
    const startPlatformWidth = 100;
    const startPlatformHeight = 10;

    // initialize platforms via ground module
    const info = groundModule.init(canvas, { startPlatformX, startPlatformWidth, startPlatformHeight });
    platforms = groundModule.platforms;
    // let player module place the player on the start platform
    if (typeof playerModule.init === 'function') {
      playerModule.init(info.startPlatformY);
    }

    // No additional random platforms for stage4; ground module provides base platform(s).

    // 그리기
    function drawPlayer() {
      // Delegate drawing to player module when available
      if (playerModule && typeof playerModule.draw === 'function') {
        try { playerModule.draw(ctx); return; } catch (e) { /* fallback below */ }
      }
      ctx.fillStyle = 'blue';
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    function drawPlatforms() {
      if (groundModule && typeof groundModule.drawPlatforms === 'function') {
        groundModule.drawPlatforms(ctx);
        return;
      }
      ctx.fillStyle = 'green';
      platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    }

    function drawTime() {
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText('Time: ' + elapsedTime + '초', 10, 20);
    }

    // 게임 로직
    function updatePlayerMovement() {
      // Delegate movement logic to the player module if available
      if (playerModule && typeof playerModule.updateMovement === 'function') {
        playerModule.updateMovement(keys);
        return;
      }
      // Fallback local logic
      if (keys['ArrowLeft']) player.x -= 3;
      if (keys['ArrowRight']) player.x += 3;
      player.ySpeed += player.gravity;
      player.y += player.ySpeed;
      if (player.grounded && keys[' ']) {
        player.ySpeed = player.jumpPower;
        player.grounded = false;
      }
    }

    function checkPlatformCollision() {
      if (groundModule && typeof groundModule.checkCollision === 'function') {
        return groundModule.checkCollision(player);
      }
      player.grounded = false;
      platforms.forEach(p => {
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
        }
      });
      return player.grounded;
    }

    function checkGameOver() {
      if (player.y > canvas.height) {
        alert('Game Over! 생존 시간: ' + elapsedTime + '초');
        return true;
      }
      return false;
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updatePlayerMovement();
      checkPlatformCollision();
      elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      if (checkGameOver()) return;
      drawPlayer();
      drawPlatforms();
      drawTime();
      requestAnimationFrame(update);
    }

    // Start the loop
    update();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
