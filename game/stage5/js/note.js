(function(){
  'use strict';
  // NoteManager: 오른쪽에서 왼쪽으로 이동하는 노트들을 만들고 관리합니다.
  // - spawn(): 새 노트를 오른쪽 끝에 만들어서 배열에 넣습니다.
  // - update(dt): 노트 위치를 갱신하고, 화면 밖으로 나간 노트는 제거합니다.
  // - draw(): 노트를 캔버스에 그려줍니다.
  class NoteManager {
    constructor(canvas, opts){
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      opts = opts || {};
      this.spawnInterval = opts.spawnInterval || 1000; // ms
      this.noteSpeed = opts.noteSpeed || 240; // css px per second
      this.noteSize = opts.noteSize || 100; // css px
      // noteHeight: make notes taller by default (4x height)
      this.noteHeight = (typeof opts.noteHeight === 'number') ? opts.noteHeight : (this.noteSize * 4);
      this.notes = [];
      this._spawnTimer = 0;
    }

    // spawn(): 오른쪽 화면 가장자리 바깥에 새 노트를 만듭니다.
    // - 노트는 화면 가운데 세로 위치에 생성되고, notes 배열에 추가됩니다.
    spawn(){
      if(!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = rect.width + (this.noteSize/2); // just off-screen (use width half)
      const y = rect.height / 2;
      // include `size` (height) for compatibility with Renderer.drawSpatialNotes
      this.notes.push({ x: x, y: y, w: this.noteSize, h: this.noteHeight, size: this.noteHeight, speed: this.noteSpeed });
    }

    update(dt){
      if(!this.canvas) return;
      // spawn timer
      this._spawnTimer += dt;
      while(this._spawnTimer >= this.spawnInterval){
        this._spawnTimer -= this.spawnInterval;
        this.spawn();
      }

      // move notes
      const toRemove = [];
      const missedNotes = [];
      for(let i=0;i<this.notes.length;i++){
        const n = this.notes[i];
        n.x -= (n.speed * (dt/1000));
        // remove if fully off left (use width)
        if(n.x + n.w/2 < 0) {
          // 화면 왼쪽으로 완전히 나가면 제거합니다.
          // 아직 맞지 않은 노트면 miss로 간주하여 이벤트로 알립니다.
          if (!n.hit) missedNotes.push(n);
          toRemove.push(i);
        }
      }
      // dispatch miss events for missed notes before removing them
      if (missedNotes.length && typeof window !== 'undefined' && window.dispatchEvent) {
        for (const m of missedNotes) {
          try { window.dispatchEvent(new CustomEvent('note:miss', { detail: { note: m } })); }
          catch (e) { /* ignore */ }
        }
      }
      // remove dead notes in reverse order
      for(let i=toRemove.length-1;i>=0;i--){
        this.notes.splice(toRemove[i],1);
      }
    }

    // draw(): 노트들을 캔버스에 그립니다.
    // - 간단한 파란색 둥근 사각형으로 표시합니다.
    draw(){
      if(!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

      this.ctx.save();
      this.ctx.fillStyle = '#3aa0ff';
      for(const n of this.notes){
        const hw = n.w/2;
        const hh = (typeof n.h === 'number') ? (n.h/2) : (n.w/2);
        const radius = Math.min(6, Math.floor(Math.min(hw, hh)));
        this._roundedRect(this.ctx, n.x - hw, n.y - hh, n.w, (n.h || n.w), radius);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    _roundedRect(ctx, x, y, w, h, r){
      const min = Math.min(w,h)/2;
      r = Math.min(r, min);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  window.NoteManager = NoteManager;

})();
