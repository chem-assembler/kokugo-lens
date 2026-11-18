/* 句法ごとの学習案内。既存の記録を読むだけで、新しい記録は保存しない。 */
(function(root, factory){
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./gojun.js') : root.KanbunGojun,
    node ? require('./chobun.js') : root.KanbunChobun);
  if (node) module.exports = api;
  else { root.KanbunMichi = api; if (document.body.hasAttribute('data-michi')) api.mount(document, root); }
})(typeof window !== 'undefined' ? window : this, function(G, C){
  'use strict';
  const href = (page, params) => page + (params ? '?' + new URLSearchParams(params) : '');
  const link = (label, page, params) => ({label, href:href(page, params)});
  function groups(data){
    const byType = new Map(data.kuho.types.map(t => [t.id, t]));
    return Object.entries(data.kuho.categories).map(([id, label]) => {
      const types = data.kuho.types.filter(t => t.category === id), codes = new Set(types.map(t => t.id));
      return {id, label, types,
        problems:data.problems.filter(p => (p.kuho || []).some(code => code === id || byType.get(code)?.category === id)),
        stages:data.chobun.stages.filter(s => s.category === id),
        pairs:data.ichiji.pairs.filter(p => (p.kuho || []).some(code => code === id || codes.has(code))),
        qa:data.qa.patterns.filter(p => p.unit === 'kuho' && types.some(t => p.code === 'kbn.kuho.' + t.id))};
    });
  }
  // cat を受け付けない練習は、同じまとまりの問題 ID で開く。
  // 語順の対象外（漢詩など）には p を渡さず、ページの一覧から選んでもらう。
  function steps(group, problem, dictionary){
    const p = problem && problem.id;
    const markers = new Set(group.types.flatMap(t => (t.markers || []).flatMap(s => Array.from(s))));
    const markerIndex = problem ? problem.tokens.findIndex(t => markers.has(t.c)) : -1;
    const index = Math.max(0, markerIndex);
    const character = problem && [problem.tokens[index], ...problem.tokens].find(t => dictionary[t.c]);
    const sentence = p ? {p} : undefined;
    const longLinks = group.stages.map(s => link(s.title + 'を最初から解く', 'chobun.html', {s:s.id}));
    return [
      {id:'characters', title:'漢字の読み・意味・文中での働き',
        text:'一字ずつ、どう読むか、この文で何を意味するか、どんな役目かを確かめます。',
        links:[link('字の働き', 'hataraki.html', p ? {p, i:String(index)} : undefined),
          link('重要漢字の辞書', 'jisho.html', character ? {c:character.c} : undefined),
          link('この句法を参考書で読む', 'reference.html', group.types.length ? {code:group.types[0].id} : undefined)]},
      {id:'marks', title:'返り点と読む順', text:'まず訓点を見て読む順をたどり、慣れたら自分で返り点を打ちます。',
        links:[link('読む順にタップ（L1）', 'index.html', {...sentence, mode:'L1'}),
          link('返り点を打つ（L3）', 'index.html', {...sentence, mode:'L3'})]},
      {id:'writing', title:'書き下し', text:'読む順を組み、送り仮名も確かめます。語順の練習は補助に使えます。',
        links:[link('書き下し練習', 'kudashi.html', sentence),
          link('語順を組み立てる' + (problem && G.exclusionReason(problem) ? '（問題を選ぶ）' : ''),
            'gojun.html', problem && !G.exclusionReason(problem) ? sentence : undefined)]},
      {id:'translation', title:'短い文の現代語訳・句法を確かめる',
        text:'句法を含む文を訳し、意味の違いを確かめます。字と句法を十分に練習できたら、次の長文へ進みます。',
        links:[link('句法クイズ（意味）', 'kuho.html', {cat:group.id, kind:'imi'}),
          link('句法クイズ（形・読みも練習）', 'kuho.html', {cat:group.id}),
          ...(group.pairs.length ? group.pairs.map(pair => link('一字ちがい：' + pair.theme, 'ichiji.html', {id:pair.id}))
            : [link('一字ちがい（問題を選ぶ）', 'ichiji.html')]),
          ...(group.qa.length ? group.qa.map(q => link('一問一答：' + q.knowledge, '../qa/', {code:q.code}))
            : [link('一問一答', '../qa/')])]},
      {id:'passage', title:'長文で、現代語訳 → 内容説明',
        text:'文章を通して読み、現代語訳を確かめてから内容を説明します。全問正解できたら、次の句法へ。迷ったら字と句法に戻りましょう。',
        links:longLinks.length ? longLinks : [link('長文ステージ', 'chobun.html')]}
    ];
  }
  function readRecord(win, key){
    try {
      const raw = win.localStorage.getItem(key);
      const value = raw === null ? {} : JSON.parse(raw);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch (_) { return null; }
  }
  function progress(group, records, allProblems){
    const out = {};
    if (records.practice) {
      const count = mode => group.problems.filter(p => Number(records.practice[p.id]?.[mode]) > 0).length;
      out.marks = ['L1 正解 ' + count('L1') + ' / ' + group.problems.length + ' 文',
        'L3 正解 ' + count('L3') + ' / ' + group.problems.length + ' 文'];
      out.writing = ['書き下し正解 ' + count('K') + ' / ' + group.problems.length + ' 文（段は区別しません）'];
    }
    if (records.qa && group.qa.length) out.translation = ['一問一答の測定で正解した項目 '
      + group.qa.filter(q => Number(records.qa[q.code]?.cRight) > 0).length + ' / ' + group.qa.length];
    if (records.chobun && group.stages.length) {
      const byId = new Map(allProblems.map(p => [p.id, p]));
      const count = group.stages.filter(s => records.chobun[s.id] === C.signature(s, byId)).length;
      out.passage = ['長文全問正解 ' + count + ' / ' + group.stages.length + ' ステージ'];
    }
    return out;
  }
  async function mount(doc, win){
    const $ = id => doc.getElementById(id);
    const el = (tag, text, cls) => {
      const e = doc.createElement(tag);
      if (text !== undefined) e.textContent = text;
      if (cls) e.className = cls;
      return e;
    };
    const anchor = item => { const a = el('a', item.label); a.href = item.href; return a; };
    try {
      const [texts, kuho, chobun, ichiji, qa, dictionary] = await Promise.all([
        'texts.json?v=121', 'kuho.json?v=121', 'chobun.json?v=121', 'ichiji.json?v=121', '../qa/questions.json', 'jisho.json?v=121'
      ].map(async url => {
        const r = await win.fetch(url); if (!r.ok) throw Error(url + ': ' + r.status); return r.json();
      }));
      const data = {problems:texts.problems, kuho, chobun, ichiji, qa};
      const route = groups(data);
      let records;
      const updates = [];
      function refresh(){
        records = {practice:readRecord(win, win.Progress.KEY), chobun:readRecord(win, C.KEY), qa:readRecord(win, 'slz-qa-v2')};
        const readable = Object.values(records).filter(r => r !== null).length;
        $('record-note').textContent = readable === 3
          ? '記録はこのブラウザの分です。長文は現在の本文・問いでの全問正解を数えます。正解数は理解度の認定ではありません。'
          : '読み取れない学習記録があります。その記録の進み具合は表示していません。練習のリンクは使えます。';
        updates.forEach(update => update());
      }
      refresh();
      const wanted = win.location.hash.slice(1);
      for (const [n, group] of route.entries()) {
        const detail = el('details', undefined, 'group'); detail.id = group.id;
        detail.dataset.category = group.id; detail.open = group.id === wanted || (!wanted && n === 0);
        detail.append(el('summary', (n + 1) + '. ' + group.label));
        $('category-nav').append(anchor({label:group.label, href:'#' + group.id}));
        const label = el('label', '練習する短い文（' + group.problems.length + '文）', 'sentence-picker');
        const select = el('select'); select.id = 'sentence-' + group.id; label.htmlFor = select.id;
        group.problems.forEach(p => {
          const option = el('option', p.tokens.map(t => t.c).join('') + '（' + p.source.work + '）'); option.value = p.id; select.append(option);
        });
        if (!group.problems.length) { select.disabled = true; select.append(el('option', 'このまとまりの短文はありません')); }
        detail.append(label, select);
        const list = el('ol', undefined, 'steps'); detail.append(list);
        function render(){
          list.replaceChildren();
          const problem = group.problems.find(p => p.id === select.value);
          const counts = progress(group, records, texts.problems);
          for (const step of steps(group, problem, dictionary)) {
            const row = el('li'); row.dataset.step = step.id;
            row.append(el('h3', step.title), el('p', step.text));
            const nav = el('nav', undefined, 'practice'); nav.setAttribute('aria-label', group.label + '：' + step.title);
            step.links.forEach(item => nav.append(anchor(item))); row.append(nav);
            if (counts[step.id]) row.append(el('p', counts[step.id].join(' ／ '), 'progress'));
            list.append(row);
          }
        }
        select.addEventListener('change', render); updates.push(render); render();
        if (route[n + 1]) detail.append(anchor({label:'長文が解けたら、次の「' + route[n + 1].label + '」へ', href:'#' + route[n + 1].id}));
        else detail.append(el('p', 'ここまで解けたら、苦手な句法に戻って確かめましょう。', 'next'));
        $('route').append(detail);
      }
      function reveal(){
        const id = win.location.hash.slice(1), detail = doc.getElementById(id);
        if (detail && detail.classList.contains('group')) { detail.open = true; detail.scrollIntoView({block:'start'}); }
      }
      win.addEventListener('hashchange', reveal);
      win.addEventListener('pageshow', refresh);
      win.addEventListener('focus', refresh);
      win.addEventListener('storage', refresh);
      $('status').textContent = '11の句法を、取り組む順に並べています。';
      doc.documentElement.dataset.michiReady = 'true';
      if (wanted) reveal();
    } catch (error) {
      $('status').textContent = '道すじを読み込めませんでした。ページを開き直してください。';
      doc.documentElement.dataset.michiReady = 'error';
      win.console.error(error);
    }
  }
  return {groups, steps, readRecord, progress, mount};
});
