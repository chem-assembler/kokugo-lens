/*
 * present.js — 提示モード（先生が授業で文章を示す画面）。
 *
 * 同じ出典・同じ篇の問題を一つの「文章」として並べ、
 * 白文 → 訓点 → 書き下し → 現代語訳 の順に一段ずつ出す。
 * 字を押すと、その字の読みと「この文での意味」（imi.json）を横の欄に出す。
 * レビュアー4回目の回答（A6）による。
 */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.KanbunPresent = api;
    if (document.body.hasAttribute('data-present')) api.init();
  }
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  const HATARAKI = ['主語', '述語', '目的語', '補語', '修飾語', '接続', '前置詞', '助動詞', '文末の助字', '置き字'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const hakubun = p => p.tokens.map(t => t.c + (t.p || '')).join('');
  // 例の位置が合えばそれを優先。未掲載の位置は、この文の意味と語釈・用例の意味を比べる。
  // 意味の近さは候補にすぎないので、確定した用例とは表示を分ける。
  function matchingUses(entry, context) {
    if (!entry || !context) return {indices: [], kind: ''};
    const exact = entry.uses.flatMap((u, i) => u.rei.some(r => r.id === context.id && r.i === context.i) ? [i] : []);
    if (exact.length) return {indices: exact, kind: 'exact'};
    const clean = s => String(s || '').replace(/[\s\p{P}\p{S}]/gu, '');
    const grams = s => new Set(Array.from(s).slice(0, -1).map((c, i) => c + Array.from(s)[i + 1]));
    const target = clean(context.meaning);
    if (!target || target === '—') return {indices: [], kind: ''};
    function score(s) {
      s = clean(s);
      if (!s) return 0;
      if (s === target) return 2;
      if (s.includes(target) || target.includes(s)) return Math.min(s.length, target.length) / Math.max(s.length, target.length) + 0.5;
      const a = grams(target), b = grams(s);
      const common = [...a].filter(g => b.has(g)).length;
      return common ? 2 * common / (a.size + b.size) : 0;
    }
    const scores = entry.uses.map(u => Math.max(score(u.label), score(u.imi), ...u.rei.map(r =>
      score(((context.imi || {})[r.id] || [])[r.i]))));
    const best = Math.max(...scores);
    return {indices: best > 0 ? scores.flatMap((s, i) => s === best ? [i] : []) : [], kind: best > 0 ? 'similar' : ''};
  }

  // DOM非依存。提示モードと辞書ページが同じ関数で全項目を組み立てる。
  function buildDictionaryEntry(character, entry, context, problems) {
    if (!entry) return '';
    const match = matchingUses(entry, context);
    const example = r => {
      const p = problems && problems.get(r.id);
      if (!p) return '';
      const id = encodeURIComponent(r.id);
      return '<div class="example"><p class="hakubun">' + esc(hakubun(p)) + '</p><p>' + esc(p.kakikudashi)
        + '</p><p class="source">' + esc([p.source.work, p.source.chapter].filter(Boolean).join('・'))
        + '</p><p class="example-links"><a href="present.html?p=' + id + '">提示モード</a>'
        + '<a href="index.html?p=' + id + '">訓点モード</a></p></div>';
    };
    return '<section class="dictionary-entry" aria-label="' + esc(character) + 'の辞書の項目"><h3>辞書の項目</h3>'
      + '<p><b>音</b> ' + esc(entry.on.join('・') || '—') + '　<b>訓</b> ' + esc(entry.kun.join('・') || '—') + '</p>'
      + '<ul class="uses">' + entry.uses.map((u, i) => {
        const current = match.indices.includes(i);
        return '<li class="use' + (current ? ' current' : '') + '" data-use="' + i + '">'
          + (current ? '<p class="match-note">' + (match.kind === 'exact' ? 'この用例の使い方' : '意味が近い使い方（候補）') + '</p>' : '')
          + '<div class="use-heading"><b>' + esc(u.label) + '</b><span class="role">' + esc(u.hataraki) + '</span></div>'
          + '<p>読み：' + esc(u.yomi || '（置き字・読まない）') + '</p><p>' + esc(u.imi) + '</p>'
          + (problems ? u.rei.map(example).join('') || '<p class="no-example">この使い方の用例は未収録です。</p>' : '') + '</li>';
      }).join('') + '</ul>' + (entry.chui ? '<p class="chui"><b>注意</b> ' + esc(entry.chui) + '</p>' : '')
      + (!problems ? '<p><a href="jisho.html?c=' + encodeURIComponent(character) + '">辞書で用例を見る</a></p>' : '') + '</section>';
  }

  function init(){
  const $ = id => document.getElementById(id);
  const K = window.Kanbun;
  const STEPS = ['白文', '訓点', '書き下し', '現代語訳'];
  const KATA2HIRA = s => String(s || '').replace(/[ァ-ヶ]/g,
    c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const KUNTEN_CHAR = m => m.re ? 'レ'
    : (({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '?');
  function markLabel(marks){
    if (!marks || !marks.length) return '';
    const nums = marks.filter(m => !m.re).sort((a, b) => a.lv - b.lv);
    return nums.map(KUNTEN_CHAR).join('') + (marks.some(m => m.re) ? 'レ' : '');
  }

  let groups = [];      // [{ key, label, problems: [...] }]
  let imi = {};
  let dictionary = {};
  let showDictionaryMarks = false;
  let group = null;
  let step = 0;
  let picked = null;    // { id, i }
  let zoom = 1.2;

  Promise.all(['texts.json?v=119', 'imi.json?v=119', 'jisho.json?v=119'].map(url => fetch(url).then(r => {
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }))).then(([texts, imiData, dictionaryData]) => {
    imi = imiData;
    dictionary = dictionaryData;
    const map = new Map();
    for (const p of texts.problems){
      const key = p.source.work + '・' + (p.source.chapter || '');
      if (!map.has(key)) map.set(key, { key, label: key, problems: [] });
      map.get(key).problems.push(p);
    }
    groups = [...map.values()];
    const sel = $('text-select');
    groups.forEach((g, k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = g.label + '（' + g.problems.length + '文）';
      sel.appendChild(opt);
    });
    // ?t=<文章名> または ?p=<問題id> で開ける
    const params = new URLSearchParams(location.search);
    let k = 0;
    if (params.get('p')) k = Math.max(0, groups.findIndex(g => g.problems.some(p => p.id === params.get('p'))));
    else if (params.get('t')) k = Math.max(0, groups.findIndex(g => g.key === params.get('t')));
    sel.value = k;
    choose(k);
  }).catch(e => {
    $('stage').textContent = '問題データを読み込めませんでした（' + e.message + '）';
  });

  function choose(k){
    group = groups[k];
    $('btn-print').disabled = !group;
    step = 0;
    picked = null;
    renderCharInfo();
    render();
  }

  function render(){
    const showMarks = step >= 1, showKudashi = step >= 2, showMeaning = step >= 3;
    const stage = $('stage');
    stage.innerHTML = '';
    for (const p of group.problems){
      const sent = document.createElement('div');
      sent.className = 'sent';
      const line = document.createElement('div');
      line.className = 'line';
      p.tokens.forEach((t, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', t.c + 'の説明');
        if (showDictionaryMarks && Object.hasOwn(dictionary, t.c)) cell.classList.add('in-dictionary');
        if (picked && picked.id === p.id && picked.i === i) cell.classList.add('picked');
        const kanji = document.createElement('span');
        kanji.className = 'kanji';
        kanji.textContent = t.c;
        cell.appendChild(kanji);
        if (t.p){
          const punct = document.createElement('span');
          punct.className = 'punct';
          punct.textContent = t.p;
          cell.appendChild(punct);
        }
        if (showMarks){
          const okuri = t.reread ? t.reread.first.okuri : t.okuri;
          if (okuri){
            const ok = document.createElement('span');
            ok.className = 'okuri';
            ok.textContent = okuri;
            cell.appendChild(ok);
          }
          const label = markLabel(K.marksOf(t));
          if (label){
            const kt = document.createElement('span');
            kt.className = 'kunten';
            kt.textContent = label;
            cell.appendChild(kt);
          }
          if (t.join && K.nextReadable(p.tokens, i) === i + 1){
            const j = document.createElement('span');
            j.className = 'joiner';
            cell.appendChild(j);
          }
        }
        const select = () => {
          picked = { id: p.id, i }; renderCharInfo(); render();
          const row = group.problems.findIndex(q => q.id === p.id);
          $('stage').children[row].querySelectorAll('.cell')[i].focus({preventScroll: true});
        };
        cell.addEventListener('click', select);
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); }
        });
        line.appendChild(cell);
      });
      sent.appendChild(line);
      if (showKudashi){
        const kd = document.createElement('div');
        kd.className = 'kudashi';
        kd.textContent = p.kakikudashi;
        sent.appendChild(kd);
      }
      stage.appendChild(sent);
    }

    const box = $('meaning');
    box.innerHTML = '<h2>現代語訳</h2>';
    if (showMeaning){
      const ol = document.createElement('ol');
      for (const p of group.problems){
        const li = document.createElement('li');
        li.textContent = p.meaning;
        ol.appendChild(li);
      }
      box.appendChild(ol);
    } else {
      box.insertAdjacentHTML('beforeend', '<p class="hidden-note">「現代語訳」の段で表示します。</p>');
    }

    $('steps').innerHTML = STEPS.map((s, k) => '<span' + (k <= step ? ' class="on"' : '') + '>' + s + '</span>').join('');
    $('btn-prev').disabled = step === 0;
    $('btn-next').disabled = step === STEPS.length - 1;
  }

  function reading(t, tokens, i){
    if (t.role === 'placed') return '（置き字・読まない）';
    // 熟語（孰与・何如 など）は二字で一つの読みなので、二字分をまとめて示す
    const prev = K.prevReadable(tokens, i);
    const head = t.join ? i : (prev >= 0 && tokens[prev].join ? prev : -1);
    if (head >= 0){
      const a = tokens[head], b = tokens[K.nextReadable(tokens, head)];
      return KATA2HIRA((a.yomi || '') + (a.okuri || '') + (b.yomi || '') + (b.okuri || ''))
        + '（' + a.c + b.c + 'の二字で）';
    }
    if (t.reread){
      const a = t.reread.first, b = t.reread.second;
      const one = r => r.kana ? KATA2HIRA((r.yomi || '') + (r.okuri || ''))
                              : KATA2HIRA(r.yomi || '') + KATA2HIRA(r.okuri || '');
      return one(a) + '〜' + one(b) + '（再読文字）';
    }
    const y = KATA2HIRA((t.yomi || '') + (t.okuri || ''));
    return y || '—';
  }

  function renderCharInfo(){
    const box = $('char-info');
    if (!picked){
      box.innerHTML = '<h2>字の説明</h2><p class="hint">本文の字を押すと、読みと、この文での意味が出ます。</p>';
      return;
    }
    const p = group.problems.find(q => q.id === picked.id);
    const t = p.tokens[picked.i];
    const m = (imi[p.id] || [])[picked.i] || '—';
    box.innerHTML = '<h2>字の説明</h2>';
    const big = document.createElement('div');
    big.className = 'big';
    big.textContent = t.c;
    box.appendChild(big);
    const dl = document.createElement('dl');
    for (const [k, v] of [['読み', reading(t, p.tokens, picked.i)], ['この文での意味', m]]){
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.append(dt, dd);
    }
    box.appendChild(dl);
    if (Object.hasOwn(dictionary, t.c)) box.insertAdjacentHTML('beforeend',
      buildDictionaryEntry(t.c, dictionary[t.c], {id: p.id, i: picked.i, meaning: m, imi}));
  }

  function go(d){
    const s = Math.min(STEPS.length - 1, Math.max(0, step + d));
    if (s !== step){ step = s; render(); }
  }
  $('btn-print').addEventListener('click', () => {
    if (group) window.open('print.html?t=' + encodeURIComponent(group.key), '_blank', 'noopener');
  });
  $('btn-dictionary-marks').addEventListener('click', e => {
    showDictionaryMarks = !showDictionaryMarks;
    e.currentTarget.setAttribute('aria-pressed', String(showDictionaryMarks));
    e.currentTarget.textContent = '辞書の字に印：' + (showDictionaryMarks ? '入' : '切');
    if (group) render();
  });
  $('btn-next').addEventListener('click', () => go(1));
  $('btn-prev').addEventListener('click', () => go(-1));
  $('text-select').addEventListener('change', e => choose(+e.target.value));
  document.addEventListener('keydown', e => {
    if (['SELECT', 'BUTTON', 'INPUT', 'A'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); }
  });
  const setZoom = z => { zoom = Math.min(2.4, Math.max(0.8, z)); $('stage').style.setProperty('--zoom', zoom + 'em'); };
  $('btn-small').addEventListener('click', () => setZoom(zoom - 0.2));
  $('btn-large').addEventListener('click', () => setZoom(zoom + 0.2));
  }
  return { HATARAKI, esc, hakubun, matchingUses, buildDictionaryEntry, init };
});
