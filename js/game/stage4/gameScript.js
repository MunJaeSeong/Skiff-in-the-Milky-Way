// ========================================
// Platformer Jump 게임 JavaScript 코드 (stage4)
// This file is a corrected copy of the existing `gameScirpt.js` (typo) so
// the dynamic loader that expects `gameScript.js` will find and run it.
// ========================================

(function () {
  'use strict';

  /**
   * Stage4 Game Loop / Scene Controller
   * - Sets up canvas, loads player and ground modules, and runs the main
   *   requestAnimationFrame loop (`update`).
   * - Manages cameraX/cameraY to render a viewport slice of a taller world.
   */
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

    // increase vertical space (map Y-axis) so stage has more height to climb
    // you can tweak this scale; 1.4 gives noticeably more vertical room
    // Do NOT change the visible canvas height. Instead keep a larger world height
    // and render only a viewport slice. This preserves the player's on-screen scale
    // while allowing a much taller level.
    const verticalScale = 10; // world is 10x taller than visible canvas
    const worldHeight = Math.max(240, Math.round(canvas.height * verticalScale));

    // initialize platforms via ground module (world is wider now). Pass worldHeight so
    // ground generation and map loading use the world coordinate space.
    const info = groundModule.init(canvas, { startPlatformX, startPlatformWidth, startPlatformHeight, worldScale: 8, worldHeight });
    platforms = groundModule.platforms;
    // let player module place the player on the start platform (pass start X)
    if (typeof playerModule.init === 'function') {
      playerModule.init(info.startPlatformY, info.startPlatformX);
    }

    // world and camera state
    const worldWidth = info.worldWidth || canvas.width;
    // prefer provided worldHeight or fallback to canvas.height
    const worldH = typeof info.worldHeight === 'number' ? info.worldHeight : canvas.height;
    let cameraX = 0; // world coordinate of left edge of screen
    let cameraY = 0; // world coordinate of top edge of screen (vertical camera)

    // No additional random platforms for stage4; ground module provides base platform(s).

    // 그리기
    function drawPlayer(offsetX) {
      // Delegate drawing to player module when available (pass camera offsets)
      if (playerModule && typeof playerModule.draw === 'function') {
        try { playerModule.draw(ctx, offsetX, cameraY); return; } catch (e) { /* fallback below */ }
      }
      ctx.fillStyle = 'blue';
      ctx.fillRect(Math.round(player.x - offsetX), Math.round(player.y - cameraY), player.width, player.height);
    }

    function drawPlatforms(offsetX) {
      if (groundModule && typeof groundModule.drawPlatforms === 'function') {
        groundModule.drawPlatforms(ctx, offsetX, cameraY);
        return;
      }
      ctx.fillStyle = 'green';
      platforms.forEach(p => ctx.fillRect(Math.round(p.x - offsetX), Math.round(p.y - cameraY), p.width, p.height));
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
      if (keys['ArrowLeft']) player.x -= 6;
      if (keys['ArrowRight']) player.x += 6;
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
      // Consider world height when deciding game over. If player falls below the
      // world bottom (worldH) it's game over. worldH is the world height in
      // world coordinates; if absent fall back to canvas height for safety.
      const bottom = typeof worldH === 'number' ? worldH : canvas.height;
      if (player.y > bottom) {
        alert('Game Over! 생존 시간: ' + elapsedTime + '초');
        return true;
      }
      return false;
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updatePlayerMovement();
      checkPlatformCollision();
      // check finish condition
      if (groundModule && typeof groundModule.checkFinish === 'function') {
        try {
          if (groundModule.checkFinish(player)) {
            alert('Victory! 결승점에 도달했습니다. 축하합니다!');
            return; // stop the game loop
          }
        } catch (e) { /* ignore check errors */ }
      }
      // compute horizontal cameraX as before
      const halfW = Math.round(canvas.width / 2);
      if (player.x < halfW) cameraX = 0;
      else if (player.x > worldWidth - halfW) cameraX = Math.max(0, worldWidth - canvas.width);
      else cameraX = Math.round(player.x - halfW);

      // compute vertical cameraY: keep camera at 0 until player reaches center vertically,
      // then follow player but clamp within world vertical bounds so viewport stays valid.
      const halfH = Math.round(canvas.height / 2);
      if (player.y < halfH) cameraY = 0;
      else if (player.y > worldH - halfH) cameraY = Math.max(0, worldH - canvas.height);
      else cameraY = Math.round(player.y - halfH);
      elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      if (checkGameOver()) return;
      // draw in world coordinates but offset by cameraX and cameraY
      drawPlatforms(cameraX);
      drawPlayer(cameraX);
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
