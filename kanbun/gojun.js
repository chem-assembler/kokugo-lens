/* 意味から白文の語順を組み立てる。採点・候補選択は DOM に依存しない。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.KanbunGojun = api;
    if (document.querySelector('[data-gojun]')) api.init();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // 初期収録分には詩形の注記がない行もあるため、作品名でも除外する。
  const POETRY_WORKS = new Set([
    '春暁', '偶成', '雑詩', '山行', '桂林荘雑詠示諸生', '題不識庵撃機山図', '鹿柴',
    '静夜思', '黄鶴楼送孟浩然之広陵', '早発白帝城', '春望', '絶句（江碧鳥逾白）',
    '月夜', '望岳', '涼州詞', '送元二使安西', '竹里館', '九月九日憶山東兄弟',
    '楓橋夜泊', '江雪', '登鸛雀楼', '回郷偶書 其一', '尋隠者不遇', '秋風引',
    '金縷衣', '春宵', '題西林壁', '偶成（勧学詩）'
  ]);
  // 散文集・史書の中で引用された歌も、該当する問題だけを除外する。
  const POETRY_IDS = new Set(['mq-riennso-myonichi', 'shiki-sui', 'gaika-chikara', 'gaika-sui', 'gaika-gu']);
  const chars = problem => problem.tokens.map(t => t.c);
  function grade(expected, actual) {
    const n = Math.max(expected.length, actual.length);
    for (let i = 0; i < n; i++) {
      if (expected[i] !== actual[i]) return {correct: false, firstMismatch: i};
    }
    return {correct: true, firstMismatch: -1};
  }
  function exclusionReason(problem) {
    const source = problem.source || {};
    if (POETRY_IDS.has(problem.id) || POETRY_WORKS.has(source.work) || /五絶|七絶|五律|七律|古詩|五言|七言|楽府|排律/.test(
      (source.work || '') + ' ' + (source.chapter || ''))) return 'poetry';
    if (chars(problem).length < 2) return 'too-short';
    if (new Set(chars(problem)).size < 2) return 'identical';
    return '';
  }
  function candidates(problems) { return problems.filter(p => !exclusionReason(p)); }
  function lengthGroup(problem) {
    const n = chars(problem).length;
    return n <= 6 ? 'short' : n <= 12 ? 'medium' : 'long';
  }
  function categoriesFor(problem, kuho) {
    const types = new Map(kuho.types.map(t => [t.id, t.category]));
    return [...new Set((problem.kuho || []).map(code => types.get(code) || code)
      .filter(code => Object.prototype.hasOwnProperty.call(kuho.categories, code)))];
  }
  function filterCandidates(problems, kuho, category, length) {
    return candidates(problems).filter(p => (!category || categoriesFor(p, kuho).includes(category))
      && (!length || lengthGroup(p) === length));
  }
  function shuffled(expected, random = Math.random) {
    const result = expected.slice();
    for (let attempt = 0; attempt < 8; attempt++) {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      if (!grade(expected, result).correct) return result;
    }
    // 同字が多い場合にも終了させ、必ず元とは違う並びにする。
    const j = result.findIndex(c => c !== result[0]);
    if (j > 0) [result[0], result[j]] = [result[j], result[0]];
    return result;
  }

  async function init() {
    const $ = id => document.getElementById(id);
    let problem = null, pool = [], all = [], kuho = null, dragging = false, ignoreClickUntil = 0;
    function controls(enabled) {
      for (const id of ['btn-grade', 'btn-hint', 'btn-reset']) $(id).disabled = !enabled;
      $('btn-next').disabled = !pool.length;
    }
    function clearResult() {
      $('result').hidden = true;
      $('result').replaceChildren();
      document.querySelectorAll('.card.bad').forEach(el => el.classList.remove('bad'));
      $('answer-count').textContent = $('tray-order').children.length + ' / ' + chars(problem).length + ' 字';
    }
    function card(c) {
      const el = document.createElement('div');
      el.className = 'card';
      el.textContent = c;
      el.dataset.char = c;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', c + '：タップで移す');
      return el;
    }
    function reset() {
      $('tray-source').replaceChildren(...shuffled(chars(problem)).map(card));
      $('tray-order').replaceChildren();
      $('tray-source').scrollLeft = $('tray-order').scrollLeft = 0;
      $('hint-text').hidden = true;
      $('hint-text').textContent = '';
      $('btn-hint').disabled = false;
      clearResult();
    }
    function load(p) {
      problem = p;
      $('exercise').hidden = false;
      $('meaning').textContent = p.meaning;
      $('source').textContent = '出典：' + p.source.work + (p.source.chapter ? '（' + p.source.chapter + '）' : '');
      controls(true);
      reset();
      const url = new URL(location.href);
      url.searchParams.set('p', p.id);
      history.replaceState(null, '', url);
    }
    function next() {
      if (!pool.length) return;
      const choices = pool.filter(p => !problem || p.id !== problem.id);
      const available = choices.length ? choices : pool;
      load(available[Math.floor(Math.random() * available.length)]);
    }
    function filter() {
      pool = filterCandidates(all, kuho, $('category-select').value, $('length-select').value);
      $('pool-count').textContent = '候補 ' + pool.length + ' 問';
      $('notice').textContent = pool.length ? '' : 'この条件の問題はありません。条件を変えてください。';
      controls(false);
      if (pool.length) next();
      else { problem = null; $('exercise').hidden = true; }
    }
    function moveCard(el) {
      if (!problem || dragging || Date.now() < ignoreClickUntil) return;
      const target = el.parentElement.id === 'tray-source' ? $('tray-order') : $('tray-source');
      target.appendChild(el);
      clearResult();
      el.focus({preventScroll: true});
      el.scrollIntoView({block: 'nearest', inline: 'nearest'});
    }
    function paragraph(label, text) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label + '：';
      p.appendChild(strong);
      const parts = (text || '（注記なし）').split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          const emphasis = document.createElement('b');
          emphasis.textContent = part.slice(2, -2);
          p.appendChild(emphasis);
        } else p.append(part);
      }
      $('result').appendChild(p);
    }
    function check() {
      if (!problem) return;
      clearResult();
      const actual = [...$('tray-order').children].map(el => el.dataset.char);
      const result = grade(chars(problem), actual);
      $('result').className = result.correct ? 'ok' : 'wrong';
      paragraph('判定', result.correct ? '○ 正解です。' : '× ' + (result.firstMismatch + 1) + ' 字目から、収録した原文と違います。');
      if (!result.correct) {
        [...$('tray-order').children].slice(result.firstMismatch).forEach(el => el.classList.add('bad'));
        paragraph('見直すところ', actual.length < chars(problem).length
          ? 'すべての字を答え欄へ移し、左から順に確かめましょう。'
          : '色の付いた字を、動詞・目的語や否定語の位置に注目して並べ直しましょう。');
      }
      paragraph('白文', problem.tokens.map(t => t.c + (t.p || '')).join(''));
      paragraph('書き下し', problem.kakikudashi);
      paragraph('注記', problem.note);
      const type = (problem.kuho || []).map(code => kuho.types.find(t => t.id === code)).find(Boolean);
      if (!result.correct) {
        const a = document.createElement('a');
        const context = {from: 'kanbun', p: problem.id, mode: 'gojun'};
        a.href = type
          ? 'reference.html?' + new URLSearchParams({code: type.id, ...context})
          : 'reference.html?' + new URLSearchParams({page: 'word-order', ...context}) + '#ref-sec-order-2';
        a.textContent = type ? '📖 この句法を読む（' + (type.name || type.label) + '）' : '📖 語順の基本を読む';
        $('result').appendChild(a);
      }
      $('result').hidden = false;
    }
    controls(false);
    try {
      const [texts, types] = await Promise.all(['texts.json?v=118', 'kuho.json?v=118'].map(async url => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(url + ': ' + r.status);
        return r.json();
      }));
      all = texts.problems;
      kuho = types;
      for (const [id, label] of Object.entries(kuho.categories)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = label;
        $('category-select').appendChild(option);
      }
      for (const id of ['tray-source', 'tray-order']) {
        new Sortable($(id), {
          itemSelector: '.card', group: {name: 'gojun-cards'}, direction: 'horizontal',
          ghostClass: 'sortable-ghost', delay: 180, delayOnTouchOnly: true, touchStartThreshold: 6,
          onStart: () => { dragging = true; },
          onEnd: () => { dragging = false; ignoreClickUntil = Date.now() + 300; clearResult(); }
        });
        $(id).addEventListener('click', e => {
          const el = e.target.closest('.card');
          if (el) moveCard(el);
        });
        $(id).addEventListener('keydown', e => {
          const el = e.target.closest('.card');
          if (!el) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); moveCard(el); }
          if (id === 'tray-order' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'ArrowLeft' && el.previousElementSibling) el.previousElementSibling.before(el);
            else if (e.key === 'ArrowRight' && el.nextElementSibling) el.nextElementSibling.after(el);
            clearResult();
            el.scrollIntoView({block: 'nearest', inline: 'nearest'});
          }
        });
      }
      $('category-select').addEventListener('change', filter);
      $('length-select').addEventListener('change', filter);
      $('btn-next').addEventListener('click', next);
      $('btn-reset').addEventListener('click', reset);
      $('btn-grade').addEventListener('click', check);
      $('btn-hint').addEventListener('click', () => {
        $('hint-text').textContent = '書き下し：' + problem.kakikudashi;
        $('hint-text').hidden = false;
        $('btn-hint').disabled = true;
      });
      pool = candidates(all);
      $('pool-count').textContent = '候補 ' + pool.length + ' 問';
      const id = new URLSearchParams(location.search).get('p');
      const requested = pool.find(p => p.id === id);
      if (id && !requested) $('notice').textContent = '指定された問題は出題対象外、または見つかりません。別の問題を表示します。';
      if (requested) load(requested);
      else if (pool.length) next();
      else $('notice').textContent = '出題できる問題がありません。';
      document.documentElement.dataset.gojunReady = 'true';
    } catch (error) {
      pool = [];
      controls(false);
      $('exercise').hidden = true;
      $('notice').textContent = '問題を読み込めませんでした。ページを開き直してください。';
      document.documentElement.dataset.gojunReady = 'error';
      console.error(error);
    }
  }
  return {chars, grade, exclusionReason, candidates, lengthGroup, categoriesFor, filterCandidates, shuffled, init};
});
