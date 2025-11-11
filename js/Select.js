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
						// set practice mode flag on Game before starting
						try{ window.Game.practiceMode = !!(window.StageSelect && window.StageSelect.practice); }catch(e){}
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
								try{ window.Game.practiceMode = !!(window.StageSelect && window.StageSelect.practice); }catch(e){}
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

		// localization helper: update UI strings according to active language
		function updateLocalization(){
			const lang = (window.Settings && typeof window.Settings.get === 'function') ? window.Settings.get().language : 'ko';
			const translations = (window.Settings && window.Settings.translations) ? window.Settings.translations : {};
			const t = translations[lang] || {};

			// update customize button text
			const customizeBtn = document.getElementById('customizeBtn');
			if (customizeBtn) customizeBtn.textContent = (t.custom && t.custom.customizeBtn) || '커스텀마이징';

			// update stage titles (each .stage-item has dataset.stageId)
			const list = document.querySelectorAll('.stage-item');
			list.forEach(li => {
				const id = li.dataset.stageId;
				const titleEl = li.querySelector('.stage-title');
				if (!titleEl) return;
				const override = (t.stages && t.stages[id]);
				if (override) titleEl.textContent = override;
			});

			// update the top-right buttons if present
			const titleBtn = document.getElementById('btnToTitle');
			const settingsBtn = document.getElementById('selectSettingsBtn');
			if (titleBtn) titleBtn.textContent = (t.titleButton) || '타이틀';
			if (settingsBtn) settingsBtn.textContent = (t.settings) || ((t.settingsTitle) ? t.settingsTitle : '환경설정');

			// update practice mode label next to checkbox (preserve the input element)
			const practiceLabelEl = document.querySelector('.practice-label');
			if (practiceLabelEl){
				try{
					const input = practiceLabelEl.querySelector('input');
					const labelText = (t.practiceLabel) || '연습모드';
					// clear and re-append the input so we can set the localized text
					practiceLabelEl.innerHTML = '';
					if (input) practiceLabelEl.appendChild(input);
					practiceLabelEl.appendChild(document.createTextNode(' ' + labelText));
				}catch(e){ /* ignore */ }
			}
		}

		// try an initial localization pass (may run before setting.js loads); also react to future changes
		try{ updateLocalization(); }catch(e){}
		document.addEventListener('languagechange', function(ev){ try{ updateLocalization(); }catch(e){} });

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

		// --- top-right quick actions: Title and Settings buttons ---
		// create a small fixed container in the top-right of the viewport so it's visible
		(function createTopRightButtons(){
			const container = document.createElement('div');
			container.className = 'select-top-right-buttons';
			container.style.cssText = 'position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9999;align-items:center;pointer-events:auto;';

			// Title button: returns user to the start screen / title
			const titleBtn = document.createElement('button');
			titleBtn.id = 'btnToTitle';
			titleBtn.type = 'button';
			titleBtn.className = 'btn to-title';
			titleBtn.setAttribute('aria-label','타이틀로 돌아가기');
			titleBtn.textContent = '타이틀';

			// Settings button: opens the Settings modal implemented in js/setting.js
			const settingsBtn = document.createElement('button');
			settingsBtn.id = 'selectSettingsBtn';
			settingsBtn.type = 'button';
			settingsBtn.className = 'btn settings';
			settingsBtn.setAttribute('aria-label','환경설정 열기');
			settingsBtn.textContent = '환경설정';

			// click handlers
			titleBtn.addEventListener('click', function(){
				// show start screen, hide select UI and any game canvas
				const selectUI = document.getElementById('gameSelectUI');
				const startScreen = document.getElementById('startScreen');
				const canvasEl = document.getElementById('gameCanvas');
				const selectCanvas = document.getElementById('gameSelectCanvas');
				if (selectUI) { selectUI.style.display = 'none'; selectUI.setAttribute('aria-hidden','true'); }
				if (canvasEl) canvasEl.style.display = 'none';
				if (selectCanvas) selectCanvas.style.display = 'none';
				if (startScreen) { startScreen.style.display = ''; startScreen.removeAttribute('aria-hidden'); }
				// focus primary start button if present
				const btnStart = document.getElementById('btnStart');
				if (btnStart) try{ btnStart.focus(); }catch(e){}
			});

			settingsBtn.addEventListener('click', function(){
				// prefer native API if available
				if (window.Settings && typeof window.Settings.open === 'function'){
					window.Settings.open();
					return;
				}
				// fallback: trigger existing header settings button if present
				const hdr = document.getElementById('btnSettings');
				if (hdr) try{ hdr.click(); }catch(e){}
			});

			container.appendChild(titleBtn);
			container.appendChild(settingsBtn);

			// attach to the select UI so the buttons are only visible when the stage-select screen is shown
			const selectUIParent = document.getElementById('gameSelectUI') || document.body;
			selectUIParent.appendChild(container);
		})();

			// Move the practice mode checkbox/label to sit immediately under the stage list
			(function placePracticeToggle(){
				let practice = document.querySelector('.practice-label');
				// If it doesn't exist in DOM, create a simple labeled checkbox so localization can update it
				if (!practice){
					practice = document.createElement('label');
					practice.className = 'practice-label';
					const input = document.createElement('input');
					input.type = 'checkbox';
					input.id = 'practiceModeCheckbox';
					practice.appendChild(input);
					practice.appendChild(document.createTextNode(' 연습모드'));
				}

				// create container if missing (we append to body and absolutely position it under the stage list)
				let pc = document.getElementById('select-practice-container');
				if (!pc){
					pc = document.createElement('div');
					pc.id = 'select-practice-container';
					pc.style.cssText = 'position:absolute;left:0;top:0;z-index:9999;pointer-events:auto;';
					document.body.appendChild(pc);
				}
				// move the practice element into our container (appendChild will relocate if already present)
				pc.appendChild(practice);

				function position(){
					try{
						const ul = document.getElementById('stageList');
						const wrapper = ul ? ul.parentElement : null;
						if (wrapper){
							const r = wrapper.getBoundingClientRect();
							// position 12px from left edge of wrapper and 8px below its bottom
							pc.style.left = Math.max(8, Math.round(r.left + 12)) + 'px';
							pc.style.top = Math.max(8, Math.round(r.bottom + 8)) + 'px';
							// ensure we clear bottom/right anchors if previously set
							pc.style.right = '';
							pc.style.bottom = '';
						} else {
							// fallback to bottom-left of viewport
							pc.style.left = '12px';
							pc.style.top = '';
							pc.style.bottom = '12px';
						}
					}catch(e){}
				}

				// initial position and keep in sync on resize
				setTimeout(position, 20);
				window.addEventListener('resize', position);
				// if supported, observe wrapper size changes to reposition
				try{
					const ul = document.getElementById('stageList');
					const wrapper = ul ? ul.parentElement : null;
					if (wrapper && typeof ResizeObserver !== 'undefined'){
						const ro = new ResizeObserver(position);
						ro.observe(wrapper);
					}
				}catch(e){}

				// wire the checkbox state to window.StageSelect.practice so other code can read it
				try{
					const input = practice.querySelector('input[type="checkbox"]') || document.getElementById('practiceModeCheckbox');
					if (input){
						// set initial state from existing StageSelect if present
						window.StageSelect = window.StageSelect || {};
						input.checked = !!window.StageSelect.practice;
						input.addEventListener('change', function(){
							window.StageSelect.practice = !!input.checked;
						});
					}
				}catch(e){}
			})();

		// Expose for debugging and future wiring
		window.StageSelect = window.StageSelect || {};
		window.StageSelect.stages = stages;
		window.StageSelect.render = () => renderStageList('stageList');
		window.StageSelect.getElement = () => document.getElementById('stageList');
		// expose a localization refresh so callers (e.g. main.js) can force-update labels
		if (typeof updateLocalization === 'function') window.StageSelect.localize = updateLocalization;

			// ensure StageSelect.practice is propagated to Game when starting a stage
			// (startStageById will pick this up; set default false if not present)
			if (typeof window.StageSelect.practice === 'undefined') window.StageSelect.practice = false;
	});

})();

