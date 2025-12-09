// --- 초기 DOM 참조 및 전역 상태 ---
// 캔버스와 2D 렌더링 컨텍스트를 가져옵니다.
// canvas: 게임 그래픽(원, 텍스트 등)을 그리는 HTMLCanvasElement
// ctx: canvas.getContext('2d')로 얻은 2D 렌더링 컨텍스트
// scoreSpan: 현재 점수를 표시하는 요소(`#score`)
// livesContainer: 목숨(하트)을 렌더링할 컨테이너(`#lives`)
// startBtn: 게임 시작/재시작 버튼(`#startBtn`)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const livesContainer = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
// 최종 점수 패널 요소
// (최종 점수 박스 제거로 관련 변수는 사용하지 않음)
// 점수 저장 UI 요소
const scoreBoard = document.getElementById('scoreBoard');
// 페이지 내 입력 UI 대신 prompt() 기반으로 이름을 받아 저장합니다.
// 기존의 saveArea/playerName/saveScore/cancelSave 버튼은 더 이상 사용되지 않습니다.
const scoreList = document.getElementById('scoreList');

// --- 게임 상태 및 설정 변수 ---
// NUM_CIRCLES: 화면에 동시에 나타나는 공의 수(초기값)
// lifes: 플레이어가 가진 목숨 수 (하트 개수)
// isGameOver: 게임이 종료되었는지를 나타내는 불리언 플래그
// animationId: requestAnimationFrame으로부터 반환되는 애니메이션 ID(취소용)
// score: 현재 게임의 누적 점수
// circles: 게임에서 관리하는 공 객체 목록
let NUM_CIRCLES = 1; // 동시에 떨어지는 공 개수 (원하면 늘릴 수 있음)
let lifes = 5; // 목숨 개수
let isGameOver = false;
let animationId = null;

let score = 0;  // 진행 중인 게임의 점수
// 원(공) 객체 배열 초기화
let circles = [];

// 점수 임계값 설정
// 각 항목은 특정 점수에 도달했을 때 추가로 생성할 공의 수를 정의
// - score: 임계점
// - add: 임계 도달 시 추가할 공 수
// - applied: 해당 임계값이 이미 적용되었는지(중복 적용 방지)
const SCORE_THRESHOLDS = [
    { score: 100, add: 1, applied: false },
    { score: 300, add: 1, applied: false },
    { score: 1000, add: 2, applied: false }
];


// 랜덤 색상 선택
// 미리 정의된 색상 배열에서 무작위로 하나를 골라 반환합니다.
// 사용 예: createCircle()에서 공의 색상을 랜덤으로 지정할 때 사용.
function getRandomColor() {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 1부터 index까지의 랜덤 정수 반환
// 파라미터: index (정수)
// 반환: 1 ~ index 사이의 정수 (inclusive)
// 주의: index가 0이거나 음수이면 잘못된 값이 나올 수 있으니 호출부에서 검증하세요.
function getRandomNumber(index) {
    return Math.floor(Math.random() * index) + 1; // 1에서 index 사이의 정수 반환
}

// 단일 원(공) 객체 생성
// 반환: 공 객체 { x, y, radius, speed, color }
// - x: 초기 가로 좌표 (랜덤)
// - y: 초기 세로 좌표 (0 -> 화면 상단)
// - radius: 원의 반지름(시각적 크기)
// - speed: 매 프레임마다 증가하는 y 값(낙하 속도)
// - color: 공의 색상
// 사용: addCircles(), 초기화 시 공을 생성할 때 사용됩니다.
function createCircle() {
    const radius = 10 + getRandomNumber(49); // 반지름 10~59 사이
    return {
        x: Math.random() * 350 + 25, // 캔버스 내 랜덤 x 좌표(간단한 범위 지정)
        y: 0,
        radius: radius,
        speed: getRandomNumber(3), // 낙하 속도(1~3)
        color: getRandomColor(),
    };
}

// 원(공) 속성 재설정
// 설명: 기존 공 객체를 재사용하기 위해 좌표/속도/색상/크기만 재할당합니다.
// 이 방식은 새 객체를 할당하는 대신 기존 객체를 재사용해 가비지 컬렉션 부담을 줄입니다.
function resetCircle(c) {
    c.x = Math.random() * 350 + 25;
    c.y = 0;
    c.color = getRandomColor(); // 새로운 랜덤 색상
    c.speed = getRandomNumber(3); // 새로운 랜덤 속도
    c.radius = 10 + getRandomNumber(49); // 새로운 랜덤 반지름
}

// 단일 원(공) 그리기
// 입력: 공 객체 (x, y, radius, color)
// 동작: ctx.arc로 원을 만들고 fillStyle로 채웁니다.
function drawCircle(c) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.closePath();
}

