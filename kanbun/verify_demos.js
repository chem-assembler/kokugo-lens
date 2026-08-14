/**
 * 録画モードの台本（demos.json）検証スクリプト
 *
 * 台本は座標ではなく「問題ID・字の番号・訓点キー・セレクタ」で書かれているので、
 * texts.json を触ると黙って壊れる。ブラウザを起動せずに、参照先が実在するか・
 * アクションの形が正しいか・**狙いどおりの判定になるか**までを機械で確かめる。
 * （実際に完走するかは tools/record での収録が最終確認）
 *
 * 漢文は kanbun.js が node で読めるので、InfoLens の verify_demos.js より
 * 強い検査ができる ＝ 台本の操作を積み上げて K.grade() に通し、
 * **誤答デモがちゃんと wrong になること**まで見られる。
 *
 * 使い方: node kanbun/verify_demos.js
 */

const fs = require('fs');
const path = require('path');
const K = require('./kanbun.js');

const here = f => path.join(__dirname, f);
const demos = JSON.parse(fs.readFileSync(here('demos.json'), 'utf8'));
const texts = JSON.parse(fs.readFileSync(here('texts.json'), 'utf8'));
const indexHtml = fs.readFileSync(here('index.html'), 'utf8');

// 検査の基準は index.html から読む（表を二重に持たない。パレットを増やしたら検査も追随する）
const MARK_KEYS = new Set([...indexHtml.matchAll(/data-mark="([\w-]+)"/g)].map(m => m[1]));
const MODES = new Set(
  [...indexHtml.matchAll(/<option value="(L\d)"/g)].map(m => m[1]));
const ACTION_TYPES = ['wait', 'cell', 'read', 'mark', 'choice', 'okuri', 'button', 'scroll'];
const MARK_MODES = new Set(['L3', 'L4', 'L6']);

let errors = 0, checks = 0;
const fail = m => { console.log('  NG   ' + m); errors++; };
const ok = m => { console.log('  OK   ' + m); checks++; };

