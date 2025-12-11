/*
  monster.js

  몬스터 시스템을 관리하는 파일입니다.
  - 몬스터 클래스 정의 (체력, 공격력, 스킬, 이미지)
  - 몬스터 생성 및 관리
  - 몬스터와의 전투
*/

(function(){
  'use strict';

  // Monster: 개별 몬스터를 나타내는 클래스
  class Monster {
    constructor(options) {
      options = options || {};
      
      // 기본 속성
      this.level = options.level || 1;
      this.type = options.type || 'normal'; // 'normal' 또는 'boss'
      this.name = options.name || 'Monster';
      
      // 전투 속성
      this.hp = options.hp || 100;
      this.hpMax = options.hpMax || this.hp;
      this.attack = options.attack || 10;
      this.defense = options.defense || 0;
      
      // 위치 및 표시
      this.x = options.x || 0;
      this.y = options.y || 0;
      this.scale = options.scale || 1;
      
      // 이미지 관련
      this.imagePath = options.imagePath || null;
      this.image = null;
      this.imageLoaded = false;
      
      // 상태
      this.isAlive = true;
      this.isActive = false; // 전투 중인지 여부
      
      // 애니메이션
      this.frame = 0;
      this.frameTime = 0;
      this.frameDuration = 150; // ms per frame
      
      // 스킬 함수 (옵션)
      this.skillFunction = options.skillFunction || null;
      this.skillCooldown = options.skillCooldown || 5000; // ms
      this.lastSkillTime = 0;
      
      // 이미지 로드
      if (this.imagePath) {
        this.loadImage(this.imagePath);
      }
    }

    // 이미지 로드 함수
    loadImage(path) {
      if (!path) return;
      const tryPath = String(path);
      const assetBase = (typeof window !== 'undefined' && window.ASSET_BASE) ? window.ASSET_BASE : '../../assets';
      // resolve assetBase to an absolute URL relative to the document to avoid ../ path issues
      let resolvedBase = assetBase;
      try { resolvedBase = (new URL(String(assetBase).replace(/\/$/, '') + '/', document.baseURI)).href.replace(/\/$/, ''); } catch(e) { resolvedBase = assetBase; }
      const defaultPath = resolvedBase + '/monster/default.png';

      const doLoad = (p, onFail) => {
        this.image = new Image();
        // do not set crossOrigin for local file setups to avoid failures
        this.image.onload = () => {
          this.imageLoaded = true;
          this.imagePath = p;
          // store debug info on window for easy inspection
          try{ window.__monsterDebug = window.__monsterDebug || {}; window.__monsterDebug.lastLoaded = { path: p, name: this.name, time: Date.now() }; }catch(e){}
          try { console.debug && console.debug('Monster image loaded:', p, 'for', this.name); } catch(e){}
          try{ window.dispatchEvent && window.dispatchEvent(new CustomEvent('monster:imageLoaded', { detail: { path: p, name: this.name } })); }catch(e){}
        };
        this.image.onerror = () => {
          this.imageLoaded = false;
          try{ window.__monsterDebug = window.__monsterDebug || {}; window.__monsterDebug.lastFailed = { path: p, name: this.name, time: Date.now() }; }catch(e){}
          try { console.warn('Failed to load monster image:', p, 'for', this.name); } catch(e){}
          try{ window.dispatchEvent && window.dispatchEvent(new CustomEvent('monster:imageFailed', { detail: { path: p, name: this.name } })); }catch(e){}
          if (typeof onFail === 'function') onFail();
        };
        this.image.src = p;
      };

      // First try the requested path, then fallback to default if it fails
      doLoad(tryPath, () => {
        if (tryPath !== defaultPath) {
          doLoad(defaultPath, () => {
            // give up after default fails
            try { console.warn('Monster default image also failed to load:', defaultPath); } catch(e){}
          });
        }
      });
    }

    // 데미지 받기
    takeDamage(damage) {
      if (!this.isAlive) return;
      
      const actualDamage = Math.max(0, damage - this.defense);
      this.hp = Math.max(0, this.hp - actualDamage);
      
      if (this.hp <= 0) {
        this.isAlive = false;
        this.onDeath();
      }
      
      return actualDamage;
    }

    // 사망 처리
    onDeath() {
      this.isAlive = false;
      this.isActive = false;
      
      // 사망 이벤트 발생
      try {
        window.dispatchEvent(new CustomEvent('monster:death', {
          detail: {
            monster: this,
            level: this.level,
            type: this.type,
            name: this.name
          }
        }));
      } catch (err) {
        console.warn('monster:death event error', err);
      }
    }

    // 스킬 사용
    useSkill(target) {
      if (!this.skillFunction) return null;
      if (!this.isAlive) return null;
      
      const now = performance.now();
      if (now - this.lastSkillTime < this.skillCooldown) {
        return null; // 쿨다운 중
      }
      
      this.lastSkillTime = now;
      return this.skillFunction(this, target);
    }

    // 업데이트 (애니메이션 등)
    update(dt) {
      if (!this.isAlive) return;
      
      // 프레임 애니메이션
      this.frameTime += dt;
      if (this.frameTime >= this.frameDuration) {
        this.frame = (this.frame + 1) % 4; // 4프레임 루프
        this.frameTime = 0;
      }
    }

    // 그리기
    draw(ctx) {
      if (!this.isAlive || !ctx) return;
      
      ctx.save();
      
      if (this.imageLoaded && this.image) {
        // 이미지가 로드되었으면 이미지 그리기
        const width = this.image.width * this.scale;
        const height = this.image.height * this.scale;
        ctx.drawImage(this.image, this.x - width/2, this.y - height/2, width, height);
      } else {
        // 이미지가 없으면 기본 도형으로 표시
        const size = 50 * this.scale;
        ctx.fillStyle = this.type === 'boss' ? '#8B0000' : '#FF4444';
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
      }
      
      // 체력바 그리기
      this.drawHealthBar(ctx);
      
      ctx.restore();
    }

    // 체력바 그리기
    drawHealthBar(ctx) {
      const barWidth = 80 * this.scale;
      const barHeight = 8 * this.scale;
      const x = this.x - barWidth / 2;
      const y = this.y - (60 * this.scale);
      
      const hpRatio = this.hp / this.hpMax;
      
      // 배경
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // HP
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
      
      // 테두리
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // 레벨 표시
      ctx.fillStyle = '#FFF';
      ctx.font = Math.floor(12 * this.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.type === 'boss' ? 'BOSS' : 'LV' + this.level, this.x, y - 5);
    }
  }

  // MonsterManager: 몬스터들을 관리하는 클래스
  class MonsterManager {
    constructor() {
      this.monsters = [];
      this.activeMonster = null;
      this.spawnedDistances = new Set(); // 이미 생성된 거리 기록
      this.imageCache = {}; // name -> Image object
      
      // 몬스터 스폰 설정 (각 몬스터에 대응하는 이미지 파일명을 `image`에 지정)
      this.spawnPoints = [
        { distance: 100, level: 1, type: 'normal', name: 'Slime', image: 'slime.png' },
        { distance: 200, level: 1, type: 'normal', name: 'Goblin', image: 'goblin.png' },
        { distance: 400, level: 2, type: 'normal', name: 'Orc', image: 'orc.png' },
        { distance: 500, level: 2, type: 'normal', name: 'Troll', image: 'troll.png' },
        { distance: 700, level: 3, type: 'normal', name: 'Griffin', image: 'griffin.png' },
        { distance: 800, level: 3, type: 'normal', name: 'Wyvern', image: 'wyvern.png' },
        { distance: 1000, level: 4, type: 'boss', name: 'Dragon', image: 'dragon.png' }
      ];

      // preload images for spawnPoints to avoid timing/path issues
      try {
        this.preloadImages();
      } catch (e) { /* ignore preload errors */ }
    }

    // preload images referenced by spawnPoints into imageCache
    preloadImages() {
      const assetBase = (typeof window !== 'undefined' && window.ASSET_BASE) ? window.ASSET_BASE : '../../assets';
      let resolvedBase = assetBase;
      try { resolvedBase = (new URL(String(assetBase).replace(/\/$/, '') + '/', document.baseURI)).href.replace(/\/$/, ''); } catch(e) { resolvedBase = assetBase; }
      for (const p of this.spawnPoints) {
        try {
          let imagePath = null;
          if (p.image) {
            imagePath = (p.image.indexOf('/') !== -1) ? p.image : (assetBase + '/monster/' + p.image);
          } else if (p.name) {
            const nameForFile = String(p.name || '').toLowerCase().replace(/\s+/g, '_');
            imagePath = assetBase + '/monster/' + nameForFile + '.png';
          }
          if (!imagePath) continue;
          const img = new Image();
          img.onload = (() => { try{ console.debug && console.debug('Preloaded monster image:', imagePath, 'for', p.name); }catch(e){} });
          img.onerror = (() => { try{ console.warn && console.warn('Preload failed for monster image:', imagePath, 'for', p.name); }catch(e){} });
          // if imagePath is relative, resolve against document base
          try { img.src = (new URL(imagePath, document.baseURI)).href; } catch(e) { img.src = imagePath; }
          this.imageCache[String(p.name).toLowerCase()] = img;
        } catch (e) { /* ignore per-image errors */ }
      }
    }

    // 거리에 따라 몬스터 생성 확인
    checkSpawn(currentDistance, canvas) {
      // 10, 30, 50, 70 패턴으로 LV0 몬스터 생성
      const lv0Pattern = this.getLv0SpawnDistance(currentDistance);
      if (lv0Pattern && !this.spawnedDistances.has(lv0Pattern)) {
        this.spawnMonster({ distance: lv0Pattern, level: 0, type: 'normal', name: 'Weak Slime' }, canvas);
        this.spawnedDistances.add(lv0Pattern);
      }
      
      // 기존 스폰 포인트 체크
      for (const point of this.spawnPoints) {
        if (currentDistance >= point.distance && !this.spawnedDistances.has(point.distance)) {
          this.spawnMonster(point, canvas);
          this.spawnedDistances.add(point.distance);
        }
      }
    }

    // LV0 몬스터 스폰 거리 계산 (10, 30, 50, 70, 110, 130, 150, 170, ...)
    getLv0SpawnDistance(currentDistance) {
      // 각 100 단위 구간 내에서 10, 30, 50, 70
      const segment = Math.floor(currentDistance / 100) * 100; // 0, 100, 200, 300, ...
      const offsets = [10, 30, 50, 70];
      
      for (const offset of offsets) {
        const spawnDist = segment + offset;
        if (currentDistance >= spawnDist && !this.spawnedDistances.has(spawnDist)) {
          return spawnDist;
        }
      }
      
      return null;
    }

    // 몬스터 생성
    spawnMonster(config, canvas) {
      const rect = canvas ? canvas.getBoundingClientRect() : { width: 800, height: 600 };
      
      // 레벨별 스탯 설정
      let hp, attack, defense, scale, skillCooldown;
      
      if (config.type === 'boss') {
        hp = 50000;
        attack = 100;
        defense = 70;
        scale = 2.5;
        skillCooldown = 3000;
      } else {
        switch (config.level) {
          case 0:
            hp = 100;
            attack = 1;
            defense = 0;
            scale = 0.8;
            skillCooldown = 10000;
            break;
          case 1:
            hp = 1000;
            attack = 30;
            defense = 10;
            scale = 1;
            skillCooldown = 8000;
            break;
          case 2:
            hp = 3000;
            attack = 50;
            defense = 30;
            scale = 1.3;
            skillCooldown = 6000;
            break;
          case 3:
            hp = 10000;
            attack = 50;
            defense = 50;
            scale = 1.8;
            skillCooldown = 4000;
            break;
          default:
            hp = 100;
            attack = 1;
            defense = 0;
            scale = 0.8;
            skillCooldown = 10000;
        }
      }
      
      // 몬스터 위치 (화면 중앙 우측)
      const x = rect.width * 0.7;
      const y = rect.height * 0.4;
      
      // 스킬 함수 정의
      const skillFunction = (monster, target) => {
        // 강력한 공격
        const damage = monster.attack * 1.5;
        return {
          type: 'attack',
          damage: damage,
          message: monster.name + ' 스킬 공격! (' + Math.floor(damage) + ' 데미지)'
        };
      };
      
      // determine image path: 우선 config.image (명시적 파일명)을 사용, 없으면 이름 기반 파일명 사용
      const assetBase = (typeof window !== 'undefined' && window.ASSET_BASE) ? window.ASSET_BASE : '../../assets';
      let resolvedBase = assetBase;
      try { resolvedBase = (new URL(String(assetBase).replace(/\/$/, '') + '/', document.baseURI)).href.replace(/\/$/, ''); } catch(e) { resolvedBase = assetBase; }
      let imagePath = null;
      if (config && config.image) {
        // if image provided, allow both literal paths and filenames
        if (config.image.indexOf('/') !== -1) {
          imagePath = config.image; // full or relative path
        } else {
          imagePath = resolvedBase + '/monster/' + String(config.image);
        }
      } else {
        const nameForFile = String(config.name || '').toLowerCase().replace(/\s+/g, '_');
        imagePath = resolvedBase + '/monster/' + nameForFile + '.png';
      }
      try { console.debug && console.debug('spawnMonster - imagePath for', config.name, '=>', imagePath); } catch (e){}

      const monster = new Monster({
        level: config.level,
        type: config.type,
        name: config.name,
        hp: hp,
        hpMax: hp,
        attack: attack,
        defense: defense,
        x: x,
        y: y,
        scale: scale,
        skillFunction: skillFunction,
        skillCooldown: skillCooldown,
        imagePath: imagePath
        // imagePath는 나중에 이미지 파일이 준비되면 추가
      });

      // if we preloaded an Image for this monster name, assign it directly
      try {
        const cacheKey = String(config.name || '').toLowerCase();
        const cached = this.imageCache && this.imageCache[cacheKey];
        if (cached && cached.complete && cached.naturalWidth > 0) {
          monster.image = cached;
          monster.imageLoaded = true;
          monster.imagePath = cached.src || imagePath;
          try{ console.debug && console.debug('Assigned cached image to monster:', monster.name, monster.imagePath); }catch(e){}
        }
      } catch (e) {}
      
      this.monsters.push(monster);
      this.activeMonster = monster;
      monster.isActive = true;
      
      // 몬스터 생성 이벤트
      try {
        window.dispatchEvent(new CustomEvent('monster:spawn', {
          detail: {
            monster: monster,
            level: config.level,
            type: config.type,
            name: config.name,
            distance: config.distance
          }
        }));
      } catch (err) {
        console.warn('monster:spawn event error', err);
      }
    }

    // 활성 몬스터에게 데미지 주기
    damageActiveMonster(damage) {
      if (!this.activeMonster || !this.activeMonster.isAlive) {
        return null;
      }
      
      const actualDamage = this.activeMonster.takeDamage(damage);
      return {
        monster: this.activeMonster,
        damage: actualDamage,
        remainingHp: this.activeMonster.hp,
        isDefeated: !this.activeMonster.isAlive
      };
    }

    // 활성 몬스터의 스킬 사용
    useActiveMonsterSkill(target) {
      if (!this.activeMonster || !this.activeMonster.isAlive) {
        return null;
      }
      
      return this.activeMonster.useSkill(target);
    }

    // 모든 몬스터 업데이트
    update(dt) {
      for (const monster of this.monsters) {
        if (monster.isAlive) {
          monster.update(dt);
        }
      }
    }

    // 모든 몬스터 그리기
    draw(ctx) {
      for (const monster of this.monsters) {
        if (monster.isAlive && monster.isActive) {
          monster.draw(ctx);
        }
      }
    }

    // 활성 몬스터 가져오기
    getActiveMonster() {
      return this.activeMonster;
    }

    // 리셋
    reset() {
      this.monsters = [];
      this.activeMonster = null;
      this.spawnedDistances.clear();
    }
  }

  // 전역에 노출
  window.Monster = Monster;
  window.MonsterManager = MonsterManager;

})();