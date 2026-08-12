'use strict';
/*
 * uncollected.js — 台帳のうち、まだ texts.json に入っていない行を出す。
 *   使い方: node kanbun/tools/uncollected.js [minqing|catalog|both]
 *           （既定は catalog。minqing は 2026-08-12 に消化しきった）
 *
 * 旧字体は台帳 §8.1 の対応表を**台帳から読み取って**適用する（手打ちの表を持たない）。
 * 手打ちの表を持っていた時期に、対応表の抜けで**収録済みの行を「未収録」と誤って数えた**
 * 事故が実際に起きた。出どころを台帳に一本化してそれを防ぐ。
 *
 * それでも対応表に抜けがあれば誤判定が出る。抜けは次の要領で機械的に洗える:
 *   収録済みの白文と台帳の行を突き合わせ、「同じ長さで1〜3字だけ違う組」を報告させる。
 *   実際にこの方法で 15字（戸・倹・却・撃・満・仮・経・読・断・弁・観・県・蓋・鋳・乗）を
 *   見つけて台帳 §8.1 に補った。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'kanbun', 'texts.json'), 'utf8'));

// ---- 台帳 §8.1 の対応表を読み取る -----------------------------------------
const cat = fs.readFileSync(path.join(ROOT, 'docs', 'material-catalog.md'), 'utf8');
const block = cat.slice(cat.indexOf('### 8.1'));
const f1 = block.indexOf('```');
const fence = block.slice(f1 + 3, block.indexOf('```', f1 + 3));
const MAP = {};
for (const m of fence.matchAll(/([一-鿿](?:\/[一-鿿])*)→([一-鿿])/g)){
  m[1].split('/').forEach(old => { MAP[old] = m[2]; });
}
const norm = s => s.replace(/[，、。？！\s]/g, '')
                   .replace(/./g, c => MAP[c] || c);

const have = new Map(texts.problems.map(p => [p.tokens.map(t => t.c).join(''), p.id]));
const which = process.argv[2] || 'catalog';
const FILES = {
  minqing: ['docs/material-minqing.md'],
  catalog: ['docs/material-catalog.md'],
  both:    ['docs/material-minqing.md', 'docs/material-catalog.md']
}[which];
if (!FILES){ console.error('minqing / catalog / both のいずれか'); process.exit(2); }

console.log('対応表: ' + Object.keys(MAP).length + ' 字（台帳 §8.1 から読み取り）');
let total = 0, done = 0;
for (const f of FILES){
  const rows = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')
    .filter(l => /^\| [A-Z]+-[0-9]/.test(l) && l.split('|').length > 6);
  const un = [];
  rows.forEach(r => {
    const c = r.split('|').map(x => x.trim());
    const h = norm(c[2]);
    total++;
    // 完全一致か、収録済みの白文がこの行の一部（＝切り出して収録済み）なら済とみなす
    const hit = have.has(h) ? have.get(h)
      : [...have.keys()].find(k => k.length >= 4 && h.indexOf(k) >= 0);
    if (hit) done++;
    else un.push('  ' + c[1] + ' | ' + c[2] + ' | ' + c[3] + '字 | ' + (c[5] || ''));
  });
  console.log('\n=== ' + f + ': 全' + rows.length + '行 / 未収録 ' + un.length + '行 ===');
  un.forEach(x => console.log(x));
}
console.log('\n台帳 ' + total + ' 行中 ' + done + ' 行が収録済み（切り出しを含む）');
