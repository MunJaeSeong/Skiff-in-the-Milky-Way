/*
  input.js

  이 파일은 키보드에서 누른 키를 받아서 게임에 알리는 역할을 합니다.
  쉬운 설명:
  - 브라우저가 보내는 키 이벤트에서 '어떤 키인지'와 '언제 눌렀는지'를 정리합니다.
  - 게임 쪽에서 쓰기 편한 형태로 바꿔서 콜백으로 알려줍니다.
  - 예: 'KeyZ'를 'Z'로 바꿔서 전달합니다.
*/

(function () {
  'use strict';

  // InputHandler 클래스: 키 입력을 관리합니다.
  // 사용법 요약:
  //   const ih = new InputHandler();
  //   ih.onPress(({key, time}) => { /* 키 처리 */ });
  class InputHandler {
    constructor() {
      // 여기 등록된 함수들(리스너들)을 키가 눌릴 때마다 호출합니다.
      this.listeners = [];

      // 실제 물리 키 코드(e.code)를 우리가 사용할 토큰으로 바꾸는 표입니다.
      // 예: 'KeyZ' => 'Z', 'ArrowLeft' => 'LEFT'
      this.keyMap = {
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        Space: 'SPACE',
        KeyZ: 'Z',
        KeyX: 'X'
      };

      // 이벤트 핸들러의 this가 바뀌지 않도록 고정합니다.
      this._onKey = this._onKey.bind(this);

      // 실제로 키보드의 'keydown' 이벤트를 듣습니다.
      // passive: false로 해서 필요하면 preventDefault()를 사용할 수 있게 합니다.
      window.addEventListener('keydown', this._onKey, { passive: false });
    }

    // _onKey(e): 키가 눌렸을 때 내부적으로 호출되는 함수입니다.
    _onKey(e) {
      // e.code는 키의 물리적 위치를 나타내는 문자열(예: 'KeyZ')
      const code = e.code || '';

      // 일부 브라우저에서는 스페이스 이름이 다를 수 있어서 정리합니다.
      const normalizedCode = (code === 'Space' || code === 'Spacebar') ? 'Space' : code;

      // 우리가 정의한 키이면 처리합니다.
      if (normalizedCode in this.keyMap) {
        const mapped = this.keyMap[normalizedCode]; // 게임에서 쓸 이름

        // 언제 눌렀는지 정확한 시간(밀리초)을 기록합니다.
        const ts = performance.now();

        // 등록된 모든 콜백을 호출합니다.
        // 콜백은 { key: 'Z', time: 12345.67 } 형태의 객체를 받습니다.
        this.listeners.forEach(cb => cb({ key: mapped, time: ts }));

        // 전역 이벤트도 발생시켜 다른 코드들이 들을 수 있게 합니다.
        try { window.dispatchEvent(new CustomEvent('game:key', { detail: { key: mapped, time: ts } })); } catch (e) { /* ignore */ }

        // 스페이스 등으로 페이지 스크롤이 일어나지 않게 기본 동작을 막습니다.
        if (e.preventDefault) e.preventDefault();
      }
    }

    // onPress(cb): 외부에서 입력 콜백을 등록할 때 사용합니다.
    // cb는 {key, time} 객체를 받는 함수여야 합니다.
    onPress(cb) {
      this.listeners.push(cb);
    }
  }

  // 다른 파일에서 사용하도록 전역에 노출합니다.
  window.InputHandler = InputHandler;
})();
