(function () {
	'use strict';

	// Stage4 player module: exposes `window.Stage4Player` with a `player` object
	// and helper methods. Game loop (gameScript.js) should call `updateMovement(keys)`
	// and use `player` for collision/drawing.

	const Stage4Player = {
		player: {
			x: 180,
			y: 0,
			// increased size: 8x (previously 4x, doubled again per request)
			width: 240,
			height: 240,
			xSpeed: 0,
			ySpeed: 0,
			jumpPower: -10,
			gravity: 0.4,
			grounded: false
		},

		init(startPlatformY) {
			// Place player on top of the given start platform Y
			if (typeof startPlatformY === 'number') {
				this.player.y = startPlatformY - this.player.height;
			}

			// Load character selection from saved custom data (localStorage key)
			try {
				const raw = localStorage.getItem('skiff_custom_v1');
				const data = raw ? JSON.parse(raw) : {};
				this.selectedCharacter = data.character || 'rea';
			} catch (e) { this.selectedCharacter = 'rea'; }

			// Prepare sprite images from assets/character/<Name>/move/
			// support both GIF fallback and an atlas PNG named <Base>_atlas.png
			this.sprites = { runLeft: {}, runRight: {}, stopLeft: {}, stopRight: {} };
			this.hasSprites = false;
			try {
				// folder and file prefixes use capitalized character name (e.g., 'Noel')
				const folderName = this.selectedCharacter.charAt(0).toUpperCase() + this.selectedCharacter.slice(1).toLowerCase();
				const base = `assets/character/${folderName}/move/`;
				const names = {
					runLeft: `${folderName}_run_left`,
					runRight: `${folderName}_run_right`,
					stopLeft: `${folderName}_stop_left`,
					stopRight: `${folderName}_stop_right`
				};
				let loadedCount = 0;
				Object.keys(names).forEach(key => {
					// only load atlas PNGs; GIF fallback removed per request
					const atlasSrc = base + names[key] + '_atlas.png';
					const atlasImg = new Image();
					atlasImg.onload = () => {
						// Determine an appropriate frame grid. Use gcd heuristic as a fallback,
						// but ensure we compute integer cols/rows and frame sizes.
						function gcd(a,b){ return b===0? a : gcd(b, a%b); }
						const w = atlasImg.width, h = atlasImg.height;
						// We want exactly 28 frames. Choose a cols x rows factor pair of 28
						// that best matches the atlas aspect ratio and the player's box.
						const targetFrames = 28;
						const factorPairs = [[1,28],[2,14],[4,7],[7,4],[14,2],[28,1]];
						const desiredRatio = (this.player && this.player.width && this.player.height) ? (this.player.width / this.player.height) : 1;
						let best = factorPairs[0];
						let bestScore = Infinity;
						for (let i = 0; i < factorPairs.length; i++) {
							const [c,r] = factorPairs[i];
							const frameWcand = w / c;
							const frameHcand = h / r;
							const candRatio = frameWcand / frameHcand;
							const score = Math.abs(candRatio - desiredRatio) + Math.abs((c * r) - targetFrames) * 0.001;
							if (score < bestScore) { bestScore = score; best = [c,r]; }
						}
						let cols = Math.max(1, best[0]);
						let rows = Math.max(1, best[1]);
						// Compute integer frame sizes
						const frameW = Math.floor(w / cols) || 1;
						const frameH = Math.floor(h / rows) || 1;
						const frames = targetFrames; // force 28 frames
						this.sprites[key].atlas = atlasImg;
						this.sprites[key].atlasFrames = frames;
						this.sprites[key].atlasCols = cols;
						this.sprites[key].atlasRows = rows;
						this.sprites[key].atlasFrameW = frameW;
						this.sprites[key].atlasFrameH = frameH;
						loadedCount++;
						this.hasSprites = true; // at least one atlas loaded
					};
					atlasImg.onerror = () => {
						// intentionally do nothing; no GIF fallback
					};
					atlasImg.src = atlasSrc;
					this.sprites[key].atlas = null;
				});
			} catch (e) { /* ignore */ }

			// runtime state for animation
			this.facing = 'right'; // 'left' or 'right'
			this.isMoving = false;
			this.currentSprite = null;
			// expose collision helper on the player object for external modules
			try { this.player.getCollisionRect = this.getCollisionRect.bind(this); } catch (e) { }
		},

		updateMovement(keys) {
			const p = this.player;
			// horizontal movement
			let moving = false;
			if (keys['ArrowLeft']) { p.x -= 3; p.xSpeed = -3; p.ySpeed = p.ySpeed; p.x = Math.max(0, p.x); this.facing = 'left'; moving = true; }
			if (keys['ArrowRight']) { p.x += 3; p.xSpeed = 3; p.ySpeed = p.ySpeed; this.facing = 'right'; moving = true; }
			this.isMoving = moving;

			// clamp horizontal position to the visible game area (prevent leaving right edge)
			try {
				const canvasEl = document.getElementById && document.getElementById('gameCanvas');
				let maxX = null;
				if (canvasEl) {
					// prefer the canvas coordinate width, fall back to its css size or viewport
					const cw = canvasEl.width || (canvasEl.getBoundingClientRect && canvasEl.getBoundingClientRect().width) || window.innerWidth;
					maxX = Math.max(0, cw - (p.width || 0));
				} else {
					maxX = Math.max(0, window.innerWidth - (p.width || 0));
				}
				if (typeof maxX === 'number') p.x = Math.min(maxX, Math.max(0, p.x));
			} catch (e) { /* ignore in weird environments */ }

			// vertical physics
			p.ySpeed += p.gravity;
			p.y += p.ySpeed;
			if (p.grounded && keys[' ']) {
				p.ySpeed = p.jumpPower;
				p.grounded = false;
			}

			// choose current sprite based on movement/facing
			// store current key for drawing (object holds atlas/gif)
			this.currentKey = this.isMoving ? (this.facing === 'left' ? 'runLeft' : 'runRight') : (this.facing === 'left' ? 'stopLeft' : 'stopRight');
		},

		// small helper used by game loop to set grounded state
		setGrounded(val) { this.player.grounded = !!val; },

		// Return the inner collision rectangle (centered inside the drawn atlas/frame).
		// This matches the red frame drawn in `draw()` and returns integers.
		getCollisionRect() {
			const p = this.player;
			// Determine sprite currently used
			const key = this.currentKey || 'stopRight';
			const sprite = this.sprites && this.sprites[key] ? this.sprites[key] : {};
			// Default draw area is the full player box
			let drawW = p.width;
			let drawH = p.height;
			let dx = p.x;
			let dy = p.y;
			try {
				if (sprite.atlas && sprite.atlas.complete) {
					const frameW = sprite.atlasFrameW || 1;
					const frameH = sprite.atlasFrameH || 1;
					const ratio = frameW / frameH;
					if ((p.width / p.height) > ratio) {
						// limit by height
						drawH = p.height;
						drawW = Math.round(drawH * ratio);
					} else {
						// limit by width
						drawW = p.width;
						drawH = Math.round(drawW / ratio);
					}
					dx = p.x + Math.round((p.width - drawW) / 2);
					dy = p.y + Math.round((p.height - drawH) / 2);
				}
			} catch (e) { /* fall back to full box */ }
			// inner collision frame: width = 2/5 of drawW, height = 4/5 of drawH, centered
			const innerW = Math.max(1, Math.round(drawW * 2 / 5));
			const innerH = Math.max(1, Math.round(drawH * 4 / 5));
			const innerX = dx + Math.round((drawW - innerW) / 2);
			const innerY = dy + Math.round((drawH - innerH) / 2);
			return { x: innerX, y: innerY, width: innerW, height: innerH };
		},

		// draw the player to a canvas context. If GIF sprites are available use them.
		draw(ctx) {
			const p = this.player;
			// pick sprite data for currentKey
			const key = this.currentKey || 'stopRight';
			const sprite = this.sprites[key] || {};
			// Atlas drawing (preferred)
			if (sprite.atlas && sprite.atlas.complete) {
				try {
					const atlas = sprite.atlas;
					const frames = sprite.atlasFrames || 1;
					const cols = sprite.atlasCols || 1;
					const frameW = sprite.atlasFrameW || Math.floor(atlas.width / cols);
					const frameH = sprite.atlasFrameH || Math.floor(atlas.height / Math.max(1, Math.floor(atlas.height / frameW)));
					const fps = 33; // use 33 FPS per request
					const frameIndex = Math.floor(Date.now() / (1000 / fps)) % frames;
					const sx = (frameIndex % cols) * frameW;
					const sy = Math.floor(frameIndex / cols) * frameH;
					// draw the sliced frame scaled into the player box while preserving aspect ratio
					const ratio = frameW / frameH;
					let drawW = p.width, drawH = p.height;
					if (p.width / p.height > ratio) {
						// player box is wider than frame -> limit by height
						drawH = p.height;
						drawW = Math.round(drawH * ratio);
					} else {
						// limit by width
						drawW = p.width;
						drawH = Math.round(drawW / ratio);
					}
					const dx = p.x + Math.round((p.width - drawW) / 2);
					const dy = p.y + Math.round((p.height - drawH) / 2);
					ctx.drawImage(atlas, sx, sy, frameW, frameH, dx, dy, drawW, drawH);
					// Draw outer outline (green) matching the player's collision box
					try {
						ctx.save();
						ctx.strokeStyle = 'green';
						ctx.lineWidth = 2;
						ctx.strokeRect(p.x, p.y, p.width, p.height);
						// Draw inner collision frame (red) centered inside the atlas-drawn frame
						const innerW = Math.max(1, Math.round(drawW * 2 / 5));
						const innerH = Math.max(1, Math.round(drawH * 4 / 5));
						const innerX = dx + Math.round((drawW - innerW) / 2);
						const innerY = dy + Math.round((drawH - innerH) / 2);
						ctx.strokeStyle = 'red';
						ctx.lineWidth = 2;
						ctx.strokeRect(innerX, innerY, innerW, innerH);
						ctx.restore();
					} catch (e) { /* ignore drawing errors */ }
					return;
				} catch (e) { /* continue to fallback */ }
			}
			// fallback visual
			ctx.fillStyle = 'blue';
			ctx.fillRect(p.x, p.y, p.width, p.height);
			// Draw outer outline (green) matching the player's collision box
			try {
				ctx.save();
				ctx.strokeStyle = 'green';
				ctx.lineWidth = 2;
				ctx.strokeRect(p.x, p.y, p.width, p.height);
				// Draw inner collision frame (red) centered inside the player box (fallback)
				const innerW = Math.max(1, Math.round(p.width * 2 / 5));
				const innerH = Math.max(1, Math.round(p.height * 4 / 5));
				const innerX = p.x + Math.round((p.width - innerW) / 2);
				const innerY = p.y + Math.round((p.height - innerH) / 2);
				ctx.strokeStyle = 'red';
				ctx.lineWidth = 2;
				ctx.strokeRect(innerX, innerY, innerW, innerH);
				ctx.restore();
			} catch (e) { /* ignore drawing errors */ }
		}
	};

	window.Stage4Player = Stage4Player;

})();

