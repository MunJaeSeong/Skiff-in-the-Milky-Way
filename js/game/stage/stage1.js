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
				hp: 30,
				vy: 30,
				isBoss: true,
				timer: 0,
				// update: 지정 위치까지 내려온 뒤 주기적으로 발사
				update(dt){
					this.timer += dt;
					if (this.y < 120) this.y += this.vy * dt;
					else this.timer += dt;
					if (this.timer > 1.0){ this.timer = 0; this.fire(); }
				},
				// fire: 보스의 단순 공격 (아래로 탄환 발사)
				fire(){
					const g = this.game || window.Game;
					const b = {
						x: this.x,
						y: this.y + 30,
						w:6,
						h:12,
						vy: 160,
						owner: 'enemy',
						update(dt){ this.y += this.vy * dt; if (this.y > (this.game? this.game.height:600)+20) this.dead=true; },
						draw(ctx){ ctx.fillStyle='white'; ctx.fillRect(this.x-3,this.y-6,6,12); }
					};
					b.game = this.game;
					g.spawnEnemyBullet(b);
				},
				// draw: 보스 표시 (사각형 + 텍스트)
				draw(ctx){ ctx.fillStyle='purple'; ctx.fillRect(this.x - 60, this.y - 40, 120, 80); ctx.fillStyle='white'; ctx.fillText('BOSS', this.x-18, this.y); }
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

