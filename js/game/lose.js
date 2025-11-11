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

    // expose hide function
    window.hideLose = function(){
      try{ if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }catch(e){}
      try{ const t = document.getElementById('game-lose-title'); if (t && t.parentNode) t.parentNode.removeChild(t); }catch(e){}
      try{ const h = document.getElementById('game-lose-hud-img'); if (h && h.parentNode) h.parentNode.removeChild(h); }catch(e){}
      // allow game to be resumed if desired
      if (Game && typeof Game.startStage === 'function'){
        // do not auto-restart stage; caller can restart
      }
    };
  };

})();
