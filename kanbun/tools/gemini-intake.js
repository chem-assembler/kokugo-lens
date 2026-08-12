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
  // 番号つきの階層は**使い回せない場合がある**。ある階層で待っている字は、
  // その階層の「一」が読まれた瞬間にまとめて解放される。だから、待っているあいだに
  // 別の組の「一」が挟まると、そこで巻き添えで解放されてしまう。
  // 「憂患に生き安楽に死するを知る」がまさにそれで、「知」を「生」と同じ一二点に置くと
  // 「患」を読んだ時点で「生」といっしょに読まれてしまう。
  // そこで、待つ区間（返り先 … 起点）が他の組の起点をまたぐ階層は使わない。
  const spans = {};
  const pick = (lo, t) => {
    for (let lv = 1; lv <= 4; lv++){
      const s = spans[lv] || (spans[lv] = []);
      if (!s.some(x => (x.t > lo && x.t < t) || (x.lo < t && t < x.t))){ s.push({ lo, t }); return lv; }
    }
    return 0;                               // 甲乙丙より外は表示できない
  };
  for (const g of groups){
    let prev = g.t, i = 0;
    while (i < g.rel.length){
      const r = g.rel[i];
      if (r === prevReadable(prev)){        // 隣接＝レ点
        marks[r].push({ re: true }); prev = r; i++; continue;
      }
      const run = [];                       // 1階層で送れるのは「二」「三」の2つまで
      while (i < g.rel.length && run.length < 2) run.push(g.rel[i++]);
      const lv = pick(Math.min.apply(null, run), prev);
      if (!lv) return null;
      marks[prev].push({ lv, n: 1 });       // 返り先の起点が「一」
      run.forEach((x, n) => { marks[x].push({ lv, n: n + 2 }); prev = x; });
    }
  }
  return marks;
}

// ---- 送り仮名を書き下しから割り直す ----------------------------------------
// いちばん多い落ち方は「申告した書き下しは定訓として正しいのに、それを字ごとに割った
// reading の送り仮名がずれている」（1文字落とす・重ねる・隣の字に付ける）。
// 割り方は書き下しから一意に決まる（漢字が錨になる）ので、機械で割り直せる。
//   ・kana:false の字 … 書き下しに「その漢字」が現れ、続くかなが送り仮名
//   ・kana:true の字 … 次の漢字の手前までのかながその字の読み
// **読み仮名（yomi）は書き下しに出ないので直せない。** ここで直るのは送り仮名だけで、
// 読みの誤りは yomi-check.js に任せる。
// 順序・かなで書くかどうかの判断が違っていれば割り直しは失敗する（＝黙って通らない）。
// **kana フラグも申告を信じない。**「その字が書き下しに漢字で出ているか」で決める
// （勿かれ／なかれ・与に／ともに・耳／のみ のように、かなで書いておきながら kana:false を
// 立てている行が多い）。
//
// **かなで書く字の送り仮名は奪わない。** 「説かず」の「か」が動詞の未然形で「ず」が「不」だ、
// という切れ目は書き下しには出ていない＝機械には決められない。だからかなで書く字は
// 申告の読みを**尻から**当て、残りを漢字の字の送り仮名にする。
// 当たらなければ割り直しをあきらめる（＝人が見る行として落とす）。
const KANJI = /[㐀-鿿]/;
const allKana = s => !KANJI.test(s);
function resplit(reading, kd){
  // 1) 書き下しに漢字で出る字を、左から貪欲に決める
  let p = 0;
  const at = reading.map(r => {
    const e = kd.indexOf(r.c, p);
    if (e >= 0 && allKana(kd.slice(p, e))){ p = e + 1; return e; }
    return -1;
  });
  // 2) 漢字で区切り、あいだのかなを配る
  const text = new Array(reading.length).fill(null);
  let cur = 0, i = 0;
  while (i < reading.length){
    if (at[i] >= 0 && cur !== at[i]) return null;   // 漢字の直前にかなが余る＝割り切れない
    const start = at[i] >= 0 ? at[i] + 1 : cur;
    let j = i + 1;
    while (j < reading.length && at[j] < 0) j++;
    const end = j < reading.length ? at[j] : kd.length;
    let seg = kd.slice(start, end);
    if (!allKana(seg)) return null;
    const tail = [];
    for (let k = j - 1; k > i; k--){                // 後ろのかな字は申告どおり尻から当てる
      const t = (reading[k].yomi || '') + (reading[k].okuri || '');
      if (!t || !seg.endsWith(t)) return null;
      seg = seg.slice(0, seg.length - t.length);
      tail.unshift(t);
    }
    text[i] = seg;
    tail.forEach((t, n) => { text[i + 1 + n] = t; });
    cur = end; i = j;
  }
  if (cur !== kd.length || text.some(t => t === null)) return null;
  return reading.map((r, i) => {
    if (at[i] >= 0) return Object.assign({}, r, { kana: false, okuri: text[i] });
    // かなで書く字は読みと送りの境目が書き下しに出ない。申告の読みが頭にあればそれを残す
    const keep = r.yomi && text[i].indexOf(r.yomi) === 0 ? r.yomi : '';
    return Object.assign({}, r, { kana: true, yomi: keep, okuri: text[i].slice(keep.length) });
  });
}

// ---- 取り込み ---------------------------------------------------------------
const list = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const existing = new Set(texts.problems.map(p => p.tokens.map(t => t.c).join('')));
const out = [], bad = [], soft = [], mended = [], suspect = [];

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

  // 送り仮名の割り方は書き下しから決まるので、割り直せるなら割り直す（上の resplit を参照）。
  // 正しく割れている行に当てても同じ結果になるので、常に通してよい
  if (e.kakikudashi){
    const fixed = resplit(e.reading, norm(e.kakikudashi));
    if (fixed){
      const n = fixed.filter((r, i) => r.okuri !== (e.reading[i].okuri || '')).length;
      if (n) mended.push(id + ': 送り仮名を書き下しから割り直した（' + n + '字）');
      e.reading = fixed;
    }
  }
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
    if (at < 0){
      // 白文の余った字を並べる。**字体の対応表の抜けはここで炙り出す**
      // （返ってきた「氷」に対して白文が「冰」のまま、など。実際に6字見つかった）
      const left = chars.filter((c, i) => !used.has(i) && !placed.has(c)).join('');
      NG('reading の「' + r.c + '」が白文「' + haku + '」に見当たらない。' +
         'まだ読んでいない字は「' + left + '」（字体の対応表の抜けでないか確かめる）');
      broke = true; break;
    }
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

  // 読み仮名が送り仮名の頭と重なっていないか（来「きた」＋「タル」で「きたたる」）。
  // **書き下しには出ないので割り直しでは直らない。** yomi-check.js が収録後に捕まえるが、
  // ここで出しておけば収録前に直せる。助詞が続く形（魚「うを」＋「を」）は本物ではないので、
  // 落とさずに知らせるだけにする
  (e.reading || []).forEach(r => {
    const yy = r.yomi || '', o = r.okuri || '';
    if (yy && o && yy.slice(-1) === o[0]) suspect.push(id + ' ' + r.c + '「' + yy + '」＋「' + o + '」');
  });

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

if (suspect.length){
  console.log('-- 読みと送りが重なっている疑い（' + suspect.length + '件・助詞が続く形なら正しい）--');
  suspect.forEach(m => console.log('  ' + m));
  console.log('');
}
if (mended.length){
  console.log('-- 送り仮名を割り直した行（' + mended.length + '件）--');
  mended.forEach(m => console.log('  ' + m));
  console.log('');
}
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
