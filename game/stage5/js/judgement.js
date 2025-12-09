/*
  judgement.js

  노트를 언제(얼마나 정확히) 눌렀는지 판정하는 코드입니다.
  쉽게 말하면: "정확히 눌렀으면 PERFECT, 조금 틀리면 GOOD, 많이 틀리면 MISS"를 돌려줍니다.

  함수 설명:
  - window.judgeHit(deltaMs)를 호출하면 판정 결과 객체를 반환합니다.
  - deltaMs는 '플레이어 입력 시간 - 노트 도착 시간'입니다. 음수이면 먼저 누른 것, 양수이면 늦게 누른 것.
  - 내부에서는 절대값(|deltaMs|)으로 오차 크기를 보고 판정을 합니다.
*/

(function () {
  'use strict';

  // 판정 기준(밀리초)
  const PERFECT = 80; // 80ms 이내면 퍼펙트
  const GOOD = 150;   // 150ms 이내면 굿
  const MISS = 250;   // 250ms 이내면 미스

  // judge(deltaMs): 판정을 계산해서 객체로 반환합니다.
  // 반환 예: { name: 'perfect', attack: 2, heal: 3, score: 500 }
  function judge(deltaMs) {
    const d = Math.abs(deltaMs); // 오차의 크기

    if (d <= PERFECT) return { name: 'perfect', attack : 2 , heal  : 3, score: 500 };
    if (d <= GOOD) return { name: 'good', attack : 1.3 , heal  : 1, score: 150 };
    if (d <= MISS) return { name: 'miss', attack : 0.3 , heal  : -5, score: 0 };

    // 그보다 더 어긋나면 미스로 처리
    return { name: 'miss', attack : 0.3 , heal  : -5, score: 0 };
  }

  // 전역에 공개해서 다른 코드에서 사용할 수 있게 합니다.
  window.judgeHit = judge;
  window.JUDGEMENT_THRESHOLDS = { PERFECT, GOOD, MISS };
})();
