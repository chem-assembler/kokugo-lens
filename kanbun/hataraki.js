/* 字の読み・文脈上の意味・働きを順に確かめる。出題ロジックは DOM 非依存。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.KanbunHataraki = api;
    if (document.querySelector('[data-hataraki]')) api.init();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const ROLES = ['主語', '述語', '目的語', '補語', '修飾語', '前置詞', '助動詞', '接続', '置き字', '文末の助字'];
  // hataraki-rules.md の10区分。専用区分がない場合の仮置きも説明する。
  const RULES = {
    '主語': '動作・状態の主や存在するものを探します。この区分では話題の中心・呼びかけも含めます。',
    '述語': '何をする・どんな状態かを述べる中心です。名詞で「何であるか」を述べる場合も含めます。',
    '目的語': '動作が働きかける対象です。使役される相手や、前に出された対象も含めます。',
    '補語': '動作の相手・起点・行先・結果などを補います。「に」という読みだけでは決めません。',
    '修飾語': '名詞を限定したり状況を添えたりします。この区分では提示・構造を整える字も仮に含めます。',
    '前置詞': '名詞などを導いて手段・理由・相手・起点などの関係を示します。同じ字でも文ごとに確かめます。',
    '助動詞': '述語に否定・可能・受身・使役などを添えます。実質的な動作を表す用法とは分けます。',
    '接続': '節や並列する語を結び、順接・逆接・仮定・選択などの関係を表します。',
    '置き字': 'この訓読では読まず、字の意味や関係を支えます。データで置き字と指定された字だけをこう扱います。',
    '文末の助字': '断定・疑問・反語・詠嘆などの語気を結びます。この区分では独立した感動句の語気も含めます。'
  };
  const hiragana = value => String(value || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const readingPart = token => hiragana((token.yomi || '') + (token.okuri || ''));
  function reading(token) {
    if (token.role === 'placed') return '読まない';
    if (token.reread) return readingPart(token.reread.first) + '…' + readingPart(token.reread.second);
    return readingPart(token);
  }
  const choiceKey = text => String(text).normalize('NFKC').replace(/\s/g, '').replace(/[。．.]+$/, '');
  function shuffle(values, random = Math.random) {
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function createQuiz(problems, imi, hataraki, kuho) {
    const byChar = new Map(), entries = [], byId = new Map(problems.map(p => [p.id, p]));
    const types = new Map(kuho.types.map(t => [t.id, t]));
    const markers = new Set(kuho.types.flatMap(t => (t.markers || []).flatMap(s => Array.from(s))));
    const common = new Set(Array.from('之其而以於于為者也矣乎哉焉耳与乃則所夫蓋且或莫無不未将当応宜須可得能欲使被見自何豈安孰奚胡寧亦唯惟雖若猶如因是'));
    for (const p of problems) p.tokens.forEach((token, i) => {
      const meaning = imi[p.id] && imi[p.id][i], role = hataraki[p.id] && hataraki[p.id][i];
      if (typeof meaning !== 'string' || !ROLES.includes(role)) throw new Error(p.id + '[' + i + '] の意味・働きがありません');
      const entry = {p, i, token, reading: reading(token), meaning, role, marker: markers.has(token.c)};
      entries.push(entry);
      if (!byChar.has(token.c)) byChar.set(token.c, []);
      byChar.get(token.c).push(entry);
    });
    function choices(p, i, kind, random = Math.random) {
      if (!['reading', 'meaning'].includes(kind)) throw new Error('未知の問い: ' + kind);
      const token = p.tokens[i];
      const answer = kind === 'reading' ? reading(token) : imi[p.id][i];
      const seen = new Set([choiceKey(answer)]), wrong = [];
      const take = rows => {
        for (const e of rows) {
          const value = e[kind], key = choiceKey(value);
          if (!key || seen.has(key)) continue;
          seen.add(key); wrong.push(value);
          if (wrong.length === 3) break;
        }
      };
      // 同じ字の別問題での用法を先に集める。足りない分だけ他の字から補う。
      take(shuffle((byChar.get(token.c) || []).filter(e => e.p.id !== p.id), random));
      if (wrong.length < 3) take(shuffle(entries.filter(e => e.token.c !== token.c), random));
      if (wrong.length !== 3) throw new Error('四択の候補が不足: ' + p.id + '[' + i + ']');
      return {answer, choices: shuffle([answer, ...wrong], random)};
    }
    function categoriesFor(p) {
      return [...new Set((p.kuho || []).map(code => types.has(code) ? types.get(code).category : code))];
    }
    function candidates(filters = {}) {
      return entries.filter(e => (!filters.category || categoriesFor(e.p).includes(filters.category))
        && (!filters.role || e.role === filters.role) && (!filters.markerOnly || e.marker));
    }
    const weight = e => e.marker ? 6 : e.token.role === 'placed' ? 5 : common.has(e.token.c) ? 4 : 1;
    function pick(pool, previous, random = Math.random) {
      const other = pool.filter(e => !previous || e.p.id !== previous.p.id || e.i !== previous.i);
      const available = other.length ? other : pool;
      if (!available.length) return null;
      let n = random() * available.reduce((sum, e) => sum + weight(e), 0);
      for (const e of available) { n -= weight(e); if (n < 0) return e; }
      return available[available.length - 1];
    }
    function referenceLinks(p, i) {
      return (p.kuho || []).map(code => types.get(code)).filter(Boolean).map(type => ({
        label: type.name || type.label,
        href: 'reference.html?' + new URLSearchParams({code:type.id, from:'kanbun', p:p.id, i:String(i), mode:'hataraki'})
      }));
    }
    return {entries, byId, choices, candidates, categoriesFor, weight, pick, referenceLinks};
  }

  async function init() {
    const $ = id => document.getElementById(id);
    let quiz, pool = [], current = null, completed = new Set(), queue = [], stage = 0, wrong = false;
    const filters = () => ({category:$('category-select').value, role:$('role-select').value, markerOnly:$('marker-only').checked});
    function syncPool() {
      pool = quiz.candidates(filters());
      $('pool-count').textContent = new Set(pool.map(e => e.p.id)).size + '文・' + pool.length + '字';
      $('btn-next').disabled = !pool.length;
    }
    function progress() {
      $('btn-next').disabled = !pool.length || ($('all-mode').checked && stage < 3);
      $('sentence-count').textContent = $('all-mode').checked ? 'この文：' + completed.size + ' / ' + queue.length + '字（絞り込み対象）' : '';
      $('btn-next').textContent = $('all-mode').checked && queue.some(e => !completed.has(e.i)) ? 'この文の次の字' : '次の文・字';
    }
    function showResult() {
      const {p, i, token, meaning, role} = current;
      const box = $('result');
      box.replaceChildren();
      box.className = wrong ? 'wrong' : 'ok';
      function line(label, text) { const el = document.createElement('p'); el.textContent = label + text; box.appendChild(el); }
      line('', wrong ? '答えを確かめましょう。' : '3段とも正解です。');
      line('書き下し：', p.kakikudashi);
      line('訳：', p.meaning);
      line('「' + token.c + '」の読み：', current.reading || 'この字だけの読みは付いていない（前の字と合わせて読む）');
      line('この文での意味：', meaning);
      line('文中での働き：', role);
      line('考え方：', RULES[role]);
      if (p.note) line('注：', p.note);
      if (wrong) {
        const links = quiz.referenceLinks(p, i);
        if (links.length) {
          const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'この問題の句法の解説');
          const label = document.createElement('p'); label.textContent = '📖 この句法を読む'; nav.appendChild(label);
          for (const link of links) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.label; nav.appendChild(a); }
          box.appendChild(nav);
        }
      }
      box.hidden = false;
      completed.add(i);
      $('sentence').querySelectorAll('button[data-index]').forEach(b => b.classList.toggle('done', completed.has(Number(b.dataset.index))));
      progress();
    }
    function ask(n) {
      const {p, i, role} = current;
      const group = $('step-' + n); group.hidden = false;
      const options = n === 2 ? {answer:role, choices:ROLES} : quiz.choices(p, i, n === 0 ? 'reading' : 'meaning');
      const buttons = group.querySelector('.choices'); buttons.replaceChildren();
      const display = value => value || 'この字だけの読みは付いていない';
      for (const value of options.choices) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = display(value);
        button.addEventListener('click', () => {
          if (stage !== n) return;
          const correct = choiceKey(value) === choiceKey(options.answer);
          wrong = wrong || !correct;
          for (const b of buttons.children) { b.disabled = true; if (b.textContent === display(options.answer)) b.classList.add('correct'); }
          button.classList.add(correct ? 'correct' : 'incorrect');
          group.querySelector('.feedback').textContent = correct ? '○ 正解' : '× 正解：' + display(options.answer);
          stage++;
          if (n < 2) ask(n + 1); else showResult();
        });
        buttons.appendChild(button);
      }
      // 次の段へキーボードの焦点も移す。読み込み直後には焦点を奪わない。
      if (n > 0) group.querySelector('h2').focus();
    }
    function load(entry, fresh = true) {
      current = entry;
      if (fresh) {
        completed = new Set();
        const same = pool.filter(e => e.p.id === entry.p.id);
        queue = [...same.filter(e => e.i >= entry.i), ...same.filter(e => e.i < entry.i)];
      }
      stage = 0; wrong = false;
      $('exercise').hidden = false;
      $('result').hidden = true; $('result').replaceChildren();
      for (let n = 0; n < 3; n++) { $('step-' + n).hidden = true; $('step-' + n).querySelector('.feedback').textContent = ''; }
      $('sentence').replaceChildren();
      entry.p.tokens.forEach((t, i) => {
        const cell = document.createElement('span'); cell.className = 'cell';
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t.c; b.dataset.index = i;
        b.disabled = !pool.some(e => e.p.id === entry.p.id && e.i === i);
        b.className = (i === entry.i ? 'target ' : '') + (completed.has(i) ? 'done' : '');
        b.setAttribute('aria-pressed', String(i === entry.i)); b.setAttribute('aria-label', (i + 1) + '字目「' + t.c + '」' + (i === entry.i ? '：出題中' : '：この字を練習'));
        b.addEventListener('click', () => { const next = pool.find(e => e.p.id === entry.p.id && e.i === i); if (next) load(next, false); });
        cell.appendChild(b);
        if (t.p) cell.appendChild(document.createTextNode(t.p));
        $('sentence').appendChild(cell);
      });
      $('target-label').textContent = '印の字「' + entry.token.c + '」（' + (entry.i + 1) + '字目）を答えましょう';
      const source = entry.p.source || {};
      $('source').textContent = '出典：' + (source.work || '') + (source.chapter ? '（' + source.chapter + '）' : '');
      const url = new URL(location.href); url.searchParams.set('p', entry.p.id); url.searchParams.set('i', entry.i);
      history.replaceState(null, '', url);
      progress(); ask(0);
    }
    function next() {
      if (!pool.length) return;
      const pending = $('all-mode').checked && queue.find(e => !completed.has(e.i) && (!current || e.i !== current.i));
      if (pending) { load(pending, false); return; }
      // 文を終えたら別の文を選ぶ。候補が一文だけでも続けられる。
      const other = pool.filter(e => !current || e.p.id !== current.p.id);
      const entry = quiz.pick(other.length ? other : pool, current);
      if (entry) load(entry);
    }
    try {
      const [texts, imi, hataraki, kuho] = await Promise.all(['texts.json?v=118', 'imi.json?v=118', 'hataraki.json?v=118', 'kuho.json?v=118'].map(async url => {
        const response = await fetch(url); if (!response.ok) throw new Error(url + ': ' + response.status); return response.json();
      }));
      quiz = createQuiz(texts.problems, imi, hataraki, kuho);
      for (const [value, label] of Object.entries(kuho.categories)) { const option = document.createElement('option'); option.value = value; option.textContent = label; $('category-select').appendChild(option); }
      for (const role of ROLES) { const option = document.createElement('option'); option.value = role; option.textContent = role; $('role-select').appendChild(option); }
      for (const id of ['category-select', 'role-select', 'marker-only']) $(id).addEventListener('change', () => {
        syncPool(); queue = []; current = null;
        $('notice').textContent = pool.length ? '' : 'この条件で出題できる字はありません。条件を変えてください。';
        $('exercise').hidden = !pool.length;
        if (pool.length) next();
      });
      $('all-mode').addEventListener('change', () => { if (current) load(current); });
      $('btn-next').addEventListener('click', next);
      syncPool();
      const params = new URLSearchParams(location.search), id = params.get('p'), raw = params.get('i');
      const i = raw !== null && /^\d+$/.test(raw) ? Number(raw) : 0;
      const requested = pool.find(e => e.p.id === id && e.i === i);
      if ((id || raw !== null) && (!requested || (raw !== null && !/^\d+$/.test(raw)))) $('notice').textContent = '指定された文・字の位置が見つかりません。別の字を表示します。';
      if (requested && (raw === null || /^\d+$/.test(raw))) load(requested); else next();
      document.documentElement.dataset.hatarakiReady = 'true';
    } catch (error) {
      $('exercise').hidden = true; $('btn-next').disabled = true;
      for (const id of ['category-select', 'role-select', 'marker-only', 'all-mode']) $(id).disabled = true;
      $('notice').textContent = '問題を読み込めませんでした。ページを開き直してください。';
      document.documentElement.dataset.hatarakiReady = 'error'; console.error(error);
    }
  }
  return {ROLES, RULES, hiragana, reading, choiceKey, createQuiz, init};
});
