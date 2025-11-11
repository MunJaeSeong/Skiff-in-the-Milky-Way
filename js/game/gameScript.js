/*
  gameScript.js
  - Core game runtime: canvas setup, main loop, entity management
  - Exposes `window.Game` API for loading stages and controlling the game
  - Stages should register themselves via `window.registerStage(id, module)`

  This is a lightweight draft to wire Player, stage modules and provide
  spawn helpers. It's intentionally small and commented for later extension.
*/
(function(){
  'use strict';

  // 로컬스토리지에 저장된 커스터마이즈 정보 키 (Custom UI와 동일한 키 사용)
  const STORAGE_KEY = 'skiff_custom_v1';

  // 저장된 커스터마이즈 데이터를 안전하게 읽어오는 헬퍼
  // 반환 형태: 객체 (예: { character: 'assets/character/rea.jpg', ship: 'assets/skiffs/woodskiff.png', projectile: { img: '...' } })
  function readCustom(){
    try{
      // 로컬스토리지에서 JSON 파싱, 예외 발생 시 빈 객체 반환
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    }catch(e){
      return {};
    }
  }

  /**
   * Game 오브젝트 (간단한 런타임 스캐폴드)
   * 주요 책임:
   * - 캔버스 초기화 및 리사이즈
   * - 메인 루프(update/render)
   * - 엔티티(플레이어, 적, 탄환) 관리
   * - 스테이지(script) 동적 로딩 및 등록(registration)
   *
   * 주의: 이 파일은 최소 기능의 초안이며, 실제 게임 로직은 단계별로 확장해야 합니다.
   */
  const Game = {
  canvas: null,
  ctx: null,
  width: 800,
  height: 600,
  // HUD / score
  score: 0,
  highScore: 0,
  running: false,
    lastTime: 0,
    rafId: null,
    player: null,
    enemies: [],
    bullets: [],
    stageModule: null,
    registeredStages: {},

    /**
     * 캔버스 초기화
     * - canvasId: DOM에 존재하는 <canvas> 요소의 id (예: 'gameCanvas')
     * - 윈도우 리사이즈를 감지해 캔버스 크기 동기화
     * - 키 입력(간단한 상태 스냅샷)을 수집하여 Player가 참조할 수 있게 함
     */
    init(canvasId){
      const c = document.getElementById(canvasId);
      if (!c) throw new Error('Canvas not found: '+canvasId);
      this.canvas = c;
      this.ctx = c.getContext('2d');
      this.resize();
      // load style variables from CSS (allows theming via css/game.css)
      try{ this._loadStyles(); }catch(e){ console.warn('Failed to load styles:', e); }
      // 브라우저 크기 변경 시 캔버스 재조정
      window.addEventListener('resize', ()=> this.resize());

      // 간단한 입력 상태 객체: 키가 눌리면 true, 떼면 false
      this.keys = {};
      window.addEventListener('keydown', (e)=>{ this.keys[e.key] = true; });
      window.addEventListener('keyup', (e)=>{ this.keys[e.key] = false; });

      // 스테이지 모듈이 호출할 수 있도록 전역 registerStage 노출
      // 사용법: stage 스크립트는 window.registerStage('stage1', module) 호출
      window.registerStage = (id, module) => { this.registerStage(id, module); };
      // 전역에 Game 레퍼런스 설정
      window.Game = window.Game || this;
      return this;
    },

    /** 읽어온 CSS custom properties를 JS에서 쓸 수 있도록 파싱하여 저장합니다 */
    _loadStyles(){
      const cs = getComputedStyle(document.documentElement);
      const parseNum = (name, fallback) => {
        const v = cs.getPropertyValue(name).trim();
        if (!v) return fallback;
        const f = parseFloat(v);
        return Number.isFinite(f) ? f : fallback;
      };
      this.styles = {
        panelFraction: parseNum('--hud-panel-fraction', 0.25),
        pad: parseNum('--hud-pad', 14),
        gameBg: cs.getPropertyValue('--game-bg') || '#000022',
        panelBg: cs.getPropertyValue('--hud-panel-bg') || '#0b1220',
        innerBg: cs.getPropertyValue('--hud-inner-bg') || '#12202b',
        accent: cs.getPropertyValue('--hud-accent') || '#ef4444',
        accentBg: cs.getPropertyValue('--hud-accent-bg') || '#22303f',
        textColor: cs.getPropertyValue('--hud-text-color') || '#fff',
        labelFont: cs.getPropertyValue('--hud-label-font') || '16px sans-serif',
        scoreFont: cs.getPropertyValue('--hud-score-font') || '28px monospace',
        hpBorder: cs.getPropertyValue('--hp-border-color') || '#274050',
        sdPlaceholder: cs.getPropertyValue('--sd-placeholder') || '#24313a',
        barWidthVBase: parseNum('--hp-bar-base-width', 24),
        sdBase: parseNum('--sd-base-size', 64),
        sdScale: parseNum('--sd-scale', 2.5),
      };
    },

    /** 캔버스와 내부 너비/높이 동기화 */
    resize(){
      if (!this.canvas) return;
      // CSS로 설정한 clientWidth/clientHeight를 사용해 렌더 해상도를 맞춤
      this.width = this.canvas.clientWidth || window.innerWidth;
      this.height = this.canvas.clientHeight || window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    },

    /** 스테이지 모듈을 등록 (registerStage에서 호출됨) */
    registerStage(id, module){
      this.registeredStages[id] = module;
      console.log('Stage registered:', id);
    },

    /**
     * 스테이지 스크립트를 동적으로 로드
     * - 파일 위치 규약: js/game/stage/{stageId}.js
     * - 스크립트 로드 완료 후, 해당 스크립트가 window.registerStage를 호출하여 등록되었는지 확인
     */
    loadStageScript(stageId){
      const self = this;
      if (this.registeredStages[stageId]) return Promise.resolve(this.registeredStages[stageId]);
      return new Promise((resolve, reject) => {
        const src = `js/game/stage/${stageId}.js`;
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          // 스크립트가 로드되면 해당 스크립트 내에서 registerStage를 호출할 시간을 줌
          setTimeout(()=>{
            if (self.registeredStages[stageId]) resolve(self.registeredStages[stageId]);
            else reject(new Error('Stage script loaded but did not register: '+stageId));
          }, 50);
        };
        script.onerror = (e)=> reject(new Error('Failed to load stage script: '+src));
        document.body.appendChild(script);
      });
    },

    /**
     * 스테이지 시작 진입점
     * - 플레이어 인스턴스를 생성하고, 로컬 저장된 커스터마이즈를 적용함
     * - 스테이지 모듈(init/start)을 호출하고 메인 루프를 시작
     */
    startStage(stageId){
      const self = this;
      if (!this.canvas) this.init('gameCanvas');
      // 기존 스테이지/루프 정리
      this.stopStage();
      // 저장된 커스터마이즈를 읽어 플레이어에 적용
      const custom = readCustom();
      // Player 클래스는 별도 파일(js/game/player.js)에 정의되어야 함
      if (!window.Player){ console.warn('Player class not found (js/game/player.js expected).'); }
      // spawn player centered within the gameplay area (left 75% of canvas)
      const panelW = Math.floor(this.width * 0.25);
      const gameAreaW = Math.max(100, this.width - panelW);
      this.player = window.Player ? new window.Player(this, Math.floor(gameAreaW / 2), this.height - 120) : null;
      if (this.player && typeof this.player.applyCustomization === 'function'){
        this.player.applyCustomization(custom);
      }

      return this.loadStageScript(stageId).then((stageModule) => {
        // 스테이지 모듈 초기화
        this.stageModule = stageModule;
        if (stageModule && typeof stageModule.init === 'function'){
          stageModule.init(this);
        }
        // 엔티티 초기화
        this.enemies = [];
        this.bullets = [];
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        if (stageModule && typeof stageModule.start === 'function') stageModule.start();
        return stageModule;
      });
    },

    /** 스테이지 정지: 루프 중단 및 스테이지 stop 훅 호출 */
    stopStage(){
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.stageModule && typeof this.stageModule.stop === 'function'){
        try{ this.stageModule.stop(); }catch(e){}
      }
      this.stageModule = null;
    },

    /** 메인 루프 스케줄러 (requestAnimationFrame 기반) */
    loop(now){
      if (!this.running) return;
      // dt를 초 단위로 계산하되 프레임 드랍 시 급격한 점프 방지
      const dt = Math.min(40, now - this.lastTime) / 1000; // cap dt in ms
      this.update(dt);
      this.render();
      this.lastTime = now;
      this.rafId = requestAnimationFrame((t)=> this.loop(t));
    },

    /**
     * 업데이트 단계
     * - 플레이어/적/탄환의 update 호출
     * - 탄환-적 충돌 판정 (단순 AABB)
     * - 적(보스) 처치 시 스테이지에 알림
     */
    update(dt){
      // 플레이어 업데이트 (예외 안전하게 호출)
      try{ if (this.player && this.player.update) this.player.update(dt); }catch(e){ console.error(e); }

      // 탄환 업데이트 및 제거
      for (let i = this.bullets.length-1; i>=0; i--){
        const b = this.bullets[i];
        if (b.update) b.update(dt);
        if (b.dead) this.bullets.splice(i,1);
      }

      // 적 업데이트 및 사망 처리
      for (let i = this.enemies.length-1; i>=0; i--){
        const e = this.enemies[i];
        if (e.update) e.update(dt);
        if (e.hp <= 0 || e.dead) {
          // 보스가 죽으면 스테이지 모듈의 onBossDefeated를 호출
          if (e.isBoss && this.stageModule && typeof this.stageModule.onBossDefeated === 'function'){
            try{ this.stageModule.onBossDefeated(); }catch(err){}
          }
          this.enemies.splice(i,1);
        }
      }

      // 플레이어 소유 탄환과 적 간의 충돌 단순 처리
      for (let bi = this.bullets.length-1; bi>=0; bi--){
        const b = this.bullets[bi];
        if (b.owner === 'player'){
          for (let ei = this.enemies.length-1; ei>=0; ei--){
            const en = this.enemies[ei];
            if (this.rectIntersect(b, en)){
              en.hp -= b.damage || 1;
              b.dead = true; // 탄환 제거 표시
              break;
            }
          }
        }
      }

      // 스테이지 모듈의 추가 업데이트 훅 호출 (옵션)
      if (this.stageModule && typeof this.stageModule.onUpdate === 'function'){
        try{ this.stageModule.onUpdate(dt); }catch(e){}
      }
    },

    /**
     * 간단한 충돌 판정 유틸
     * - a, b는 {x,y,w,h} 또는 {x,y,r} 형태를 예상
     */
    rectIntersect(a,b){
      // Treat entity coordinates as centers (x,y are centers).
      // If w/h are provided they represent full width/height.
      // If r is provided it's a radius and full size is r*2.
      const aw = a.w || (a.r? a.r*2 : 0);
      const ah = a.h || (a.r? a.r*2 : 0);
      const bw = b.w || (b.r? b.r*2 : 0);
      const bh = b.h || (b.r? b.r*2 : 0);
      const ax1 = a.x - (aw / 2);
      const ay1 = a.y - (ah / 2);
      const bx1 = b.x - (bw / 2);
      const by1 = b.y - (bh / 2);
      return !(ax1 + aw < bx1 || bx1 + bw < ax1 || ay1 + ah < by1 || by1 + bh < ay1);
    },

    /** 렌더 단계: 배경, 플레이어, 적, 탄환, 간단 HUD */
    render(){
      const ctx = this.ctx;
      if (!ctx) return;
  ctx.clearRect(0,0,this.width,this.height);

  // ensure styles are loaded (in case CSS changed dynamically)
  if (!this.styles) this._loadStyles();
  const pad = this.styles.pad;
  // compute panel and game area sizes; panelFraction read from CSS variables
  const panelW = Math.floor(this.width * (this.styles.panelFraction || 0.25));
  const gameAreaW = Math.max(100, this.width - panelW);

      // draw gameplay area (clipped to left region)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, gameAreaW, this.height);
      ctx.clip();

  // gameplay background
  ctx.fillStyle = this.styles.gameBg || '#000022';
  ctx.fillRect(0, 0, gameAreaW, this.height);

      // draw player and entities inside gameplay area
      try{ if (this.player && this.player.draw) this.player.draw(ctx); }catch(e){ console.error(e); }
      this.enemies.forEach(e => { if (e.draw) e.draw(ctx); else { ctx.fillStyle='red'; ctx.fillRect(e.x-10,e.y-10,20,20); } });
      this.bullets.forEach(b => {
        if (b.draw) b.draw(ctx);
        else {
          // default bullet rendering: draw a filled circle using radius r if available
          ctx.fillStyle = 'yellow';
          const r = b.r || Math.max(3, Math.floor(((b.w||0) + (b.h||0)) / 4));
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI*2);
          ctx.fill();
        }
      });

      if (this.stageModule && typeof this.stageModule.draw === 'function'){
        try{ this.stageModule.draw(ctx); }catch(e){}
      }

      ctx.restore();

  // Boss HP bar: draw a horizontal, white "neon" bar across the top of the gameplay area
  const boss = this.enemies.find(e => e && e.isBoss);
  if (boss && typeof boss.hp === 'number'){
    const bx = Math.max(8, pad);
    const by = 8;
    const bw = Math.max(120, gameAreaW - bx*2);
    const bh = 14;
    const bmax = (typeof boss.maxHp === 'number') ? boss.maxHp : Math.max(1, boss.hp);
    const bpct = Math.max(0, Math.min(1, boss.hp / bmax));
    ctx.save();
    // subtle background
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(bx, by, bw, bh);
    // glowing white fill
    ctx.shadowColor = 'rgba(255,255,255,0.95)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.fillRect(bx, by, Math.floor(bw * bpct), bh);
    // outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
  }

  // draw HUD panel on the right
  const panelX = gameAreaW;
  ctx.fillStyle = this.styles.panelBg || '#0b1220';
  ctx.fillRect(panelX, 0, panelW, this.height);

  const textX = panelX + pad;
  let y = pad + 20;

  // (score is drawn to the right of the vertical HP bar)

  // Vertical HP bar (left side of HUD panel) — 위에서부터 채워지는 방식
  const hp = (this.player && typeof this.player.hp === 'number') ? this.player.hp : 0;
  const maxHp = (this.player && typeof this.player.maxHp === 'number') ? this.player.maxHp : 10;
  const pct = Math.max(0, Math.min(1, hp / (maxHp || 1)));

  const barWidthVBase = this.styles.barWidthVBase || 24; // base width from CSS
  // reduce width to 0.7x of the base, but keep a small minimum for visibility
  const barWidthV = Math.max(8, Math.floor(barWidthVBase * 0.7));
  const barX = panelX + pad;
  const barY = pad;
  const barHeightV = Math.max(80, this.height - pad*2);
  // background
  ctx.fillStyle = this.styles.innerBg || '#12202b';
  ctx.fillRect(barX, barY, barWidthV, barHeightV);
  // filled portion (from top downward)
  const fillH = Math.floor(barHeightV * pct);
  ctx.fillStyle = this.styles.accent || '#ef4444';
  ctx.fillRect(barX, barY, barWidthV, fillH);
  // border
  ctx.strokeStyle = this.styles.hpBorder || '#274050';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidthV, barHeightV);

  // Score text moved to the right of the vertical HP bar (바를 스코어에 딱 붙임)
  // SD 이미지 (HP 바 바로 오른쪽)
  // SD portrait: base size then scale (configured via CSS var --sd-scale), but cap to available space
  const baseSd = Math.min(this.styles.sdBase || 64, barHeightV, panelW - (barWidthV + pad*2));
  let sdSize = Math.floor(baseSd * (this.styles.sdScale || 2.5));
  // ensure it doesn't overflow the available width or height of the HUD
  sdSize = Math.min(sdSize, Math.max(8, panelW - (barWidthV + pad*2)), barHeightV);
  const sdX = barX + barWidthV + 6;
  // place SD portrait aligned to the bottom of the HUD panel
  const sdY = barY + barHeightV - sdSize;
  if (this.player && this.player.sdSprite && this.player.sdSprite.complete && !this.player.sdSprite._broken && this.player.sdSprite.naturalWidth > 0){
    try{ ctx.drawImage(this.player.sdSprite, sdX, sdY, sdSize, sdSize); }catch(e){}
  } else {
    // placeholder box if SD image not loaded
    ctx.fillStyle = this.styles.sdPlaceholder || '#24313a';
    ctx.fillRect(sdX, sdY, sdSize, sdSize);
  }

  // Score text placed immediately to the right of the SD portrait
  const scoreX = sdX + sdSize + 6;
  let sy = pad + 20;
  ctx.font = this.styles.labelFont || '16px sans-serif';
  ctx.fillStyle = this.styles.textColor || '#fff';
  ctx.fillText('SCORE', scoreX, sy);
  ctx.font = this.styles.scoreFont || '28px monospace';
  ctx.fillText(String(this.score || 0), scoreX, sy + 36);
    },

    // 엔티티 생성 헬퍼들 (스테이지/플레이어가 호출)
    spawnEnemy(entity){ this.enemies.push(entity); return entity; },
    spawnPlayerBullet(b){ this.bullets.push(b); return b; },
    spawnEnemyBullet(b){ this.bullets.push(b); return b; },
    spawnBoss(entity){ entity.isBoss = true; this.enemies.push(entity); return entity; },

    /**
     * 스테이지 종료 처리
     * - 현재는 단순히 루프를 멈추고 alert를 띄움
     * - 실제 게임에서는 결과 화면, 보상, 다음 스테이지 로직 등을 연결하면 됨
     */
    endStage(){
      this.stopStage();
      try{ alert('Stage complete!'); }catch(e){}
    }
  };

  // 전역에 Game 객체 노출
  window.Game = window.Game || Game;

})();
