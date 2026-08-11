'use strict';
/*
 * kanbun.js — 「返り点でみる漢文」中核ロジック（DOM 非依存の純粋ロジック）
 *
 * 設計書: ../DESIGN_kanbun.md
 * 原則1: 訓点の表記は比べず、訓点から計算した「読み順」を比べる（採点の心臓部）。
 *
 * トークンの形（texts.json）:
 *   { c:'思', yomi:'おも', okuri:'ハ', mark:[{lv:1,n:1}] }
 *   mark 要素: {lv,n} = 返り点の階層と番号（lv1=一二三 / lv2=上中下 / lv3=甲乙丙 / lv4=天地人）
 *              {re:true} = レ点（直後の読み字のすぐ後に読む）。compound（一レ等）は併記する
 *   role:'placed'  = 置き字（読まない。働きは前の字の okuri に現れる）
 *   kana:true      = 書き下しで仮名書きする字（不→ず、之→の など）
 *   reread:{first:{yomi,okuri},second:{yomi,okuri,kana}} = 再読文字（order に2回現れる）
 *   join:true      = 熟語返り（ハイフン）。次の読み字と連結して1語として読む
 */
const Kanbun = (() => {

  // ---- 基本判定 ----------------------------------------------------------
  const isPlaced = t => t.role === 'placed';
  const marksOf  = t => Array.isArray(t.mark) ? t.mark : [];
  const numMarks = t => marksOf(t).filter(m => typeof m.lv === 'number');
  const hasRe    = t => marksOf(t).some(m => m.re === true);
  const isReread = t => !!t.reread;

  function prevReadable(tokens, i){
    for (let j = i - 1; j >= 0; j--) if (!isPlaced(tokens[j])) return j;
    return -1;
  }
  function nextReadable(tokens, i){
    for (let j = i + 1; j < tokens.length; j++) if (!isPlaced(tokens[j])) return j;
    return -1;
  }
  // 熟語返りの後続字（読みの主体は先頭字が持つ）
  function followerFlags(tokens){
    const f = new Array(tokens.length).fill(false);
    for (let i = 0; i < tokens.length; i++){
      if (tokens[i].join){
        const nx = nextReadable(tokens, i);
        if (nx >= 0) f[nx] = true;
      }
    }
    return f;
  }

  // ---- 読み順の計算（本アプリの isomorphic() に相当） ----------------------
  // 左から1回走査＋保留。レ点は「直後の読み字が読まれた直後」に隣接で解放し、
  // 番号つき返り点は「番号1の字が読まれたとき」にレベルごとの保留から昇順で解放する。
  function readOrder(tokens){
    const out = [];
    const waiting = new Array(tokens.length).fill(false);
    const follower = followerFlags(tokens);
    const pending = new Map(); // lv -> [{i,n}]

    function emit(i){
      out.push(i);
      waiting[i] = false;
      // 熟語返り: 連結された後続字をそのまま続けて読む
      let k = i;
      while (tokens[k] && tokens[k].join){
        const nx = nextReadable(tokens, k);
        if (nx < 0) break;
        out.push(nx);
        waiting[nx] = false;
        k = nx;
      }
      // レ点: 直前の読み字がレ点で待っていれば、続けてその字を読む
      const p = prevReadable(tokens, i);
      if (p >= 0 && waiting[p] && hasRe(tokens[p])) emit(p);
      // この字が持つ「番号1」の印: そのレベルの保留を内側（小さい lv）から解放
      const ones = numMarks(tokens[i]).filter(m => m.n === 1).sort((a,b) => a.lv - b.lv);
      for (const m of ones) release(m.lv);
    }
    function release(lv){
      const q = pending.get(lv);
      if (!q) return;
      while (q.length){
        q.sort((a,b) => a.n - b.n);
        emit(q.shift().i);
      }
    }
    function hold(i){
      waiting[i] = true;
      // レ点持ちは隣接で解放されるので保留行列には積まない（一レ等の番号は emit 時に効く）
      if (!hasRe(tokens[i])){
        const m = numMarks(tokens[i]).sort((a,b) => a.lv - b.lv)[0];
        if (!pending.has(m.lv)) pending.set(m.lv, []);
        pending.get(m.lv).push({ i, n: m.n });
      }
    }

    for (let i = 0; i < tokens.length; i++){
      const t = tokens[i];
      if (isPlaced(t) || follower[i]) continue;
      const nums = numMarks(t).sort((a,b) => a.lv - b.lv);
      if (isReread(t)){
        // 再読文字: 1回目はその場で読み、返り点は2回目のために働く
        out.push(i);
        if (nums.length || hasRe(t)) hold(i);
        continue;
      }
      if (hasRe(t)) { hold(i); continue; }
      if (!nums.length || nums[0].n === 1) { emit(i); continue; }
      hold(i);
    }
    return out;
  }

  // ---- 書き下し文の生成 ---------------------------------------------------
  const KATA2HIRA = s => String(s || '').replace(/[ァ-ヶ]/g,
    c => String.fromCharCode(c.charCodeAt(0) - 0x60));

  function tokenReading(t, nth){
    if (t.reread){
      const r = (nth === 2) ? t.reread.second : t.reread.first;
      return r.kana ? KATA2HIRA((r.yomi || '') + (r.okuri || ''))
                    : t.c + KATA2HIRA(r.okuri || '');
    }
    if (t.kana) return KATA2HIRA((t.yomi || '') + (t.okuri || ''));
    return t.c + KATA2HIRA(t.okuri || '');
  }

  function toKakikudashi(tokens, order){
    const seen = new Map();
    let s = '';
    for (const i of order){
      const n = (seen.get(i) || 0) + 1;
      seen.set(i, n);
      s += tokenReading(tokens[i], n);
    }
    return s;
  }

  // ---- 仮名の正規化（歴史的仮名遣い・現代仮名遣いの両方を正解にする） ------
  function normalizeKana(s){
    let t = KATA2HIRA(s);
    t = t.replace(/[\s、。，．・「」『』（）()？！?!]/g, '');
    t = t.replace(/ゐ/g,'い').replace(/ゑ/g,'え').replace(/を/g,'お')
         .replace(/ぢ/g,'じ').replace(/づ/g,'ず');
    return t;
  }
  const HGYO = { 'は':'わ', 'ひ':'い', 'ふ':'う', 'へ':'え', 'ほ':'お' };
  // ハ行転呼の近似: 文字列先頭以外のハ行を転呼させる（両辺に同じ処理をかけて比較する）
  const transposeHagyo = s => s.replace(/(?!^)[はひふへほ]/g, c => HGYO[c]);
  function kanaEquals(a, b){
    const na = normalizeKana(a), nb = normalizeKana(b);
    return na === nb || transposeHagyo(na) === transposeHagyo(nb);
  }
  function matchesKakikudashi(input, problem){
    if (kanaEquals(input, problem.kakikudashi)) return true;
    return (problem.acceptable || []).some(a => kanaEquals(input, a));
  }

  // ---- 採点 ---------------------------------------------------------------
  function canonMarks(mark){
    return (mark || []).map(m => m.re ? 're' : (m.lv + '-' + m.n)).sort().join(',');
  }
  const sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // userMarks: トークン番号ごとの mark 配列。訓点以外（置き字・再読・熟語返り）は問題データの構造を使う
  function grade(userMarks, problem){
    const toks = problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      c.mark = (userMarks && userMarks[i]) ? userMarks[i] : [];
      return c;
    });
    const got = readOrder(toks);
    const want = problem.order;
    if (sameArray(got, want)){
      const same = problem.tokens.every((t, i) =>
        isPlaced(t) || canonMarks(t.mark) === canonMarks(toks[i].mark));
      return { status: same ? 'ok' : 'variant', order: got };
    }
    let k = 0;
    while (k < got.length && k < want.length && got[k] === want[k]) k++;
    let message;
    if (k >= got.length && k < want.length){
      message = (k + 1) + '番目以降が読まれていません（「' + toks[want[k]].c + '」に戻れていません）';
    } else if (k < got.length && k >= want.length){
      message = '「' + toks[got[k]].c + '」を読みすぎています';
    } else {
      message = (k + 1) + '番目に「' + toks[got[k]].c + '」を読んでいますが、正しくは「' + toks[want[k]].c + '」です';
    }
    return { status: 'wrong', order: got, expected: want, divergeAt: k, message };
  }

  // ---- 難易度の自動算出（手書きの level は持たない） -----------------------
  const KUHO_DIFF = { hitei:1, shieki:2, ukemi:2, gimon:2, eitan:2, sentaku:2,
                      hango:3, hikaku:3, katei:3, gentei:3, yokuyo:4 };
  function difficulty(p){
    let d = p.tokens.length / 4;
    let maxLv = 0, reread = false, placed = false, join = false;
    for (const t of p.tokens){
      for (const m of marksOf(t)) maxLv = Math.max(maxLv, m.re ? 1 : m.lv);
      if (t.reread) reread = true;
      if (isPlaced(t)) placed = true;
      if (t.join) join = true;
    }
    d += maxLv * 2 + (reread ? 3 : 0) + (placed ? 1 : 0) + (join ? 1 : 0);
    for (const k of (p.kuho || [])) d += KUHO_DIFF[k] || 0;
    return Math.round(d * 10) / 10;
  }

  // ---- 送り仮名の候補づくり（書き下し練習 K2 用） --------------------------
  // 設計: docs/DESIGN_kudashi_input.md 論点1。
  // **候補はデータから導出する**（字ごとの読み表は持たない）。
  // 表を持つと texts.json と食い違ったときにどちらが正か機械が決められず、
  // このリポジトリの「二重帳簿で正しさを担保する」やり方と噛み合わないため。

  // 活用の系列。日本語文法の閉じた知識なのでコード側に置く（作品データではない）
  const OKURI_FAMILY = [
    ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],                        // ハ行四段
    ['ズ', 'ザル', 'ザレバ', 'ザリ', 'ヌ', 'ネ'],           // 打消
    ['シ', 'キ', 'ク', 'カラ', 'カリ', 'ケレバ'],           // 形容詞
    ['ス', 'スル', 'スレバ', 'セ', 'シテ'],                 // サ変
    ['ル', 'ラ', 'リ', 'レ', 'ラン'],                       // ラ行
    ['テ', 'ニシテ', 'トモ', 'ドモ', 'バ', 'レバ'],         // 接続
    ['シム', 'シメ', 'シムル', 'シメバ', 'ヲシテ'],         // 使役
    ['ヲ', 'ニ', 'ハ', 'ノ', 'ト', 'ヨリ']                  // 助詞
  ];
  // corpus に用例が乏しいときの埋め草（送り仮名を持たないトークンが約1/3あるので「なし」は必ず入れる）
  const OKURI_COMMON = ['ヲ', 'ニ', 'ハ', 'ノ', 'ズ', ''];

  // 再読文字は9字で閉じているのでここだけ表を持つ（corpus には4字しか出ず導出できない）
  const REREAD_PRESETS = {
    '未': { first: 'ダ',   second: 'ズ' },
    '将': { first: 'ニ',   second: 'ントス' },
    '且': { first: 'ニ',   second: 'ントス' },
    '当': { first: 'ニ',   second: 'ベシ' },
    '応': { first: 'ニ',   second: 'ベシ' },
    '宜': { first: 'シク', second: 'ベシ' },
    '須': { first: 'ベカラク', second: 'ベシ' },
    '猶': { first: 'ホ',   second: 'ゴトシ' },
    '盍': { first: 'ゾ',   second: 'ザル' }
  };

  // 送り仮名を問えるカード（置き字は問わない。送り仮名を持つものだけ）
  function askableOkuri(tokens){
    const out = [];
    tokens.forEach((t, i) => {
      if (isPlaced(t)) return;
      if (t.reread){
        if (t.reread.first && t.reread.first.okuri)  out.push({ i, nth: 1 });
        if (t.reread.second && t.reread.second.okuri) out.push({ i, nth: 2 });
        return;
      }
      if (t.okuri) out.push({ i, nth: 1 });
    });
    return out;
  }

  const okuriOf = (t, nth) => t.reread
    ? ((nth === 2 ? t.reread.second : t.reread.first) || {}).okuri || ''
    : (t.okuri || '');

  // 実際に問うカードを選ぶ。**全部は問わない**（設計 論点3。
  // 毎回フル組み立ては作業になって離脱要因になる、という既存の知見に合わせる）。
  // 実データでは問える枚数が最大8枚あるので上限を課す。読む順に前から選ぶので、
  // 文の頭から順に埋まっていき、途中だけ穴が空くことがない。
  function pickAskable(problem, limit){
    const all = askableOkuri(problem.tokens);
    const max = (limit === undefined) ? 5 : limit;
    if (all.length <= max) return all;
    const pos = new Map();               // 読み順での位置を持たせて、前から選ぶ
    const seen = new Map();
    problem.order.forEach((i, k) => {
      const nth = (seen.get(i) || 0) + 1;
      seen.set(i, nth);
      pos.set(i + ':' + nth, k);
    });
    return all.slice()
      .sort((a, b) => (pos.get(a.i + ':' + a.nth) || 0) - (pos.get(b.i + ':' + b.nth) || 0))
      .slice(0, max);
  }

  // 決定的なシャッフル（Math.random を使わない。テストで並びを固定できるようにするため）
  function seededOrder(n, seed){
    let h = 0;
    for (let k = 0; k < seed.length; k++) h = (h * 31 + seed.charCodeAt(k)) >>> 0;
    const idx = [];
    for (let k = 0; k < n; k++) idx.push(k);
    for (let k = n - 1; k > 0; k--){
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (k + 1);
      const tmp = idx[k]; idx[k] = idx[j]; idx[j] = tmp;
    }
    return idx;
  }

  // その位置の送り仮名を cand に差し替えた文が、正解の書き下しとして通ってしまうか
  function okuriIsAccidentallyRight(problem, i, nth, cand, answer){
    if (normalizeKana(cand) === normalizeKana(answer)) return true;
    const toks = problem.tokens.map((t, k) => {
      if (k !== i) return t;
      const c = Object.assign({}, t);
      if (c.reread){
        c.reread = Object.assign({}, c.reread);
        const side = (nth === 2) ? 'second' : 'first';
        c.reread[side] = Object.assign({}, c.reread[side], { okuri: cand });
      } else {
        c.okuri = cand;
      }
      return c;
    });
    return matchesKakikudashi(toKakikudashi(toks, problem.order), problem);
  }

  // 送り仮名の選択肢を作る。problems は corpus 全体（同じ字の他の用例を借りるため）
  function okuriChoices(problems, problem, i, nth){
    const t = problem.tokens[i];
    const answer = okuriOf(t, nth);
    const pool = [];
    const push = v => {
      if (v === undefined || v === null) return;
      if (pool.some(x => normalizeKana(x) === normalizeKana(v))) return;
      pool.push(v);
    };

    // 0. データ側で候補を指定したいときの逃げ道（今は使っていない）
    if (Array.isArray(t.decoy)) t.decoy.forEach(push);

    // 1. 再読文字は閉じた表から
    if (t.reread && REREAD_PRESETS[t.c]){
      const p = REREAD_PRESETS[t.c];
      push(nth === 2 ? p.first : p.second);   // もう一方の読みを混ぜる（取り違えを突く）
    }
    // 2. 正解が属する活用系列から
    for (const fam of OKURI_FAMILY){
      if (fam.some(v => normalizeKana(v) === normalizeKana(answer))) fam.forEach(push);
    }
    // 3. 同じ字の corpus 内の他の用例
    for (const p of problems){
      for (const tk of p.tokens){
        if (tk.c !== t.c) continue;
        if (tk.reread){ push((tk.reread.first || {}).okuri); push((tk.reread.second || {}).okuri); }
        else push(tk.okuri);
      }
    }
    // 4. 埋め草
    OKURI_COMMON.forEach(push);

    // 偶然正解になる肢を落とす（L2 の誤答肢生成と同じ原則を仮名の層に移したもの）
    const wrongs = pool.filter(c => !okuriIsAccidentallyRight(problem, i, nth, c, answer));
    const seed = problem.id + ':' + i + ':' + nth;
    const picked = seededOrder(wrongs.length, seed).slice(0, 3).map(k => wrongs[k]);
    const all = picked.concat([answer]);
    const order = seededOrder(all.length, seed + ':a');
    return { answer, choices: order.map(k => all[k]) };
  }

  // 読みの採点。**合否は文全体で見る**（カード単位だと現代仮名遣いが落ちる。設計 論点2）
  // inputs は { 'i:nth': 送り仮名 } の形。未入力のキーはデータの値で埋める
  function gradeReadings(problem, inputs){
    const toks = problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      if (c.reread){
        c.reread = Object.assign({}, c.reread);
        [1, 2].forEach(n => {
          const key = i + ':' + n;
          if (!(key in inputs)) return;
          const side = (n === 2) ? 'second' : 'first';
          c.reread[side] = Object.assign({}, c.reread[side], { okuri: inputs[key] });
        });
      } else if ((i + ':1') in inputs){
        c.okuri = inputs[i + ':1'];
      }
      return c;
    });
    const got = toKakikudashi(toks, problem.order);
    if (got === problem.kakikudashi) return { status: 'ok', kakikudashi: got };
    // variant の由来を分けて返す（UI の文言が変わる）:
    //   kana       = 表記だけの違い（現代仮名遣いなど）。読み方は標準形と同じ
    //   acceptable = 訓読の流派差として登録した別解（温ねて/温めて など）
    if (kanaEquals(got, problem.kakikudashi)) return { status: 'variant', via: 'kana', kakikudashi: got };
    if ((problem.acceptable || []).some(a => kanaEquals(got, a))){
      return { status: 'variant', via: 'acceptable', kakikudashi: got };
    }
    return { status: 'wrong', kakikudashi: got, divergeAt: firstDivergentCard(problem, inputs) };
  }

  // 何枚目のカードで初めて食い違うか（赤く塗る位置を決めるためだけに使う。合否には関与しない）
  function firstDivergentCard(problem, inputs){
    const seen = new Map();
    for (let pos = 0; pos < problem.order.length; pos++){
      const i = problem.order[pos];
      const nth = (seen.get(i) || 0) + 1;
      seen.set(i, nth);
      const key = i + ':' + nth;
      if (!(key in inputs)) continue;
      const t = problem.tokens[i];
      if (!kanaEquals(inputs[key], okuriOf(t, nth))) return pos;
    }
    return -1;
  }

  // acceptable の別解が「カードの並びと漢字」に合っているか。
  // 書き下し練習では語順と漢字はカードで固定されるので、別解が変えてよいのは
  // 送り仮名（かな部分）だけ。読む順に漢字を拾った正規表現に落とし込んで照合する。
  // これに通らない別解は K3 でどう入力しても到達できない＝データの誤り。
  function acceptableShapeOk(p, s){
    const seen = new Map();
    let re = '^[\\u3041-\\u3096]*';
    for (const i of p.order){
      const t = p.tokens[i];
      const nth = (seen.get(i) || 0) + 1;
      seen.set(i, nth);
      let kanji = null;
      if (t.reread){
        const r = nth === 2 ? t.reread.second : t.reread.first;
        if (r && !r.kana) kanji = t.c;
      } else if (!t.kana){
        kanji = t.c;
      }
      if (kanji) re += kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\u3041-\\u3096]*';
    }
    return new RegExp(re + '$').test(s);
  }

  // ---- 二重帳簿の検査（テスト・監査用） -----------------------------------
  function validateProblem(p){
    const errs = [];
    const got = readOrder(p.tokens);
    if (!sameArray(got, p.order)){
      errs.push('読み順が一致しない: 計算=' + JSON.stringify(got) + ' 登録=' + JSON.stringify(p.order));
    }
    const gen = toKakikudashi(p.tokens, p.order);
    if (gen !== p.kakikudashi){
      errs.push('書き下しが一致しない: 生成=' + gen + ' 登録=' + p.kakikudashi);
    }
    const need = p.tokens.map(t => isPlaced(t) ? 0 : (t.reread ? 2 : 1));
    const cnt = new Array(p.tokens.length).fill(0);
    for (const i of p.order) cnt[i]++;
    cnt.forEach((c, i) => {
      if (c !== need[i]) errs.push('トークン' + i + '「' + p.tokens[i].c + '」の読み回数が ' + c + '（期待 ' + need[i] + '）');
    });
    // acceptable（訓読の流派差の別解）。K3 の自由入力を受け止める唯一の仕組みなので、
    // 壊れた別解・無意味な別解をここで止める
    if (p.acceptable !== undefined){
      if (!Array.isArray(p.acceptable)){
        errs.push('acceptable が配列でない');
      } else {
        const seenAcc = new Set();
        for (const a of p.acceptable){
          if (typeof a !== 'string' || !a){ errs.push('acceptable に空要素がある'); continue; }
          const na = normalizeKana(a);
          if (seenAcc.has(na)) errs.push('acceptable が重複: ' + a);
          seenAcc.add(na);
          if (kanaEquals(a, p.kakikudashi)) errs.push('acceptable「' + a + '」は標準形と同一視される（登録不要）');
          else if (!acceptableShapeOk(p, a)) errs.push('acceptable「' + a + '」がカードの並び・漢字と合わない（K3 で到達できない）');
        }
      }
    }
    return errs;
  }

  return { readOrder, toKakikudashi, tokenReading, grade, difficulty,
           normalizeKana, kanaEquals, matchesKakikudashi, validateProblem,
           canonMarks, isPlaced, marksOf, numMarks, hasRe, isReread,
           prevReadable, nextReadable,
           OKURI_FAMILY, REREAD_PRESETS,
           askableOkuri, pickAskable, okuriOf, okuriChoices, gradeReadings, firstDivergentCard };
})();

if (typeof module !== 'undefined') module.exports = Kanbun;
if (typeof window !== 'undefined') window.Kanbun = Kanbun;   // const は window に乗らない
