(function(){
  'use strict';

  // showLose(options)
  // options: { image?: string, overlayAlpha?: number }
  window.showLose = function(options){
    options = options || {};
    const Game = window.Game || {};
    const canvas = (Game && Game.canvas) ? Game.canvas : document.getElementById('gameCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const panelFraction = (Game && Game.styles && typeof Game.styles.panelFraction === 'number') ? Game.styles.panelFraction : 0.25;
    const gameAreaW = Math.max(100, (Game && Game.width ? Game.width : rect.width) - Math.floor((Game && Game.width ? Game.width : rect.width) * panelFraction));

    // create overlay container positioned over the gameplay area (left side)
    let overlay = document.getElementById('game-lose-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'game-lose-overlay';
      document.body.appendChild(overlay);
    }

    // position and style overlay
    overlay.style.position = 'absolute';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = (gameAreaW) + 'px';
    overlay.style.height = (rect.height) + 'px';
    overlay.style.pointerEvents = 'auto';
    overlay.style.background = 'rgba(0,0,0,' + (typeof options.overlayAlpha === 'number' ? options.overlayAlpha : 0.6) + ')';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    // create image element
    const imgId = 'game-lose-img';
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
    // hide the centered overlay image (we'll show the lose image in the HUD area instead)
    img.style.display = 'none';

    // add LOSE title element in the top-left of the game overlay (relative to overlay)
    let titleEl = document.getElementById('game-lose-title');
    if (!titleEl){
      titleEl = document.createElement('div');
      titleEl.id = 'game-lose-title';
      titleEl.className = 'lose-title';
      overlay.appendChild(titleEl);
    }
    // position the title relative to the overlay (game area top-left)
  titleEl.style.position = 'absolute';
  titleEl.style.left = '40px';
  titleEl.style.top = '40px';
  titleEl.style.zIndex = '10002';
  // enforce font sizing and styles inline in case CSS isn't applying
  const titleSizePx = (options && options.titleSize) ? String(options.titleSize) + 'px' : '240px';
  titleEl.style.fontSize = titleSizePx;
  titleEl.style.lineHeight = '1';
  titleEl.style.color = '#ff6b6b';
  titleEl.style.fontWeight = '700';
  titleEl.style.letterSpacing = '4px';
  titleEl.style.textShadow = '0 2px 6px rgba(0,0,0,0.6), 0 0 24px rgba(255,107,107,0.12)';
  titleEl.style.pointerEvents = 'none';
  titleEl.textContent = (options && options.title) ? options.title : 'LOSE';

    // create a HUD-positioned lose image inside the overlay (right-bottom of game area)
    const hudImgId = 'game-lose-hud-img';
    let hudImg = document.getElementById(hudImgId);
    if (!hudImg){
      hudImg = document.createElement('img');
      hudImg.id = hudImgId;
      overlay.appendChild(hudImg);
    }
    hudImg.style.position = 'absolute';
    hudImg.style.right = '20px';
    hudImg.style.bottom = '20px';
  // make the hud image 3x larger than previous default (240 -> 720) but constrained to game area
  hudImg.style.maxWidth = Math.floor(Math.min(720, gameAreaW * 0.75)) + 'px';
  hudImg.style.maxHeight = Math.floor(rect.height * 0.75) + 'px';
    hudImg.style.objectFit = 'contain';
    hudImg.style.pointerEvents = 'none';
    hudImg.style.zIndex = 10002;
    hudImg.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))';

    // Build candidate lose image paths based on saved custom selection (if any)
    const STORAGE_KEY = 'skiff_custom_v1';
    let charId = null;
    try{ const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; charId = saved.character; }catch(e){ charId = null; }
    const candidates = [];
    if (options.image) candidates.push(options.image);
    if (charId && typeof charId === 'string'){
      const cap = charId.charAt(0).toUpperCase() + charId.slice(1);
      // common possible locations / name styles
      candidates.push(`assets/character/${charId}/${charId}_lose.png`);
      candidates.push(`assets/character/${charId}/${cap}_lose.png`);
      candidates.push(`assets/character/${cap}/${cap}_lose.png`);
      candidates.push(`assets/character/${cap}_lose.png`);
      candidates.push(`assets/character/${charId}_lose.png`);
      candidates.push(`assets/character/${cap}/${charId}_lose.png`);
    }
    // fallback
    candidates.push('assets/character/noel/Noel_lose.png');

    // try candidates in order for the HUD image; reuse same candidates for hudImg
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

    // show overlay
    overlay.style.visibility = 'visible';

    // stop background music (if started by Game) and play character lose voice once
    try{
      if (window.Game && window.Game._bgmAudio){ try{ window.Game._bgmAudio.pause(); }catch(e){} window.Game._bgmAudio = null; }
    }catch(e){}
    try{
      // determine character id from saved custom key
      const STORAGE_KEY = 'skiff_custom_v1';
      let charId = null;
      try{ const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; charId = saved.character || saved.char || null; }catch(e){ charId = null; }
      if (!charId) charId = 'noel';
      const voicePath = `assets/audio/character/${charId}_lose_voice.wav`;
      const a = new Audio(voicePath);
      a.loop = false;
      try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s && typeof s.voiceVolume === 'number') a.volume = s.voiceVolume; }catch(e){}
      a.play().catch(()=>{});
      overlay._voiceAudio = a;
    }catch(e){}

    // create action buttons container (Restart above Exit) positioned to the right of the HUD image
    let actions = document.getElementById('game-lose-actions');
    if (!actions){
      actions = document.createElement('div');
      actions.id = 'game-lose-actions';
      // append to body so we can position relative to viewport (score panel may be outside overlay)
      document.body.appendChild(actions);
    }
    // initial layout: fixed so we can place it next to the HUD/SD character in the score area
    actions.style.position = 'fixed';
    actions.style.display = 'flex';
    actions.style.flexDirection = 'column';
    actions.style.gap = '8px';
    actions.style.alignItems = 'center';
    actions.style.zIndex = 10003;

    // helper: position actions to the right of the hud image (viewport coordinates)
    function positionActions(){
      try{
        // Prefer to position relative to the small SD portrait drawn on the game canvas.
        const canvasEl = document.getElementById('gameCanvas');
        const canvasRect = canvasEl ? canvasEl.getBoundingClientRect() : rect;
        // internal game resolution fallback
        const internalW = (Game && Game.width) ? Game.width : (canvasEl ? canvasEl.width : canvasRect.width);
        const internalH = (Game && Game.height) ? Game.height : (canvasEl ? canvasEl.height : canvasRect.height);

        // derive HUD panel layout (same math as gameScript.render)
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

        // map internal coordinates to client pixels
        const scaleX = canvasRect.width / (internalW || canvasRect.width || 1);
        const scaleY = canvasRect.height / (internalH || canvasRect.height || 1);
        const sdClientLeft = Math.round(canvasRect.left + sdX * scaleX);
        const sdClientTop = Math.round(canvasRect.top + sdY * scaleY);
        const sdClientRight = Math.round(sdClientLeft + sdSize * scaleX);
        const sdClientBottom = Math.round(sdClientTop + sdSize * scaleY);

        // place actions to the right of the SD portrait with a small gap
        const gap = 8;
        const left = sdClientRight + gap;
        // vertically align so buttons stack near the SD bottom
        const totalBtnHeight = (restartBtn ? restartBtn.offsetHeight : 44) + (exitBtn ? exitBtn.offsetHeight : 44) + 8;
        const top = Math.max(8, sdClientBottom - totalBtnHeight);

        // if calculated left would overflow viewport, fallback to placing left of SD
        if (left + 100 > window.innerWidth) {
          actions.style.left = Math.max(8, sdClientLeft - gap - 100) + 'px';
        } else {
          actions.style.left = left + 'px';
        }
        actions.style.top = top + 'px';
        // clear any bottom/right anchors
        actions.style.right = '';
        actions.style.bottom = '';
      }catch(e){ /* ignore positioning errors */ }
    }

    // create Restart button (위에)
    let restartBtn = document.getElementById('game-lose-restart');
    if (!restartBtn){
      restartBtn = document.createElement('button');
      restartBtn.id = 'game-lose-restart';
      restartBtn.type = 'button';
      restartBtn.textContent = '재시작';
      restartBtn.className = 'lose-action-btn restart';
      actions.appendChild(restartBtn);
    }
    // create Exit button (아래)
    let exitBtn = document.getElementById('game-lose-exit');
    if (!exitBtn){
      exitBtn = document.createElement('button');
      exitBtn.id = 'game-lose-exit';
      exitBtn.type = 'button';
      exitBtn.textContent = '나가기';
      exitBtn.className = 'lose-action-btn exit';
      actions.appendChild(exitBtn);
    }

    // basic inline styles so the buttons are visible and match the dark theme
    [restartBtn, exitBtn].forEach(b => {
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

    // restart behavior: try common restart APIs in order
    const doRestart = function(){
      try{
        // hide overlay first
        window.hideLose && window.hideLose();
      }catch(e){}
      try{
        if (Game && typeof Game.restart === 'function'){
          Game.restart();
          return;
        }
        // attempt to reuse known identifiers
        const stageId = (Game && (Game.currentStage || Game.currentStageId)) || (window.StageSelect && window.StageSelect.selected) || null;
        if (Game && typeof Game.startStage === 'function' && stageId){
          Game.startStage(stageId).catch && Game.startStage(stageId).catch(console.error);
          return;
        }
        // fallback: try to re-init and start stage1
        if (Game && typeof Game.init === 'function'){
          try{ Game.init && Game.init('gameCanvas'); }catch(e){}
          if (typeof Game.startStage === 'function') Game.startStage('stage1').catch && Game.startStage('stage1').catch(console.error);
        }
      }catch(e){ console.error('Restart failed', e); }
    };

  restartBtn.addEventListener('click', function(){ doRestart(); });

    // exit behavior: hide overlay and return to start screen
    exitBtn.addEventListener('click', function(){
      try{ window.hideLose && window.hideLose(); }catch(e){}
      try{
        // Show the stage-select UI instead of the start/title screen
        const selectUI = document.getElementById('gameSelectUI');
        const startScreen = document.getElementById('startScreen');
        const canvasEl = document.getElementById('gameCanvas');
        const selectCanvas = document.getElementById('gameSelectCanvas');
        if (canvasEl) canvasEl.style.display = 'none';
        if (selectCanvas) selectCanvas.style.display = '';
        if (startScreen) { startScreen.style.display = 'none'; startScreen.setAttribute('aria-hidden','true'); }
        if (selectUI) { selectUI.style.display = ''; selectUI.removeAttribute('aria-hidden'); }
        // refresh select UI localization if available
        try{ if (window.StageSelect && typeof window.StageSelect.localize === 'function') window.StageSelect.localize(); }catch(e){}
        const btnCustomize = document.getElementById('customizeBtn'); if (btnCustomize) try{ btnCustomize.focus(); }catch(e){}
      }catch(e){ console.error(e); }
    });

    // position actions now that elements exist; reposition on image load and window resize
    try{
      // if the hud image loads later, reposition after load
      // attach the handler directly so it can be removed later
      hudImg.addEventListener('load', positionActions);
    }catch(e){}
    // small timeout to allow layout and then position
    setTimeout(function(){ positionActions(); }, 20);
    window.addEventListener('resize', positionActions);

    // expose hide function
    window.hideLose = function(){
      try{ if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }catch(e){}
      try{ const t = document.getElementById('game-lose-title'); if (t && t.parentNode) t.parentNode.removeChild(t); }catch(e){}
      try{ const h = document.getElementById('game-lose-hud-img'); if (h && h.parentNode) h.parentNode.removeChild(h); }catch(e){}
      try{ const a = document.getElementById('game-lose-actions'); if (a && a.parentNode) a.parentNode.removeChild(a); }catch(e){}
      try{ window.removeEventListener && window.removeEventListener('resize', positionActions); }catch(e){}
      try{ if (hudImg && hudImg.removeEventListener) hudImg.removeEventListener('load', positionActions); }catch(e){}
      try{ if (overlay && overlay._voiceAudio){ try{ overlay._voiceAudio.pause(); }catch(e){} overlay._voiceAudio = null; } }catch(e){}
      // allow game to be resumed if desired
      if (Game && typeof Game.startStage === 'function'){
        // do not auto-restart stage; caller can restart
      }
    };
  };

})();
