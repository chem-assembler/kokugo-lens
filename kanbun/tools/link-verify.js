'use strict';
/*
 * link-verify.js — 「型 ← 問題」の結び付け案を、収録前に機械検査する。
 *   使い方: node kanbun/tools/link-verify.js <案のJSON> [--write]
 *
 * 案の形: { "型id": ["問題id", ...], ... }
 *
 * ## なぜ要るか
 * 問題を足すと、句法クイズの解説から訓点モードへ渡す「この型で練習できる問題」の
 * カードが取りこぼされる。2026-08-12 に68問足したあと、結び付いた問題は 65/133 まで
 * 落ちていた（結び直して 117/140 に戻した）。**問題を足したら結び直す**のを忘れないこと。
 *
 * ## 検査する内容（kuho-check.js が収録後に見るのと同じ規則を、提案の段階で当てる）
 *   規則10 実例の白文に、その型の標識（markers）がひとつ以上現れること
 *          （noMarker の型は飛ばす＝目印の字を持てない型）
 *   規則11 yomi を持つ型は、実例の書き下しにその読みがひとつ以上現れること
 *   規則12 実例の問題の kuho に、その型のカテゴリが含まれること（往復の整合）
 *   ＋ 型id / 問題id の実在、既に結ばれている組でないか、案の中での二重
 *
 * ## 検査を通ることと、教えとして正しいことは別
 * 実際にあった例: 「不已為若笑耶」は標識「為」があるので助字の受身（見・被）の検査を
 * **通ってしまう**が、型の書き下し「Aセらル」とこの問題の「〜と為る」が食い違い、
 * 穴埋めで誤答を誘う。**機械が通した候補をそのまま採らないこと。**
 */
const fs = require('fs');
const path = require('path');
const KANBUN = path.join(__dirname, '..');
const kuhoPath = path.join(KANBUN, 'kuho.json');
const kuho = JSON.parse(fs.readFileSync(kuhoPath, 'utf8'));
const texts = JSON.parse(fs.readFileSync(path.join(KANBUN, 'texts.json'), 'utf8'));

const file = process.argv[2];
const write = process.argv.indexOf('--write') >= 0;
if (!file){ console.error('使い方: node kanbun/tools/link-verify.js <案のJSON> [--write]'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(file, 'utf8'));

const typeById = new Map(kuho.types.map(t => [t.id, t]));
const probById = new Map(texts.problems.map(p => [p.id, p]));
const haku = p => p.tokens.map(t => t.c).join('');
const errs = [];
const E = m => errs.push(m);
let n = 0;

for (const [tid, ids] of Object.entries(plan)){
  const t = typeById.get(tid);
  if (!t){ E('型「' + tid + '」が kuho.json に無い'); continue; }
  const already = new Set(t.examples || []);
  const seen = new Set();
  (Array.isArray(ids) ? ids : []).forEach(pid => {
    n++;
    const at = tid + ' ← ' + pid;
    if (seen.has(pid)) E(at + ': 同じ問題を二重に挙げている');
    seen.add(pid);
    if (already.has(pid)){ E(at + ': すでに結ばれている'); return; }
    const p = probById.get(pid);
    if (!p){ E(at + ': 問題が texts.json に無い'); return; }

    if (!t.noMarker){
      const marks = Array.isArray(t.markers) ? t.markers : [];
      const h = haku(p);
      if (marks.length && !marks.some(m => h.indexOf(m) >= 0)){
        E(at + ': 白文「' + h + '」に標識 ' + marks.join('・') + ' が現れない');
      }
    }
    const yomi = Array.isArray(t.yomi) ? t.yomi : [];
    if (yomi.length && !yomi.some(y => String(p.kakikudashi).indexOf(y) >= 0)){
      E(at + ': 書き下し「' + p.kakikudashi + '」に読み ' + yomi.join('・') + ' が現れない');
    }
    if (!(Array.isArray(p.kuho) ? p.kuho : []).includes(t.category)){
      E(at + ': 問題の kuho に「' + t.category + '」が無い（現在 ' + JSON.stringify(p.kuho) + '）');
    }
  });
}

console.log(path.basename(file) + ': ' + Object.keys(plan).length + ' 型 / ' + n + ' 件の結び付け案');
for (const [tid, ids] of Object.entries(plan)){
  const t = typeById.get(tid);
  if (!t) continue;
  console.log('  ' + tid.padEnd(22) + t.name);
  (ids || []).forEach(pid => {
    const p = probById.get(pid);
    console.log('      ' + pid.padEnd(24) + (p ? haku(p) + ' → ' + p.kakikudashi : '(無し)'));
  });
}
if (errs.length){
  errs.forEach(m => console.error('NG ' + m));
  console.error(errs.length + ' 件の不備があります');
  process.exit(1);
}
console.log('不備なし');

if (write){
  for (const [tid, ids] of Object.entries(plan)){
    const t = typeById.get(tid);
    (ids || []).forEach(pid => { if (!t.examples.includes(pid)) t.examples.push(pid); });
  }
  fs.writeFileSync(kuhoPath, JSON.stringify(kuho, null, 2) + '\n', 'utf8');
  const used = new Set(kuho.types.flatMap(t => t.examples || []));
  console.log('kuho.json に収録した（結び付いた問題 ' + used.size + ' / ' + texts.problems.length + '）');
} else {
  console.log('（--write を付けると収録します）');
}
