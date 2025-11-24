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
        stage1: '은하 협곡', stage2: '바다의 섬', stage3: '초신성 폭발', stage4: '성운 횡단로'
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
          story: '스토리',
          characters: '캐릭터',
          stage1: '스테이지 1',
          stage2: '스테이지 2',
          stage3: '스테이지 3',
          stage4: '스테이지 4'
        },
        content: {
          story: '<h3>은하수 속의 조각배</h3><p>옛 전설에 따르면 은하수 저편에는 작은 조각배들이 바람을 타고 항해하며, 그 속에는 잃어버린 꿈과 기억들이 떠돌고 있다고 합니다. 어느 날, 당신의 조각배는 미지의 힘에 이끌려 네 개의 신비로운 구역으로 흩어지게 되고, 조각들을 모아 항로를 되찾아야 합니다.</p>',
          characters: '<h3>캐릭터 소개</h3><ul><li><strong>레아</strong> — 균형형 공격 캐릭터로 연사력이 좋고 기동성이 높습니다.</li><li><strong>노아</strong> — 장거리형 캐릭터로 강력한 한 발을 발사합니다.</li><li><strong>노엘</strong> — 서포트형 캐릭터로 특수 기술로 전장을 보조합니다.</li></ul>',
          stage1: '<h3>은하 협곡</h3><p>깊은 협곡과 날아다니는 잔해들이 가득한 구역입니다. 좁은 통로를 빠르게 통과하며 적의 탄막을 피하세요.</p>',
          stage2: '<h3>바다의 섬</h3><p>공중에 떠 있는 섬들 사이를 항해하는 구역입니다. 플랫폼 사이의 정확한 이동이 요구됩니다.</p>',
          stage3: '<h3>초신성 폭발</h3><p>강력한 에너지 파동이 발생하는 곳으로, 타이밍이 중요한 스테이지입니다.</p>',
          stage4: '<h3>성운 횡단로</h3><p>아름답지만 위험한 성운 지역을 횡단합니다. 복잡한 탄막 패턴에 유의하세요.</p><h4>조작</h4><ul><li>화살표키 좌: 왼쪽 이동</li><li>화살표키 우: 오른쪽 이동</li><li>화살표키 아래: 엎드리기(대기/위기 회피)</li><li>스페이스: 점프</li><li>아래 + 스페이스: 플랫폼 밑으로 내려가기(낙하)</li></ul>'
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
        stage4: 'Nebula Passage'
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
          story: 'Story',
          characters: 'Characters',
          stage1: 'Stage 1',
          stage2: 'Stage 2',
          stage3: 'Stage 3',
          stage4: 'Stage 4'
        },
        content: {
          story: '<h3>Skiff in the Milky Way</h3><p>Legends tell of small skiffs that sail the galaxy, carrying lost dreams and memories. One day your skiff is pulled apart by a mysterious force and scattered across four strange regions — you must recover the pieces and restore your course.</p>',
          characters: '<h3>Characters</h3><ul><li><strong>Rea</strong> — A balanced attacker with high rate of fire and good mobility.</li><li><strong>Noa</strong> — A long-range specialist with powerful single shots.</li><li><strong>Noel</strong> — A support-type with abilities to assist and control the battlefield.</li></ul>',
          stage1: '<h3>Galaxy Canyon</h3><p>A deep canyon filled with drifting debris. Navigate narrow passages and dodge enemy patterns.</p>',
          stage2: '<h3>Island of the Sea</h3><p>Travel between floating isles — precision movement between platforms is required.</p>',
          stage3: '<h3>Supernova Burst</h3><p>A region of intense energy waves where timing and positioning are critical.</p>',
          stage4: '<h3>Nebula Passage</h3><p>Beautiful but hazardous nebulae with complex bullet patterns — stay alert.</p><h4>Controls</h4><ul><li>Arrow Left: Move left</li><li>Arrow Right: Move right</li><li>Arrow Down: Crouch</li><li>Space: Jump</li><li>Down + Space: Drop down through platforms</li></ul>'
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
        stage1: '銀河キャニオン', stage2: '海の島', stage3: '超新星爆発', stage4: '星雲横断路'
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
          story: 'ストーリー',
          characters: 'キャラクター',
          stage1: 'ステージ1',
          stage2: 'ステージ2',
          stage3: 'ステージ3',
          stage4: 'ステージ4'
        },
        content: {
          story: '<h3>銀河の小舟</h3><p>伝説によれば小さな小舟が銀河を渡り、失われた夢や記憶を運ぶと言われます。ある日、あなたの小舟は謎の力で四つの領域に散らばり、その断片を集めて航路を取り戻すことになります。</p>',
          characters: '<h3>キャラクター紹介</h3><ul><li><strong>レア</strong> — バランス型。連射と機動力に優れます。</li><li><strong>ノア</strong> — 長距離型。強力な弾を放ちます。</li><li><strong>ノエル</strong> — サポート型。味方を補助します。</li></ul>',
          stage1: '<h3>銀河キャニオン</h3><p>深い渓谷と漂う残骸が散在する危険なエリアです。狭い通路を正確に通過してください。</p>',
          stage2: '<h3>海の島</h3><p>浮かぶ島々の間を進むステージです。プラットフォーム間の移動を正確に行いましょう。</p>',
          stage3: '<h3>超新星爆発</h3><p>エネルギー波が頻発する領域です。タイミングを合わせて回避してください。</p>',
          stage4: '<h3>星雲横断路</h3><p>美しいが危険な星雲地帯を横断します。複雑な弾幕に注意しましょう。</p><h4>操作</h4><ul><li>矢印キー 左: 左に移動</li><li>矢印キー 右: 右に移動</li><li>矢印キー 下: しゃがむ</li><li>スペース: ジャンプ</li><li>下 + スペース: 足場の下へ降りる（プラットフォーム落下）</li></ul>'
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
