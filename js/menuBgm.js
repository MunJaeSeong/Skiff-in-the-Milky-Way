/*
  파일: js/menuBgm.js
  설명: 메뉴(타이틀, 설정, 선택 화면 등)에서 재생되는 배경음악을 관리합니다.
    - 배경음 파일: `assets/audio/main_bgm.mp3`
    - 볼륨과 음소거 상태는 `window.Settings.get()`에 따라 설정됩니다.
    - 외부에서 `window.MenuBGM.play()`, `stop()`, `updateVolume()`을 사용해 제어할 수 있습니다.

  주요 기능:
    - 오디오 객체를 한 번만 만들고 재사용합니다.
    - 자동 재생이 차단된 브라우저에서, 사용자가 클릭이나 키 입력을 했을 때
      재생을 다시 시도하도록 리스너를 붙여줍니다.

  핵심 아이디어:
    음악 플레이어 역할을 하는 작은 도우미
*/

// 즉시 실행 함수로 모듈화
// 'use strict' 모드 사용

(function(){
  'use strict';

  // 오디오 파일 경로
  const PATH = 'assets/audio/main_bgm.mp3';

  // 메뉴 배경음악 관리 객체
  const MenuBGM = {
    // 내부 오디오 객체
    _audio: null, 
    // 오디오 객체 생성/반환
    _ensure(){  
      if (this._audio) return this._audio;
      try{
        const a = new Audio(PATH);
        a.loop = true;
        a.preload = 'auto';
        // 가능하면 설정에서 초기 볼륨 및 음소거 상태를 적용
        try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s){ if (typeof s.musicVolume === 'number') a.volume = s.musicVolume; a.muted = (typeof s.soundEnabled === 'boolean') ? !s.soundEnabled : false; } }catch(e){}
        this._audio = a;
      }catch(e){ this._audio = null; }
      return this._audio;
    },
    // 재생 시작
    play(){
      try{
        const a = this._ensure();
        if (!a) return;
        // 최신 볼륨/음소거 상태가 적용되었는지 확인
        try{ const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null; if (s && typeof s.musicVolume === 'number') a.volume = s.musicVolume; if (s && typeof s.soundEnabled === 'boolean') a.muted = !s.soundEnabled; }catch(e){}
        // 재생 시도: 자동재생 정책으로 인한 프로미스 거부는 무시
        a.play().then(()=>{
          // 성공 : 아무 작업도 필요 없음
        }).catch(()=>{});
      }catch(e){}
    },
    // 사용자가 상호작용(클릭/키 입력/터치)을 수행할 때 재생을 재시도하도록 연결
    _attachGestureResume(){
      try{
        if (this._gestureAttached) return;
        const self = this;
        const attempt = function(){
          try{
            const a = self._ensure();
            if (!a) return;
            a.play().then(()=>{
              // 성공하면 핸들러 제거
              cleanup();
            }).catch(()=>{
              // 실패하면 다음 사용자 제스처를 계속 대기
            });
          }catch(e){}
        };
        // 정리 함수: 성공 시 이벤트 리스너 제거
        const cleanup = function(){
          try{ document.removeEventListener('click', attempt, true); }catch(e){}
          try{ document.removeEventListener('keydown', attempt, true); }catch(e){}
          try{ document.removeEventListener('touchstart', attempt, true); }catch(e){}
          self._gestureAttached = false;
        };
        // 이벤트 리스너 연결
        document.addEventListener('click', attempt, true);
        document.addEventListener('keydown', attempt, true);
        document.addEventListener('touchstart', attempt, true);
        this._gestureAttached = true;
      }catch(e){}
    },
    // 재생 중지
    stop(){
      try{
        if (this._audio){ try{ this._audio.pause(); this._audio.currentTime = 0; }catch(e){} }
      }catch(e){}
    },
    // 최신 설정에 따라 볼륨 및 음소거 상태 업데이트
    updateVolume(){
      try{
        if (!this._audio) return;
        const s = (window.Settings && window.Settings.get) ? window.Settings.get() : null;
        if (s && typeof s.musicVolume === 'number') this._audio.volume = s.musicVolume;
        if (s && typeof s.soundEnabled === 'boolean') this._audio.muted = !s.soundEnabled;
      }catch(e){}
    }
  };

  // 전역에 노출
  window.MenuBGM = window.MenuBGM || MenuBGM;

  // 설정이 변경되면 오디오 볼륨을 업데이트 (Settings는 로컬스토리지에 직접 기록)
  try{ document.addEventListener('settingschange', function(){ try{ if (window.MenuBGM) window.MenuBGM.updateVolume(); }catch(e){} }); }catch(e){}
  // 자동재생이 차단된 경우, 첫 번째 사용자 제스처 후 재생을 시도하도록 리스너 연결
  try{ if (window.MenuBGM && typeof window.MenuBGM._attachGestureResume === 'function') window.MenuBGM._attachGestureResume(); }catch(e){}

})();
