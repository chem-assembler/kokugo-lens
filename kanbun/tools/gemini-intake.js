'use strict';
/*
 * gemini-intake.js — Gemini が返した訓読の JSON を、そのままレーンの問題データに組み直す。
 *   使い方: node kanbun/tools/gemini-intake.js <Geminiの出力.json> <接頭> <出力先.json>
 *           例: node kanbun/tools/gemini-intake.js ./s1.json S ./lane-S1.json
 *
 * ## 何をするか
 *   1. 台帳から白文を引く（**Gemini の返した白文は使わない**。写し間違いを入れないため）
 *   2. reading（読む順に並べた字）を白文の位置に割り付けて order を作る
 *   3. **order から返り点を組み立てる**（レ点／一二三／上下／一レ の使い分けはここで決める）
 *   4. 組み立てた訓点をエンジンに実際に読ませ、order と書き下しが戻るか確かめる
 *   5. 通ったものだけを lane 形式で書き出す。落ちたものは理由を並べて捨てる
 *
 * 4 が要点。**Gemini の申告（reading・kakikudashi）と、組み立てた訓点から機械が導く読み順**の
 * 二重帳簿になっていて、どちらかが崩れていれば必ず落ちる。
 * そのうえで `lane-verify.js` → `lane-merge.js` に流すので、検査は三重になる。
 *
 * ## それでも人が見なければならないこと
 * **機械検査を通ることと、教えとして正しいことは別**（HOWTO_add_problems.md）。
 * 通った問題も、書き下しが定訓か・句法タグが型の書き下しと食い違わないかは人が見る。
 * confidence が「中」「低」の行は、通っていても既定では書き出さない（--all で含める）。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const K = require(path.join(ROOT, 'kanbun', 'kanbun.js'));
const { norm, catalogText: cat } = require('./kyujitai.js');
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'kanbun', 'texts.json'), 'utf8'));

const args = process.argv.slice(2).filter(a => a !== '--all');
const withAll = process.argv.indexOf('--all') >= 0;
const inFile = args[0];
if (!inFile){
  console.error('使い方: node kanbun/tools/gemini-intake.js <Geminiの出力.json> [接頭] [出力先.json] [--all]');
  console.error('  接頭と出力先は省略できる（ファイル名 gemini-s-2.json から S と scratch/lane-S-2.json を導く）');
  process.exit(2);
}
// ファイル名から束を読み取る（gemini-s-2.json / s2.json / lane-b-1.json などを許す）
const stem = path.basename(inFile).replace(/\.json$/i, '');
const guess = stem.match(/(?:^|[-_])([KSHPB])[-_]?(\d+)?$/i) || stem.match(/^([kshpb])/i);
const PREFIX = (args[1] || (guess && guess[1]) || '').toUpperCase();
const outFile = args[2] || path.join(path.dirname(inFile),
  'lane-' + PREFIX + (guess && guess[2] ? '-' + guess[2] : '') + '.json');
if (!/^[KSHPB]$/.test(PREFIX)){
  console.error('接頭（K/S/H/P/B）がファイル名から読み取れませんでした。2番目の引数で渡してください');
  process.exit(2);
}
const CATS = ['hitei','shieki','ukemi','gimon','hango','hikaku','sentaku','katei','gentei','yokuyo','eitan'];
const REREAD9 = '未将且当応宜須猶由盍';

// ---- 台帳から ID → 白文・出どころ を引く（gemini-pack.js と同じ読み方）------
const HAKU = new Map(), WHERE = new Map();
{
  let cols = null, section = '';
  for (const line of cat.split('\n')){
    if (/^### /.test(line)) section = line.replace(/^###\s*/, '').trim();
    const c = line.split('|').map(x => x.trim());
    if (/^\|\s*ID\s*\|/.test(line)){ cols = c; continue; }
    if (!cols || !new RegExp('^\\| ' + PREFIX + '-[0-9]').test(line) || c.length < 5) continue;
    const at = name => cols.findIndex(x => x.indexOf(name) === 0);
    const get = name => { const i = at(name); return i >= 0 ? (c[i] || '') : ''; };
    const where = { section, chapter: get('篇') || get('章') || get('出典') };
    const raw = get('白文');
    if (PREFIX === 'P'){
      raw.replace(/^\*\*.+?\*\*（.+?）/, '').split('／').map(s => s.trim()).filter(Boolean)
         .forEach((ku, n) => { HAKU.set(c[1] + '-' + (n + 1), norm(ku)); WHERE.set(c[1] + '-' + (n + 1), where); });
      continue;
    }
    HAKU.set(c[1], norm(raw)); WHERE.set(c[1], where);
  }
}

