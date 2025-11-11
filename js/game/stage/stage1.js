/*
 stage1.js
 간단한 예제 스테이지 모듈
 - 웨이브 적을 몇 번 소환한 뒤 보스를 소환하여 전투를 진행하는 예시입니다.
 - 스테이지 모듈은 아래의 규약을 따릅니다:
	 - init(game): Game 인스턴스를 전달받아 초기화합니다.
	 - start(): 스테이지가 실제로 시작될 때 호출됩니다.
	 - stop(): 스테이지가 종료될 때 리소스 정리용으로 호출됩니다.
	 - onUpdate(dt): 매 프레임(혹은 루프의 업데이트 단계)에서 호출되는 훅으로, 스폰/AI 타이밍을 처리합니다.
	 - onBossDefeated(): 보스가 처치되었을 때 호출되는 콜백(게임 종료 등 연결처리를 여기에 둡니다).

 스테이지 파일은 반드시 window.registerStage('stageId', module) 형태로 자신을 등록해야
 Game의 동적 로딩(loadStageScript)과 연동됩니다.
*/
(function(){
	'use strict';

	const module = {
		id: 'stage1',
		game: null,
		timer: 0,
		spawnInterval: 1.0, // 웨이브 스폰 간격 (초)
		enemiesToSpawn: 6,  // 전체 웨이브 수
		spawnedBoss: false,

		// init: Game 레퍼런스를 받아 필요한 초기값을 세팅합니다.
		init(game){
			this.game = game;
			this.timer = 0;
			this.spawnedBoss = false;
			this.enemiesToSpawn = 6;
		},

		// start: 스테이지가 시작될 때 필요한 초기화 작업을 수행
		start(){
			this.timer = 0;
			this.spawnedBoss = false;
		},

		// stop: 스테이지가 중단/종료될 때 호출 (정리용)
		stop(){ /* 필요시 정리 코드 추가 */ },

		// onUpdate: 매 프레임 호출되어 스폰 타이밍과 보스 소환 조건을 검사
		onUpdate(dt){
			this.timer += dt;
			if (this.enemiesToSpawn > 0 && this.timer >= this.spawnInterval){
				this.timer = 0;
				this.spawnEnemyWave();
				this.enemiesToSpawn -= 1;
			}

			// 모든 웨이브가 소환되고 화면에 적이 하나도 없을 때 보스 소환
			if (!this.spawnedBoss && this.enemiesToSpawn <= 0 && this.game.enemies.length === 0){
				this.spawnBoss();
				this.spawnedBoss = true;
			}
		},

		// spawnEnemyWave: 단일 적을 소환하는 간단한 예제
		spawnEnemyWave(){
			// 화면 너비에 맞춰 x 위치를 랜덤으로 결정
			const x = 40 + Math.random() * (this.game.width - 80);
			const enemy = {
				x: x,
				y: -20,
				w: 28,
				h: 28,
				hp: 3,
				// 단순 이동 로직: 아래로 이동, 화면 아래로 나가면 dead 표시
				vy: 60 + Math.random()*60,
				update(dt){ this.y += this.vy * dt; if (this.y > this.game.height + 50) this.dead = true; },
				// 그리기: 간단한 원으로 표시
				draw(ctx){ ctx.fillStyle='orange'; ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI*2); ctx.fill(); }
			};
			// game 레퍼런스를 연결해 필요 시 내부에서 참조 가능하게 함
			enemy.game = this.game;
			this.game.spawnEnemy(enemy);
		},

		// spawnBoss: 보스를 생성하여 game.spawnBoss로 등록
		spawnBoss(){
				const boss = {
				x: this.game.width/2,
				y: -80,
				w: 120,
				h: 80,
				hp: 1000,
				maxHp: 1000,
				vy: 30,
				isBoss: true,
				timer: 0,
				// update: 지정 위치까지 내려온 뒤 주기적으로 발사
				update(dt){
					this.timer += dt;
					// advance to position
					if (this.y < 120) this.y += this.vy * dt;
					else this.timer += dt;
					// skill timer (fires a skill pattern every skillInterval seconds)
					this.skillTimer = (this.skillTimer || 0) + dt;
					// regular firing cadence: every 1s
					if (this.timer > 1.0){
						this.timer = 0;
						// if it's time for a skill, fire a skill pattern
						if ((this.skillTimer || 0) >= (this.skillInterval || 30)){
							this.skillTimer = 0;
							this.fire('skill');
						} else {
							this.fire('basic');
						}
					}
				},
				// fire selection: type can be 'basic' or 'skill' (ult handled later)
				fire(type){
					const g = this.game || window.Game;
					try{
						if (type === 'skill'){
							// pick a random skill pattern from the skill list
							const skills = [this._skill1, this._skill2, this._skill3, this._skill4];
							const idx = Math.floor(Math.random() * skills.length);
							skills[idx].call(this, g);
						} else if (type === 'basic'){
							// basic pattern (default)
							if (typeof this._basic === 'function') this._basic.call(this, g);
							else this._fireAimed.call(this, g);
						} else {
							// fallback to basic
							this._fireAimed.call(this, g);
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

				// Radial ring: bullets in a circle (360 deg)
				_fireRadial(g){
					const count = 12;
					for (let i=0;i<count;i++){
						const angle = (i / count) * Math.PI * 2;
						const speed = 100 + Math.random()*60;
						const vx = Math.cos(angle) * speed;
						const vy = Math.sin(angle) * speed;
						const b = { x: this.x, y: this.y+30, r:4, vx:vx, vy:vy, owner:'enemy', update(dt){ this.x += this.vx * dt; this.y += this.vy * dt; if (this.y > (this.game? this.game.height:600)+60 || this.x < -80 || this.x > (this.game? this.game.width:800)+80) this.dead=true; }, draw(ctx){ ctx.fillStyle='pink'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r||4, 0, Math.PI*2); ctx.fill(); } };
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

				// Basic pattern (default): reuse aimed triple
				_basic(g){ this._fireAimed(g); },

				// Skill pattern 1: dense fan (wide and many)
				_skill1(g){
					const count = 11;
					const spreadDeg = 120; const spread = spreadDeg * Math.PI / 180; const center = Math.PI/2;
					for (let i=0;i<count;i++){
						const t = count===1?0.5:i/(count-1);
						const angle = center - spread/2 + t*spread;
						const speed = 160 + Math.random()*60;
						const vx = Math.cos(angle)*speed, vy = Math.sin(angle)*speed;
						const b = { x:this.x, y:this.y+30, r:4, vx:vx, vy:vy, owner:'enemy', update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; if(this.y > (this.game?this.game.height:600)+60) this.dead=true; }, draw(ctx){ ctx.fillStyle='orange'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||4,0,Math.PI*2); ctx.fill(); } };
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

				// Skill pattern 4: sweeping wide fan (delayed wide sweep)
				_skill4(g){
					const count = 9; const spreadDeg = 140; const spread = spreadDeg*Math.PI/180; const center=Math.PI/2;
					for (let i=0;i<count;i++){
						const t = count===1?0.5:i/(count-1);
						const angle = center - spread/2 + t*spread;
						const speed = 140 + Math.random()*30;
						const b = { x:this.x,y:this.y+30,r:4,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:'enemy', update(dt){ this.x+=this.vx*dt; this.y+=this.vy*dt; if(this.y > (this.game?this.game.height:600)+60) this.dead=true; }, draw(ctx){ ctx.fillStyle='lightgreen'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r||4,0,Math.PI*2); ctx.fill(); } };
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

