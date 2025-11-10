/* Customization module
   - Modal UI for player customization (character/projectile selection etc.)
   - Provides Save and Close buttons
   - Blocks background controls while open, traps focus, supports Escape-to-close
   - Persists a simple placeholder object to localStorage at key 'skiff_custom_v1'
*/
(function(){
  'use strict';

  const STORAGE_KEY = 'skiff_custom_v1';

  function readCustom(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }catch(e){ return {}; }
  }
  function writeCustom(obj){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(e){}
  }

  function open(){
    const data = readCustom();
    // character list - maintainable array so more can be added easily
    const characters = [
      // image files are stored under assets/custom/ in the repo
      { id: 'rea', name: 'Rea', img: 'assets/character/Rea.jpg' },
      { id: 'noa', name: 'Noa', img: 'assets/character/Noa.jpg' },
      // placeholder for a third character; replace with a real file when available
      { id: 'noel', name: 'Noel', img: 'assets/character/Noel.jpg' }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal custom-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    modal.innerHTML = `
      <h2 style="margin:0 0 12px 0">커스터마이징</h2>
      <div class="custom-content" style="flex:1; display:flex; gap:16px; align-items:flex-start; overflow:hidden;">
        <aside class="my-page" aria-label="내 정보" style="width:300px;flex:0 0 300px;padding:12px;border-right:1px solid rgba(255,255,255,0.03);">
          <h3 style="margin:0 0 8px 0;color:#fff;font-size:18px">My Page</h3>
          <div class="my-preview" style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:8px;">
            <div class="my-ship-thumb" style="width:240px;height:120px;background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#071018;border-radius:6px;"></div>
            <div class="my-char-thumb" style="width:180px;height:180px;background-size:cover;background-position:center;border-radius:8px;background-color:#111;border:1px solid rgba(255,255,255,0.04);"></div>
            <div class="my-names" style="text-align:center;">
              <div class="my-ship-name" style="color:#fff;font-size:18px;margin-top:6px"></div>
              <div class="my-char-name" style="color:#fff;font-size:20px;font-weight:600;margin-top:6px"></div>
              <div class="my-projectile" style="margin-top:8px;">
                <div class="my-projectile-thumb" style="width:80px;height:40px;margin:6px auto;background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#071018;border-radius:6px;"></div>
                <div class="my-projectile-name" style="color:#fff;font-size:14px;margin-top:6px"></div>
              </div>
            </div>
          </div>
        </aside>
        <div class="custom-right" style="flex:1; display:flex; flex-direction:column; overflow:auto; padding-left:12px;">
          <div class="selection-tabs" style="display:flex;gap:8px;margin-bottom:8px;">
            <button class="tab-btn tab-char" type="button" style="padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:#111;color:#fff;cursor:pointer">캐릭터</button>
            <button class="tab-btn tab-ship" type="button" style="padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#ccc;cursor:pointer">조각배</button>
            <button class="tab-btn tab-projectile" type="button" style="padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#ccc;cursor:pointer">발사체</button>
          </div>
          <section class="char-select" aria-label="캐릭터 선택">
            <p class="sr-only">캐릭터 선택</p>
            <div class="character-list" role="listbox" aria-label="캐릭터 목록" style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px; -webkit-overflow-scrolling:touch;">
            </div>
          </section>
          <hr style="opacity:.06;margin:12px 0">
          <!-- ship (조각배) selector: start with one ship and leave commented examples for adding more -->
          <section class="ship-select" aria-label="조각배 선택" style="margin-top:8px">
            <p class="sr-only">조각배 선택</p>
            <div class="ship-list" role="listbox" aria-label="조각배 목록" style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;padding:8px;">
            </div>
          </section>
          <hr style="opacity:.06;margin:12px 0">
          <!-- projectile selector -->
          <section class="projectile-select" aria-label="발사체 선택" style="margin-top:8px">
            <p class="sr-only">발사체 선택</p>
            <div class="projectile-list" role="listbox" aria-label="발사체 목록" style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;padding:8px;">
            </div>
          </section>
        </div>
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="custom-save">저장</button>
        <button class="close">닫기</button>
      </div>
    `;

  const saveBtn = modal.querySelector('.custom-save');
  const closeBtn = modal.querySelector('.close');
  const charListEl = modal.querySelector('.character-list');
  const myShipThumbEl = modal.querySelector('.my-ship-thumb');
  const myCharThumbEl = modal.querySelector('.my-char-thumb');
  const myShipNameEl = modal.querySelector('.my-ship-name');
  const myCharNameEl = modal.querySelector('.my-char-name');
  const customRightEl = modal.querySelector('.custom-right');
  const tabCharBtn = modal.querySelector('.tab-char');
  const tabShipBtn = modal.querySelector('.tab-ship');
  const tabProjectileBtn = modal.querySelector('.tab-projectile');
  const charSection = modal.querySelector('.char-select');
  const shipSection = modal.querySelector('.ship-select');
  const projectileSection = modal.querySelector('.projectile-select');

    // backdrop and disable similar to other modals
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    // Make sure backdrop fully covers the screen and sits below the modal
    try{
      backdrop.style.position = 'fixed';
      backdrop.style.left = '0';
      backdrop.style.top = '0';
      backdrop.style.width = '100%';
      backdrop.style.height = '100%';
      backdrop.style.background = 'rgba(0,0,0,0.72)';
      backdrop.style.zIndex = '10000';
    }catch(e){}
    const disableIds = ['btnStart','btnHow','btnSettings','customizeBtn','practiceMode','stageList'];
    const disabledElements = [];
    function disableBackgroundElements(){
      disableIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.dataset._wasDisabled = el.disabled ? '1' : '0';
        try{ el.disabled = true; }catch(e){}
        el.dataset._wasTabIndex = el.getAttribute('tabindex') || '';
        el.setAttribute('tabindex','-1');
        disabledElements.push(el);
      });
    }
    function restoreBackgroundElements(){
      disabledElements.forEach(el => {
        try{ el.disabled = (el.dataset._wasDisabled === '1'); }catch(e){}
        const prev = el.dataset._wasTabIndex;
        if (prev === '') el.removeAttribute('tabindex'); else el.setAttribute('tabindex', prev);
        delete el.dataset._wasDisabled;
        delete el.dataset._wasTabIndex;
      });
      disabledElements.length = 0;
    }

    function closeModal(){
      try{ modal.remove(); }catch(e){}
      try{ backdrop.remove(); }catch(e){}
      restoreBackgroundElements();
      document.removeEventListener('keydown', onKeyDown, true);
    }

    // style modal so it doesn't let page content show through and stays on-screen
    try{
      // modal becomes a fixed column container so we can keep the header and my-page fixed
      modal.style.position = 'fixed';
      modal.style.left = '50%';
      modal.style.top = '6vh';
      modal.style.transform = 'translateX(-50%)';
      modal.style.width = '90vw';
      modal.style.maxWidth = '1200px';
      modal.style.height = '84vh';
      modal.style.background = '#070707';
      modal.style.padding = '18px';
      modal.style.borderRadius = '10px';
      modal.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
      // make modal a column flex so inner areas can be independently scrollable
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      // prevent the whole page from scrolling when modal is open; inner panes will scroll
      modal.style.overflow = 'hidden';
      modal.style.zIndex = '10001';
    }catch(e){}

    // Ensure the right pane can scroll vertically inside the fixed modal.
    // Important: in a flex layout, children must allow shrinking (min-height:0)
    try{
      if (customRightEl){
        customRightEl.style.minHeight = '0';
        customRightEl.style.overflowY = 'auto';
        customRightEl.style.webkitOverflowScrolling = 'touch';
      }
      if (charListEl){
        // character-list should not force the parent to grow vertically
        charListEl.style.flex = '0 0 auto';
      }
      if (shipListEl){ shipListEl.style.flex = '0 0 auto'; }
      if (projectileListEl){ projectileListEl.style.flex = '0 0 auto'; }
    }catch(e){}

    // focus trap
    const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let focusableInside = [];
    function refreshFocusable(){ focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null); }

    function onKeyDown(e){
      if (e.key === 'Escape'){ e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab'){
        refreshFocusable();
        if (focusableInside.length === 0){ e.preventDefault(); return; }
        const first = focusableInside[0];
        const last = focusableInside[focusableInside.length-1];
        if (e.shiftKey){ if (document.activeElement === first || !modal.contains(document.activeElement)){ e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last){ e.preventDefault(); first.focus(); } }
      }
    }

  // render character items dynamically from the characters array
  // default character 'rea' per user request, fallback to first array entry
  let selectedCharacter = (data && data.character) ? data.character : 'rea';
    function createCharacterItem(ch){
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'character-item';
      item.setAttribute('role','option');
      item.setAttribute('aria-selected','false');
  // make the character item large so thumbnails are more visible
  item.style.minWidth = '320px';
  item.style.scrollSnapAlign = 'center';
      item.style.border = '1px solid rgba(255,255,255,0.06)';
      item.style.background = 'transparent';
      item.style.padding = '6px';
      item.style.borderRadius = '8px';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'center';
      item.style.gap = '8px';
      item.style.cursor = 'pointer';
      item.tabIndex = 0;

      const thumb = document.createElement('div');
      thumb.className = 'char-thumb';
  // increase thumbnail size ~4x as requested
  thumb.style.width = '320px';
  thumb.style.height = '320px';
      thumb.style.borderRadius = '6px';
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
      thumb.style.backgroundColor = '#111';
      // set image if available
      if (ch.img) thumb.style.backgroundImage = `url('${ch.img}')`;

  const label = document.createElement('div');
  label.textContent = ch.name || ch.id;
  // make the character name clearly visible: white and larger (approx. 2x)
  label.style.fontSize = '32px';
  label.style.color = '#ffffff';
  label.style.fontWeight = '600';
  label.style.opacity = '1';

      item.appendChild(thumb);
      item.appendChild(label);

      function updateSelectedVisual(active){
        if (active){
          item.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
          item.style.border = '2px solid #6cf';
          item.setAttribute('aria-selected','true');
        } else {
          item.style.boxShadow = 'none';
          item.style.border = '1px solid rgba(255,255,255,0.06)';
          item.setAttribute('aria-selected','false');
        }
      }

      item.addEventListener('click', function(){
        selectedCharacter = ch.id;
        // update visuals for all siblings
        Array.from(charListEl.children).forEach(c => c._updateSelected(false));
        updateSelectedVisual(true);
        item._updateSelected = updateSelectedVisual;
        // center and update the My Page preview
        centerCharacter(item);
        try{ updateMyPage(); }catch(e){}
      });

      item.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.click(); }
        // allow arrow navigation between items
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft'){
          ev.preventDefault();
          const siblings = Array.from(charListEl.querySelectorAll('.character-item'));
          const idx = siblings.indexOf(item);
          let nextIdx = idx + (ev.key === 'ArrowRight' ? 1 : -1);
          if (nextIdx < 0) nextIdx = 0;
          if (nextIdx >= siblings.length) nextIdx = siblings.length - 1;
          const next = siblings[nextIdx];
          if (next){ next.focus(); next.click(); }
        }
      });

      // helper so we can call to set initial state
      item._updateSelected = updateSelectedVisual;

      return item;
    }

    // populate list
    characters.forEach(ch => {
      const el = createCharacterItem(ch);
      charListEl.appendChild(el);
    });

    // --- ship list ---
    // start with one ship; add more by adding objects to the `ships` array below
    const ships = [
      { id: 'woodskiff', name: 'Wood Skiff', img: 'assets/skiffs/woodskiff.png' }
      // example additional ship:
      // { id: 'metalsskiff', name: 'Metal Skiff', img: 'assets/skiffs/metalsskiff.png' }
    ];
    const shipListEl = modal.querySelector('.ship-list');
    const projectileListEl = modal.querySelector('.projectile-list');
    const myProjectileThumbEl = modal.querySelector('.my-projectile-thumb');
    const myProjectileNameEl = modal.querySelector('.my-projectile-name');
  // default ship 'woodskiff' per user request
  let selectedShip = (data && data.ship) ? data.ship : 'woodskiff';
  // projectiles: keep maintainable array; add entries matching files under assets/projectile/
  const projectiles = [
    // Example entries - replace or add to match files in assets/projectile/
    { id: 'basic', name: 'Basic Shot', img: 'assets/projectile/투사체1.jpg' },
    { id: 'fast', name: 'Fast Bolt', img: 'assets/projectile/투사체2.jpg' },
    { id: 'heavy', name: 'Heavy Shell', img: 'assets/projectile/투사체3.jpg' },
    { id: 'energy', name: 'Energy Pulse', img: 'assets/projectile/투사체4.jpg' },
    { id: 'plasma', name: 'Plasma Beam', img: 'assets/projectile/투사체5.jpg' },
    { id: 'quantum', name: 'Quantum Ray', img: 'assets/projectile/투사체6.jpg' }
  ];
  let selectedProjectile = (data && data.projectile) ? data.projectile : (projectiles[0] && projectiles[0].id) || '';
    function createShipItem(s){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ship-item';
      btn.setAttribute('role','option');
      btn.setAttribute('aria-selected','false');
      btn.style.minWidth = '220px';
      btn.style.padding = '8px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid rgba(255,255,255,0.06)';
      btn.style.background = 'transparent';
      btn.style.display = 'flex';
      btn.style.flexDirection = 'column';
      btn.style.alignItems = 'center';
      btn.style.gap = '8px';
      btn.tabIndex = 0;

      const thumb = document.createElement('div');
      thumb.style.width = '200px';
      thumb.style.height = '120px';
      thumb.style.backgroundSize = 'contain';
      thumb.style.backgroundRepeat = 'no-repeat';
      thumb.style.backgroundPosition = 'center';
      thumb.style.backgroundColor = '#071018';
      if (s.img) thumb.style.backgroundImage = `url('${s.img}')`;

      const lbl = document.createElement('div');
      lbl.textContent = s.name || s.id;
      lbl.style.color = '#fff';
      lbl.style.fontSize = '18px';

      btn.appendChild(thumb);
      btn.appendChild(lbl);

      btn.addEventListener('click', function(){
        selectedShip = s.id;
        Array.from(shipListEl.children).forEach(c => c._updateSelected && c._updateSelected(false));
        updateShipSelectedVisual(btn, true);
        try{ updateMyPage(); }catch(e){}
      });
      btn.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); } });
      btn._updateSelected = function(active){ updateShipSelectedVisual(btn, active); };
      return btn;
    }
    function updateShipSelectedVisual(btn, active){
      if (active){ btn.style.border = '2px solid #6cf'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)'; btn.setAttribute('aria-selected','true'); }
      else { btn.style.border = '1px solid rgba(255,255,255,0.06)'; btn.style.boxShadow = 'none'; btn.setAttribute('aria-selected','false'); }
    }
    ships.forEach(s => { const el = createShipItem(s); shipListEl.appendChild(el); });
    // set initial ship selection visual
    Array.from(shipListEl.children).forEach((b,i) => { b._updateSelected(ships[i].id === selectedShip); });
  // make sure ship list doesn't force the parent to expand vertically
  try{ if (shipListEl) { shipListEl.style.flex = '0 0 auto'; shipListEl.style.marginBottom = '12px'; } }catch(e){}
  // render projectiles if any
  try{
    if (projectileListEl){
      function createProjectileItem(p){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'projectile-item';
        btn.setAttribute('role','option');
        btn.setAttribute('aria-selected','false');
        btn.style.minWidth = '120px';
        btn.style.padding = '8px';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid rgba(255,255,255,0.06)';
        btn.style.background = 'transparent';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'center';
        btn.style.gap = '8px';
        btn.tabIndex = 0;

        const thumb = document.createElement('div');
        thumb.style.width = '80px';
        thumb.style.height = '40px';
        thumb.style.backgroundSize = 'contain';
        thumb.style.backgroundRepeat = 'no-repeat';
        thumb.style.backgroundPosition = 'center';
        thumb.style.backgroundColor = '#071018';
        if (p.img) thumb.style.backgroundImage = `url('${p.img}')`;

        const lbl = document.createElement('div');
        lbl.textContent = p.name || p.id;
        lbl.style.color = '#fff';
        lbl.style.fontSize = '14px';

        btn.appendChild(thumb);
        btn.appendChild(lbl);

        btn.addEventListener('click', function(){
          selectedProjectile = p.id;
          Array.from(projectileListEl.children).forEach(c => c._updateSelected && c._updateSelected(false));
          updateProjectileSelectedVisual(btn, true);
          try{ updateMyPage(); }catch(e){}
        });
        btn.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); } });
        btn._updateSelected = function(active){ updateProjectileSelectedVisual(btn, active); };
        return btn;
      }
      function updateProjectileSelectedVisual(btn, active){ if (active){ btn.style.border = '2px solid #6cf'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)'; btn.setAttribute('aria-selected','true'); } else { btn.style.border = '1px solid rgba(255,255,255,0.06)'; btn.style.boxShadow = 'none'; btn.setAttribute('aria-selected','false'); } }
      projectiles.forEach(p => { const el = createProjectileItem(p); projectileListEl.appendChild(el); });
      Array.from(projectileListEl.children).forEach((b,i) => { b._updateSelected(projectiles[i].id === selectedProjectile); });
      if (projectileListEl) { projectileListEl.style.flex = '0 0 auto'; }
    }
  }catch(e){}

  // Tab switching logic: show the selected section and update tab styles
  try{
    function setActiveTab(which){
      const activeBg = '#111';
      const inactiveColor = '#ccc';
      const activeColor = '#fff';
      // show/hide sections
      if (charSection) charSection.style.display = (which === 'char') ? '' : 'none';
      if (shipSection) shipSection.style.display = (which === 'ship') ? '' : 'none';
      if (projectileSection) projectileSection.style.display = (which === 'projectile') ? '' : 'none';
      // update buttons
      if (tabCharBtn) { tabCharBtn.style.background = (which === 'char') ? activeBg : 'transparent'; tabCharBtn.style.color = (which === 'char') ? activeColor : inactiveColor; }
      if (tabShipBtn) { tabShipBtn.style.background = (which === 'ship') ? activeBg : 'transparent'; tabShipBtn.style.color = (which === 'ship') ? activeColor : inactiveColor; }
      if (tabProjectileBtn) { tabProjectileBtn.style.background = (which === 'projectile') ? activeBg : 'transparent'; tabProjectileBtn.style.color = (which === 'projectile') ? activeColor : inactiveColor; }
    }
    if (tabCharBtn) tabCharBtn.addEventListener('click', function(){ setActiveTab('char'); });
    if (tabShipBtn) tabShipBtn.addEventListener('click', function(){ setActiveTab('ship'); });
    if (tabProjectileBtn) tabProjectileBtn.addEventListener('click', function(){ setActiveTab('projectile'); });
    // accessible keyboard activation
    [tabCharBtn, tabShipBtn, tabProjectileBtn].forEach(b => { if (!b) return; b.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } }); });
    // default to character tab
    setActiveTab('char');
  }catch(e){}

    // set initial selection visual and center selected
    Array.from(charListEl.children).forEach((btn, i) => {
      const id = characters[i].id;
      const active = (id === selectedCharacter);
      btn._updateSelected(active);
      if (active){
        // center this item in the scroll container
        setTimeout(()=>{ centerCharacter(btn); }, 50);
      }
    });

    // update the left-side My Page preview
    function updateMyPage(){
      // find character and ship objects
      const ch = characters.find(c => c.id === selectedCharacter) || characters[0];
      const sh = ships.find(s => s.id === selectedShip) || ships[0];
      const pj = projectiles.find(p => p.id === selectedProjectile) || projectiles[0];
      // update thumbnails and names
      if (myCharThumbEl){
        if (ch && ch.img) myCharThumbEl.style.backgroundImage = `url('${ch.img}')`;
        else myCharThumbEl.style.backgroundImage = '';
      }
      if (myShipThumbEl){
        if (sh && sh.img) myShipThumbEl.style.backgroundImage = `url('${sh.img}')`;
        else myShipThumbEl.style.backgroundImage = '';
      }
      if (myProjectileThumbEl){
        if (pj && pj.img) myProjectileThumbEl.style.backgroundImage = `url('${pj.img}')`;
        else myProjectileThumbEl.style.backgroundImage = '';
      }
      if (myCharNameEl) myCharNameEl.textContent = ch ? (ch.name || ch.id) : '';
      if (myShipNameEl) myShipNameEl.textContent = sh ? (sh.name || sh.id) : '';
      if (myProjectileNameEl) myProjectileNameEl.textContent = pj ? (pj.name || pj.id) : '';
    }
    try{ updateMyPage(); }catch(e){}

    // ensure scrolling centers the selected element
    function centerCharacter(el){
      const wrapper = charListEl;
      if (!wrapper || !el) return;
      const offsetLeft = el.offsetLeft + (el.offsetWidth / 2) - (wrapper.clientWidth / 2);
      wrapper.scrollTo({ left: offsetLeft, behavior: 'smooth' });
    }

    saveBtn.addEventListener('click', function(){
      // persist selected character and ship into custom data
      const obj = Object.assign({}, data, { character: selectedCharacter, ship: selectedShip, projectile: selectedProjectile, updated: Date.now() });
      writeCustom(obj);
      try{ closeModal(); }catch(e){}
    });

    closeBtn.addEventListener('click', function(){
      try{ closeModal(); }catch(e){}
    });

    // append and activate
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    disableBackgroundElements();
    document.addEventListener('keydown', onKeyDown, true);
    try{ setTimeout(()=>{ refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else saveBtn.focus(); }, 10); }catch(e){}
  }

  window.Custom = window.Custom || {};
  window.Custom.open = open;

})();
