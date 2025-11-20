// Stage4 mapping/minimap module
(function () {
  'use strict';

  /**
   * Stage4 미니맵(지도) 모듈
   *
   * 쉬운 설명(중학생용):
   * - 게임 화면 위에 작게 보이는 보조 지도를 만듭니다. 이 지도는 플레이어를 중심으로
   *   주변 구역만 보여주며 전체 맵을 항상 보여주지는 않습니다.
   * - 미니맵에는 가까운 플랫폼과 결승 마커를 그립니다(보이는 범위 내에 있을 때).
   */
  const Stage4Map = {
    canvas: null,
    ctx: null,
    width: 200, // CSS pixels
    height: 120,
    deviceRatio: 1,
    visible: true,
    pollInterval: null,
    running: false,

    // 필요한 다른 모듈(플레이어와 땅)이 준비될 때까지 기다리는 함수
    // 왜 필요한가? 미니맵은 플레이어와 플랫폼 정보를 사용하기 때문에
    // 두 모듈이 로드될 때까지 초기화를 늦춰야 안전합니다.
    waitForModules(timeoutMs = 3000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (window.Stage4Player && window.Stage4Ground && window.Stage4Player.player && Array.isArray(window.Stage4Ground.platforms)) {
            resolve();
            return;
          }
          if (Date.now() - start > timeoutMs) { reject(new Error('Required modules not available')); return; }
          setTimeout(check, 100);
        };
        check();
      });
    },

    init() {
      const gameCanvas = document.getElementById('gameCanvas');
      if (!gameCanvas) return;

      // 오버레이 캔버스 생성: 게임 캔버스 위에 겹쳐서 표시되는 작은 캔버스
      const map = document.createElement('canvas');
      map.className = 'stage4-minimap';
      // style via inline to ensure proper placement
      map.style.position = 'absolute';
      map.style.left = '8px';
      map.style.top = '8px';
      map.style.width = this.width + 'px';
      map.style.height = this.height + 'px';
      map.style.zIndex = 1000;
      map.style.border = '1px solid rgba(0,0,0,0.6)';
      map.style.background = 'rgba(255,255,255,0.05)';
      map.style.pointerEvents = 'none';

      // place inside same parent as gameCanvas so it overlays correctly
      const parent = gameCanvas.parentNode || document.body;
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(map);

      this.canvas = map;
      // 디스플레이의 픽셀 밀도(devicePixelRatio)를 고려해서 실제 버퍼 크기를 조정합니다.
      // 이렇게 하면 고해상도(예: 레티나) 디스플레이에서도 미니맵이 흐릿해지지 않습니다.
      this.deviceRatio = window.devicePixelRatio || 1;
      // 실제 캔버스 픽셀 크기 설정(논리적 CSS 픽셀 수 * deviceRatio)
      this.canvas.width = Math.max(1, Math.round(this.width * this.deviceRatio));
      this.canvas.height = Math.max(1, Math.round(this.height * this.deviceRatio));
      // CSS에서 보이는 크기는 원래 지정한 mw x mh로 유지합니다.
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx = this.canvas.getContext('2d');
      // 컨텍스트 좌표계를 deviceRatio에 맞춰서 스케일을 조정합니다.
      if (this.deviceRatio !== 1) this.ctx.setTransform(this.deviceRatio, 0, 0, this.deviceRatio, 0, 0);

      this.startLoop();
    },

    // 애니메이션 루프 시작: requestAnimationFrame으로 draw를 계속 호출합니다.
    startLoop() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        try { this.draw(); } catch (e) { /* ignore */ }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    stopLoop() { this.running = false; },

    toggle() { this.visible = !this.visible; if (this.canvas) this.canvas.style.display = this.visible ? 'block' : 'none'; },

    draw() {
      const ctx = this.ctx;
      if (!ctx || !this.canvas) return;

      const gameCanvas = document.getElementById('gameCanvas');
      if (!gameCanvas) return;

      // world dimensions: prefer ground.worldWidth if available (world may be larger than canvas)
      const gw = (window.Stage4Ground && typeof window.Stage4Ground.worldWidth === 'number') ? window.Stage4Ground.worldWidth : gameCanvas.width;
      const gh = (window.Stage4Ground && typeof window.Stage4Ground.worldHeight === 'number') ? window.Stage4Ground.worldHeight : gameCanvas.height;
      if (!gw || !gh) return;

      // logical minimap size (CSS pixels)
      const mw = this.width;
      const mh = this.height;

      // clear and background
      ctx.clearRect(0, 0, mw, mh);
      ctx.fillStyle = 'rgba(10,10,10,0.45)';
      ctx.fillRect(0, 0, mw, mh);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);

      // 미니맵에 보여줄 '월드 창(window)'을 선택합니다. 미니맵은 전체 맵 대신
      // 플레이어 주변의 작은 영역을 보여주는 것이 목적이므로 플레이어를 중심으로 합니다.
      const playerModule = window.Stage4Player;
      const p = playerModule && playerModule.player ? playerModule.player : null;
      // window size in world coords: show at least 4x the visible screen area (but no larger than the world)
      // (중학생 설명) 보이는 화면보다 넓은 영역을 보여줘 주변 상황을 더 잘 파악하게 합니다.
      // 단, 전체 월드보다 커지지 않게 제한합니다.
      const viewWorldW = Math.min(gw, Math.max(Math.round(gameCanvas.width * 4), Math.round(gameCanvas.width * 1.6)));
      const viewWorldH = Math.min(gh, Math.max(Math.round(gameCanvas.height * 4), Math.max(64, Math.round(gameCanvas.height * 0.35))));

      let viewX = 0;
      let viewY = 0;
      if (p) {
        viewX = Math.round(Math.max(0, Math.min(gw - viewWorldW, p.x - Math.round(viewWorldW / 2))));
        viewY = Math.round(Math.max(0, Math.min(gh - viewWorldH, p.y - Math.round(viewWorldH / 2))));
      }

      // 선택한 월드 창(window)에서 미니맵으로 변환하기 위한 스케일 비율
      const scaleX = mw / viewWorldW;
      const scaleY = mh / viewWorldH;

      // 선택된 창과 겹치는 플랫폼들만 그립니다(성능 향상을 위해).
      const ground = window.Stage4Ground;
      if (ground && Array.isArray(ground.platforms)) {
        ctx.fillStyle = '#2ecc71';
        ground.platforms.forEach(pl => {
          if (pl.x + pl.width < viewX || pl.x > viewX + viewWorldW || pl.y + pl.height < viewY || pl.y > viewY + viewWorldH) return;
          const rx = (pl.x - viewX) * scaleX;
          const ry = (pl.y - viewY) * scaleY;
          const rw = Math.max(1, pl.width * scaleX);
          const rh = Math.max(1, pl.height * scaleY);
          ctx.fillRect(rx, ry, rw, rh);
        });
        // 창 안에 결승(finish)이 있으면 결승 마커를 그립니다.
        if (ground.finish) {
          try {
            const f = ground.finish;
            if (!(f.x + f.width < viewX || f.x > viewX + viewWorldW || f.y + f.height < viewY || f.y > viewY + viewWorldH)) {
              ctx.fillStyle = '#f39c12';
              const fx = (f.x - viewX) * scaleX;
              const fy = (f.y - viewY) * scaleY;
              const fw = Math.max(2, f.width * scaleX);
              const fh = Math.max(2, f.height * scaleY);
              ctx.fillRect(fx, fy - Math.max(2, fh), fw, fh + 2);
              ctx.fillStyle = '#c0392b';
              ctx.fillRect(fx + Math.round(fw / 2), fy - Math.max(6, fh + 4), Math.max(1, Math.round(fw / 6)), Math.max(1, Math.round(fh / 2)));
            }
          } catch (e) { /* ignore */ }
        }
      }

      // 플레이어를 작은 점(원)으로 표시합니다.
      if (p) {
        const cx = (p.x + p.width / 2 - viewX) * scaleX;
        const cy = (p.y + p.height / 2 - viewY) * scaleY;
        // draw a simple yellow circular marker for the player (no rectangular border)
        ctx.fillStyle = '#f1c40f'; // yellow
        const r = Math.max(2, Math.min(6, Math.round(4 * Math.min(scaleX, scaleY))));
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }

      // 필요하면 미니맵 안에 현재 선택된 창의 테두리를 그릴 수 있습니다.
      // (지금은 전체 미니맵이 이미 선택된 창을 보여주므로 별도 프레임을 그리지 않습니다.)
    }
  };

  // attach to window for debugging/control
  window.Stage4Map = Stage4Map;

  // auto-init after DOM ready and modules available. Poll for Stage4Player/Stage4Ground.
  function tryInit() {
    Stage4Map.waitForModules(4000).then(() => {
      // small delay to ensure canvas exists and ground init ran
      setTimeout(() => { Stage4Map.init(); }, 0);
    }).catch(() => {
      // silently fail if modules never appear
      // but still attempt to initialize once DOM has canvas
      const gameCanvas = document.getElementById('gameCanvas');
      if (gameCanvas) setTimeout(() => { Stage4Map.init(); }, 0);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') tryInit(); else document.addEventListener('DOMContentLoaded', tryInit);

})();
