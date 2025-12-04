(function(){
  'use strict';

  // CircularBuffer: 고정 길이 원형 버퍼(큐)
  // - 이 구조는 최신 N개의 입력만 보관하려고 만들었습니다.
  // - 새 항목을 push하면 아직 빈 공간이 있으면 뒤에 추가하고,
  //   꽉 차 있으면 가장 오래된 항목을 덮어씁니다.
  // - 내부 상태: buf(배열), start(가장 오래된 항목 인덱스), count(저장된 개수)
  class CircularBuffer {
    constructor(capacity){
      // capacity는 정수로 최소 1 이상으로 보정합니다.
      this.capacity = Math.max(1, capacity | 0);
      this.buf = new Array(this.capacity);
      this.start = 0; // 가장 오래된 항목의 인덱스
      this.count = 0; // 현재 저장된 항목 수
    }

    // push(item): 항목 추가
    // - 빈 공간이 있으면 뒤에 추가(count 증가)
    // - 꽉 차 있으면 가장 오래된 항목을 덮어쓰고 start를 한 칸 앞으로 이동
    push(item){
      if(this.count < this.capacity){
        const idx = (this.start + this.count) % this.capacity;
        this.buf[idx] = item;
        this.count++;
      } else {
        // 꽉 찬 상태: oldest(이전 start)를 덮어쓰고 start를 이동
        this.buf[this.start] = item;
        this.start = (this.start + 1) % this.capacity;
      }
    }

    // popFront(): 가장 오래된 항목을 꺼내서 반환
    // - 비어있으면 null을 반환
    popFront(){
      if(this.count === 0) return null;
      const item = this.buf[this.start];
      this.buf[this.start] = undefined;
      this.start = (this.start + 1) % this.capacity;
      this.count--;
      return item;
    }

    // popBack(): 가장 최신 항목을 꺼내서 반환
    popBack(){
      if(this.count === 0) return null;
      const idx = (this.start + this.count - 1) % this.capacity;
      const item = this.buf[idx];
      this.buf[idx] = undefined;
      this.count--;
      return item;
    }

    // peekFront(): 가장 오래된 항목을 삭제하지 않고 반환
    peekFront(){
      if(this.count === 0) return null;
      return this.buf[this.start];
    }

    // toArray(): 내부 내용을 오래된 것부터 최신 순서의 배열로 복사해서 반환
    // - 디버깅 또는 그리기 용도로 쓰기 편합니다.
    toArray(){
      const out = [];
      for(let i=0;i<this.count;i++){
        const idx = (this.start + i) % this.capacity;
        out.push(this.buf[idx]);
      }
      return out;
    }

    // clear(): 버퍼 초기화
    clear(){
      this.buf = new Array(this.capacity);
      this.start = 0; this.count = 0;
    }
  }


  // CommandManager: 키 시퀀스를 검사해서 등록된 '커맨드'를 인식하는 관리자
  // - options.windowMs: 입력을 유지할 시간 범위 (밀리초)
  // - options.capacity: 버퍼 크기(예: 4)
  // 사용 예)
  //   const cm = new CommandManager({ windowMs: 1200, capacity: 4 });
  //   cm.register('attack', ['Z','Z','Z','X'], () => { ... });
  class CommandManager {
    constructor(options){
      options = options || {};
      // windowMs는 얼마나 오래 입력을 유효로 할지(ms). 기본값은 4000ms
      this.windowMs = options.windowMs || 4000; // 입력 시퀀스 윈도우
      this.capacity = options.capacity || 4; // 최근 N개만 유지
      this.overwriteOnFull = !!options.overwriteOnFull; // true면 가득 찼을 때 가장 오래된 항목을 덮어씀
      this.buffer = new CircularBuffer(this.capacity); // { key, t } 항목을 저장
      this.commands = []; // 등록된 명령 목록: { name, seq, callback }
    }

    // register(name, seq, callback): 새 커맨드를 등록합니다.
    // - name: 문자열 (예: 'attack')
    // - seq: ['Z','Z','Z','X'] 형태의 키 시퀀스
    // - callback: 명령이 인식되었을 때 호출되는 함수
    register(name, seq, callback){
      this.commands.push({ name: name, seq: seq.slice(), callback });
    }

    // push(key): 외부에서 키 입력이 들어올 때 호출합니다.
    // - key는 단순 문자열이거나 { key, t, hit } 같은 객체일 수 있습니다.
    // - 내부에서는 현재 시각(performance.now())을 t로 저장하고 버퍼에 추가합니다.
    // 외부에서 키 입력 발생 시 호출
    // 동작 방식(특별 규칙):
    // - 버퍼에 아직 빈 자리가 있으면 새 입력을 추가합니다.
    // - 버퍼가 이미 가득 찼다면 overwriteOnFull 옵션이 true일 때 가장 오래된 항목을 덮어씁니다.
    //   false일 때는 새 입력을 무시하고 현재 버퍼 상태로만 매칭을 시도합니다.
    push(key){
      const now = performance.now();
      // 입력 객체 정규화: 문자열이 들어오면 {key, t}, 객체가 들어오면 그 값을 이용
      let entry = null;
      if (typeof key === 'string') entry = { key: key, t: now };
      else if (key && typeof key === 'object') {
        entry = Object.assign({}, key);
        entry.key = (key.key != null) ? key.key : (key.code != null ? key.code : key.value);
        entry.t = key.t || now;
        if (typeof key.hit !== 'undefined' && typeof entry.hit === 'undefined') entry.hit = key.hit;
      } else entry = { key: key, t: now };

      if (!entry) entry = { key: '', t: now };
      if (entry.key == null) entry.key = '';
      entry.key = String(entry.key);

      const hasSpace = this.buffer.count < this.capacity;
      if (hasSpace) {
        this.buffer.push(entry);
      } else if (this.overwriteOnFull) {
        this.buffer.push(entry);
      } else {
        // 버퍼가 가득 찼지만 덮어쓰기를 허용하지 않으면 현재 상태로 유지합니다.
      }

      // 오래된 항목 제거 및 매칭 시도
      this._expireOld(now);
      this._tryMatch();
    }
    

    // _expireOld(now): 버퍼 앞쪽(오래된 항목)부터 windowMs보다 오래된 입력을 제거
    // - 이렇게 하면 너무 오래된 입력은 명령 검사용 버퍼에서 제외됩니다.
    _expireOld(now){
      const windowMs = this.windowMs;
      while(this.buffer.count > 0){
        const oldest = this.buffer.peekFront();
        if(!oldest) break;
        if((now - oldest.t) > windowMs){
          this.buffer.popFront();
        } else break;
      }
    }

    // _tryMatch(): 버퍼 끝(최신) 쪽을 기준으로 등록된 명령들과 비교합니다.
    // 동작 규칙 요약:
    // - 버퍼가 가득 찼을 때(capacity 만큼 차 있으면),
    //   길이가 capacity인 명령들만 전체 비교를 하고, 일치하면 버퍼를 완전히 비웁니다.
    // - 버퍼가 가득 차지 않은 상태에서는, 각 명령의 길이(seq.length)를
    //   버퍼의 꼬리 부분(tail)과 비교하여 일치하면 그만큼의 최신 항목만 제거합니다.
    _tryMatch(){
      if(this.buffer.count === 0) return;
      const arr = this.buffer.toArray();
      const keys = arr.map(x => x.key);

      // 1) 버퍼가 가득 찼을 때: 전체 길이 명령(full-length)만 검사
      if(this.buffer.count === this.capacity){
        for(const cmd of this.commands){
          const seq = cmd.seq;
          if(seq.length !== this.capacity) continue; // 전체 길이 명령만 처리
          let match = true;
          for(let i=0;i<this.capacity;i++){
            if(keys[i] !== seq[i]){ match = false; break; }
          }
          if(match){
            const matchedEntries = arr.slice(-seq.length);
            try{ cmd.callback({ name: cmd.name, seq: seq.slice(), buffer: arr.slice(), entries: matchedEntries }); } catch(e){ console.error('command callback error', e); }
            // 전체 일치하면 버퍼를 초기화
            this.buffer.clear();
            return;
          }
        }
        // 가득 찼지만 어느 명령과도 일치하지 않으면 버퍼를 초기화합니다.
        // (사용자 요청: 4개가 모두 채워졌는데 명령이 없으면 초기화)
        this.buffer.clear();
        return;
      }

      // 2) 버퍼가 완전히 차지 않았을 때: 꼬리 부분과 비교하여 매칭되는 경우 최신 항목만 제거
      for(const cmd of this.commands){
        const seq = cmd.seq;
        if(seq.length > keys.length) continue; // 비교할 수 없으면 건너뜀
        const tail = keys.slice(-seq.length);
        let ok = true;
        for(let i=0;i<seq.length;i++){
          if(tail[i] !== seq[i]){ ok = false; break; }
        }
        if(ok){
          const start = Math.max(0, arr.length - seq.length);
          const matchedEntries = arr.slice(start);
          try{ cmd.callback({ name: cmd.name, seq: seq.slice(), buffer: arr.slice(), entries: matchedEntries }); } catch(e){ console.error('command callback error', e); }
          // 일치하면 최신 항목(seq.length)만큼 제거(popBack)
          for(let i=0;i<seq.length;i++) this.buffer.popBack();
          break;
        }
      }
    }

    // reset(): 외부에서 강제로 버퍼를 비울 때 사용
    reset(){ this.buffer.clear(); }

    // 현재 버퍼에 저장된 항목들을 오래된 순서대로 가져옵니다.
    getBufferEntries(){ return this.buffer.toArray(); }
  }

  // 편의 팩토리: 기본 명령을 등록한 CommandManager를 생성해 반환
  // - 게임에서 바로 쓰기 편하도록 'attack'과 'defend' 예제를 등록해둡니다.
  function createDefaultCommandManager(){
    const cm = new CommandManager({ windowMs: 4000, capacity: 4 });
    // 공격: Z Z Z X
    cm.register('attack', ['Z','Z','Z','X'], ({name})=>{
      // 외부로 알리기 위해 CustomEvent를 발생시킵니다.
      window.dispatchEvent(new CustomEvent('game:command', { detail: { command: 'attack' } }));
    });
    // 방어: X X Z X
    cm.register('defend', ['X','X','Z','X'], ({name})=>{
      window.dispatchEvent(new CustomEvent('game:command', { detail: { command: 'defend' } }));
    });
    //
        cm.register('defend', ['Z','Z','X','X'], ({name})=>{
      window.dispatchEvent(new CustomEvent('game:command', { detail: { command: 'advance' } }));
    });
    return cm;
  }

  // 전역에 노출해서 다른 스크립트에서 사용하게 합니다.
  window.CommandManager = CommandManager;
  window.createDefaultCommandManager = createDefaultCommandManager;

})();