// 여러 개의 공을 추가하는 유틸리티
// 파라미터: n (추가할 공의 개수)
// 동작: createCircle()를 호출하여 circles 배열에 신규 공을 push 합니다.
// 주의: NUM_CIRCLES는 배열 길이로 동기화됩니다.
function addCircles(n) {
    for (let i = 0; i < n; i++) {
        circles.push(createCircle());
    }
    NUM_CIRCLES = circles.length;
}

// 점수 기반 난이도 증가
// SCORE_THRESHOLDS 리스트를 검사하여 특정 점수 이상이 되면 공의 개수를 증가시킵니다.
// 각 임계값 항목은 {score: 임계점, add: 늘릴 공 개수, applied: 이미 적용되었는지}
function adjustCircleCount() {
    for (let i = 0; i < SCORE_THRESHOLDS.length; i++) {
        const t = SCORE_THRESHOLDS[i];
        if (!t.applied && score >= t.score) {
            addCircles(t.add);
            t.applied = true;
            console.log(`Score ${score} passed ${t.score}, added ${t.add} circles. Total: ${NUM_CIRCLES}`);
        }
    }
}

// 메인 게임 루프
// 동작:
// 1) ctx.clearRect로 이전 프레임을 지움
// 2) circles 배열을 순회하며 각 공을 그린 뒤 y 좌표를 speed만큼 증가시킴
// 3) 공이 캔버스 바닥을 벗어나면 lifes를 감소시키고 resetCircle로 재사용
// 4) lifes가 0 이하가 되면 endGame()을 호출하여 게임을 종료
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 모든 원을 그리며 위치 업데이트
    for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        drawCircle(c);
        c.y += c.speed; // 원의 y 좌표 증가(낙하)
        // 원이 바닥(캔버스 밖)으로 벗어난 경우 처리
        if (c.y - c.radius > canvas.height) {
            // 플레이어 생명 하나 감소(게임이 이미 종료된 경우엔 중복 감소 방지)
            if (!isGameOver) {
                lifes -= 1;
                // 하트로 목숨 표시 업데이트
                if (livesContainer) renderLives();
                else console.log(`Lifes: ${lifes}`);
                // 목숨이 0 이하가 되면 게임 종료 처리
                if (lifes <= 0) {
                    endGame();
                    return; // 게임 루프 중단
                }
            }
            // 원을 재설정하여 재사용
            resetCircle(c);
        }
    }
    animationId = requestAnimationFrame(gameLoop);
}

// 캔버스 클릭 이벤트 핸들러
// 사용자가 캔버스를 클릭하면 마우스 좌표와 각 공의 중심 좌표 간 거리를 계산합니다.
// 거리 < 반지름인 공을 찾으면 해당 공을 '맞춘 것'으로 처리하여 점수를 부여하고 그 공을 재설정합니다.
// 보너스: 반지름이 작을수록 더 많은 점수를 주는 로직을 포함합니다.
canvas.addEventListener('click', function(event) {
    if (isGameOver) return; // 게임 오버 상태이면 클릭 이벤트 무시
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 여러 원 중 클릭된 원을 검색
    for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const dx = mouseX - c.x; // x축 거리
        const dy = mouseY - c.y; // y축 거리
        const distance = Math.sqrt(dx * dx + dy * dy); // 두 점 사이 거리

        if (distance < c.radius) {
            // 원 크기에 따른 점수 계산(반지름이 작을수록 더 많은 점수)
            // 반지름 10~59 -> 점수 5~1 범위로 매핑
            const gained = Math.max(1, 6 - Math.floor(c.radius / 10)); // 반지름 10~59 -> 점수 5~1
            score += gained; // 점수 증가
            scoreSpan.textContent = score; // DOM에 점수 반영(요소가 있는 경우)
            // 점수 임계값 확인 및 공 수 조정
            adjustCircleCount();
            // 클릭된 원 재설정(재사용)
            resetCircle(c);
            break; // 한 번의 클릭으로 하나의 원만 처리
        }
    }
});

