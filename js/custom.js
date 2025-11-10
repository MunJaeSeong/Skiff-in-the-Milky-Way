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

    const modal = document.createElement('div');
    modal.className = 'modal custom-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    modal.innerHTML = `
      <h2>커스터마이징</h2>
      <div class="custom-content" style="min-height:120px">
        <!-- Placeholder area: add character/projectile selectors here -->
        <p style="opacity:.7">캐릭터 및 발사체를 선택하는 UI를 여기에 추가하세요.</p>
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="custom-save">저장</button>
        <button class="close">닫기</button>
      </div>
    `;

    const saveBtn = modal.querySelector('.custom-save');
    const closeBtn = modal.querySelector('.close');

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

    saveBtn.addEventListener('click', function(){
      // collect customization state here; currently placeholder
      const obj = Object.assign({}, data, { updated: Date.now() });
      writeCustom(obj);
      // close and restore
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
