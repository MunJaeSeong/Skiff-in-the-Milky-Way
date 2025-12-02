/*
  judgement.js

  이 파일은 플레이어가 노트를 입력했을 때 "얼마나 정확히" 입력했는지를 판단(judge)하는 역할을 합니다.
  아래 주석은 중학생도 이해할 수 있도록 간단한 용어와 예시를 섞어 설명합니다.

  판정 기준(밀리초 단위):
  - PERFECT: 아주 정확하게 눌렀을 때 (예: 오차가 80ms 이내)
  - GOOD: 조금 덜 정확하지만 괜찮은 입력 (예: 오차가 150ms 이내)
  - MISS: 꽤 벗어났을 때 (예: 오차가 250ms 이내)
  이 숫자들은 '허용 오차'를 뜻합니다. 더 작으면 더 깐깐한 판정입니다.
*/

(function () {
  'use strict';

  // 판정 허용 범위를 밀리초(ms)로 정한 상수들입니다.
  // 예: PERFECT = 80 이면, 실제 입력 시점과 목표 시점이 80ms 이내이면 "perfect" 판정입니다.
  const PERFECT = 80;
  const GOOD = 150;
  const MISS = 250;

  // judge 함수
  // - deltaMs: 실제 입력 시각과 노트의 목표 시각의 차이(밀리초). 보통은 (playerTime - noteTime)
  //   예: deltaMs 가 -30이면 "플레이어가 30ms 먼저 입력"했다는 뜻입니다.
  // - 함수는 절대값(|deltaMs|)을 보고 판정을 합니다. 즉, '빨리' 눌렀는지 '늦게' 눌렀는지는 상관하지 않습니다.
  function judge(deltaMs) {
    // d는 오차의 크기(항상 양수)
    const d = Math.abs(deltaMs);

    // 오차가 가장 작으면 perfect 판정.
    if (d <= PERFECT) return { name: 'perfect', score: 1000 };
    // 더 넓은 범위면 good 판정.
    if (d <= GOOD) return { name: 'good', score: 500 };
    // MISS 범위 안이면 miss 판정(점수 0).
    if (d <= MISS) return { name: 'miss', score: 0 };
    // 위의 범위를 모두 벗어나면 사실상 '완전 빗나감'으로 처리합니다. 여기서는 miss로 처리.
    return { name: 'miss', score: 0 };
  }

  // judge 함수를 전역(window)에 연결해서 다른 코드에서 사용할 수 있게 합니다.
  // 예: let result = window.judgeHit(playerTime - noteTime);
  window.judgeHit = judge;
  // 또한 판정에 쓰인 상수들을 외부에서 확인할 수 있게 공개합니다.
  window.JUDGEMENT_THRESHOLDS = { PERFECT, GOOD, MISS };
})();
