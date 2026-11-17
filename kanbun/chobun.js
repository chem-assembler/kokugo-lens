/* 長文ステージ。文章・順番・問いの差し替えは chobun.json だけで行う。 */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KanbunChobun = api; if (document.getElementById('stage-list')) api.mount(document, root); }
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  const KEY = 'slz-koku-chobun-v1';
  // データ差し替え後に昔のクリアを流用しない。ブラウザでも Node でも同じ署名。
  const signature = (stage, byId) => JSON.stringify([stage.category, stage.problems.map(id => byId.get(id)), stage.questions]);
  function createProgress(getStorage){
    let memory = {}, fallback = false;
    function read(){
      if (fallback) return memory;
      try {
        const storage = getStorage();
        if (!storage) { fallback = true; return memory; }
        const parsed = JSON.parse(storage.getItem(KEY) || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return memory;
        memory = parsed;
      } catch(e){ fallback = true; }
      return memory;
    }
    function isClear(id, sig){ return read()[id] === sig; }
    function markClear(id, sig){
      const saved = read();
      saved[id] = sig;
      if (!fallback){
        try { getStorage().setItem(KEY, JSON.stringify(saved)); }
        catch(e){ fallback = true; }
      }
      memory = saved;
    }
    return {isClear, markClear, isMemory:() => { read(); return fallback; }};
  }
  function grade(stage, answers){
    const correct = stage.questions.map((q, i) => Number.isInteger(answers[i]) && answers[i] === q.answer);
    return {correct, count:correct.filter(Boolean).length, clear:correct.length > 0 && correct.every(Boolean)};
  }
  function referenceHref(stage, question, problem, types, index){
    const q = new URLSearchParams({from:'kanbun', p:problem.id, mode:'chobun', s:stage.id, q:String(index)});
    const code = question.code || (problem.kuho || []).find(id => types.has(id));
    if (code) q.set('code', code);
    else q.set('page', stage.referencePage || 'intro');
    return 'reference.html?' + q;
  }
  const markLabel = marks => {
    const letters = {1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'};
    return marks.filter(m => !m.re).sort((a,b) => a.lv - b.lv).map(m => (letters[m.lv] || '')[m.n - 1] || '').join('')
      + (marks.some(m => m.re) ? 'レ' : '');
  };
  async function mount(doc, win){
    const $ = id => doc.getElementById(id);
    const el = (tag, text, cls) => {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (cls) node.className = cls;
      return node;
    };
    const button = (text, fn, cls) => {
      const b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', fn); return b;
    };
    const link = (text, href) => { const a = el('a', text); a.href = href; return a; };
    try {
      const [data, texts, kuho] = await Promise.all(['chobun.json?v=120', 'texts.json?v=120', 'kuho.json?v=120'].map(async url => {
        const r = await win.fetch(url); if (!r.ok) throw new Error(url + ': ' + r.status); return r.json();
      }));
      const errors = win.KanbunChobunCheck.check(data, texts, kuho);
      if (errors.length) throw new Error(errors[0]);
      const K = win.Kanbun, stages = data.stages;
      const byId = new Map(texts.problems.map(p => [p.id,p]));
      const types = new Map(kuho.types.map(t => [t.id,t]));
      const progress = createProgress(() => win.localStorage);
      let stage = null, answers = [], index = 0, view = 'plain';
      function storageNote(){
        $('storage-note').textContent = progress.isMemory()
          ? 'この環境ではクリア記録を画面を閉じるまでの間だけ保持します。'
          : 'クリア記録はこのブラウザに保存します。';
      }
      function list(){
        stage = null;
        const url = new URL(win.location.href); url.search = ''; url.hash = ''; win.history.replaceState(null,'',url);
        $('stage-list').hidden = false; $('stage-view').hidden = true; $('cards').replaceChildren();
        stages.forEach(s => {
          const card = el('article', undefined, 'card'); card.dataset.stage = s.id;
          const clear = progress.isClear(s.id, signature(s, byId));
          card.append(el('h3',s.title),el('p',s.work));
          if (clear) card.append(el('p','✓ クリア','badge'));
          card.append(el('p','まずは「' + kuho.categories[s.category] + '」の句法クイズ・訓点モードに取り組もう。','muted'));
          const nav = el('nav');
          const practice = s.problems.find(id => (byId.get(id).kuho || []).includes(s.category)) || s.problems[0];
          nav.append(link('句法クイズ','kuho.html?' + new URLSearchParams({cat:s.category})),
            link('訓点モード','index.html?' + new URLSearchParams({p:practice, mode:'L3'})));
          card.append(nav,button('文章を読む（' + s.questions.length + '問）',() => open(s), 'primary'));
          $('cards').append(card);
        });
        storageNote();
      }
      function open(s, requested = 0, target){
        stage = s; answers = Array(s.questions.length).fill(null); index = Math.max(0,Math.min(s.questions.length - 1, requested)); view = 'plain';
        if (target && !requested){ const at = s.questions.findIndex(q => q.p === target); if (at >= 0) index = at; }
        $('stage-list').hidden = true; $('stage-view').hidden = false;
        $('stage-title').textContent = s.title; $('work').textContent = s.work; $('intro').textContent = s.intro;
        $('passage-note').textContent = s.note || (s.breaks ? '省略や場面の切り替わりは、本文内に注記しています。' : '既存の問題データから選んだ連続部分です。');
        $('stage-title').focus(); render();
      }
      function updateURL(){
        const url = new URL(win.location.href); url.search = new URLSearchParams({s:stage.id, q:String(index)}); url.hash = '';
        win.history.replaceState(null,'',url);
      }
      function passage(){
        const inner = $('passage-inner'); inner.replaceChildren();
        const target = stage.questions[index].p;
        stage.problems.forEach((id, n) => {
          if (stage.breaks && stage.breaks[id]) inner.append(el('p','〔' + stage.breaks[id] + '〕','break'));
          const p = byId.get(id), sentence = el('div', undefined, 'sentence' + (id === target ? ' target' : ''));
          sentence.dataset.problem = id; sentence.id = 'sentence-' + id;
          sentence.setAttribute('aria-label','文' + (n+1) + (id === target ? '、問いの対象' : ''));
          sentence.append(el('span',String(n+1), 'num'));
          if (view === 'kudashi') sentence.append(el('span',p.kakikudashi,'kudashi'));
          else p.tokens.forEach((t,i) => {
            const cell = el('span',undefined,'cell'); cell.append(el('span',t.c,'kanji'));
            if (t.p) cell.append(el('span',t.p,'punct'));
            if (view === 'marks'){
              const first = t.reread ? t.reread.first : t;
              if (first.okuri) cell.append(el('span',first.okuri,'okuri'));
              if (t.reread){
                const second = t.reread.second;
                cell.append(el('span',(second.yomi || '') + (second.okuri || ''),'second'));
              }
              const label = markLabel(K.marksOf(t)); if (label) cell.append(el('span',label,'kunten'));
              if (t.join && K.nextReadable(p.tokens,i) === i+1) cell.append(el('span',undefined,'joiner'));
            }
            sentence.append(cell);
          });
          inner.append(sentence);
        });
        doc.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.view === view)));
        // 外枠のスクロールだけを動かし、スマホでも問いの位置を飛ばさない。
        const selected = inner.querySelector('.target');
        if (selected) win.requestAnimationFrame(() => {
          const box = $('passage');
          const rect = selected.getBoundingClientRect(), frame = box.getBoundingClientRect();
          box.scrollLeft += rect.right - frame.right + 24;
        });
      }
      function render(){
        updateURL(); passage(); $('results').hidden = true; $('question').hidden = false;
        const host = $('question'); host.replaceChildren();
        const q = stage.questions[index], n = stage.problems.indexOf(q.p)+1;
        host.append(el('p','問' + (index+1) + ' / ' + stage.questions.length + '　' + ({kuho:'句法と読み',yaku:'現代語訳',naiyou:'内容説明'}[q.type]) + '｜対象：文' + n,'muted'));
        host.append(button('傍線の文を確かめる',() => $('passage').focus()));
        const field = el('fieldset'); field.append(el('legend',q.ask));
        q.choices.forEach((choice,i) => {
          const label = el('label',undefined,'choice'), input = el('input'); input.type = 'radio'; input.name = 'answer'; input.value = String(i); input.checked = answers[index] === i;
          input.addEventListener('change',() => { answers[index] = i; $('next-question').disabled = false; });
          label.append(input,el('span',choice)); field.append(label);
        });
        host.append(field);
        const nav = el('div',undefined,'toolbar');
        const previous = button('前の問い',() => { index--; render(); }); previous.disabled = index === 0;
        const next = button(index === stage.questions.length-1 ? '答え合わせ' : '次の問い',() => {
          if (index < stage.questions.length-1){ index++; render(); }
          else {
            const missing = answers.findIndex(a => a === null);
            if (missing >= 0) { index = missing; render(); }
            else showResults();
          }
        },'primary'); next.id = 'next-question'; next.disabled = answers[index] === null;
        nav.append(previous,next); host.append(nav);
      }
      function showResults(){
        const result = grade(stage, answers); $('question').hidden = true; $('results').hidden = false;
        const host = $('results'); host.replaceChildren();
        const title = el('h3', result.clear ? '✓ クリア！ 全問正解です。' : result.count + ' / ' + stage.questions.length + '問正解。解説を読んで、もう一度。');
        title.tabIndex = -1; host.append(title);
        stage.questions.forEach((q,i) => {
          const p = byId.get(q.p), good = result.correct[i];
          const card = el('article',undefined,'box answer ' + (good ? 'good' : 'wrong'));
          card.dataset.question = String(i);
          card.append(el('h3','問' + (i+1) + (good ? '：正解' : '：もう一度')),el('p',q.ask),el('p','あなたの答え：' + q.choices[answers[i]]));
          card.append(el('p','正解：' + q.choices[q.answer]), el('p',q.explain),el('p','本文の訳：' + p.meaning, 'muted'));
          if (p.note) card.append(el('p','※ ' + p.note, 'muted'));
          if (!good){
            const links = el('nav',undefined,'reference-links');
            links.append(link('📖 この句法を読む',referenceHref(stage,q,p,types,i)));
            card.append(links);
          }
          host.append(card);
        });
        if (result.clear){
          progress.markClear(stage.id,signature(stage,byId));
          if (progress.isMemory()) host.append(el('p','クリア記録は、この画面を閉じるまでの間だけ保持します。','muted'));
          const next = stages[stages.indexOf(stage)+1];
          if (next){
            const box = el('div',undefined,'box');
            box.append(el('h3','次は「' + kuho.categories[next.category] + '」へ'),el('p','句法クイズ・訓点モードで練習してから、次の文章に進もう。'));
            const practice = next.problems.find(id => (byId.get(id).kuho || []).includes(next.category)) || next.problems[0];
            box.append(link('句法クイズ','kuho.html?' + new URLSearchParams({cat:next.category})),doc.createTextNode(' ｜ '),
              link('訓点モード','index.html?' + new URLSearchParams({p:practice,mode:'L3'})),doc.createTextNode(' ｜ '),button(next.title + 'を開く',() => open(next)));
            host.append(box);
          } else host.append(el('p','最後のまとまりまで来ました。一覧でほかの文章にも取り組んでみましょう。'));
        } else host.append(button('間違えた問いを解き直す',() => {
          answers = answers.map((a,i) => result.correct[i] ? a : null); index = result.correct.indexOf(false); render();
        },'primary'));
        host.append(button('一覧に戻る',() => { list(); $('list-title').focus(); })); title.focus();
      }
      $('back-list').addEventListener('click',() => { list(); $('list-title').focus(); });
      doc.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click',() => { view = b.dataset.view; passage(); }));
      const params = new URLSearchParams(win.location.search);
      const wanted = stages.find(s => s.id === params.get('s')) || stages.find(s => s.problems.includes(params.get('p')));
      list();
      if (wanted) open(wanted, Number(params.get('q')) || 0, params.get('p'));
      $('status').textContent = ''; $('status').hidden = true;
      doc.documentElement.dataset.chobunReady = 'true';
      return {stages,progress};
    } catch(e){
      $('status').hidden = false; $('status').textContent = '長文のデータを読み込めませんでした。ページを開き直してください。';
      doc.documentElement.dataset.chobunReady = 'error'; win.console.error(e); return null;
    }
  }
  return {KEY,signature,createProgress,grade,referenceHref,mount};
});
