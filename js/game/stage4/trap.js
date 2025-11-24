// Stage4 트랩(함정) 모듈: thorn, spikePlatform, slideTrap
// Stage4 트랩(함정) 모듈
// 여러 종류의 함정(thorn, spikePlatform, slideTrap)을 관리하고,
// 초기화, 갱신(이동/상태변화), 그리기, 충돌 판정을 담당합니다.
(function () {
  'use strict';

  // ===== 상수: 가시(Thorn) 모양의 고정 크기 =====
  // 가시는 항상 이 크기로 그려집니다. 게임 디자이너가 크기를 바꾸지 않으면
  // 이 값을 사용해서 통일된 모양을 유지합니다.
  const THORN_WIDTH = 5;
  const THORN_HEIGHT = 10;

  // Stage4Traps 객체는 트랩 목록과 관련 기능을 가집니다.
  // - traps: 게임에 배치된 모든 함정 정보를 담는 배열
  const Stage4Traps = {
    traps: [],

    // init: 트랩 데이터(trapData)를 받아 내부적인 형태로 변환해 저장합니다.
    // trapData는 레벨 데이터를 읽어서 넣어주는 배열입니다.
    // worldWidth/worldHeight는 %로 위치가 주어졌을 때 실제 픽셀 좌표로 바꾸기 위해 사용합니다.
    init(trapData, worldWidth, worldHeight) {
      this.traps = [];
      if (!Array.isArray(trapData)) return this.traps; // 안전 장치

      // 각 트랩 데이터(t)를 'base'라는 내부 구조로 바꿔서 저장합니다.
      // base에는 공통 속성(위치, 크기, 데미지 등)과 각 트랩에 특화된 속성이 섞여 있습니다.
      trapData.forEach(t => {
        const base = {
          // type: 'thorn', 'spikePlatform', 'slideTrap' 등
          type: t.type || 'thorn',
          // x,y: 직접 값이 있으면 그 값을, 퍼센트로 주어졌으면 실제 좌표로 계산
          x: typeof t.x === 'number' ? t.x : (typeof t.xPercent === 'number' ? Math.round(t.xPercent * worldWidth) : 0),
          y: typeof t.y === 'number' ? t.y : (typeof t.yPercent === 'number' ? Math.round(t.yPercent * worldHeight) : 0),
          // 기본 폭/높이. slideTrap은 아래에서 다른 값을 덮어씁니다.
          width: t.width || 40,
          height: t.height || 20,

          // spikePlatform 관련: 깜빡이는 주기(period)와 켜져있는 비율(duty)
          // period: 한 사이클이 얼마나 오래(밀리초)인지
          // duty: 사이클 중 얼마나 긴 시간 동안 spike가 '나와 있는지' 비율(0~1)
          period: typeof t.period === 'number' ? t.period : 2000,
          duty: typeof t.duty === 'number' ? Math.max(0.05, Math.min(0.95, t.duty)) : 0.5,
          extended: false, // 현재 spike가 나와 있는지 여부
          timer: 0, // 내부용 타이머(현재는 사용되지 않지만 자리 확보)

          // 넉백(knockback) 관련 기본값
          knockback: typeof t.knockback === 'number' ? t.knockback : 8,
          knockbackY: typeof t.knockbackY === 'number' ? t.knockbackY : 6,
          cooldown: 0, // 같은 트랩에 빠르게 여러 번 맞지 않도록 짧은 무적(쿨다운) 프레임을 둠
          cooldownFrames: typeof t.cooldownFrames === 'number' ? t.cooldownFrames : 30,

          // slideTrap(미끄러지는 트랩) 관련: 이동 시작/끝 위치
          pos1: (t.pos1 && typeof t.pos1.x === 'number' && typeof t.pos1.y === 'number') ? { x: t.pos1.x, y: t.pos1.y } : null,
          pos2: (t.pos2 && typeof t.pos2.x === 'number' && typeof t.pos2.y === 'number') ? { x: t.pos2.x, y: t.pos2.y } : null,
          speed: typeof t.speed === 'number' ? t.speed : 2, // 초당(또는 프레임당) 이동 속도 (게임 루프 방식에 따라 다름)
          dir: 1, // 이동 방향(1 또는 -1)

          // followMonster 기능 제거됨: 플레이어 추적형 몬스터 관련 속성은 더 이상 사용하지 않습니다.
        };

        // slideTrap 추가 설정: pos1/pos2를 채우고, 크기를 정사각형으로 맞춤
        if (t.type === 'slideTrap') {
          if (!base.pos1 && typeof t.x1 === 'number' && typeof t.y1 === 'number') base.pos1 = { x: t.x1, y: t.y1 };
          if (!base.pos2 && typeof t.x2 === 'number' && typeof t.y2 === 'number') base.pos2 = { x: t.x2, y: t.y2 };
          if (!base.pos1 && typeof t.minX === 'number') base.pos1 = { x: t.minX, y: base.y };
          if (!base.pos2 && typeof t.maxX === 'number') base.pos2 = { x: t.maxX, y: base.y };
          if (!base.pos1) base.pos1 = { x: base.x, y: base.y };
          if (!base.pos2) base.pos2 = { x: base.x + 120, y: base.y };

          // slide 트랩은 보통 정사각형으로 동작하므로 size를 우선으로 사용
          const size = (typeof t.size === 'number') ? t.size : (typeof t.width === 'number' ? t.width : 40);
          base.width = size; base.height = size;
          base.x = base.pos1.x; base.y = base.pos1.y; // 초기 위치는 pos1
        }

        // followMonster 기능 제거됨: 초기화 단계에서 별도 설정하지 않습니다.

        // thorn(가시)는 항상 위에서 정한 고정 크기를 사용합니다.
        if (t.type === 'thorn') {
          base.width = THORN_WIDTH;
          base.height = THORN_HEIGHT;
        }

        this.traps.push(base);
      });
      return this.traps;
    },

    // update: 프레임마다 호출되어 트랩의 상태를 갱신합니다.
    // player를 받아서 일부 트랩(플레이어 추적형 등)은 플레이어 위치를 참고합니다.
    update(player) {
      for (let i = 0; i < this.traps.length; i++) {
        const t = this.traps[i];

        // spikePlatform: 주기(period)에 따라 spike가 나왔다 들어갑니다.
        if (t.type === 'spikePlatform') {
          // Date.now() % period -> 현재 사이클에서 지난 시간
          // 그 값을 period로 나누어 0~1 범위의 phase를 얻고, duty보다 작으면 '나와 있다'고 본다
          const phase = (Date.now() % t.period) / t.period;
          t.extended = phase < t.duty;
        }

        // slideTrap: pos1에서 pos2 사이를 왔다갔다 이동합니다.
        if (t.type === 'slideTrap') {
          const a = t.pos1, b = t.pos2;
          const dx = b.x - a.x, dy = b.y - a.y;
          // 두 점 사이 거리
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // 단위 벡터(이동 방향을 나타냄)
          const ux = dx / len, uy = dy / len;
          if (t._s == null) t._s = 0; // _s: pos1에서부터의 현재 거리
          // _s를 speed만큼 더하거나 빼면서 진행
          t._s += t.speed * t.dir;
          // 끝에 도달하면 방향을 반전
          if (t._s < 0) { t._s = 0; t.dir = 1; }
          if (t._s > len) { t._s = len; t.dir = -1; }
          // 실제 x,y 위치 계산
          t.x = Math.round(a.x + ux * t._s);
          t.y = Math.round(a.y + uy * t._s);
        }

        // followMonster 기능 제거됨: 더 이상 플레이어를 따라다니지 않습니다.

        // cooldown(쿨다운) 감소: 트랩이 연속으로 여러 번 작동하지 않도록 프레임 단위로 감소시킴
        if (typeof t.cooldown === 'number' && t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - 1);
      }
    },

    // draw: 캔버스 컨텍스트(ctx)에 트랩을 그립니다. offsetX/Y는 화면 스크롤을 보정하기 위해 사용합니다.
    draw(ctx, offsetX = 0, offsetY = 0) {
      if (!ctx) return;
      this.traps.forEach(t => {
        const sx = Math.round(t.x - offsetX);
        const sy = Math.round(t.y - offsetY);

        if (t.type === 'thorn') {
          // 가시: 삼각형 여러 개를 이어 붙여서 그립니다.
          ctx.fillStyle = '#c0392b';
          const step = Math.max(6, Math.round(t.width / 6));
          for (let px = 0; px < t.width; px += step) {
            ctx.beginPath();
            ctx.moveTo(sx + px, sy + t.height); // 왼쪽 아래
            ctx.lineTo(sx + px + step / 2, sy); // 꼭대기
            ctx.lineTo(sx + Math.min(px + step, t.width), sy + t.height); // 오른쪽 아래
            ctx.closePath(); ctx.fill();
          }

        } else if (t.type === 'spikePlatform') {
          // spikePlatform은 평판(사각형)으로 그린 뒤, spike가 나올 때는 위로 삼각형을 그림
          ctx.fillStyle = '#8b2f2f'; ctx.fillRect(sx, sy, t.width, t.height);
          if (t.extended) {
            ctx.fillStyle = '#c0392b';
            const sx2 = sx, sy2 = sy - Math.round(t.height);
            const step = Math.max(6, Math.round(t.width / 6));
            for (let px = 0; px < t.width; px += step) {
              ctx.beginPath();
              ctx.moveTo(sx2 + px, sy);
              ctx.lineTo(sx2 + px + step / 2, sy2);
              ctx.lineTo(sx2 + Math.min(px + step, t.width), sy);
              ctx.closePath(); ctx.fill();
            }
          }

        } else if (t.type === 'slideTrap') {
          // 이동하는 박스 모양 트랩
          ctx.fillStyle = '#c0392b'; ctx.fillRect(sx, sy, t.width, t.height);

        }
      });
    },

    // checkCollision: 플레이어와 트랩 간 충돌을 검사합니다.
    // 반환값: true면 치명적(게임오버 등), false면 넉백 처리(살아남음) 또는 충돌 없음.
    checkCollision(player) {
      if (!player) return false;

      // 플레이어가 무적 상태(잠깐의 무적, i-frames)이면 트랩 충돌을 무시
      if (typeof player.invulnerable === 'number' && player.invulnerable > 0) return false;

      // 플레이어의 충돌 박스(rect)를 얻습니다. getCollisionRect가 있으면 그걸 사용하고
      // 없으면 플레이어 크기에 맞춰 간단한 사각형을 만들어 사용합니다.
      let rect = null;
      if (typeof player.getCollisionRect === 'function') rect = player.getCollisionRect();
      if (!rect) {
        const w = Math.max(1, Math.round(player.width * 2 / 5));
        const h = Math.max(1, Math.round(player.height * 4 / 5));
        const x = player.x + Math.round((player.width - w) / 2);
        const y = player.y + Math.round((player.height - h) / 2);
        rect = { x, y, width: w, height: h };
      }

      // 트랩 목록을 순회하면서 충돌 검사
      for (let i = 0; i < this.traps.length; i++) {
        const t = this.traps[i];

        // spikePlatform는 실제로는 플랫폼 위에 spike가 올라와 있을 때만 유효합니다.
        if (t.type === 'spikePlatform') {
          if (!t.extended) continue; // spike가 들어가 있으면 충돌 없음

          // spikePlatform의 충돌 박스는 위쪽으로 확장된 삼각형 부분을 단순화하여
          // (x, y - height, width, height) 사각형으로 처리합니다.
          const sx = t.x, sy = t.y - t.height, sw = t.width, sh = t.height;
          if (rect.x + rect.width > sx && rect.x < sx + sw && rect.y + rect.height > sy && rect.y < sy + sh) {
            // 비치명적: 넉백만 주고 죽이지는 않는다.
            if (!t.cooldown) {
              // 플레이어 중심과 트랩 중심을 비교해서 반대쪽으로 날려 보냄
              const pcenter = (player.x + (player.width || 0) / 2);
              const tcenter = (t.x + (t.width || 0) / 2);
              const dir = (pcenter >= tcenter) ? 1 : -1;

              // 넉백 처리: 프레임 기반으로 일정 시간 동안 속도를 주고 무적을 부여
              const baseFrames = typeof t.knockbackDuration === 'number' ? t.knockbackDuration : 12;
              const kbFrames = baseFrames * 2; // 기본값에서 시간 연장(설계상)
              const invFrames = typeof t.invulnerableFrames === 'number' ? t.invulnerableFrames : Math.max(8, Math.floor(kbFrames / 2));
              const baseKB = typeof t.knockback === 'number' ? t.knockback : 8;
              const baseKBY = typeof t.knockbackY === 'number' ? t.knockbackY : 6;

              // 수평으로 조금 밀어내고, 수직으로 위로 튕겨 올리는 값
              const vx = dir * (baseKB * 1.5);
              const vy = -baseKBY;

              // player._knockback에 넉백 상태를 저장하면 플레이어 업데이트 루프에서 처리됩니다.
              player._knockback = { frames: kbFrames, vx: vx, vy: vy, damping: 0.85, invulnerable: invFrames };
              player.invulnerable = Math.max(player.invulnerable || 0, invFrames);

              // 트랩은 짧은 쿨타임을 가지고 다시 즉시 작동하지 않게 함
              t.cooldown = t.cooldownFrames || 30;
            }
            return false; // 넉백이므로 치명적이지 않음
          }
          continue; // spikePlatform의 충돌 검사를 끝냈으면 다음 트랩으로
        }

        // 일반 AABB(축 정렬 사각형) 충돌 검사: 간단한 직사각형 겹침 검사
        if (rect.x + rect.width > t.x && rect.x < t.x + t.width && rect.y + rect.height > t.y && rect.y < t.y + t.height) {
          // thorn(가시)와 slideTrap(미끄럼 트랩)은 맞아도 바로 죽지 않고 넉백만 적용
          if (t.type === 'thorn' || t.type === 'slideTrap') {
            if (!t.cooldown) {
              const pcenter = (player.x + (player.width || 0) / 2);
              const tcenter = (t.x + (t.width || 0) / 2);
              const dir = (pcenter >= tcenter) ? 1 : -1;
              const baseFrames = typeof t.knockbackDuration === 'number' ? t.knockbackDuration : 12;
              const kbFrames = baseFrames * 2; // 넉백 시간 연장
              const invFrames = typeof t.invulnerableFrames === 'number' ? t.invulnerableFrames : Math.max(8, Math.floor(kbFrames / 2));
              const baseKB = typeof t.knockback === 'number' ? t.knockback : 8;
              const baseKBY = typeof t.knockbackY === 'number' ? t.knockbackY : 6;
              const vx = dir * (baseKB * 1.5);
              const vy = -baseKBY;
              player._knockback = { frames: kbFrames, vx: vx, vy: vy, damping: 0.85, invulnerable: invFrames };
              player.invulnerable = Math.max(player.invulnerable || 0, invFrames);
              t.cooldown = t.cooldownFrames || 30;
            }
            return false; // 넉백만 주고 살아남음
          }

          // followMonster 기능이 제거되었으므로, 알려지지 않은(또는 치명적이던) 타입은
          // 기본적으로 비치명적으로 처리합니다(넉백만 적용하거나 무시).
          return false;
        }
      }
      return false; // 어떤 트랩과도 충돌하지 않음
    }
  };

  // 전역에 노출하여 다른 코드에서 사용하게 함
  window.Stage4Traps = Stage4Traps;
})();
