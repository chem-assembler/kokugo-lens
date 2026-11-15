/* 一字ちがいの出題。選択肢の組立ては DOM なしでも検査する。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KanbunIchiji = api; api.start(root.document); }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const normalized = s => s.normalize('NFKC').replace(/[\s、。，．「」『』]/g, '');
  function shuffle(values, random) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor((random || Math.random)() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function unique(values) {
    const seen = new Set();
    return values.filter(s => { const n = normalized(s); if (seen.has(n)) return false; seen.add(n); return true; });
  }
  function readingChoices(pair, side, pairs, random) {
    const other = side === 'a' ? 'b' : 'a';
    const own = pair[side].kakikudashi, opponent = pair[other].kakikudashi;
    const pool = shuffle(unique(pairs.filter(p => p.id !== pair.id).flatMap(p => [p.a.kakikudashi, p.b.kakikudashi])), random)
      .filter(s => normalized(s) !== normalized(own) && normalized(s) !== normalized(opponent));
    if (normalized(own) === normalized(opponent) || pool.length < 2) throw new Error('書き下しの異なる4択を作れません: ' + pair.id);
    return shuffle([own, opponent, ...pool.slice(0, 2)], random);
  }
  function meaningChoices(pair, random) {
    const a = unique([pair.point, ...(pair.ng || [])]);
    if (a.length !== 4) throw new Error('意味の4択を作れません: ' + pair.id);
    return shuffle(a, random);
  }
  async function start(doc) {
    const $ = id => doc.getElementById(id);
    try {
      const load = async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('読み込み失敗: ' + url);
        return response.json();
      };
      const [data, kuho] = await Promise.all([load('ichiji.json?v=119'), load('kuho.json?v=119')]);
      const pairs = data.pairs;
      if (!Array.isArray(pairs) || !pairs.length) throw new Error('問題がありません');
      const types = new Map(kuho.types.map(t => [t.id, t]));
      let filtered = pairs, current = null;
      for (const theme of new Set(pairs.map(p => p.theme))) {
        const opt = doc.createElement('option'); opt.value = theme; opt.textContent = theme; $('theme').appendChild(opt);
      }
      const el = (tag, text) => { const node = doc.createElement(tag); node.textContent = text; return node; };
      function choose(box, values, answer, onAnswer) {
        for (const value of values) {
          const button = el('button', value); button.type = 'button';
          button.addEventListener('click', () => {
            for (const b of box.querySelectorAll('button')) {
              b.disabled = true;
              if (b.textContent === answer) b.classList.add('correct');
            }
            if (value !== answer) button.classList.add('wrong');
            button.setAttribute('aria-pressed', 'true');
            onAnswer(value === answer, answer);
          });
          box.appendChild(button);
        }
      }
      function explain(pair) {
        $('answers').replaceChildren();
        for (const key of ['a', 'b']) {
          const s = pair[key];
          $('answers').appendChild(el('p', key.toUpperCase() + '：' + s.kakikudashi + ' ／ ' + s.meaning));
          const p = el('p', s.from ? '収録問題：' : 'この練習のために作った文');
          if (s.from) { const a = el('a', '元の問題を開く'); a.href = 'index.html?' + new URLSearchParams({p:s.from}); p.appendChild(a); }
          $('answers').appendChild(p);
        }
        $('point').textContent = pair.point;
        $('note').textContent = pair.note || ''; $('note').hidden = !pair.note;
        $('reference-links').replaceChildren();
        const linked = (pair.kuho || []).map(id => types.get(id)).filter(Boolean);
        if (linked.length) $('reference-links').appendChild(el('p', '📖 この句法を読む'));
        for (const type of linked) {
          const a = el('a', type.name || type.label);
          a.href = 'reference.html?' + new URLSearchParams({code:type.id, from:'kanbun', p:pair.id, mode:'ichiji'});
          a.dataset.kuho = type.id; $('reference-links').appendChild(a);
        }
        $('explanation').hidden = false; $('next').disabled = false;
      }
      function show(pair, focus) {
        current = pair;
        const index = filtered.indexOf(pair);
        $('counter').textContent = (index + 1) + ' / ' + filtered.length + ' 組';
        $('pair-title').textContent = pair.theme;
        $('context').textContent = pair.context || ''; $('context').hidden = !pair.context;
        $('hakubun-a').textContent = pair.a.hakubun; $('hakubun-b').textContent = pair.b.hakubun;
        $('reading-choices').replaceChildren(); $('meaning-choices').replaceChildren();
        $('meaning-feedback').textContent = '';
        $('meaning-section').hidden = true; $('explanation').hidden = true; $('next').disabled = true;
        let answered = 0;
        for (const key of ['a', 'b']) {
          const field = doc.createElement('fieldset');
          field.appendChild(el('legend', key.toUpperCase() + ' の書き下し'));
          const box = el('div', ''); box.className = 'choices'; field.appendChild(box);
          const feedback = el('p', ''); feedback.className = 'feedback'; feedback.setAttribute('role', 'status'); field.appendChild(feedback);
          choose(box, readingChoices(pair, key, pairs), pair[key].kakikudashi, (correct, answer) => {
            feedback.textContent = correct ? '正解です。' : '正解：' + answer;
            if (++answered === 2) {
              choose($('meaning-choices'), meaningChoices(pair), pair.point, correctMeaning => {
                $('meaning-feedback').textContent = correctMeaning ? '正解です。' : '正解を下の解説で確かめましょう。';
                explain(pair);
              });
              $('meaning-section').hidden = false; $('meaning-title').focus();
            }
          });
          $('reading-choices').appendChild(field);
        }
        const url = new URL(doc.defaultView.location.href); url.searchParams.set('id', pair.id);
        doc.defaultView.history.replaceState(null, '', url);
        $('exercise').hidden = false;
        if (focus) $('pair-title').focus();
      }
      $('theme').addEventListener('change', () => {
        filtered = pairs.filter(p => !$('theme').value || p.theme === $('theme').value);
        show(filtered[0], true);
      });
      $('next').addEventListener('click', () => show(filtered[(filtered.indexOf(current) + 1) % filtered.length], true));
      const id = new URLSearchParams(doc.defaultView.location.search).get('id');
      const initial = pairs.find(p => p.id === id);
      show(initial || pairs[0], false);
      $('notice').textContent = id && !initial ? '指定された組がないため、最初の組を表示しています。' : '';
      doc.documentElement.dataset.ichijiReady = 'true';
    } catch (error) {
      $('exercise').hidden = true;
      $('notice').textContent = '問題を読み込めませんでした。ページを開き直してください。';
      doc.documentElement.dataset.ichijiReady = 'error';
      console.error(error);
    }
  }
  return {normalized, readingChoices, meaningChoices, start};
});
