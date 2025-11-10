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
      { id: 'rea', name: 'Rea', img: 'assets/custom/Rea_SD_LD.jpg' },
      { id: 'noa', name: 'Noa', img: 'assets/custom/Noa_SD_LD.jpg' },
      // placeholder for a third character; replace with a real file when available
      { id: 'third', name: 'Lia', img: 'assets/custom/Lia_SD_LD.jpg' }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal custom-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    modal.innerHTML = `
      <h2>커스터마이징</h2>
      <div class="custom-content" style="min-height:380px">
        <section class="char-select" aria-label="캐릭터 선택">
          <p class="sr-only">캐릭터 선택</p>
          <div class="character-list" role="listbox" aria-label="캐릭터 목록" style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px; -webkit-overflow-scrolling:touch;">
          </div>
        </section>
        <hr style="opacity:.06;margin:12px 0">
        <!-- future sections: ship/projectile selectors -->
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="custom-save">저장</button>
        <button class="close">닫기</button>
      </div>
    `;

    const saveBtn = modal.querySelector('.custom-save');
    const closeBtn = modal.querySelector('.close');
    const charListEl = modal.querySelector('.character-list');

    // backdrop and disable similar to other modals
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
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
    let selectedCharacter = (data && data.character) ? data.character : characters[0].id;
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

    // ensure scrolling centers the selected element
    function centerCharacter(el){
      const wrapper = charListEl;
      if (!wrapper || !el) return;
      const offsetLeft = el.offsetLeft + (el.offsetWidth / 2) - (wrapper.clientWidth / 2);
      wrapper.scrollTo({ left: offsetLeft, behavior: 'smooth' });
    }

    saveBtn.addEventListener('click', function(){
      // persist selected character into custom data
      const obj = Object.assign({}, data, { character: selectedCharacter, updated: Date.now() });
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
