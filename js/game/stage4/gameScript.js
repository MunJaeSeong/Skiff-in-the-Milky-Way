// ========================================
// Platformer Jump 게임 JavaScript 코드 (stage4)
// This file is a corrected copy of the existing `gameScirpt.js` (typo) so
// the dynamic loader that expects `gameScript.js` will find and run it.
// ========================================

(function () {
  'use strict';

  /**
   * Stage4 게임 루프 / 장면 제어기
   *
   * 쉬운 설명(중학생용):
   * - 게임 화면을 그릴 캔버스와 필요한 모듈(플레이어, 땅)을 준비합니다.
   * - 매 프레임마다 `update` 함수를 호출해 게임 상태를 계산하고 그립니다.
   * - 화면은 전체 '월드'의 일부(뷰포트)만 보여줍니다. cameraX/cameraY는
   *   이 뷰포트의 위치를 나타내며, 플레이어가 이동하면 카메라도 따라갑니다.
   */
  function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('stage4 gameScript: canvas #gameCanvas not found. Aborting init.');
      return;
    }
    const ctx = canvas.getContext('2d');

    // 플레이어는 `player.js`에서 관리합니다.
    // 플레이어 모듈이 없으면 게임을 시작할 수 없으므로 초기화를 멈추고
    // 에러 메시지를 출력합니다. (중학생 설명: 플레이어가 없으면 게임이 안 됩니다.)
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

    // 게임 월드(레벨)의 세로 길이를 늘려서 더 높이 올라가는 스테이지를 만듭니다.
    // 설명: 보이는 캔버스 높이를 바꾸지 않고 내부적으로 더 큰 '월드'를 만들어
    // 플레이어가 위아래로 더 많이 움직이게 할 수 있습니다.
    // verticalScale이 클수록 월드는 더 높아집니다. (예: 10이면 캔버스 높이의 10배)
    const verticalScale = 10; // 월드를 화면 높이의 10배로 만듭니다.
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

    // 그리기: 플레이어 그리기 함수
    // offsetX: 수평 카메라 오프셋(월드 좌표를 화면으로 옮기기 위해 뺄 값)
    function drawPlayer(offsetX) {
      // 가능한 경우 플레이어 모듈이 제공하는 그리기 함수를 사용합니다.
      // (모듈에 애니메이션/스프라이트 로직이 포함되어 있으면 더 예쁘게 그려집니다.)
      if (playerModule && typeof playerModule.draw === 'function') {
        try { playerModule.draw(ctx, offsetX, cameraY); return; } catch (e) { /* 실패하면 아래 대체 렌더링 */ }
      }
      // 모듈이 없거나 실패하면 단순한 파란 사각형으로 플레이어를 그립니다.
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

    // 플레이어 움직임 업데이트
    // 입력 상태(keys)를 보고 플레이어 위치와 속도를 갱신합니다.
    // 우선 플레이어 모듈이 제공하는 함수가 있으면 모듈에 위임합니다.
    function updatePlayerMovement() {
      if (playerModule && typeof playerModule.updateMovement === 'function') {
        // playerModule.updateMovement는 내부에서 키를 보고 속도/위치를 직접 바꿉니다.
        playerModule.updateMovement(keys);
        return;
      }
      // 모듈이 없을 때의 간단한 대체 로직
      if (keys['ArrowLeft']) player.x -= 6;
      if (keys['ArrowRight']) player.x += 6;
      // 중력 적용: ySpeed에 중력 더하기, 그 속도로 y 위치 갱신
      player.ySpeed += player.gravity;
      player.y += player.ySpeed;
      // 땅에 있으면 스페이스로 점프
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
      // 플레이어가 월드 바닥(worldH) 아래로 떨어지면 게임 오버로 처리합니다.
      // worldH는 월드 좌표의 높이이며, 없으면 캔버스 높이를 대신 사용합니다.
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

      // compute vertical cameraY: position the player at 1/3 down from the top
      // so more of the world below the player is visible. Clamp to world bounds.
      const anchorY = Math.round(canvas.height / 3); // desired screen Y for the player
      const maxCameraY = Math.max(0, worldH - canvas.height);
      const desiredCameraY = Math.round(player.y - anchorY);
      cameraY = Math.max(0, Math.min(maxCameraY, desiredCameraY));
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

  // 문서가 이미 준비된 상태이면 즉시 초기화(다음 이벤트 루프에서),
  // 아니면 DOMContentLoaded 이벤트를 기다립니다.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
