'use strict';
/* node kanbun/jisho-check.js。不備は終了コード1。
 * 読みは平仮名、複数候補は「・」、再読は「〜」。置き字のyomiだけ空欄可。
 * 歴史的表記は既存yomi-rulesの既知の取り違えを検出する。
 * 任意の字音・訓の正しさや語義までは機械で保証しない。
 */
const {HATARAKI} = require('./present.js');
const {SPELLINGS, YOMI_ONLY} = require('./yomi-rules.js');
function checkDictionary(dictionary, texts) {
  const errors = [];
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  if (!object(dictionary)) return ['辞書は字をキーにしたオブジェクトにする'];
  const entries = Object.entries(dictionary);
  if (entries.length !== 150) errors.push('150字が必要（現在' + entries.length + '字）');
  const problems = new Map(texts.problems.map(p => [p.id, p]));
  const counts = new Map();
  for (const p of texts.problems) for (const t of p.tokens) counts.set(t.c, (counts.get(t.c) || 0) + 1);
  let previous = Infinity;
  function reading(c, value, where, compound) {
    const pattern = compound ? /^[ぁ-ゖ]+(?:[・〜][ぁ-ゖ]+)*$/u : /^[ぁ-ゖ]+$/u;
    if (typeof value !== 'string' || !pattern.test(value)) {
      errors.push(c + ' ' + where + ': 読みは平仮名で記す'); return;
    }
    for (const part of value.split(/[・〜]/u)) {
      const wrong = (SPELLINGS[c] || []).find(([from]) => part === from ||
        (where !== 'on' && !YOMI_ONLY.has(c) && part.startsWith(from)));
      if (wrong) errors.push(c + ' ' + where + ': 「' + part + '」は歴史的表記「' + wrong[1] + '」と照合');
      if (({得:['える'], 過:['すぎる'], 入:['いれる']}[c] || []).includes(part))
        errors.push(c + ' ' + where + ': 現代語の形「' + part + '」を古典の終止形にする');
    }
  }
  for (const [c, e] of entries) {
    if (Array.from(c).length !== 1 || !counts.has(c)) errors.push(c + ': 収録問題にある一字をキーにする');
    const count = counts.get(c) || 0;
    if (count > previous) errors.push(c + ': 字の並びが出現回数順でない');
    previous = count;
    if (!object(e)) {errors.push(c + ': 項目の形が不正'); continue;}
    for (const field of ['on', 'kun']) {
      if (!Array.isArray(e[field]) || (field === 'on' && !e[field].length)) errors.push(c + ': ' + field + 'を配列で記す');
      else e[field].forEach(r => reading(c, r, field, false));
    }
    if (typeof e.chui !== 'string') errors.push(c + ': chuiは文字列にする');
    if (!Array.isArray(e.uses) || !e.uses.length) {errors.push(c + ': usesが空か配列でない'); continue;}
    e.uses.forEach((u, n) => {
      const at = c + ' uses[' + n + ']';
      if (!object(u)) {errors.push(at + ': 用法の形が不正'); return;}
      for (const field of ['label','imi']) if (typeof u[field] !== 'string' || !u[field].trim()) errors.push(at + ': ' + field + 'が空');
      if (!HATARAKI.includes(u.hataraki)) errors.push(at + ': hatarakiが10種にない');
      if (u.hataraki === '置き字') {
        if (u.yomi !== '') errors.push(at + ': 置き字のyomiは空文字にする');
      } else reading(c, u.yomi, 'uses[' + n + '].yomi', true);
      if (!Array.isArray(u.rei)) {errors.push(at + ': reiは配列にする'); return;}
      const seen = new Set();
      for (const r of u.rei) {
        if (!object(r)) {errors.push(at + ': 用例の形が不正'); continue;}
        const p = problems.get(r.id);
        if (!p) errors.push(at + ': 問題idがない ' + r.id);
        else if (!Number.isInteger(r.i) || r.i < 0 || r.i >= p.tokens.length || p.tokens[r.i].c !== c)
          errors.push(at + ': 用例の位置と字が一致しない ' + r.id + ':' + r.i);
        else if (u.hataraki === '置き字' && p.tokens[r.i].role !== 'placed')
          errors.push(at + ': 置き字の用例が読む字になっている');
        const key = JSON.stringify([r.id, r.i]);
        if (seen.has(key)) errors.push(at + ': 用例の重複 ' + key);
        seen.add(key);
      }
    });
  }
  return errors;
}
module.exports = {checkDictionary};
if (require.main === module) {
  try {
    const fs = require('fs'), path = require('path');
    const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    const errors = checkDictionary(read('jisho.json'), read('texts.json'));
    errors.forEach(e => console.log('NG ' + e));
    console.log(errors.length ? errors.length + '件の不備があります' : '150字・不備なし');
    process.exitCode = errors.length ? 1 : 0;
  } catch(e) {console.error('NG ' + e.message); process.exitCode = 1;}
}