// ---- order から返り点を組み立てる ------------------------------------------
// エンジン（kanbun.js の readOrder）の裏返し。左から素直に読める字の並び S を貪欲に取り、
// S からはみ出した字は「直前に読んだ字から返って読む字」として束にする。
// 束の中は、隣接ならレ点、離れていれば番号つき（一二三 → 上中下 → 甲乙丙）で送る。
// 番号は1階層3つまでなので、あふれたら最後に読んだ字を次の階層の「一」に使って継ぐ。
function deriveMarks(tokens, order){
  const marks = tokens.map(() => []);
  const prevReadable = i => { for (let j = i - 1; j >= 0; j--) if (tokens[j].role !== 'placed') return j; return -1; };
  const groups = [];
  let last = -1;
  for (const o of order){
    if (o > last){ groups.push({ t: o, rel: [] }); last = o; }
    else if (groups.length) groups[groups.length - 1].rel.push(o);
    else return null;                       // 先頭から返るのはありえない
  }
  for (const g of groups){
    let prev = g.t, lv = 1, i = 0;
    while (i < g.rel.length){
      const r = g.rel[i];
      if (r === prevReadable(prev)){        // 隣接＝レ点
        marks[r].push({ re: true }); prev = r; i++; continue;
      }
      if (lv > 4) return null;              // 甲乙丙より外は表示できない
      marks[prev].push({ lv, n: 1 });       // 返り先の起点が「一」
      let k = 1;
      while (i < g.rel.length && k < 3){
        marks[g.rel[i]].push({ lv, n: ++k }); prev = g.rel[i]; i++;
      }
      lv++;
    }
  }
  return marks;
}

// ---- 取り込み ---------------------------------------------------------------
const list = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const existing = new Set(texts.problems.map(p => p.tokens.map(t => t.c).join('')));
const out = [], bad = [], soft = [];

