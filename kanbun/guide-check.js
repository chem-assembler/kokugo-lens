'use strict';
/*
 * guide-check.js — 志望校案内データ（universities.json）の検査。`node kanbun/guide-check.js`
 *
 * このページは**入試の事実を学習者に見せる**ものなので、data の不備は
 * 「間違った受験情報を配る」ことに直結する。kuho-check.js / qa/check.js と同じ方針で機械検査する。
 */
const fs = require('fs');
const path = require('path');

const base = __dirname;
const d = JSON.parse(fs.readFileSync(path.join(base, 'universities.json'), 'utf8'));
const errs = [];
const warn = [];

// 遷移先が実在するファイルか（リンク切れを配らない）
const LINK_FILE = {
  L1: 'index.html', L2: 'index.html', L3: 'index.html', L6: 'index.html',
  K: 'kudashi.html', kuho: 'kuho.html', qa: '../qa/index.html'
};
// 訓点モードのセレクタに実在する値か
const modeSelect = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const uiModes = (modeSelect.match(/<option value="(L\d)"/g) || []).map(s => s.slice(15, -1));

if (!d.modes || !Object.keys(d.modes).length) errs.push('modes が空');
for (const [key, m] of Object.entries(d.modes || {})){
  if (!m.name) errs.push('modes.' + key + ': name がない');
  const f = LINK_FILE[key];
  if (!f){ errs.push('modes.' + key + ': 遷移先が guide.js の LINK に無い'); continue; }
  if (!fs.existsSync(path.join(base, f))) errs.push('modes.' + key + ': 遷移先 ' + f + ' が存在しない');
  if (/^L\d$/.test(key) && uiModes.indexOf(key) < 0){
    errs.push('modes.' + key + ': index.html のモード選択に無い（' + uiModes.join(',') + '）');
  }
}

const ids = new Set();
let withKanbun = 0;
for (const u of d.universities || []){
  const at = u.id || '(id なし)';
  for (const k of ['id', 'name', 'group', 'why']){
    if (!u[k]) errs.push(at + ': ' + k + ' がない');
  }
  if (ids.has(u.id)) errs.push('id が重複: ' + u.id);
  ids.add(u.id);

  if (u.hasKanbun === false){
    if (!Array.isArray(u.list) || !u.list.length) errs.push(at + ': hasKanbun=false なのに list がない');
    for (const x of (u.list || [])){
      if (!x.name || !x.detail) errs.push(at + ': list の項目に name/detail がない');
    }
    continue;
  }
  withKanbun++;
  if (!Array.isArray(u.best) || !u.best.length){
    errs.push(at + ': best（効くモード）がない');
  } else {
    for (const m of u.best){
      if (!d.modes[m]) errs.push(at + ': best の「' + m + '」が modes に無い');
    }
    if (new Set(u.best).size !== u.best.length) errs.push(at + ': best に重複');
  }
  // 出題実績を語る項目は、根拠となる調査範囲があるか
  if ((u.genre || u.trend) && !u.years && u.group !== '私立大'){
    warn.push(at + ': genre/trend があるのに years（調査範囲）が無い');
  }
  // 強調記法が閉じているか（guide.js が ** を <strong> に変える）
  for (const [k, v] of Object.entries(u)){
    if (typeof v !== 'string') continue;
    const n = (v.match(/\*\*/g) || []).length;
    if (n % 2) errs.push(at + '.' + k + ': ** が閉じていない');
  }
}

console.log('志望校案内データの検査');
console.log('  収録 ' + (d.universities || []).length + ' 件（漢文あり ' + withKanbun + ' 件）');
const byGroup = {};
for (const u of d.universities || []) byGroup[u.group] = (byGroup[u.group] || 0) + 1;
for (const [g, n] of Object.entries(byGroup)) console.log('    ' + g + ': ' + n + ' 件');

console.log('----');
for (const w of warn) console.log('warn: ' + w);
if (errs.length){
  for (const e of errs) console.log('NG: ' + e);
  console.log(errs.length + ' 件の不備');
  process.exit(1);
}
console.log('不備なし');
