/*
  gameScript.js

  이 파일은 스테이지(무대)에서 게임을 실행하는 큰 흐름을 담고 있습니다.
  중학생도 이해할 수 있게 쉬운 말로 설명합니다.

  주요 역할 요약:
  - 화면의 캔버스 요소를 찾아서 그림을 그릴 준비를 합니다.
  - NoteManager(노트들), InputHandler(입력), CommandManager(콤보명령) 등을 연결합니다.
  - 매 프레임마다 게임 상태를 업데이트(update)하고 화면에 그립니다(draw)도록 루프를 만듭니다.

  간단한 비유: 이 파일은 연극의 무대 감독과 같습니다. 배우(NoelPlayer)와 소품(노트),
  관객(점수판)을 연결하고, 매 장면(프레임)을 순서대로 보여줍니다.
*/

(function(){
  'use strict';

  // 한 번만 초기화되도록 하는 표시입니다.
  // 같은 스크립트가 중복으로 실행되는 것을 막기 위해 씁니다.
  let __moon_init_done = false;

  // init(): 필요한 요소들을 찾고 초기 상태를 설정합니다.
  // - 캔버스(게임 화면, 노트용)를 찾고 2D 컨텍스트를 얻습니다.
  // - NoteManager, CommandManager, InputHandler가 있으면 연결합니다.
  function init(){
    if (__moon_init_done) return; // 이미 초기화되었으면 다시 하지 않음
    __moon_init_done = true;

    const game = document.getElementById('gameCanvas');
    if(!game) alert("문제: gameCanvas가 없습니다."); // 게임을 그릴 영역이 없으면 경고
    const gctx = game.getContext('2d');

    // 노트(화살표 같은 것)를 그릴 별도의 캔버스가 있으면 사용합니다.
    const notesCanvas = document.getElementById('notesCanvas');
    const nctx = notesCanvas ? notesCanvas.getContext('2d') : null;

    // 히트 라인 x 좌표입니다. 이 위치에서 판정을 합니다.
    const HIT_X = 120;

    // 노트 관리자, 판정 이펙트(화면에 잠깐 보이는 텍스트), 점수 정보를 준비합니다.
    let noteManager = null;
    const judgments = []; // 판정 효과들을 잠시 저장하는 배열
    const scoreManager = { score: 0};

    // 커맨드 관련 설정
    const COMMAND_BUFFER_CAPACITY = 4;
    const COMMAND_DISPLAY_DURATION = 1800; // 최근 명령 표시 유지 시간(ms)
    const DEFAULT_COMMAND_BUFFER_LABEL = '? ? ? ? [0/' + COMMAND_BUFFER_CAPACITY + ']';
    const commandState = { lastCommandText: '', lastCommandTime: 0 };
    let commandManager = null;
    let advanceDistance = 0;

    // 맵 시스템 설정
    const MAP_TOTAL_LENGTH = 1000;
    let mapManager = null;

    // MapManager 초기화
    if (window.MapManager && game) {
      const basePath = (typeof window !== 'undefined' && window.ASSET_BASE) ? window.ASSET_BASE : '../../../assets';
      mapManager = new window.MapManager(game, {
        totalLength: MAP_TOTAL_LENGTH,
        pixelsPerAdvance: 100,
        basePath: basePath
      });
    }

    // 몬스터 시스템 설정
    let monsterManager = null;
    if (window.MonsterManager) {
      monsterManager = new window.MonsterManager();
      window.stage5MonsterManager = monsterManager; // 디버그용 전역 보관
    }

    // NoteManager가 있으면 인스턴스화합니다. (notesCanvas가 필요)
    if (window.NoteManager && notesCanvas) {
      // spawnInterval: 노트가 생성되는 간격, noteSpeed: 노트 이동 속도
      noteManager = new window.NoteManager(notesCanvas, { spawnInterval: 1000, noteSpeed: 240, noteSize: 24 });
    }

    // CommandManager가 있으면 기본 명령들을 등록합니다.
    if (window.CommandManager) {
      commandManager = new window.CommandManager({ windowMs: 4000, capacity: COMMAND_BUFFER_CAPACITY, overwriteOnFull: true });
      registerStageCommands(commandManager);
      window.stage5CommandManager = commandManager; // 디버그용 전역 보관
    }

    // 노트가 화면 왼쪽으로 지나가면 'miss' 이벤트를 받습니다.
    // NoteManager는 맞지 않은(놓친) 노트에 대해 'note:miss' 이벤트를 보냅니다.
    window.addEventListener('note:miss', (e) => {
      try {
        const n = e && e.detail && e.detail.note;
        if (!n) return;
        if (!window.judgeHit) return; // 판정 함수가 없으면 처리 중단
        if (!notesCanvas) return;

        // 노트가 히트 라인과 얼마나 차이나는지 계산해서 판정함
        const hitX = HIT_X;
        const timeToHitMs = ((n.x - hitX) / (n.speed || 1)) * 1000; // ms 단위로 변환
        const res = window.judgeHit(timeToHitMs);

        // 판정 효과를 화면에 남기기 위해 judgments 배열에 추가
        const colorMap = { perfect: '#4CAF50', good: '#FFC107', miss: '#9E9E9E' };
        const color = colorMap[res.name] || '#fff';
        const now = performance.now();
        const r = notesCanvas.getBoundingClientRect();
        judgments.push({ label: res.name, x: hitX + 30, y: r.height/2, t: now, ttl: 700, color: color });

        // 점수와 콤보 업데이트
        scoreManager.score += (res.score || 0);
        if (res.name === 'miss') scoreManager.combo = 0;
        else scoreManager.combo = (scoreManager.combo || 0) + 1;

        // 판정으로 회복(heal) 수치가 있으면 플레이어 체력에 적용
        if (typeof res.heal !== 'undefined' && window.NoelPlayer) {
          const regen = Number(window.NoelPlayer.hpRegen) || 0;
          const deltaHp = regen * Number(res.heal) || 0;
          applyPlayerHpDelta(deltaHp);
        }
      } catch (err) {
        console.warn('note:miss handler error', err);
      }
    });

    // 화면을 그리는 도구(렌더러)가 있으면 생성합니다.
    const notesRenderer = (window.StageRenderer && notesCanvas) ? new window.StageRenderer(notesCanvas) : null;
    const gameRenderer = (window.StageRenderer && game) ? new window.StageRenderer(game) : null;

    // 플레이어 초기화(다른 파일에서 정의된 NoelPlayer 사용)
    if(window.NoelPlayer && typeof window.NoelPlayer.init === 'function'){
      window.NoelPlayer.init();
    }

    // 캔버스 크기에 맞춰 플레이어 위치와 크기를 설정하는 함수
    function updatePlayerPosition(){
      const rect = game.getBoundingClientRect();
      const x = rect.width * 0.25; // 화면 왼쪽에서 1/4 지점
      const y = rect.height * 0.75; // 화면 아래쪽 1/4 지점 (위에서 3/4)
      if(window.NoelPlayer){
        window.NoelPlayer.setPosition(x, y);
        // 화면 크기에 따라 스케일 조정(너무 작아지지 않게 최소값 사용)
        const base = Math.max(0.5, rect.width / 1500);
        window.NoelPlayer.setScale(base);
      }
    }

    // 플레이어 HP를 안전하게 변경하는 헬퍼
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

    // 명령 버퍼를 화면에 보일 문자열로 만들기
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

    // 마지막으로 실행된 명령을 화면 표시용으로 저장
    function setLastCommandText(text){
      commandState.lastCommandText = text || '';
      commandState.lastCommandTime = performance.now();
    }

    // 스테이지에서 사용할 명령들을 등록하는 함수
    function registerStageCommands(cm){
      if (!cm) return;
      const defs = [
        { name: 'attack', seq: ['Z','Z','Z','X'] },
        { name: 'defend', seq: ['X','X','Z','X'] },
        { name: 'advance', seq: ['Z','Z','X','X'] }
      ];
      defs.forEach(def => cm.register(def.name, def.seq, handleCommandResolution));
    }

    // 명령이 인식되었을 때 실제로 처리하는 함수
    function handleCommandResolution(payload){
      if (!payload || !payload.seq) return;
      const seqLength = payload.seq.length;
      const entries = Array.isArray(payload.entries) ? payload.entries.slice(-seqLength) : [];
      if (entries.length < seqLength) return; // 충분한 입력이 없으면 무시

      // 입력 중 miss가 하나라도 있으면 명령 실패
      const hasMiss = entries.some(entry => !entry || !entry.judgement || entry.judgement.name === 'miss');
      if (hasMiss) {
        if (commandManager) commandManager.reset();
        setLastCommandText('');
        return;
      }

      // 각 입력의 스냅샷을 만들어 이벤트에 담아 보냅니다.
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

      // 명령별 동작: 공격/방어/이동 등
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
          
          // 몬스터에게 데미지 주기
          if (monsterManager) {
            const result = monsterManager.damageActiveMonster(totalDamage);
            if (result) {
              detail.monsterDamaged = true;
              detail.monsterHp = result.remainingHp;
              detail.monsterDefeated = result.isDefeated;
              if (result.isDefeated) {
                label = 'ATTACK ' + displayDamage + ' - MONSTER DEFEATED!';
              } else {
                label = 'ATTACK ' + displayDamage + ' (Monster HP: ' + Math.floor(result.remainingHp) + ')';
              }
            } else {
              label = 'ATTACK ' + displayDamage;
            }
          } else {
            label = 'ATTACK ' + displayDamage;
          }
          break;
        }
        case 'defend': {
          if (window.NoelPlayer) window.NoelPlayer.defending = true;
          detail.defending = true;
          label = 'DEFEND';
          break;
        }
        case 'advance': {
          // 몬스터가 있으면 전진 불가
          if (monsterManager && monsterManager.getActiveMonster() && monsterManager.getActiveMonster().isAlive) {
            label = 'ADVANCE BLOCKED - DEFEAT MONSTER FIRST!';
            detail.blocked = true;
            detail.reason = 'monster';
            break;
          }
          
          const player = window.NoelPlayer;
          let distance = 0;
          if (player) {
            distance = Number(player.speed) || 0;
            // 맵 최대 길이 제한
            if (advanceDistance + distance > MAP_TOTAL_LENGTH) {
              distance = MAP_TOTAL_LENGTH - advanceDistance;
            }
            if (distance > 0) {
              advanceDistance += distance;
              if (mapManager) {
                mapManager.setAdvanceDistance(advanceDistance);
              }
              // 몬스터 생성 체크
              if (monsterManager) {
                monsterManager.checkSpawn(advanceDistance, game);
              }
            }
          }
          detail.distance = distance;
          detail.totalDistance = advanceDistance;
          label = 'ADVANCE +' + Math.round(distance) + ' (' + Math.round(advanceDistance) + '/' + MAP_TOTAL_LENGTH + ')';
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

    // 노트를 맞추려고 시도할 때 사용하는 함수
    // - keyToken: 눌린 키 문자
    // - options: 콜백이나 추가 규칙을 넣을 수 있음
    function attemptNoteHit(keyToken, options = {}){
      if (!window.judgeHit) return null;
      const notes = (noteManager && noteManager.notes) ? noteManager.notes : [];
      const hitX = HIT_X;
      let best = null;

      // 가장 히트 라인에 가까운(오차가 작은) 노트를 찾습니다.
      if (notes.length){
        let bestAbsMs = Infinity;
        for (const n of notes){
          if (n.hit) continue; // 이미 친 노트는 건너뜀
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

      // 점수와 콤보 적용
      scoreManager.score += (res.score || 0);
      if (res.name === 'miss') scoreManager.combo = 0;
      else scoreManager.combo = (scoreManager.combo || 0) + 1;

      // 회복(heal) 적용
      if (typeof res.heal !== 'undefined' && window.NoelPlayer){
        const regen = Number(window.NoelPlayer.hpRegen) || 0;
        const deltaHp = regen * Number(res.heal) || 0;
        const applyPositive = options.allowPositiveHeal !== false && deltaHp > 0;
        if (deltaHp < 0 || applyPositive){
          applyPlayerHpDelta(deltaHp);
        }
      }

      // 성공 판정이면 노트에 hit 표시
      if (best && best.note && res.name !== 'miss') {
        best.note.hit = true;
      }

      // 결과 콜백 호출
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

    // 키 입력 상태(화살표 키)를 기억하는 객체
    const keyState = { LEFT: false, RIGHT: false, UP: false, DOWN: false };
    let input = null;

    // InputHandler가 있으면 입력을 받고 처리합니다.
    if (window.InputHandler) {
      input = new window.InputHandler();
      // 키가 눌렸을 때 호출되는 콜백 등록
      input.onPress(evt => {
        const k = evt && evt.key;
        if (!k) return;
        // 화살표는 누른 상태를 true로 바꿔 이동 처리에 사용
        if (k === 'LEFT' || k === 'RIGHT' || k === 'UP' || k === 'DOWN') {
          keyState[k] = true;
        } else if (k === 'SPACE') {
          // 스페이스는 특수 처리: 판정 시도
          attemptNoteHit('SPACE', { allowPositiveHeal: true, time: evt.time });
        } else if (k === 'Z' || k === 'X') {
          // Z/X는 노트 히트 시도와 커맨드 버퍼에 넣는 작업을 수행
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

      // keyup은 브라우저 이벤트로 처리하여 누름 상태를 해제합니다.
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

    // 창 크기 변경이나 로드 시 플레이어 위치를 재계산
    window.addEventListener('resize', () => {
      updatePlayerPosition();
      if (mapManager) mapManager.onResize();
    });
    window.addEventListener('load', () => {
      updatePlayerPosition();
      if (mapManager) mapManager.onResize();
    });
    updatePlayerPosition();

    // 프레임 루프: 게임 상태 업데이트와 화면 그리기
    let last = performance.now();
    function frame(now){
      const dt = Math.min(100, now - last); // 너무 큰 dt는 제한
      last = now;

      // 게임 캔버스 초기화
      if(gctx){
        gctx.clearRect(0, 0, game.width, game.height);
      }

      // 맵 그리기 (배경)
      if (mapManager) mapManager.draw();

      // 몬스터 업데이트 및 그리기
      if (monsterManager) {
        monsterManager.update(dt);
        monsterManager.draw(gctx);
      }

      // 노트 업데이트 및 그리기
      if (noteManager && nctx) {
        noteManager.update(dt);
        if (notesRenderer) {
          notesRenderer.clear();
          notesRenderer.drawSpatialNotes(noteManager.notes);
        } else {
          noteManager.draw(nctx);
        }
      }

      // 판정 이펙트(원, 텍스트)를 표시하고 오래된 것은 제거
      if (nctx) {
        const rect = notesCanvas.getBoundingClientRect();
        const hitX = HIT_X;
        if (notesRenderer) notesRenderer.drawVerticalHitLine(hitX);

        const nowTs = performance.now();
        for (let i = judgments.length - 1; i >= 0; i--) {
          const j = judgments[i];
          const age = nowTs - j.t;
          if (age > j.ttl) { judgments.splice(i,1); continue; }
          const ratio = age / j.ttl;
          const alpha = 1 - ratio;

          // 히트 라인에서 퍼지는 원 이펙트
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

          // 판정 텍스트
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

      // 플레이어 이동과 그리기
      if (window.NoelPlayer) {
        const rect = game.getBoundingClientRect();
        const speed = Math.max(120, rect.width * 0.2);
        const s = (dt / 1000) * speed;
        let moved = false;
        let nx = window.NoelPlayer.x || 0;
        let ny = window.NoelPlayer.y || 0;
        if (keyState.LEFT) { nx -= s; moved = true; }
        if (keyState.RIGHT) { nx += s; moved = true; }
        if (keyState.UP) { ny -= s; moved = true; }
        if (keyState.DOWN) { ny += s; moved = true; }

        // 캐릭터 이미지 크기 계산
        const player = window.NoelPlayer;
        const dir = (player.direction === 'idle') ? 'idle' : player.direction;
        const meta = player.meta && player.meta[dir];
        let halfWidth = 16; // 기본값
        let halfHeight = 16; // 기본값
        
        if (meta && player.scale) {
          halfWidth = Math.floor((meta.frameW * player.scale) / 2);
          halfHeight = Math.floor((meta.frameH * player.scale) / 2);
        }

        // 경계 안으로 위치 제한: 왼쪽 절반(0 ~ width/2), 아래 절반(height/2 ~ height)
        // 캐릭터 이미지 크기를 고려하여 화면 밖으로 나가지 않도록 제한
        nx = Math.max(halfWidth, Math.min(rect.width * 0.75 - halfWidth, nx));
        ny = Math.max(rect.height * 0.5 + halfHeight, Math.min(rect.height - halfHeight, ny));
        window.NoelPlayer.setPosition(nx, ny);

        // 방향에 따라 애니메이션 설정
        if (!moved) {
          window.NoelPlayer.setDirection('idle');
        } else {
          if (keyState.LEFT) window.NoelPlayer.setDirection('left');
          else if (keyState.RIGHT) window.NoelPlayer.setDirection('right');
          else if (keyState.UP) window.NoelPlayer.setDirection('back');
          else if (keyState.DOWN) window.NoelPlayer.setDirection('front');
        }

        // 업데이트 및 그리기
        window.NoelPlayer.update(dt);
        window.NoelPlayer.draw(gctx);

        // HUD(점수/콤보 등) 그리기
        const bufferLabel = formatCommandBuffer();
        let commandLabel = '';
        if (commandState.lastCommandText) {
          if ((now - commandState.lastCommandTime) <= COMMAND_DISPLAY_DURATION) {
            commandLabel = commandState.lastCommandText;
          } else {
            commandState.lastCommandText = '';
          }
        }
        if (gameRenderer) {
          gameRenderer.drawHUD(scoreManager, { bufferText: bufferLabel, commandText: commandLabel });
        }

        // 체력 바 그리기
        if (gctx && window.NoelPlayer) {
          try {
            const rect = game.getBoundingClientRect();
            const canvasW = rect.width || 800;
            const canvasH = rect.height || 600;
            const padding = 6;
            const barHeight = Math.max(8, Math.floor(canvasH * 0.04));
            const barW = Math.max(100, canvasW - padding * 2);
            let hp = Number(window.NoelPlayer.hp) || 0;
            const hpMax = Number(window.NoelPlayer.hpMax) || 1000;
            const clampedHp = Math.max(0, Math.min(hpMax, hp));
            const ratio = hpMax > 0 ? (clampedHp / hpMax) : 0;
            const x = padding;
            const y = canvasH - barHeight - padding;

            gctx.save();
            gctx.fillStyle = '#222';
            gctx.fillRect(x, y, barW, barHeight);
            gctx.fillStyle = '#4CAF50';
            gctx.fillRect(x, y, Math.floor(barW * ratio), barHeight);
            gctx.strokeStyle = '#000';
            gctx.lineWidth = 1;
            gctx.strokeRect(x + 0.5, y + 0.5, barW - 1, barHeight - 1);
            gctx.fillStyle = '#fff';
            gctx.font = Math.max(12, Math.floor(barHeight * 0.8)) + 'px sans-serif';
            gctx.textAlign = 'center';
            gctx.textBaseline = 'middle';
            gctx.fillText(Math.floor(clampedHp) + '/' + hpMax, x + barW / 2, y + barHeight / 2);
            gctx.restore();
          } catch (e) {
            console.warn('HP bar draw failed', e);
          }
        }
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // 문서가 아직 로딩 중이면 DOMContentLoaded 이벤트에서 init을 호출하고,
  // 이미 로드되었다면 바로 init을 호출합니다.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

})();
