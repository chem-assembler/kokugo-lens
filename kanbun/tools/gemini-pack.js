'use strict';
/*
 * gemini-pack.js — 台帳の未収録行から、Gemini へ投げる依頼パックを組み立てる。
 *   使い方: node kanbun/tools/gemini-pack.js <接頭> [1束の行数=30]
 *           例: node kanbun/tools/gemini-pack.js S 36
 *   出力: docs/gemini-pack-kanbun-<接頭>-<番号>.md （そのまま Gemini に貼れる自己完結の本文）
 *
 * ## 何を任せて、何を任せないか
 * **任せる**: 白文 → 書き下し・読み仮名・句法・意味（漢文訓読の知識が要る部分）
 * **任せない**: 返り点の符号づけ（レ点／一二三／上下／一レ）と order（このアプリの
 *              エンジンの規則そのもので、外から当てにいくと外れるだけ）。
 *              書き下しが決まれば返り点は機械的に組めるので、こちらで組む
 *
 * ## なぜ課題を機械で切り出すか
 * 台帳の白文を人が写すと、字を取り違える。実際に3回起きている（羞→翞・辨→辯・衰→衅）。
 * 台帳から直接読み、字体の正規化も kyujitai.js を通すので、写し間違いが入らない。
 * 収録済みの行も同じ判定で落とすので、すでにある問題を二度作らせずに済む。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { norm, catalogText: cat } = require('./kyujitai.js');
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'kanbun', 'texts.json'), 'utf8'));

const PREFIX = (process.argv[2] || '').toUpperCase();
const CHUNK = Number(process.argv[3] || 30);
if (!/^[A-Z]+$/.test(PREFIX)){
  console.error('使い方: node kanbun/tools/gemini-pack.js <接頭 K|S|H|P|B> [1束の行数]');
  process.exit(2);
}
const NAME = { K: '故事成語', S: '思想', H: '史伝', P: '漢詩', B: '文章' }[PREFIX] || PREFIX;

// ---- 台帳の表を読む。**列の並びは節ごとに違う**ので直前の見出し行から引く -----
const have = texts.problems.map(p => p.tokens.map(t => t.c).join(''));
const isDone = h => have.includes(h) || have.some(k => k.length >= 4 && h.indexOf(k) >= 0);

let cols = null;
const rows = [];
for (const line of cat.split('\n')){
  const c = line.split('|').map(x => x.trim());
  if (/^\|\s*ID\s*\|/.test(line)){ cols = c; continue; }
  if (!cols || !new RegExp('^\\| ' + PREFIX + '-[0-9]').test(line) || c.length < 5) continue;
  const at = name => cols.findIndex(x => x.indexOf(name) === 0);
  const get = name => { const i = at(name); return i >= 0 ? (c[i] || '') : ''; };
  const where = get('篇') || get('章') || get('出典');
  const hint = get('句法'), rank = get('定番度');
  const raw = get('白文');
  // 漢詩は1つのセルに「**詩題**（作者・詩形）句／句／句」が入っている。句ごとに割る
  if (PREFIX === 'P'){
    const head = (raw.match(/^\*\*(.+?)\*\*（(.+?)）/) || []);
    const body = raw.replace(/^\*\*.+?\*\*（.+?）/, '');
    body.split('／').map(s => s.trim()).filter(Boolean).forEach((ku, i) => {
      const h = norm(ku);
      if (!h || isDone(h)) return;
      rows.push({ id: c[1] + '-' + (i + 1), haku: h, where: (head[1] || '') + '（' + (head[2] || '') + '）', hint, rank });
    });
    continue;
  }
  const h = norm(raw);
  if (!h || isDone(h)) continue;
  rows.push({ id: c[1], haku: h, where, hint, rank });
}

if (!rows.length){ console.log(PREFIX + ' 系に未収録の行はありません'); process.exit(0); }

// ---- 手本は実データから引く（作り話の例を書かない）-------------------------
const SAMPLES = ['rongo-manabite', 'kobyu-hashiru', 'chosan-imada']
  .map(id => texts.problems.find(p => p.id === id)).filter(Boolean);
const hira = s => String(s).replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const sampleBlock = SAMPLES.map(p => {
  const reading = p.order.map((i, n) => {
    const t = p.tokens[i], nth = p.order.slice(0, n).filter(x => x === i).length + 1;
    const r = t.reread ? (nth === 2 ? t.reread.second : t.reread.first) : t;
    return { c: t.c, yomi: hira(r.yomi || ''), okuri: hira(r.okuri || ''), kana: !!(t.reread ? r.kana : t.kana) };
  });
  return JSON.stringify({
    id: p.id, reading, kakikudashi: p.kakikudashi,
    placed: p.tokens.filter(t => t.role === 'placed').map(t => t.c),
    reread: p.tokens.filter(t => t.reread).map(t => t.c),
    kuho: p.kuho, meaning: p.meaning, confidence: '高', note: ''
  });
}).join(',\n ');

const HEAD = `# Gemini 依頼パック: 漢文の白文に「標準的な訓読」を当てる（${NAME}・{{N}}／{{T}}）

## これは何の作業か

漢文学習アプリ **「返り点でみる漢文」**（https://koku.schoollenz.com/kanbun/ ／ 現在 ${texts.problems.length} 問）
に問題を足している。アプリは**白文に返り点を打って読む順を作る**練習をさせるもので、
1問＝1文（4〜15字）。

素材の**白文（原文の漢字列）は用意してある**。これはパブリックドメインの古典なので自由に使える。
足りないのは、その白文に対する **① 書き下し文 ② 読み仮名 ③ 句法の分類 ④ 意味**。

**この作業が Gemini に向いている理由**: 判断より事実の確定が主だから。
「この白文は、日本の漢文訓読でどう読むのが標準か」は、資料に当たれば決まる。

### 返り点は書かなくてよい

返り点（レ点・一二点・上下点）と読む順は**こちらで機械的に組む**。
**書き下し文が決まれば返り点は一意に決まる**ので、そこは任せない
（アプリ固有のエンジンの規則があり、外から当てにいくと外れるだけ）。

---

## 絶対の制約

- **特定の教科書・参考書・問題集の本文や解説を書き写さない。**
  現代の編者が付けた訓読は編者の著作物になり得る。**複数の資料で共通している標準的な訓読**を
  確かめたうえで、**自分のことばで組み立てて**書くこと
- **推測を事実として書かない。** 訓読が資料によって割れる行、自信のない行は
  \`"confidence": "低"\` にして \`note\` に**何がどう割れるか**を書く。**空欄で出さず、必ず1行は返す**
- **確実な1件のほうが、あやしい5件より価値がある。** 迷ったものは低い自信で正直に出す。
  こちらで落とすので、無理に確からしく見せかけないこと

---

## 出してほしいもの（1行につき1オブジェクト・JSON配列で）

| キー | 中身 |
|---|---|
| \`id\` | 課題表の ID をそのまま |
| \`reading\` | **読む順に並べた字の配列**（下で詳述）。ここが本体 |
| \`kakikudashi\` | 書き下し文。**句読点を入れない**。\`reading\` から組み立てたものと一致すること |
| \`placed\` | **置き字**（読まない字）の配列。無ければ \`[]\` |
| \`reread\` | **再読文字**の字の配列（\`reading\` に2回出てくる字）。無ければ \`[]\` |
| \`kuho\` | 句法タグの配列（下表から。当てはまらなければ \`[]\`） |
| \`meaning\` | 現代日本語の意味。1〜2文 |
| \`confidence\` | \`"高"\` / \`"中"\` / \`"低"\` |
| \`note\` | 訓読が割れる点・注意点。無ければ \`""\` |

### \`reading\` の形 — ここがいちばん大事

**白文の字を「日本語で読む順」に並べ替えた配列**。要素は次の4つを持つ。

| キー | 中身 |
|---|---|
| \`c\` | 白文の字そのもの（1字） |
| \`yomi\` | その字の読み（ひらがな・歴史的仮名遣い）。送り仮名は含めない |
| \`okuri\` | 送り仮名（ひらがな）。無ければ \`""\` |
| \`kana\` | **書き下しでその字をひらがなで書くなら \`true\`**（不→「ず」・之→「の」・乎→「や」・可→「べし」）。漢字のまま書くなら \`false\` |

- **置き字は \`reading\` に入れない**（読まない字だから）
- **再読文字は2回入れる**。1回目「まさに」2回目「んとす」のように読みが変わる
- \`kakikudashi\` は \`reading\` を頭から連結したもの。
  \`kana\` が \`true\` なら \`yomi + okuri\`、\`false\` なら \`c + okuri\` を連ねる。**必ず一致させること**
- \`c\` は白文にある字だけ。**白文にない字を足さない**

### 書き方の規則（ここを外すと機械検査に落ちる）

1. **歴史的仮名遣い**で書く（おもふ／かならず／あやふし／なんぢ／いへども）
2. **置き字は書き下しに出さない。** 「而」「於」「于」「矣」「焉」「兮」は、
   文中の働きだけを担って読まないことが多い。ただし**文頭の「而」は「しかも／しかして」と読む**し、
   「焉」が疑問詞「いづくにか」になることもある。**位置で決まる**ので、その行ごとに判断すること
3. **文末の「也」は「なり」と読む**のを既定にする（このアプリの既存データの多数派）。
   禁止「〜なかれ」など「なり」が付かない文では**置き字**にしてよい
4. **再読文字は9字**（未・将・且・当・応・宜・須・猶／由・盍）。
   **字が同じでも再読とはかぎらない**（「将」が動詞「ひきゐる」、「方」は再読ではない）。
   再読なら \`reread\` に1度目と2度目の読みを入れ、\`kakikudashi\` にも両方を書く
5. **送り仮名は漢字にくっつけて書く**。「学びて」なら「学」＋「びて」
6. 白文にない漢字を足さない。読みの都合で漢字を変えない

### 句法タグ（この11個以外は使わない）

\`hitei\`否定 / \`shieki\`使役 / \`ukemi\`受身 / \`gimon\`疑問 / \`eitan\`詠嘆 / \`sentaku\`選択 /
\`hango\`反語 / \`hikaku\`比較 / \`katei\`仮定 / \`gentei\`限定 / \`yokuyo\`抑揚

**再読文字と置き字はタグではない**（\`reread\` \`placed\` で表す）。
疑問と反語は形が同じで見分けにくい。**答えを求めていれば疑問、逆の意味を言いたいだけなら反語**。

---

## 手本（すべて実際に収録済みのデータ）

\`\`\`json
[${'\n ' + sampleBlock}
]
\`\`\`

- 1つ目「学而不思則罔」… 「而」が置き字なので \`reading\` に入っていない。
  「不」は \`kana:true\` なので書き下しでは「ざれば」だけが出る。
  \`reading\` の並びが白文の並び（学而不思則罔）と違う＝これが「返り点で戻る」ということ
- 2つ目「百獣之見我而敢不走乎」… 「〜んや」で結ぶ反語。文末の「乎」は読む（\`kana:true\` で「や」）
- 3つ目「名実未虧而喜怒為用」… 再読文字「未」が \`reading\` に2回出ていて、
  1回目は「いまだ」（\`kana:false\` なので「未だ」と漢字で出る）、2回目は「ずして」（\`kana:true\`）

---

## 出力の形

**JSON配列だけ**を1つのコードブロックで返すこと。前後に説明文は要らない。
課題表の全行を、**表の順に**、もれなく入れること。

---

## 課題（{{N}}／{{T}}・{{CNT}}行）

`;

const outDir = path.join(ROOT, 'docs');
const total = Math.ceil(rows.length / CHUNK);
const made = [];
for (let n = 0; n < total; n++){
  const part = rows.slice(n * CHUNK, (n + 1) * CHUNK);
  let body = '| ID | 白文（新字体・句読点なし） | 字数 | 出どころ | 台帳の手がかり |\n|---|---|---|---|---|\n';
  part.forEach(r => {
    body += '| ' + r.id + ' | ' + r.haku + ' | ' + [...r.haku].length + ' | ' + (r.where || '—') +
            ' | ' + (r.hint || '—').replace(/\|/g, '／') + ' |\n';
  });
  body += `
> 「台帳の手がかり」欄は**当方の下読みで、間違っていることがある**。
> 実際に前後の文脈に当たって確かめること。手がかりと違う結論になったら \`note\` に書く。
`;
  const md = HEAD.replace(/\{\{N\}\}/g, String(n + 1)).replace(/\{\{T\}\}/g, String(total))
                 .replace(/\{\{CNT\}\}/g, String(part.length)) + body;
  const f = path.join(outDir, 'gemini-pack-kanbun-' + PREFIX.toLowerCase() + '-' + (n + 1) + '.md');
  fs.writeFileSync(f, md, 'utf8');
  made.push(path.relative(ROOT, f) + '（' + part.length + '行）');
}
console.log(PREFIX + '系: 未収録 ' + rows.length + '行 → ' + total + '束');
made.forEach(m => console.log('  ' + m));