/** index.html に id / クラスが在るか（ざっくりでよい。誤字を止めるのが目的） */
function selectorExists(sel){
  const id = sel.match(/^#([\w-]+)$/);
  if (id) return indexHtml.includes('id="' + id[1] + '"');
  const cls = sel.match(/^\.([\w-]+)$/);
  if (cls) return indexHtml.includes(cls[1]);
  return true;   // 複雑なセレクタは検査しない
}

/** 訓点パレットを押したときの marks の変化（game.js のパレット処理と同じ規則） */
function applyMarkKey(marks, v){
  if (v === 'erase') return [];
  if (v === 're'){
    return marks.some(m => m.re) ? marks.filter(m => !m.re) : marks.concat([{ re: true }]);
  }
  const lv = +v.split('-')[0], n = +v.split('-')[1];
  const had = marks.some(m => m.lv === lv && m.n === n);
  const kept = marks.filter(m => m.re || m.lv !== lv);   // 同じ階層の番号は付け替え
  return had ? kept : kept.concat([{ lv, n }]);
}

console.log('=== demos.json の検証（' + demos.length + ' 本）===\n');

const seen = new Set();

demos.forEach(demo => {
  console.log('[' + demo.id + '] ' + (demo.title || ''));

  if (!demo.id) fail('id が無い');
  if (seen.has(demo.id)) fail('id が重複している: ' + demo.id);
  seen.add(demo.id);
  if (!Array.isArray(demo.steps) || !demo.steps.length){ fail('steps が空'); return; }

  // ---- 開始状態 ----
  const st = demo.state || {};
  const mode = st.mode || 'L1';
  if (!MODES.has(mode)) fail('state.mode が不正: ' + mode);
  const problem = texts.problems.find(p => p.id === st.problem);
  if (!st.problem) fail('state.problem が無い（どの白文を撮るのか台本に書く）');
  else if (!problem) fail('state.problem が texts.json に無い: ' + st.problem);
  else ok('問題 ' + st.problem + '「' + problem.tokens.map(t => t.c).join('') + '」を ' + mode + ' で');
  if (!problem) return;

  const n = problem.tokens.length;
  const marks = problem.tokens.map(() => []);        // L3/L4/L6 の userMarks を追う
  Object.keys(st.marks || {}).forEach(i => {
    const idx = +i;
    if (!(idx >= 0 && idx < n)) fail('state.marks の字番号が範囲外: ' + i);
    else if (!MARK_KEYS.has(st.marks[i])) fail('state.marks の訓点キーが不正: ' + st.marks[i]);
    else marks[idx] = applyMarkKey(marks[idx], st.marks[i]);
  });
  if (Object.keys(st.marks || {}).length && !MARK_MODES.has(mode)){
    fail('state.marks を書いているが ' + mode + ' では訓点を打てない');
  }

  // ---- 各ステップ ----
  let tapPos = 0;          // L1 の「正しく読めた数」（game.js の onCellClick と同じ規則）
  let actionCount = 0;
  let graded = 0;

  demo.steps.forEach((step, si) => {
    const where = 'step' + (si + 1);
    if (!Array.isArray(step.actions)){ fail(where + ': actions が配列でない'); return; }

    step.actions.forEach((a, ai) => {
      actionCount++;
      const at = where + '.action' + (ai + 1) + '(' + a.type + ')';
      if (!ACTION_TYPES.includes(a.type)){ fail(at + ': 未知のアクション'); return; }

      const boundsOk = i => {
        if (i === undefined) { fail(at + ': i が無い'); return false; }
        if (!(i >= 0 && i < n)){ fail(at + ': 字番号が範囲外（0〜' + (n - 1) + '）: ' + i); return false; }
        return true;
      };

      switch (a.type){
        case 'cell':
          if (!boundsOk(a.i)) break;
          if (mode === 'L1' && problem.order[tapPos] === a.i) tapPos++;
          break;
        case 'read': {
          if (mode !== 'L1') fail(at + ': read は L1 用（' + mode + ' では読み順をタップしない）');
          const from = a.from || 0;
          const to = (a.count == null) ? problem.order.length
                                       : from + a.count;
          if (from < 0 || to > problem.order.length){
            fail(at + ': 読み順の範囲外（order は ' + problem.order.length + ' 手）: from=' + from + ' to=' + to);
            break;
          }
          for (let k = from; k < to; k++){
            if (problem.order[tapPos] === problem.order[k]) tapPos++;
          }
          break;
        }
        case 'mark':
          if (!MARK_MODES.has(mode)){ fail(at + ': ' + mode + ' では訓点を打てない'); break; }
          if (!boundsOk(a.i)) break;
          if (!MARK_KEYS.has(a.key)){ fail(at + ': 訓点キーがパレットに無い: ' + a.key); break; }
          marks[a.i] = applyMarkKey(marks[a.i], a.key);
          break;
        case 'okuri':
          if (mode !== 'L4') fail(at + ': okuri は L4 用（' + mode + ' では送り仮名を問わない）');
          if (!boundsOk(a.i)) break;
          if (a.value === undefined) fail(at + ': value が無い');
          break;
        case 'choice':
          if (mode !== 'L2') fail(at + ': choice は L2 用');
          if (!(a.n >= 1 && a.n <= 4)) fail(at + ': n は 1〜4: ' + a.n);
          break;
        case 'button':
        case 'scroll':
          if (!a.selector){ fail(at + ': selector が無い'); break; }
          if (!selectorExists(a.selector)){ fail(at + ': セレクタが index.html に無い: ' + a.selector); break; }
          // 判定ボタンを押す台本は、そこで何が起きてほしいかを expect で宣言する。
          // 誤答デモ（わざと間違えて矢印アニメを見せる回）が「本当に間違いになるか」は
          // これでしか確かめられない
          if (a.type === 'button' && a.selector === '#btn-grade'){
            graded++;
            const r = K.grade(marks, problem);
            const got = (r.status === 'wrong') ? 'wrong' : 'ok';
            if (!a.expect) fail(at + ': #btn-grade には expect（ok / wrong）が要る');
            else if (a.expect !== got){
              fail(at + ': 判定が台本の狙いと違う（expect=' + a.expect + ' / 実際=' + r.status
                + '「' + r.message + '」）');
            } else {
              ok(at + ': 判定は ' + a.expect + '（' + r.status + '）');
            }
          }
          break;
      }
    });
  });

  // ---- 台本ぜんたいの狙い ----
  if (demo.expect && !['ok', 'wrong'].includes(demo.expect)) fail('expect は ok / wrong: ' + demo.expect);
  if (mode === 'L1'){
    if (demo.expect === 'ok'){
      if (tapPos === problem.order.length) ok('読み順 ' + problem.order.length + ' 手を最後までたどる');
      else fail('読み切れていない（' + tapPos + '/' + problem.order.length + ' 手）。'
        + 'read の from / count を見直すこと');
    } else if (demo.expect === 'wrong' && tapPos === problem.order.length){
      fail('expect=wrong だが読み順を最後までたどってしまう');
    }
  } else if (MARK_MODES.has(mode)){
    if (!graded) fail(mode + ' の台本なのに #btn-grade を一度も押していない（判定の画が撮れない）');
    if (demo.expect){
      const r = K.grade(marks, problem);
      const got = (r.status === 'wrong') ? 'wrong' : 'ok';
      if (got === demo.expect) ok('最後の訓点は ' + r.status + '（台本の狙いどおり）');
      else fail('最後の訓点が狙いと違う（expect=' + demo.expect + ' / 実際=' + r.status + '）');
    }
  }

  console.log('       ステップ ' + demo.steps.length + ' / アクション ' + actionCount + '\n');
});

console.log('==============================');
console.log('検査: ' + checks + ' 件成功 / ' + errors + ' 件失敗');
console.log('==============================');
if (errors > 0){
  console.log('台本が問題データとずれている。demos.json を直すこと。');
  process.exit(1);
}
console.log('すべての台本が問題データと整合している。');
