 (function () {
  'use strict';

  // NoelPlayer: 노엘 캐릭터를 그리기 위한 객체입니다.
  // - 아틀라스 이미지(프레임이 여러 개인 이미지)를 불러와서 프레임 단위로 그립니다.
  // - 간단한 상태(위치, 스케일, 방향, 체력 등)를 가지고 있습니다.
  const NoelPlayer = {
    // 이미지 경로: window.ASSET_BASE가 있으면 그걸 기준으로, 아니면 상대경로 사용
    imgPaths: (function(){
      const base = (typeof window !== 'undefined' && window.ASSET_BASE) ? window.ASSET_BASE : '../../../assets';
      return {
        idle: base + '/character/Noel/Noel_SD.png',
        back: base + '/character/Noel/move/Noel_SD_walking_back_atlas.png',
        front: base + '/character/Noel/move/Noel_SD_walking_front_atlas.png',
        left: base + '/character/Noel/move/Noel_SD_walking_left_atlas.png',
        right: base + '/character/Noel/move/Noel_SD_walking_right_atlas.png'
      };
    })(),

    // 각 상태 별 예상 프레임 수와 그리드(열/행)
    frameCount: { idle: 1, back: 32, front: 32, left: 40, right: 40 },
    frameGrid: {
      idle: { cols: 1, rows: 1 },
      back: { cols: 4, rows: 8 },
      front: { cols: 4, rows: 8 },
      left: { cols: 4, rows: 10 },
      right: { cols: 4, rows: 10 }
    },
    frameDuration: 60, // 각 프레임이 보이는 시간(밀리초)

    images: {}, // 로드한 이미지 객체들 저장
    meta: {},   // 각 이미지의 프레임 너비/높이 등 메타 데이터
    loaded: false,

    // 런타임 상태들
    x: 0,
    y: 0,
    scale: 1,
    scaleMultiplier: 0.15, // 외부에서 주는 스케일에 곱해지는 내부 보정값
    direction: 'idle', // 'idle' | 'back' | 'front' | 'left' | 'right'
    frameIndex: 0,
    frameTimer: 0,
    attack: 10,
    defending: false,
    hpMax: 1000,
    hp: 1000,
    speed: 5,
    hpRegen: 10,

    // 체력 늘리기(회복)
    heal(amount) {
      if (typeof amount !== 'number' || amount === 0) return;
      this.hp = Math.min(this.hpMax, this.hp + amount);
    },
    // 데미지 받기
    takeDamage(amount) {
      if (typeof amount !== 'number' || amount === 0) return;
      const dmg = Math.abs(amount);
      this.hp = Math.max(0, this.hp - dmg);
    },
    // 양수면 회복, 음수면 데미지
    applyHpDelta(delta) {
      if (typeof delta !== 'number' || delta === 0) return;
      if (delta > 0) this.heal(delta);
      else this.takeDamage(Math.abs(delta));
    },

    // init(): 이미지들을 불러와 메타 정보를 계산합니다.
    init() {
      const keys = ['idle', 'back', 'front', 'left', 'right'];
      let remaining = keys.length;
      keys.forEach((k) => {
        const img = new Image();
        img.src = this.imgPaths[k];
        img.onload = () => {
          this.images[k] = img;
          // 프레임 그리드 정보 얻기
          const count = this.frameCount[k === 'idle' ? 'idle' : k] || 1;
          const grid = (this.frameGrid && this.frameGrid[k]) ? this.frameGrid[k] : null;
          let cols = 1, rows = 1;
          if (grid) {
            cols = Math.max(1, grid.cols | 0);
            rows = Math.max(1, grid.rows | 0);
          } else if (count > 1) {
            cols = 4;
            rows = Math.max(1, Math.ceil(count / cols));
          }
          this.meta[k] = {
            frameCount: count,
            cols: cols,
            rows: rows,
            frameW: Math.floor(img.width / cols),
            frameH: Math.floor(img.height / rows)
          };
          remaining -= 1;
          if (remaining === 0) {
            this.loaded = true; // 모든 이미지 로드 완료
          }
        };
        img.onerror = () => {
          // 이미지 로드 실패 시 경고만 남기고 계속 진행
          console.warn('NoelPlayer: failed to load', this.imgPaths[k]);
          remaining -= 1;
          if (remaining === 0) this.loaded = true;
        };
      });
    },

    setPosition(x, y) {
      this.x = x;
      this.y = y;
    },

    setScale(s) {
      if (typeof s !== 'number') return;
      const m = (typeof this.scaleMultiplier === 'number') ? this.scaleMultiplier : 1;
      this.scale = Math.max(0.02, s * m);
    },

    setDirection(dir) {
      if (!dir) dir = 'idle';
      if (this.direction !== dir) {
        this.direction = dir;
        this.frameIndex = 0;
        this.frameTimer = 0;
      }
    },

    // update(dt): 애니메이션 프레임 타이머를 갱신합니다.
    update(dt) {
      if (!this.loaded) return;
      const key = (this.direction === 'idle') ? 'idle' : this.direction;
      const m = this.meta[key];
      if (!m) return;
      if (m.frameCount <= 1) return;
      this.frameTimer += dt;
      while (this.frameTimer >= this.frameDuration) {
        this.frameTimer -= this.frameDuration;
        this.frameIndex = (this.frameIndex + 1) % m.frameCount;
      }
    },

    // draw(ctx): 현재 프레임을 캔버스에 그립니다.
    draw(ctx) {
      if (!ctx) return;
      if (!this.loaded) {
        // 이미지가 준비되지 않았으면 흰 네모로 자리 표시
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 16, this.y - 16, 32, 32);
        ctx.restore();
        return;
      }

      const key = (this.direction === 'idle') ? 'idle' : this.direction;
      const img = this.images[key];
      const m = this.meta[key];
      if (!img || !m) return;

      // 원본에서 잘라낼 위치(srcX, srcY)와 화면에 그릴 크기(destW, destH) 계산
      let srcX = 0;
      let srcY = 0;
      let srcW = m.frameW;
      let srcH = m.frameH;
      let destW = Math.floor(srcW * this.scale);
      let destH = Math.floor(srcH * this.scale);

      if (key === 'idle') {
        // idle은 정적 이미지 전체를 사용
        srcW = img.width;
        srcH = img.height;
        srcX = 0;
        srcY = 0;
        const refMeta = this.meta['right'] || this.meta['front'] || this.meta['back'] || this.meta['left'];
        if (refMeta) {
          destW = Math.floor(refMeta.frameW * this.scale);
          destH = Math.floor(refMeta.frameH * this.scale);
        } else {
          destW = Math.floor(srcW * this.scale);
          destH = Math.floor(srcH * this.scale);
        }
      } else {
        // 아틀라스에서 현재 프레임의 열/행을 계산해서 src 위치를 정함
        const col = this.frameIndex % m.cols;
        const row = Math.floor(this.frameIndex / m.cols);
        srcX = col * m.frameW;
        srcY = row * m.frameH;
        srcW = m.frameW;
        srcH = m.frameH;
        destW = Math.floor(srcW * this.scale);
        destH = Math.floor(srcH * this.scale);
      }

      // (x, y)를 중심으로 그리기
      const dx = Math.floor(this.x - destW / 2);
      const dy = Math.floor(this.y - destH / 2);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, destW, destH);
    }
  };

  window.NoelPlayer = NoelPlayer;
})();
