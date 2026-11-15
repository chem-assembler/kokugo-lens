/*
 * print.js — 提示モードと同じ文章から、A4 の授業プリントを組み立てる。
 * buildWorksheet / renderWorksheet は DOM 非依存。Node の全文章検査でも使う。
 */
(function(root){
  'use strict';
  const isNode = typeof module !== 'undefined' && typeof require === 'function';
  const K = isNode ? require('./kanbun.js') : root.Kanbun;
  const LIMITS = Object.freeze({rows:12, columns:9, answerLines:24, words:10});
  const DEFAULTS = Object.freeze({raw:true, marked:false, kudashi:true, meaning:true, words:false, answers:false});
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function groupTexts(problems){
    const groups = new Map();
    for (const p of problems){
      // present.js の groups の key・順番と揃える。
      const key = p.source.work + '・' + (p.source.chapter || '');
      if (!groups.has(key)) groups.set(key, {key, label:key, problems:[]});
      groups.get(key).problems.push(p);
    }
    return [...groups.values()];
  }
  function markLabel(marks){
    const char = m => (({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '?');
    return marks.filter(m => !m.re).sort((a,b) => a.lv - b.lv).map(char).join('')
      + (marks.some(m => m.re) ? 'レ' : '');
  }
  function wordCandidates(group, imi, types){
    const words = [];
    for (const p of group.problems){
      const excluded = new Set();
      // 「見」等が普通の動詞のときまで除かない。その文に結ばれた句法の
      // markers が本文中で一致した位置だけを除く（複数字の目印にも対応）。
      const plain = p.tokens.map(t => t.c).join('');
      for (const type of types){
        if (!(p.kuho || []).includes(type.id) && !(type.examples || []).includes(p.id)) continue;
        for (const marker of type.markers || []){
          if (!marker) continue;
          let start = plain.indexOf(marker);
          while (start >= 0){
            let offset = 0;
            p.tokens.forEach((t,i) => {
              if (offset < start + marker.length && offset + t.c.length > start) excluded.add(i);
              offset += t.c.length;
            });
            start = plain.indexOf(marker, start + 1);
          }
        }
      }
      p.tokens.forEach((t,i) => {
        const meaning = (imi[p.id] || [])[i];
        if (t.role === 'placed' || excluded.has(i) || typeof meaning !== 'string' || !meaning.trim()) return;
        words.push({key:p.id + ':' + i, problemId:p.id, index:i, char:t.c, meaning,
          sentence:group.problems.indexOf(p) + 1, context:plain});
      });
    }
    return words;
  }
  function textColumns(group){
    const columns = [];
    group.problems.forEach((p,sentence) => {
      let start = 0;
      while (start < p.tokens.length){
        let end = Math.min(start + LIMITS.rows, p.tokens.length);
        // 熟語返りの連読符を列末・ページ末で切らない。
        while (end < p.tokens.length && end > start && p.tokens[end - 1].join) end--;
        if (end === start) throw new Error(p.id + ' の連読が1列の上限を超えています');
        columns.push({problemId:p.id, sentence:sentence + 1, continued:start > 0,
          tokens:p.tokens.slice(start,end).map((t,j) => ({
            char:t.c, punct:t.p || '', okuri:(t.reread ? t.reread.first.okuri : t.okuri) || '',
            mark:markLabel(K.marksOf(t)), join:!!t.join && K.nextReadable(p.tokens,start+j) === start+j+1
          }))});
        start = end;
      }
    });
    return columns;
  }
  function buildWorksheet(group, imi, types, options, selected){
    if (!group || !group.problems || !group.problems.length) throw new Error('文章が見つかりません');
    const opts = Object.assign({}, DEFAULTS, options);
    const pages = [], columns = textColumns(group);
    for (const kind of ['raw','marked']){
      if (!opts[kind]) continue;
      for (let i=0; i<columns.length; i+=LIMITS.columns)
        pages.push({kind, columns:columns.slice(i,i+LIMITS.columns)});
    }
    for (const kind of ['kudashi','meaning']){
      if (!opts[kind]) continue;
      let entries = [], used = 0;
      group.problems.forEach((p,i) => {
        const answer = String((kind === 'kudashi' ? p.kakikudashi : p.meaning) || '');
        // 横書き1行を全角36字として多めに見積もり、空欄と解答の余白を揃える。
        const lines = Math.max(2, Math.ceil([...answer].length / 36) + 1);
        if (entries.length && used + lines + 1 > LIMITS.answerLines){
          pages.push({kind, entries}); entries = []; used = 0;
        }
        entries.push({problemId:p.id, sentence:i+1, lines, answer:opts.answers ? answer : ''});
        used += lines + 1;
      });
      if (entries.length) pages.push({kind, entries});
    }
    const keys = new Set(selected || []);
    const words = opts.words ? wordCandidates(group,imi,types).filter(w => keys.has(w.key)) : [];
    for (let i=0; i<words.length; i+=LIMITS.words)
      pages.push({kind:'words', entries:words.slice(i,i+LIMITS.words).map(w => Object.assign({},w,{meaning:opts.answers ? w.meaning : ''}))});
    return {key:group.key, title:group.label, work:group.problems[0].source.work,
      chapter:group.problems[0].source.chapter || '', answers:!!opts.answers, pages};
  }
  const labels = {raw:'白文（返り点・送り仮名の練習）', marked:'訓点つき白文', kudashi:'書き下し', meaning:'現代語訳', words:'重要な字の意味'};
  function renderWorksheet(model){
    return model.pages.map((page,i) => {
      let body = '';
      if (page.columns){
        body = '<div class="passage">' + page.columns.map(col =>
          '<div class="text-column"><div class="sentence-number">' + col.sentence + (col.continued ? ' 続' : '') + '</div>'
          + '<div class="vertical-line">' + col.tokens.map(t => '<span class="cell">'
            + '<span class="kanji">' + esc(t.char) + '</span>'
            + (t.punct ? '<span class="punct">' + esc(t.punct) + '</span>' : '')
            + (page.kind === 'marked' ? (t.okuri ? '<span class="okuri' + (t.okuri.length > 5 ? ' long' : '') + '">' + esc(t.okuri) + '</span>' : '')
              + (t.mark ? '<span class="kunten">' + esc(t.mark) + '</span>' : '')
              + (t.join ? '<span class="joiner"></span>' : '') : '') + '</span>').join('')
          + '</div></div>').join('') + '</div>';
      } else if (page.kind === 'words'){
        body = '<table class="word-table"><thead><tr><th scope="col">文</th><th scope="col">字</th><th scope="col">この文での意味</th></tr></thead><tbody>'
          + page.entries.map(w => '<tr><td>' + w.sentence + '</td><th scope="row">' + esc(w.char) + '</th><td>' + esc(w.meaning) + '</td></tr>').join('') + '</tbody></table>';
      } else {
        body = page.entries.map(e => '<div class="answer-entry"><div class="entry-number">' + e.sentence + '</div>'
          + '<div class="answer-lines" style="--lines:' + e.lines + '">'
          + Array.from({length:e.lines}, (_,j) => '<span class="answer-rule" style="top:' + ((j+1)*8) + 'mm" aria-hidden="true"></span>').join('')
          + '<span class="answer-text">' + esc(e.answer) + '</span></div></div>').join('');
      }
      return '<article class="sheet"><header class="sheet-header"><h1>' + esc(model.title) + '</h1>'
        + '<p class="source">出典：' + esc(model.work + (model.chapter ? '・' + model.chapter : '')) + '</p>'
        + '<div class="student-fields"><span>日付：　　 年　　月　　日</span><span>名前：　　　　　　　　　　　　</span></div></header>'
        + '<h2>' + labels[page.kind] + (model.answers ? '〈答えつき〉' : '') + '</h2>' + body
        + '<footer class="page-number">' + (i+1) + ' / ' + model.pages.length + '</footer></article>';
    }).join('');
  }
  const api = {LIMITS, DEFAULTS, groupTexts, wordCandidates, textColumns, buildWorksheet, renderWorksheet};
  if (isNode) module.exports = api;
  else {
    root.KanbunPrint = api;
    if (document.getElementById('print-controls')) init();
  }

  function init(){
    const $ = id => document.getElementById(id);
    const selected = new Set();
    let group, imi, types;
    function update(){
      const options = {};
      for (const key of Object.keys(DEFAULTS)) options[key] = $('opt-' + key).checked;
      const model = buildWorksheet(group,imi,types,options,selected);
      $('pages').innerHTML = renderWorksheet(model);
      $('notice').textContent = model.pages.length ? model.pages.length + 'ページ（A4 縦）' : '印刷する項目や重要な字を選んでください。';
      $('btn-print').disabled = !model.pages.length;
      $('word-picker').hidden = !options.words;
    }
    Promise.all(['texts.json?v=119','imi.json?v=119','kuho.json?v=119'].map(url => fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    }))).then(([texts,imiData,kuho]) => {
      const key = new URLSearchParams(location.search).get('t');
      group = groupTexts(texts.problems).find(g => g.key === key);
      if (!group) throw new Error('指定された文章がありません。提示モードから「プリント」を開き直してください。');
      imi = imiData; types = kuho.types;
      document.title = group.label + '｜授業プリント';
      $('present-link').href = 'present.html?t=' + encodeURIComponent(group.key);
      const picker = $('word-buttons');
      const candidates = wordCandidates(group,imi,types);
      let lastId = null, row;
      for (const w of candidates){
        if (lastId !== w.problemId){
          row = document.createElement('div'); row.className = 'word-row';
          const context = document.createElement('p'); context.textContent = w.sentence + '：' + w.context;
          row.appendChild(context); picker.appendChild(row); lastId = w.problemId;
        }
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = w.char; button.title = w.meaning;
        button.setAttribute('aria-label', w.sentence + '文目の' + w.char + '（' + (w.index+1) + '字目）');
        button.setAttribute('aria-pressed','false');
        button.addEventListener('click', () => {
          if (selected.has(w.key)) selected.delete(w.key); else selected.add(w.key);
          button.setAttribute('aria-pressed',String(selected.has(w.key))); update();
        });
        row.appendChild(button);
      }
      if (!candidates.length) picker.textContent = 'この文章には選べる字がありません。';
      $('settings').disabled = false;
      $('print-controls').addEventListener('change',update);
      $('btn-print').addEventListener('click', () => root.print());
      update();
    }).catch(e => {
      $('notice').textContent = 'プリントを作成できませんでした（' + e.message + '）';
      $('btn-print').disabled = true;
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
