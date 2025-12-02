(function(){
  'use strict';

  // Simple Note Manager for right-to-left notes in the notesCanvas
  class NoteManager {
    constructor(canvas, opts){
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      opts = opts || {};
      this.spawnInterval = opts.spawnInterval || 1000; // ms
      this.noteSpeed = opts.noteSpeed || 240; // css px per second
      this.noteSize = opts.noteSize || 24; // css px
      this.notes = [];
      this._spawnTimer = 0;
    }

    // spawn a blue note at right edge, vertically centered
    spawn(){
      if(!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = rect.width + (this.noteSize/2); // just off-screen
      const y = rect.height / 2;
      this.notes.push({ x: x, y: y, w: this.noteSize, speed: this.noteSpeed });
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
        // remove if fully off left
        if(n.x + n.w/2 < 0) {
          // if note wasn't hit, consider it a miss and queue for miss event
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

    draw(){
      if(!this.ctx || !this.canvas) return;
      // clear (use device pixel size as in other files)
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

      this.ctx.save();
      // draw blue rounded rect notes
      this.ctx.fillStyle = '#3aa0ff';
      for(const n of this.notes){
        const hw = n.w/2;
        const hh = n.w/2;
        this._roundedRect(this.ctx, n.x - hw, n.y - hh, n.w, n.w, 6);
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
