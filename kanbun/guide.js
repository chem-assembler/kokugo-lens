'use strict';
/*
 * guide.js — 志望校から「このアプリのどこをやると効くか」を引く案内
 *
 * データは universities.json（出典は docs/exam-kanbun-sources.md の実測調査）。
 * **推測を書かない**のがこのページの生命線なので、データに無い項目は行ごと出さない。
 */
(function(){
  const $ = id => document.getElementById(id);
  let DATA = null;

  // モード名 → 遷移先。訓点モードは ?mode= で直接その段を開く
  const LINK = {
    L1: 'index.html?mode=L1', L2: 'index.html?mode=L2',
    L3: 'index.html?mode=L3', L4: 'index.html?mode=L4', L6: 'index.html?mode=L6',
    K:  'kudashi.html', kuho: 'kuho.html', qa: '../qa/'
  };

  fetch('universities.json?v=50')
    .then(r => r.json())
    .then(d => {
      DATA = d;
      const sel = $('uni-select');
      let group = null;
      for (const u of d.universities){
        if (u.group !== group){
          group = u.group;
          const og = document.createElement('optgroup');
          og.label = group;
          og.dataset.group = group;
          sel.appendChild(og);
        }
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name;
        sel.lastChild.appendChild(opt);
      }
      sel.addEventListener('change', () => render(sel.value));
      render(d.universities[0].id);
    })
    .catch(e => { $('detail').textContent = '案内データの読み込みに失敗しました: ' + e; });

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  // データ側の **強調** だけをタグに変える（それ以外の HTML は通さない）
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  function row(key, value, cls){
    if (!value) return '';
    return '<div class="row' + (cls ? ' ' + cls : '') + '">'
      + '<span class="k">' + esc(key) + '</span>'
      + '<span class="v">' + md(value) + '</span></div>';
  }

  function render(id){
    const u = DATA.universities.find(x => x.id === id);
    if (!u) return;
    const host = $('detail');

    if (u.hasKanbun === false){
      host.innerHTML = '<div class="card">'
        + '<h2>' + esc(u.name) + '</h2>'
        + '<ul class="nokanbun">'
        + u.list.map(x => '<li><strong>' + esc(x.name) + '</strong> … ' + md(x.detail) + '</li>').join('')
        + '</ul>'
        + row('とはいえ', u.why)
        + row('注意', u.caution, 'caution')
        + '<div class="src">出典: docs/exam-kanbun-sources.md（実測調査）</div>'
        + '</div>';
      return;
    }

    const modes = (u.best || []).map((m, i) => {
      const info = DATA.modes[m];
      if (!info) return '';
      return '<a class="' + (i === 0 ? '' : 'sub') + '" href="' + LINK[m] + '">'
        + esc(info.name) + '</a>';
    }).join('');

    host.innerHTML = '<div class="card">'
      + '<h2>' + esc(u.name) + '</h2>'
      + (u.faculty ? '<div class="fac">' + md(u.faculty) + '</div>' : '')
      + row('効くところ', u.why)
      + '<div class="modes">' + modes + '</div>'
      + row('出やすい題材', u.genre)
      + row('近年の傾向', u.trend)
      + row('注意', u.caution, 'caution')
      + row('調査範囲', u.years)
      + '<div class="src">出典: docs/exam-kanbun-sources.md（実測調査）</div>'
      + '</div>';
  }
})();
