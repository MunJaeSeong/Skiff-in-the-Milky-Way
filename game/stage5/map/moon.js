/*
  moon.js

  이 파일은 무대(map) 스크립트로, 화면에 플레이어 캐릭터(NoelPlayer)를 초기화하고
  간단한 업데이트-드로우(업데이트와 그리기) 루프를 실행합니다.

  아래 영어 주석은 한국어로 번역하고, 각 부분에 중학생도 이해할 수 있게 추가 설명을 붙였습니다.
*/

(function(){
  'use strict';

  // 초기화가 여러 번 실행되는 것을 방지하는 가드 플래그입니다.
  // (예: 스크립트가 중복 로드되거나 이벤트가 두 번 바인딩되는 경우를 막기 위함)
  let __moon_init_done = false;

  // init 함수: 페이지에서 필요한 캔버스와 매니저들을 찾아 초기 설정을 합니다.
  // - 게임 화면을 담당하는 `gameCanvas`
  // - 노트를 그리는 `notesCanvas` (있을 때만 사용)
  // - NoteManager가 있으면 생성해서 노트를 스폰/갱신하도록 준비합니다.
  function init(){
    // 이미 초기화된 경우 중복 실행 방지
    if (__moon_init_done) return;
    __moon_init_done = true;
    const game = document.getElementById('gameCanvas');
    if(!game) alert("문제: gameCanvas가 없습니다."); // 게임 캔버스가 없으면 아무 것도 안 함
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
    const COMMAND_BUFFER_CAPACITY = 4;
    const COMMAND_DISPLAY_DURATION = 1800;
    const DEFAULT_COMMAND_BUFFER_LABEL = '? ? ? ? [0/' + COMMAND_BUFFER_CAPACITY + ']';
    const commandState = { lastCommandText: '', lastCommandTime: 0 };
    let commandManager = null;
    let advanceDistance = 0;

    // NoteManager가 전역에 정의되어 있고 notesCanvas가 있으면 NoteManager 인스턴스를 만듭니다.
    // 옵션으로 노트 생성 간격(spawnInterval), 노트 속도(noteSpeed), 노트 크기(noteSize)를 전달합니다.
    if (window.NoteManager && notesCanvas) {
      noteManager = new window.NoteManager(notesCanvas, { spawnInterval: 1000, noteSpeed: 240, noteSize: 24 });
    }

    if (window.CommandManager) {
      commandManager = new window.CommandManager({ windowMs: 4000, capacity: COMMAND_BUFFER_CAPACITY, overwriteOnFull: true });
      registerStageCommands(commandManager);
      window.stage5CommandManager = commandManager;
    }

    // 노트가 화면 왼쪽으로 지나가서 제거될 때 발생하는 이벤트를 받아서 miss 판정을 적용합니다.
    // NoteManager는 'note:miss' 커스텀 이벤트를 발생시킵니다.
    window.addEventListener('note:miss', (e) => {
      try {
        const n = e && e.detail && e.detail.note;
        if (!n) return;
        if (!window.judgeHit) return;
        if (!notesCanvas) return;
        // notesCanvas의 CSS 좌표계를 사용해 시간 차이를 계산합니다.
        const rect = notesCanvas.getBoundingClientRect();
        const hitX = HIT_X;
        // timeToHitMs: (note x - hitX) / speed * 1000
        const timeToHitMs = ((n.x - hitX) / (n.speed || 1)) * 1000;
        const res = window.judgeHit(timeToHitMs);
        // 판정 표시
        const colorMap = { perfect: '#4CAF50', good: '#FFC107', miss: '#9E9E9E' };
        const color = colorMap[res.name] || '#fff';
        const now = performance.now();
        const r = notesCanvas.getBoundingClientRect();
        judgments.push({ label: res.name, x: hitX + 30, y: r.height/2, t: now, ttl: 700, color: color });
        // 점수/콤보 업데이트
        scoreManager.score += (res.score || 0);
        if (res.name === 'miss') scoreManager.combo = 0;
        else scoreManager.combo = (scoreManager.combo || 0) + 1;
        // 체력 적용 (judge의 heal 값 * 플레이어 hpRegen)
        if (typeof res.heal !== 'undefined' && window.NoelPlayer) {
          const regen = Number(window.NoelPlayer.hpRegen) || 0;
          const deltaHp = regen * Number(res.heal) || 0;
          applyPlayerHpDelta(deltaHp);
        }
      } catch (err) {
        console.warn('note:miss handler error', err);
      }
    });

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

    function applyPlayerHpDelta(delta){
      if (!window.NoelPlayer) return;
      if (typeof delta !== 'number' || delta === 0) return;
      if (typeof window.NoelPlayer.applyHpDelta === 'function') {
        window.NoelPlayer.applyHpDelta(delta);
        return;
      }
      const currentHp = Number(window.NoelPlayer.hp) || 0;
      const hpMax = Number(window.NoelPlayer.hpMax) || 1000;
      const newHp = Math.max(0, Math.min(hpMax, currentHp + delta));
      window.NoelPlayer.hp = newHp;
    }

    function formatCommandBuffer(){
      if (!commandManager) return DEFAULT_COMMAND_BUFFER_LABEL;
      const entries = commandManager.getBufferEntries();
      const placeholders = new Array(COMMAND_BUFFER_CAPACITY).fill('?');
      const fillStart = Math.max(0, COMMAND_BUFFER_CAPACITY - entries.length);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const token = entry && entry.key ? String(entry.key).trim().toUpperCase() : '?';
        placeholders[fillStart + i] = token || '?';
      }
      return placeholders.join(' ') + ' [' + entries.length + '/' + COMMAND_BUFFER_CAPACITY + ']';
    }

    function setLastCommandText(text){
      commandState.lastCommandText = text || '';
      commandState.lastCommandTime = performance.now();
    }

    function registerStageCommands(cm){
      if (!cm) return;
      const defs = [
        { name: 'attack', seq: ['Z','Z','Z','X'] },
        { name: 'defend', seq: ['X','X','Z','X'] },
        { name: 'advance', seq: ['Z','Z','X','X'] }
      ];
      defs.forEach(def => cm.register(def.name, def.seq, handleCommandResolution));
    }

    function handleCommandResolution(payload){
      if (!payload || !payload.seq) return;
      const seqLength = payload.seq.length;
      const entries = Array.isArray(payload.entries) ? payload.entries.slice(-seqLength) : [];
      if (entries.length < seqLength) return;
      const hasMiss = entries.some(entry => !entry || !entry.judgement || entry.judgement.name === 'miss');
      if (hasMiss) {
        if (commandManager) commandManager.reset();
        setLastCommandText('');
        return;
      }

      const snapshots = entries.map(entry => ({
        key: entry.key,
        t: entry.t,
        judgement: entry.judgement ? Object.assign({}, entry.judgement) : null
      }));
      const detail = {
        command: payload.name,
        entries: snapshots,
        judgements: snapshots.map(s => s.judgement ? s.judgement.name : null)
      };
      let label = '';

      switch (payload.name) {
        case 'attack': {
          const player = window.NoelPlayer || {};
          const baseAttack = Number(player.attack) || 0;
          let totalDamage = baseAttack || 0;
          entries.forEach(entry => {
            const multiplier = entry.judgement && typeof entry.judgement.attack === 'number' ? entry.judgement.attack : 1;
            totalDamage *= multiplier;
          });
          const displayDamage = Math.round(totalDamage * 10) / 10;
          detail.damage = totalDamage;
          detail.damageDisplay = displayDamage;
          label = 'ATTACK ' + displayDamage;
          break;
        }
        case 'defend': {
          if (window.NoelPlayer) window.NoelPlayer.defending = true;
          detail.defending = true;
          label = 'DEFEND';
          break;
        }
        case 'advance': {
          const player = window.NoelPlayer;
          let distance = 0;
          if (player) {
            distance = Number(player.speed) || 0;
            const rect = game.getBoundingClientRect();
            const margin = 8;
            const currentX = player.x || 0;
            const targetX = Math.max(margin, Math.min(rect.width - margin, currentX + distance));
            player.setPosition(targetX, player.y || 0);
            advanceDistance += distance;
          }
          detail.distance = distance;
          detail.totalDistance = advanceDistance;
          label = 'ADVANCE +' + Math.round(distance);
          break;
        }
        default: {
          label = (payload.name || '').toUpperCase();
        }
      }

      if (label) setLastCommandText(label);
      try {
        window.dispatchEvent(new CustomEvent('game:command', { detail }));
      } catch (err) {
        console.warn('game:command dispatch failed', err);
      }
      if (commandManager) commandManager.reset();
    }

    function attemptNoteHit(keyToken, options = {}){
      if (!window.judgeHit) return null;
      const notes = (noteManager && noteManager.notes) ? noteManager.notes : [];
      const hitX = HIT_X;
      let best = null;
      if (notes.length){
        let bestAbsMs = Infinity;
        for (const n of notes){
          if (n.hit) continue;
          const speed = n.speed || 0;
          if (!speed) continue;
          const timeToHitMs = ((n.x - hitX) / speed) * 1000;
          const absMs = Math.abs(timeToHitMs);
          if (absMs < bestAbsMs){
            bestAbsMs = absMs;
            best = { note: n, dt: timeToHitMs };
          }
        }
      }

      const dt = best ? best.dt : Number.POSITIVE_INFINITY;
      const res = window.judgeHit(dt);
      const colorMap = { perfect: '#4CAF50', good: '#FFC107', miss: '#9E9E9E' };
      const color = colorMap[res.name] || '#fff';
      const nowTs = performance.now();

      if (notesCanvas){
        const rect = notesCanvas.getBoundingClientRect();
        judgments.push({ label: res.name, x: hitX + 30, y: rect.height/2, t: nowTs, ttl: 700, color: color });
      }

      scoreManager.score += (res.score || 0);
      if (res.name === 'miss') scoreManager.combo = 0;
      else scoreManager.combo = (scoreManager.combo || 0) + 1;

      if (typeof res.heal !== 'undefined' && window.NoelPlayer){
        const regen = Number(window.NoelPlayer.hpRegen) || 0;
        const deltaHp = regen * Number(res.heal) || 0;
        const applyPositive = options.allowPositiveHeal !== false && deltaHp > 0;
        if (deltaHp < 0 || applyPositive){
          applyPlayerHpDelta(deltaHp);
        }
      }

      if (best && best.note && res.name !== 'miss') {
        best.note.hit = true;
      }

      if (options && typeof options.onResult === 'function') {
        try {
          const timeStamp = typeof options.time === 'number' ? options.time : nowTs;
          options.onResult({ key: keyToken, time: timeStamp, judgement: res, dt: dt, note: best ? best.note : null });
        } catch (err) {
          console.warn('attemptNoteHit onResult error', err);
        }
      }

      return { judgement: res, note: best ? best.note : null, dt };
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
          attemptNoteHit('SPACE', { allowPositiveHeal: true, time: evt.time });
        } else if (k === 'Z' || k === 'X') {
          const keyToken = k;
          attemptNoteHit(keyToken, {
            allowPositiveHeal: false,
            time: evt.time,
            onResult: ({ judgement, time }) => {
              if (!commandManager) return;
              if (!judgement) return;
              const name = String(judgement.name || '').toLowerCase();
              const isSuccess = name === 'perfect' || name === 'good' || name === 'great';
              if (!isSuccess) {
                commandManager.reset();
                setLastCommandText('');
                return;
              }
              commandManager.push({ key: keyToken, t: time, judgement });
            }
          });
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
        const bufferLabel = formatCommandBuffer();
        let commandLabel = '';
        if (commandState.lastCommandText) {
          if ((now - commandState.lastCommandTime) <= COMMAND_DISPLAY_DURATION) {
            commandLabel = commandState.lastCommandText;
          } else {
            commandState.lastCommandText = '';
          }
        }
        // HUD는 gameRenderer로 그립니다 (gameCanvas 위에 점수/콤보 표시)
        if (gameRenderer) {
          gameRenderer.drawHUD(scoreManager, { bufferText: bufferLabel, commandText: commandLabel });
        }
        // 화면 하단에 플레이어 체력 바(녹색)를 표시합니다.
        if (gctx && window.NoelPlayer) {
          try {
            // canvas는 setTransform(dpr,0,0,dpr,0,0) 처리가 되어 있으므로
            // 레이아웃 및 위치 계산은 CSS 픽셀 단위(getBoundingClientRect)를 사용해야 합니다.
            const rect = game.getBoundingClientRect();
            const canvasW = rect.width || 800;
            const canvasH = rect.height || 600;
            const padding = 6;
            const barHeight = Math.max(8, Math.floor(canvasH * 0.04));
            const barW = Math.max(100, canvasW - padding * 2);
            let hp = Number(window.NoelPlayer.hp) || 0;
            // hpMax 우선순위: NoelPlayer.hpMax -> 1000(fallback)
            const hpMax = Number(window.NoelPlayer.hpMax) || 1000;
            // hp를 상한/하한으로 클램프
            const clampedHp = Math.max(0, Math.min(hpMax, hp));
            const ratio = hpMax > 0 ? (clampedHp / hpMax) : 0;
            const x = padding;
            const y = canvasH - barHeight - padding;

            gctx.save();
            // 배경 바
            gctx.fillStyle = '#222';
            gctx.fillRect(x, y, barW, barHeight);
            // 체력 채움(녹색)
            gctx.fillStyle = '#4CAF50';
            gctx.fillRect(x, y, Math.floor(barW * ratio), barHeight);
            // 외곽선
            gctx.strokeStyle = '#000';
            gctx.lineWidth = 1;
            gctx.strokeRect(x + 0.5, y + 0.5, barW - 1, barHeight - 1);
            // 텍스트 (숫자 표시)
            gctx.fillStyle = '#fff';
            gctx.font = Math.max(12, Math.floor(barHeight * 0.8)) + 'px sans-serif';
            gctx.textAlign = 'center';
            gctx.textBaseline = 'middle';
            gctx.fillText(Math.floor(clampedHp) + '/' + hpMax, x + barW / 2, y + barHeight / 2);
            gctx.restore();
          } catch (e) {
            // 안전을 위해 예외는 무시하고 콘솔에 로깅
            console.warn('HP bar draw failed', e);
          }
        }
      }

      // 다음 프레임 예약
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // 문서가 아직 로딩 중이면 DOMContentLoaded 이벤트에서 init을 호출하고,
  // 이미 로드되었다면 바로 init을 호출합니다.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

})();
