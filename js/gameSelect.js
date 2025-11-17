/*
    파일: js/gameSelect.js
    설명 : '스테이지 선택 화면'을 만들어 주는 코드
        화면에 여러 개의 스테이지(레벨) 항목을 보여주고,
        사용자가 클릭하거나 키보드로 선택하면 그 스테이지를 실행하도록 도와줍니다.

    어떤 기능이 있는가:
        - 화면에 스테이지 목록을 만들어 보여줍니다.
        - 사용자가 스테이지를 선택하면 선택 표시를 바꾸고 이벤트를 보냅니다.
        - 필요한 게임 스크립트(해당 스테이지 스크립트)를 중복으로 추가하지 않고 한 번만 불러옵니다.
        - 선택된 항목을 가로 스크롤 영역의 가운데로 맞춰줍니다.

    주요 함수:
        - renderStageList(containerId): 지정한 목록(`ul`)에 스테이지 항목을 추가합니다.
        - createStageElement(stage): 스테이지 하나를 보여줄 `li` 요소를 만듭니다.
        - selectStageElement(el, stageId): 선택 정보를 갱신하고 스테이지 실행을 요청합니다.
        - loadScriptOnce(src): 같은 파일을 여러 번 넣지 않도록 검사하고 한 번만 로드합니다.(중요)
        - startStageById(stageId): 필요한 스크립트를 순서대로 불러오고 게임을 시작합니다.(중요)
        - centerSelected(el): 선택한 항목을 스크롤 가운데로 이동합니다.

    핵심 아이디어:
        이 코드는 스테이지 버튼들을 만들고, 버튼을 누르면 필요한 파일을 불러와서
        게임을 시작하도록 연결해 주는 '중계자' 역할을 합니다.
*/

