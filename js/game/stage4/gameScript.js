// ========================================
// 플랫폼 점프 게임 JavaScript 코드 (stage4)
// ========================================

(function () {
  'use strict';

  /**
   * Stage4 게임 루프 / 장면 제어기
   * 설명:
   * - 게임 화면을 그릴 캔버스와 필요한 모듈(플레이어, 땅)을 준비합니다.
   * - 매 프레임마다 `update` 함수를 호출해 게임 상태를 계산하고 그립니다.
   * - 화면은 전체 '월드'의 일부(뷰포트)만 보여줍니다. cameraX/cameraY는
   *   이 뷰포트의 위치를 나타내며, 플레이어가 이동하면 카메라도 따라갑니다.
   */
  function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {  // 캔버스 존재 확인(존재하지 않을 시 초기화 중단)
      console.warn('stage4 gameScript: canvas #gameCanvas not found. Aborting init.');
      return;
    }
    const ctx = canvas.getContext('2d');

    // 플레이어는 `player.js`에서 관리합니다.
    // 플레이어 모듈이 없으면 게임을 시작할 수 없으므로 초기화를 멈추고
    // 에러 메시지를 출력합니다.
    const playerModule = window.Stage4Player; // 플레이어 모듈
    if (!playerModule || !playerModule.player) {
      const msg = 'Stage4 error: player module not found. Ensure js/game/stage4/player.js is loaded before gameScript.js.';
      console.error(msg);
      try { alert(msg); } catch (e) {}
      return; // abort init
    }
    const player = playerModule.player; // 플레이어 객체

    // 플랫폼은 `ground.js` 모듈에서 관리합니다. 모듈이 없으면 초기화를 중단합니다.
    const groundModule = window.Stage4Ground; // 지면(플랫폼) 모듈
    if (!groundModule || !Array.isArray(groundModule.platforms) || typeof groundModule.init !== 'function') {
      const msg = 'Stage4 error: ground module not found. Ensure js/game/stage4/ground.js is loaded before gameScript.js.';
      console.error(msg);
      try { alert(msg); } catch (e) {}
      return; // abort init
    }
    let platforms = groundModule.platforms; // 플랫폼 배열

    // 게임 시간 관리
    let startTime = Date.now();
    let elapsedTime = 0;

    // 키 입력 처리 (누른 키 상태를 기록하고 플레이어 모듈로 전달합니다)
    let keys = {};
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    // 기본 플랫폼
    const startPlatformY = canvas.height - 50;
    const startPlatformX = 150;
    const startPlatformWidth = 100;
    const startPlatformHeight = 10;

    // 중앙 설정: 월드 크기 기본값을 한곳에서 정의합니다.
    // 다른 모듈(ground, maps)은 이 값을 참조하도록 변경했습니다.
    const DEFAULT_WORLD_WIDTH = 6400;
    const DEFAULT_WORLD_HEIGHT = 8000;
    // expose global defaults for other modules if needed
    try { window.Stage4WorldDefaults = { worldWidth: DEFAULT_WORLD_WIDTH, worldHeight: DEFAULT_WORLD_HEIGHT }; } catch (e) { /* ignore */ }

    // 지면(플랫폼) 초기화: ground 모듈을 통해 플랫폼을 초기화합니다.
    // 월드가 더 넓어졌으므로 `worldHeight`를 전달해 지면 생성과 맵 로딩이
    // 월드 좌표계를 사용하도록 합니다.
    const info = groundModule.init(canvas, { startPlatformX, startPlatformWidth, startPlatformHeight, worldWidth: DEFAULT_WORLD_WIDTH, worldHeight: DEFAULT_WORLD_HEIGHT });
    platforms = groundModule.platforms;
    // 플레이어 모듈이 시작 플랫폼 위에 플레이어를 배치하도록 합니다. (시작 X 전달)
    if (typeof playerModule.init === 'function') {
      playerModule.init(info.startPlatformY, info.startPlatformX);
    }

    // 월드 그리고 카메라 상태
    // groundModule이 노출하는 실제 월드 크기를 우선 사용합니다 (맵 파일에서 정의 가능).
    const worldWidth = (groundModule && typeof groundModule.worldWidth === 'number') ? groundModule.worldWidth : (info.worldWidth || canvas.width);
    // 제공된 worldHeight를 사용하거나 canvas.height로 대체합니다. groundModule 우선.
    const worldH = (groundModule && typeof groundModule.worldHeight === 'number') ? groundModule.worldHeight : (typeof info.worldHeight === 'number' ? info.worldHeight : canvas.height);
    let cameraX = 0; // 월드 좌표에서 화면 왼쪽 가장자리 위치 (수평 카메라)
    let cameraY = 0; // 월드 좌표에서 화면 위쪽 가장자리 위치 (수직 카메라)
    
    // 그리기: 플레이어 그리기 함수
    // offsetX: 수평 카메라 오프셋(월드 좌표를 화면으로 옮기기 위해 뺄 값)
    function drawPlayer(offsetX) {
      // 가능한 경우 플레이어 모듈이 제공하는 그리기 함수를 사용합니다.
      if (playerModule && typeof playerModule.draw === 'function') {
        try { playerModule.draw(ctx, offsetX, cameraY); return; } catch (e) { /* 실패하면 아래 대체 렌더링 */ }
      }
      // 모듈이 없거나 실패하면 단순한 파란 사각형으로 플레이어를 그립니다.
      ctx.fillStyle = 'blue';
      ctx.fillRect(Math.round(player.x - offsetX), Math.round(player.y - cameraY), player.width, player.height);
    }

    // 그리기: 플랫폼 그리기 함수
    function drawPlatforms(offsetX) {
      if (groundModule && typeof groundModule.drawPlatforms === 'function') {
        groundModule.drawPlatforms(ctx, offsetX, cameraY);
        return;
      }
      ctx.fillStyle = 'green';
      platforms.forEach(p => ctx.fillRect(Math.round(p.x - offsetX), Math.round(p.y - cameraY), p.width, p.height));
    }

    // 그리기: 시간 표시 함수(구현 x 사용예정)
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

    // 플랫폼 충돌 검사 및 처리
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
 
    // 오류 검사 (이전 이름: checkError)
    // 기능: 플레이어가 월드 바닥(worldH) 아래로 떨어지면 true를 반환합니다. --true 시 사용자에게 오류를 알림
    function checkError() {
      // 플레이어가 월드 바닥(worldH) 아래로 떨어지면 오류(종료)로 처리합니다.
      // worldH는 월드 좌표의 높이이며, 없으면 캔버스 높이를 대신 사용합니다.
      const bottom = typeof worldH === 'number' ? worldH : canvas.height;
      if (player.y > bottom) {
        alert('예상치 못한 버그가 발생했습니다. 생존 시간: ' + elapsedTime + '초');
        return true;
      }
      return false;
    }

    // 메인 게임 루프: 매 프레임마다 호출됩니다.
    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updatePlayerMovement();
      checkPlatformCollision();
      // update traps animation/logic
      if (window.Stage4Traps && typeof window.Stage4Traps.update === 'function') {
        try { window.Stage4Traps.update(player); } catch (e) { /* ignore */ }
      }
      // check trap collisions (some traps apply knockback, some are fatal)
      if (groundModule && typeof groundModule.checkTrapCollision === 'function') {
        try {
          const trapHit = groundModule.checkTrapCollision(player);
          if (trapHit) {
            // fatal trap -> end run
            alert('Game Over! 함정에 의해 사망했습니다.');
            return;
          }
        } catch (e) { /* ignore trap check errors */ }
      }
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
      if (checkError()) return;
      // 월드 좌표로 그리되 카메라 오프셋(cameraX, cameraY)을 빼서 화면에 맞춥니다.
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
