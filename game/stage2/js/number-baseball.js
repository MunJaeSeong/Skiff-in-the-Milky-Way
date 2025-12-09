//시작

//임의의 랜덤 4자리 숫자 생성(1~9, 중복X)
function getRandomNumber() {
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const resultSet = new Set();
    while (resultSet.size < 4) {
        const idx = Math.floor(Math.random() * candidates.length);
        resultSet.add(candidates[idx]);
        candidates.splice(idx, 1);
    }
    return resultSet;
}
//정답 배열 생성(Set을 배열로 변환 후 사용)
const answer = Array.from(getRandomNumber());

console.log("생성된 정답:", answer);    //정답 확인용

//답이 형식에 맞는지 체크용 함수(아닐 시 에러 표시)
function isValidInput(input) {
    if (input.length !== 4) {   //4자리 숫자가 아닐 경우
        return false;
    }
    if (!/^[1-9]{4}$/.test(input)) {    //1~9 사이의 숫자가 아닐 경우
        return false;
    }
    const digits = new Set(input);  //중복된 숫자가 있는지 확인
    if (digits.size !== 4) {
        return false;
    }
    return true;
}

//사용자 입력 처리
const form = document.querySelector('#form');
const input = document.querySelector('#input');
const result = document.querySelector('#logs');
const answerButton = document.querySelector('#answer-button'); //정답 확인 버튼
let attempts = 0;
const values = new Set(); // 입력값 중복 체크용(시작 시 초기화)

//폼 제출 이벤트 리스너
form.addEventListener('submit', (e) => {
    e.preventDefault();     //기본 제출 동작 방지
    const value = input.value;  //사용자 입력 값


    if (!isValidInput(value)) { //입력 값 유효성 검사
        alert('잘못된 입력입니다. 1~9 사이의 중복되지 않는 4자리 숫자를 입력하세요.');
        input.value = '';
        input.focus();
        return;
    }

    if (values.has(value)) {    //입력값 중복 체크
        alert('입력했던 값입니다.');
        input.value = '';
        input.focus();
        return;
    }
    values.add(value);  //입력값 저장(중복 방지)

    attempts += 1;  //시도 횟수 증가

    //정답일 경우
    if (value === answer.join('')) {
        result.innerHTML += `<span class="homerun-effect">홈런! ${attempts}번 만에 맞히셨습니다.</span><br>`;
        input.disabled = true;
        // 이펙트 애니메이션 트리거(재실행)
        const hrElem = result.querySelector('.homerun-effect');
        if (hrElem) {
            hrElem.classList.remove('active');
            void hrElem.offsetWidth;
            hrElem.classList.add('active');
        }
        setTimeout(() => {
            if (confirm('다시 하시겠습니까?')) {
                window.location.reload();
            }
        }, 2000); // 애니메이션 후에 confirm (2초)
        return;
    }

    //스트라이크와 볼 계산
    let strike = 0;
    let ball = 0;
    for (let i = 0; i < 4; i += 1) {    //4자리 숫자 비교
        if (parseInt(value[i], 10) === answer[i]) { //일치하는 자리와 숫자
            strike += 1;
        } else if (answer.includes(parseInt(value[i], 10))) {   //숫자는 맞지만 자리X
            ball += 1;
        }
    }
    result.innerHTML += `${value} : <span class="strike">${strike}</span> 스트라이크, <span class="ball">${ball}</span> 볼입니다.<br>`;
    input.value = '';
    input.focus();
    if (attempts >= 10) { //10회 이상 틀렸을 경우
        result.innerHTML += `<span class="fail-effect">10회 이상 틀렸습니다. <br> 정답은 ${answer.join('')}였습니다.</span><br>`;
        input.disabled = true;
        setTimeout(() => {
            if (confirm('다시 하시겠습니까?')) {
                window.location.reload();
            }
        }, 2000); // 2초 대기 후 confirm
    }
});
