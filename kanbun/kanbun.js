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
    return errs;
  }

  return { readOrder, toKakikudashi, tokenReading, grade, difficulty,
           normalizeKana, kanaEquals, matchesKakikudashi, validateProblem,
           canonMarks, isPlaced, marksOf, numMarks, hasRe, isReread };
})();

if (typeof module !== 'undefined') module.exports = Kanbun;
if (typeof window !== 'undefined') window.Kanbun = Kanbun;   // const は window に乗らない