// 즉시 실행 함수로 모듈화
(function () {
        'use strict';

    // 스테이지 배열: 선택기(selector)에 새 스테이지 객체를 추가하려면 여기에 항목을 추가하세요.
    // 각 항목은 다음을 포함해야 합니다: id, title, subtitle(선택), image(상대 경로)
    const stages = [
        { id: 'stage1', title: '은하 협곡', subtitle: '-개발중-', image: 'assets/stage/coming-soon.png' },
        { id: 'stage2', title: '바다의 섬', subtitle: '-개발중-', image: 'assets/stage/coming-soon.png' },
        { id: 'stage3', title: '은하 협곡', subtitle: '탄막 게임', image: 'assets/select/galaxy-canyon.png' },
        { id: 'stage4', title: 'Coming Soon', subtitle: '-개발중-', image: 'assets/stage/coming-soon.png' }
    ];

    // 스테이지 항목 하나를 생성하는 함수
    function createStageElement(stage) {
        const li = document.createElement('li');
        li.className = 'stage-item';
        li.setAttribute('role', 'listitem');
        // 각 항목을 키보드로 포커스할 수 있게 하고 옵션처럼 동작하도록 설정
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

        // 클릭 및 키보드로 활성화 처리
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
        // 이전 선택 해제
        const list = document.querySelectorAll('.stage-item');
        list.forEach((i) => i.setAttribute('aria-selected', 'false'));
        // 새 선택 설정
        el.setAttribute('aria-selected', 'true');
        // 선택한 id 기록
        window.StageSelect = window.StageSelect || {};
        window.StageSelect.selected = stageId;
        // 스크롤 래퍼 내에서 가시화하고 가운데로 정렬
        try { centerSelected(el); } catch (e) {}
        // 다른 코드가 반응할 수 있도록 커스텀 이벤트 발생
        const listEl = document.getElementById('stageList');
        if (listEl) {
            listEl.dispatchEvent(new CustomEvent('stagechange', { detail: { id: stageId } }));
        }

        // 선택한 스테이지에 따라 필요한 스크립트를 로드하고 스테이지를 시작
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

        // 기본 동작: 첫 번째 스테이지를 선택하지는 않지만 UI가 가운데에 보이도록 첫 항목을 중앙에 맞춤
        // 자동으로 페이지 로드 시 스테이지를 시작하지 않습니다. 사용자의 명시적 동작(클릭/Enter)을 기다립니다.
        const first = ul.querySelector('.stage-item');
        if (first) {
            try { centerSelected(first); } catch (e) { /* ignore */ }
            // intentionally do NOT call selectStageElement here to avoid auto-start
        }
    }

    // 원하는 스테이지 너비 계산 (뷰포트의 1/3, 최소 120px)
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

    // 선택된 요소를 스크롤 래퍼 내부 가운데로 정밀하게 스크롤하여 위치시킴
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
        // 동일한 src를 중복으로 삽입하지 않도록 검사하고 Promise를 반환합니다.
        function loadScriptOnce(src){
            return new Promise((resolve, reject) => {
                try{
                    // Resolve the provided src to an absolute URL based on the document base
                    const absolute = new URL(src, document.baseURI).href;
                    // Find an already-inserted script that matches either the resolved href
                    // or the original attribute value. This is more robust than simple endsWith.
                    const existing = Array.from(document.scripts).find(s => {
                        try{
                            if (!s) return false;
                            if (s.src && s.src === absolute) return true;
                            const attr = s.getAttribute && s.getAttribute('src');
                            if (attr && attr === src) return true;
                            // fallback: check pathname match
                            if (s.src){
                                try{
                                    const aPath = (new URL(s.src)).pathname || '';
                                    const srcPath = (new URL(src, document.baseURI)).pathname || '';
                                    if (aPath === srcPath) return true;
                                }catch(e){}
                            }
                        }catch(e){ }
                        return false;
                    });
                    if (existing) return resolve(existing);

                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = () => resolve(s);
                    s.onerror = (e) => reject(new Error('Failed to load script: '+src));
                    document.body.appendChild(s);
                }catch(err){
                    reject(err);
                }
            });
        }

        // stageId에 따라 필요한 player 및 게임 런타임(gameScript.js)을 불러온 뒤 Game.startStage 호출
        function startStageById(stageId){
            if (!stageId) return;
            // allow starting any stage (not limited to stage1)
            // 모든 스테이지 시작을 허용 (stage1에 한정하지 않음)
            // 먼저 player와 게임 런타임 스크립트가 실제 폴더에서 로드되었는지 확인
            // Build stage-specific paths from the stageId folder: js/game/<stageId>/...
            const base = `js/game/${stageId}/`;
            const playerSrc = `${base}player.js`;
            const groundSrc = `${base}ground.js`;
            const gameSrc = `${base}gameScript.js`;

            // 로드 순서: player -> 게임 (game은 player가 없어도 실행되지만 Player가 필요한 경우가 있음)
            // Load player, then ground, then game script to ensure dependencies exist
            loadScriptOnce(playerSrc).catch((e)=>{
                console.warn('player.js 로드 실패:', e);
            }).then(()=>{
                return loadScriptOnce(groundSrc).catch((e)=>{
                    console.warn('ground.js 로드 실패:', e);
                });
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
                                // CSS로 처리되지 않으면 캔버스가 뷰포트를 채우도록 설정; 이후 Game.init에서 크기 업데이트
                            canvasEl.style.width = '100vw';
                            canvasEl.style.height = '100vh';
                        }
                        // 시작 전에 Game에 연습모드 플래그 설정
                        try{ window.Game.practiceMode = !!(window.StageSelect && window.StageSelect.practice); }catch(e){}
                        // 초기화 및 스테이지 시작
                        if (!window.Game.canvas) window.Game.init && window.Game.init('gameCanvas');
                        // Attempt to ensure the stage script is loaded (stage files live under js/game/stage3/)
                        const stageSrc = `${base}${stageId}.js`;
                        loadScriptOnce(stageSrc).catch(()=> Promise.resolve()).then(()=>{
                            try{ window.Game.startStage && window.Game.startStage(stageId).catch(console.error); }catch(e){console.error(e);} 
                        });
                        } else {
                        // 만약 gameScript가 비동기로 로드되어 아직 전역에 붙지 않았다면 잠시 대기 후 재시도
                        setTimeout(()=>{
                            if (window.Game){
                                // 동일한 UI 전환 처리
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
                                const stageSrc = `${base}${stageId}.js`;
                                loadScriptOnce(stageSrc).catch(()=> Promise.resolve()).then(()=>{
                                    try{ window.Game.startStage && window.Game.startStage(stageId).catch(console.error); }catch(e){console.error(e);} 
                                });
                            } else {
                                    console.error('Game 런타임을 찾을 수 없습니다. js/game/gameScript.js가 올바르게 로드되었는지 확인하세요.');
                            }
                        }, 120);
                    }
                }catch(err){ console.error(err); }
            });
        }

    // 크기 반응형 유지
    window.addEventListener('resize', function () {
        updateStageSizes();
        // if there's a selected element, re-center it after resize
        const ul = document.getElementById('stageList');
        if (!ul) return;
        const sel = ul.querySelector('.stage-item[aria-selected="true"]');
        if (sel) centerSelected(sel);
    });

    // 초기화: DOMContentLoaded 후 스테이지 목록 렌더링
    document.addEventListener('DOMContentLoaded', () => {
        renderStageList('stageList');

        // 지역화 도우미: 활성 언어에 따라 UI 문자열을 업데이트
        function updateLocalization(){
            const lang = (window.Settings && typeof window.Settings.get === 'function') ? window.Settings.get().language : 'ko';
            const translations = (window.Settings && window.Settings.translations) ? window.Settings.translations : {};
            const t = translations[lang] || {};

            // 커스터마이즈 버튼 텍스트 업데이트
            const customizeBtn = document.getElementById('customizeBtn');
            if (customizeBtn) customizeBtn.textContent = (t.custom && t.custom.customizeBtn) || '커스텀마이징';

            // 스테이지 제목 업데이트 (.stage-item 각각이 dataset.stageId를 가짐)
            const list = document.querySelectorAll('.stage-item');
            list.forEach(li => {
                const id = li.dataset.stageId;
                const titleEl = li.querySelector('.stage-title');
                if (!titleEl) return;
                const override = (t.stages && t.stages[id]);
                if (override) titleEl.textContent = override;
            });

            // 우측 상단 버튼 텍스트 업데이트(존재하는 경우)
            const titleBtn = document.getElementById('btnToTitle');
            const settingsBtn = document.getElementById('selectSettingsBtn');
            if (titleBtn) titleBtn.textContent = (t.titleButton) || '타이틀';
            if (settingsBtn) settingsBtn.textContent = (t.settings) || ((t.settingsTitle) ? t.settingsTitle : '환경설정');

            // 체크박스 옆의 연습모드 라벨 업데이트(입력 요소 보존)
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

        // 초기 지역화 시도 (setting.js가 로드되기 전에 실행될 수 있음); 이후 변경에도 반응
        try{ updateLocalization(); }catch(e){}
        document.addEventListener('languagechange', function(ev){ try{ updateLocalization(); }catch(e){} });

        // 커스터마이즈 버튼을 Custom UI로 연결 (가능한 경우)
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

        // --- 우측 상단 빠른 액션: 타이틀 및 설정 버튼 ---
        // 뷰포트 우측 상단에 보이도록 작은 고정 컨테이너 생성
        (function createTopRightButtons(){
            const container = document.createElement('div');
            container.className = 'select-top-right-buttons';
            container.style.cssText = 'position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9999;align-items:center;pointer-events:auto;';

            // 타이틀 버튼: 사용자를 시작 화면(타이틀)으로 되돌림
            const titleBtn = document.createElement('button');
            titleBtn.id = 'btnToTitle';
            titleBtn.type = 'button';
            titleBtn.className = 'btn to-title';
            titleBtn.setAttribute('aria-label','타이틀로 돌아가기');
            titleBtn.textContent = '타이틀';

            // 환경설정 버튼: `js/setting.js`에 구현된 설정 모달을 엶
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'selectSettingsBtn';
            settingsBtn.type = 'button';
            settingsBtn.className = 'btn settings';
            settingsBtn.setAttribute('aria-label','환경설정 열기');
            settingsBtn.textContent = '환경설정';

            // 타이틀 클릭 핸들러
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

            // 설정 클릭 핸들러
            settingsBtn.addEventListener('click', function(){
                // 네이티브 API가 있으면 우선 사용
                if (window.Settings && typeof window.Settings.open === 'function'){
                    window.Settings.open();
                    return;
                }
                // 폴백: 헤더의 기존 설정 버튼을 트리거
                const hdr = document.getElementById('btnSettings');
                if (hdr) try{ hdr.click(); }catch(e){}
            });

            container.appendChild(titleBtn);
            container.appendChild(settingsBtn);

            // 선택 UI에 붙여서 스테이지 선택 화면이 보일 때만 버튼이 보이도록 함
            const selectUIParent = document.getElementById('gameSelectUI') || document.body;
            selectUIParent.appendChild(container);
        })();

            // 연습모드 체크박스/라벨을 스테이지 목록 바로 아래에 배치
            (function placePracticeToggle(){
                let practice = document.querySelector('.practice-label');
                // 만약 DOM에 없으면 간단한 라벨이 있는 체크박스를 만들어 지역화가 가능하게 함
                if (!practice){
                       practice = document.createElement('label');
                    practice.className = 'practice-label';
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = 'practiceModeCheckbox';
                    practice.appendChild(input);
                    practice.appendChild(document.createTextNode(' 연습모드'));
                }

                // 별도의 컨테이너에 절대 위치로 배치하여 스테이지 목록과 겹치지 않도록 함
                const selectUIParent = document.getElementById('gameSelectUI') || null;
                let pc = document.getElementById('select-practice-container');
                if (!pc){
                    pc = document.createElement('div');
                    pc.id = 'select-practice-container';
                    pc.style.cssText = 'position:absolute;left:0;top:0;z-index:9999;pointer-events:auto;';
                    if (selectUIParent) selectUIParent.appendChild(pc); else document.body.appendChild(pc);
                }
                // 기존 내용 제거 후 연습모드 토글 추가
                pc.appendChild(practice);

                // 위치 조정 함수: 스테이지 목록 래퍼 기준으로 위치시킴
                function position(){
                    try{
                        const ul = document.getElementById('stageList');
                        const wrapper = ul ? ul.parentElement : null;
                        if (wrapper){
                            const r = wrapper.getBoundingClientRect();
                            // 래퍼의 왼쪽에서 12px, 아래에서 8px 떨어진 위치에 배치
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

                // 초기 위치 설정 및 리사이즈 시 재정렬
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

                // 체크박스 상태를 window.StageSelect.practice에 연결하여 다른 코드가 읽을 수 있게 함
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

        // 디버깅 및 향후 연동을 위해 노출
        window.StageSelect = window.StageSelect || {};
        window.StageSelect.stages = stages;
        window.StageSelect.render = () => renderStageList('stageList');
        window.StageSelect.getElement = () => document.getElementById('stageList');
        // 지역화 갱신 함수를 노출하여 호출자(e.g. main.js)가 라벨을 강제로 업데이트할 수 있게 함
        if (typeof updateLocalization === 'function') window.StageSelect.localize = updateLocalization;

            // StageSelect.practice가 스테이지 시작 시 Game으로 전달되도록 보장
            // (startStageById에서 이를 확인함; 없을 경우 기본값을 false로 설정)
            if (typeof window.StageSelect.practice === 'undefined') window.StageSelect.practice = false;
    });

})();
