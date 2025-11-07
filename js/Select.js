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
		{ id: 'stage-1', title: '바다의 섬', subtitle: '초급', image: 'assets/stage1.jpg' },
		{ id: 'stage-2', title: '은하 협곡', subtitle: '중급', image: 'assets/stage2.jpg' },
		{ id: 'stage-3', title: '유성 필드', subtitle: '중상', image: 'assets/stage3.jpg' },
		{ id: 'stage-4', title: '고대 유적', subtitle: '고급', image: 'assets/stage4.jpg' },
		{ id: 'stage-5', title: '심해 미궁', subtitle: '보너스', image: 'assets/stage5.jpg' }
	];

	function createStageElement(stage) {
		const li = document.createElement('li');
		li.className = 'stage-item';
		li.setAttribute('role', 'listitem');
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

		return li;
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
	}

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

