/* Explanation module
   - Simple modal shell delegated from main.js for the "How to Play" / explanation screen
   - Starts with blank content and a Close button
   - Blocks background controls (btnStart, btnHow, btnSettings), traps focus, supports Escape to close
*/
(function(){
  'use strict';

  function readSettings(){
    try{ return JSON.parse(localStorage.getItem('skiff_settings_v1')||'{}') || {}; }catch(e){ return {}; }
  }

  function open(){
    // build modal
    const modal = document.createElement('div');
    modal.className = 'modal explanation-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    modal.innerHTML = `
      <h2>게임 설명</h2>
      <div class="explanation-content" style="min-height:60px"></div>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="close">닫기</button>
      </div>
    `;

    const closeBtn = modal.querySelector('.close');

    // backdrop and background-disabling logic (same ids as settings)
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const disableIds = ['btnStart','btnHow','btnSettings'];
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

    // wire close
    closeBtn.addEventListener('click', function(){ closeModal(); });

    // append and activate
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    disableBackgroundElements();
    document.addEventListener('keydown', onKeyDown, true);
    try{ setTimeout(()=>{ refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else closeBtn.focus(); }, 10); }catch(e){}
  }

  // expose API
  window.Explanation = window.Explanation || {};
  window.Explanation.open = open;

})();
