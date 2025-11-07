// 간단한 스타트 화면 스크립트
document.addEventListener('DOMContentLoaded', function(){
  const startScreen = document.getElementById('startScreen');
  const btnStart = document.getElementById('btnStart');
  const btnHow = document.getElementById('btnHow');
  const btnSettings = document.getElementById('btnSettings');
  const canvas = document.getElementById('gameCanvas');
  const selectCanvas = document.getElementById('gameSelectCanvas');
  const selectUI = document.getElementById('gameSelectUI');

  function hideStartScreen(){
    if (startScreen) startScreen.style.display = 'none';
    // 기본 동작: show the game select canvas and UI, not the main game canvas.
    if (selectCanvas){ selectCanvas.style.display = 'block'; try { selectCanvas.focus(); } catch(e){} }
    if (selectUI){ selectUI.style.display = 'block'; selectUI.setAttribute('aria-hidden','false'); }
  }

  btnStart && btnStart.addEventListener('click', function(){
    hideStartScreen();
    // Do not automatically start the game here. The selection UI will control when the
    // actual game canvas (`#gameCanvas`) should be shown and window.startGame invoked.
  });

  btnHow && btnHow.addEventListener('click', function(){
    showModal('게임 설명', '<p>화살표 키로 플레이어를 이동하여 장애물을 피하세요. 게임시작을 누르면 캔버스가 활성화됩니다.</p>');
  });

  btnSettings && btnSettings.addEventListener('click', function(){
    showModal('환경설정', '<p>현재 설정 항목은 없습니다. 추후 난이도/사운드 옵션을 추가할 수 있습니다.</p>');
  });

  // 모달 생성/표시 함수
  function showModal(title, html){
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<h2>${title}</h2><div>${html}</div>`;
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '닫기';
    close.addEventListener('click', function(){ modal.remove(); });
    modal.appendChild(close);
    document.body.appendChild(modal);
  }

  // 초기 상태: both canvases and select UI are hidden; start screen visible
  if (canvas) canvas.style.display = 'none';
  if (selectCanvas) selectCanvas.style.display = 'none';
  if (selectUI) { selectUI.style.display = 'none'; selectUI.setAttribute('aria-hidden','true'); }
});
