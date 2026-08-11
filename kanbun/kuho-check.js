'use strict';
/*
 * kuho-check.js — 句形データ（kuho.json）の機械検査
 *
 * 使い方: node kanbun/kuho-check.js
 * 不備が1件でもあれば exit 1。人の記憶に頼らないための道具（化学レンズの verify-release.js と同じ役目）。
 *
 * 検査する内容:
 *   1. UTF-8（BOMなし）で JSON として読めること
 *   2. categories が定義済みのカテゴリ集合とちょうど一致すること
 *   3. 各型に必須フィールドがそろい、型（配列・文字列）が合っていること
 *   4. id に重複がないこと
 *   5. category が定義済みの集合に含まれること
 *   6. examples の問題 ID が texts.json に実在すること
 *   7. blank が kakikudashi の部分文字列で、かつ1回だけ現れること（空欄が一意に決まる）
 *   8. blankNg が3件あり、互いに重複せず、正解の blank とも重ならないこと
 *   9. confuse の参照先 ID が実在し、自分自身を指していないこと
 *  10. 実例の白文に、その型の標識（markers）がひとつ以上現れること
 *  11. yomi を持つ型は、実例の書き下しにその読みがひとつ以上現れること
 *  12. 実例の問題の kuho に、その型のカテゴリが含まれること（型→問題と問題→型の往復が合うこと）
 *
 * 10〜12 は「解説面に嘘の実例が出る」事故を止めるためにある（2026-08-12 追加）。
 * 10 だけでは足りない。標識が一般的な1字だと偶然の一致をすり抜けるため（実際に
 * 「胡蝶」の胡が疑問詞の「胡」と一致して、疑問でない文が何ゾの実例になっていた）、
 * 誤りやすい型には yomi を持たせて書き下し側からも照合する。
 */
const fs = require('fs');
const path = require('path');

// kanbun.js の難易度表（KUHO_DIFF）と同じキー集合。ここがずれると訓点モードと句法クイズが食い違う
const CATEGORIES = ['hitei', 'shieki', 'ukemi', 'gimon', 'hango', 'hikaku',
                    'sentaku', 'katei', 'gentei', 'yokuyo', 'eitan'];
const REQUIRED_STR = ['id', 'category', 'label', 'name', 'pattern', 'kakikudashi', 'meaning', 'blank'];
const REQUIRED_ARR = ['markers', 'examples', 'blankNg'];

const errors = [];
const err = m => errors.push(m);

function readJson(file){
  const raw = fs.readFileSync(file);
  if (raw.length >= 3 && raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF){
    err(path.basename(file) + ': BOM が付いています（UTF-8 BOMなしで保存してください）');
  }
  return JSON.parse(raw.toString('utf8'));
}

const here    = __dirname;
const kuho    = readJson(path.join(here, 'kuho.json'));
const texts   = readJson(path.join(here, 'texts.json'));
const textIds = new Set((texts.problems || []).map(p => p.id));
const textById = new Map((texts.problems || []).map(p => [p.id, p]));
const hakubun = p => (p.tokens || []).map(k => k.c).join('');

// ---- 2. カテゴリ集合 -------------------------------------------------------
const catKeys = Object.keys(kuho.categories || {});
CATEGORIES.filter(k => catKeys.indexOf(k) < 0)
  .forEach(k => err('categories: 「' + k + '」が定義されていません'));
catKeys.filter(k => CATEGORIES.indexOf(k) < 0)
  .forEach(k => err('categories: 「' + k + '」は定義済みの集合にありません'));

// ---- 3〜9. 型ごとの検査 ----------------------------------------------------
const types = kuho.types || [];
if (!types.length) err('types: 型が1件もありません');

const seenId = new Set();
const countByCat = {};

