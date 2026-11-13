'use strict';
/*
 * kuho.js — 句法クイズ（設計書 §7）の UI とロジック
 *
 * 型データは kuho.json（句形を有限個の「型」として持つ。化学レンズの reactions.json と同型）。
 * 出題は3形式:
 *   (a) katachi … 型と実例（白文・書き下し）を見せて「何の句形か」を4択
 *   (b) blank   … 型の書き下しの一部を伏せて（○○）埋める4択
 *   (c) imi     … 意味の4択（紛らわしい対を意図的に並べる）
 *
 * 選択肢の重複判定は kanbun.js の仮名正規化に任せる（カタカナ・歴史的仮名遣いの揺れを吸収）。
 * ここは DOM の描画と入力だけを持ち、句形の知識はすべて kuho.json 側にある。
 */
(function(){
  const isNode = (typeof module !== 'undefined') && (typeof require === 'function');
  const K = isNode ? require('./kanbun.js') : window.Kanbun;
  // 正規化できない環境でも動くよう素通しのフォールバックを持つ
  const norm = s => (K ? K.normalizeKana(String(s)) : String(s));

  const BLANK_MARK = '○○';

  // DOM に触れない出題器。random は全 examples を再現可能に検査するため差し替えられる。
  function createQuiz(data, problems, random = Math.random){
    const TYPES = data.types || [];
    const byId = new Map(TYPES.map(t => [t.id, t]));
    const TEXTS = new Map((problems || []).map(p => [p.id, {
      id: p.id,
      hakubun: (p.tokens || []).map(t => t.c + (t.p || '')).join(''),
      kakikudashi: p.kakikudashi || '',
      work: (p.source || {}).work || '',
      chapter: (p.source || {}).chapter || '',
      meaning: p.meaning || '',
      kuho: p.kuho || []
    }]));

    function buildQuestion(kind, t){
      if (kind === 'blank'){
        return {
          kind: kind, type: t,
          prompt: '書き下しの ' + BLANK_MARK + ' に入るのはどれですか。',
          sub: '書き下し: ' + t.kakikudashi.replace(t.blank, BLANK_MARK),
          answer: t.blank,
          choices: buildBlankChoices(t)
        };
      }
      if (kind === 'imi'){
        return {
          kind: kind, type: t,
          prompt: 'この型の意味はどれですか。',
          sub: '書き下し: ' + t.kakikudashi,
          answer: t.meaning,
          choices: buildChoices(t, t.meaning, x => x.meaning)
        };
      }
      // 同じ白文パターンでも文脈で句形が変わるため、実例の読みも示す。
      const examples = (t.examples || []).map(id => {
        const info = TEXTS.get(id);
        if (!info) throw new Error('例文が見つかりません: ' + id);
        return info;
      });
      const example = examples.length ? pick(examples, random) : null;
      return {
        kind: 'katachi', type: t,
        example: example,
        prompt: example ? 'この文の句形はどれですか。' : 'この型は何の句形ですか。',
        sub: '目印になる字: ' + (t.markers || []).join('・'),
        answer: t.label,
        choices: buildChoices(t, t.label, x => x.label, example ? example.kuho : [])
      };
    }

    // 正解 + 紛らわしい対（confuse）を優先し、足りなければ他の型から補って4択にする
    function buildChoices(t, answer, get, excludedIds = []){
      const out = [answer];
      const seen = new Set([norm(answer)]);
      const add = v => {
        if (v == null) return;
        const n = norm(v);
        if (!n || seen.has(n) || out.length >= 4) return;
        seen.add(n); out.push(v);
      };
      // 問題が複数の型を含む場合、その型のラベルはどれも正解になり得る。
      // 正規化で同じラベルになる別 id からの混入も防ぐ。
      const excludedLabels = new Set(excludedIds.map(id => byId.get(id))
        .filter(o => o && o.id !== t.id).map(o => norm(get(o))));
      const addType = o => {
        if (o && o.id !== t.id && !excludedIds.includes(o.id) && !excludedLabels.has(norm(get(o)))) add(get(o));
      };
      (t.confuse || []).forEach(id => addType(byId.get(id)));
      shuffle(TYPES.slice(), random).forEach(addType);
      return shuffle(out, random);
    }

    // 空欄補充は誤答候補を型データ側で指定してある（自動生成だと別解が紛れ込むため）
    function buildBlankChoices(t){
      const out = [t.blank];
      const seen = new Set([norm(t.blank)]);
      const add = v => {
        if (v == null) return;
        const n = norm(v);
        if (!n || seen.has(n) || out.length >= 4) return;
        seen.add(n); out.push(v);
      };
      (t.blankNg || []).forEach(add);
      if (out.length < 4) shuffle(TYPES.slice(), random).forEach(o => { if (o.id !== t.id) add(o.blank); });
      return shuffle(out, random);
    }

    return { buildQuestion, texts: TEXTS };
  }

  if (isNode) { module.exports = { createQuiz }; return; }
  window.KanbunKuho = { createQuiz };
  const $ = id => document.getElementById(id);
  // test.html は出題器だけを利用する。
  if (!$('choices')) return;

  let CATS  = {};        // カテゴリキー -> 表示名
  let TYPES = [];        // 型の配列
  const byId = new Map();
  let quiz = null;
  let TEXTS = new Map(); // 問題ID -> 白文・書き下し・出典・訳・句形

  let filterCat = 'all'; // 絞り込み中のカテゴリ
  let kindPref  = 'mix'; // 出題形式の指定
  let current   = null;  // 出題中の問題
  let answered  = false;
  let asked = 0, correct = 0;

  const KIND_LABEL = {
    katachi: '何の句形か',
    blank:   '書き下しの空欄',
    imi:     '意味'
  };
  const KIND_KEYS = ['katachi', 'blank', 'imi'];

  // ---- 小道具 -------------------------------------------------------------
  function shuffle(a, random = Math.random){
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function pick(a, random = Math.random){ return a[Math.floor(random() * a.length)]; }
  const catName = key => CATS[key] || key;

  // ---- 読み込み -----------------------------------------------------------
  // 初回から文脈を示すため、型と例文の両方がそろうまで出題しない。
  Promise.all(['kuho.json?v=117', 'texts.json?v=117'].map(url =>
    fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    })
  ))
    .then(([data, texts]) => {
      CATS  = data.categories || {};
      TYPES = data.types || [];
      TYPES.forEach(t => byId.set(t.id, t));
      quiz = createQuiz(data, texts.problems || []);
      TEXTS = quiz.texts;
      buildSelects();
      renderMeta();
      nextQuestion();
    })
    .catch(e => {
      $('q-text').textContent = '句法・例文データの読み込みに失敗しました: ' + e;
    });

  function buildSelects(){
    const cs = $('cat-select');
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'すべて（' + TYPES.length + '型）';
    cs.appendChild(all);
    Object.keys(CATS).forEach(key => {
      const n = TYPES.filter(t => t.category === key).length;
      if (!n) return;
      const o = document.createElement('option');
      o.value = key;
      o.textContent = CATS[key] + '（' + n + '型）';
      cs.appendChild(o);
    });
  }

  // ---- 出題 ---------------------------------------------------------------
  function poolTypes(){
    return (filterCat === 'all') ? TYPES.slice()
                                 : TYPES.filter(t => t.category === filterCat);
  }

  function nextQuestion(){
    if (!quiz) return;
    const pool = poolTypes();
    if (!pool.length){
      current = null;
      $('q-text').textContent = 'この絞り込みに合う型がありません。';
      $('choices').innerHTML = '';
      return;
    }
    // 直前と同じ型が続くのを避ける（型が1つしかないときは諦める）
    let t = pick(pool);
    if (current && pool.length > 1){
      let guard = 0;
      while (t.id === current.type.id && guard++ < 8) t = pick(pool);
    }
    const kind = (kindPref === 'mix') ? pick(KIND_KEYS) : kindPref;
    current = quiz.buildQuestion(kind, t);
    answered = false;
    render();
  }

  // ---- 描画 ---------------------------------------------------------------
  function render(){
    if (!current) return;
    const t = current.type;
    $('q-kind').textContent = '出題形式: ' + KIND_LABEL[current.kind];
    $('q-text').textContent = current.prompt;
    $('q-pattern').textContent = t.pattern;
    $('q-sub').textContent = current.sub;
    const example = current.example;
    $('q-example').hidden = !example;
    $('q-haku').textContent = example ? example.hakubun : '';
    $('q-kd').textContent = example ? '書き下し: ' + example.kakikudashi : '';
    $('q-source').textContent = example ? [example.work, example.chapter].filter(Boolean).join('・') : '';

    const box = $('choices');
    box.innerHTML = '';
    current.choices.forEach(c => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = c;
      b.addEventListener('click', () => answer(c, b));
      box.appendChild(b);
    });

    const j = $('judge');
    j.className = '';
    j.textContent = '';
    const ex = $('explain');
    ex.className = '';
    ex.innerHTML = '';
    renderScore();
  }

  function answer(choice, btn){
    if (answered || !current) return;
    answered = true;
    const isRight = norm(choice) === norm(current.answer);
    asked++;
    if (isRight) correct++;

    Array.prototype.forEach.call($('choices').querySelectorAll('button'), b => {
      b.disabled = true;
      if (norm(b.textContent) === norm(current.answer)) b.classList.add('right');
    });
    if (!isRight) btn.classList.add('wrong');

    const j = $('judge');
    j.className = isRight ? 'ok' : 'ng';
    j.textContent = isRight ? '○ 正解' : '× 不正解';
    showExplain();
    renderScore();
  }

  // 誤答時にこそ学びが起きる（設計原則2）ので、正解でも同じ解説を必ず出す
  function showExplain(){
    const t = current.type;
    const ex = $('explain');
    ex.className = 'shown';
    ex.innerHTML = '';

    const rows = [
      ['句形',     t.label + '（' + catName(t.category) + '） ' + t.name],
      ['型',       t.pattern],
      ['目印の字', (t.markers || []).join('・')],
      ['書き下し', t.kakikudashi],
      ['意味',     t.meaning]
    ];
    if (current.example) rows.push(['この文の訳', current.example.meaning]);
    rows.forEach(pair => {
      const d = document.createElement('div');
      d.className = 'row';
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = pair[0];
      const v = document.createElement('span');
      v.className = 'v';
      v.textContent = pair[1];
      d.appendChild(k); d.appendChild(v);
      ex.appendChild(d);
    });
    if (t.note){
      const n = document.createElement('p');
      n.className = 'note';
      n.textContent = (current.example ? 'この文を読む手がかり: ' : '') + t.note;
      ex.appendChild(n);
    }
    const rel = (t.confuse || []).map(id => byId.get(id)).filter(Boolean);
    if (rel.length){
      const p = document.createElement('p');
      p.className = 'rel';
      p.textContent = '紛らわしい型: ' +
        rel.map(o => o.label + '「' + o.kakikudashi + '」＝' + o.meaning).join(' ／ ');
      ex.appendChild(p);
    }
    if ((t.examples || []).length){
      const box = document.createElement('div');
      box.className = 'examples';
      const lead = document.createElement('span');
      lead.className = 'label';
      lead.textContent = 'この型で練習できる問題';
      box.appendChild(lead);
      t.examples.forEach(id => {
        const info = TEXTS.get(id);
        const a = document.createElement('a');
        a.href = 'index.html?p=' + encodeURIComponent(id);
        if (info){
          [['haku', info.hakubun], ['kd', info.kakikudashi], ['src', [info.work, info.chapter].filter(Boolean).join('・')]]
            .forEach(pair => {
              const s = document.createElement('span');
              s.className = pair[0];
              s.textContent = pair[1];
              a.appendChild(s);
            });
        } else {
          a.textContent = id;   // texts.json が読めなかったときの保険
        }
        box.appendChild(a);
      });
      ex.appendChild(box);
    }
  }

  function renderScore(){
    const rate = asked ? Math.round(correct / asked * 100) : 0;
    $('score').textContent = '正答 ' + correct + ' / 出題 ' + asked +
      (asked ? '（' + rate + '%）' : '');
  }

  function renderMeta(){
    const lines = Object.keys(CATS).map(key => {
      const n = TYPES.filter(t => t.category === key).length;
      return CATS[key] + ' ' + n;
    });
    $('meta').textContent = '収録 ' + TYPES.length + ' 型 ／ ' + lines.join('・');
  }

  // ---- 操作 ---------------------------------------------------------------
  $('cat-select').addEventListener('change', e => {
    filterCat = e.target.value;
    nextQuestion();
  });
  $('kind-select').addEventListener('change', e => {
    kindPref = e.target.value;
    nextQuestion();
  });
  $('btn-next').addEventListener('click', nextQuestion);
  $('btn-reset').addEventListener('click', () => {
    asked = 0; correct = 0;
    renderScore();
  });
})();
