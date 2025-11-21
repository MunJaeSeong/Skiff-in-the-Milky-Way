// Stage4 땅 모듈: 플랫폼 생성, 그리기 및 충돌 처리를 담당합니다
(function () {
  'use strict';

  /**
   * Stage4 땅(플랫폼) 모듈
   *
   * 설명:
   * - 이 모듈은 게임 레벨의 '땅'과 플랫폼을 만들고 그리며, 충돌을 검사합니다.
   * - 외부 맵 파일(window.Stage4Maps)을 읽어 플랫폼을 만들 수 있고,
   *   맵이 없으면 코드가 자동으로 플랫폼을 만들어 냅니다(절차적 생성).
   * - `worldHeight`는 화면(캔버스) 높이와 별개로 월드 전체의 높이를 뜻합니다.
   *   즉, 보이는 창보다 훨씬 큰 월드를 만들 수 있고 카메라가 그 일부만 보여줍니다.
   */

  // 땅(플랫폼) 모듈 객체
  const Stage4Ground = {
    platforms: [],
    finish: null,
    worldWidth: null,

    // 월드/플랫폼 초기화
    // - `worldScale`을 사용하면 월드를 더 넓게 만들 수 있습니다(기본값: 8).
    // - opts 예: { floorHeight, worldScale, startPlatformX, startPlatformWidth, startPlatformHeight }
    init(canvas, opts = {}) {
      const floorHeight = typeof opts.floorHeight === 'number' ? opts.floorHeight : 10;
      const worldScale = typeof opts.worldScale === 'number' ? Math.max(1, opts.worldScale) : 8;
      let startPlatformX = typeof opts.startPlatformX === 'number' ? opts.startPlatformX : 0;
      let startPlatformWidth = typeof opts.startPlatformWidth === 'number' ? opts.startPlatformWidth : 100;
      let startPlatformHeight = typeof opts.startPlatformHeight === 'number' ? opts.startPlatformHeight : floorHeight;
      // 기본: 보이는 캔버스 너비(`canvas.width`)를 worldScale로 확장하여 월드를 만듭니다.
      // 다만 맵 파일(mapData)이 `worldWidth`/`worldHeight`를 명시하면 그 값을 우선합니다.
      // 맵 이름 가져오기 (맵 파일이 있으면 플랫폼을 거기서 불러옵니다; opts.mapName 또는 'map_1' 사용)
      const mapName = typeof opts.mapName === 'string' ? opts.mapName : 'map_1';
      const maps = (typeof window !== 'undefined' && window.Stage4Maps) ? window.Stage4Maps : null;
      const mapData = maps && maps[mapName] ? maps[mapName] : null;

      // 기본 world 계산 (옵션으로 전달된 값 또는 캔버스 기반 계산)
      let worldWidth = Math.max(1, Math.round(canvas.width * worldScale));
      let worldHeight = (typeof opts.worldHeight === 'number') ? Math.max(canvas.height, Math.round(opts.worldHeight)) : canvas.height;
      // 맵 파일에 명시된 월드 크기가 있으면 우선 사용합니다.
      if (mapData) {
        if (typeof mapData.worldWidth === 'number' && mapData.worldWidth > 0) {
          worldWidth = Math.max(1, Math.round(mapData.worldWidth));
        }
        if (typeof mapData.worldHeight === 'number' && mapData.worldHeight > 0) {
          worldHeight = Math.max(canvas.height, Math.round(mapData.worldHeight));
        }
      }

      // world에 맞춘 기본 바닥 및 시작 플랫폼의 Y 좌표 계산
      const floorY = worldHeight - floorHeight;
      const startPlatformY = worldHeight - startPlatformHeight;

      // 기본 바닥 플랫폼 생성: 월드 전체 너비에 걸쳐 있습니다.
      this.platforms = [{ x: 0, y: floorY, width: worldWidth, height: floorHeight }];

      // 시작 플랫폼 추가: 요청된 X 위치에 생성됩니다. (플레이어 스폰에 유용)
      this.platforms.push({ x: startPlatformX, y: startPlatformY, width: startPlatformWidth, height: startPlatformHeight });

      if (mapData && Array.isArray(mapData.platforms)) {
          // 만약 맵(mapData)이 시작 발판 정보를 제공하면, 함수 호출자(opts)에서
          // 전달한 값보다 맵의 값으로 우선 덮어씁니다. (맵에 맞춰 플레이어 시작 위치를 조정)
          if (mapData.startPlatform && typeof mapData.startPlatform === 'object'){
            try{
              if (typeof mapData.startPlatform.x === 'number') startPlatformX = mapData.startPlatform.x;
              if (typeof mapData.startPlatform.width === 'number') startPlatformWidth = mapData.startPlatform.width;
              if (typeof mapData.startPlatform.height === 'number') startPlatformHeight = mapData.startPlatform.height;
              // 이미 넣어둔 시작 플랫폼 항목을 맵 정보로 덮어씁니다.
              this.platforms[this.platforms.length - 1] = { x: startPlatformX, y: startPlatformY, width: startPlatformWidth, height: startPlatformHeight };
            }catch(e){ /* startPlatform 형식이 잘못되면 무시 */ }
        }
          // 맵에 있는 플랫폼 항목을 순회하여, 퍼센트 좌표(xPercent/yPercent)가 있으면
          // 월드 크기에 맞춰 픽셀 단위로 계산합니다. (절대 좌표 x/y도 허용)
          // 이렇게 하면 같은 맵이 다른 해상도/월드 크기에서 비슷하게 보입니다.
        mapData.platforms.forEach(p => {
          // Allow platforms to be specified in absolute coords (`x`/`y`) or as percents (`xPercent`/`yPercent`).
          const platform = { x: 0, width: p.width || 100, height: p.height || 10 };
          // X: prefer xPercent when provided so maps can be resolution-independent
          if (typeof p.xPercent === 'number') platform.x = Math.round(worldWidth * p.xPercent);
          else platform.x = (typeof p.x === 'number') ? p.x : 0;
          // Y: percent relative to worldHeight if provided, else absolute y or fallback
          if (typeof p.yPercent === 'number') platform.y = Math.round(worldHeight * p.yPercent);
          else platform.y = (typeof p.y === 'number') ? p.y : Math.max(40, startPlatformY - 80);
          // 플랫폼이 월드 범위 안에 있으면 목록에 추가합니다.
          // 오른쪽 끝에 딱 맞닿는 경우도 허용합니다.
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
        // 맵 파일이 없을 때의 대체 동작: 절차적으로(platforms를 자동 생성) 플랫폼을 만듭니다.
        // 이렇게 하면 개발 중에 맵이 없어도 플레이할 수 있습니다.
        const marginFromRight = 120;
        const finishWidth = 80;
        const finishHeight = 18;
        const finishX = Math.max(startPlatformX + 400, worldWidth - marginFromRight - finishWidth);
        const finishY = Math.max(20, Math.round(worldHeight * 0.08));
        this.finish = { x: finishX, y: finishY, width: finishWidth, height: finishHeight };

        // 결승으로 이어지는 계단 모양의 플랫폼들을 만듭니다.
        const steps = 8;
        const stairStartX = Math.max(startPlatformX + 300, finishX - 800);
        for (let i = 0; i < steps; i++) {
          const sx = stairStartX + i * 100;
          const sy = Math.max(40, startPlatformY - (i + 1) * Math.round(worldHeight / 12));
          this.platforms.push({ x: sx, y: sy, width: 100, height: 10 });
        }

        // 초반에 고정된 떠 있는 장애물(플로팅 플랫폼)을 몇 개 추가합니다.
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

    // drawPlatforms(ctx, offsetX=0, offsetY=0)
    // - ctx: 캔버스 2D 컨텍스트
    // - offsetX/offsetY: 카메라(뷰포트) 위치를 빼서 화면에 맞게 그리기 위해 사용합니다.
    //   예: 화면 왼쪽이 월드 x=100이라면 offsetX=100을 빼서 그립니다.
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
    // checkCollision(player)
    // - 플레이어의 내부 충돌 사각형(rect)을 사용해 플랫폼과 충돌을 검사합니다.
    // - 착지(landing)를 감지하면 플레이어의 y와 ySpeed를 조정해 땅 위에 붙게 합니다.
    // - 반환값: 착지하여 grounded가 된 경우 true
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

      // remember previous grounded state so we can avoid dropping when
      // the player's internal collision rect shifts (e.g. when lying down).
      const wasGrounded = !!player.grounded;
      player.grounded = false;
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        // If player recently did a lying+jump and marked a platform to pass through,
        // skip collision with that specific platform while the countdown is active.
        try {
          if (player && typeof player.passThroughCountdown === 'number' && player.passThroughCountdown > 0 && player.passThroughPlatformY != null && player.passThroughPlatformY === p.y) {
            continue;
          }
        } catch (e) { /* ignore */ }
        // quick AABB horizontal check
        if (rect.x + rect.width <= p.x || rect.x >= p.x + p.width) continue;

        const rectBottom = rect.y + rect.height;
        // 이전 프레임의 바닥 위치를 간단히 추정합니다 (현재 ySpeed를 이용한 오일러 근사).
        // 이 값으로 '플레이어가 이전 프레임에는 플랫폼 위에 있었는지'를 판단합니다.
        const prevBottom = rectBottom - (player.ySpeed || 0);

        // 착지 판정: (1) 아래로 이동 중이고 (2) 이전 프레임 바닥이 플랫폼 위였거나 같고
        // 현재 바닥은 플랫폼의 높이보다 아래(또는 같음)인 경우 착지로 처리합니다.
        // Landing detection: normally require the previous bottom to be at-or-above
        // the platform top and the current bottom below-or-equal the platform top.
        // Additionally, if the player was already grounded the previous frame but
        // the internal collision rect moved slightly (e.g. when entering lying
        // state), allow a small tolerance so the player doesn't unintentionally
        // fall through platforms when merely crouching.
        const tolerance = 4; // pixels of tolerance for small rect shifts
        if ((player.ySpeed || 0) >= 0 && ((prevBottom <= p.y && rectBottom >= p.y) || (wasGrounded && Math.abs(rectBottom - p.y) <= tolerance))) {
          // 플레이어의 실제 y를 조정해서 내부 충돌 박스의 아래가 플랫폼 y에 딱 맞게 합니다.
          const offsetY = rect.y - player.y; // 플레이어 상자(y)와 내부 충돌 상자(rect.y) 차이
          player.y = p.y - offsetY - rect.height;
          player.ySpeed = 0; // 착지하면 수직 속도 0
          player.grounded = true;
          return true;
        }

        // NOTE: head-bump handling (player hitting underside of a platform)
        // was intentionally removed to prevent the player being pushed down
        // when contacting the underside of a platform while moving upwards.
      }
      return false;
    }
    ,

    // checkFinish(player)
    // - 플레이어의 내부 충돌 상자가 결승 영역(finish)과 겹치는지 검사합니다.
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
