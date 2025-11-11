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
    }
  };

  // (All translation keys are consolidated above in the `translations` object.)

  function readSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaults);
      const parsed = JSON.parse(raw);
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
          <!-- volume wrapper will be shown/hidden depending on checkbox -->
          <div class="settings-volume-wrap" style="margin-top:8px;">
            <input type="range" min="0" max="1" step="0.01" class="settings-volume" />
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
    const vol = modal.querySelector('.settings-volume');
    const sel = modal.querySelector('.settings-language');
    const saveBtn = modal.querySelector('.settings-save');
    const closeBtn = modal.querySelector('.close');

    // checkbox semantics: checked === OFF, unchecked === ON
    chk.checked = !settings.soundEnabled;
    vol.value = (typeof settings.soundVolume === 'number') ? settings.soundVolume : defaults.soundVolume;
    // show/hide volume control depending on sound enabled
    const volWrap = modal.querySelector('.settings-volume-wrap');
    if (volWrap) {
      // when checkbox is checked => sound is OFF, so hide the volume
      if (chk.checked) {
        volWrap.style.display = 'none';
        vol.setAttribute('aria-hidden','true');
        vol.disabled = true;
      } else {
        volWrap.style.display = '';
        vol.removeAttribute('aria-hidden');
        vol.disabled = false;
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
          // OFF -> hide volume
          volWrap.style.display = 'none';
          vol.disabled = true;
          vol.setAttribute('aria-hidden','true');
        } else {
          volWrap.style.display = '';
          vol.disabled = false;
          vol.removeAttribute('aria-hidden');
        }
      }
    });
    vol.addEventListener('input', function(){
      const s = readSettings(); s.soundVolume = parseFloat(vol.value); writeSettings(s);
    });
    sel.addEventListener('change', function(){
      applyLanguage(sel.value);
      const s = readSettings(); s.language = sel.value; writeSettings(s);
    });

    saveBtn.addEventListener('click', function(){
      const s = readSettings();
  // persist inverted checkbox semantics (checked === OFF)
  s.soundEnabled = !chk.checked;
      s.soundVolume = parseFloat(vol.value);
      s.language = sel.value;
      writeSettings(s);
      // apply language one more time (defensive)
      applyLanguage(s.language);
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
    try{ setTimeout(() => { refreshFocusable(); if (focusableInside[0]) focusableInside[0].focus(); else vol.focus(); }, 10); }catch(e){}
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
