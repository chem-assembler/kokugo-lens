'use strict';
/*
 * yomi-check.js — 読み仮名（yomi）の検査。`node kanbun/yomi-check.js`
 *
 * ## なぜ要るか
 *
 * これまでの二重帳簿（訓点→読み順→書き下し）は **yomi をまったく見ていない**。
 * `toKakikudashi` は漢字トークンについて `c + okuri` しか使わないので、
 * yomi を壊してもテストは緑のまま通る。実際に「学」の yomi を「まな→まなん」と
 * 壊しても `validateProblem` は素通りした。
 *
 * yomi は**読み仮名トグルで学習者に見せている**うえ、全部平仮名の書き下し（阪大型）を
 * 作るなら正解キーそのものになる。2026-08-12 に実データを洗ったところ **7件の誤り**が
 * 見つかった（ルビの重複4件・送り仮名なしの「亦」を「ま」としていたもの3件）。
 * この検査はそれを再発させないために置く。
 *
 * ## 検査する内容
 *
 *   1. yomi は平仮名だけであること（カタカナ・漢字が混ざっていないか）
 *   2. **ルビの重複**: yomi の末尾と送り仮名の先頭が重なると、読み上げたときに
 *      同じ音を二度読むことになる（例: 来 yomi=きた okuri=タル → 「きたたる」）。
 *      ただし**送り仮名が助詞のときは重複ではない**（例: 皮 yomi=かは okuri=ハ →
 *      「かはは」＝「皮は」で正しい）。機械では区別できないので、
 *      正しいと確かめたものは下の ALLOW に理由つきで書いて通す
 *   3. 置き字（role:'placed'）に yomi/okuri/mark が付いていないこと
 *   4. 仮名書きする字（kana:true）は yomi が空で okuri を持つこと
 *
 * ## この検査の限界（承知して使うこと）
 *
 * 捕まえられるのは**上の4つの型に当てはまる誤りだけ**で、任意の読み間違いは捕まえない。
 * 実際、「学」の yomi を「まな→まなん」と壊してもこの検査は通る（送り仮名「ビテ」と
 * 重ならないため）。**読みが正しいかどうかは、最後は人が140本を読むしかない。**
 * この検査は「一度直した誤りが再発しないこと」を保証するものであって、
 * 「読みがすべて正しいこと」は保証しない。
 *
 * 不備が1件でもあれば exit 1。
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'texts.json');
const raw = fs.readFileSync(file);
if (raw.length >= 3 && raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF){
  console.error('NG texts.json に BOM が付いています');
  process.exit(1);
}
const problems = JSON.parse(raw.toString('utf8')).problems || [];

// ルビの重複に見えるが正しいもの。**送り仮名が助詞である場合だけ**ここに書く
const ALLOW = {
  'mq-zaien-senyo:皮': '送り仮名の「は」は助詞。' +
    '「皮（かは）は」で正しい'
};

const hira = s => String(s).replace(/[ァ-ヶ]/g,
  c => String.fromCharCode(c.charCodeAt(0) - 0x60));

const errs = [];
const warns = [];
let tokens = 0, withYomi = 0;

problems.forEach(p => {
  (p.tokens || []).forEach(t => {
    tokens++;
    const at = p.id + ' 「' + t.c + '」';

    // 3. 置き字
    if (t.role === 'placed'){
      if (t.yomi || t.okuri || (t.mark && t.mark.length)){
        errs.push(at + ': 置き字なのに読み・送り仮名・返り点が付いている');
      }
      return;
    }
    // 4. 仮名書きする字（不・也・乎 など）。読みの持ち方は2通りある。
    //    「不」のように送り仮名だけに入れる形（yomi='' okuri='ザレバ'）と、
    //    「也」のように yomi に入れる形（yomi='なり'）。どちらでもよいが、
    //    両方とも空だと書き下しに何も出ない
    if (t.kana){
      if (!t.yomi && !t.okuri) errs.push(at + ': 仮名書きする字なのに読みも送り仮名も無い');
      if (t.yomi && !/^[ぁ-ゖー]+$/.test(t.yomi)){
        errs.push(at + ': yomi「' + t.yomi + '」に平仮名以外が混ざっている');
      }
      return;
    }
    // 再読文字は first/second の中に読みを持つ
    const pairs = t.reread
      ? [t.reread.first, t.reread.second].filter(Boolean)
      : [t];
    pairs.forEach(r => {
      if (!r.yomi) return;
      withYomi++;
      // 1. 平仮名だけか
      if (!/^[ぁ-ゖー]+$/.test(r.yomi)){
        errs.push(at + ': yomi「' + r.yomi + '」に平仮名以外が混ざっている');
        return;
      }
      // 2. ルビの重複
      if (!r.okuri) return;
      const o = hira(r.okuri);
      for (let L = Math.min(r.yomi.length - 1, o.length); L >= 1; L--){
        if (r.yomi.slice(-L) === o.slice(0, L)){
          const key = p.id + ':' + t.c;
          if (ALLOW[key]){ warns.push(at + ': 重複に見えるが許容― ' + ALLOW[key]); }
          else {
            errs.push(at + ': ルビの重複。yomi「' + r.yomi + '」＋送り仮名「' +
              r.okuri + '」を読むと「' + r.yomi + o + '」になる' +
              '（送り仮名が助詞なら ALLOW へ理由つきで追加）');
          }
          break;
        }
      }
    });
  });
});

console.log('読み仮名の検査');
console.log('  ' + problems.length + ' 問 / ' + tokens + ' トークン / 読みを持つ ' + withYomi + ' 件');
warns.forEach(m => console.log('  許容 ' + m));
console.log('----');
if (errs.length){
  errs.forEach(m => console.error('NG ' + m));
  console.error(errs.length + ' 件の不備があります');
  process.exit(1);
}
console.log('不備なし');
