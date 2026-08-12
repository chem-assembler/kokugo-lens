'use strict';
/*
 * kyujitai.js — 台帳の白文をアプリの字体にそろえる正規化を一箇所にまとめたもの。
 *
 * **表は持たない。台帳（docs/material-catalog.md）から読み取る。**
 * 手打ちの表を持っていた時期に、対応表の抜けで**収録済みの行を「未収録」と誤って数えた**
 * 事故が実際に起きた。出どころを台帳に一本化してそれを防ぐ。
 * さらに、uncollected.js と gemini-pack.js が別々に表を持つと二重帳簿になるので、
 * 読み取りはこのファイルだけが行い、両方ともここを通す。
 *
 *   §8.1 … 新旧字体（學→学）。そのまま置き換えてよい
 *   §8.2 … 異体字（楯／盾）。**置き換えると原文と別字になる**ので、
 *          判断欄に「統一推奨」「通例」と決着を書いた行だけを採る。
 *          「要判断」「どちらでもよい」のまま置いた行は採らない
 *          ＝**決めていないことを機械が勝手に決めない**
 *
 * この正規化は「台帳の行を、収録済みの白文と突き合わせる」「Gemini へ渡す課題を作る」
 * のに使う。**保存するデータの変換に §8.2 を使ってはいけない**（§8.2 の見出しのとおり）。
 */
const fs = require('fs');
const path = require('path');
const CATALOG = path.join(__dirname, '..', '..', 'docs', 'material-catalog.md');

const cat = fs.readFileSync(CATALOG, 'utf8');
const MAP = {};

// §8.1 新旧字体（コードフェンスの中の「舊→新」をすべて拾う）
{
  const block = cat.slice(cat.indexOf('### 8.1'));
  const f1 = block.indexOf('```');
  const fence = block.slice(f1 + 3, block.indexOf('```', f1 + 3));
  for (const m of fence.matchAll(/([一-鿿](?:\/[一-鿿])*)→([一-鿿])/g)){
    m[1].split('/').forEach(old => { MAP[old] = m[2]; });
  }
}

// §8.2 異体字（決着済みの行だけ）
{
  const block = cat.slice(cat.indexOf('### 8.2'), cat.indexOf('### 8.3'));
  for (const line of block.split('\n')){
    const c = line.split('|').map(x => x.trim());
    if (c.length < 6 || !/^[一-鿿]$/.test(c[1]) || !/^[一-鿿]$/.test(c[2])) continue;
    if (!/統一推奨|通例/.test(c[4])) continue;
    MAP[c[1]] = c[2];
  }
}

// 白文の句読点を落として字体をそろえる。台帳には「：」「；」も混じる
const norm = s => String(s).replace(/[，、。？！：；「」『』…\s]/g, '')
                           .replace(/./g, c => MAP[c] || c);

module.exports = { MAP, norm, CATALOG, catalogText: cat };
