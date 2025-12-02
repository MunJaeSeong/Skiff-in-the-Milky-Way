/*
  renderer.js

  이 파일은 리듬 게임에서 화면에 보이는 것들을 그리는 역할을 합니다.
  아래 코드는 중학생도 이해할 수 있도록 설명을 넣었습니다.

  주요 역할:
  - 노트(칸에 떨어지는 블록) 그리기
  - 히트 라인(노트를 맞추는 선) 그리기
  - 점수와 콤보 같은 HUD 그리기

  주의: 코드는 변경하지 않고, 동작 방식에 대한 설명을 자세히 적었습니다.
*/

(function () {
  'use strict';

  // Renderer 클래스: Moon 스테이지에서 사용하는 간단한 렌더링 도구입니다.
  // 이 프로젝트의 `moon.html`/`moon.js`에서는 노트가 수평으로 이동하므로
  // 다음 역할만 제공합니다:
  // - drawSpatialNotes: x 위치와 속도로 관리되는 노트를 그대로 그립니다.
  // - drawVerticalHitLine: notesCanvas에서 사용하는 세로(수직) 히트 라인을 그림.
  // - drawHUD: 게임 화면(`gameCanvas`)에 점수/콤보를 그림.
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = canvas.width;
      this.height = canvas.height;
    }

    resize(w, h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.width = w;
      this.height = h;
    }

    clear() {
      // Canvas에 DPR 스케일 변환(setTransform)이 적용된 경우가 있습니다.
      // 이때 transform이 활성화된 상태에서 clearRect를 호출하면
      // 좌표계가 스케일된 단위로 해석되어 일부 영역만 지워지거나
      // 원하는 크기와 맞지 않는 지우기가 발생할 수 있습니다.
      // 따라서 물리 픽셀(캐노버스의 width/height)을 사용해
      // 변환을 임시로 리셋하고 전체를 지웁니다.
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    // drawSpatialNotes: spatial 형식의 노트 배열을 그립니다.
    // 각 노트는 적어도 { x, y?, size?, hit?, color? } 같은 속성을 가질 수 있습니다.
    // 여기서는 노트를 수평으로 그리므로 n.x를 사용해 위치를 계산합니다.
    drawSpatialNotes(notes, options = {}) {
      const ctx = this.ctx;
      // 노트의 위치 계산에는 CSS 픽셀 단위를 사용합니다.
      // `moon.html`에서 canvas에 setTransform(dpr,0,0,dpr,0,0)를 적용하므로
      // 여기서는 getBoundingClientRect()로 CSS 크기를 읽어와서 사용합니다.
      const rect = this.canvas.getBoundingClientRect();
      const centerY = rect.height / 2;
      notes.forEach(n => {
        if (n.hit) return;
        const x = Math.floor(n.x || 0);
        // NoteManager는 `w` 속성으로 폭을 제공하는 경우가 있습니다.
        // 여기서는 우선순위를: n.size -> n.w -> 기본값 으로 삼습니다.
        const size = (n.size != null) ? n.size : (n.w != null ? n.w : 24);
        const w = (n.w != null) ? n.w : Math.round(size * 1.5);
        const y = (n.y != null) ? Math.floor(n.y) : Math.floor(centerY - size / 2);
        ctx.save();
        ctx.fillStyle = n.color || '#6cf';
        ctx.fillRect(x - w / 2, y - size / 2, w, size);
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        if (n.key) ctx.fillText(n.key, x, y + 4);
        ctx.restore();
      });
    }

    // 수직 히트 라인 그리기 (notesCanvas의 경우 왼쪽에 세로선)
    drawVerticalHitLine(hitX, style = { color: '#888', width: 1, alpha: 0.9 }) {
      const ctx = this.ctx;
      // hit line도 CSS 픽셀 단위를 사용하여 그립니다.
      const rect = this.canvas.getBoundingClientRect();
      ctx.save();
      ctx.strokeStyle = style.color || '#888';
      ctx.lineWidth = style.width || 1;
      ctx.globalAlpha = style.alpha != null ? style.alpha : 0.9;
      ctx.beginPath();
      // 0.5 오프셋은 선을 선명하게 보이게 하기 위한 픽셀 정렬 기법
      ctx.moveTo(hitX + 0.5, 0.5);
      ctx.lineTo(hitX + 0.5, rect.height - 0.5);
      ctx.stroke();
      ctx.restore();
    }

    // HUD(점수/콤보) 그리기: 게임 화면(보통 풍부한 공간을 가진 canvas)에 사용
    drawHUD(scoreManager) {
      const ctx = this.ctx;
      // HUD는 CSS 픽셀 단위를 기준으로 텍스트를 배치합니다.
      const rect = this.canvas.getBoundingClientRect();
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Score: ' + (scoreManager.score || 0), 14, 26);
      ctx.textAlign = 'right';
      ctx.fillText('Combo: ' + (scoreManager.combo || 0), rect.width - 14, 26);
      ctx.restore();
    }
  }

  // 전역에 Renderer를 노출하여 다른 코드에서 사용할 수 있게 합니다.
  window.StageRenderer = Renderer;
})();
