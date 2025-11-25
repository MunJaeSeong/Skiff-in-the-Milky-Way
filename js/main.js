/*
  파일: js/main.js
  설명: 게임 시작 화면(타이틀 화면)을 제어하는 스크립트
    - '게임시작' 버튼을 누르면 스테이지 선택 화면을 보여줍니다.
    - '게임설명'과 '환경설정' 버튼은 각각 다른 모듈에게 기능을 맡깁니다.
    - 시작 화면에 반짝이는 별 효과를 만들고, 메뉴 배경음 호출도 시작합니다.

  주요 행동:
    - 버튼 클릭 연결 (시작, 설명, 설정)
    - 기본 모달 생성 함수 `showModal` 제공 (간단한 팝업)
    - 시작 화면의 초기 보이기/숨기기 상태 설정
    - 배경 별(stars) 요소 생성으로 시각 효과 추가

  핵심 아이디어:
    사용자가 '게임시작'을 누르면 실제 게임 자체를 바로 실행하지 않고,
    스테이지 선택 화면을 먼저 보여주도록 연결해 주는 역할을 합니다.
*/

// DOMContentLoaded 이벤트 후 실행
document.addEventListener('DOMContentLoaded', function(){
  // 내부 변수 선언 및 요소 참조
  const startScreen = document.getElementById('startScreen'); // 시작 화면 요소
  const btnStart = document.getElementById('btnStart'); // '게임시작' 버튼 요소
  const btnHow = document.getElementById('btnHow'); // '게임설명' 버튼 요소
  const btnSettings = document.getElementById('btnSettings'); // '환경설정' 버튼 요소
  // Note: canvases and select UI are now moved to their own pages.

  // 이동: 시작 화면을 닫고 스테이지 선택 페이지로 이동합니다.
  function goToSelect(){
    try {
      // Prefer a relative navigation to the dedicated select page
      window.location.href = 'select.html';
    } catch (e) {
      // Fallback: hide the start screen if navigation fails
      if (startScreen) startScreen.style.display = 'none';
    }
  }

  // 게임 시작 버튼 클릭 이벤트 연결
  btnStart && btnStart.addEventListener('click', function(){
    goToSelect();
  });

  // 게임 설명 버튼 클릭 이벤트 연결
  btnHow && btnHow.addEventListener('click', function(){
    // 설명 UI 처리는 `explanation.js`에 위임하고, 없으면 간단한 모델로 대체
    if (window.Explanation && typeof window.Explanation.open === 'function') {
      window.Explanation.open();
    } else {
      showModel('게임 설명', '<p>오류가 발생했습니다. 다시 시도해주세요.</p>');
    }
  });

  // 환경설정 버튼 클릭 이벤트 연결
  btnSettings && btnSettings.addEventListener('click', function(){
    // 환경설정 UI 처리는 `setting.js`에 위임하고, 없으면 간단한 모델로 대체
    if (window.Settings && typeof window.Settings.open === 'function') {
      window.Settings.open();
    } else {
      showModel('환경설정', '<p>오류가 발생했습니다. 다시 시도해주세요.</p>');
    }
  });

  // 모델 생성/표시 함수
  function showModel(title, html){
    const model = document.createElement('div');
    model.className = 'modal';
    model.setAttribute('role', 'dialog');
    model.setAttribute('aria-modal', 'true');
    model.innerHTML = `<h2>${title}</h2><div>${html}</div>`;
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '닫기';
    close.addEventListener('click', function(){
      try { model.remove(); } catch (e) { /* ignore */ }
    });
    model.appendChild(close);
    document.body.appendChild(model);
    // 키보드 사용자가 빠르게 닫을 수 있도록 닫기 버튼에 포커스 설정(키보드로 접근 가능하게)
    try { close.focus(); } catch (e) {}
  }

  // 초기 상태: (no-op) canvases and select UI live on other pages now

  // 시작 화면에 배경 별 생성 (부드러운 반짝임 효과)
  (function createBackgroundStars(){
    if (!startScreen) return;
    // 컨테이너 생성
    const container = document.createElement('div');
    container.className = 'bg-stars';
    // 첫 번째 자식으로 삽입하여 오버레이가 위에 위치하도록 함
    startScreen.prepend(container);

    const count = 80; // 별 개수
    for (let i = 0; i < count; i++){
      const s = document.createElement('div');
      s.className = 'bg-star';
      // 크기 구분
      const r = Math.random();
      if (r < 0.6) s.classList.add('small');
      else if (r < 0.9) s.classList.add('med');
      else s.classList.add('large');
      // 무작위 위치
      s.style.left = (Math.random()*100) + '%';
      s.style.top = (Math.random()*100) + '%';
      // 무작위 깜박임 지속시간 및 지연
      const dur = (1.2 + Math.random()*3.2).toFixed(2) + 's';
      const delay = (Math.random()*4).toFixed(2) + 's';
      s.style.setProperty('--dur', dur);
      s.style.setProperty('--delay', delay);
      container.appendChild(s);
    }
  })();
  // 시작 메뉴 배경 음악 (최선의 노력; 사용자 제스처가 있을 때까지 자동 재생이 차단될 수 있음)
  // menuBgm.js 를 참조
  try{ if (window.MenuBGM && typeof window.MenuBGM.play === 'function') window.MenuBGM.play(); }catch(e){}
});
