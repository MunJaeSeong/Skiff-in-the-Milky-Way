(function () {
	'use strict';

	/**
	 * Stage4 플레이어 모듈
	 *
	 * 아래 코드는 게임에서 '플레이어(캐릭터)'를 관리하는 모듈입니다.
	 * 중학생도 이해할 수 있게 쉽게 설명하면:
	 * - 플레이어의 위치(x, y)와 속도(xSpeed, ySpeed), 크기(width, height)를 저장합니다.
	 * - 키 입력(왼쪽, 오른쪽, 점프)에 따라 플레이어를 움직입니다.
	 * - 중력과 점프 힘을 계산해서 위/아래 움직임을 처리합니다.
	 * - 충돌(땅 위에 닿았는지) 검사용으로 내부 충돌상자(rect)를 제공합니다.
	 * - 캔버스에 플레이어를 그리되, 화면이 이동(카메라)할 때 적절히 보이게 합니다.
	 *
	 * 주의: 이 파일은 동작을 바꾸지 않고 '주석'만 추가합니다. 코드 자체는 변경하지 않습니다.
	 */
	const Stage4Player = {
		// 조정 가능한 설정: 다른 모듈이나 콘솔에서 `window.Stage4Player.config`를 수정하거나
		// 아래 제공하는 헬퍼 셋터로 변경할 수 있습니다.
		config: {
			baseHeight: 60,           // 물리값 스케일링에 사용되는 기준 높이
			baseJumpMag: 4,          // 기준 점프 세기(양수)
			baseGravity: 0.2,         // 기준 중력 값
			gravityMultiplier: 1.5,   // 중력 배수(중력을 강하게/약하게 조절)
			baseMoveSpeed: 4,         // 기준 수평 이동 속도
			moveSpeedMultiplier: 2    // 수평 속도에 곱할 배수
		},

		/**
		 * `this.config`에 따라 물리값(중력, 점프 파워, 이동 속도)을 재계산합니다.
		 * 설정을 변경하거나 플레이어 크기가 바뀌었을 때 호출하세요.
		 */
		configurePhysics() {
			try {
				const cfg = this.config || {};
				const baseHeight = (typeof cfg.baseHeight === 'number') ? cfg.baseHeight : 60;
				const scale = Math.max(0.1, (this.player.height || baseHeight) / baseHeight);
				const baseJumpMag = (typeof cfg.baseJumpMag === 'number') ? cfg.baseJumpMag : 10;
				const baseGravity = (typeof cfg.baseGravity === 'number') ? cfg.baseGravity : 0.4;
				const gravityMultiplier = (typeof cfg.gravityMultiplier === 'number') ? cfg.gravityMultiplier : 1.0;
				// compute per-frame gravity and jumpPower (negative for upward initial velocity)
				this.player.gravity = baseGravity * scale * gravityMultiplier;
				this.player.jumpPower = - (baseJumpMag * scale * Math.sqrt(Math.max(0.0001, gravityMultiplier)));
				// horizontal movement speed exposed on the module (used in updateMovement)
				const baseMoveSpeed = (typeof cfg.baseMoveSpeed === 'number') ? cfg.baseMoveSpeed : 3;
				const moveSpeedMultiplier = (typeof cfg.moveSpeedMultiplier === 'number') ? cfg.moveSpeedMultiplier : 1;
				this.moveSpeed = baseMoveSpeed * moveSpeedMultiplier;
			} catch (e) { /* ignore and keep previous values */ }
		},

		// 런타임에 물리값을 조절하기 위한 헬퍼 셋터들. config를 갱신한 뒤 재계산합니다.
		setGravityMultiplier(val) { if (typeof val === 'number') { this.config.gravityMultiplier = val; this.configurePhysics(); } },
		setMoveSpeedMultiplier(val) { if (typeof val === 'number') { this.config.moveSpeedMultiplier = val; this.configurePhysics(); } },
		setBaseJumpMag(val) { if (typeof val === 'number') { this.config.baseJumpMag = val; this.configurePhysics(); } },
		setBaseGravity(val) { if (typeof val === 'number') { this.config.baseGravity = val; this.configurePhysics(); } },

		player: {	// 오류 방지 용 초기값
			x: 180,
			y: 0,
			// 플레이어 크기 (화면에 표시되는 사각형 크기)
			// 참고: 이 값이 크면 점프/중력 등 물리가 상대적으로 달라보일 수 있습니다.
			width: 240,
			height: 240,
			xSpeed: 0,
			ySpeed: 0,
			// gravity/jumpPower are computed using config during init/configure
			jumpPower: -10,
			gravity: 0.4,
			grounded: false,
			// pass-through platform support: when >0, ground collision with the
			// platform at `passThroughPlatformY` will be ignored. Counted down
			// each frame by `updateMovement`.
			passThroughCountdown: 0,
			passThroughPlatformY: null
		},

		// lie-down state and images
		isLying: false,
		lieRightImg: null,
		lieLeftImg: null,
		onTether: false,
		tether: null,
		holdImg: null,
		// last horizontal key press tracking for quick-tap directional jumps
		_lastHorizPressTime: 0,
		_lastHorizDir: null,

		/**
		 * 플레이어 초기화 함수
		 * - 게임 시작 시 플레이어를 시작 발판 바로 위에 배치합니다.
		 * - 선택적으로 시작 X 좌표를 전달할 수 있습니다.
		 * @param {number} startPlatformY - 시작 발판의 위쪽 Y 좌표(월드 좌표)
		 * @param {number} [startPlatformX] - 선택적 시작 X 좌표(월드 좌표)
		 */
		init(startPlatformY) {
		// 전달된 시작 발판 Y 좌표 바로 위에 플레이어를 놓습니다.
		// 두 번째 인수로 시작 X를 받으면 그 위치로 이동시킵니다.
			const startPlatformX = arguments.length > 1 ? arguments[1] : undefined;
			if (typeof startPlatformY === 'number') {
				this.player.y = startPlatformY - this.player.height;
			}
			if (typeof startPlatformX === 'number') {
				this.player.x = startPlatformX;
			}

			// 이전에 선택한 캐릭터 정보를 로컬 스토리지에서 불러옵니다.
			try {
				const raw = localStorage.getItem('skiff_custom_v1');
				const data = raw ? JSON.parse(raw) : {};
				this.selectedCharacter = data.character || 'rea';
			} catch (e) { this.selectedCharacter = 'rea'; }

			// 캐릭터 스프라이트(아틀라스)를 불러올 준비를 합니다.
			// 아틀라스는 `assets/character/<이름>/move/` 폴더에서 찾습니다.
			this.sprites = { runLeft: {}, runRight: {}, stopLeft: {}, stopRight: {} };
			this.hasSprites = false;
			this.lieRightImg = null;
			this.lieLeftImg = null;
			this.hasLieImages = false;
			try {
				// 폴더 이름과 파일 이름은 캐릭터 이름의 첫 글자가 대문자입니다. 예: 'Noel'
				const folderName = this.selectedCharacter.charAt(0).toUpperCase() + this.selectedCharacter.slice(1).toLowerCase();
				const base = `assets/character/${folderName}/move/`;
				const names = {
					runLeft: `${folderName}_run_left`,
					runRight: `${folderName}_run_right`,
					stopLeft: `${folderName}_stop_left`,
					stopRight: `${folderName}_stop_right`
				};
				Object.keys(names).forEach(key => {
					// 아틀라스 PNG만 불러옵니다. GIF 대체 로드는 사용하지 않습니다.
					const atlasSrc = base + names[key] + '_atlas.png';
					const atlasImg = new Image();
					atlasImg.onload = () => {
						// 아틀라스(한 장 이미지)에 들어 있는 프레임 배열을 계산합니다.
						// 가로/세로 칸 수를 정해 각 프레임의 픽셀 크기를 계산합니다.
						const w = atlasImg.width, h = atlasImg.height;
						// 이 게임은 28프레임을 사용하도록 되어 있습니다. 아틀라스 비율에 맞게
						// 가로x세로 조합을 골라 프레임 수를 맞춥니다.
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
						// 최종적으로 각 프레임의 픽셀 크기를 정수로 계산합니다.
						const frameW = Math.floor(w / cols) || 1;
						const frameH = Math.floor(h / rows) || 1;
						const frames = targetFrames; // force 28 frames
						this.sprites[key].atlas = atlasImg;
						this.sprites[key].atlasFrames = frames;
						this.sprites[key].atlasCols = cols;
						this.sprites[key].atlasRows = rows;
						this.sprites[key].atlasFrameW = frameW;
						this.sprites[key].atlasFrameH = frameH;
						this.hasSprites = true; // at least one atlas loaded
					};
					atlasImg.onerror = () => {
						// intentionally do nothing; no GIF fallback
					};
					atlasImg.src = atlasSrc;
					this.sprites[key].atlas = null;
				});
				// lie-down images: try loading from move subfolder first, then fall back to character root
				try {
					const lieRight = new Image();
					const lieLeft = new Image();
					let tried = 0;
					const tryPaths = [
						`${base}${folderName}_liedown_right.png`,
						`assets/character/${folderName}/${folderName}_liedown_right.png`
					];
					const tryPathsLeft = [
						`${base}${folderName}_liedown_left.png`,
						`assets/character/${folderName}/${folderName}_liedown_left.png`
					];

					lieRight.onload = () => { this.lieRightImg = lieRight; this.hasLieImages = true; };
					lieLeft.onload = () => { this.lieLeftImg = lieLeft; this.hasLieImages = true; };

					lieRight.onerror = () => {
						// if first path failed, try fallback
						if (tried === 0) { tried = 1; lieRight.src = tryPaths[1]; }
					};
					lieLeft.onerror = () => {
						if (tried === 0) { tried = 1; lieLeft.src = tryPathsLeft[1]; }
					};

					// start by trying move/ path
					lieRight.src = tryPaths[0];
					lieLeft.src = tryPathsLeft[0];
				} catch (e) { /* ignore */ }
				// hold image (used when grabbing tether)
				try {
					const hold = new Image();
					hold.onload = () => { this.holdImg = hold; };
					hold.onerror = () => { /* ignore */ };
					hold.src = base + folderName + '_hold.png';
				} catch (e) { /* ignore */ }
			} catch (e) { /* ignore */ }


			// 플레이어 크기와 설정(config)에 따라 물리 파라미터를 계산합니다.
			try {
				this.configurePhysics();
			} catch (e) { /* 실패 시 기존 값 유지 */ }

			// 애니메이션 및 상태를 위한 런타임 변수들
			this.facing = 'right'; // 'left' 또는 'right'
			this.isMoving = false;
			this.currentSprite = null;
			// 다른 모듈이 충돌 상자를 쉽게 호출할 수 있게 helper를 연결합니다.
			try { this.player.getCollisionRect = this.getCollisionRect.bind(this); } catch (e) { }
		},

		updateMovement(keys) {
			const p = this.player;

			// Handle frame-based knockback state (set by traps). When active,
			// disable player input and apply knockback velocities for a few frames.
			let kbActive = false;
			if (p._knockback && typeof p._knockback.frames === 'number' && p._knockback.frames > 0) {
				kbActive = true;
				const kb = p._knockback;
				// adopt current knockback velocities into player's speed so physics applies them
				p.xSpeed = kb.vx;
				p.ySpeed = kb.vy;
				// If player was holding a tether, release it when knockback occurs
				try {
					if (p.onTether) {
						p.onTether = false;
						p.tether = null;
						p.grounded = false;
					}
				} catch (e) { /* ignore */ }
				// move horizontally according to current speed (input movement is skipped)
				p.x += p.xSpeed;
				// gently apply gravity to knockback vertical velocity so player arcs naturally
				kb.vy += (p.gravity || 0) * 0.5;
				// damp horizontal knockback so it decays over frames
				kb.vx *= (typeof kb.damping === 'number' ? kb.damping : 0.9);
				// decrement frames and set invulnerability
				kb.frames -= 1;
				p.invulnerable = Math.max(p.invulnerable || 0, kb.invulnerable || 0);
				if (kb.frames <= 0) {
					p._knockback = null;
				}
			}

			// decrement invulnerability frames if present
			if (typeof p.invulnerable === 'number' && p.invulnerable > 0) {
				p.invulnerable = Math.max(0, p.invulnerable - 1);
			}

			// 가로 이동 처리 (skip when knockback active)
			let moving = false;
			const speed = (typeof this.moveSpeed === 'number') ? this.moveSpeed : 3;
			// lie-down: if ArrowDown is held, enter lying state and disallow horizontal movement
			if (!kbActive) {
				// allow entering lying state only when player is grounded
				if (keys['ArrowDown'] && p.grounded) {
					this.isLying = true;
					p.xSpeed = 0;
					// don't allow left/right movement while lying
				} else {
					this.isLying = false;
					// If player is attached to a tether, disallow horizontal movement here.
					if (!p.onTether) {
						if (keys['ArrowLeft']) { p.x -= speed; p.xSpeed = -speed; this.facing = 'left'; moving = true; this._lastHorizPressTime = Date.now(); this._lastHorizDir = 'left'; }
						if (keys['ArrowRight']) { p.x += speed; p.xSpeed = speed; this.facing = 'right'; moving = true; this._lastHorizPressTime = Date.now(); this._lastHorizDir = 'right'; }
					} else {
						// ensure no horizontal velocity while on tether
						p.xSpeed = 0;
					}
				}
			} else {
				// while knockback/stun is active, prevent input-based movement
				this.isLying = false;
			}
			this.isMoving = moving;

			// 플레이어가 화면(또는 월드) 좌우 밖으로 나가지 않도록 위치를 제한합니다.
			try {
				const canvasEl = document.getElementById && document.getElementById('gameCanvas');
				let maxX = null;
				if (window.Stage4Ground && typeof window.Stage4Ground.worldWidth === 'number') {
					maxX = Math.max(0, window.Stage4Ground.worldWidth - (p.width || 0));
				} else if (canvasEl) {
					const cw = canvasEl.width || (canvasEl.getBoundingClientRect && canvasEl.getBoundingClientRect().width) || window.innerWidth;
					maxX = Math.max(0, cw - (p.width || 0));
				} else {
					maxX = Math.max(0, window.innerWidth - (p.width || 0));
				}
				if (typeof maxX === 'number') p.x = Math.min(maxX, Math.max(0, p.x));
			} catch (e) { /* ignore in weird environments */ }

			// decrement pass-through countdown (if active)
			try {
				if (typeof p.passThroughCountdown === 'number' && p.passThroughCountdown > 0) {
					p.passThroughCountdown -= 1;
					if (p.passThroughCountdown <= 0) p.passThroughPlatformY = null;
				}
			} catch (e) { /* ignore */ }

			// 수직 물리 계산: 중력은 로프에 매달린 상태에서는 적용하지 않습니다.
			if (!p.onTether) {
				p.ySpeed += p.gravity;
				p.y += p.ySpeed;
			} else {
				// while on tether, keep vertical speed zero to ignore gravity
				p.ySpeed = 0;
			}

			// If player is lying and presses jump while grounded, attempt a pass-through
			// only if the platform directly below is a map-defined platform (tagged
			// with `isMapPlatform`). If no such platform is found, perform a normal jump.
			if (this.isLying && keys[' '] && p.grounded) {
				let rect = null;
				try { rect = this.getCollisionRect(); } catch (e) { rect = null; }
				// bottom of player's collision rect (approximate foot position)
				const footY = rect ? (rect.y + rect.height) : (p.y + p.height);
				let chosenPlatformY = null;
				try {
					const gw = window.Stage4Ground;
					if (gw) {
						// search platforms for a map-origin platform whose top is near the footY
						const candidates = [];
						if (Array.isArray(gw.platforms)) candidates.push(...gw.platforms);
						if (Array.isArray(gw.ground)) candidates.push(...gw.ground);
						const tol = 12; // pixels tolerance for matching platform top
						for (let i = 0; i < candidates.length; i++) {
							const pp = candidates[i];
							if (pp && typeof pp.y === 'number') {
								if (Math.abs(pp.y - footY) <= tol && pp.isMapPlatform) { chosenPlatformY = pp.y; break; }
							}
						}
					}
				} catch (e) { /* ignore search errors */ }
				if (chosenPlatformY != null) {
					p.passThroughPlatformY = chosenPlatformY;
					// frames to ignore that platform (tune as needed)
					p.passThroughCountdown = 12;
					p.grounded = false;
					// small nudge so physics places player below the platform next frame
					p.y += 1;
				} else {
					// no map platform beneath and player is lying: do NOT perform a
					// normal jump. This prevents pass-through/normal-jump when standing
					// on ground layers or other procedural platforms.
					// Keep player grounded; no state change.
				}
			} else if (p.grounded && keys[' ']) {
				p.ySpeed = p.jumpPower;
				p.grounded = false;
			}

			// --- Tether interaction: press ArrowUp near tether top to grab ---
			try {
				if (!kbActive && keys['ArrowUp'] && !p.onTether) {
					const gw = window.Stage4Ground;
					if (gw && typeof gw.findTetherForPlayer === 'function') {
						const t = gw.findTetherForPlayer(p);
						if (t) {
							p.onTether = true;
							p.tether = t;
							p.ySpeed = 0;
							// align horizontally to tether; keep the current Y so player stays
							// exactly where they grabbed the rope (no vertical snap)
							p.x = t.x - Math.round(p.width / 2);
							p.grounded = false;
						}
					}
				}
				// while on tether: allow climb up/down and release with Space
				if (p.onTether) {
					// clamp within tether length
					if (p.tether) {
						if (keys['ArrowUp']) p.y -= 2;
						if (keys['ArrowDown']) p.y += 2;
						// clamp
						p.y = Math.max(p.tether.y - p.height + 4, Math.min(p.tether.y + p.tether.length - 4, p.y));
					}
					// release / jump off
					if (keys[' ']) {
						// determine directional jump: prefer current held left/right,
						// otherwise accept a recent quick-tap (within 250ms) of left/right
						let dir = null;
						if (keys['ArrowLeft']) dir = 'left';
						else if (keys['ArrowRight']) dir = 'right';
						else {
							try {
								const now = Date.now();
								if (this._lastHorizPressTime && (now - this._lastHorizPressTime) <= 250) dir = this._lastHorizDir;
							} catch (e) { /* ignore */ }
						}
						if (dir === 'left') {
							p.onTether = false; p.tether = null; p.ySpeed = p.jumpPower; p.grounded = false; p.xSpeed = -Math.max(speed, 1) * 1.6;
						} else if (dir === 'right') {
							p.onTether = false; p.tether = null; p.ySpeed = p.jumpPower; p.grounded = false; p.xSpeed = Math.max(speed, 1) * 1.6;
						} else {
							p.onTether = false; p.tether = null; p.ySpeed = p.jumpPower; p.grounded = false;
						}
					}
					// while on tether, disable horizontal movement
					p.xSpeed = 0;
				}
			} catch (e) { /* best-effort tether behavior: ignore errors */ }

			// 걷는지/멈춤 여부와 바라보는 방향에 따라 사용할 스프라이트 키를 선택합니다.
			// 선택된 키는 그리기 함수에서 알맞은 아틀라스를 결정하는 데 사용됩니다.
			if (this.isLying) {
				this.currentKey = this.facing === 'left' ? 'liedownLeft' : 'liedownRight';
			} else {
				this.currentKey = this.isMoving ? (this.facing === 'left' ? 'runLeft' : 'runRight') : (this.facing === 'left' ? 'stopLeft' : 'stopRight');
			}
		},

		// 게임 루프에서 땅에 닿았는지를 외부에서 설정할 수 있는 헬퍼 함수
		setGrounded(val) { this.player.grounded = !!val; },

		// 내부 충돌 사각형을 반환합니다.
		// 실제 그려진 이미지 안에서 충돌을 검사하기 위한 좁은 박스(빨간 테두리와 대응)입니다.
		getCollisionRect() {
			const p = this.player;
			// 현재 사용 중인 스프라이트 키를 가져옵니다.
			const key = this.currentKey || 'stopRight';
			const sprite = this.sprites && this.sprites[key] ? this.sprites[key] : {};
			// 기본적으로는 플레이어 전체 사각형을 그리기 영역으로 봅니다.
			let drawW = p.width;
			let drawH = p.height;
			let dx = p.x;
			let dy = p.y;
			const lieScale = 0.7;
			try {
				if (sprite.atlas && sprite.atlas.complete) {
					const frameW = sprite.atlasFrameW || 1;
					const frameH = sprite.atlasFrameH || 1;
					const ratio = frameW / frameH;
					if ((p.width / p.height) > ratio) {
						// 이미지 비율보다 플레이어 상자가 더 가로로 길면 높이를 기준으로 맞춥니다.
						drawH = p.height;
						drawW = Math.round(drawH * ratio);
					} else {
						// 그렇지 않으면 너비를 기준으로 맞춥니다.
						drawW = p.width;
						drawH = Math.round(drawW / ratio);
					}
					dx = p.x + Math.round((p.width - drawW) / 2);
					dy = p.y + Math.round((p.height - drawH) / 2);
					// apply lying scale if applicable
					if (this.isLying) {
						drawW = Math.max(1, Math.round(drawW * lieScale));
						drawH = Math.max(1, Math.round(drawH * lieScale));
						dx = p.x + Math.round((p.width - drawW) / 2);
						// reduce bottom gap to half: put image higher so bottom gap = (p.height - drawH)/4
						dy = p.y + Math.round((p.height - drawH) * 3 / 4);
					}
				}
			} catch (e) { /* fall back to full box */ }
			// 내부 충돌 상자 크기 규칙:
			// - 너비는 그려진 너비의 2/5
			// - 높이는 그려진 높이의 4/5
			// - 그리고 중앙에 위치시킵니다.
			if (this.isLying) {
				// Lying collision: width = 4/5 of player, height = 1/5 of player, bottom-aligned
				const innerW = Math.max(1, Math.round(p.width * 2 / 3));
				const innerH = Math.max(1, Math.round(p.height * 1 / 5));
				const innerX = p.x + Math.round((p.width - innerW) / 2);
				// lift the lying collision box slightly (0.1 * player height)
				const innerY = p.y + p.height - innerH - Math.round(p.height * 0.1);
				return { x: innerX, y: innerY, width: innerW, height: innerH };
			} else {
				const innerW = Math.max(1, Math.round(drawW * 2 / 5));
				const innerH = Math.max(1, Math.round(drawH * 4 / 5));
				const innerX = dx + Math.round((drawW - innerW) / 2);
				const innerY = dy + Math.round((drawH - innerH) / 2);
				return { x: innerX, y: innerY, width: innerW, height: innerH };
			}
		},

		// 캔버스에 플레이어를 그리는 함수
		// `offsetX`, `offsetY`는 카메라 오프셋이며 월드 좌표에서 빼서 그립니다.
		// 스프라이트(아틀라스)가 있으면 아틀라스를 우선 사용합니다.
		draw(ctx, offsetX = 0, offsetY = 0) {
			const p = this.player;

			// If attached to a tether and a hold image is available, draw it
			try {
				if (p.onTether && this.holdImg && this.holdImg.complete) {
					const img = this.holdImg;
					const iw = img.width || 1;
					const ih = img.height || 1;
					const ratio = iw / ih;
					let drawW = p.width, drawH = p.height;
					if (p.width / p.height > ratio) { drawH = p.height; drawW = Math.round(drawH * ratio); }
					else { drawW = p.width; drawH = Math.round(drawW / ratio); }
					// slightly reduce size so the hold sprite fits nicely
					drawW = Math.max(1, Math.round(drawW * 0.9));
					drawH = Math.max(1, Math.round(drawH * 0.9));
					const dx = p.x + Math.round((p.width - drawW) / 2) - offsetX;
					const dy = p.y + Math.round((p.height - drawH) / 2) - offsetY;
					ctx.drawImage(img, 0, 0, iw, ih, dx, dy, drawW, drawH);
					// draw outer box (green) then inner collision rect (red) like other draw paths
					try {
						ctx.save();
						ctx.strokeStyle = 'green'; ctx.lineWidth = 2;
						ctx.strokeRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height);
						if (this.isLying) {
							const innerW = Math.max(1, Math.round(p.width * 2 / 3));
							const innerH = Math.max(1, Math.round(p.height * 1 / 5));
							const innerX = Math.round(p.x - offsetX) + Math.round((p.width - innerW) / 2);
							const innerY = Math.round(p.y - offsetY) + (p.height - innerH) - Math.round(p.height * 0.1);
							ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.strokeRect(innerX, innerY, innerW, innerH);
						} else {
							const innerW = Math.max(1, Math.round(drawW * 2 / 5));
							const innerH = Math.max(1, Math.round(drawH * 4 / 5));
							const innerX = dx + Math.round((drawW - innerW) / 2);
							const innerY = dy + Math.round((drawH - innerH) / 2);
							ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.strokeRect(innerX, innerY, innerW, innerH);
						}
						ctx.restore();
					} catch (e) { /* ignore drawing errors */ }
					return;
				}
			} catch (e) { /* ignore hold-image drawing errors */ }
			// pick sprite data for currentKey
			const key = this.currentKey || 'stopRight';
			const sprite = this.sprites[key] || {};
			// If lying, draw lie-down image if available
			if (this.isLying) {
				const img = (this.facing === 'left') ? this.lieLeftImg : this.lieRightImg;
				if (img && img.complete) {
					try {
						// scale the lie image to fit player box while preserving aspect
						const iw = img.width || 1;
						const ih = img.height || 1;
						const ratio = iw / ih;
						let drawW = p.width, drawH = p.height;
						if (p.width / p.height > ratio) { drawH = p.height; drawW = Math.round(drawH * ratio); }
						else { drawW = p.width; drawH = Math.round(drawW / ratio); }

						// apply lie-down scale
						const lieScale = 0.7;
						if (this.isLying) {
							drawW = Math.max(1, Math.round(drawW * lieScale));
							drawH = Math.max(1, Math.round(drawH * lieScale));
						}
						const dx = p.x + Math.round((p.width - drawW) / 2) - offsetX;
						// reduce bottom gap to half when lying: move image up so bottom gap = (p.height - drawH)/4
						const dy = this.isLying ? (p.y + Math.round((p.height - drawH) * 3 / 4) - offsetY) : (p.y + Math.round((p.height - drawH) / 2) - offsetY);
						ctx.drawImage(img, 0, 0, iw, ih, dx, dy, drawW, drawH);
						// draw outlines and inner rect as usual
						ctx.save();
						ctx.strokeStyle = 'green'; ctx.lineWidth = 2;
						ctx.strokeRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height);
						if (this.isLying) {
							const innerW = Math.max(1, Math.round(p.width * 2 / 3));
							const innerH = Math.max(1, Math.round(p.height * 1 / 5));
							const innerX = Math.round(p.x - offsetX) + Math.round((p.width - innerW) / 2);
							const innerY = Math.round(p.y - offsetY) + (p.height - innerH) - Math.round(p.height * 0.1);
							ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.strokeRect(innerX, innerY, innerW, innerH);
						} else {
							const innerW = Math.max(1, Math.round(drawW * 2 / 5));
							const innerH = Math.max(1, Math.round(drawH * 4 / 5));
							const innerX = dx + Math.round((drawW - innerW) / 2);
							const innerY = dy + Math.round((drawH - innerH) / 2);
							ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.strokeRect(innerX, innerY, innerW, innerH);
						}
						ctx.restore();
						return;
					} catch (e) { /* fall through to fallback drawing */ }
				}
			}
			// 아틀라스가 있으면 아틀라스 방식으로 그립니다(우선 사용).
			if (sprite.atlas && sprite.atlas.complete) {
				try {
					const atlas = sprite.atlas;
					const frames = sprite.atlasFrames || 1;
					const cols = sprite.atlasCols || 1;
					const frameW = sprite.atlasFrameW || Math.floor(atlas.width / cols);
					const frameH = sprite.atlasFrameH || Math.floor(atlas.height / Math.max(1, Math.floor(atlas.height / frameW)));
					const fps = 33; // 애니메이션 속도를 위한 FPS 값(초당 프레임)
					const frameIndex = Math.floor(Date.now() / (1000 / fps)) % frames;
					const sx = (frameIndex % cols) * frameW;
					const sy = Math.floor(frameIndex / cols) * frameH;
					// 아틀라스에서 잘라낸 프레임을 플레이어 상자 크기에 맞춰서 그립니다.
					// 이때 이미지 비율(가로/세로 비율)을 유지합니다.
					const ratio = frameW / frameH;
					let drawW = p.width, drawH = p.height;
					if (p.width / p.height > ratio) {
						// 플레이어 상자가 프레임보다 더 넓으면 높이를 기준으로 제한
						drawH = p.height;
						drawW = Math.round(drawH * ratio);
					} else {
						// 그렇지 않으면 너비를 기준으로 제한
						drawW = p.width;
						drawH = Math.round(drawW / ratio);
					}
						const dx = p.x + Math.round((p.width - drawW) / 2) - offsetX;
						const dy = this.isLying ? (p.y + Math.round((p.height - drawH) * 3 / 4) - offsetY) : (p.y + Math.round((p.height - drawH) / 2) - offsetY);
						ctx.drawImage(atlas, sx, sy, frameW, frameH, dx, dy, drawW, drawH);
					// 플레이어 전체 상자에 초록색 외곽선을 그립니다(디버그용으로 보임).
					try {
						ctx.save();
						ctx.strokeStyle = 'green';
						ctx.lineWidth = 2;
							ctx.strokeRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height);
						// 내부 충돌 상자(빨간색)를 그림 안에 맞춰서 그립니다.
						if (this.isLying) {
							const innerW = Math.max(1, Math.round(p.width * 4 / 5));
							const innerH = Math.max(1, Math.round(p.height * 1 / 5));
							const innerX = Math.round(p.x - offsetX) + Math.round((p.width - innerW) / 2);
							const innerY = Math.round(p.y - offsetY) + (p.height - innerH) - Math.round(p.height * 0.1);
							ctx.strokeStyle = 'red';
							ctx.lineWidth = 2;
							ctx.strokeRect(innerX, innerY, innerW, innerH);
						} else {
							const innerW = Math.max(1, Math.round(drawW * 2 / 5));
							const innerH = Math.max(1, Math.round(drawH * 4 / 5));
							const innerX = dx + Math.round((drawW - innerW) / 2);
							const innerY = dy + Math.round((drawH - innerH) / 2);
							ctx.strokeStyle = 'red';
							ctx.lineWidth = 2;
							ctx.strokeRect(innerX, innerY, innerW, innerH);
						}
						ctx.restore();
					} catch (e) { /* ignore drawing errors */ }
					return;
				} catch (e) { /* 실패하면 아래의 대체 그리기를 사용합니다 */ }
			}
			// 아틀라스 이미지가 없을 때의 간단한 대체 그리기(파란 사각형)
				ctx.fillStyle = 'blue';
				// if lying, draw a scaled blue rect centered in the player box
				if (this.isLying) {
					const lieScale = 0.7;
					const drawW = Math.max(1, Math.round(p.width * lieScale));
					const drawH = Math.max(1, Math.round(p.height * lieScale));
					const dx = Math.round(p.x + Math.round((p.width - drawW) / 2) - offsetX);
					// reduce bottom gap to half when lying for fallback rect
					const dy = Math.round(p.y + Math.round((p.height - drawH) * 3 / 4) - offsetY);
					ctx.fillRect(dx, dy, drawW, drawH);
				} else {
					ctx.fillRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height);
				}
			// 대체 그리기일 때도 같은 방식으로 외곽선과 내부 충돌 상자를 그립니다.
			try {
				ctx.save();
				ctx.strokeStyle = 'green';
				ctx.lineWidth = 2;
					ctx.strokeRect(Math.round(p.x - offsetX), Math.round(p.y - offsetY), p.width, p.height);
				// (대체) 플레이어 상자 안에 내부 충돌 상자(빨강)를 그립니다.
				if (this.isLying) {
					// fallback inner rect for lying: match collision box (4/5 width, 1/5 height), bottom-aligned
					const innerW = Math.max(1, Math.round(p.width * 4 / 5));
					const innerH = Math.max(1, Math.round(p.height * 1 / 5));
					const innerX = Math.round(p.x - offsetX) + Math.round((p.width - innerW) / 2);
					const innerY = Math.round(p.y - offsetY) + (p.height - innerH) - Math.round(p.height * 0.1);
					ctx.strokeStyle = 'red';
					ctx.lineWidth = 2;
					ctx.strokeRect(innerX, innerY, innerW, innerH);
				} else {
					const innerW = Math.max(1, Math.round(p.width * 2 / 5));
					const innerH = Math.max(1, Math.round(p.height * 4 / 5));
						const innerX = Math.round(p.x - offsetX) + Math.round((p.width - innerW) / 2);
						const innerY = Math.round(p.y - offsetY) + Math.round((p.height - innerH) / 2);
					ctx.strokeStyle = 'red';
					ctx.lineWidth = 2;
					ctx.strokeRect(innerX, innerY, innerW, innerH);
				}
				ctx.restore();
			} catch (e) { /* ignore drawing errors */ }
		}
	};

	window.Stage4Player = Stage4Player;

})();