for (const e of (Array.isArray(list) ? list : [list])){
  const id = (e && e.id) || '(id なし)';
  const NG = m => bad.push(id + ': ' + m);
  const haku = HAKU.get(id);
  if (!haku){ NG('台帳に ID が無い（' + PREFIX + '系の課題表と照合）'); continue; }
  if (!Array.isArray(e.reading) || !e.reading.length){ NG('reading が無い'); continue; }

  // 返ってきた字も台帳と同じ字体にそろえてから突き合わせる。
  // 依頼パックは新字体で渡しているが、原典を見に行った結果を旧字で返してくることがある
  // （爭／臺 など）。字体のずれで落とすのは筋が悪いので、照合の前にそろえる
  const chars = [...haku];
  const placed = new Set((Array.isArray(e.placed) ? e.placed : []).map(norm));
  const reread = new Set((Array.isArray(e.reread) ? e.reread : []).map(norm));
  (Array.isArray(e.reading) ? e.reading : []).forEach(r => { if (r && r.c) r.c = norm(r.c); });
  for (const c of placed) if (!haku.includes(c)) NG('置き字「' + c + '」が白文「' + haku + '」に無い');
  for (const c of reread){
    if (!haku.includes(c)) NG('再読文字「' + c + '」が白文に無い');
    if (!REREAD9.includes(c)) NG('「' + c + '」は再読文字9字（' + REREAD9 + '）に入っていない');
  }

  // 白文の字 → トークン。置き字は role:'placed'
  const tokens = chars.map(c => placed.has(c) ? { c, role: 'placed' } : { c });
  // reading を白文の位置に割り付ける（同じ字が複数あるときは左から未使用のものを取る）
  const used = new Set(), order = [], seenRe = new Map();
  let broke = false;
  for (const r of e.reading){
    if (!r || typeof r.c !== 'string'){ NG('reading の要素の形がおかしい'); broke = true; break; }
    let at = -1;
    if (reread.has(r.c) && seenRe.has(r.c)) at = seenRe.get(r.c);           // 再読の2回目は同じ字
    else at = chars.findIndex((c, i) => c === r.c && !used.has(i) && !placed.has(c));
    if (at < 0){ NG('reading の「' + r.c + '」が白文「' + haku + '」に見当たらない（置き字か、余分な字）'); broke = true; break; }
    used.add(at); order.push(at);
    if (reread.has(r.c)) seenRe.set(r.c, at);
    const t = tokens[at];
    const part = { yomi: r.yomi || '', okuri: r.okuri || '', kana: !!r.kana };
    if (reread.has(r.c)){
      t.reread = t.reread || { first: null, second: null };
      t.reread[t.reread.first ? 'second' : 'first'] = part;
    } else Object.assign(t, part);
    if (!part.kana) delete t.kana;
  }
  if (broke) continue;
  tokens.forEach(t => { if (t.reread) { delete t.yomi; delete t.okuri; delete t.kana; } });

  const want = tokens.reduce((s, t) => s + (t.role === 'placed' ? 0 : (t.reread ? 2 : 1)), 0);
  if (order.length !== want){ NG('読む回数が合わない（reading ' + order.length + ' / 白文から期待 ' + want + '）'); continue; }
  if (existing.has(haku)){ NG('白文「' + haku + '」は収録済み'); continue; }

  const marks = deriveMarks(tokens, order);
  if (!marks){ NG('この読み順に付けられる返り点が組めなかった（読み順そのものを疑う）'); continue; }
  marks.forEach((m, i) => { if (m.length) tokens[i].mark = m; });

  // ---- 二重帳簿: 組み立てた訓点をエンジンに読ませて突き合わせる --------------
  let got;
  try { got = K.readOrder(tokens); }
  catch (err){ NG('readOrder が例外: ' + err.message); continue; }
  if (JSON.stringify(got) !== JSON.stringify(order)){
    NG('組んだ訓点からの読み順 ' + JSON.stringify(got) + ' が reading の順 ' + JSON.stringify(order) + ' と違う'); continue;
  }
  const kd = K.toKakikudashi(tokens, order);
  if (e.kakikudashi && norm(kd) !== norm(e.kakikudashi)){   // 申告側の字体もそろえて比べる
    NG('reading から組んだ書き下し「' + kd + '」が申告「' + e.kakikudashi + '」と違う'); continue;
  }
  if (/[ァ-ヶ]/.test(kd)){ NG('書き下しにカタカナが残っている: ' + kd); continue; }
  const kuho = (Array.isArray(e.kuho) ? e.kuho : []).filter(g => {
    if (CATS.indexOf(g) < 0){ NG('知らない句法タグ「' + g + '」（落として続行）'); return false; }
    return true;
  });
  if (!e.meaning || !String(e.meaning).trim()){ NG('meaning が空'); continue; }

  const w = WHERE.get(id) || {};
  const rec = { id: '', source: { work: '', chapter: w.chapter || '' }, tokens, order,
                kakikudashi: kd, acceptable: [], kuho, meaning: String(e.meaning).trim() };
  if (e.note) rec.note = String(e.note).trim();
  rec._catalog = id;
  rec._section = w.section || '';           // 作品名を埋めるための手がかり（台帳の節見出し）
  rec._confidence = e.confidence || '不明';
  (e.confidence === '高' || withAll ? out : soft).push(rec);
}

// 送り仮名はデータ側ではカタカナで持つ（既存データにそろえる）
const kata = s => String(s).replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
out.concat(soft).forEach(p => p.tokens.forEach(t => {
  if (t.reread){
    ['first','second'].forEach(k => {
      const r = t.reread[k]; if (!r) return;
      r.okuri = kata(r.okuri); if (!r.okuri) delete r.okuri; if (!r.kana) delete r.kana;
    });
    return;
  }
  if (t.role === 'placed'){ delete t.yomi; delete t.okuri; return; }
  t.okuri = kata(t.okuri || ''); if (!t.okuri) delete t.okuri;
}));

console.log(path.basename(inFile) + ': ' + (Array.isArray(list) ? list.length : 1) + ' 件 → 通過 ' + out.length +
            ' / 保留 ' + soft.length + ' / 不備 ' + bad.length);
out.forEach(p => console.log('  ' + p._catalog.padEnd(8) + p.tokens.map(t => t.c).join('') + ' → ' + p.kakikudashi));
if (soft.length){
  console.log('\n-- 自信が「高」でないので保留（--all で含める）--');
  soft.forEach(p => console.log('  ' + p._catalog.padEnd(8) + '[' + p._confidence + '] ' +
                                p.tokens.map(t => t.c).join('') + ' → ' + p.kakikudashi + (p.note ? ' ※' + p.note : '')));
}
if (bad.length){ console.log('\n-- 落ちた行 --'); bad.forEach(m => console.log('  NG ' + m)); }

if (!out.length){ console.log('\n書き出すものがありません'); process.exit(1); }
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log('\n' + outFile + ' に書き出した。' +
            '**id と source を人が埋めてから** lane-verify.js に通すこと（_catalog / _confidence も消す）');
