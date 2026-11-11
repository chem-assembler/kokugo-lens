'use strict';
/*
 * imi-check.js — 字ごとの「この文での意味」（imi.json）の台帳検査。`node kanbun/imi-check.js` で走る。
 *
 * imi.json は { 問題id: [字ごとの意味, ...] }。字の働きの練習と、先生の提示モードの
 * 重要漢字の説明が読む。問題データ（texts.json）の字を直したら、ここが食い違いを知らせる。
 */
const fs = require('fs');
const path = require('path');

const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
const imi = JSON.parse(fs.readFileSync(path.join(__dirname, 'imi.json'), 'utf8'));
const errs = [];
const ids = new Set(texts.problems.map(p => p.id));

for (const p of texts.problems){
  const v = imi[p.id];
  if (!Array.isArray(v)){ errs.push(p.id + ': 意味が無い'); continue; }
  if (v.length !== p.tokens.length){
    errs.push(p.id + ': 意味 ' + v.length + ' 個と字 ' + p.tokens.length + ' 字の数が合わない');
    continue;
  }
  p.tokens.forEach((t, i) => {
    const s = v[i];
    if (typeof s !== 'string' || !s.trim()){ errs.push(p.id + ' [' + i + ']「' + t.c + '」: 意味が空'); return; }
    // 置き字だけが「（読まない）」で始まる
    const placed = t.role === 'placed', silent = s.startsWith('（読まない）');
    if (placed && !silent) errs.push(p.id + ' [' + i + ']「' + t.c + '」: 置き字なのに「（読まない）」が無い');
    if (!placed && silent) errs.push(p.id + ' [' + i + ']「' + t.c + '」: 読む字に「（読まない）」が付いている');
  });
}
for (const id of Object.keys(imi)) if (!ids.has(id)) errs.push(id + ': 問題データに無い id');

for (const e of errs) console.log('NG ' + e);
console.log('----');
console.log(errs.length ? errs.length + ' 件の不備があります' : '不備なし');
process.exit(errs.length ? 1 : 0);
