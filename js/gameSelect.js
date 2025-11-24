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
        { id: 'stage4', title: '성운 횡단로', subtitle: '점프 맵', image: 'assets/select/galaxy-jump.jpg' }
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
        // 제공된 이미지가 있으면 사용 시도; 없으면 CSS의 대체 색상이 적용됩니다
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
        // 기존 자식 요소 모두 제거
        ul.innerHTML = '';

        stages.forEach((s) => {
            const item = createStageElement(s);
            ul.appendChild(item);
        });

        // 뷰포트에 따라 크기 설정 (각 스테이지 약 뷰포트의 1/3)
        updateStageSizes();

        // 기본 동작: 첫 번째 스테이지를 선택하지는 않지만 UI가 가운데에 보이도록 첫 항목을 중앙에 맞춤
        // 자동으로 페이지 로드 시 스테이지를 시작하지 않습니다. 사용자의 명시적 동작(클릭/Enter)을 기다립니다.
        const first = ul.querySelector('.stage-item');
        if (first) {
            try { centerSelected(first); } catch (e) { /* ignore */ }
            // 자동 시작을 피하기 위해 여기서는 의도적으로 selectStageElement를 호출하지 않습니다
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
            // 높이는 너비에 비례하게 유지합니다 (대략 0.6 비율)
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
        // 현재 scrollLeft와 요소를 가운데에 맞추기 위한 오프셋 계산
        const offsetLeft = el.offsetLeft + (el.offsetWidth / 2) - (wrapper.clientWidth / 2);
        wrapper.scrollTo({ left: offsetLeft, behavior: 'smooth' });
    }

    // 마우스 휠(수직)을 수평 스크롤로 변환하여 스테이지 선택을 이동시키는 헬퍼
    function attachWheelToStageList(){
        const ul = document.getElementById('stageList');
        if (!ul) return;
        const wrapper = ul.parentElement; // .stage-list-wrapper로 가정
        if (!wrapper) return;

        // 핸들러: 수직 휠(deltaY)을 가로 스크롤(scrollLeft)로 변환
        // 사용 의도: 휠을 위로 올리면 왼쪽으로, 아래로 내리면 오른쪽으로 이동
        const handler = function(e){
            try{
                // Ctrl 키가 눌린 경우 브라우저 줌/제스처를 허용
                if (e.ctrlKey) return;

                // deltaMode에 따라 delta를 정규화
                let delta = e.deltaY;
                if (e.deltaMode === 1) delta *= 16; // 라인 단위 -> px(대략)
                else if (e.deltaMode === 2) delta *= wrapper.clientHeight; // 페이지 단위

                // 가로 스크롤이 가능한 경우에만 동작
                if (wrapper.scrollWidth <= wrapper.clientWidth) return;

                // 휠 위 (delta < 0) -> 왼쪽으로 스크롤
                // 이동량은 delta에 감도 계수를 곱해 사용
                const factor = 1.5; // 감도 조정
                const scrollAmount = delta * factor;

                // 래퍼 위에서는 기본 세로 스크롤 동작을 막음
                e.preventDefault();
                wrapper.scrollLeft += scrollAmount;
            }catch(err){
                // 다른 UI가 영향을 받지 않도록 오류를 무시
            }
        };

        // preventDefault()를 사용하기 위해 passive: false로 이벤트 등록
        wrapper.addEventListener('wheel', handler, { passive: false });
    }

        // --- 스크립트 동적 로드 및 스테이지 시작 도우미 ---
        // 동일한 src를 중복으로 삽입하지 않도록 검사하고 Promise를 반환합니다.
        function loadScriptOnce(src){
            return new Promise((resolve, reject) => {
                try{
                    // document.base를 기준으로 제공된 src를 절대 URL로 변환
                    const absolute = new URL(src, document.baseURI).href;
                    // 이미 삽입된 스크립트 중 절대 href 또는 원래 src 속성과 일치하는 항목을 찾습니다.
                    // 단순 endsWith 검사보다 더 견고한 방식입니다.
                    const existing = Array.from(document.scripts).find(s => {
                        try{
                            if (!s) return false;
                            if (s.src && s.src === absolute) return true;
                            const attr = s.getAttribute && s.getAttribute('src');
                            if (attr && attr === src) return true;
                            // 폴백: pathname이 같은지 비교
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
            // 모든 스테이지를 시작할 수 있도록 허용 (stage1에만 국한되지 않음)
            // 먼저 player와 게임 런타임 스크립트가 실제 폴더에서 로드되었는지 확인
            // stageId 폴더를 기준으로 스테이지별 경로 생성: js/game/<stageId>/...
            const base = `js/game/${stageId}/`;
            const playerSrc = `${base}player.js`;
            const trapSrc = `${base}trap.js`;
            const groundSrc = `${base}ground.js`;
            const gameSrc = `${base}gameScript.js`;

            // 로드 순서: player -> trap (optional) -> ground -> game
            // player -> trap(선택) -> ground -> game 순으로 로드하여 의존성 보장
            loadScriptOnce(playerSrc).catch((e)=>{
                console.warn('player.js 로드 실패:', e);
            }).then(()=>{
                // 스테이지에 trap 모듈이 있으면 로드 시도(실패 시 조용히 무시)
                return loadScriptOnce(trapSrc).catch(()=> Promise.resolve());
            }).then(()=>{
                return loadScriptOnce(groundSrc).catch((e)=>{
                    console.warn('ground.js 로드 실패:', e);
                });
            }).then(()=>{
                // ground.init이 사용할 수 있도록 스테이지의 선택적 맵 파일을 먼저 로드 시도
                // 많은 맵 파일은 `js/game/<stageId>/map/`에 위치하며 `window.Stage4Maps`를 정의합니다.
                // 맵 파일을 먼저(실패 시 무시), 그 다음에 mapping.js(미니맵), 마지막으로 게임 스크립트를 로드
                const mapSrc = `${base}map/map_1.js`;
                const mappingSrc = `${base}mapping.js`;
                return loadScriptOnce(mapSrc).catch(()=> Promise.resolve()).then(()=>{
                    return loadScriptOnce(mappingSrc).catch(()=> Promise.resolve());
                }).then(()=>{
                    return loadScriptOnce(gameSrc).catch((e)=>{
                        console.warn('gameScript.js 로드 실패:', e);
                    });
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
                        // 스테이지 스크립트가 로드되었는지 확인 시도 (스테이지 파일은 js/game/<stageId>/에 위치)
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
        // 선택된 요소가 있으면 리사이즈 후 다시 가운데로 정렬
        const ul = document.getElementById('stageList');
        if (!ul) return;
        const sel = ul.querySelector('.stage-item[aria-selected="true"]');
        if (sel) centerSelected(sel);
    });

    // 초기화: DOMContentLoaded 후 스테이지 목록 렌더링
    document.addEventListener('DOMContentLoaded', () => {
        renderStageList('stageList');
        try{ attachWheelToStageList(); }catch(e){}

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
                // t.stages에 해당 stage id 키가 존재하는지 확인하여
                // 빈 문자열이나 falsy 값도 의도적으로 처리할 수 있게 합니다.
                // translations 객체에 해당 키가 있으면 그 값을 사용하고,
                // 없으면 요소 생성 시 설정된 원래 제목을 유지합니다.
                let override;
                if (t.stages && Object.prototype.hasOwnProperty.call(t.stages, id)) {
                    override = t.stages[id];
                }
                if (typeof override !== 'undefined' && override !== null) {
                    titleEl.textContent = override;
                }
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
                    // 지역화 텍스트를 설정하기 위해 입력 요소를 보존하고 텍스트를 다시 추가합니다
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
                    // 폴백: 현재는 간단한 alert로 대체
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
                // 시작 화면을 보이고 선택 UI 및 게임 캔버스를 숨깁니다
                const selectUI = document.getElementById('gameSelectUI');
                const startScreen = document.getElementById('startScreen');
                const canvasEl = document.getElementById('gameCanvas');
                const selectCanvas = document.getElementById('gameSelectCanvas');
                if (selectUI) { selectUI.style.display = 'none'; selectUI.setAttribute('aria-hidden','true'); }
                if (canvasEl) canvasEl.style.display = 'none';
                if (selectCanvas) selectCanvas.style.display = 'none';
                if (startScreen) { startScreen.style.display = ''; startScreen.removeAttribute('aria-hidden'); }
                // 주요 시작 버튼이 있으면 포커스합니다
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
                            // 이전에 설정된 아래/오른쪽 앵커가 있으면 제거합니다
                            pc.style.right = '';
                            pc.style.bottom = '';
                        } else {
                            // 뷰포트 왼쪽 아래로 폴백합니다
                            pc.style.left = '12px';
                            pc.style.top = '';
                            pc.style.bottom = '12px';
                        }
                    }catch(e){}
                }

                // 초기 위치 설정 및 리사이즈 시 재정렬
                setTimeout(position, 20);
                window.addEventListener('resize', position);
                    // 지원되면 래퍼의 크기 변화를 관찰하여 위치를 재조정합니다
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
                        // 기존의 StageSelect가 있으면 해당 상태를 초기값으로 설정
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
