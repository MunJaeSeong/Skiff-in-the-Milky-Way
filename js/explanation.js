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

    // determine language and translations (prefer window.Settings when available)
    let lang = 'ko';
    try{ if (window.Settings && typeof window.Settings.get === 'function') lang = window.Settings.get().language || lang; else { const s = readSettings(); lang = s.language || lang; } }catch(e){ /* ignore */ }
    let rootTrans = (window.Settings && window.Settings.translations && window.Settings.translations[lang]) ? window.Settings.translations[lang] : null;

    function t(path, fallback){
      // path: 'close' or 'explanation.pages.about' etc.
      if (!rootTrans) return fallback;
      try{
        const parts = path.split('.');
        let cur = rootTrans;
        for (let p of parts){ if (cur && Object.prototype.hasOwnProperty.call(cur,p)) cur = cur[p]; else return fallback; }
        return (typeof cur === 'string') ? cur : fallback;
      }catch(e){ return fallback; }
    }

    const closeLabel = t('close','닫기');
    const prevAria = t('explanation.prevAria','이전 페이지');
    const nextAria = t('explanation.nextAria','다음 페이지');
    const headerTitle = t('how','게임 설명');

    // modal structure with pagination controls (prev/next)
    modal.innerHTML = `
      <div class="explanation-header" style="display:flex;align-items:center;justify-content:space-between;">
        <h2 id="explanation-title">${headerTitle}</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="close">${closeLabel}</button>
        </div>
      </div>
      <div style="position:relative;min-height:120px;display:flex;align-items:center;">
        <button class="explain-prev" aria-label="${prevAria}" style="position:absolute;left:8px;">◀</button>
        <div class="explanation-content" style="width:100%;padding:8px 48px;box-sizing:border-box;min-height:60px;">
        </div>
        <button class="explain-next" aria-label="${nextAria}" style="position:absolute;right:8px;">▶</button>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;">
        <div class="explain-pagination" aria-hidden="true" style="display:flex;gap:6px;align-items:center;"></div>
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
      try{ document.removeEventListener('languagechange', onLanguageChange); }catch(e){}
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
      // allow left/right arrow keys to navigate pages if pagination exists
      if (e.key === 'ArrowLeft'){
        try{ if (typeof prevPage === 'function'){ e.preventDefault(); prevPage(); } }catch(err){}
      }
      if (e.key === 'ArrowRight'){
        try{ if (typeof nextPage === 'function'){ e.preventDefault(); nextPage(); } }catch(err){}
      }
    }

    // wire close
    closeBtn.addEventListener('click', function(){ closeModal(); });

  // -- Pagination: pages array and navigation functions
  // Use translations when available (window.Settings.translations)
  function localTitle(key, fallback){
      // try explanation pages in translations: explanation.pages.{key}
      try{
        if (window.Settings && window.Settings.translations){
          const langCode = (window.Settings.get && window.Settings.get().language) || (readSettings().language) || 'ko';
          const root = window.Settings.translations[langCode] || window.Settings.translations.ko;
          if (root && root.explanation && root.explanation.pages && root.explanation.pages[key]) return root.explanation.pages[key];
          // fallback to characters names if relevant
          if (key === 'char-rea' && root.characters && root.characters.rea) return (root.characters.rea);
          if (key === 'char-noa' && root.characters && root.characters.noa) return (root.characters.noa);
          if (key === 'char-noel' && root.characters && root.characters.noel) return (root.characters.noel);
        }
      }catch(e){ }
      return fallback;
    }

    function localHtml(key, fallback){
      try{
        if (window.Settings && window.Settings.translations){
          const langCode = (window.Settings.get && window.Settings.get().language) || (readSettings().language) || 'ko';
          const root = window.Settings.translations[langCode] || window.Settings.translations.ko;
          if (root && root.explanation && root.explanation.content && root.explanation.content[key]) return root.explanation.content[key];
        }
      }catch(e){ }
      return fallback;
    }

    const pages = [
      { id: 'about', fallbackTitle: '설명', fallbackHtml: `<ol>
        <li>날아오는 탄막을 피해 몬스터를 처치하세요.</li>
        <li>몬스터의 체력은 화면 상단의 흰색 막대로 표시됩니다.</li>
        <li>플레이어의 체력은 우측 스코어 섹션의 빨간 막대로 표시됩니다.</li>
      </ol>` },
      { id: 'controls', fallbackTitle: '조작키', fallbackHtml: `<ol>
        <li>←키(방향키) -- 왼쪽으로 이동</li>
        <li>→키(방향키) -- 오른쪽으로 이동</li>
        <li>↑키(방향키) -- 위로 이동</li>
        <li>↓키(방향키) -- 아래로 이동</li>
        <li>Ctrl 키 -- 느리게 이동(속도의 절반)</li>
        <li>Shift 키 -- 빠르게 이동(속도의 2배)</li>
        <li>Z 키 -- 플레이어 피격 범위 확인</li>
      </ol>` },
      { id: 'char-rea', fallbackTitle: '캐릭터: 레아', fallbackHtml: '<h3>레아</h3><p>레아는 균형 잡힌 공격형 캐릭터로, 기본 샷의 연사력이 우수합니다. 기동성이 좋아 근거리 전투에 유리합니다.</p>' },
      { id: 'char-noa', fallbackTitle: '캐릭터: 노아', fallbackHtml: '<h3>노아</h3><p>노아는 장거리 전투에 특화된 캐릭터로, 느리지만 강력한 발사체를 사용합니다. 전략적 위치선정이 중요합니다.</p>' },
      { id: 'char-noel', fallbackTitle: '캐릭터: 노엘', fallbackHtml: '<h3>노엘</h3><p>노엘은 특수 기능을 보유한 서포트형 캐릭터로 아군 보조 및 필드 제어에 능합니다.</p>' }
    ];

    let currentIndex = 0;
    const contentEl = modal.querySelector('.explanation-content');
    const prevBtn = modal.querySelector('.explain-prev');
    const nextBtn = modal.querySelector('.explain-next');
    const pagEl = modal.querySelector('.explain-pagination');

    function renderPagination(){
      pagEl.innerHTML = '';
      pages.forEach((p, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'explain-dot';
        const labelTitle = localTitle(p.id, p.fallbackTitle || p.id);
        dot.setAttribute('aria-label', labelTitle + ' 페이지');
        dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.18);border:0;padding:0;';
        if (i === currentIndex) dot.style.background = 'white';
        dot.addEventListener('click', ()=>{ showPage(i); });
        pagEl.appendChild(dot);
      });
    }

    function showPage(idx){
      if (idx < 0) idx = pages.length - 1; else if (idx >= pages.length) idx = 0;
      currentIndex = idx;
      const p = pages[currentIndex];
      const titleEl = modal.querySelector('#explanation-title');
      const titleText = localTitle(p.id, p.fallbackTitle || p.id);
      const htmlText = localHtml(p.id, p.fallbackHtml || '');
      if (titleEl) titleEl.textContent = titleText;
      contentEl.innerHTML = htmlText;
      renderPagination();
      refreshFocusable();
    }

    function prevPage(){ showPage(currentIndex - 1); }
    function nextPage(){ showPage(currentIndex + 1); }

    prevBtn.addEventListener('click', function(e){ e.preventDefault(); prevPage(); });
    nextBtn.addEventListener('click', function(e){ e.preventDefault(); nextPage(); });

    // show initial page
    showPage(0);

    // append and activate
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    disableBackgroundElements();
    document.addEventListener('keydown', onKeyDown, true);

    // handle dynamic language changes: refresh translation root and UI when languages change
    function recalcRootTrans(){
      try{
        if (window.Settings && typeof window.Settings.get === 'function') lang = window.Settings.get().language || lang;
        rootTrans = (window.Settings && window.Settings.translations && window.Settings.translations[lang]) ? window.Settings.translations[lang] : null;
      }catch(e){ /* ignore */ }
    }
    function onLanguageChange(ev){
      try{
        recalcRootTrans();
        // update header and buttons
        const header = modal.querySelector('#explanation-title'); if (header) header.textContent = t('how','게임 설명');
        const cb = modal.querySelector('.close'); if (cb) cb.textContent = t('close','닫기');
        const pb = modal.querySelector('.explain-prev'); if (pb) pb.setAttribute('aria-label', t('explanation.prevAria','이전 페이지'));
        const nb = modal.querySelector('.explain-next'); if (nb) nb.setAttribute('aria-label', t('explanation.nextAria','다음 페이지'));
        // re-render current page to update localized page title/content
        try{ showPage(currentIndex); }catch(e){}
      }catch(e){ }
    }
    document.addEventListener('languagechange', onLanguageChange);

    try{ setTimeout(()=>{ refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else closeBtn.focus(); }, 10); }catch(e){}
  }

  // expose API
  window.Explanation = window.Explanation || {};
  window.Explanation.open = open;

})();
