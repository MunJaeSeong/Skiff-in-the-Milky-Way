// Stage4 레벨 맵 데이터: map_1
// 이 파일은 전역 객체 `window.Stage4Maps`에 맵 정보를 추가합니다.
// Ground 모듈이 이 맵 정보를 읽어 플랫폼을 생성합니다.
//
// 설명(중학생용):
// - 플랫폼(platforms)은 여러 개의 사각형(깊이 없는 플랫폼) 정보를 배열로 가집니다.
// - 각 플랫폼은 `x` 또는 `xPercent`, `y` 또는 `yPercent`, `width`, `height`를 가질 수 있습니다.
//   - `xPercent`, `yPercent`는 0..1 범위의 값으로, 월드 또는 캔버스 크기에 따라 픽셀로 변환됩니다.
//   - 예: xPercent:0.1은 전체 너비의 10% 위치를 의미합니다.
// - yPercent는 위쪽(0)에 가까울수록 화면 위, 1에 가까울수록 화면 아래입니다.
// - 이렇게 퍼센트 기반 좌표를 사용하면 다른 해상도에서도 맵이 비슷하게 보입니다.
(function () {
  'use strict';

  window.Stage4Maps = window.Stage4Maps || {};

  // Platforms: 플랫폼 배열
  // 주의: 플랫폼 좌표는 절대값(x,y) 또는 백분율(xPercent,yPercent)을 섞어 쓸 수 있습니다.
  // 퍼센트 값은 ground 모듈에서 캔버스/월드 높이와 곱해 픽셀값으로 변환됩니다.
  // (참고) 제작 시 가이드: 전체 월드 크기 예시로 x=6400px, y=2400px를 생각해 만들었습니다.
  window.Stage4Maps['map_1'] = {
    // Optional: 전체 월드 크기를 명시할 수 있습니다. (픽셀 단위)
    // 이 값을 지정하면 `ground.init`가 캔버스 크기나 worldScale로
    // 계산한 값 대신 이 월드 크기를 사용합니다.
    worldWidth: 6400,
    worldHeight: 2400,
    // 플랫폼 (배열)
    // x : 위치 yPercent : 캔버스 높이의 백분율(0으로 갈수록 천장) width : 너비 height : 높이
    platforms: [
      // 1단계 : 점프맵 (초반의 짧은 발판들) — 절대 좌표(px)
      { x: 340, y: 2328, width: 120, height: 15 },
      { x: 768, y: 2328, width: 120, height: 15 },
      { x: 768, y: 2232, width: 120, height: 15 },
      { x: 896, y: 2232, width: 120, height: 15 },

      // 계단 모양으로 올라가는 발판들 (결승선 방향으로 이어집니다) — 절대 좌표(px)
      { x: 1200, y: 1680, width: 100, height: 10 },
      { x: 1300, y: 1536, width: 100, height: 10 },
      { x: 1400, y: 1392, width: 100, height: 10 },
      { x: 1500, y: 1248, width: 100, height: 10 },
      { x: 1600, y: 1104, width: 100, height: 10 },
      { x: 1700, y: 960, width: 100, height: 10 },
      { x: 1800, y: 816, width: 100, height: 10 },
      { x: 1900, y: 672, width: 100, height: 10 }
    ],

    // 결승 구역: 퍼센트로 오른쪽 상단 근처에 위치시킵니다.
    finish: {
      x: 6080,
      y: 192,
      width: 80,
      height: 18
    }
  };

})();
