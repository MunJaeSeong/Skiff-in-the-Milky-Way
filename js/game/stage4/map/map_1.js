// Stage4 level map data: map_1
// Exposes a maps collection on window so the ground module can pick it up.
(function () {
  'use strict';

  window.Stage4Maps = window.Stage4Maps || {};

  // Platforms use either absolute `y` or `yPercent` (0..1) which will be
  // converted to pixels by the loader when the canvas height is known.
  // This allows the same map to adapt to different canvas heights.
  // 맵 : x = 6400px, y = 2400px
  window.Stage4Maps['map_1'] = {
    // 플랫폼 (배열)
    // x : 위치 yPercent : 캔버스 높이의 백분율(0으로 갈수록 천장) width : 너비 height : 높이
    platforms: [
      // 1단계 : 점프맵 
      { xPercent: 0.09375, yPercent: 0.97, width: 120, height: 15 },
      { xPercent: 0.15625, yPercent: 0.97, width: 120, height: 15 },
      { xPercent: 0.15625, yPercent: 0.93, width: 120, height: 15 },
      { xPercent: 0.21875, yPercent: 0.93, width: 120, height: 15 },

      // ascending stair platforms leading toward the finish
      { xPercent: 0.18750, yPercent: 0.70, width: 100, height: 10 },
      { xPercent: 0.20312, yPercent: 0.64, width: 100, height: 10 },
      { xPercent: 0.21875, yPercent: 0.58, width: 100, height: 10 },
      { xPercent: 0.23438, yPercent: 0.52, width: 100, height: 10 },
      { xPercent: 0.25000, yPercent: 0.46, width: 100, height: 10 },
      { xPercent: 0.26562, yPercent: 0.40, width: 100, height: 10 },
      { xPercent: 0.28125, yPercent: 0.34, width: 100, height: 10 },
      { xPercent: 0.29688, yPercent: 0.28, width: 100, height: 10 }
    ],

    // finish area positioned near the right/top of the world using percents
    finish: {
      xPercent: 0.95,
      yPercent: 0.08,
      width: 80,
      height: 18
    }
  };

})();
