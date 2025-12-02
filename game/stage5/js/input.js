/*
  input.js

  이 파일은 키보드 입력을 받아서 게임에 전달하는 역할을 합니다.
  중학생도 이해하기 쉽도록 자세히 설명한 주석이 아래에 있습니다.

  핵심 개념:
  - 실제 물리 키(예: 화살표, 스페이스, Z, X)를 코드로 감지합니다.
  - 감지한 키를 게임에서 쓰기 쉬운 "토큰"으로 바꿉니다. (예: 'KeyZ' -> 'Z')
  - 콜백(listener)를 등록해두면 키가 눌릴 때마다 그 콜백을 호출합니다.
*/

(function () {
  'use strict';

  // InputHandler 클래스는 키 입력을 관리합니다.
  // - new InputHandler()로 만들고, onPress(cb)를 써서 입력 콜백을 등록합니다.
  // - 콜백은 { key: '<토큰>', time: <밀리초 타임스탬프> } 형태의 객체를 받습니다.
  class InputHandler {
    constructor() {
      // 등록된 콜백들을 담는 배열입니다. 여러 군데에서 입력을 들을 수 있습니다.
      this.listeners = [];

      // 실제 키보드의 `code` 값을 게임에서 쓰기 쉬운 키 이름으로 바꿉니다.
      // `code`는 키보드의 물리적 위치를 나타내므로, 키보드 배치(한글/영어 등)에 상관없이 같은 키를 가리킵니다.
      // 예: KeyZ는 항상 Z키의 물리적 위치를 가리킵니다.
      // 이 맵에는 게임에서 사용하는 키들만 넣어두었습니다.
      this.keyMap = {
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        Space: 'SPACE',
        KeyZ: 'Z',
        KeyX: 'X'
      };

      // this._onKey의 this 바인딩을 고정합니다. 이벤트 리스너로 넘길 때 필요합니다.
      this._onKey = this._onKey.bind(this);

      // 실제로 키보드 이벤트를 듣습니다.
      // 옵션 { passive: false }는 e.preventDefault()를 사용하려고 설정한 것입니다.
      // 예를 들어 스페이스바가 눌리면 페이지가 아래로 스크롤되는 동작을 막고 싶을 때 필요합니다.
      window.addEventListener('keydown', this._onKey, { passive: false });
    }

    // 실제 키가 눌렸을 때 호출되는 내부 함수입니다.
    // e는 브라우저가 전달하는 키 이벤트 객체입니다.
    _onKey(e) {
      // e.code는 키보드의 물리적 키를 문자열로 줍니다. (예: 'ArrowLeft', 'KeyZ')
      const code = e.code || '';

      // 일부 브라우저에서는 스페이스를 'Spacebar'라고 전달하기도 합니다.
      // 그래서 둘 다 'Space'로 통일합니다.
      const normalizedCode = (code === 'Space' || code === 'Spacebar') ? 'Space' : code;

      // 만약 우리가 관심 있는 키라면(맵에 정의되어 있다면)
      if (normalizedCode in this.keyMap) {
        // 게임에서 쓸 문자열로 변환합니다. 예: 'KeyZ' -> 'Z'
        const mapped = this.keyMap[normalizedCode];

        // 성능 타이밍을 사용해 정확한 입력 시각을 기록합니다.
        // performance.now()는 페이지가 로드된 후부터의 밀리초 시간(소수점 포함)을 줍니다.
        // 이 시간을 노트의 목표 시간과 비교해서 판정합니다.
        const ts = performance.now();

        // 등록된 모든 콜백을 호출합니다. 콜백에는 키 이름과 시간 정보가 전달됩니다.
        // 예: cb({ key: 'Z', time: 31234.123 })
        this.listeners.forEach(cb => cb({ key: mapped, time: ts }));

        // 전역적으로 키 입력을 알리기 위한 커스텀 이벤트도 발생시킵니다.
        // 다른 시스템(예: 공격 처리)에서 전역 이벤트를 구독할 수 있게 합니다.
        try { window.dispatchEvent(new CustomEvent('game:key', { detail: { key: mapped, time: ts } })); } catch (e) { /* ignore */ }

        // 브라우저의 기본 동작을 막습니다. 예를 들어 스페이스로 인해 페이지가 아래로 스크롤되는 것을 막습니다.
        if (e.preventDefault) e.preventDefault();
      }
    }

    // 외부에서 키 입력 콜백을 등록할 때 사용하는 함수입니다.
    // cb는 위에서 설명한 형태의 객체를 받는 함수여야 합니다.
    // 사용 예:
    //   const ih = new InputHandler();
    //   ih.onPress(({key, time}) => { console.log(key, time); });
    onPress(cb) {
      this.listeners.push(cb);
    }
  }

  // 전역에 InputHandler 클래스를 노출합니다. 다른 코드에서 `new window.InputHandler()`로 사용할 수 있습니다.
  window.InputHandler = InputHandler;
})();
