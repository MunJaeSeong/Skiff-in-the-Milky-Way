/*
  파일: js/custom.js
  설명:
    이 파일은 '커스터마이징(사용자 설정)' 창을 만들어 주는 코드예요.
    플레이어가 캐릭터를 골라 저장할 수 있도록
    모달(팝업) 형태의 UI를 띄워줍니다.

  주요 기능:
    - `open()` 함수를 호출하면 커스터마이징 모달이 화면에 나타납니다.
    - 모달이 열리면 배경(다른 버튼들)을 비활성화하여 실수로 클릭하지 못하게 합니다.
    - 탭 키로 포커스를 돌릴 수 있게 하고, `Esc` 키로 닫을 수 있습니다.
    - 저장 버튼을 누르면 선택한 정보를 `localStorage`에 저장합니다.

  저장 위치:
    - 로컬 저장소 키: `skiff_custom_v1` (브라우저에 저장됩니다)

  핵심 아이디어:
    이 코드는 화면 왼쪽에 '내 캐릭터(My character)' 미리보기와 오른쪽에 선택 목록을 보여주며,
    사용자가 고른 항목을 저장/닫기할 수 있게 만드는 역할을 합니다.
*/
(function(){
  'use strict';

  const STORAGE_KEY = 'skiff_custom_v1';

  // 로컬 저장소에서 커스터마이징 데이터 읽기/쓰기 함수
  function readCustom(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }catch(e){ return {}; }
  }

  // 저장 함수
  function writeCustom(obj){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(e){}
  }

  function open(){
    // 저장된 데이터 읽기
    const data = readCustom();
    // 캐릭터 및 의상 데이터
    const characters = [
      // each character now has an `outfits` array so players can choose per-character costumes
      { id: 'rea', name: 'Rea', img: 'assets/character/Rea/Rea.jpg'},
      { id: 'noa', name: 'Noa', img: 'assets/character/Noa/Noa.jpg'},
      // placeholder for a third character; replace or add more outfits as needed
      { id: 'noel', name: 'Noel', img: 'assets/character/Noel/Noel.jpg'}
    ];

    const modal = document.createElement('div');
    modal.className = 'modal custom-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <h2 style="margin:0 0 12px 0">커스터마이징</h2>
      <div class="custom-content" style="flex:1; display:flex; gap:16px; align-items:flex-start; overflow:hidden;">
        <aside class="my-page" aria-label="내 캐릭터" style="width:300px;flex:0 0 300px;padding:12px;border-right:1px solid rgba(255,255,255,0.03);">
          <h3 style="margin:0 0 8px 0;color:#fff;font-size:18px">내 캐릭터</h3>
          <div class="my-preview" style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:8px;">
            <div class="my-char-thumb" style="width:220px;height:220px;background-size:cover;background-position:center;border-radius:8px;background-color:#111;border:1px solid rgba(255,255,255,0.04);"></div>
            <div class="my-names" style="text-align:center;">
              <div class="my-char-name" style="color:#fff;font-size:20px;font-weight:600;margin-top:6px"></div>
              
            </div>
          </div>
        </aside>
        <div class="custom-right" style="flex:1; display:flex; flex-direction:column; overflow:auto; padding-left:12px;">
          
          <section class="char-select" aria-label="캐릭터 선택">
            <p class="sr-only">캐릭터 선택</p>
            <div class="character-list" role="listbox" aria-label="캐릭터 목록" style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px; -webkit-overflow-scrolling:touch;">
            </div>
          </section>
          <hr style="opacity:.06;margin:12px 0">
        </div>
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="custom-save">저장</button>
        <button class="close">닫기</button>
      </div>
    `;

  const saveBtn = modal.querySelector('.custom-save');  // 저장 버튼
  const closeBtn = modal.querySelector('.close'); // 닫기 버튼
  const charListEl = modal.querySelector('.character-list'); // 캐릭터 목록 컨테이너
  const myCharThumbEl = modal.querySelector('.my-char-thumb'); // 내 캐릭터 썸네일
  const myCharNameEl = modal.querySelector('.my-char-name'); // 내 캐릭터 이름
  const customRightEl = modal.querySelector('.custom-right');// 오른쪽 패널 전체
  const charSection = modal.querySelector('.char-select');  // 캐릭터 선택 섹션

    // 백드롭과 배경 비활성화: 다른 모달과 동일한 동작을 수행함
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    // 백드롭이 화면 전체를 덮고 모달 아래에 배치되도록 스타일 설정
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
    // 배경 요소 비활성화 함수
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
    }

    // 모달 스타일: 페이지 콘텐츠가 보이지 않고 화면에 고정되도록 함
    try{
      // 모달을 고정된 열 컨테이너로 만들어 헤더와 왼쪽 미리보기가 고정되도록 함
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
      // 내부 영역들이 독립적으로 스크롤되도록 모달을 컬럼 플렉스로 설정
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      // 모달이 열려 있을 때 전체 페이지 스크롤을 막고 내부 패널만 스크롤되게 함
      modal.style.overflow = 'hidden';
      modal.style.zIndex = '10001';
    }catch(e){}

    // 오른쪽 패널이 고정된 모달 내부에서 세로 스크롤 되도록 설정
    // 중요한 점: flex 레이아웃에서는 자식 요소들이 축소 가능하도록 해야 함 (min-height:0)
    try{
      if (customRightEl){
        customRightEl.style.minHeight = '0';
        customRightEl.style.overflowY = 'auto';
        customRightEl.style.webkitOverflowScrolling = 'touch';
      }
      if (charListEl){
        // character-list가 부모 요소의 세로 크기를 강제로 늘리지 않도록 함
        charListEl.style.flex = '0 0 auto';
        }
    }catch(e){}

    // 포커스 트랩 (모달이 열렸을 때 포커스를 모달 내부에 고정)
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

    // characters 배열에서 동적으로 캐릭터 항목을 렌더링
  // 기본 선택 캐릭터는 'rea'로 설정합니다. 저장된 값이 있으면 그 값을 사용하고,
  // 'rea'가 목록에 없을 경우에는 첫 항목을 기본으로 사용합니다.
  let selectedCharacter = (data && data.character) ? data.character : (characters.find(c => c.id === 'rea') ? 'rea' : (characters[0] && characters[0].id) || 'rea');
    function createCharacterItem(ch){
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'character-item';
      item.setAttribute('role','option');
      item.setAttribute('aria-selected','false');
  // 썸네일이 잘 보이도록 캐릭터 항목을 크게 설정
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
  // 요청에 따라 썸네일 크기를 약 4배로 증가
  thumb.style.width = '320px';
  thumb.style.height = '320px';
      thumb.style.borderRadius = '6px';
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
      thumb.style.backgroundColor = '#111';
      // 이미지가 있으면 배경 이미지로 설정
      if (ch.img) thumb.style.backgroundImage = `url('${ch.img}')`;

      item.appendChild(thumb);

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
        // center and update the My Character preview
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

      // 초기 상태를 설정할 수 있도록 도와주는 헬퍼
      item._updateSelected = updateSelectedVisual;

      return item;
    }

    // 캐릭터 목록을 DOM에 추가
    characters.forEach(ch => {
      const el = createCharacterItem(ch);
      charListEl.appendChild(el);
    });

    // 정적 레이블(헤더, 탭, 저장/닫기)을 번역 데이터로 지역화(있을 경우)
    try{
      const lang = (window.Settings && typeof window.Settings.get === 'function') ? window.Settings.get().language : 'ko';
      const tr = (window.Settings && window.Settings.translations) ? window.Settings.translations : {};
      const t = tr[lang] || {};
      const h2 = modal.querySelector('h2');
      if (h2) h2.textContent = (t.custom && t.custom.title) || (t.settingsTitle) || h2.textContent;
      if (saveBtn) saveBtn.textContent = (t.save) || saveBtn.textContent;
      if (closeBtn) closeBtn.textContent = (t.close) || closeBtn.textContent;
      // 왼쪽 섹션(내 캐릭터) 헤더 및 aside의 aria-label 처리
      const myPageH3 = modal.querySelector('aside.my-page h3');
      const myPageAside = modal.querySelector('aside.my-page');
      const myPageText = (t.custom && t.custom.myPage) || 'My Page';
      if (myPageH3) myPageH3.textContent = myPageText;
      if (myPageAside) myPageAside.setAttribute('aria-label', myPageText);
    }catch(e){}

    // 초기 선택 비주얼 설정 및 선택 항목 중앙 정렬; 현재 캐릭터에 대한 의상 목록 채우기
    Array.from(charListEl.children).forEach((btn, i) => {
      const id = characters[i].id;
      const active = (id === selectedCharacter);
      btn._updateSelected(active);
      if (active){
        // center this item in the scroll container
        setTimeout(()=>{ centerCharacter(btn); }, 50);
      }
    });

    // 왼쪽 '내 캐릭터' 미리보기 업데이트 (가능하면 지역화된 이름 사용)
    function updateMyPage(){
      const ch = characters.find(c => c.id === selectedCharacter) || characters[0];
      // update character main thumb
      if (myCharThumbEl){
        if (ch && ch.img) myCharThumbEl.style.backgroundImage = `url('${ch.img}')`;
        else myCharThumbEl.style.backgroundImage = '';
      }
      try{
        const lang = (window.Settings && typeof window.Settings.get === 'function') ? window.Settings.get().language : 'ko';
        const tr = (window.Settings && window.Settings.translations) ? window.Settings.translations : {};
        const t = tr[lang] || {};
        const cname = (t.characters && t.characters[ch.id]) || ch.name || ch.id;
        if (myCharNameEl) myCharNameEl.textContent = cname;
      }catch(e){
        if (myCharNameEl) myCharNameEl.textContent = ch ? (ch.name || ch.id) : '';
      }
    }
    try{ updateMyPage(); }catch(e){}

    // 선택한 항목이 스크롤 컨테이너에서 중앙에 오도록 스크롤 위치 조정
    function centerCharacter(el){
      const wrapper = charListEl;
      if (!wrapper || !el) return;
      const offsetLeft = el.offsetLeft + (el.offsetWidth / 2) - (wrapper.clientWidth / 2);
      wrapper.scrollTo({ left: offsetLeft, behavior: 'smooth' });
    }

    saveBtn.addEventListener('click', function(){
      // 선택된 캐릭터만 저장
      const obj = Object.assign({}, data, { character: selectedCharacter, updated: Date.now() });
      writeCustom(obj);
      try{ closeModal(); }catch(e){}
    });

    closeBtn.addEventListener('click', function(){
      try{ closeModal(); }catch(e){}
    });

    // 모달과 백드롭을 DOM에 추가하고 활성화
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    // 모달이 열려 있는 동안 언어 설정이 바뀌면 실시간으로 텍스트 갱신
    function onLanguageChange(ev){
      try{
        const lang = (window.Settings && typeof window.Settings.get === 'function') ? window.Settings.get().language : 'ko';
        const tr = (window.Settings && window.Settings.translations) ? window.Settings.translations : {};
        const t = tr[lang] || {};
        const h2 = modal.querySelector('h2');
        if (h2) h2.textContent = (t.custom && t.custom.title) || (t.settingsTitle) || h2.textContent;
        if (saveBtn) saveBtn.textContent = (t.save) || saveBtn.textContent;
        if (closeBtn) closeBtn.textContent = (t.close) || closeBtn.textContent;
        const myPageText = (t.custom && t.custom.myPage) || 'My Page';
        const myPageH3 = modal.querySelector('aside.my-page h3');
        const myPageAside = modal.querySelector('aside.my-page');
        if (myPageH3) myPageH3.textContent = myPageText;
        if (myPageAside) myPageAside.setAttribute('aria-label', myPageText);
        // 미리보기 이름(지역화된 텍스트) 갱신
        try{ updateMyPage(); }catch(e){}
      }catch(e){}
    }
    document.addEventListener('languagechange', onLanguageChange);
    disableBackgroundElements();
    document.addEventListener('keydown', onKeyDown, true);
    try{ setTimeout(()=>{ refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else saveBtn.focus(); }, 10); }catch(e){}
    // 모달이 닫힐 때 언어 변경 이벤트 리스너 제거
    const _oldClose = closeModal;
    closeModal = function(){
      try{ document.removeEventListener('languagechange', onLanguageChange); }catch(e){}
      try{ _oldClose(); }catch(e){}
    };
  }

  window.Custom = window.Custom || {};
  window.Custom.open = open;

})();
