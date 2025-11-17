/*
  파일: js/setting.js
  설명:
    이 파일은 게임의 설정 창을 보여주고, 사용자가 사운드나 언어를 바꿀 수 있게 해 줍니다.
    설정은 브라우저의 `localStorage`에 저장되어 다음에 다시 방문해도 유지됩니다.

  주요 기능:
    - 소리(켜기/끄기)와 볼륨(음악, 음성)을 조절합니다.
    - 언어(한국어, 영어, 일본어)를 선택하면 화면의 텍스트가 바뀝니다.
    - `window.Settings.open()`으로 설정 모달을 띄울 수 있습니다.
    - 변경 사항은 즉시 적용되며, `settingschange` 이벤트나 `languagechange` 이벤트를 통해
      다른 모듈이 반응할 수 있습니다.

  저장 위치 및 기본값:
    - 저장 키: `skiff_settings_v1`
    - 기본 언어: 한국어(ko), 기본 볼륨은 0.8 등

  핵심 아이디어:
    이 코드는 '설정 화면'을 만들고 사용자가 바꾼 값을 저장/적용해 다른 코드들이
    그 변경을 읽어 사용할 수 있게 해 주는 역할을 합니다.
*/
(function(){
  'use strict';

  // 설정 저장 키 및 기본값
  const STORAGE_KEY = 'skiff_settings_v1';
  const defaults = {
    soundEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.8,
    voiceVolume: 0.8,
    language: 'ko'
  };

  // 번역 데이터 (유지 보수를 위해 모든 번역 키는 이 객체에 통합)
  const translations = {
    ko: {
      start: '게임시작',
      how: '게임설명',
      settings: '환경설정',
      settingsTitle: '환경설정',
      save: '저장',
      close: '닫기',
      soundLabel: '사운드',
      languageLabel: '언어',
      titleMain: '은하수 속의',
      titleSub: '조각배',
      starWord: '은하수',
      titleButton: '타이틀',
      practiceLabel: '연습모드',
      stages: {
        stage1: '은하 협곡', stage2: '바다의 섬', stage3: '초신성 폭발', stage4: 'Coming Soon'
      },
      custom: { title: '커스터마이징', tabChar: '캐릭터', tabShip: '조각배', tabProjectile: '발사체', customizeBtn: '커스텀마이징', myPage: '내 정보' },
      characters: { rea: '레아', noa: '노아', noel: '노엘' },
      ships: { woodskiff: '나무 조각배' },
      projectiles: { basic: '기본 샷', fast: '빠른 발사', heavy: '강력 탄환', energy: '에너지 펄스', plasma: '플라즈마', quantum: '퀀텀' }
      ,
      explanation: {
        prevAria: '이전 페이지',
        nextAria: '다음 페이지',
        pages: {
          about: '설명',
          controls: '조작키',
          'char-rea': '레아',
          'char-noa': '노아',
          'char-noel': '노엘'
        },
        content: {
          about: '<ol><li>날아오는 탄막을 피해 몬스터를 처치하세요.</li><li>몬스터의 체력은 화면 상단의 흰색 막대로 표시됩니다.</li><li>플레이어의 체력은 우측 스코어 섹션의 빨간 막대로 표시됩니다.</li></ol>',
          controls: '<ol><li>←키(방향키) -- 왼쪽으로 이동</li><li>→키(방향키) -- 오른쪽으로 이동</li><li>↑키(방향키) -- 위로 이동</li><li>↓키(방향키) -- 아래로 이동</li><li>Ctrl 키 -- 느리게 이동(속도의 절반)</li><li>Shift 키 -- 빠르게 이동(속도의 2배)</li><li>Z 키 -- 플레이어 피격 범위 확인</li></ol>',
          'char-rea': '<h3>레아</h3><p>레아는 균형 잡힌 공격형 캐릭터로, 기본 샷의 연사력이 우수합니다. 기동성이 좋아 근거리 전투에 유리합니다.</p>',
          'char-noa': '<h3>노아</h3><p>노아는 장거리 전투에 특화된 캐릭터로, 느리지만 강력한 발사체를 사용합니다. 전략적 위치선정이 중요합니다.</p>',
          'char-noel': '<h3>노엘</h3><p>노엘은 특수 기능을 보유한 서포트형 캐릭터로 아군 보조 및 필드 제어에 능합니다.</p>'
        }
      }
    },
    en: {
      start: 'Start',
      how: 'How to Play',
      settings: 'Settings',
      settingsTitle: 'Settings',
      save: 'Save',
      close: 'Close',
      soundLabel: 'Sound',
      languageLabel: 'Language',
      titleMain: 'skiff in the',
      titleSub: 'milky way',
      starWord: 'skiff',
      titleButton: 'Title',
      practiceLabel: 'Practice',
      stages: {
        stage1: 'Galaxy Canyon', 
        stage2: 'Island of the Sea', 
        stage3: 'Supernova Burst', 
        stage4: 'Coming Soon'
      },
      custom: { title: 'Customization', 
                tabChar: 'Character', 
                tabShip: 'Skiff', 
                tabProjectile: 'Projectile', 
                customizeBtn: 'Customize', 
                myPage: 'My Page' 
              },
      characters: { rea: 'Rea', 
                    noa: 'Noa', 
                    noel: 'Noel' 
                  },
      ships: { woodskiff: 'Wood Skiff' },
      projectiles: { basic: 'Basic Shot', 
                     fast: 'Fast Bolt', 
                     heavy: 'Heavy Shell', 
                     energy: 'Energy Pulse', 
                     plasma: 'Plasma Beam', 
                     quantum: 'Quantum Ray' 
                   }
      ,
      explanation: {
        prevAria: 'Previous page',
        nextAria: 'Next page',
        pages: {
          about: 'About',
          controls: 'Controls',
          'char-rea': 'Rea',
          'char-noa': 'Noa',
          'char-noel': 'Noel'
        }
        ,
        content: {
          about: '<ol><li>Dodge incoming bullet patterns and defeat monsters.</li><li>Enemy HP is shown as a white bar at the top of the screen.</li><li>Player HP is shown as a red bar in the right-side score area.</li></ol>',
          controls: '<ol><li>Left Arrow -- Move left</li><li>Right Arrow -- Move right</li><li>Up Arrow -- Move up</li><li>Down Arrow -- Move down</li><li>Ctrl -- Move slowly (half speed)</li><li>Shift -- Move quickly (double speed)</li><li>Z -- Show player hitbox</li></ol>',
          'char-rea': '<h3>Rea</h3><p>Rea is a well-balanced attacker with high rate of fire on basic shots. Good mobility makes her strong in close combat.</p>',
          'char-noa': '<h3>Noa</h3><p>Noa specializes in long-range combat, firing slower but more powerful projectiles. Positioning is key.</p>',
          'char-noel': '<h3>Noel</h3><p>Noel is a support-type with special abilities for assisting allies and controlling the battlefield.</p>'
        }
      }
    },
    ja: {
      start: 'スタート',
      how: '遊び方',
      settings: '設定',
      settingsTitle: '設定',
      save: '保存',
      close: '閉じる',
      soundLabel: 'サウンド',
      languageLabel: '言語',
      titleMain: '銀河の中の',
      titleSub: '小舟',
      starWord: '銀河',
      titleButton: 'タイトル',
      practiceLabel: '練習モード',
      stages: {
        stage1: '銀河キャニオン', stage2: '海の島', stage3: '超新星爆発', stage4: 'Coming Soon'
      },
      custom: { title: 'カスタマイズ', tabChar: 'キャラクター', tabShip: '小舟', tabProjectile: '弾', customizeBtn: 'カスタマイズ', myPage: 'マイページ' },
      characters: { rea: 'レア', noa: 'ノア', noel: 'ノエル' },
      ships: { woodskiff: '木の小舟' },
      projectiles: { basic: 'ベーシック', fast: 'ファスト', heavy: 'ヘビー', energy: 'エネルギー', plasma: 'プラズマ', quantum: 'クォンタム' }
      ,
      explanation: {
        prevAria: '前のページ',
        nextAria: '次のページ',
        pages: {
          about: '説明',
          controls: '操作方法',
          'char-rea': 'レア',
          'char-noa': 'ノア',
          'char-noel': 'ノエル'
        }
        ,
        content: {
          about: '<ol><li>飛んでくる弾幕を避けてモンスターを倒してください。</li><li>モンスターの体力は画面上部の白いバーで表示されます。</li><li>プレイヤーの体力は右側のスコア領域にある赤いバーで表示されます。</li></ol>',
          controls: '<ol><li>←キー -- 左に移動</li><li>→キー -- 右に移動</li><li>↑キー -- 上に移動</li><li>↓キー -- 下に移動</li><li>Ctrl -- ゆっくり移動（速度の半分）</li><li>Shift -- 速く移動（速度の2倍）</li><li>Z -- プレイヤーのヒットボックス表示</li></ol>',
          'char-rea': '<h3>レア</h3><p>レアはバランスの取れた攻撃型キャラクターで、基本ショットの連射性に優れています。機動力が高く近距離戦に有利です。</p>',
          'char-noa': '<h3>ノア</h3><p>ノアは長距離戦に特化したキャラクターで、遅いが強力な弾を使用します。戦略的な位置取りが重要です。</p>',
          'char-noel': '<h3>ノエル</h3><p>ノエルはサポート型で特殊能力を持ち、味方支援やフィールド制御に長けています。</p>'
        }
      }
    }
  };

  // 설정 읽기/쓰기 및 적용 함수
  function readSettings(){
    try{
      // 이전에 저장된 설정을 불러오고, 없으면 기본값을 반환
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaults);
      // 저장된 JSON을 파싱
      const parsed = JSON.parse(raw);
      // 이전 버전에서 soundVolume 하나만 있던 경우 music/voice에 복사하여 마이그레이션 처리
      if (typeof parsed.musicVolume === 'undefined' && typeof parsed.voiceVolume === 'undefined' && typeof parsed.soundVolume === 'number'){
        parsed.musicVolume = parsed.soundVolume;
        parsed.voiceVolume = parsed.soundVolume;
      }
      return Object.assign({}, defaults, parsed);
    }catch(e){
      return Object.assign({}, defaults);
    }
  }
  // 설정 저장 함수
  function writeSettings(s){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
  }
  // 언어 적용 함수
  function applyLanguage(lang){
    // 알려진 UI 문자열을 업데이트
    const t = translations[lang] || translations.ko;  // 기본값은 한국어
    const btnStart = document.getElementById('btnStart');   // '게임시작' 버튼 요소
    const btnHow = document.getElementById('btnHow');   // '게임설명' 버튼 요소
    const btnSettings = document.getElementById('btnSettings'); // '환경설정' 버튼 요소
    if (btnStart) btnStart.textContent = t.start;   // '게임시작' 버튼 텍스트 업데이트
    if (btnHow) btnHow.textContent = t.how;         // '게임설명' 버튼 텍스트 업데이트
    if (btnSettings) btnSettings.textContent = t.settings; // '환경설정' 버튼 텍스트 업데이트
    const titleEl = document.querySelector('.game-title');  // 대형 배경 게임 타이틀 요소
    if (titleEl) {  
      const tMain = t.titleMain || '';  // 메인 타이틀
      const tSub = t.titleSub || '';  // 서브 타이틀
      let mainHTML = tMain; // 기본 메인 타이틀 HTML
      // 별 모양 강조 단어가 있으면 해당 단어를 감싸서 강조 처리
      if (t.starWord && tMain.indexOf(t.starWord) !== -1) {
        const escaped = t.starWord;
        mainHTML = tMain.replace(escaped, `<span class=\"starry\"><span class=\"stars\" aria-hidden=\"true\"></span>${escaped}</span>`);
      }
      // 업데이트된 타이틀 HTML 설정
      titleEl.innerHTML = `<span class=\"title-line title-large\">${mainHTML}</span><span class=\"title-line title-small\">${tSub}</span>`;
    }
    // 모달이 열려 있는 경우 모달 내부의 타이틀과 버튼 텍스트도 업데이트
    const modal = document.querySelector('.modal');
    if (modal) {
      const h2 = modal.querySelector('h2');
      if (h2) h2.textContent = t.settingsTitle;
      const saveBtn = modal.querySelector('.settings-save');
      if (saveBtn) saveBtn.textContent = t.save;
      const closeBtn = modal.querySelector('.close');
      if (closeBtn) closeBtn.textContent = t.close;
      const soundLabel = modal.querySelector('.settings-sound-label');
      if (soundLabel) soundLabel.textContent = t.soundLabel;
      const langLabel = modal.querySelector('.settings-language-label');
      if (langLabel) langLabel.textContent = t.languageLabel;
    }
    // 다른 모듈이 반응할 수 있도록 languagechange 이벤트를 전파
    try{ document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } })); }catch(e){}
  }
  // 설정 모달 열기 함수
  function open(){
    const settings = readSettings();  // 현재 설정 읽기
    const t = translations[settings.language] || translations.ko; // 현재 언어에 맞는 번역 데이터

    // 모달 구성
    const modal = document.createElement('div');
    modal.className = 'modal settings-modal';  // 설정 모달 클래스
    modal.setAttribute('role','dialog');  // 대화상자 역할 지정
    modal.setAttribute('aria-modal','true');  // 모달 대화상자임을 명시

    // 모달 내부 HTML 구성
    modal.innerHTML = `
      <h2>${t.settingsTitle}</h2>
      <div class="settings-row">
        <label class="settings-sound-label">${t.soundLabel}</label>
        <div>
          <!-- 사운드 라벨 옆 체크박스 -->
          <label style="display:inline-flex;align-items:center;gap:8px;">
            <input type="checkbox" class="settings-sound-enabled" aria-label="${t.soundLabel}">
          </label>
          <!-- volume wrappers will be shown/hidden depending on checkbox -->
          <div class="settings-volume-wrap" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
            <label style="display:flex;align-items:center;gap:8px;">
              <span style="min-width:80px;display:inline-block;">Music</span>
              <input type="range" min="0" max="1" step="0.01" class="settings-music-volume" />
            </label>
            <label style="display:flex;align-items:center;gap:8px;">
              <span style="min-width:80px;display:inline-block;">Voice</span>
              <input type="range" min="0" max="1" step="0.01" class="settings-voice-volume" />
            </label>
          </div>
        </div>
      </div>

      <div class="settings-row" style="margin-top:12px;">
        <label class="settings-language-label">${t.languageLabel}</label>
        <div>
          <select class="settings-language">
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="settings-save">${t.save}</button>
        <button class="close">${t.close}</button>
      </div>
    `;

  // 모달 내부 요소 참조 및 초기화
  const chk = modal.querySelector('.settings-sound-enabled'); // 사운드 활성화 체크박스
  const musicVol = modal.querySelector('.settings-music-volume'); // 음악 볼륨 슬라이더
  const voiceVol = modal.querySelector('.settings-voice-volume'); // 음성 볼륨 슬라이더
  const sel = modal.querySelector('.settings-language'); // 언어 선택 셀렉트
  const saveBtn = modal.querySelector('.settings-save'); // 저장 버튼
  const closeBtn = modal.querySelector('.close'); // 닫기 버튼

    // 체크박스 의미: 체크되어 있으면 OFF, 체크 해제이면 ON
    chk.checked = !settings.soundEnabled;
    // 개별 볼륨 설정 (필요한 마이그레이션은 readSettings에서 처리됨)
    musicVol.value = (typeof settings.musicVolume === 'number') ? settings.musicVolume : defaults.musicVolume;
    voiceVol.value = (typeof settings.voiceVolume === 'number') ? settings.voiceVolume : defaults.voiceVolume;
    // 사운드 활성화 여부에 따라 볼륨 컨트롤을 보이거나 숨김
    const volWrap = modal.querySelector('.settings-volume-wrap');
    if (volWrap) {
      // 체크박스가 체크되어 있으면 사운드 OFF이므로 볼륨 컨트롤 숨김
      if (chk.checked) {
        volWrap.style.display = 'none';
        musicVol.setAttribute('aria-hidden','true'); musicVol.disabled = true;
        voiceVol.setAttribute('aria-hidden','true'); voiceVol.disabled = true;
      } else {
        volWrap.style.display = '';
        musicVol.removeAttribute('aria-hidden'); musicVol.disabled = false;
        voiceVol.removeAttribute('aria-hidden'); voiceVol.disabled = false;
      }
    }
    sel.value = settings.language || 'ko';

    // 미리보기 즉시 적용: 볼륨 및 언어를 즉시 반영
    chk.addEventListener('change', function(){
      // 체크는 OFF를 의미하므로 저장 시 반전하여 기록
      const s = readSettings(); s.soundEnabled = !chk.checked; writeSettings(s);
      // 볼륨 UI 토글: 사운드 ON(체크 해제)일 때 보이도록 처리
      if (volWrap) {
        if (chk.checked) {
          // OFF -> hide volumes
          volWrap.style.display = 'none';
          musicVol.disabled = true; musicVol.setAttribute('aria-hidden','true');
          voiceVol.disabled = true; voiceVol.setAttribute('aria-hidden','true');
        } else {
          volWrap.style.display = '';
          musicVol.disabled = false; musicVol.removeAttribute('aria-hidden');
          voiceVol.disabled = false; voiceVol.removeAttribute('aria-hidden');
        }
          // 오디오 관리자에게 설정 변경을 알림 (음소거/해제 등)
          try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
          try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
      }
    });
    // 음악 볼륨 슬라이더 핸들러
    musicVol.addEventListener('input', function(){
      const s = readSettings(); s.musicVolume = parseFloat(musicVol.value); writeSettings(s);
        // 변경된 볼륨을 오디오 관리자에 적용하고 settingschange 이벤트를 발송
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
    });
    // 음성 볼륨 슬라이더 핸들러
    voiceVol.addEventListener('input', function(){
      const s = readSettings(); s.voiceVolume = parseFloat(voiceVol.value); writeSettings(s);
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
    });
    // 언어 선택 즉시 적용
    sel.addEventListener('change', function(){
      // 언어 즉시 적용 및 저장
      applyLanguage(sel.value);
      const s = readSettings(); s.language = sel.value; writeSettings(s);
    });
    // 저장 버튼 핸들러
    saveBtn.addEventListener('click', function(){
      const s = readSettings();
      // persist inverted checkbox semantics (checked === OFF)
      s.soundEnabled = !chk.checked;
      s.musicVolume = parseFloat(musicVol.value);
      s.voiceVolume = parseFloat(voiceVol.value);
      s.language = sel.value;
      writeSettings(s);
      // 언어를 한 번 더 적용(안정성 확보)
      applyLanguage(s.language);
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
      // 모달 닫기 및 UI 복원
      try{ closeModal(); }catch(e){ /* best-effort */ }
    });
    // 닫기 버튼 핸들러
    closeBtn.addEventListener('click', function(){
      // 저장하지 않고 모달을 닫고 UI를 복원
      try{ closeModal(); }catch(e){ /* best-effort */ }
    });

    // 백드롭 생성: 배경 컨트롤이 클릭되지 않도록 함
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    // 모달이 열린 동안 비활성화할 요소 id 목록
    const disableIds = ['btnStart','btnHow','btnSettings'];
    const disabledElements = [];
    // 배경 요소 비활성화/복원 함수
    function disableBackgroundElements(){
      disableIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // 이전 disabled 상태 저장
        el.dataset._wasDisabled = el.disabled ? '1' : '0';
        try{ el.disabled = true; }catch(e){}
        // 탭 순서에서 제외
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

    // 백드롭을 먼저 추가한 뒤 모달을 추가
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // 배경 버튼 비활성화
    disableBackgroundElements();

    // 포커스 관리: 모달 내부로 포커스를 고정
    const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
    function refreshFocusable(){ focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null); }

    // 키다운 이벤트 핸들러
    function onKeyDown(e){
      if (e.key === 'Escape'){
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === 'Tab'){
        refreshFocusable();
        if (focusableInside.length === 0){ e.preventDefault(); return; }
        const first = focusableInside[0];
        const last = focusableInside[focusableInside.length - 1];
        if (e.shiftKey){
          if (document.activeElement === first || !modal.contains(document.activeElement)){
            e.preventDefault(); last.focus();
          }
        } else {
          if (document.activeElement === last){ e.preventDefault(); first.focus(); }
        }
      }
    }

    // 모달 닫기 함수
    function closeModal(){
      try{ modal.remove(); }catch(e){}
      try{ backdrop.remove(); }catch(e){}
      restoreBackgroundElements();
      document.removeEventListener('keydown', onKeyDown, true);
      // restore language in case of cancel
      const saved = readSettings();
      applyLanguage(saved.language);
    }

    // 키 이벤트 핸들러 연결
    document.addEventListener('keydown', onKeyDown, true);

    // 모달 내의 첫 번째 포커서 가능한 요소에 포커스 이동
  try{ setTimeout(() => { refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else if (musicVol) musicVol.focus(); else closeBtn.focus(); }, 10); }catch(e){}
  }

  // 초기화: 저장된 언어를 바로 적용하여 메뉴가 올바른 언어를 사용하도록 함
  (function init(){
    const s = readSettings();
    applyLanguage(s.language);
    // API 노출
    window.Settings = window.Settings || {};
    window.Settings.open = open;
    window.Settings.get = readSettings;
    window.Settings.set = function(newSettings){
      const now = Object.assign({}, readSettings(), newSettings);
      writeSettings(now);
      if (newSettings.language) applyLanguage(newSettings.language);
    };
    // expose translations so other modules can read localized strings
    window.Settings.translations = translations;
  })();

})();
