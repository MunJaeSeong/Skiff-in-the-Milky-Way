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
		{ id: 'stage1', title: '바다의 섬', subtitle: '초급', image: 'assets/stage1.jpg' },
		{ id: 'stage2', title: '은하 협곡', subtitle: '중급', image: 'assets/stage2.jpg' },
		{ id: 'stage3', title: '유성 필드', subtitle: '중상', image: 'assets/stage3.jpg' },
		{ id: 'stage4', title: '고대 유적', subtitle: '고급', image: 'assets/stage4.jpg' },
		{ id: 'stage5', title: '심해 미궁', subtitle: '보너스', image: 'assets/stage5.jpg' }
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
		const first = ul.querySelector('.stage-item');
		if (first) {
			selectStageElement(first, stages[0].id);
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

		// Expose for debugging and future wiring
		window.StageSelect = window.StageSelect || {};
		window.StageSelect.stages = stages;
		window.StageSelect.render = () => renderStageList('stageList');
		window.StageSelect.getElement = () => document.getElementById('stageList');
	});

})();