types.forEach((t, idx) => {
  const where = 'types[' + idx + ']' + (t && t.id ? '「' + t.id + '」' : '');

  if (!t || typeof t !== 'object'){ err(where + ': オブジェクトではありません'); return; }

  REQUIRED_STR.forEach(f => {
    if (typeof t[f] !== 'string' || !t[f].trim()) err(where + ': ' + f + ' が空、または文字列ではありません');
  });
  REQUIRED_ARR.forEach(f => {
    if (!Array.isArray(t[f])) { err(where + ': ' + f + ' が配列ではありません'); return; }
    t[f].forEach((v, i) => {
      if (typeof v !== 'string' || !v.trim()) err(where + ': ' + f + '[' + i + '] が空、または文字列ではありません');
    });
  });
  if (Array.isArray(t.markers) && !t.markers.length) err(where + ': markers が空です');
  if (t.note !== undefined && typeof t.note !== 'string') err(where + ': note が文字列ではありません');
  if (t.confuse !== undefined && !Array.isArray(t.confuse)) err(where + ': confuse が配列ではありません');

  // 4. id 重複
  if (typeof t.id === 'string'){
    if (seenId.has(t.id)) err(where + ': id が重複しています');
    seenId.add(t.id);
  }

  // 5. カテゴリ
  if (CATEGORIES.indexOf(t.category) < 0){
    err(where + ': category「' + t.category + '」は定義済みの集合にありません');
  } else {
    countByCat[t.category] = (countByCat[t.category] || 0) + 1;
  }

  // 6・10〜12. examples の実在と、その実例がほんとうにこの型かどうか
  if (t.yomi !== undefined && !Array.isArray(t.yomi)) err(where + ': yomi が配列ではありません');
  if (t.noMarker && !(Array.isArray(t.yomi) && t.yomi.length)){
    err(where + ': noMarker の型は yomi が必要です（白文から見分けられないため）');
  }
  (Array.isArray(t.examples) ? t.examples : []).forEach(id => {
    if (!textIds.has(id)){
      err(where + ': examples の「' + id + '」が texts.json にありません');
      return;
    }
    const p = textById.get(id);

    // 10. 白文に標識が現れるか
    // noMarker の型は「目印の字が無いこと自体が型」（使動用法など）。白文からは
    // 見分けられないので、この検査は飛ばし、代わりに 11 の読みの照合を必須にする
    const marks = t.noMarker ? [] : (Array.isArray(t.markers) ? t.markers : []);
    const haku = hakubun(p);
    if (marks.length && !marks.some(m => haku.indexOf(m) >= 0)){
      err(where + ': 実例「' + id + '」の白文「' + haku + '」に標識 ' +
          marks.join('・') + ' がひとつも現れません');
    }

    // 11. 書き下しに読みが現れるか（標識の偶然の一致を弾く）
    const yomi = Array.isArray(t.yomi) ? t.yomi : [];
    const kd = String(p.kakikudashi || '');
    if (yomi.length && !yomi.some(y => kd.indexOf(y) >= 0)){
      err(where + ': 実例「' + id + '」の書き下し「' + kd + '」に読み ' +
          yomi.join('・') + ' がひとつも現れません');
    }

    // 12. 問題側のカテゴリタグと合っているか
    if ((Array.isArray(p.kuho) ? p.kuho : []).indexOf(t.category) < 0){
      err(where + ': 実例「' + id + '」の kuho に「' + t.category + '」がありません');
    }
  });

  // 7. blank は kakikudashi にちょうど1回出ること（○○ に置き換える位置が一意に決まる）
  if (typeof t.blank === 'string' && typeof t.kakikudashi === 'string'){
    const n = t.kakikudashi.split(t.blank).length - 1;
    if (n === 0) err(where + ': blank「' + t.blank + '」が kakikudashi「' + t.kakikudashi + '」に含まれません');
    else if (n > 1) err(where + ': blank「' + t.blank + '」が kakikudashi に ' + n + ' 回出ます（1回にしてください）');
  }

  // 8. 誤答候補
  if (Array.isArray(t.blankNg)){
    if (t.blankNg.length !== 3) err(where + ': blankNg は3件必要です（現在 ' + t.blankNg.length + ' 件）');
    const set = new Set(t.blankNg);
    if (set.size !== t.blankNg.length) err(where + ': blankNg に重複があります');
    if (set.has(t.blank)) err(where + ': blankNg に正解「' + t.blank + '」が混ざっています');
  }

  // 9. confuse の参照
  (Array.isArray(t.confuse) ? t.confuse : []).forEach(id => {
    if (id === t.id) err(where + ': confuse が自分自身を指しています');
  });
});

// confuse の参照先は全 id が出そろってから確かめる
types.forEach((t, idx) => {
  (Array.isArray(t.confuse) ? t.confuse : []).forEach(id => {
    if (!seenId.has(id)){
      err('types[' + idx + ']「' + t.id + '」: confuse の「' + id + '」という型がありません');
    }
  });
});

// ---- 結果 -----------------------------------------------------------------
console.log('kuho.json 検査');
console.log('  収録 ' + types.length + ' 型 / ' + catKeys.length + ' カテゴリ');
CATEGORIES.forEach(k => {
  const label = (kuho.categories || {})[k] || k;
  console.log('    ' + label + '（' + k + '）: ' + (countByCat[k] || 0) + ' 型');
});
const used = new Set();
types.forEach(t => (t.examples || []).forEach(id => used.add(id)));
console.log('  texts.json と結び付いた問題: ' + used.size + ' / ' + textIds.size + ' 件');
const noEx = types.filter(t => !(t.examples || []).length);
console.log('  実例のない型: ' + noEx.length + ' / ' + types.length + ' 型' +
            (noEx.length ? '（' + noEx.map(t => t.id).join('・') + '）' : ''));
console.log('  ※ 実例が無くても出題はできる（クイズは型データだけで動く）。' +
            '無いのは訓点モードの練習へ渡す橋だけ');
console.log('----');

if (errors.length){
  errors.forEach(m => console.error('NG ' + m));
  console.error(errors.length + ' 件の不備があります');
  process.exit(1);
}
console.log('不備なし');
process.exit(0);
