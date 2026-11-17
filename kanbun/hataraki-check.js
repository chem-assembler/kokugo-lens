'use strict';
/* 字ごとの文中の働きの台帳検査。意味の妥当性自体は hataraki-rules.md と人の見直しで確認する。 */
const fs = require('fs');
const path = require('path');
const roles = new Set(['主語', '述語', '目的語', '補語', '修飾語', '前置詞', '助動詞', '接続', '置き字', '文末の助字']);
const rereadAux = new Set(['未', '将', '当', '応', '宜', '須']);
const errs = [];
let total = 0, placedCount = 0, joinCount = 0, rereadCount = 0;
try {
  const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
  const hataraki = JSON.parse(fs.readFileSync(path.join(__dirname, 'hataraki.json'), 'utf8'));
  if (!texts || !Array.isArray(texts.problems)) throw new Error('texts.json の problems が配列ではない');
  if (!hataraki || typeof hataraki !== 'object' || Array.isArray(hataraki)) throw new Error('hataraki.json が id と配列の対応表ではない');
  const problems = texts.problems;
  const ids = new Set(problems.map(p => p.id));
  if (problems.length !== 750) errs.push('問題数は750問が必要（実際は ' + problems.length + ' 問）');
  if (ids.size !== problems.length) errs.push('texts.json に重複 id がある');
  if (Object.keys(hataraki).length !== 750) errs.push('働きのキーは750件が必要（実際は ' + Object.keys(hataraki).length + ' 件）');
  for (const p of problems) {
    if (!Array.isArray(p.tokens)) { errs.push(p.id + ': tokens が配列ではない'); continue; }
    const v = Object.prototype.hasOwnProperty.call(hataraki, p.id) ? hataraki[p.id] : undefined;
    if (!Array.isArray(v)) { errs.push(p.id + ': 働きの配列が無い'); continue; }
    if (v.length !== p.tokens.length) errs.push(p.id + ': 働き ' + v.length + ' 個と字 ' + p.tokens.length + ' 字の数が合わない');
    p.tokens.forEach((t, i) => {
      const at = p.id + ' [' + i + ']「' + t.c + '」: ';
      total++;
      if (!roles.has(v[i])) errs.push(at + '10種にない値 ' + JSON.stringify(v[i]));
      if (t.role === 'placed') placedCount++;
      if ((t.role === 'placed') !== (v[i] === '置き字')) errs.push(at + '置き字と role:placed が一致しない');
      if (t.join) {
        // kanbun.js の nextReadable と同じく、置き字を飛ばした次の読み字に連結する。
        let next = i + 1;
        while (next < p.tokens.length && p.tokens[next].role === 'placed') next++;
        joinCount++;
        if (t.role === 'placed' || next >= p.tokens.length) errs.push(at + 'join の読み字が無い');
        else if (v[i] !== v[next]) errs.push(at + 'join の相手 [' + next + '] と働きが違う');
      }
      if (t.reread && rereadAux.has(t.c)) {
        rereadCount++;
        if (v[i] !== '助動詞') errs.push(at + '再読の未・将・当・応・宜・須は助動詞');
      }
    });
  }
  for (const id of Object.keys(hataraki)) if (!ids.has(id)) errs.push(id + ': 問題データに無い id');
} catch (e) {
  errs.push('台帳を読めない: ' + e.message);
}
for (const e of errs) console.log('NG ' + e);
console.log('----');
console.log('検査字数 ' + total + '・置き字 ' + placedCount + '・join ' + joinCount + '・指定6字の再読 ' + rereadCount);
console.log(errs.length ? errs.length + ' 件の不備があります' : '750問の働きに不備なし');
process.exit(errs.length ? 1 : 0);
