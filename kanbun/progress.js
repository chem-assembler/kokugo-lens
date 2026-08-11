'use strict';
/*
 * progress.js — 学習履歴（訓点モード L1/L2/L3 と書き下し練習で共有する）
 *
 * chem の /qa/ が localStorage に進捗を持つのと同じ考え方だが、こちらは
 * 「どの問題を、どのモードでクリアしたか」だけを持つ軽い作り。
 * ライトナー箱や出題順の制御はしない（訓点モードは問題を自分で選ぶ画面なので、
 * 必要なのは「どこまでやったか」が見えることと、次の未クリアへ飛べること）。
 *
 * DOM にも localStorage にも依存しないで動く（Node の回帰テストから直接叩けるようにするため）。
 * 保存先が無い環境ではメモリ上だけで動く。
 */
const Progress = (() => {
  const KEY = 'slz-koku-kanbun-v1';
  const MODES = ['L1', 'L2', 'L3', 'K'];   // K = 書き下し練習（カード並べ替え）
  const MODE_NAME = { L1: 'L1 タップ', L2: 'L2 4択', L3: 'L3 訓点', K: '書き下し' };

  let mem = null;   // localStorage が使えないときの受け皿

  function store(){
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) { /* file:// やプライベートモードで落ちることがある */ }
    return null;
  }
  function load(){
    const s = store();
    if (!s) return (mem = mem || {});
    try { return JSON.parse(s.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(data){
    const s = store();
    if (!s) { mem = data; return; }
    try { s.setItem(KEY, JSON.stringify(data)); } catch (e) { mem = data; }
  }

  function get(id){
    const d = load();
    return d[id] || { L1: 0, L2: 0, L3: 0, K: 0, last: 0 };
  }
  const isClear = (id, mode) => (get(id)[mode] || 0) > 0;

  // クリアした回数を数える。now は呼び出し側から渡す（テストを決定的にするため）
  function markClear(id, mode, now){
    if (MODES.indexOf(mode) < 0) throw new Error('未知のモード: ' + mode);
    const d = load();
    const r = d[id] || { L1: 0, L2: 0, L3: 0, K: 0, last: 0 };
    r[mode] = (r[mode] || 0) + 1;
    r.last = now || 0;
    d[id] = r;
    save(d);
    return r;
  }

  // 1問がどこまで進んだか。'none' / 'some' / 'all'
  function stateOf(id){
    const r = get(id);
    const n = MODES.filter(m => (r[m] || 0) > 0).length;
    return n === 0 ? 'none' : (n === MODES.length ? 'all' : 'some');
  }

  // 問題一覧に対する集計
  function summary(problems){
    const ids = problems.map(p => p.id);
    const byMode = {};
    for (const m of MODES) byMode[m] = ids.filter(id => isClear(id, m)).length;
    return {
      total: ids.length,
      touched: ids.filter(id => stateOf(id) !== 'none').length,
      complete: ids.filter(id => stateOf(id) === 'all').length,
      byMode
    };
  }

  // 指定モードでまだクリアしていない最初の問題の位置（現在位置の次から探して一周する）
  function nextUnclear(problems, mode, fromIdx){
    const n = problems.length;
    if (!n) return -1;
    const start = ((fromIdx || 0) + 1) % n;
    for (let k = 0; k < n; k++){
      const i = (start + k) % n;
      if (!isClear(problems[i].id, mode)) return i;
    }
    return -1;   // 全部クリア済み
  }

  function reset(){ save({}); mem = {}; }

  return { KEY, MODES, MODE_NAME, get, isClear, markClear, stateOf, summary, nextUnclear, reset };
})();

if (typeof module !== 'undefined') module.exports = Progress;
if (typeof window !== 'undefined') window.Progress = Progress;   // const は window に乗らない
