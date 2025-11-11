/* Menu BGM helper
   - Plays `assets/audio/main_bgm.mp3` on menu screens (title / select / settings / custom / explanation)
   - Respects Settings.get().musicVolume and Settings.get().soundEnabled
   - Exposes window.MenuBGM.play(), stop(), updateVolume()
*/
(function(){
  'use strict';

  const PATH = 'assets/audio/main_bgm.mp3';
  const MenuBGM = {
    _audio: null,
    _ensure(){
      if (this._audio) return this._audio;
      try{
        const a = new Audio(PATH);
        a.loop = true;
        a.preload = 'auto';
        // initial volume/muted from settings if available
        try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s){ if (typeof s.musicVolume === 'number') a.volume = s.musicVolume; a.muted = (typeof s.soundEnabled === 'boolean') ? !s.soundEnabled : false; } }catch(e){}
        this._audio = a;
      }catch(e){ this._audio = null; }
      return this._audio;
    },
    play(){
      try{
        const a = this._ensure();
        if (!a) return;
        // ensure latest volume/mute state applied
        try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s && typeof s.musicVolume === 'number') a.volume = s.musicVolume; if (s && typeof s.soundEnabled === 'boolean') a.muted = !s.soundEnabled; }catch(e){}
        // try to play, ignore promise rejection (autoplay policies)
        a.play().then(()=>{
          // success: nothing special
        }).catch(()=>{});
      }catch(e){}
    },
    // attempt to resume playback when the user performs an interaction (click/keydown/touch)
    _attachGestureResume(){
      try{
        if (this._gestureAttached) return;
        const self = this;
        const attempt = function(){
          try{
            const a = self._ensure();
            if (!a) return;
            a.play().then(()=>{
              // succeeded: remove handlers
              cleanup();
            }).catch(()=>{
              // keep listening for next gesture
            });
          }catch(e){}
        };
        const cleanup = function(){
          try{ document.removeEventListener('click', attempt, true); }catch(e){}
          try{ document.removeEventListener('keydown', attempt, true); }catch(e){}
          try{ document.removeEventListener('touchstart', attempt, true); }catch(e){}
          self._gestureAttached = false;
        };
        document.addEventListener('click', attempt, true);
        document.addEventListener('keydown', attempt, true);
        document.addEventListener('touchstart', attempt, true);
        this._gestureAttached = true;
      }catch(e){}
    },
    stop(){
      try{
        if (this._audio){ try{ this._audio.pause(); this._audio.currentTime = 0; }catch(e){} }
      }catch(e){}
    },
    updateVolume(){
      try{
        if (!this._audio) return;
        const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null;
        if (s && typeof s.musicVolume === 'number') this._audio.volume = s.musicVolume;
        if (s && typeof s.soundEnabled === 'boolean') this._audio.muted = !s.soundEnabled;
      }catch(e){}
    }
  };

  // expose globally
  window.MenuBGM = window.MenuBGM || MenuBGM;

  // when settings change, update the audio volume (Settings writes to localStorage directly)
  try{ document.addEventListener('settingschange', function(){ try{ if (window.MenuBGM) window.MenuBGM.updateVolume(); }catch(e){} }); }catch(e){}
  // Attach a resume-on-interaction listener so autoplay-blocked audio can start after first user gesture
  try{ if (window.MenuBGM && typeof window.MenuBGM._attachGestureResume === 'function') window.MenuBGM._attachGestureResume(); }catch(e){}

})();
