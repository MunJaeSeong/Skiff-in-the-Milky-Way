 (function () {
  'use strict';

  // Noel용 아틀라스 기반 플레이어 애니메이터 (스테이지 5)
  const NoelPlayer = {
    // `move/` 폴더의 아틀라스 PNG를 우선 사용하고 가로/세로 그리드로 프레임을 자릅니다
    // 이미지 기본 경로는 페이지 위치에 따라 달라지므로 전역 `window.ASSET_BASE`가 설정되어 있으면 그것을 사용합니다.
    // 기존 기본값은 이전과 동일하게 '../../../assets'로 유지합니다.
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

    // 아틀라스별 예상 프레임 수와 그리드 레이아웃
    // 앞/뒤(front/back): 4열 x 8행 = 32프레임
    // 좌/우(left/right): 4열 x 10행 = 40프레임
    frameCount: { idle: 1, back: 32, front: 32, left: 40, right: 40 },
    frameGrid: {
      idle: { cols: 1, rows: 1 },
      back: { cols: 4, rows: 8 },
      front: { cols: 4, rows: 8 },
      left: { cols: 4, rows: 10 },
      right: { cols: 4, rows: 10 }
    },
    frameDuration: 60, // 프레임당 지속시간(밀리초)

    images: {},
    meta: {},
    loaded: false,

    // 런타임 상태
    x: 0,
    y: 0,
    scale: 1,
    // 외부에서 설정된 scale 값에 곱해지는 내부 배수입니다.
    // 게임 전반에서 같은 스케일을 유지하려면 이 값을 조정하세요. (0.6 -> 60%)
    scaleMultiplier: 0.15,
    direction: 'idle', // 'idle' | 'back' | 'front' | 'left' | 'right'
    frameIndex: 0,
    frameTimer: 0,
    // 전투/상태 관련 속성
    attack: 10, // 공격력
    defending: false, // 방어 여부 (boolean)
    hpMax: 1000, // 최대 체력
    hp: 1000, // 현재 체력
    speed: 5, // 이동 속도
    hpRegen: 10, // 체력 회복력 (단위: 초당 값 등 필요시 외부에서 해석)

    // HP 조작 헬퍼: amount는 양수(회복) 또는 음수(대미지)
    heal(amount) {
      if (typeof amount !== 'number' || amount === 0) return;
      this.hp = Math.min(this.hpMax, this.hp + amount);
    },
    takeDamage(amount) {
      if (typeof amount !== 'number' || amount === 0) return;
      // amount는 양수 값으로 기대
      const dmg = Math.abs(amount);
      this.hp = Math.max(0, this.hp - dmg);
    },
    // 범용: 음수면 데미지, 양수면 회복
    applyHpDelta(delta) {
      if (typeof delta !== 'number' || delta === 0) return;
      if (delta > 0) this.heal(delta);
      else this.takeDamage(Math.abs(delta));
    },

    init() {
      const keys = ['idle', 'back', 'front', 'left', 'right'];
      let remaining = keys.length;
      keys.forEach((k) => {
        const img = new Image();
        img.src = this.imgPaths[k];
        img.onload = () => {
          this.images[k] = img;
          // 그리드 정보가 있으면 그 정보를 사용하여 프레임 너비/높이를 계산합니다
          const count = this.frameCount[k === 'idle' ? 'idle' : k] || 1;
          const grid = (this.frameGrid && this.frameGrid[k]) ? this.frameGrid[k] : null;
          let cols = 1, rows = 1;
          if (grid) {
            // 제공된 그리드 정보 사용
            cols = Math.max(1, grid.cols | 0);
            rows = Math.max(1, grid.rows | 0);
          } else if (count > 1) {
            // 그리드 정보가 없으면 기본으로 4열을 사용하고 행 수를 계산합니다
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
            this.loaded = true;
          }
        };
        img.onerror = () => {
          // 이미지가 하나라도 로드되지 않아도 계속 진행합니다. 모든 로드 시도가 끝나면 loaded를 true로 설정합니다
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
      // 외부에서 크기를 지정할 때 내부 multiplier를 적용하여 항상 작게 보이도록 합니다.
      if (typeof s !== 'number') return;
      const m = (typeof this.scaleMultiplier === 'number') ? this.scaleMultiplier : 1;
      // 최소 크기 제한을 둡니다.
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

    draw(ctx) {
      if (!ctx) return;
      if (!this.loaded) {
        // 이미지가 로드되기 전 간단한 플레이스홀더를 그립니다
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

      // 원본(소스) 사각형과 출력(목적지) 크기를 결정합니다
      let srcX = 0;
      let srcY = 0;
      let srcW = m.frameW;
      let srcH = m.frameH;
      let destW = Math.floor(srcW * this.scale);
      let destH = Math.floor(srcH * this.scale);

      if (key === 'idle') {
        // idle은 정적 이미지입니다. 전체 이미지를 그리고 아틀라스 프레임 크기에 맞게 확대합니다
        // (참조로 right/front/back/left 중 하나의 프레임 크기를 사용)
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
        // 아틀라스를 열×행 그리드로 보고 소스 x/y를 계산합니다
        const col = this.frameIndex % m.cols;
        const row = Math.floor(this.frameIndex / m.cols);
        srcX = col * m.frameW;
        srcY = row * m.frameH;
        srcW = m.frameW;
        srcH = m.frameH;
        destW = Math.floor(srcW * this.scale);
        destH = Math.floor(srcH * this.scale);
      }

      // (x, y)를 중앙으로 하여 출력 위치를 계산하고 이미지를 그립니다
      const dx = Math.floor(this.x - destW / 2);
      const dy = Math.floor(this.y - destH / 2);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, destW, destH);
    }
  };

  window.NoelPlayer = NoelPlayer;
})();