// 게임 시작 함수 및 버튼 바인딩
// startGame(): 게임 상태를 초기화하고 애니메이션 루프를 시작합니다.
// 초기화 항목: score(0), lifes, circles 배열 재생성, UI 초기화(점수/하트 렌더링)
function startGame() {
    // 게임 상태 초기화
    score = 0;
    lifes = 5;
    isGameOver = false;
    circles = [];
    // 초기 원 생성
    for (let i = 0; i < NUM_CIRCLES; i++) circles.push(createCircle());
    if (scoreSpan) scoreSpan.textContent = score;
    if (livesContainer) renderLives();

    // 시작 버튼을 비활성화하여 중복 시작 방지
    if (startBtn) startBtn.disabled = true;

    // 게임 루프 시작: requestAnimationFrame으로 프레임별로 gameLoop 호출
    // (이전 애니메이션 프레임은 endGame에서 cancelAnimationFrame으로 취소함)
    animationId = requestAnimationFrame(gameLoop);
}

// DOM에 시작 버튼이 존재하면 클릭 이벤트에 startGame 연결
if (startBtn) {
    startBtn.addEventListener('click', startGame);
}

// 게임 종료 처리 함수
// 동작:
// 1) isGameOver 플래그를 설정
// 2) 캔버스에 반투명 오버레이와 'Game Over' 텍스트를 표시
// 3) requestAnimationFrame으로 등록된 애니메이션을 취소
// 4) 시작 버튼을 재활성화하여 재시작을 허용
// 5) (점수 저장) prompt 창을 띄워 저장할 이름을 입력받고 로컬스토리지에 Top10으로 보관
function endGame() {
    isGameOver = true;
    // 캔버스 전체를 반투명 검은색으로 덮고 중앙에 Game Over 텍스트를 표시
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    console.log('Game Over');
    // 진행 중인 애니메이션 프레임 취소
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    // 시작 버튼을 다시 활성화하여 재시작 허용
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '재시작';
    }
    // 게임 종료 시 prompt로 이름을 입력받아 저장 흐름 실행
    // prompt에서 취소(null)일 경우 저장하지 않습니다.
    try {
        const name = prompt('게임 종료! 저장할 이름을 입력하세요 (취소하면 저장되지 않습니다):');
        if (name !== null) {
            const playerName = name.trim() || '익명';
            const entry = { name: playerName, score: score };
            const arr = loadScores();
            arr.push(entry);
            arr.sort((a, b) => b.score - a.score);
            const trimmed = arr.slice(0, 10);
            saveScoresArray(trimmed);
            renderScores();
        }
    } catch (e) {
        console.error('Error during prompt save', e);
    }

}

// -------------------- 점수 저장 및 표시 로직 --------------------
// 로컬스토리지 키: 점수 목록을 브라우저에 보존하기 위해 사용합니다.
const STORAGE_KEY = 'falling_dot_scores_v1';

// 저장된 점수 목록 불러오기 (배열 of {name, score})
function loadScores() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        console.error('loadScores error', e);
    }
    return [];
}

// 점수 목록 저장
function saveScoresArray(arr) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
        console.error('saveScoresArray error', e);
    }
}

// 리스트 렌더링 (최대 10개, 내림차순)
function renderScores() {
    const arr = loadScores();
    // 정렬(점수 내림차순)
    arr.sort((a, b) => b.score - a.score);
    // 최대 10개
    const top = arr.slice(0, 10);
    if (!scoreList) return;
    scoreList.innerHTML = '';
    top.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.name} - ${entry.score}`;
        scoreList.appendChild(li);
    });
}

// (페이지 입력 UI 제거 - prompt 기반으로 동작)

// 목숨(하트) 렌더링 함수
function renderLives() {
    if (!livesContainer) return;
    livesContainer.innerHTML = '';
    // 표시할 하트 수
    const total = Math.max(0, Math.min(5, typeof lifes === 'number' ? lifes : 5));
    const max = 5;
    // SVG for heart (single source, embedded as data URI)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff4d4d" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    const dataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    for (let i = 0; i < max; i++) {
        const img = document.createElement('img');
        img.className = 'heart-img' + (i < total ? '' : ' empty');
        img.alt = i < total ? '하트' : '빈 하트';
        img.src = dataUri;
        livesContainer.appendChild(img);
    }
}

// 초기 렌더링
renderScores();
// 초기 목숨 렌더링 (페이지 로드 시 하트 표시)
try { renderLives(); } catch (e) { console.warn('renderLives not available on load', e); }

