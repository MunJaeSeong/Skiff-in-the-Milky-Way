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
    // Note: world size is provided by the game initializer (gameScript).
    // This map file omits explicit worldWidth/worldHeight so the level
    // uses centralized defaults passed from `gameScript` or global defaults.
    // 플랫폼 (배열)
    // x : 위치 yPercent : 캔버스 높이의 백분율(0으로 갈수록 천장) width : 너비 height : 높이
    platforms: [
      // 1단계 : 점프맵 (초반의 짧은 발판들) — 절대 좌표(px)
      { x: 400, y: 7900, width: 100, height: 20 },
      { x: 700, y: 7800, width: 100, height: 20 },
      { x: 700, y: 7700, width: 100, height: 20 },
      { x: 900, y: 7600, width: 100, height: 20 },
      { x: 1200, y: 7500, width: 100, height: 20 },
      { x: 1200, y: 7400, width: 100, height: 20 },
      { x: 1300, y: 7300, width: 100, height: 20 },
      { x: 1600, y: 7800, width: 100, height: 20 },
      { x: 1800, y: 7700, width: 100, height: 20 },
      { x: 2000, y: 7600, width: 100, height: 20 },
      { x: 2200, y: 7500, width: 100, height: 20 },
      { x: 2400, y: 7400, width: 100, height: 20 },
      { x: 2600, y: 7300, width: 100, height: 20 },
      { x: 2800, y: 7200, width: 100, height: 20 },
      { x: 3000, y: 7100, width: 100, height: 20 },
      { x: 3200, y: 7000, width: 100, height: 20 },
      { x: 3400, y: 6900, width: 100, height: 20 },
      { x: 3600, y: 6800, width: 100, height: 20 },
      { x: 3800, y: 6700, width: 100, height: 20 },
      { x: 4000, y: 6600, width: 100, height: 20 },
      { x: 4200, y: 6500, width: 100, height: 20 },
      { x: 4400, y: 6400, width: 100, height: 20 },
      { x: 4600, y: 6300, width: 100, height: 20 },
      { x: 4800, y: 6200, width: 100, height: 20 },
      { x: 5000, y: 6100, width: 100, height: 20 },
      { x: 5200, y: 6000, width: 100, height: 20 },
      { x: 5400, y: 5900, width: 100, height: 20 },
      { x: 5600, y: 5800, width: 100, height: 20 },
      { x: 5800, y: 5700, width: 300, height: 20 }
    ],

    // Traps: stage4에서 사용하는 함정들
    // type: 'thorn' | 'spikePlatform' | 'slideTrap'
    // - `thorn`: only provide `x` and `y` (width/height are fixed by trap module)
    // - `slideTrap`: provide `pos1`, `pos2`, and `size` (square). do NOT pass width/height
    traps: [
      // 1) thorn: 정적 스파이크
      { type: 'thorn', x: 795, y: 7690 },
      // 2) spikePlatform: 플랫폼 위 스파이크(주기적으로 튀어나옴) PERIOD in ms, DUTY as 0..1
      { type: 'spikePlatform', x: 1200, y: 7400, width: 100, height: 20, period: 4000, duty: 0.6 },
      // 3) slideTrap: 지정된 두 지점을 계속 왕복
      { type: 'slideTrap', pos1: { x: 2435, y: 7700 }, pos2: { x: 2435, y: 7100 }, size: 30, speed: 4 },
      { type: 'slideTrap', pos1: { x: 2400, y: 7150 }, pos2: { x: 3200, y: 7150 }, size: 40, speed: 6 },
      { type: 'slideTrap', pos1: { x: 2800, y: 6950 }, pos2: { x: 3600, y: 6950 }, size: 40, speed: 8 },
      { type: 'slideTrap', pos1: { x: 3000, y: 6850 }, pos2: { x: 3800, y: 6850 }, size: 40, speed: 8 },
      // 4) (추적 몬스터 기능은 제거되었습니다.)
    ],

    // Tethers: vertical ropes/lines that the player can grab and ride.
    // Each tether: { x, y, length }
    // - x, y are absolute world coordinates (x = horizontal position, y = top anchor point)
    // - length is the rope length in pixels downward from y
    // Example: player can press ArrowUp when near the top to grab the tether.
    tethers: [
      { x: 500, y: 7400, length: 600 },
      { x: 500, y: 6600, length: 700 }
    ],

    // 결승 구역: 퍼센트로 오른쪽 상단 근처에 위치시킵니다.
    finish: {
      x: 6000,  //6000
      y: 100, // 100
      width: 80,
      height: 18
    }
  };

})();
