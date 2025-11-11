/*
 stage1.js
 이 스테이지는 보스 전용 스테이지입니다. 일반 몬스터 웨이브는 존재하지 않으며,
 보스 하나만 소환하여 전투를 진행합니다.

 스테이지 모듈 규약(필수 함수):
 - init(game): Game 인스턴스를 받아 초기화합니다.
 - start(): 스테이지가 시작될 때 호출됩니다.
 - stop(): 스테이지가 정리될 때 호출됩니다.
 - onUpdate(dt): 매 프레임 호출되는 훅(필요 시 사용).
 - onBossDefeated(): 보스 처치 시 호출되는 콜백.

 스테이지 파일은 반드시 window.registerStage('stageId', module) 형태로 자신을 등록해야
 Game의 동적 로딩(loadStageScript)과 연동됩니다.
*/
(function(){
	'use strict';

	const module = {
		id: 'stage1',
		game: null,
		// 보스 전용이므로 웨이브 관련 필드는 제거
		timer: 0,
		spawnedBoss: false,

		// init: Game 레퍼런스를 받아 필요한 초기값을 세팅합니다.
		init(game){
			this.game = game;
			this.timer = 0;
			this.spawnedBoss = false;
			this.enemiesToSpawn = 6;
		},

		// start: 스테이지 시작 시 보스를 즉시 소환합니다.
		start(){
			this.timer = 0;
			this.spawnedBoss = false;
			if (!this.spawnedBoss) {
				this.spawnBoss();
				this.spawnedBoss = true;
			}
		},

		// stop: 스테이지가 중단/종료될 때 호출 (정리용)
		stop(){ /* 필요시 정리 코드 추가 */ },

		// onUpdate: 프레임별 업데이트 훅
		// 이 스테이지는 보스 전용이므로 스폰 로직은 필요하지 않습니다.
		// 필요하면 스테이지 타이머나 이벤트 트리거를 여기에 추가하세요.
		onUpdate(dt){
			this.timer += dt;
		},

		// 일반 몬스터 웨이브는 이 스테이지에서 사용하지 않으므로 관련 코드 삭제됨.

	// spawnBoss: 보스(적 보스)를 생성하여 게임에 등록
	spawnBoss(){
				// compute gameplay area width to center boss within it (avoid HUD panel area)
				const panelW = Math.floor(this.game.width * ((this.game && this.game.styles && typeof this.game.styles.panelFraction === 'number') ? this.game.styles.panelFraction : 0.25));
				const gameAreaW = Math.max(100, this.game.width - panelW);
				const boss = {
				x: Math.floor(gameAreaW / 2),
				y: -80,
				// record spawn position so skills can return the boss here after completion
				spawnX: Math.floor(gameAreaW / 2),
				spawnY: -80,
				w: 120,
				h: 80,
				hp: 1000,
				maxHp: 1000,
				vy: 30,
				isBoss: true,
				timer: 0,
					// 페이즈 기반 행동:
						// - mode: 'basic' 또는 'skill' 또는 'return'
						// - 기본 공격과 스킬을 시간으로 제어합니다.
					mode: 'basic',
					phaseTimer: 0,
					basicDuration: 10,
					skillDuration: 7,
					// which skill index will be used when a skill phase starts
					// choose among 0..2 only (remove Skill4)
					currentSkillIndex: Math.floor(Math.random() * 3),
					// return-to-spawn state (used after some skills, e.g. skill2)
					returningToSpawn: false,
					returnTimer: 0,
					returnDur: 1.0,
					returnStartX: 0,
					returnStartY: 0,
					// idle state used to freeze boss after certain skills (e.g., Skill3)
					idleTimer: 0,
					idleDur: 0,
				// update: 보스 AI와 발사 로직 (매 프레임 호출)
				update(dt){
					this.timer += dt;
					// advance to position
					if (this.y < 120) this.y += this.vy * dt;
					else this.timer += dt;
					// HUD 패널 영역을 침범하지 않도록 보스 위치를 클램프
					const panelW_local = Math.floor(this.game.width * ((this.game && this.game.styles && typeof this.game.styles.panelFraction === 'number') ? this.game.styles.panelFraction : 0.25));
					const gameAreaW_local = Math.max(100, this.game.width - panelW_local);
					// common margin used to clamp boss position in several branches
					const margin = 40;
					// return-to-spawn handling: if returning, interpolate back to spawnX/spawnY
					if (this.mode === 'return' || this.returningToSpawn){
						this.returnTimer = (this.returnTimer || 0) + dt;
						const dur = (this.returnDur || 1.0);
						const t = Math.min(1, this.returnTimer / dur);
						const sx = (typeof this.returnStartX === 'number') ? this.returnStartX : this.x;
						const sy = (typeof this.returnStartY === 'number') ? this.returnStartY : this.y;
						this.x = sx + (this.spawnX - sx) * t;
						this.y = sy + (this.spawnY - sy) * t;
						// clamp during return
						const marginReturn = 40;
						this.x = Math.max(marginReturn, Math.min(gameAreaW_local - marginReturn, this.x));
						if (t >= 1){
							this.returningToSpawn = false;
							this.mode = 'basic';
							this._basic_seq = 0;
							this.phaseTimer = 0;
							this.returnTimer = 0;
							this.returnStartX = 0; this.returnStartY = 0;
						}
					}
					// phase timer advance
					this.phaseTimer = (this.phaseTimer || 0) + dt;
					// idle mode: freeze boss (no movement or firing) until idleDur elapses
					if (this.mode === 'idle'){
						this.idleTimer = (this.idleTimer || 0) + dt;
						if (this.idleTimer >= (this.idleDur || 1.5)){
							this.mode = 'basic';
							this._basic_seq = 0;
							this.phaseTimer = 0;
							this.idleTimer = 0;
							this.idleDur = 0;
						}
						// while idle, do nothing further in update (boss frozen)
						return;
					}
					// Behavior depends on current mode
					if (this.mode === 'basic'){
						// regular firing cadence: every 1s while in basic phase
						if (this.timer > 1.0){
							this.timer = 0;
							this.fire('basic');
						}
						// after basicDuration seconds, switch to skill phase
						if (this.phaseTimer >= (this.basicDuration || 10)){
							this.mode = 'skill';
							this.phaseTimer = 0;
							this.skillActive = true;
							// choose a random skill for this skill-phase (0..2 only)
							this.currentSkillIndex = Math.floor(Math.random() * 3);
							// per-skill duration override: skill2 = 3s move + 10s firing = 13s total
							if (this.currentSkillIndex === 1){
								this.skillRemaining = 13.0; // 3s move + 10s fire (Skill2)
							} else if (this.currentSkillIndex === 2) {
								// Skill3: 지속적인 대량 느린 탄막 패턴 — 15초 지속
								this.skillRemaining = 15.0;
							} else {
								this.skillRemaining = this.skillDuration || 7.0;
							}
							this.skillBurstTimer = 0;
							this.skillMovePhase = 0;
							// record start pos for skills that need to move
							this.skillPhaseTimer = 0;
							this.skillStartX = this.x;
							this.skillStartY = this.y;
							// For most skills we may want an immediate burst; for skill2 we'll handle firing inside the skill loop
							if (this.currentSkillIndex !== 1){
								const skillFn = [this._skill1, this._skill2, this._skill3][this.currentSkillIndex];
								if (typeof skillFn === 'function') skillFn.call(this, this.game);
							}
						}
					} else if (this.mode === 'skill'){
						// skill-phase continuous handling (per-skill behavior)
						this.skillPhaseTimer = (this.skillPhaseTimer || 0) + dt;
						this.skillRemaining -= dt;
						this.skillBurstTimer = (this.skillBurstTimer || 0) + dt;
						this.skillMovePhase = (this.skillMovePhase || 0) + dt * 1.2;
						const margin = 40;
						// Skill 2: laser pattern — move to center for 3s, then fire NESW lasers for 10s while slowly rotating
						if (this.currentSkillIndex === 1){
							const moveDur = 3.0;
							const fireDur = 10.0;
							const targetX = Math.floor(gameAreaW_local / 2);
							const targetY = Math.floor(this.game.height / 2);
							// movement phase
							if (this.skillPhaseTimer < moveDur){
								const t = Math.min(1, this.skillPhaseTimer / moveDur);
								this.x = this.skillStartX + (targetX - this.skillStartX) * t;
								this.y = this.skillStartY + (targetY - this.skillStartY) * t;
								// clamp during move
								this.x = Math.max(margin, Math.min(gameAreaW_local - margin, this.x));
							} else {
										// 발사 단계: 레이저 탄막 생성
										const fireElapsed = this.skillPhaseTimer - moveDur;
										// 레이저 각도 오프셋 누적 (회전 속도 점진 증가)
										// 기본 회전속도(base)에서 발사 시간이 경과할수록 최대 2배까지 선형으로 증가
										const baseSpin = this._laserBaseSpin || 0.72;
										const maxFactor = 2.0; // 최대 2배
										const factor = 1 + Math.min(1, (fireElapsed / (fireDur || 10.0)) );
										const spinSpeed = baseSpin * Math.min(maxFactor, factor);
										this._laserBaseSpin = baseSpin;
										this._laserAngleOffset = (this._laserAngleOffset || 0) + dt * spinSpeed;
										// 일정 간격으로 탄막 생성
										if (this.skillBurstTimer >= 0.04){
											this.skillBurstTimer = 0;
											const baseAngles = [0, Math.PI/2, Math.PI, Math.PI*1.5];
											for (let a of baseAngles){
												const angle = a + (this._laserAngleOffset || 0);
												const speed = 350 + Math.random()*40; // 탄속
												const vx = Math.cos(angle) * speed;
												const vy = Math.sin(angle) * speed;
												// 탄막 크기를 2배로 확대
												const b = { x: this.x, y: this.y, r:6, vx: vx, vy: vy, owner:'enemy', update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; if (this.x < -200 || this.x > (this.game? this.game.width:800)+200 || this.y < -200 || this.y > (this.game? this.game.height:600)+200) this.dead = true; }, draw(ctx){ ctx.fillStyle='skyblue'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||6,0,Math.PI*2); ctx.fill(); } };
												b.game = this.game;
												this.game.spawnEnemyBullet(b);
											}
										}
								// keep boss clamped during firing
								this.x = Math.max(margin, Math.min(gameAreaW_local - margin, this.x));
							}
						} else {
							// Generic skill behavior for non-Skill2 patterns
							// Skill3 (index 2) : boss 정지 후 느린 대량 탄막을 15s 동안 초당 8회(0.125s) 생성
							const amp = 30;
							if (this.currentSkillIndex === 2){
								// 보스는 멈춰야 하므로 위치 변경하지 않음
								// 스펙: 한 번에 30~40발을 생성, 초당 5회(0.2s), 15초 동안 발사
								if (!this._skill3_initialized){
									this._skill3_count = 30 + Math.floor(Math.random() * 11); // 30..40
									this._skill3_speed = 60; // 고정 속도 (원하시면 조정 가능)
									this._skill3_rotationOffset = 0;
									this._skill3_rotationStep = 0.12; // 버스트마다 조금씩 회전할 각도(라디안)
									this._skill3_initialized = true;
								}
								// 발사 주기: 0.2s -> 초당 5회
								if (this.skillBurstTimer >= 0.2){
									this.skillBurstTimer = 0;
									// 이번 버스트에서 균등 분포된 각도에 rotationOffset을 더해 생성
									for (let i=0;i<this._skill3_count;i++){
										const angle = (i / this._skill3_count) * Math.PI * 2 + (this._skill3_rotationOffset || 0);
										const speed = this._skill3_speed || 60;
										const vx = Math.cos(angle) * speed;
										const vy = Math.sin(angle) * speed;
										const b = { x: this.x, y: this.y+20, r:3, vx: vx, vy: vy, owner:'enemy', update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > (this.game?this.game.height:600)+200 || this.x < -200 || this.x > (this.game?this.game.width:800)+200) this.dead=true; }, draw(ctx){ ctx.fillStyle='lightblue'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||3,0,Math.PI*2); ctx.fill(); } };
										b.game = this.game;
										this.game.spawnEnemyBullet(b);
									}
									// 다음 버스트는 약간 회전된 각도로 발사
									this._skill3_rotationOffset = (this._skill3_rotationOffset || 0) + (this._skill3_rotationStep || 0.04);
								}
								// clamp during the skill
								this.x = Math.max(margin, Math.min(gameAreaW_local - margin, this.x));
							} else {
								// 기존의 약간 좌우 이동 및 skill1 반복 처리
								this.x += Math.sin(this.skillMovePhase) * (amp * dt * 0.6);
								this.x = Math.max(margin, Math.min(gameAreaW_local - margin, this.x));
								if (this.currentSkillIndex === 0 && this.skillBurstTimer >= 0.25){
									this.skillBurstTimer = 0;
									this._skill1(this.game);
								}
							}
						}
						// end skill-phase: if Skill2 ended, return to spawn first; otherwise resume basic
						if (this.skillRemaining <= 0){
							this.skillActive = false;
							this.skillRemaining = 0;
							// Skill3 정리: 각도 배열 초기화
							if (this.currentSkillIndex === 2){
								this._skill3_initialized = false;
								this._skill3_angles = null;
								this._skill3_count = 0;
								this._skill3_speed = null;
								this._skill3_phase = 0;
								// After Skill3 completes, enter an idle state for 1.5 seconds
								this.mode = 'idle';
								this.idleTimer = 0;
								this.idleDur = 1.5; // seconds to remain inactive
							} else if (this.currentSkillIndex === 1){
								// trigger smooth return-to-spawn before resuming basic mode
								this.mode = 'return';
								this.returningToSpawn = true;
								this.returnTimer = 0;
								this.returnDur = 1.0; // seconds to interpolate back
								this.returnStartX = this.x;
								this.returnStartY = this.y;
							} else {
								this.mode = 'basic';
								this._basic_seq = 0;
								this.phaseTimer = 0;
							}
						}
					}
				},
				// fire selection: type can be 'basic' or 'skill' (ult handled later)
				fire(type){
					const g = this.game || window.Game;
					try{
						if (type === 'skill'){
							// start a skill session: use currentSkillIndex (chosen by skillTimer)
							// Skill session will last for skillDuration seconds and spawn repeated bursts.
							this.skillActive = true;
							this.skillRemaining = this.skillDuration || 7.0; // seconds
							this.skillBurstTimer = 0;
							this.skillMovePhase = 0;
							// immediately trigger one burst of the chosen skill
							const idx = (typeof this.currentSkillIndex === 'number') ? this.currentSkillIndex : Math.floor(Math.random()*3);
							// call the skill once to create initial burst
							const skillFn = [this._skill1, this._skill2, this._skill3][idx];
							if (typeof skillFn === 'function') skillFn.call(this, g);
						} else if (type === 'basic'){
							// basic pattern (default)
							// Only fire basics when in basic mode (suppress during skill phase)
							if (this.mode !== 'basic') return;
							if (typeof this._basic === 'function') this._basic.call(this, g);
							else this._fireAimed.call(this, g);
						} else {
							// fallback to basic
							if (this.mode === 'basic') this._fireAimed.call(this, g);
						}
					}catch(e){
						// fallback: single circular downward shot
						const b = { x: this.x, y: this.y+30, r:4, vx:0, vy:160, owner:'enemy', update(dt){ this.x += (this.vx||0)*dt; this.y += (this.vy||0)*dt; if (this.y > (this.game? this.game.height:600)+20) this.dead=true; }, draw(ctx){ ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r||4, 0, Math.PI*2); ctx.fill(); } };
						b.game = this.game;
						g.spawnEnemyBullet(b);
					}
				},

				// Fan spread: multiple bullets in a fan aimed roughly downward
				_fireFan(g){
					const count = 7;
					const spreadDeg = 90; // degrees total sweep
					const spread = spreadDeg * Math.PI / 180;
					const center = Math.PI/2; // downward
					for (let i=0;i<count;i++){
						const t = count === 1 ? 0.5 : i/(count-1);
						const angle = center - spread/2 + t*spread;
						const speed = 140 + Math.random()*40;
						const vx = Math.cos(angle) * speed;
						const vy = Math.sin(angle) * speed;
						const b = { x: this.x, y: this.y+30, r:4, vx:vx, vy:vy, owner:'enemy', update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > (this.game? this.game.height:600)+40 || this.x < -50 || this.x > (this.game? this.game.width:800)+50) this.dead=true; }, draw(ctx){ ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r||4, 0, Math.PI*2); ctx.fill(); } };
						b.game = this.game;
						g.spawnEnemyBullet(b);
					}
				},



				// Aimed triple: three bullets towards player with small angular offsets
				_fireAimed(g){
					const player = (g && g.player) ? g.player : (this.game && this.game.player) ? this.game.player : null;
					let targetX = (player && typeof player.x === 'number') ? player.x : (g ? (g.width/2) : 0);
					let targetY = (player && typeof player.y === 'number') ? player.y : (g ? (g.height) : 600);
					const dx = targetX - this.x;
					const dy = targetY - (this.y+10);
					const baseAngle = Math.atan2(dy, dx);
					const offsets = [-0.12, 0, 0.12];
					for (let off of offsets){
						const angle = baseAngle + off;
						const speed = 200 + Math.random()*40;
						const vx = Math.cos(angle) * speed;
						const vy = Math.sin(angle) * speed;
						const b = { x: this.x, y: this.y+30, r:4, vx:vx, vy:vy, owner:'enemy', update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > (this.game? this.game.height:600)+40 || this.x < -60 || this.x > (this.game? this.game.width:800)+60) this.dead=true; }, draw(ctx){ ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r||4, 0, Math.PI*2); ctx.fill(); } };
						b.game = this.game;
						g.spawnEnemyBullet(b);
					}
				},

				// Basic pattern (default): repeating sequence A A F A A ...
				_basic(g){
					// sequence: 0:Aimed, 1:Aimed, 2:Fan, 3:Aimed, 4:Aimed
					this._basic_seq = (this._basic_seq || 0);
					const seq = this._basic_seq % 5;
					if (seq === 2) {
						this._fireFan(g);
					} else {
						this._fireAimed(g);
					}
					this._basic_seq++;
				},

				// Skill pattern 1: dense fan (wide and many) — also used as repeated burst during a 7s skill
				_skill1(g){
					const count = 8; // 8 bullets around the boss
					const radiusOffset = 30; // spawn distance from boss center
					const baseAngle = (this.skillMovePhase || 0);
					for (let i=0;i<count;i++){
						const angle = baseAngle + (i / count) * Math.PI * 2;
						const speed = 60 + Math.random()*40; // outward speed
						// spawn slightly offset from boss so they appear around it
						const sx = this.x + Math.cos(angle) * radiusOffset;
						const sy = this.y + Math.sin(angle) * radiusOffset + 10;
						const vx = Math.cos(angle) * speed;
						const vy = Math.sin(angle) * speed;
						const b = { x: sx, y: sy, r:4, vx: vx, vy: vy, owner:'enemy', update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; if(this.y > (this.game?this.game.height:600)+80 || this.x < -200 || this.x > (this.game?this.game.width:800)+200) this.dead=true; }, draw(ctx){ ctx.fillStyle='orange'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||4,0,Math.PI*2); ctx.fill(); } };
						b.game = this.game; g.spawnEnemyBullet(b);
					}
				},

				// Skill pattern 2: two concentric radial rings
				_skill2(g){
					const inner = 8, outer = 16;
					for (let i=0;i<inner;i++){
						const angle = (i/inner)*Math.PI*2; const speed = 120 + Math.random()*40;
						const b = { x:this.x,y:this.y+30,r:4,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:'enemy', update(dt){ this.x+=this.vx*dt; this.y+=this.vy*dt; if(this.y > (this.game?this.game.height:600)+80) this.dead=true; }, draw(ctx){ ctx.fillStyle='cyan'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||4,0,Math.PI*2); ctx.fill(); } };
						b.game=this.game; g.spawnEnemyBullet(b);
					}
					for (let i=0;i<outer;i++){
						const angle = (i/outer)*Math.PI*2; const speed = 200 + Math.random()*40;
						const b = { x:this.x,y:this.y+30,r:5,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:'enemy', update(dt){ this.x+=this.vx*dt; this.y+=this.vy*dt; if(this.y > (this.game?this.game.height:600)+100) this.dead=true; }, draw(ctx){ ctx.fillStyle='magenta'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||5,0,Math.PI*2); ctx.fill(); } };
						b.game=this.game; g.spawnEnemyBullet(b);
					}
				},

				// Skill pattern 3: rapid aimed volley (many aimed shots)
				_skill3(g){
					const player = (g && g.player) ? g.player : null;
					const shots = 9;
					for (let i=0;i<shots;i++){
						const targetX = player?player.x:(g?g.width/2:0);
						const targetY = player?player.y:(g?g.height:600);
						const dx = targetX - this.x; const dy = targetY - (this.y+10);
						const baseAngle = Math.atan2(dy, dx);
						const spread = (i - (shots-1)/2) * 0.06; // small angular spread
						const angle = baseAngle + spread;
						const speed = 220 + Math.random()*60;
						const b = { x:this.x,y:this.y+30,r:3,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:'enemy', update(dt){ this.x+=this.vx*dt; this.y+=this.vy*dt; if(this.y > (this.game?this.game.height:600)+60) this.dead=true; }, draw(ctx){ ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||3,0,Math.PI*2); ctx.fill(); } };
						b.game=this.game; g.spawnEnemyBullet(b);
					}
				},



				// Ultimate patterns placeholders (not invoked yet) — left for future HP-based triggers
				_ult1(g){ console.log('ULTIMATE 1 (placeholder)'); /* complex pattern to be added later */ },
				_ult2(g){ console.log('ULTIMATE 2 (placeholder)'); /* complex pattern to be added later */ },
				// draw: 보스 표시 (가로로 긴 타원 + 텍스트)
				draw(ctx){
					ctx.fillStyle = 'purple';
					// horizontal ellipse: rx=80, ry=40
					ctx.beginPath();
					if (typeof ctx.ellipse === 'function') ctx.ellipse(this.x, this.y, 80, 40, 0, 0, Math.PI*2);
					else ctx.arc(this.x, this.y, 80, 0, Math.PI*2); // fallback (circle)
					ctx.fill();
					ctx.fillStyle='white';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText('BOSS', this.x, this.y);
				}
			};
			boss.game = this.game;
			this.game.spawnBoss(boss);
		},

		// 보스 처치 시 호출되는 훅: 현재는 Game.endStage를 호출
		onBossDefeated(){
			if (this.game && typeof this.game.endStage === 'function') this.game.endStage();
		}
	};

	// 스테이지 등록: Game이 미리 등록함수를 제공하지 않았을 경우 대체 등록 루틴도 마련
	if (typeof window.registerStage === 'function') window.registerStage(module.id, module);
	else window.registerStage = window.registerStage || function(id, mod){ window._pendingStages = window._pendingStages || {}; window._pendingStages[id] = mod; };

})();

