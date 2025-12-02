/*
  moon.js

  이 파일은 무대(map) 스크립트로, 화면에 플레이어 캐릭터(NoelPlayer)를 초기화하고
  간단한 업데이트-드로우(업데이트와 그리기) 루프를 실행합니다.

  아래 영어 주석은 한국어로 번역하고, 각 부분에 중학생도 이해할 수 있게 추가 설명을 붙였습니다.
*/

(function(){
  'use strict';

  // init 함수: 페이지에서 필요한 캔버스와 매니저들을 찾아 초기 설정을 합니다.
  // - 게임 화면을 담당하는 `gameCanvas`
  // - 노트를 그리는 `notesCanvas` (있을 때만 사용)
  // - NoteManager가 있으면 생성해서 노트를 스폰/갱신하도록 준비합니다.
  function init(){
    const game = document.getElementById('gameCanvas');
    if(!game) return; // 게임 캔버스가 없으면 아무 것도 안 함
    const gctx = game.getContext('2d');
    const notesCanvas = document.getElementById('notesCanvas');
    const nctx = notesCanvas ? notesCanvas.getContext('2d') : null;
    // 히트 라인 X 좌표(CSS 픽셀). 값을 올려주면 판정선을 오른쪽으로 이동합니다.
    const HIT_X = 120; // 이전에는 40이었음
    let noteManager = null;
    // judgments는 화면에 보여줄 판정(퍼펙트/굿/미스) 표시 정보들을 저장하는 배열입니다.
    const judgments = [];
    // scoreManager: 점수와 콤보를 관리하는 간단한 객체. renderer의 drawHUD에서 사용합니다.
    const scoreManager = { score: 0, combo: 0 };

    // NoteManager가 전역에 정의되어 있고 notesCanvas가 있으면 NoteManager 인스턴스를 만듭니다.
    // 옵션으로 노트 생성 간격(spawnInterval), 노트 속도(noteSpeed), 노트 크기(noteSize)를 전달합니다.
    if (window.NoteManager && notesCanvas) {
      noteManager = new window.NoteManager(notesCanvas, { spawnInterval: 1000, noteSpeed: 240, noteSize: 24 });
    }

    // Renderer 인스턴스: notesCanvas용과 gameCanvas용을 만듭니다.
    // notesRenderer는 노트와 히트 라인을 그리는 데 사용하고,
    // gameRenderer는 HUD(점수/콤보)만 그리기 위해 사용합니다.
    const notesRenderer = (window.StageRenderer && notesCanvas) ? new window.StageRenderer(notesCanvas) : null;
    const gameRenderer = (window.StageRenderer && game) ? new window.StageRenderer(game) : null;

    // 플레이어 모듈(NoelPlayer)이 있으면 초기화 함수를 호출합니다.
    // 다른 파일(game/stage5/js/player.js)에 플레이어 코드가 있을 것으로 기대합니다.
    if(window.NoelPlayer && typeof window.NoelPlayer.init === 'function'){
      window.NoelPlayer.init();
    }

    // 플레이어의 화면(캔버스) 안에서의 위치를 CSS 픽셀 단위로 계산해서 설정합니다.
    // getBoundingClientRect()를 사용하면 캔버스가 실제로 화면에 차지하는 크기(CSS 픽셀)를 얻을 수 있습니다.
    // 여기서는 화면 너비의 1/4 위치, 세로 중앙(50%)에 플레이어를 놓습니다.
    function updatePlayerPosition(){
      const rect = game.getBoundingClientRect();
      const x = rect.width * 0.25; // 왼쪽에서 1/4 지점
      const y = rect.height * 0.5; // 세로 중앙
      if(window.NoelPlayer){
        window.NoelPlayer.setPosition(x, y);
        // 캔버스 크기에 따라 적당한 스케일을 정합니다. 화면이 작아지면 캐릭터도 작아집니다.
        const base = Math.max(0.5, rect.width / 1500);
        window.NoelPlayer.setScale(base);
      }
    }

    // 키 입력 상태를 추적하기 위한 객체입니다.
    // LEFT/RIGHT/UP/DOWN 각각이 눌려 있는지(true) 아닌지(false)를 저장합니다.
    const keyState = { LEFT: false, RIGHT: false, UP: false, DOWN: false };
    let input = null;

    // InputHandler가 있으면 인스턴스화해서 사용합니다.
    // InputHandler는 keydown을 감지해서 콜백을 호출합니다. keyup은 여기에서 별도 처리합니다.
    if (window.InputHandler) {
      input = new window.InputHandler();
      // 키가 눌리면 onPress에 등록한 콜백이 호출됩니다.
      input.onPress(evt => {
        const k = evt && evt.key;
        if (!k) return;
        // 화살표 키는 계속 누르고 있으면 이동 상태로 만듭니다.
        if (k === 'LEFT' || k === 'RIGHT' || k === 'UP' || k === 'DOWN') {
          keyState[k] = true;
        } else if (k === 'SPACE') {
          // 스페이스는 '히트' 키로 사용합니다. 가장 가까운(시간상으로) 노트를 찾아 판정합니다.
          if (noteManager && noteManager.notes && noteManager.notes.length) {
            const notes = noteManager.notes;
            const rect = notesCanvas.getBoundingClientRect();
            // 히트 라인 위치는 상수로 지정
            const hitX = HIT_X;

            // 노트마다 히트까지 남은 시간(밀리초)을 계산해서 가장 가깝게 맞출 수 있는 노트를 찾습니다.
            // timeToHitMs는 (노트 x 위치 - 히트 위치) / 속도 로 계산합니다. 양수면 아직 미래에 도착할 노트, 음수면 이미 지난 노트입니다.
            let best = null;
            let bestAbsMs = Infinity;
            const now = performance.now();
            for (const n of notes) {
              if (n.hit) continue; // 이미 맞춘 노트는 건너뜀
              const timeToHitMs = ((n.x - hitX) / n.speed) * 1000; // positive = future, negative = past
              const absMs = Math.abs(timeToHitMs);
              if (absMs < bestAbsMs) {
                bestAbsMs = absMs;
                best = { note: n, dt: timeToHitMs };
              }
            }

            // 가장 가까운 노트가 있으면 judgeHit(판정 함수)를 호출해서 결과를 얻고 화면에 표시합니다.
            if (best && window.judgeHit) {
              const res = window.judgeHit(best.dt);
              // 판정에 따른 색상 맵
              const colorMap = { perfect: '#4CAF50', good: '#FFC107', miss: '#9E9E9E' };
              const color = colorMap[res.name] || '#fff';
              // 판정 표시를 judgments 배열에 추가합니다. ttl은 표시 지속 시간(ms).
              judgments.push({ label: res.name, x: hitX + 30, y: rect.height/2, t: now, ttl: 700, color: color });
              // 점수/콤보 업데이트
              scoreManager.score += (res.score || 0);
              if (res.name === 'miss') scoreManager.combo = 0;
              else scoreManager.combo = (scoreManager.combo || 0) + 1;
              // miss가 아니면(즉 판정이 성공이면) 노트에 hit 플래그를 달아서 제거/무시하도록 합니다.
              if (res.name !== 'miss') {
                best.note.hit = true;
              }
            }
          }
        } else if (k === 'Z' || k === 'X') {
          // Z/X키는 현재는 동작 자리만 남겨둔 상태입니다(플레이어 액션용).
          console.log('action', k);
        }
      });

      // InputHandler는 keyup을 제공하지 않으므로, 브라우저의 keyup 이벤트를 직접 받아서 상태를 정리합니다.
      window.addEventListener('keyup', (e)=>{
        const code = e.code || '';
        const normalized = (code === 'Space' || code === 'Spacebar') ? 'Space' : code;
        const map = {
          ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', Space: 'SPACE', KeyZ: 'Z', KeyX: 'X'
        };
        const token = map[normalized];
        if (token && (token in keyState)) keyState[token] = false;
      }, { passive: true });
    }

    // 창 크기(리사이즈)나 로드 시 플레이어 위치를 동기화합니다.
    window.addEventListener('resize', updatePlayerPosition);
    window.addEventListener('load', updatePlayerPosition);

    // 초기 한 번 실행해서 기본 위치를 설정합니다.
    updatePlayerPosition();

    // 간단한 애니메이션 루프(프레임 루프)
    // frame 함수가 매 프레임 호출되어 게임 상태 업데이트와 그리기를 수행합니다.
    let last = performance.now();
    function frame(now){
      // 프레임 간 시간이 너무 커지면(백그라운드 후 복귀 등) 안정성을 위해 최대 100ms로 클램프합니다.
      const dt = Math.min(100, now - last);
      last = now;

      // 게임 캔버스 지우기 (배경 색은 CSS에서 검정으로 설정해 둘 수 있음)
      if(gctx){
        gctx.clearRect(0, 0, game.width, game.height);
      }

      // NoteManager가 있으면 노트 갱신 및 그리기를 수행합니다.
      if (noteManager && nctx) {
        noteManager.update(dt);
        // notesRenderer가 있으면 그것으로 그리기(클리어 포함), 없으면 NoteManager가 자체적으로 그림
        if (notesRenderer) {
          notesRenderer.clear();
          notesRenderer.drawSpatialNotes(noteManager.notes);
        } else {
          noteManager.draw(nctx);
        }
      }

      // 히트 라인과 판정(judgment) 오버레이를 notesCanvas에 그림
      if (nctx) {
        const rect = notesCanvas.getBoundingClientRect();
        const hitX = HIT_X;
        if (notesRenderer) notesRenderer.drawVerticalHitLine(hitX);


        // judgments 배열을 순회하면서 화면에 판정 이펙트를 그리고, 오래된 항목은 제거합니다.
        const nowTs = performance.now();
        for (let i = judgments.length - 1; i >= 0; i--) {
          const j = judgments[i];
          const age = nowTs - j.t;
          if (age > j.ttl) { judgments.splice(i,1); continue; }
          const ratio = age / j.ttl;
          const alpha = 1 - ratio;
          // 히트 라인에서 퍼져나가는 원(effect)
          const cx = hitX;
          const cy = rect.height / 2;
          const startR = 6;
          const endR = Math.max(24, rect.height * 0.15);
          const r = startR + (endR - startR) * ratio;

          nctx.save();
          nctx.globalAlpha = 0.25 * alpha;
          nctx.fillStyle = j.color || '#fff';
          nctx.beginPath();
          nctx.arc(cx, cy, r, 0, Math.PI * 2);
          nctx.fill();
          nctx.restore();

          // 판정 텍스트 (색상이 있고, 천천히 위로 이동하면서 페이드아웃)
          nctx.save();
          nctx.globalAlpha = Math.min(1, 1.2 * alpha);
          nctx.fillStyle = j.color || '#fff';
          nctx.font = '20px sans-serif';
          nctx.textAlign = 'left';
          const ty = j.y - (ratio * 30);
          nctx.fillText(j.label.toUpperCase(), j.x, ty);
          nctx.restore();
        }
      }

      // 플레이어 이동: 누르고 있는 화살표 키 상태에 따라 위치를 업데이트합니다.
      if (window.NoelPlayer) {
        // 화면 크기를 기준으로 속도 가중치를 계산합니다. dt는 밀리초 단위입니다.
        const rect = game.getBoundingClientRect();
        const speed = Math.max(120, rect.width * 0.5); // 초당 픽셀(px/s) 히스테릭스
        const s = (dt / 1000) * speed;
        let moved = false;
        let nx = window.NoelPlayer.x || 0;
        let ny = window.NoelPlayer.y || 0;
        if (keyState.LEFT) { nx -= s; moved = true; }
        if (keyState.RIGHT) { nx += s; moved = true; }
        if (keyState.UP) { ny -= s; moved = true; }
        if (keyState.DOWN) { ny += s; moved = true; }

        // 플레이어가 캔버스 밖으로 나가지 않도록 경계값으로 막습니다.
        const margin = 8;
        nx = Math.max(margin, Math.min(rect.width - margin, nx));
        ny = Math.max(margin, Math.min(rect.height - margin, ny));
        window.NoelPlayer.setPosition(nx, ny);

        // 이동 상태에 따라 애니메이션 방향을 설정합니다.
        if (!moved) {
          window.NoelPlayer.setDirection('idle');
        } else {
          // 왼/오를 우선으로 처리하고, 위/아래는 보조로 처리합니다.
          if (keyState.LEFT) window.NoelPlayer.setDirection('left');
          else if (keyState.RIGHT) window.NoelPlayer.setDirection('right');
          else if (keyState.UP) window.NoelPlayer.setDirection('back');
          else if (keyState.DOWN) window.NoelPlayer.setDirection('front');
        }

        // 플레이어의 내부 상태를 갱신하고 그립니다.
        window.NoelPlayer.update(dt);
        window.NoelPlayer.draw(gctx);
        // HUD는 gameRenderer로 그립니다 (gameCanvas 위에 점수/콤보 표시)
        if (gameRenderer) gameRenderer.drawHUD(scoreManager);
      }

      // 다음 프레임 예약
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // 문서가 아직 로딩 중이면 DOMContentLoaded 이벤트에서 init을 호출하고,
  // 이미 로드되었다면 바로 init을 호출합니다.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
