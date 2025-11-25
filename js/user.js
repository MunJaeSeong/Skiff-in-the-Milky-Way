/*
  파일: js/user.js
  설명: 로컬스토리지에 저장되는 유저 정보를 관리하는 모듈
    - CRUD (create/read/update/delete) API
    - 소유 캐릭터 관리, 선택된 캐릭터, 게임 진행 정보, 설정, 재화 관리
    - 변경시 `userchange` 커스텀 이벤트를 디스패치
    사용 예:
      window.User.get() // 전체 데이터 조회
      window.User.unlockCharacter('noa')
      window.User.setSetting('language','en')
      window.User.recordStageResult('stage1',{cleared:true,time:12345})

  저장 키: 'skiff_user_v1'
*/
(function(){
  'use strict';

  const STORAGE_KEY = 'skiff_user_v1';
  const DEFAULTS = {
    version: 1,
    ownedCharacters: { rea: true },
    selectedCharacter: 'rea',
    settings: {
      soundEnabled: true,
      musicVolume: 0.8,
      voiceVolume: 0.8,
      language: 'ko'
    },
    // gameProgress: { [stageId]: { cleared: bool, bestTime: ms, lastTime: ms, bestScore: number } }
    gameProgress: {},
    // currency example (expandable)
    currency: { coins: 0 }
  };

  // safe clone
  function clone(obj){ try{ return JSON.parse(JSON.stringify(obj)); }catch(e){ return obj; } }

  function readRaw(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }

  function writeRaw(obj){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); return true; }catch(e){ return false; }
  }

  function mergeDefaults(data){
    const out = clone(DEFAULTS);
    if (!data || typeof data !== 'object') return out;
    // shallow merge top-level keys
    Object.keys(data).forEach(k => {
      if (k === 'ownedCharacters' || k === 'gameProgress' || k === 'settings' || k === 'currency'){
        out[k] = Object.assign({}, out[k] || {}, data[k]);
      } else {
        out[k] = data[k];
      }
    });
    return out;
  }

  function read(){
    const raw = readRaw();
    if (!raw) return clone(DEFAULTS);
    return mergeDefaults(raw);
  }

  function save(newData){
    const payload = mergeDefaults(newData);
    payload.version = DEFAULTS.version;
    const ok = writeRaw(payload);
    if (ok) dispatchChange('all', clone(payload));
    return ok;
  }

  function update(partial){
    if (!partial || typeof partial !== 'object') return false;
    const cur = read();
    // shallow merge known keys
    Object.keys(partial).forEach(k => {
      if (k === 'ownedCharacters' || k === 'gameProgress' || k === 'settings' || k === 'currency'){
        cur[k] = Object.assign({}, cur[k] || {}, partial[k]);
      } else {
        cur[k] = partial[k];
      }
    });
    return save(cur);
  }

  function dispatchChange(key, value){
    try{ document.dispatchEvent(new CustomEvent('userchange', { detail: { key: key, value: value } })); }catch(e){}
  }

  // Path helper (dot path)
  function getPath(obj, path){
    if (!path) return obj;
    const parts = path.split('.');
    let cur = obj;
    for (let p of parts){ if (!cur) return undefined; cur = cur[p]; }
    return cur;
  }

  function setPath(obj, path, value){
    const parts = path.split('.');
    let cur = obj;
    for (let i=0;i<parts.length;i++){
      const p = parts[i];
      if (i === parts.length - 1){ cur[p] = value; return; }
      if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
  }

  // Public API implementation
  const API = {
    // get all or key (dot path)
    get(key){
      const data = read();
      if (!key) return clone(data);
      return clone(getPath(data, key));
    },

    // set entire data object (overwrites)
    set(data){ return save(data); },

    // update partial data (shallow merge)
    update(partial){ return update(partial); },

    // clear all user data (resets to defaults)
    clear(){ const ok = writeRaw(clone(DEFAULTS)); if (ok) dispatchChange('all', clone(DEFAULTS)); return ok; },

    // settings helpers
    getSetting(key){ const s = read().settings; if (!key) return clone(s); return clone(getPath(s, key)); },
    setSetting(key, value){ const all = read(); setPath(all, `settings.${key}`, value); const ok = save(all); if (ok) dispatchChange(`settings.${key}`, value); try{ document.dispatchEvent(new CustomEvent('settingschange')); }catch(e){} return ok; },

    // character helpers
    unlockCharacter(id){ if (!id) return false; const all = read(); all.ownedCharacters = Object.assign({}, all.ownedCharacters || {}, { [id]: true }); const ok = save(all); if (ok) dispatchChange(`ownedCharacters.${id}`, true); return ok; },
    lockCharacter(id){ if (!id) return false; const all = read(); if (all.ownedCharacters) delete all.ownedCharacters[id]; const ok = save(all); if (ok) dispatchChange(`ownedCharacters.${id}`, false); return ok; },
    isCharacterOwned(id){ const all = read(); return !!(all.ownedCharacters && all.ownedCharacters[id]); },
    getOwnedCharacters(){ return clone(read().ownedCharacters || {}); },
    setSelectedCharacter(id){ const all = read(); if (id && all.ownedCharacters && all.ownedCharacters[id]){ all.selectedCharacter = id; const ok = save(all); if (ok) dispatchChange('selectedCharacter', id); return ok; } return false; },

    // game progress
    getStageInfo(stageId){ const all = read(); return clone(all.gameProgress[stageId] || null); },
    recordStageResult(stageId, result){
      if (!stageId || typeof result !== 'object') return false;
      const all = read();
      const prev = all.gameProgress[stageId] || {};
      const next = Object.assign({}, prev, result);
      // keep bestTime as minimum positive
      if (typeof result.time === 'number'){
        if (typeof prev.bestTime !== 'number' || result.time < prev.bestTime) next.bestTime = result.time;
        next.lastTime = result.time;
      }
      if (typeof result.cleared === 'boolean') next.cleared = result.cleared;
      if (typeof result.score === 'number') next.bestScore = (typeof prev.bestScore === 'number') ? Math.max(prev.bestScore, result.score) : result.score;
      all.gameProgress = Object.assign({}, all.gameProgress || {}, { [stageId]: next });
      const ok = save(all);
      if (ok) dispatchChange(`gameProgress.${stageId}`, clone(next));
      return ok;
    },
    resetStage(stageId){ const all = read(); if (stageId) { delete all.gameProgress[stageId]; } else { all.gameProgress = {}; } const ok = save(all); if (ok) dispatchChange('gameProgress', clone(all.gameProgress)); return ok; },

    // currency
    getCurrency(key){ const all = read(); if (!key) return clone(all.currency || {}); return all.currency ? all.currency[key] || 0 : 0; },
    setCurrency(key, amount){ if (!key || typeof amount !== 'number') return false; const all = read(); all.currency = Object.assign({}, all.currency || {}, { [key]: amount }); const ok = save(all); if (ok) dispatchChange(`currency.${key}`, amount); return ok; },
    changeCurrency(key, delta){ if (!key || typeof delta !== 'number') return false; const all = read(); const cur = (all.currency && typeof all.currency[key] === 'number') ? all.currency[key] : 0; return this.setCurrency(key, cur + delta); },

    // import/export
    exportJSON(){ return JSON.stringify(read()); },
    importJSON(jsonStr){ try{ const parsed = JSON.parse(jsonStr); return save(parsed); }catch(e){ return false; } },

    // low level raw access (for advanced usage)
    _rawRead: readRaw,
    _rawWrite: writeRaw
  };

  // expose globally
  window.User = window.User || API;

  // ensure initialization exists in storage
  (function init(){
    const cur = readRaw();
    if (!cur) writeRaw(clone(DEFAULTS));
  })();

})();
