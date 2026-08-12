'use strict';
/*
 * lane-merge.js — 各レーンの問題データをまとめ、収録前にもう一度まとめて検査する。
 *   使い方: node kanbun/tools/lane-merge.js <レーンのディレクトリ>            … 検査だけ
 *           node kanbun/tools/lane-merge.js <レーンのディレクトリ> --write   … 収録する
 *
 * ディレクトリ直下の `lane-*.json` をすべて拾う。**済んだレーンは別のディレクトリへ
 * 退避すること**（そうしないと「すでに収録済み」として検査に落ちる。これは事故ではなく
 * 設計どおりの動作で、実際に第2サイクルで第1サイクルのファイルを拾って止めてくれた）。
 *
 * ## なぜレーン単位の検査と別に要るか
 * `lane-verify.js` は「そのレーンの中」しか見ない。ここでは**レーンをまたぐ事故**を見る。
 *   ・id の衝突（別のレーンが同じ id を使った）
 *   ・同じ白文の二重収録（別のレーンが同じ文を選んだ）
 * あわせて、提出後に直された可能性があるので二重帳簿をもう一度当てる。
 */
const fs = require('fs');
const path = require('path');
const KANBUN = path.join(__dirname, '..');
const K = require(path.join(KANBUN, 'kanbun.js'));
const textsPath = path.join(KANBUN, 'texts.json');
const texts = JSON.parse(fs.readFileSync(textsPath, 'utf8'));

const dir = process.argv[2];
const write = process.argv.indexOf('--write') >= 0;
if (!dir){ console.error('使い方: node kanbun/tools/lane-merge.js <レーンのディレクトリ> [--write]'); process.exit(2); }

const files = fs.readdirSync(dir).filter(f => /^lane-.*\.json$/.test(f)).sort();
if (!files.length){ console.error('レーンの成果が %s にありません', dir); process.exit(2); }

const errs = [];
const E = m => errs.push(m);
const all = [];
const haku = p => p.tokens.map(t => t.c).join('');
const existingIds = new Set(texts.problems.map(p => p.id));
const existingHaku = new Map(texts.problems.map(p => [haku(p), p.id]));

files.forEach(f => {
  const list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log('  ' + f + ': ' + list.length + ' 問');
  list.forEach(p => all.push(Object.assign({ _lane: f }, p)));
});

const seenId = new Map();
const seenHaku = new Map();
all.forEach(p => {
  const at = p.id + '(' + p._lane + ')';
  if (existingIds.has(p.id)) E(at + ': texts.json に同じ id がある');
  if (seenId.has(p.id)) E(at + ': ' + seenId.get(p.id) + ' と id が衝突');
  seenId.set(p.id, p._lane);

  const h = haku(p);
  if (existingHaku.has(h)) E(at + ': 白文「' + h + '」は既に ' + existingHaku.get(h) + ' で収録済み');
  if (seenHaku.has(h)) E(at + ': 白文「' + h + '」が ' + seenHaku.get(h) + ' と重複');
  seenHaku.set(h, p.id);

  const derived = K.readOrder(p.tokens);
  if (JSON.stringify(derived) !== JSON.stringify(p.order)) E(at + ': 読み順が order と違う');
  const kd = K.toKakikudashi(p.tokens, p.order);
  if (kd !== p.kakikudashi) E(at + ': 書き下しが違う（生成「' + kd + '」）');
  if (/[ァ-ヶ]/.test(p.kakikudashi)) E(at + ': 書き下しにカタカナが残っている');
  if (!p.meaning || !String(p.meaning).trim()) E(at + ': meaning が空');
  if (p.acceptable === undefined) p.acceptable = [];
});

console.log('合計 ' + all.length + ' 問');
all.forEach(p => {
  let kd = '';
  try { kd = K.toKakikudashi(p.tokens, p.order); } catch (e){ kd = '(生成失敗)'; }
  console.log('  ' + p.id.padEnd(22) + haku(p).padEnd(20) + ' → ' + kd +
              '   [' + (p.kuho || []).join(',') + '] ' + p.source.work);
});

if (errs.length){
  errs.forEach(m => console.error('NG ' + m));
  console.error(errs.length + ' 件の不備があります');
  process.exit(1);
}
console.log('合流の検査: 不備なし');

if (write){
  all.forEach(p => { delete p._lane; texts.problems.push(p); });
  fs.writeFileSync(textsPath, JSON.stringify(texts, null, 2) + '\n', 'utf8');
  console.log('texts.json に収録した（全 ' + texts.problems.length + ' 問）');
} else {
  console.log('（--write を付けると収録します）');
}
