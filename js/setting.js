/* Settings module
   - Provides a modal UI for Sound (on/off + volume) and Language (ko/en/ja)
   - Persists settings to localStorage and applies language changes live
   - Exposes window.Settings.open() to show the settings dialog
*/
(function(){
  'use strict';

  const STORAGE_KEY = 'skiff_settings_v1';
  const defaults = {
    soundEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.8,
    voiceVolume: 0.8,
    language: 'ko'
  };

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
        stage1: 'Galaxy Canyon', stage2: 'Island of the Sea', stage3: 'Supernova Burst', stage4: 'Coming Soon'
      },
      custom: { title: 'Customization', tabChar: 'Character', tabShip: 'Skiff', tabProjectile: 'Projectile', customizeBtn: 'Customize', myPage: 'My Page' },
      characters: { rea: 'Rea', noa: 'Noa', noel: 'Noel' },
      ships: { woodskiff: 'Wood Skiff' },
      projectiles: { basic: 'Basic Shot', fast: 'Fast Bolt', heavy: 'Heavy Shell', energy: 'Energy Pulse', plasma: 'Plasma Beam', quantum: 'Quantum Ray' }
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

  // (All translation keys are consolidated above in the `translations` object.)

  function readSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaults);
      const parsed = JSON.parse(raw);
      // migrate legacy single soundVolume to both music/voice if needed
      if (typeof parsed.musicVolume === 'undefined' && typeof parsed.voiceVolume === 'undefined' && typeof parsed.soundVolume === 'number'){
        parsed.musicVolume = parsed.soundVolume;
        parsed.voiceVolume = parsed.soundVolume;
      }
      return Object.assign({}, defaults, parsed);
    }catch(e){
      return Object.assign({}, defaults);
    }
  }

  function writeSettings(s){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
  }

  function applyLanguage(lang){
    // update UI strings we know about
    const t = translations[lang] || translations.ko;
    const btnStart = document.getElementById('btnStart');
    const btnHow = document.getElementById('btnHow');
    const btnSettings = document.getElementById('btnSettings');
    if (btnStart) btnStart.textContent = t.start;
    if (btnHow) btnHow.textContent = t.how;
    if (btnSettings) btnSettings.textContent = t.settings;
    // update the large background game title according to language
    const titleEl = document.querySelector('.game-title');
    if (titleEl) {
      const tMain = t.titleMain || '';
      const tSub = t.titleSub || '';
      // if translations provide a starWord, wrap its first occurrence with the starry markup
      let mainHTML = tMain;
      if (t.starWord && tMain.indexOf(t.starWord) !== -1) {
        const escaped = t.starWord;
        mainHTML = tMain.replace(escaped, `<span class=\"starry\"><span class=\"stars\" aria-hidden=\"true\"></span>${escaped}</span>`);
      }
      // assemble DOM: large line for main, small line for sub (in parentheses if provided)
      titleEl.innerHTML = `<span class=\"title-line title-large\">${mainHTML}</span><span class=\"title-line title-small\">${tSub}</span>`;
    }
    // update modal titles if open
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
    // broadcast a languagechange event for other modules to react
    try{ document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } })); }catch(e){}
  }

  function open(){
    const settings = readSettings();
    const t = translations[settings.language] || translations.ko;

    // build modal
    const modal = document.createElement('div');
    modal.className = 'modal settings-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');

    modal.innerHTML = `
      <h2>${t.settingsTitle}</h2>
      <div class="settings-row">
        <label class="settings-sound-label">${t.soundLabel}</label>
        <div>
          <!-- checkbox next to the sound label -->
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

  // wire up elements
  const chk = modal.querySelector('.settings-sound-enabled');
  const musicVol = modal.querySelector('.settings-music-volume');
  const voiceVol = modal.querySelector('.settings-voice-volume');
  const sel = modal.querySelector('.settings-language');
    const saveBtn = modal.querySelector('.settings-save');
    const closeBtn = modal.querySelector('.close');

    // checkbox semantics: checked === OFF, unchecked === ON
    chk.checked = !settings.soundEnabled;
    // set individual volumes (migrate if needed handled in readSettings)
    musicVol.value = (typeof settings.musicVolume === 'number') ? settings.musicVolume : defaults.musicVolume;
    voiceVol.value = (typeof settings.voiceVolume === 'number') ? settings.voiceVolume : defaults.voiceVolume;
    // show/hide volume controls depending on sound enabled
    const volWrap = modal.querySelector('.settings-volume-wrap');
    if (volWrap) {
      // when checkbox is checked => sound is OFF, so hide the volume controls
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

    // live preview: change volume & language immediately
    chk.addEventListener('change', function(){
      // checked means OFF, so invert when storing
      const s = readSettings(); s.soundEnabled = !chk.checked; writeSettings(s);
      // toggle volume UI: show when sound is ON (unchecked)
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
          // notify audio managers that settings changed (mute/unmute)
          try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
          try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
      }
    });
    musicVol.addEventListener('input', function(){
      const s = readSettings(); s.musicVolume = parseFloat(musicVol.value); writeSettings(s);
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
    });
    voiceVol.addEventListener('input', function(){
      const s = readSettings(); s.voiceVolume = parseFloat(voiceVol.value); writeSettings(s);
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
    });
    sel.addEventListener('change', function(){
      applyLanguage(sel.value);
      const s = readSettings(); s.language = sel.value; writeSettings(s);
    });

    saveBtn.addEventListener('click', function(){
      const s = readSettings();
      // persist inverted checkbox semantics (checked === OFF)
      s.soundEnabled = !chk.checked;
      s.musicVolume = parseFloat(musicVol.value);
      s.voiceVolume = parseFloat(voiceVol.value);
      s.language = sel.value;
      writeSettings(s);
      // apply language one more time (defensive)
      applyLanguage(s.language);
        try{ if (window.MenuBGM && typeof window.MenuBGM.updateVolume === 'function') window.MenuBGM.updateVolume(); }catch(e){}
        try{ document.dispatchEvent(new Event('settingschange')); }catch(e){}
      // close and restore UI
      try{ closeModal(); }catch(e){ /* best-effort */ }
    });

    closeBtn.addEventListener('click', function(){
      // just close and restore UI (don't persist unsaved changes)
      try{ closeModal(); }catch(e){ /* best-effort */ }
    });

    // create a backdrop so background controls are not clickable
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    // list of ids to disable while modal is open
    const disableIds = ['btnStart','btnHow','btnSettings'];
    const disabledElements = [];
    function disableBackgroundElements(){
      disableIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // store previous disabled state
        el.dataset._wasDisabled = el.disabled ? '1' : '0';
        try{ el.disabled = true; }catch(e){}
        // also remove from tab order
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

    // append backdrop then modal
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // disable background buttons
    disableBackgroundElements();

    // focus management: trap focus inside modal
    const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
    function refreshFocusable(){ focusableInside = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null); }

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

    function closeModal(){
      try{ modal.remove(); }catch(e){}
      try{ backdrop.remove(); }catch(e){}
      restoreBackgroundElements();
      document.removeEventListener('keydown', onKeyDown, true);
      // restore language in case of cancel
      const saved = readSettings();
      applyLanguage(saved.language);
    }

    // wire key handler
    document.addEventListener('keydown', onKeyDown, true);

    // focus the first focusable element in the modal
  try{ setTimeout(() => { refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else if (musicVol) musicVol.focus(); else closeBtn.focus(); }, 10); }catch(e){}
  }

  // init: apply stored language right away so menu uses correct language
  (function init(){
    const s = readSettings();
    applyLanguage(s.language);
    // expose API
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
