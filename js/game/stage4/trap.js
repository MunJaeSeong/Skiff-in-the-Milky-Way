// Stage4 트랩(함정) 모듈: thorn, spikePlatform, slideTrap, followMonster
(function () {
  'use strict';
  // Fixed sizes for certain trap types
  const THORN_WIDTH = 40;
  const THORN_HEIGHT = 20;

  const Stage4Traps = {
    traps: [],

    init(trapData, worldWidth, worldHeight) {
      this.traps = [];
      if (!Array.isArray(trapData)) return this.traps;
      trapData.forEach(t => {
        const base = {
          type: t.type || 'thorn',
          x: typeof t.x === 'number' ? t.x : (typeof t.xPercent === 'number' ? Math.round(t.xPercent * worldWidth) : 0),
          y: typeof t.y === 'number' ? t.y : (typeof t.yPercent === 'number' ? Math.round(t.yPercent * worldHeight) : 0),
          width: t.width || 40,
          height: t.height || 20,
          damage: typeof t.damage === 'number' ? t.damage : 1,
          // spikePlatform
          period: typeof t.period === 'number' ? t.period : 2000,
          duty: typeof t.duty === 'number' ? Math.max(0.05, Math.min(0.95, t.duty)) : 0.5,
          extended: false,
          timer: 0,
          // knockback
          knockback: typeof t.knockback === 'number' ? t.knockback : 8,
          knockbackY: typeof t.knockbackY === 'number' ? t.knockbackY : 6,
          cooldown: 0,
          cooldownFrames: typeof t.cooldownFrames === 'number' ? t.cooldownFrames : 30,
          // slideTrap
          pos1: (t.pos1 && typeof t.pos1.x === 'number' && typeof t.pos1.y === 'number') ? { x: t.pos1.x, y: t.pos1.y } : null,
          pos2: (t.pos2 && typeof t.pos2.x === 'number' && typeof t.pos2.y === 'number') ? { x: t.pos2.x, y: t.pos2.y } : null,
          speed: typeof t.speed === 'number' ? t.speed : 2,
          dir: 1,
          // followMonster
          originX: null,
          originY: null,
          detectRadius: typeof t.detectRadius === 'number' ? t.detectRadius : 300
        };

        if (t.type === 'slideTrap') {
          if (!base.pos1 && typeof t.x1 === 'number' && typeof t.y1 === 'number') base.pos1 = { x: t.x1, y: t.y1 };
          if (!base.pos2 && typeof t.x2 === 'number' && typeof t.y2 === 'number') base.pos2 = { x: t.x2, y: t.y2 };
          if (!base.pos1 && typeof t.minX === 'number') base.pos1 = { x: t.minX, y: base.y };
          if (!base.pos2 && typeof t.maxX === 'number') base.pos2 = { x: t.maxX, y: base.y };
          if (!base.pos1) base.pos1 = { x: base.x, y: base.y };
          if (!base.pos2) base.pos2 = { x: base.x + 120, y: base.y };
          // determine square size: prefer explicit `size`, then `width`, then fallback
          const size = (typeof t.size === 'number') ? t.size : (typeof t.width === 'number' ? t.width : 40);
          base.width = size; base.height = size;
          base.x = base.pos1.x; base.y = base.pos1.y;
        }

        if (t.type === 'followMonster') {
          base.originX = base.x; base.originY = base.y;
        }

        // Thorn must use fixed dimensions regardless of passed width/height
        if (t.type === 'thorn') {
          base.width = THORN_WIDTH;
          base.height = THORN_HEIGHT;
        }

        this.traps.push(base);
      });
      return this.traps;
    },

    update(player) {
      for (let i = 0; i < this.traps.length; i++) {
        const t = this.traps[i];
        // spikePlatform timing
        if (t.type === 'spikePlatform') {
          const phase = (Date.now() % t.period) / t.period;
          t.extended = phase < t.duty;
        }

        // slideTrap movement
        if (t.type === 'slideTrap') {
          const a = t.pos1, b = t.pos2;
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len, uy = dy / len;
          if (t._s == null) t._s = 0;
          t._s += t.speed * t.dir;
          if (t._s < 0) { t._s = 0; t.dir = 1; }
          if (t._s > len) { t._s = len; t.dir = -1; }
          t.x = Math.round(a.x + ux * t._s);
          t.y = Math.round(a.y + uy * t._s);
        }

        // followMonster behavior
        if (t.type === 'followMonster') {
          if (!player) continue;
          const px = player.x + (player.width || 0) / 2;
          const py = player.y + (player.height || 0) / 2;
          const cx = t.x + t.width / 2;
          const cy = t.y + t.height / 2;
          const dx = px - cx, dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= t.detectRadius) {
            const nx = dx / (dist || 1), ny = dy / (dist || 1);
            t.x += nx * t.speed; t.y += ny * t.speed;
          } else {
            const odx = t.originX - t.x, ody = t.originY - t.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            if (odist > 1) {
              t.x += (odx / odist) * Math.min(t.speed, odist);
              t.y += (ody / odist) * Math.min(t.speed, odist);
            }
          }
        }

        // cooldown
        if (typeof t.cooldown === 'number' && t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - 1);
      }
    },

    draw(ctx, offsetX = 0, offsetY = 0) {
      if (!ctx) return;
      this.traps.forEach(t => {
        const sx = Math.round(t.x - offsetX);
        const sy = Math.round(t.y - offsetY);
        if (t.type === 'thorn') {
          ctx.fillStyle = '#c0392b';
          const step = Math.max(6, Math.round(t.width / 6));
          for (let px = 0; px < t.width; px += step) {
            ctx.beginPath();
            ctx.moveTo(sx + px, sy + t.height);
            ctx.lineTo(sx + px + step / 2, sy);
            ctx.lineTo(sx + Math.min(px + step, t.width), sy + t.height);
            ctx.closePath(); ctx.fill();
          }
        } else if (t.type === 'spikePlatform') {
          ctx.fillStyle = '#8b2f2f'; ctx.fillRect(sx, sy, t.width, t.height);
          if (t.extended) {
            ctx.fillStyle = '#c0392b';
            const sx2 = sx, sy2 = sy - Math.round(t.height);
            const step = Math.max(6, Math.round(t.width / 6));
            for (let px = 0; px < t.width; px += step) {
              ctx.beginPath();
              ctx.moveTo(sx2 + px, sy);
              ctx.lineTo(sx2 + px + step / 2, sy2);
              ctx.lineTo(sx2 + Math.min(px + step, t.width), sy);
              ctx.closePath(); ctx.fill();
            }
          }
        } else if (t.type === 'slideTrap') {
          ctx.fillStyle = '#c0392b'; ctx.fillRect(sx, sy, t.width, t.height);
        } else if (t.type === 'followMonster') {
          ctx.fillStyle = '#c0392b'; ctx.fillRect(sx, sy, t.width, t.height);
          ctx.fillStyle = '#7f2a2a'; ctx.fillRect(sx + Math.round(t.width / 4), sy + Math.round(t.height / 4), Math.max(2, Math.round(t.width / 6)), Math.max(2, Math.round(t.height / 6)));
        }
      });
    },

    checkCollision(player) {
      if (!player) return false;
      // If player is currently invulnerable (i-frames), ignore trap collisions
      if (typeof player.invulnerable === 'number' && player.invulnerable > 0) return false;
      let rect = null;
      if (typeof player.getCollisionRect === 'function') rect = player.getCollisionRect();
      if (!rect) {
        const w = Math.max(1, Math.round(player.width * 2 / 5));
        const h = Math.max(1, Math.round(player.height * 4 / 5));
        const x = player.x + Math.round((player.width - w) / 2);
        const y = player.y + Math.round((player.height - h) / 2);
        rect = { x, y, width: w, height: h };
      }

      for (let i = 0; i < this.traps.length; i++) {
        const t = this.traps[i];
        // spikePlatform only when extended
        if (t.type === 'spikePlatform') {
          if (!t.extended) continue;
          const sx = t.x, sy = t.y - t.height, sw = t.width, sh = t.height;
          if (rect.x + rect.width > sx && rect.x < sx + sw && rect.y + rect.height > sy && rect.y < sy + sh) {
            // apply knockback if available, non-fatal
              if (!t.cooldown) {
                const pcenter = (player.x + (player.width || 0) / 2);
                const tcenter = (t.x + (t.width || 0) / 2);
                const dir = (pcenter >= tcenter) ? 1 : -1;
                // frame-based knockback: small backward vx, upward vy, duration and invul
                // base values
                const baseFrames = typeof t.knockbackDuration === 'number' ? t.knockbackDuration : 12;
                const kbFrames = baseFrames * 2; // user requested: double knockback time
                const invFrames = typeof t.invulnerableFrames === 'number' ? t.invulnerableFrames : Math.max(8, Math.floor(kbFrames / 2));
                const baseKB = typeof t.knockback === 'number' ? t.knockback : 8;
                const baseKBY = typeof t.knockbackY === 'number' ? t.knockbackY : 6;
                // user requested: horizontal distance x4, vertical height x2
                const vx = dir * (baseKB * 1.5);
                const vy = -baseKBY;
                // attach knockback state to player; player.update will consume it
                player._knockback = { frames: kbFrames, vx: vx, vy: vy, damping: 0.85, invulnerable: invFrames };
                player.invulnerable = Math.max(player.invulnerable || 0, invFrames);
                // set trap cooldown to avoid repeated triggering
                t.cooldown = t.cooldownFrames || 30;
              }
              return false;
          }
          continue;
        }

        // normal AABB
        if (rect.x + rect.width > t.x && rect.x < t.x + t.width && rect.y + rect.height > t.y && rect.y < t.y + t.height) {
          // thorn/slideTrap/spikePlatform: knockback non-fatal
          if (t.type === 'thorn' || t.type === 'slideTrap') {
            if (!t.cooldown) {
              const pcenter = (player.x + (player.width || 0) / 2);
              const tcenter = (t.x + (t.width || 0) / 2);
              const dir = (pcenter >= tcenter) ? 1 : -1;
              const baseFrames = typeof t.knockbackDuration === 'number' ? t.knockbackDuration : 12;
              const kbFrames = baseFrames * 2; // double duration
              const invFrames = typeof t.invulnerableFrames === 'number' ? t.invulnerableFrames : Math.max(8, Math.floor(kbFrames / 2));
              const baseKB = typeof t.knockback === 'number' ? t.knockback : 8;
              const baseKBY = typeof t.knockbackY === 'number' ? t.knockbackY : 6;
              const vx = dir * (baseKB * 1.5);
              const vy = -baseKBY;
              player._knockback = { frames: kbFrames, vx: vx, vy: vy, damping: 0.85, invulnerable: invFrames };
              player.invulnerable = Math.max(player.invulnerable || 0, invFrames);
              t.cooldown = t.cooldownFrames || 30;
            }
            return false;
          }
          // followMonster: fatal
          return true;
        }
      }
      return false;
    }
  };

  window.Stage4Traps = Stage4Traps;
})();
