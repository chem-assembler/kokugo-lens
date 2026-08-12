'use strict';
/*
 * lane-verify.js — 起草した問題データを、収録前に機械検査する。
 *   使い方: node kanbun/tools/lane-verify.js <問題データのJSON>
 *
 * ## 使い方の全体像（問題を並列で量産するときの型）
 *
 * 2026-08-12 に4レーン並列で 62問（78→140問）を積んだときのやり方。
 *   1. レーン（作業者・サブエージェント）には**リポジトリを触らせない**。
 *      スクラッチパッドの自分のファイルにだけ問題データの配列を書かせる
 *   2. **提出前にこのスクリプトを自分で通させる**。「不備なし」が出るまで直させる
 *      ＝二重帳簿の検査をレーンの内側に持たせる。合流時に落ちるものが無くなる
 *   3. 合流は `lane-merge.js`。レーン単独では見えない事故
 *      （id の衝突・同じ白文の二重収録）はそちらで見る
 *
 * ## 検査する内容
 *   1. 必須フィールド（id / source / tokens / order / kakikudashi / kuho / meaning）
 *   2. id が texts.json の既存と重複しない・ファイル内でも重複しない
 *   3. **訓点から導いた読み順（readOrder）が order と一致する** ★二重帳簿の要
 *   4. **トークンから生成した書き下し（toKakikudashi）が kakikudashi と一致する** ★
 *   5. 置き字（role:'placed'）は order に現れない
 *   6. order が読む字をすべて1回ずつ（再読文字は2回）含む
 *   7. kuho のタグが定義済みのカテゴリ集合に入っている
 *   8. 書き下しにカタカナが残っていない（送り仮名の書き忘れの検出）
 *   9. difficulty が計算できる
 *
 * 不備が1件でもあれば exit 1。
 */
const fs = require('fs');
const path = require('path');
const KANBUN = path.join(__dirname, '..');
const K = require(path.join(KANBUN, 'kanbun.js'));
const texts = JSON.parse(fs.readFileSync(path.join(KANBUN, 'texts.json'), 'utf8'));
const CATS = ['hitei', 'shieki', 'ukemi', 'gimon', 'hango', 'hikaku',
              'sentaku', 'katei', 'gentei', 'yokuyo', 'eitan'];

const file = process.argv[2];
if (!file){ console.error('使い方: node kanbun/tools/lane-verify.js <問題データのJSON>'); process.exit(2); }
const list = JSON.parse(fs.readFileSync(file, 'utf8'));
const existing = new Set(texts.problems.map(p => p.id));
const seen = new Set();
const errs = [];
const E = (id, m) => errs.push(id + ': ' + m);

(Array.isArray(list) ? list : [list]).forEach((p, idx) => {
  const id = (p && p.id) || '[' + idx + ']';
  for (const f of ['id', 'source', 'tokens', 'order', 'kakikudashi', 'kuho', 'meaning']){
    if (p[f] === undefined) E(id, f + ' が無い');
  }
  if (!p.source || !p.source.work) E(id, 'source.work が無い');
  if (existing.has(p.id)) E(id, 'texts.json に同じ id が既にある');
  if (seen.has(p.id)) E(id, 'ファイル内で id が重複');
  seen.add(p.id);
  if (!Array.isArray(p.tokens) || !p.tokens.length){ E(id, 'tokens が空'); return; }
  if (!Array.isArray(p.order)){ E(id, 'order が配列でない'); return; }

  let derived;
  try { derived = K.readOrder(p.tokens); }
  catch (e){ E(id, 'readOrder が例外: ' + e.message); return; }
  if (JSON.stringify(derived) !== JSON.stringify(p.order)){
    E(id, '訓点からの読み順 ' + JSON.stringify(derived) + ' が order ' + JSON.stringify(p.order) + ' と違う');
  }

  let kd;
  try { kd = K.toKakikudashi(p.tokens, p.order); }
  catch (e){ E(id, 'toKakikudashi が例外: ' + e.message); return; }
  if (kd !== p.kakikudashi){
    E(id, '生成された書き下し「' + kd + '」が登録「' + p.kakikudashi + '」と違う');
  }

  p.tokens.forEach((t, i) => {
    if (t.role === 'placed' && p.order.indexOf(i) >= 0) E(id, '置き字「' + t.c + '」が order にいる');
  });
  const want = p.tokens.reduce((s, t) => s + (t.role === 'placed' ? 0 : (t.reread ? 2 : 1)), 0);
  if (p.order.length !== want) E(id, '読む回数が合わない（order ' + p.order.length + ' / 期待 ' + want + '）');

  (Array.isArray(p.kuho) ? p.kuho : []).forEach(g => {
    if (CATS.indexOf(g) < 0) E(id, '知らない句法タグ「' + g + '」');
  });
  if (/[ァ-ヶ]/.test(p.kakikudashi)) E(id, '書き下しにカタカナが残っている');
  // 上下点は一二点をまたぐときの印。内側が空のまま外側を使うのは訓点として誤りだが、
  // 読み順は正しく出るので上の二重帳簿を素通りする（shiki-taiha-shingun が実際にそうだった）
  const lvs = new Set();
  p.tokens.forEach(t => (t.mark || []).forEach(m => { if (typeof m.lv === 'number') lvs.add(m.lv); }));
  [...lvs].forEach(lv => {
    if (lv > 1 && !lvs.has(lv - 1)) E(id, 'lv' + lv + ' を使っているのに内側の lv' + (lv - 1) + ' が無い');
  });
  if (p.note && (p.note.match(/\*\*/g) || []).length % 2 !== 0){
    E(id, 'note の ** が対になっていない（強調は **…** で閉じる）');
  }
  try { K.difficulty(p); } catch (e){ E(id, 'difficulty が例外: ' + e.message); }
});

const arr = Array.isArray(list) ? list : [list];
console.log(path.basename(file) + ': ' + arr.length + ' 問');
arr.forEach(p => {
  if (!p.tokens || !p.order) return;
  try {
    console.log('  ' + p.id + ' | ' + p.tokens.map(t => t.c).join('') + ' → ' + K.toKakikudashi(p.tokens, p.order));
  } catch (e){ /* 上で報告済み */ }
});
if (errs.length){
  errs.forEach(m => console.error('NG ' + m));
  console.error(errs.length + ' 件の不備があります');
  process.exit(1);
}
console.log('不備なし');
