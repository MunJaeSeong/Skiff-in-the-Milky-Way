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

    // 기본값(새 페이지 순서: 스토리, 캐릭터 소개, 스테이지1~4)
    const pages = [
      { id: 'story', fallbackTitle: '스토리', fallbackHtml: `<h3>은하수 속의 조각배</h3><p>옛 전설에 따르면 은하수 저편에는 작은 조각배들이 항해하며 잃어버린 꿈들을 되찾는다고 합니다. 당신은 조각배의 조종사가 되어 흩어진 조각을 모아 항로를 되찾아야 합니다.</p>` },
      { id: 'characters', fallbackTitle: '캐릭터', fallbackHtml: `<h3>캐릭터 소개</h3><ul><li><strong>레아</strong> — 균형형 공격 캐릭터로 연사력이 좋고 기동성이 높습니다.</li><li><strong>노아</strong> — 장거리형 캐릭터로 강력한 한 발을 발사합니다.</li><li><strong>노엘</strong> — 서포트형 캐릭터로 전장을 보조하는 능력을 가집니다.</li></ul>` },
      { id: 'stage1', fallbackTitle: '은하 협곡', fallbackHtml: `<h3>은하 협곡</h3><p>깊은 협곡과 잔해가 날아다니는 위험한 구역입니다. 좁은 통로를 조심해서 항해하세요.</p>` },
      { id: 'stage2', fallbackTitle: '바다의 섬', fallbackHtml: `<h3>바다의 섬</h3><p>공중에 떠 있는 섬들 사이를 항해합니다. 플랫폼 사이의 정확한 이동이 요구됩니다.</p>` },
      { id: 'stage3', fallbackTitle: '초신성 폭발', fallbackHtml: `<h3>초신성 폭발</h3><p>에너지 파동이 빈번하게 발생하는 구역입니다. 타이밍을 잘 맞춰 회피하세요.</p>` },
      { id: 'stage4', fallbackTitle: '성운 횡단로', fallbackHtml: `<h3>성운 횡단로</h3><p>아름다운 성운을 횡단하는 구역으로, 복잡한 탄막 패턴을 조심해야 합니다.</p><h4>조작</h4><ul><li>화살표키 좌: 왼쪽 이동</li><li>화살표키 우: 오른쪽 이동</li><li>화살표키 아래: 엎드리기(대기/위기 회피)</li><li>스페이스: 점프</li><li>아래 + 스페이스: 플랫폼 밑으로 내려가기(낙하)</li></ul>` }
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
