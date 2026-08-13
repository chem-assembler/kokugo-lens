'use strict';
/*
 * check.js — 一問一答（漢文）の台帳検査。`node qa/check.js` で走る。
 *
 * chem の /qa/ は tests.js（68K）で同じことをしているが、こちらは台帳が小さいので
 * 必要な検査だけを持つ独立スクリプトにした。kanbun/kuho-check.js と同じ方針。
 *
 * app.js が実際に読むフィールドだけを必須とし、不備があれば exit 1。
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'questions.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const errs = [];
const warn = [];

// ---- units ----
if (!Array.isArray(d.units) || !d.units.length) errs.push('units が空');
const unitIds = new Set();
for (const u of d.units || []){
  for (const k of ['id', 'name', 'summary']){
    if (!u[k]) errs.push('unit ' + (u.id || '?') + ': ' + k + ' がない');
  }
  if (unitIds.has(u.id)) errs.push('unit の id が重複: ' + u.id);
  unitIds.add(u.id);
}

// ---- patterns ----
const codes = new Set();
const DIFFS = [1, 2, 3, 4];   // app.js の DIFF_NAMES に対応
for (const p of d.patterns || []){
  const at = 'pattern ' + (p.code || '?');
  for (const k of ['code', 'unit', 'group', 'knowledge']){
    if (!p[k]) errs.push(at + ': ' + k + ' がない');
  }
  if (codes.has(p.code)) errs.push('code が重複: ' + p.code);
  codes.add(p.code);
  if (!unitIds.has(p.unit)) errs.push(at + ': unit「' + p.unit + '」が units にない');
  if (!DIFFS.includes(p.difficulty)) errs.push(at + ': difficulty が 1〜4 でない（' + p.difficulty + '）');
  if (!Array.isArray(p.tags) || !p.tags.length) warn.push(at + ': tags が空');

  if (!Array.isArray(p.variants) || !p.variants.length){
    errs.push(at + ': variants がない');
    continue;
  }
  for (const v of p.variants){
    if (v.mode !== 'flip' && v.mode !== 'choice'){
      errs.push(at + ': mode が flip / choice でない（' + v.mode + '）');
      continue;
    }
    if (!v.q) errs.push(at + ': q がない');
    if (v.mode === 'flip'){
      if (!v.a) errs.push(at + ' [flip]: a がない');
    } else {
      if (!Array.isArray(v.options) || v.options.length < 2) errs.push(at + ' [choice]: options が2つ未満');
      if (!Array.isArray(v.correct) || !v.correct.length) errs.push(at + ' [choice]: correct が空');
      for (const c of v.correct || []){
        if (typeof c !== 'number' || c < 0 || c >= (v.options || []).length){
          errs.push(at + ' [choice]: correct の添字 ' + c + ' が options の範囲外');
        }
      }
      if (new Set(v.correct).size !== (v.correct || []).length) errs.push(at + ' [choice]: correct に重複');
      if ((v.correct || []).length === (v.options || []).length) warn.push(at + ' [choice]: 全部が正解になっている');
      if (new Set(v.options).size !== (v.options || []).length) errs.push(at + ' [choice]: options に重複した選択肢');
    }
  }
}

// ---- 生の文面に Markdown の記法を混ぜない ----
// app.js は q / a / supplement / options をすべて esc() に通してから差し込む。
// つまり **強調** と書くとアスタリスクがそのまま画面に出る。
// 漢文アプリ側の note で実際に55問やらかしていた（2026-08-13・kanbun v46 で対処）ので、
// こちらは混ざる前に止める。
for (const p of d.patterns || []){
  for (const v of p.variants || []){
    const texts = [v.q, v.a, v.supplement].concat(v.options || []);
    for (const s of texts){
      if (typeof s === 'string' && s.indexOf('**') >= 0){
        errs.push(p.code + ': 文面に Markdown の ** が入っている（esc される＝画面にそのまま出る）');
        break;
      }
    }
  }
}

// ---- 単元ごとの件数（習得マップが空にならないか） ----
console.log('一問一答（漢文）台帳の検査');
console.log('  収録 ' + (d.patterns || []).length + ' 項目 / ' + (d.units || []).length + ' 単元');
for (const u of d.units || []){
  const ps = (d.patterns || []).filter(p => p.unit === u.id);
  const byDiff = [1, 2, 3, 4].map(lv => ps.filter(p => p.difficulty === lv).length).join('/');
  console.log('    ' + u.name + '（' + u.id + '）: ' + ps.length + ' 項目　難度1/2/3/4 = ' + byDiff);
  if (!ps.length) errs.push('unit ' + u.id + ' に項目が1つもない');
}
// 二面構成（暗記めくり／測定複数選択）はこのアプリの根幹なので、
// 片面しかない項目は不備として扱う。app.js は choice が無いと flip にフォールバックするため、
// 放っておくと「測定モードなのにめくりが出る」状態が静かに混ざる。
const noChoice = (d.patterns || []).filter(p => !(p.variants || []).some(v => v.mode === 'choice'));
const noFlip = (d.patterns || []).filter(p => !(p.variants || []).some(v => v.mode === 'flip'));
console.log('  測定（choice）を持つ項目: ' + ((d.patterns || []).length - noChoice.length)
  + ' / ' + (d.patterns || []).length);
for (const p of noChoice) errs.push(p.code + ': choice の variant がない（測定モードでめくりに落ちる）');
for (const p of noFlip) errs.push(p.code + ': flip の variant がない（暗記モードで出せない）');

console.log('----');
for (const w of warn) console.log('warn: ' + w);
if (errs.length){
  for (const e of errs) console.log('NG: ' + e);
  console.log(errs.length + ' 件の不備');
  process.exit(1);
}
console.log('不備なし');
