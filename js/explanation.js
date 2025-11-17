/*
  파일: js/explanation.js
  설명:
    이 파일은 '게임 설명(How to Play)' 창을 보여주는 모듈
    사용자가 '게임설명' 버튼을 누르면 이 모달이 뜨고, 여러 페이지를 넘기며
    게임 조작법이나 캐릭터 정보를 읽을 수 있습니다.

  주요 기능:
    - 모달(팝업)을 만들어 내용(페이지)을 보여줍니다.
    - 이전/다음 버튼과 페이지 표시(도트)를 제공해 여러 페이지를 탐색할 수 있어요.
    - 열려 있는 동안 배경의 주요 버튼들을 비활성화하고, 키보드 포커스가
      모달 안으로 고정되도록 합니다. ESC로 닫을 수 있습니다.

  사용 예:
    - `window.Explanation.open()`을 호출하면 모달이 열립니다.

  핵심 아이디어:
    단순한 설명 문서를 페이지 단위로 보여주고, 키보드와 마우스로 편하게
    넘기도록 도와주는 '도움말' 역할을 합니다.
*/

// 즉시 실행 함수로 모듈화
// 'use strict' 모드 사용
(function(){
  'use strict';

  // 설명 모달 열기 함수
  function open(){
    // 모달 요소 생성
    const modal = document.createElement('div');
    modal.className = 'modal explanation-modal';  // 설명 모달 클래스 추가
    modal.setAttribute('role','dialog');  // 역할 속성 설정
    modal.setAttribute('aria-modal','true');  // 모달 속성 설정

    // 언어 및 번역 데이터는 `window.Settings`에서 가져옵니다.
    // (window.Settings가 없으면 기본값 'ko'를 사용)
    let lang = 'ko';
    try{ if (window.Settings && typeof window.Settings.get === 'function') lang = window.Settings.get().language || lang; }catch(e){ /* ignore */ }

    // 번역 함수
    function t(path, fallback){
      try{
        const rootTrans = (window.Settings && window.Settings.translations && window.Settings.translations[lang]) ? window.Settings.translations[lang] : null;
        if (!rootTrans) return fallback;
        const parts = path.split('.');
        let cur = rootTrans;
        for (let p of parts){ if (cur && Object.prototype.hasOwnProperty.call(cur,p)) cur = cur[p]; else return fallback; }
        return (typeof cur === 'string') ? cur : fallback;
      }catch(e){ return fallback; }
    }

    const closeLabel = t('close','닫기'); // 닫기 버튼 텍스트
    const prevAria = t('explanation.prevAria','이전 페이지'); // 이전 페이지 aria-label
    const nextAria = t('explanation.nextAria','다음 페이지'); // 다음 페이지 aria-label
    const headerTitle = t('how','게임 설명'); // 모달 헤더 제목

    // 페이지네이션(이전/다음) 컨트롤이 있는 모달 구조
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

    const closeBtn = modal.querySelector('.close'); // 닫기 버튼
    const backdrop = document.createElement('div'); // 백드롭 요소
    backdrop.className = 'modal-backdrop';  // 백드롭 클래스 설정
    const disableIds = ['btnStart','btnHow','btnSettings']; // 비활성화할 배경 요소 ID 목록
    const disabledElements = []; // 비활성화된 요소 추적 배열
    // 배경 요소 비활성화/복원 함수
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
    // 배경 요소 복원 함수
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
    // 모달 닫기 함수
    function closeModal(){
      try{ modal.remove(); }catch(e){}
      try{ backdrop.remove(); }catch(e){}
      restoreBackgroundElements();
      document.removeEventListener('keydown', onKeyDown, true);
      try{ document.removeEventListener('languagechange', onLanguageChange); }catch(e){}
    }

    // 포커스 트랩 (모달 내부로 포커스 고정)
    const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let focusableInside = [];
    // 포커스 가능한 요소 갱신 함수
    function refreshFocusable(){ focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null); }
    // 키다운 이벤트 핸들러
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
      // 페이지네이션이 있을 경우 왼쪽/오른쪽 화살표로 페이지 이동을 허용
      if (e.key === 'ArrowLeft'){
        try{ if (typeof prevPage === 'function'){ e.preventDefault(); prevPage(); } }catch(err){}
      }
      if (e.key === 'ArrowRight'){
        try{ if (typeof nextPage === 'function'){ e.preventDefault(); nextPage(); } }catch(err){}
      }
    }

    // 닫기 버튼 연결
    closeBtn.addEventListener('click', function(){ closeModal(); });

  // -- 페이지네이션: 페이지 배열과 네비게이션 함수
  // 번역은 `window.Settings.translations`와 `window.Settings.get().language`를 사용
  function localTitle(key, fallback){
      try{
        const langCode = (window.Settings && window.Settings.get && window.Settings.get().language) ? window.Settings.get().language : 'ko';
        const root = (window.Settings && window.Settings.translations) ? (window.Settings.translations[langCode] || window.Settings.translations.ko) : null;
        if (root && root.explanation && root.explanation.pages && root.explanation.pages[key]) return root.explanation.pages[key];
        // 캐릭터 이름 폴백
        if (root){
          if (key === 'char-rea' && root.characters && root.characters.rea) return root.characters.rea;
          if (key === 'char-noa' && root.characters && root.characters.noa) return root.characters.noa;
          if (key === 'char-noel' && root.characters && root.characters.noel) return root.characters.noel;
        }
      }catch(e){ }
      return fallback;
    }

    // 페이지 내용도 번역에서 시도
    function localHtml(key, fallback){
      try{
        const langCode = (window.Settings && window.Settings.get && window.Settings.get().language) ? window.Settings.get().language : 'ko';
        const root = (window.Settings && window.Settings.translations) ? (window.Settings.translations[langCode] || window.Settings.translations.ko) : null;
        if (root && root.explanation && root.explanation.content && root.explanation.content[key]) return root.explanation.content[key];
      }catch(e){ }
      return fallback;
    }

    // 기본값(설명 페이지들)
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
    const contentEl = modal.querySelector('.explanation-content');  // 내용 표시 요소
    const prevBtn = modal.querySelector('.explain-prev'); // 이전 버튼
    const nextBtn = modal.querySelector('.explain-next'); // 다음 버튼
    const pagEl = modal.querySelector('.explain-pagination'); // 페이지네이션 요소

    // 페이지네이션 렌더링 함수
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

    // 특정 인덱스의 페이지 표시 함수
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
    
    // 이전/다음 페이지 함수
    function prevPage(){ showPage(currentIndex - 1); }
    function nextPage(){ showPage(currentIndex + 1); }

    prevBtn.addEventListener('click', function(e){ e.preventDefault(); prevPage(); });
    nextBtn.addEventListener('click', function(e){ e.preventDefault(); nextPage(); });

    // 초기 페이지 표시
    showPage(0);

    // DOM에 추가하고 활성화
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    disableBackgroundElements();
    document.addEventListener('keydown', onKeyDown, true);

    // 동적 언어 변경 처리: 언어가 변경되면 번역 루트와 UI를 갱신
    function recalcRootTrans(){
      try{
        if (window.Settings && typeof window.Settings.get === 'function') lang = window.Settings.get().language || lang;
      }catch(e){ /* ignore */ }
    }
    // 언어 변경 이벤트 핸들러
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

  // API 노출
  window.Explanation = window.Explanation || {};
  window.Explanation.open = open;

})();
