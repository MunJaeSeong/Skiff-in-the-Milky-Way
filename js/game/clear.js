(function(){
  'use strict';

  /*
   * 게임 클리어(Win) 오버레이 표시 유틸리티
   * --------------------------------------
   * 이 파일은 게임에서 '클리어(승리) 화면'을 표시하는 함수 `showWin(options)`를 제공합니다.
   * 아래는 이 코드의 목적과 동작을 중학생도 이해할 수 있게 풀어 쓴 설명과,
   * 개발자용 자세한 기술 설명입니다.
   *
   * [중학생용 쉬운 설명]
   * - 무대(레벨)를 깬 뒤 화면 왼쪽 게임 영역 위에 반투명 검은 상자를 띄웁니다.
   * - 이 상자 안에는 큰 'WIN' 글자와 오른쪽 아래에 승리 이미지를 보여줍니다.
   * - 소리(캐릭터의 승리 음성)를 시도해서 재생하고, 위쪽에는 '다음'과 '나가기' 버튼을 둡니다.
   * - '다음'은 다음 스테이지로 넘어가게 하고, '나가기'는 선택 화면으로 돌아갑니다.
   *
   * [개발자용 상세 기술 설명]
   * 함수: window.showWin(options)
   * - options (선택):
   *    - image: string (명시적 이미지 경로, 우선 사용)
   *    - overlayAlpha: number (배경 반투명도, 기본 0.45)
   *
   * 주요 동작 순서:
   * 1) 캔버스(`#gameCanvas`)의 위치와 크기를 읽어 오버레이(`div#game-win-overlay`)를 같은 위치에 만듭니다.
   * 2) 오버레이는 반투명 검은 배경을 갖고, 내부에 이미지 요소 두 개(`game-win-img`, `game-win-hud-img`)와
   *    타이틀(`game-win-title`), 액션 컨테이너(`game-win-actions`)를 배치합니다.
   * 3) 승리 이미지 후보 목록(candidates)을 만들고 순서대로 로드 시도합니다.
   *    - 우선 options.image, 로컬 스토리지에 저장된 사용자 캐릭터 자원들, 마지막으로 기본 NoeL 이미지를 사용합니다.
   * 4) 캐릭터 음성(승리 보이스) 후보 목록을 만들어 `tryPlay` 내부 함수를 통해 순차 재생을 시도합니다.
   *    - 첫 재생이 실패하면 다음 후보를 시도합니다.
   * 5) 오른쪽 아래에 '다음'과 '나가기' 버튼을 만들고 스타일을 적용합니다.
   *    - '다음'은 가능한 경우 `Game.nextStage()` 또는 `Game.startStage(next)` 같은 API를 호출하여 다음 스테이지로 이동합니다.
   *    - 연습 모드가 활성화되어 있으면 '다음' 버튼을 숨깁니다.
   * 6) 버튼의 위치는 `positionActions()`에서 HUD 이미지의 위치를 참고해 계산합니다.
   *    - 내부적으로 캔버스/게임 내부 픽셀 크기(`Game.width`/`Game.height`)와 실제 DOM 크기 비율을 고려해
   *      뷰포트 좌표를 계산하여 버튼을 오른쪽에 배치합니다.
   * 7) `window.hideWin()`을 노출하여 오버레이 제거 및 자원(이벤트 리스너, 재생 중인 오디오) 정리를 수행합니다.
   *
   * 구현 노트(세부사항):
   * - 오버레이는 `position: absolute`로 캔버스와 동일한 화면 좌표에 맞춥니다.
   * - HUD 이미지(`game-win-hud-img`)는 실패 시 다음 후보를 순차적으로 시도하도록 `onerror` 핸들러가 있고,
   *   `overlay._voiceAudio`에 성공적으로 재생된 Audio 객체를 보관합니다.
   * - `positionActions()`는 복잡한 좌표 변환을 합니다: 내부 게임 좌표를 캔버스 DOM 크기에 맞추어 스케일링한 뒤
   *   버튼의 왼쪽/상단 위치를 계산해 `actions.style.left/top`을 설정합니다.
   * - 이벤트 리스너(`resize`, `hudImg.load`)는 `hideWin()`에서 정리됩니다.
   *
   * 유지 보수 팁:
   * - 새 캐릭터가 추가되면 `candidates` 배열에 적절한 경로를 넣어주면 됩니다.
   * - 오버레이 스타일은 인라인으로 적용하므로 CSS 파일 대신 자바스크립트에서 변경됩니다.
   */
  window.showWin = function(options){
    options = options || {};
    const Game = window.Game || {};
    const canvas = (Game && Game.canvas) ? Game.canvas : document.getElementById('gameCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const panelFraction = (Game && Game.styles && typeof Game.styles.panelFraction === 'number') ? Game.styles.panelFraction : 0.25;
    const gameAreaW = Math.max(100, (Game && Game.width ? Game.width : rect.width) - Math.floor((Game && Game.width ? Game.width : rect.width) * panelFraction));

    // 게임 화면(왼쪽 게임 영역) 위에 위치할 오버레이 컨테이너를 생성합니다
    let overlay = document.getElementById('game-win-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'game-win-overlay';
      document.body.appendChild(overlay);
    }

    // 오버레이의 위치와 스타일을 설정합니다
    overlay.style.position = 'absolute';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = (gameAreaW) + 'px';
    overlay.style.height = (rect.height) + 'px';
    overlay.style.pointerEvents = 'auto';
    overlay.style.background = 'rgba(0,0,0,' + (typeof options.overlayAlpha === 'number' ? options.overlayAlpha : 0.45) + ')';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    // 중앙에 표시할 이미지 엘리먼트를 생성합니다(기본적으로 숨기고 HUD 이미지를 사용)
    const imgId = 'game-win-img';
    let img = document.getElementById(imgId);
    if (!img){
      img = document.createElement('img');
      img.id = imgId;
      overlay.appendChild(img);
    }
    img.style.maxWidth = Math.floor(gameAreaW * 0.6) + 'px';
    img.style.maxHeight = Math.floor(rect.height * 0.8) + 'px';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))';
    // 중앙 이미지 숨기기(대신 HUD 영역의 이미지를 사용합니다)
    img.style.display = 'none';

    // 오버레이 왼쪽 상단에 'WIN' 타이틀 엘리먼트를 추가합니다
    let titleEl = document.getElementById('game-win-title');
    if (!titleEl){
      titleEl = document.createElement('div');
      titleEl.id = 'game-win-title';
      titleEl.className = 'win-title';
      overlay.appendChild(titleEl);
    }
    // 오버레이 좌상단 기준으로 타이틀 위치를 설정합니다
    titleEl.style.position = 'absolute';
    titleEl.style.left = '40px';
    titleEl.style.top = '40px';
    titleEl.style.zIndex = '10002';
    // CSS가 적용되지 않을 경우를 대비해 인라인으로 글꼴 크기와 스타일을 강제합니다
    const titleSizePx = (options && options.titleSize) ? String(options.titleSize) + 'px' : '220px';
    titleEl.style.fontSize = titleSizePx;
    titleEl.style.lineHeight = '1';
    titleEl.style.color = '#7fff7f';
    titleEl.style.fontWeight = '800';
    titleEl.style.letterSpacing = '4px';
    titleEl.style.textShadow = '0 2px 6px rgba(0,0,0,0.6), 0 0 24px rgba(127,255,127,0.12)';
    titleEl.style.pointerEvents = 'none';
    titleEl.textContent = (options && options.title) ? options.title : 'WIN';

    // 오버레이 내부의 HUD 위치(오른쪽 하단)에 승리 이미지를 배치할 엘리먼트를 생성합니다
    const hudImgId = 'game-win-hud-img';
    let hudImg = document.getElementById(hudImgId);
    if (!hudImg){
      hudImg = document.createElement('img');
      hudImg.id = hudImgId;
      overlay.appendChild(hudImg);
    }
    hudImg.style.position = 'absolute';
    hudImg.style.right = '20px';
    hudImg.style.bottom = '20px';
    hudImg.style.maxWidth = Math.floor(Math.min(720, gameAreaW * 0.75)) + 'px';
    hudImg.style.maxHeight = Math.floor(rect.height * 0.75) + 'px';
    hudImg.style.objectFit = 'contain';
    hudImg.style.pointerEvents = 'none';
    hudImg.style.zIndex = 10002;
    hudImg.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))';

    // 저장된 사용자 선택(있다면)에 따라 승리 이미지 후보 경로 목록을 만듭니다
    const STORAGE_KEY = 'skiff_custom_v1';
    let charId = null;
    try{ const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; charId = saved.character; }catch(e){ charId = null; }
    const candidates = [];
    if (options.image) candidates.push(options.image);
    if (charId && typeof charId === 'string'){
      const cap = charId.charAt(0).toUpperCase() + charId.slice(1);
      // 승리 이미지가 있을 만한 일반적인 경로 및 파일명 스타일 목록
      candidates.push(`assets/character/${charId}/${charId}_win.png`);
      candidates.push(`assets/character/${charId}/${cap}_win.png`);
      candidates.push(`assets/character/${cap}/${cap}_win.png`);
      candidates.push(`assets/character/${cap}_win.png`);
      candidates.push(`assets/character/${charId}_win.png`);
      candidates.push(`assets/character/${cap}/${charId}_win.png`);
    }
    // 대체(fallback) 이미지 경로
    candidates.push('assets/character/noel/Noel_win.png');

    // 후보 경로들을 순서대로 시도하여 HUD 이미지를 로드합니다
    hudImg._candidates = candidates;
    hudImg._ci = 0;
    hudImg.onerror = function(){
      try{
        this._ci = (this._ci || 0) + 1;
        if (this._candidates && this._ci < this._candidates.length){
          this.src = this._candidates[this._ci];
        }
      }catch(e){}
    };
    hudImg.src = candidates[0];

    // 오버레이를 화면에 보이게 합니다
    overlay.style.visibility = 'visible';

    // 메뉴 및 스테이지 배경음이 재생 중이면 중지시키고, 캐릭터 승리 음성을 한 번 재생합니다
    try{
      try{ if (window.MenuBGM && typeof window.MenuBGM.stop === 'function') window.MenuBGM.stop(); }catch(e){}
      if (window.Game && window.Game._bgmAudio){ try{ window.Game._bgmAudio.pause(); }catch(e){} window.Game._bgmAudio = null; }
    }catch(e){}
    try{
      // 승리 음성의 후보 경로 목록을 만들고, 재생 성공할 때까지 순차적으로 시도합니다
      const STORAGE_KEY = 'skiff_custom_v1';
      let charId = null;
      try{ const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; charId = saved.character || saved.char || null; }catch(e){ charId = null; }
      if (!charId) charId = 'noel';
      const cap = charId.charAt(0).toUpperCase() + charId.slice(1);
      const voiceCandidates = [
        `assets/audio/character/${charId}_win_voice.wav`,
        `assets/audio/character/${cap}_win_voice.wav`,
        `assets/audio/character/${charId}/${charId}_win_voice.wav`,
        `assets/audio/character/${cap}/${cap}_win_voice.wav`,
        `assets/audio/character/${charId}/${cap}_win_voice.wav`,
        `assets/audio/character/${cap}/${charId}_win_voice.wav`,
      ];
      // 마지막 대체(fallback) 음성 경로
      voiceCandidates.push(`assets/audio/character/noel_win_voice.wav`);

      overlay._voiceAudio = null;
      (function tryPlay(i){
        if (i >= voiceCandidates.length) return;
        try{
          const src = voiceCandidates[i];
          const a = new Audio(src);
          a.loop = false;
          try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s && typeof s.voiceVolume === 'number') a.volume = s.voiceVolume; }catch(e){}
              // 재생이 성공하면 Audio 참조를 보관하고, 실패하면 다음 후보를 시도합니다
          a.play().then(()=>{ overlay._voiceAudio = a; }).catch(()=>{ try{ a.pause(); }catch(e){} tryPlay(i+1); });
        }catch(e){ tryPlay(i+1); }
      })(0);
    }catch(e){}

    // HUD 이미지 오른쪽에 배치할 액션 버튼 컨테이너(위: 다음, 아래: 나가기)를 생성합니다
    let actions = document.getElementById('game-win-actions');
    if (!actions){
      actions = document.createElement('div');
      actions.id = 'game-win-actions';
      document.body.appendChild(actions);
    }
    actions.style.position = 'fixed';
    actions.style.display = 'flex';
    actions.style.flexDirection = 'column';
    actions.style.gap = '8px';
    actions.style.alignItems = 'center';
    actions.style.zIndex = 10003;

    // 헬퍼: HUD 이미지 오른쪽에 버튼을 위치시키기 위한 계산(뷰포트 좌표 기준)
    function positionActions(){
      try{
        const canvasEl = document.getElementById('gameCanvas');
        const canvasRect = canvasEl ? canvasEl.getBoundingClientRect() : rect;
        const internalW = (Game && Game.width) ? Game.width : (canvasEl ? canvasEl.width : canvasRect.width);
        const internalH = (Game && Game.height) ? Game.height : (canvasEl ? canvasEl.height : canvasRect.height);

        const pad = (Game && Game.styles && typeof Game.styles.pad === 'number') ? Game.styles.pad : 12;
        const panelFractionLocal = (Game && Game.styles && typeof Game.styles.panelFraction === 'number') ? Game.styles.panelFraction : panelFraction;
        const panelW = Math.floor(internalW * (panelFractionLocal || 0.25));
        const barWidthVBase = (Game && Game.styles && Game.styles.barWidthVBase) ? Game.styles.barWidthVBase : 24;
        const barWidthV = Math.max(8, Math.floor(barWidthVBase * 0.7));
        const panelX = Math.max(100, internalW - panelW);
        const barX = panelX + pad;
        const barY = pad;
        const barHeightV = Math.max(80, internalH - pad*2);

        const baseSd = Math.min((Game && Game.styles && Game.styles.sdBase) ? Game.styles.sdBase : 64, barHeightV, panelW - (barWidthV + pad*2));
        let sdSize = Math.floor(baseSd * ((Game && Game.styles && Game.styles.sdScale) ? Game.styles.sdScale : 2.5));
        sdSize = Math.min(sdSize, Math.max(8, panelW - (barWidthV + pad*2)), barHeightV);
        const sdX = barX + barWidthV + 6;
        const sdY = barY + barHeightV - sdSize;

        const scaleX = canvasRect.width / (internalW || canvasRect.width || 1);
        const scaleY = canvasRect.height / (internalH || canvasRect.height || 1);
        const sdClientLeft = Math.round(canvasRect.left + sdX * scaleX);
        const sdClientTop = Math.round(canvasRect.top + sdY * scaleY);
        const sdClientRight = Math.round(sdClientLeft + sdSize * scaleX);
        const sdClientBottom = Math.round(sdClientTop + sdSize * scaleY);

        const gap = 8;
        const left = sdClientRight + gap;
        const totalBtnHeight = (nextBtn ? nextBtn.offsetHeight : 44) + (exitBtn ? exitBtn.offsetHeight : 44) + 8;
        const top = Math.max(8, sdClientBottom - totalBtnHeight);

        if (left + 100 > window.innerWidth) {
          actions.style.left = Math.max(8, sdClientLeft - gap - 100) + 'px';
        } else {
          actions.style.left = left + 'px';
        }
        actions.style.top = top + 'px';
        actions.style.right = '';
        actions.style.bottom = '';
      }catch(e){ /* 위치 계산 오류는 무시합니다 */ }
    }

    // '다음' 버튼 생성 (위쪽)
    let nextBtn = document.getElementById('game-win-next');
    if (!nextBtn){
      nextBtn = document.createElement('button');
      nextBtn.id = 'game-win-next';
      nextBtn.type = 'button';
      nextBtn.textContent = '다음';
      nextBtn.className = 'win-action-btn next';
      actions.appendChild(nextBtn);
    }
    // '나가기' 버튼 생성 (아래쪽)
    let exitBtn = document.getElementById('game-win-exit');
    if (!exitBtn){
      exitBtn = document.createElement('button');
      exitBtn.id = 'game-win-exit';
      exitBtn.type = 'button';
      exitBtn.textContent = '나가기';
      exitBtn.className = 'win-action-btn exit';
      actions.appendChild(exitBtn);
    }

    // 버튼들이 보이고 테마와 어울리도록 기본 인라인 스타일을 적용합니다
    [nextBtn, exitBtn].forEach(b => {
      if (!b) return;
      b.style.padding = '10px 14px';
      b.style.borderRadius = '8px';
      b.style.border = '1px solid rgba(255,255,255,0.06)';
      b.style.background = '#2f2f2f';
      b.style.color = '#fff';
      b.style.cursor = 'pointer';
      b.style.fontSize = '16px';
      b.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
    });

    // '다음' 동작: 일반적으로 사용되는 다음 스테이지 API들을 차례로 시도합니다
    const doNext = function(){
      try{ window.hideWin && window.hideWin(); }catch(e){}
      try{
        if (Game && typeof Game.nextStage === 'function'){
          Game.nextStage();
          return;
        }
        // 현재 스테이지 아이디가 'stage1'처럼 끝에 숫자가 있으면 숫자를 +1 하여 다음 스테이지를 시도합니다
        const stageId = (Game && (Game.currentStage || Game.currentStageId)) || (window.StageSelect && window.StageSelect.selected) || null;
        if (stageId && typeof stageId === 'string' && Game && typeof Game.startStage === 'function'){
          const m = stageId.match(/(.*?)(\d+)$/);
          if (m){
            const base = m[1];
            const num = parseInt(m[2],10);
            const next = base + String(num + 1);
            try{ Game.startStage(next).catch && Game.startStage(next).catch(console.error); return; }catch(e){}
          }
        }
        // 대체 행동: 게임을 재시작하거나 스테이지 선택 UI로 돌아갑니다
        if (Game && typeof Game.restart === 'function'){
          Game.restart();
          return;
        }
        // else show stage select
        const selectUI = document.getElementById('gameSelectUI');
        const startScreen = document.getElementById('startScreen');
        const canvasEl = document.getElementById('gameCanvas');
        const selectCanvas = document.getElementById('gameSelectCanvas');
        if (canvasEl) canvasEl.style.display = 'none';
        if (selectCanvas) selectCanvas.style.display = '';
        if (startScreen) { startScreen.style.display = 'none'; startScreen.setAttribute('aria-hidden','true'); }
        if (selectUI) { selectUI.style.display = ''; selectUI.removeAttribute('aria-hidden'); }
      }catch(e){ console.error('Next failed', e); }
    };
    // 연습 모드가 활성화되어 있으면 '다음' 버튼을 제거(또는 숨김). 연습은 진행을 허용하지 않습니다
    try{
      const practiceActive = (Game && Game.practiceMode) || (window.StageSelect && window.StageSelect.practice);
      if (practiceActive){
        try{ if (nextBtn && nextBtn.parentNode) nextBtn.parentNode.removeChild(nextBtn); }
        catch(e){}
      } else {
        nextBtn.addEventListener('click', function(){ doNext(); });
      }
    }catch(e){ nextBtn.addEventListener('click', function(){ doNext(); }); }

    // '나가기' 동작: 오버레이를 숨기고 시작 화면(또는 스테이지 선택)으로 돌아갑니다
    exitBtn.addEventListener('click', function(){
      try{ window.hideWin && window.hideWin(); }catch(e){}
      try{
        const selectUI = document.getElementById('gameSelectUI');
        const startScreen = document.getElementById('startScreen');
        const canvasEl = document.getElementById('gameCanvas');
        const selectCanvas = document.getElementById('gameSelectCanvas');
        if (canvasEl) canvasEl.style.display = 'none';
        if (selectCanvas) selectCanvas.style.display = '';
        if (startScreen) { startScreen.style.display = 'none'; startScreen.setAttribute('aria-hidden','true'); }
        if (selectUI) { selectUI.style.display = ''; selectUI.removeAttribute('aria-hidden'); }
        try{ if (window.StageSelect && typeof window.StageSelect.localize === 'function') window.StageSelect.localize(); }catch(e){}
        const btnCustomize = document.getElementById('customizeBtn'); if (btnCustomize) try{ btnCustomize.focus(); }catch(e){}
      }catch(e){ console.error(e); }
    });

    // 요소들이 생성되었으므로 버튼 위치를 계산해서 배치합니다; 이미지 로드나 창 크기 변경 시 재배치합니다
    try{ hudImg.addEventListener('load', positionActions); }catch(e){}
    setTimeout(function(){ positionActions(); }, 20);
    window.addEventListener('resize', positionActions);

    // 오버레이 제거(hide)용 공개 함수(hideWin)를 노출합니다
    window.hideWin = function(){
      try{ if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }catch(e){}
      try{ const t = document.getElementById('game-win-title'); if (t && t.parentNode) t.parentNode.removeChild(t); }catch(e){}
      try{ const h = document.getElementById('game-win-hud-img'); if (h && h.parentNode) h.parentNode.removeChild(h); }catch(e){}
      try{ const a = document.getElementById('game-win-actions'); if (a && a.parentNode) a.parentNode.removeChild(a); }catch(e){}
      try{ window.removeEventListener && window.removeEventListener('resize', positionActions); }catch(e){}
      try{ if (hudImg && hudImg.removeEventListener) hudImg.removeEventListener('load', positionActions); }catch(e){}
      try{ if (overlay && overlay._voiceAudio){ try{ overlay._voiceAudio.pause(); }catch(e){} overlay._voiceAudio = null; } }catch(e){}
    };
  };

})();
