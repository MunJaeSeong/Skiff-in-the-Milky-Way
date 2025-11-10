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
      starWord: '은하수'
    },
    en: {
      start: 'Start',
      how: 'How to Play',
      settings: 'Settings',
      settingsTitle: 'Settings',
      save: 'Save',
      close: 'Close',
      soundLabel: 'Sound',
      languageLabel: 'Language'
      ,
      titleMain: 'skiff in the',
      titleSub: 'milky way',
      starWord: 'skiff'
    },
    ja: {
      start: 'スタート',
      how: '遊び方',
      settings: '設定',
      settingsTitle: '設定',
      save: '保存',
      close: '閉じる',
      soundLabel: 'サウンド',
      languageLabel: '言語'
      ,
      titleMain: '銀河の中の',
      titleSub: '小舟',
      starWord: '銀河'
    }
  };

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
          <label style="display:inline-flex;align-items:center;gap:8px;">
            <input type="checkbox" class="settings-sound-enabled">
          </label>
          <div style="margin-top:8px;">
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

    chk.checked = !!settings.soundEnabled;
    vol.value = (typeof settings.soundVolume === 'number') ? settings.soundVolume : defaults.soundVolume;
    sel.value = settings.language || 'ko';

    // live preview: change volume & language immediately
    chk.addEventListener('change', function(){
      const s = readSettings(); s.soundEnabled = chk.checked; writeSettings(s);
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
      s.soundEnabled = !!chk.checked;
      s.soundVolume = parseFloat(vol.value);
      s.language = sel.value;
      writeSettings(s);
      // apply language one more time (defensive)
      applyLanguage(s.language);
      try{ modal.remove(); }catch(e){}
    });

    closeBtn.addEventListener('click', function(){
      try{ modal.remove(); }catch(e){}
      // restore language from stored value in case user changed but didn't save
      const saved = readSettings();
      applyLanguage(saved.language);
    });

    // append and focus
    document.body.appendChild(modal);
    try{ vol.focus(); }catch(e){}
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
  })();

})();
