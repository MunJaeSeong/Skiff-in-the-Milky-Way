/*
  map.js

  맵 시스템을 관리하는 파일입니다.
  - 맵 이미지 로드
  - 맵 타일 생성 및 업데이트
  - 맵 그리기
*/

(function(){
  'use strict';

  // MapManager: 맵 시스템을 관리하는 클래스
  class MapManager {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      options = options || {};
      
      this.totalLength = options.totalLength || 1000;
      this.pixelsPerAdvance = options.pixelsPerAdvance || 100;
      
      this.state = {
        images: {},
        loaded: false,
        tiles: []
      };
      
      this.advanceDistance = 0;
      
      // 맵 구간 설정
      this.sections = [
        { start: 0, end: 300, type: 'map1' },
        { start: 300, end: 600, type: 'map2' },
        { start: 600, end: 1000, type: 'map3' }
      ];
      
      // 맵 이미지 로드
      this._loadMapImages(options.basePath);
    }

    _loadMapImages(basePath) {
      const base = basePath || '../../../assets';
      const mapPaths = {
        map1: base + '/map/map1.jpg',
        map2: base + '/map/map2.jpg',
        map3: base + '/map/map3.jpg'
      };
      
      let loadCount = 0;
      Object.keys(mapPaths).forEach(key => {
        const img = new Image();
        img.src = mapPaths[key];
        img.onload = () => {
          this.state.images[key] = img;
          loadCount++;
          if (loadCount === 3) {
            this.state.loaded = true;
            this.updateTiles(); // 초기 타일 생성
          }
        };
        img.onerror = () => {
          console.warn('Failed to load map:', mapPaths[key]);
          loadCount++;
          if (loadCount === 3) this.state.loaded = true;
        };
      });
    }

    // advance 거리에 따라 어떤 맵을 사용할지 결정
    getMapTypeForDistance(distance) {
      if (distance < 300) return 'map1';
      if (distance < 600) return 'map2';
      return 'map3';
    }

    // advance 거리 설정
    setAdvanceDistance(distance) {
      this.advanceDistance = Math.max(0, Math.min(this.totalLength, distance));
      this.updateTiles();
    }

    // 현재 advance 거리 가져오기
    getAdvanceDistance() {
      return this.advanceDistance;
    }

    // 맵 타일 생성 및 업데이트
    updateTiles() {
      if (!this.state.loaded || !this.canvas) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      this.state.tiles = [];
      
      // 각 맵 이미지의 실제 너비 계산 (높이를 캔버스에 맞추고 비율 유지)
      const imageWidths = {};
      Object.keys(this.state.images).forEach(key => {
        const img = this.state.images[key];
        if (img && img.width && img.height) {
          const scaledWidth = (img.width / img.height) * canvasHeight;
          imageWidths[key] = scaledWidth;
        }
      });
      
      // 현재 advance에서 화면 왼쪽 끝까지의 픽셀 거리를 계산
      const scrollOffset = this.advanceDistance * this.pixelsPerAdvance;
      
      // 화면에 보일 타일들을 생성
      this.sections.forEach(section => {
        const mapType = section.type;
        const img = this.state.images[mapType];
        const imgWidth = imageWidths[mapType];
        if (!img || !imgWidth) return;
        
        // 이 구간의 픽셀 시작/끝 위치
        const sectionStartPixel = section.start * this.pixelsPerAdvance;
        const sectionEndPixel = section.end * this.pixelsPerAdvance;
        
        // 이 구간에서 이미지를 몇 번 반복해야 하는지 계산
        const tilesNeeded = Math.ceil((sectionEndPixel - sectionStartPixel) / imgWidth);
        
        for (let i = 0; i < tilesNeeded; i++) {
          const tileStartPixel = sectionStartPixel + (i * imgWidth);
          const tileEndPixel = tileStartPixel + imgWidth;
          
          // 화면 범위를 벗어나면 건너뛀
          if (tileEndPixel < scrollOffset - imgWidth || tileStartPixel > scrollOffset + canvasWidth + imgWidth) {
            continue;
          }
          
          // 화면에서의 x 좌표 계산 (왼쪽으로 스크롤)
          const screenX = tileStartPixel - scrollOffset;
          
          this.state.tiles.push({
            img: img,
            x: screenX,
            y: 0,
            w: imgWidth,
            h: canvasHeight
          });
        }
      });
    }

    // 맵 그리기
    draw() {
      if (!this.state.loaded || !this.ctx) return;
      
      this.ctx.save();
      for (const tile of this.state.tiles) {
        this.ctx.drawImage(tile.img, tile.x, tile.y, tile.w, tile.h);
      }
      this.ctx.restore();
    }

    // 리사이즈 시 호출
    onResize() {
      this.updateTiles();
    }
  }

  // 전역에 노출
  window.MapManager = MapManager;

})();