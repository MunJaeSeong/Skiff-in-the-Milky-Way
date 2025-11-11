/*
	Select.js
	- Renders a scrollable stage selector driven by the `stages` array
	- Provides a simple global `StageSelect` object for future wiring
	Note: This file only creates the UI and does not implement selection logic.
*/

(function () {
	'use strict';

	// Stages array: add new stage objects here to extend the selector.
	// Each item should include: id, title, subtitle (optional), image (relative path)
	const stages = [
		{ id: 'stage1', title: '은하 협곡', subtitle: '-개발중-', image: 'assets/stage/galaxy-canyon.png' },
		{ id: 'stage2', title: '바다의 섬', subtitle: '-개발중-', image: 'assets/stage/ocean-island.png' },
		{ id: 'stage3', title: '초신성 폭발', subtitle: '-개발중-', image: 'assets/stage/supernova-explosion.jpg' },
		{ id: 'stage4', title: 'Coming Soon', subtitle: '-개발중-', image: 'assets/stage/coming-soon.png' }
	];

	function createStageElement(stage) {
		const li = document.createElement('li');
		li.className = 'stage-item';
		li.setAttribute('role', 'listitem');
		// make each item keyboard-focusable and behave like an option
		li.tabIndex = 0;
		li.setAttribute('role', 'option');
		li.setAttribute('aria-selected', 'false');
		li.dataset.stageId = stage.id;

		const thumb = document.createElement('div');
		thumb.className = 'stage-thumb';
		// Try to use provided image if it exists; fallback color handled in CSS
		if (stage.image) {
			thumb.style.backgroundImage = `url('${stage.image}')`;
		}

		const meta = document.createElement('div');
		meta.className = 'stage-meta';
		const title = document.createElement('div');
		title.className = 'stage-title';
		title.textContent = stage.title || '제목 없음';
		const sub = document.createElement('div');
		sub.className = 'stage-sub';
		sub.textContent = stage.subtitle || '';

		meta.appendChild(title);
		meta.appendChild(sub);


		li.appendChild(thumb);
		li.appendChild(meta);

		// click and keyboard activation
		li.addEventListener('click', function () {
			selectStageElement(li, stage.id);
		});

		li.addEventListener('keydown', function (ev) {
			if (ev.key === 'Enter' || ev.key === ' ') {
				ev.preventDefault();
				selectStageElement(li, stage.id);
			}
		});

		return li;
	}

	function selectStageElement(el, stageId) {
		// clear previous selection
		const list = document.querySelectorAll('.stage-item');
		list.forEach((i) => i.setAttribute('aria-selected', 'false'));
		// set new selection
		el.setAttribute('aria-selected', 'true');
		// record selected id
		window.StageSelect = window.StageSelect || {};
		window.StageSelect.selected = stageId;
		// ensure visible and centered within the scroll wrapper
		try { centerSelected(el); } catch (e) {}
		// dispatch a custom event so other code can react
		const listEl = document.getElementById('stageList');
		if (listEl) {
			listEl.dispatchEvent(new CustomEvent('stagechange', { detail: { id: stageId } }));
		}

		// stage1 선택 시 자동으로 player/game 스크립트를 로드하고 스테이지를 시작
		try { startStageById(stageId); } catch (e) { console.error(e); }
	}

	function renderStageList(containerId) {
		const ul = document.getElementById(containerId);
		if (!ul) return;
		// Clear any existing children
		ul.innerHTML = '';

		stages.forEach((s) => {
			const item = createStageElement(s);
			ul.appendChild(item);
		});

		// set sizes based on viewport (each stage ~ 1/4 of viewport width)
		updateStageSizes();

		// default: select the first stage so UI shows centered selection
		// default: do NOT auto-select/start a stage on page load.
		// Instead, center the first item visually so the UI looks good,
		// but wait for explicit user action (click/Enter) to start.
		const first = ul.querySelector('.stage-item');
		if (first) {
			try { centerSelected(first); } catch (e) { /* ignore */ }
			// intentionally do NOT call selectStageElement here to avoid auto-start
		}
	}

	// compute desired stage width (1/4 of viewport width, min 120px)
	// compute desired stage width (1/3 of viewport width, min 120px)
	function computeStageWidth() {
		const w = Math.floor(window.innerWidth / 3);
		return Math.max(120, w);
	}

	function updateStageSizes() {
		const ul = document.getElementById('stageList');
		if (!ul) return;
		const width = computeStageWidth();
		ul.querySelectorAll('.stage-item').forEach((li) => {
			li.style.minWidth = width + 'px';
			li.style.width = width + 'px';
			// keep height proportional to width (approx 0.6 ratio)
			li.style.height = Math.floor(width * 0.6) + 'px';
		});
	}

	// center the selected element inside its scroll wrapper using precise scroll math
	function centerSelected(el) {
		const ul = document.getElementById('stageList');
		if (!ul) return;
		const wrapper = ul.parentElement; // .stage-list-wrapper
		if (!wrapper) return;
		const elRect = el.getBoundingClientRect();
		const wrapRect = wrapper.getBoundingClientRect();
		// compute current scrollLeft and required offset to center the element
		const offsetLeft = el.offsetLeft + (el.offsetWidth / 2) - (wrapper.clientWidth / 2);
		wrapper.scrollTo({ left: offsetLeft, behavior: 'smooth' });
	}

		// --- 스크립트 동적 로드 및 스테이지 시작 도우미 ---
		// 같은 src를 중복으로 삽입하지 않도록 검사하고 Promise를 반환합니다.
		function loadScriptOnce(src){
			return new Promise((resolve, reject) => {
				// 이미 로드된 경우 바로 resolve
				const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith(src));
				if (existing) return resolve(existing);
				const s = document.createElement('script');
				s.src = src;
				s.onload = () => resolve(s);
				s.onerror = (e) => reject(new Error('Failed to load script: '+src));
				document.body.appendChild(s);
			});
		}

		// stageId가 'stage1'일 때 player.js와 gameScript.js(없다면)를 보장한 뒤 Game.startStage 호출
		function startStageById(stageId){
			if (!stageId) return;
			// 여기서는 stage1에 대해서만 자동 시작 로직을 적용
			if (stageId !== 'stage1') return;

			// 먼저 player와 game 런타임 스크립트를 로드
			const playerSrc = 'js/game/player.js';
			const gameSrc = 'js/game/gameScript.js';

			// 로드 순서: player -> game (game은 player가 없어도 동작하지만 Player 필요)
			loadScriptOnce(playerSrc).catch((e)=>{
				console.warn('player.js 로드 실패:', e);
			}).then(()=>{
				return loadScriptOnce(gameSrc).catch((e)=>{
					console.warn('gameScript.js 로드 실패:', e);
				});
			}).then(()=>{
				try{
					// Game 존재 여부 확인 및 초기화
					if (window.Game){
						// 먼저 UI 전환: 선택 화면을 숨기고 게임 캔버스를 보이게 함
						const canvasEl = document.getElementById('gameCanvas');
						const selectUI = document.getElementById('gameSelectUI');
						const startScreen = document.getElementById('startScreen');
						if (selectUI) selectUI.style.display = 'none';
						if (startScreen) startScreen.style.display = 'none';
						if (canvasEl){
							canvasEl.style.display = '';
							// make canvas fill viewport if CSS does not; update size via Game.init
							canvasEl.style.width = '100vw';
							canvasEl.style.height = '100vh';
						}
						// 초기화 및 스테이지 시작
						if (!window.Game.canvas) window.Game.init && window.Game.init('gameCanvas');
						window.Game.startStage && window.Game.startStage(stageId).catch(console.error);
					} else {
						// 만약 gameScript가 비동기로 로드되어 아직 전역에 붙지 않았다면 잠깐 대기 후 시도
						setTimeout(()=>{
							if (window.Game){
								// 같은 UI 전환 처리
								const canvasEl2 = document.getElementById('gameCanvas');
								const selectUI2 = document.getElementById('gameSelectUI');
								const startScreen2 = document.getElementById('startScreen');
								if (selectUI2) selectUI2.style.display = 'none';
								if (startScreen2) startScreen2.style.display = 'none';
								if (canvasEl2){
									canvasEl2.style.display = '';
									canvasEl2.style.width = '100vw';
									canvasEl2.style.height = '100vh';
								}
								window.Game.init && window.Game.init('gameCanvas');
								window.Game.startStage && window.Game.startStage(stageId).catch(console.error);
							} else {
								console.error('Game 런타임을 찾을 수 없습니다. js/game/gameScript.js가 올바르게 로드되었는지 확인하세요.');
							}
						}, 120);
					}
				}catch(err){ console.error(err); }
			});
		}

	// keep sizes responsive
	window.addEventListener('resize', function () {
		updateStageSizes();
		// if there's a selected element, re-center it after resize
		const ul = document.getElementById('stageList');
		if (!ul) return;
		const sel = ul.querySelector('.stage-item[aria-selected="true"]');
		if (sel) centerSelected(sel);
	});

	// Initialize when DOM is ready
	document.addEventListener('DOMContentLoaded', () => {
		renderStageList('stageList');

		// wire customize button to open the Custom UI if available
		const customizeBtn = document.getElementById('customizeBtn');
		if (customizeBtn) {
			customizeBtn.addEventListener('click', function(){
				if (window.Custom && typeof window.Custom.open === 'function') {
					window.Custom.open();
				} else {
					// fallback: simple alert for now
					try { alert('커스터마이징 기능을 사용할 수 없습니다.'); } catch(e){}
				}
			});
		}

		// Expose for debugging and future wiring
		window.StageSelect = window.StageSelect || {};
		window.StageSelect.stages = stages;
		window.StageSelect.render = () => renderStageList('stageList');
		window.StageSelect.getElement = () => document.getElementById('stageList');
	});

})();

