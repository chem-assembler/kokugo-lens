/* 重要漢字の一覧・読み検索・用例。項目の描画は提示モードと共有する。 */
(function(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./present.js') : root.KanbunPresent);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.KanbunJisho = api;
    if (document.body.hasAttribute('data-jisho')) api.init();
  }
})(typeof window !== 'undefined' ? window : this, function(P) {
  'use strict';
  const normalizeReading = value => String(value || '').normalize('NFKC').trim()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[ぁぃぅぇぉっゃゅょゎ]/g, c => ({ぁ:'あ',ぃ:'い',ぅ:'う',ぇ:'え',ぉ:'お',っ:'つ',ゃ:'や',ゅ:'ゆ',ょ:'よ',ゎ:'わ'}[c]));
  function filterCharacters(dictionary, role, query) {
    const q = normalizeReading(query);
    return Object.keys(dictionary).filter(c => {
      const e = dictionary[c];
      return (!role || e.uses.some(u => u.hataraki === role)) && (!q || c === q ||
        [...e.on, ...e.kun, ...e.uses.map(u => u.yomi)].some(y => normalizeReading(y).includes(q)));
    });
  }
  function init() {
    const $ = id => document.getElementById(id);
    const detail = $('entry-content'), grid = $('character-grid');
    let dictionary, problems, selected = new URLSearchParams(location.search).get('c');
    for (const role of P.HATARAKI) {
      const option = document.createElement('option');
      option.value = role; option.textContent = role; $('role-filter').appendChild(option);
    }
    function showEntry(c, userAction) {
      selected = c;
      for (const button of grid.children) button.setAttribute('aria-pressed', String(button.dataset.character === c));
      detail.innerHTML = c ? '<h2 id="entry-title">' + P.esc(c) + '</h2>'
        + P.buildDictionaryEntry(c, dictionary[c], null, problems) : '<p>条件に合う字がありません。読みや働きを変えてください。</p>';
      const url = new URL(location.href);
      if (c) url.searchParams.set('c', c); else url.searchParams.delete('c');
      history.replaceState(null, '', url);
      if (userAction && window.matchMedia('(max-width: 700px)').matches) {
        detail.focus({preventScroll: true});
        detail.scrollIntoView({block: 'start'});
      }
    }
    function render() {
      const chars = filterCharacters(dictionary, $('role-filter').value, $('reading-search').value);
      $('result-count').textContent = chars.length + '字 / 全' + Object.keys(dictionary).length + '字';
      grid.innerHTML = '';
      for (const c of chars) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = c; button.dataset.character = c;
        button.setAttribute('aria-label', c + 'の辞書を開く');
        button.addEventListener('click', () => showEntry(c, true));
        grid.appendChild(button);
      }
      showEntry(chars.includes(selected) ? selected : chars[0] || null, false);
    }
    Promise.all(['jisho.json?v=118', 'texts.json?v=118'].map(url => fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    }))).then(([data, texts]) => {
      dictionary = data; problems = new Map(texts.problems.map(p => [p.id, p]));
      render();
      $('reading-search').addEventListener('input', render);
      $('role-filter').addEventListener('change', render);
      $('reset').addEventListener('click', () => {
        $('reading-search').value = ''; $('role-filter').value = ''; render();
      });
    }).catch(e => {
      $('result-count').textContent = '読み込みに失敗しました';
      detail.textContent = '辞書を読み込めませんでした（' + e.message + '）。ページを再読み込みしてください。';
    });
  }
  return {normalizeReading, filterCharacters, init};
});
