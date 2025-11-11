/*
  player.js
  - Minimal Player class used by gameScript.js
  - Provides applyCustomization(custom) to apply character/ship/projectile choices
  - Implements simple movement, shooting and draw/update hooks for the runtime
*/
(function(){
  'use strict';

  /**
   * Player 클래스
   * - game: Game 인스턴스(전역 게임 상태와 헬퍼 접근을 위해 보관)
   * - applyCustomization(custom): 커스터마이즈 객체를 받아 이미지 경로 등을 적용
   * - update(dt)/draw(ctx): gameScript의 루프에서 호출됨
   *
   * 컨벤션: custom 객체는 다음과 같은 필드를 기대합니다.
   * - character: 문자열(이미지 경로 또는 id) 또는 null
   * - ship: 문자열(이미지 경로 또는 id) 또는 null
   * - projectile: 문자열(이미지 경로) 또는 { img: 'path', damage: n, speed: v }
   */
  class Player {
    constructor(game, x, y){
      this.game = game;
      this.x = x || 100;
      this.y = y || 100;
      this.w = 40; this.h = 40; // 충돌용 크기(간단화)
  this.r = 3; // hit radius in pixels (for collision checks)
      this.speed = 240; // px/s, 이동 속도
      this.hp = 10; // 플레이어 체력
  // 최대 체력 보관 (기본값은 생성 시 hp)
  this.maxHp = this.hp;
  this.cooldown = 0; // 발사 쿨타임
      // Invulnerability state when hit
      this.invulnerable = false;
      this.invulTimer = 0; // remaining invul time
      this.invulDur = 2.0; // seconds of invulnerability after hit
      this.invulBlinkTimer = 0; // blink accumulator
      this.invulBlinkPeriod = 0.12; // blink toggle period (seconds)
  // 발사 속도: 기존보다 3배 빠르게 (발사 간격을 1/3로). 원래 0.25 -> now ~0.0833s
  this.fireRate = 0.25 / 3;
      // 기본 발사체 정보: 이미지 경로, 속도, 데미지
  // projectile defaults: ensure damage is 1
  this.projectile = { img: null, speed: -600, damage: 1 };
      this.sprite = null; // 캐릭터 이미지(Image 객체)
      this.shipSprite = null; // 조각배(스킨) 이미지(Image 객체)
      this.sdSprite = null; // 캐릭터 SD 이미지
      this.characterId = null; // 선택된 캐릭터 id (raw)
    }

    // 후보 경로 생성 헬퍼: id로 들어온 값이 경로인지, 단순 id인지에 따라
    // 시도할 후보 배열을 반환합니다. 실패 시 자동으로 다음 후보를 시도하도록
    // 이미지의 onerror에서 처리합니다.
    _makeCandidatePaths(type, id){
      // type: 'character' | 'skiff' | 'projectile'
      if (!id || typeof id !== 'string') return [];
      // 이미 경로 형태거나 확장자가 있으면 그대로 시도
      if (id.startsWith('assets/') || id.match(/\.[a-zA-Z0-9]{2,4}$/)){
        return [id];
      }
      const candidates = [];
      const lower = id.toLowerCase();
      const upper = id.toUpperCase();
      const cap = id.charAt(0).toUpperCase() + id.slice(1);
      if (type === 'character'){
        // README에 따르면 캐릭터 파일은 'Rea.jpg', 'Noel.jpg' 등 대문자형이므로 여러 후보 생성
        candidates.push(`assets/character/${id}.jpg`);
        candidates.push(`assets/character/${cap}.jpg`);
        candidates.push(`assets/character/${lower}.jpg`);
        candidates.push(`assets/character/${upper}.jpg`);
        // png variants
        candidates.push(`assets/character/${id}.png`);
        candidates.push(`assets/character/${cap}.png`);
      } else if (type === 'skiff'){
        // skiffs folder, README shows woodskiff.png (lowercase)
        candidates.push(`assets/skiffs/${id}.png`);
        candidates.push(`assets/skiffs/${lower}.png`);
        candidates.push(`assets/skiffs/${cap}.png`);
        candidates.push(`assets/skiffs/${id}.jpg`);
      } else if (type === 'projectile'){
        candidates.push(`assets/projectile/${id}.jpg`);
        candidates.push(`assets/projectile/${id}.png`);
        candidates.push(`assets/projectile/${lower}.jpg`);
      }
      return candidates;
    }

    /**
     * 커스터마이즈 적용
     * - custom이 문자열(id)만 저장하는 구조면 별도의 매핑(map id -> path)이 필요함
     * - 현재는 custom에 이미지 경로가 들어있다는 가정으로 Image 객체를 생성함
     */
    applyCustomization(custom){
      if (!custom) return;
      // store character id (but do NOT load/draw full-character sprite in-game)
      // The in-game player graphic will be only the ship/skiff. SD portrait for HUD
      // can still be loaded below using characterId.
      if (custom.character && typeof custom.character === 'string'){
        this.characterId = custom.character;
        this.sprite = null; // ensure in-game sprite not used
      }
      // ship/skiff 필드가 이미지 경로일 경우 (UI에서 'skiff'로 저장한다면 이 필드를 사용)
      if ((custom.ship && typeof custom.ship === 'string') || (custom.skiff && typeof custom.skiff === 'string')){
        const id = (custom.ship && typeof custom.ship === 'string') ? custom.ship : custom.skiff;
        const candidates = this._makeCandidatePaths('skiff', id);
        const img = new Image();
        img._broken = false;
        img._candidates = candidates;
        img._ci = 0;
        img.onload = () => { img._broken = false; };
        img.onerror = function(){
          const self = this;
          self._ci = (self._ci || 0) + 1;
          if (self._candidates && self._ci < self._candidates.length){
            self.src = self._candidates[self._ci];
          } else {
            self._broken = true;
            console.warn('Ship/skiff image failed to load, tried:', self._candidates);
          }
        };
        if (candidates.length) img.src = candidates[0];
        else img.src = id;
        this.shipSprite = img;
      }
      // SD 버전 이미지 자동 로드: assets/character/{id}_SD.png 등의 후보를 시도
      if (this.characterId && typeof this.characterId === 'string'){
        const id = this.characterId;
        const sdCandidates = [];
        if (id.startsWith('assets/') || id.match(/\.[a-zA-Z0-9]{2,4}$/)){
          // if full path with extension, try inserting _SD before extension
          const m = id.match(/(.+)(\.[a-zA-Z0-9]{2,4})$/);
          if (m) sdCandidates.push(`${m[1]}_SD${m[2]}`);
          sdCandidates.push(id + '_SD.png');
        } else {
          const cap = id.charAt(0).toUpperCase() + id.slice(1);
          const lower = id.toLowerCase();
          sdCandidates.push(`assets/character/${id}_SD.png`);
          sdCandidates.push(`assets/character/${cap}_SD.png`);
          sdCandidates.push(`assets/character/${lower}_SD.png`);
          sdCandidates.push(`assets/character/${id}_SD.jpg`);
        }
        const sdimg = new Image();
        sdimg._broken = false;
        sdimg._candidates = sdCandidates;
        sdimg._ci = 0;
        sdimg.onload = () => { sdimg._broken = false; };
        sdimg.onerror = function(){
          const self = this;
          self._ci = (self._ci || 0) + 1;
          if (self._candidates && self._ci < self._candidates.length){
            self.src = self._candidates[self._ci];
          } else {
            self._broken = true;
          }
        };
        if (sdCandidates.length) sdimg.src = sdCandidates[0];
        else sdimg.src = `assets/character/${id}_SD.png`;
        this.sdSprite = sdimg;
      }
      // projectile 필드 처리: 문자열 또는 객체 지원
      if (custom.projectile){
        if (typeof custom.projectile === 'string'){
          this.projectile.img = custom.projectile;
        }else if (custom.projectile.img){
          this.projectile.img = custom.projectile.img;
        }
        // optional: damage/speed가 제공되면 덮어쓰기
        if (custom.projectile.damage) this.projectile.damage = custom.projectile.damage;
        if (custom.projectile.speed) this.projectile.speed = custom.projectile.speed;
      }
    }

    /**
     * 매 프레임 호출되는 업데이트
     * - 입력 상태는 this.game.keys에서 읽음 (Game.init에서 등록한 전역 키 맵)
     */
    update(dt){
      const keys = this.game.keys || {};
      let dx = 0, dy = 0;
      if (keys.ArrowLeft || keys['a']) dx -= 1;
      if (keys.ArrowRight || keys['d']) dx += 1;
      if (keys.ArrowUp || keys['w']) dy -= 1;
      if (keys.ArrowDown || keys['s']) dy += 1;
      // movement speed modifiers:
      // default multiplier = 0.8 when no modifier keys are held
      // Ctrl (Control key) -> slow movement (0.3)
      // Shift -> fast movement (1.5)
      // If both pressed, prioritize Shift (fast)
      let speedMultiplier = 0.8;
      if (keys.Shift) speedMultiplier = 1.5;
      else if (keys.Control) speedMultiplier = 0.3;
      const effectiveSpeed = (this.speed || 240) * speedMultiplier;
      const len = Math.hypot(dx,dy) || 1;
      this.x += (dx/len) * effectiveSpeed * dt;
      this.y += (dy/len) * effectiveSpeed * dt;
      // 화면 경계 안으로 클램프
      // 오른쪽 HUD 패널(캔버스 폭의 약 25%)으로 플레이어가 진입하지 못하도록 제한
      const panelW = Math.floor((this.game && this.game.width ? this.game.width : 0) * 0.25);
      const gameAreaW = Math.max(100, (this.game && this.game.width ? this.game.width : 0) - panelW);
      const halfW = (this.w || 0) / 2;
      const halfH = (this.h || 0) / 2;
      const minX = halfW;
      const maxX = Math.max(minX, gameAreaW - halfW);
      const minY = halfH;
      const maxY = Math.max(minY, (this.game && this.game.height ? this.game.height : 0) - halfH);
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));

      // 발사 처리: 입력과 상관없이 자동 발사하도록 변경
      this.cooldown -= dt;
      if (this.cooldown <= 0){
        this.shoot();
        this.cooldown = this.fireRate;
      }

      // invulnerability timing and blink handling
      if (this.invulTimer > 0){
        this.invulTimer -= dt;
        this.invulBlinkTimer += dt;
        if (this.invulTimer <= 0){
          this.invulTimer = 0;
          this.invulnerable = false;
          this.invulBlinkTimer = 0;
        } else {
          this.invulnerable = true;
        }
      }
    }

    /**
     * 발사: Player 소유의 탄환 객체를 생성하여 Game에 등록
     * - 탄환은 간단한 update(dt)와 draw(ctx)를 포함한 형태로 만들어짐
     */
    shoot(){
      const proj = {
        x: this.x,
        y: this.y - 20,
        r: 4,
        vy: this.projectile.speed || -400,
        owner: 'player',
        damage: this.projectile.damage || 1,
        update(dt){ this.y += this.vy * dt; if (this.y < -40) this.dead = true; },
        draw(ctx){ ctx.fillStyle='yellow'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r || 4, 0, Math.PI*2); ctx.fill(); }
      };
      this.game.spawnPlayerBullet(proj);
    }

    /**
     * 그리기 루틴
     * - shipSprite 우선, 다음으로 character sprite, 없으면 기본 도형을 그림
     * - 이미지 로딩이 완료(complete)되었는지 확인하고 그리기
     */
    draw(ctx){
      // invulnerability blinking: determine visibility
      let visible = true;
      if (this.invulnerable && this.invulBlinkPeriod > 0){
        const period = this.invulBlinkPeriod || 0.12;
        const t = Math.floor((this.invulBlinkTimer || 0) / period);
        visible = (t % 2) === 0; // toggle visibility each period
      }

      // 이미지가 완전히 로드되었고 깨지지 않았는지 확인한 뒤 그립니다.
      // Track whether we successfully drew a player image this frame
      let drewImage = false;

      // if invisible due to blinking, skip drawing the player (still considered invulnerable)
      if (!visible) return;
      try {
        if (this.shipSprite && this.shipSprite.complete && !this.shipSprite._broken && this.shipSprite.naturalWidth > 0){
          ctx.drawImage(this.shipSprite, this.x-32, this.y-24, 64, 48);
          drewImage = true;
        }
        // note: character sprite drawing removed; only shipSprite is drawn for in-game player
      } catch (err) {
        // drawImage에서 예외가 발생하면 대체 렌더로 폴백
        console.warn('drawImage error, falling back to placeholder:', err);
      }

      // 이미지가 없거나 깨졌을 때 기본 도형으로 대체
      if (!drewImage){
        ctx.fillStyle = 'cyan';
        ctx.fillRect(this.x-12, this.y-12, 24, 24);
      }

      // Draw hitbox glow when Z key is held. Allow overlap with other keys.
      try{
        const keys = (this.game && this.game.keys) ? this.game.keys : {};
        if (keys['z'] || keys['Z']){
          ctx.save();
          ctx.beginPath();
          ctx.fillStyle = 'rgba(0,255,255,0.95)';
          ctx.shadowColor = 'rgba(0,200,255,0.9)';
          ctx.shadowBlur = 10;
          ctx.arc(this.x, this.y, this.r || 3, 0, Math.PI*2);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'white';
          ctx.stroke();
          ctx.restore();
        }
      }catch(e){ /* ignore drawing errors for overlay */ }
    }
  }

  // 전역에 Player 클래스 노출
  window.Player = Player;

})();
