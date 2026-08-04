'use strict';
/*
 * game.js — 訓点モード（L3: 白文＋送り仮名に返り点を打つ）の UI
 * ロジックはすべて kanbun.js（DOM 非依存）に置く。ここは描画と入力だけ。
 */
(function(){
  const K = window.Kanbun;
  const $ = id => document.getElementById(id);

  let problems = [];
  let problem = null;
  let userMarks = [];        // トークン番号 -> mark 配列
  let selected = -1;         // 選択中のトークン番号
  let showAnswer = false;
  let showYomi = false;
  let lastResult = null;

  const KUNTEN_LABEL = m => m.re ? 'レ'
    : ({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '?';

  // ---- 問題の読み込み ----------------------------------------------------
  fetch('texts.json?v=1')
    .then(r => r.json())
    .then(data => {
      problems = data.problems.slice()
        .sort((a, b) => K.difficulty(a) - K.difficulty(b));
      const sel = $('problem-select');
      problems.forEach((p, idx) => {
        const opt = document.createElement('option');
        const plain = p.tokens.map(t => t.c).join('');
        opt.value = idx;
        opt.textContent = p.source.work + '「' + plain + '」（難度 ' + K.difficulty(p) + '）';
        sel.appendChild(opt);
      });
      loadProblem(0);
    })
    .catch(e => { $('meta').textContent = 'texts.json の読み込みに失敗しました: ' + e; });

  function loadProblem(idx){
    problem = problems[idx];
    userMarks = problem.tokens.map(() => []);
    selected = -1;
    showAnswer = false;
    lastResult = null;
    $('btn-answer').classList.remove('toggled');
    render();
  }

  // ---- 描画 --------------------------------------------------------------
  function mergedTokens(){
    return problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      c.mark = userMarks[i];
      return c;
    });
  }

  function render(){
    const marksSource = showAnswer
      ? problem.tokens.map(t => t.mark || [])
      : userMarks;
    const toks = problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      c.mark = marksSource[i];
      return c;
    });
    const order = showAnswer ? problem.order : K.readOrder(toks);

    // 読み順バッジ（同じ字が2回読まれる再読文字は「1・6」のように併記）
    const badge = new Map();
    order.forEach((tokenIdx, pos) => {
      if (!badge.has(tokenIdx)) badge.set(tokenIdx, []);
      badge.get(tokenIdx).push(pos + 1);
    });

    const sen = $('sentence');
    sen.innerHTML = '';
    problem.tokens.forEach((t, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (i === selected) cell.classList.add('selected');
      if (lastResult && lastResult.status === 'wrong' && !showAnswer
          && lastResult.order[lastResult.divergeAt] === i) cell.classList.add('diverge');

      const kanji = document.createElement('span');
      kanji.className = 'kanji';
      kanji.textContent = t.c;
      cell.appendChild(kanji);

      if (showYomi){
        const y = t.reread ? (t.reread.first.yomi || '') : (t.yomi || '');
        if (y){
          const yomi = document.createElement('span');
          yomi.className = 'yomi';
          yomi.textContent = y;
          cell.appendChild(yomi);
        }
      }
      if (t.okuri || (t.reread && t.reread.first.okuri)){
        const ok = document.createElement('span');
        ok.className = 'okuri';
        ok.textContent = t.reread ? t.reread.first.okuri : t.okuri;
        cell.appendChild(ok);
      }
      const marks = marksSource[i] || [];
      if (marks.length){
        const kt = document.createElement('span');
        kt.className = 'kunten';
        // 表示順: 番号（内側の階層から）→ レ
        const nums = marks.filter(m => !m.re).sort((a, b) => a.lv - b.lv);
        const re = marks.some(m => m.re);
        kt.textContent = nums.map(KUNTEN_LABEL).join('') + (re ? 'レ' : '');
        cell.appendChild(kt);
      }
      if (badge.has(i)){
        const b = document.createElement('span');
        b.className = 'order-badge';
        b.textContent = badge.get(i).join('・');
        cell.appendChild(b);
      }
      cell.addEventListener('click', () => {
        selected = (selected === i) ? -1 : i;
        render();
      });
      sen.appendChild(cell);
    });

    // ライブ書き下し（間違った訓点でもそのまま出す = それ自体がフィードバック）
    $('kudashi-live').textContent = K.toKakikudashi(toks, order) || '（訓点を打つとここに書き下しが出ます）';
    const expected = problem.tokens.reduce(
      (s, t) => s + (t.role === 'placed' ? 0 : (t.reread ? 2 : 1)), 0);
    $('kudashi-note').textContent =
      order.length < expected ? '（まだ読まれない字が残っています）' : '';

    renderMeta();
  }

  function renderMeta(){
    const m = $('meta');
    const cleared = lastResult && lastResult.status !== 'wrong';
    let html = '出典: ' + problem.source.work + '（' + problem.source.chapter + '）';
    if (cleared){
      html += '<br>書き下し: ' + problem.kakikudashi + '<br>意味: ' + problem.meaning;
    }
    m.innerHTML = html;
  }

  // ---- 操作 --------------------------------------------------------------
  $('problem-select').addEventListener('change', e => loadProblem(+e.target.value));

  document.querySelectorAll('#palette button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selected < 0 || showAnswer) return;
      const v = btn.dataset.mark;
      let marks = userMarks[selected];
      if (v === 'erase'){
        marks = [];
      } else if (v === 're'){
        marks = marks.some(m => m.re) ? marks.filter(m => !m.re)
                                      : marks.concat([{ re: true }]);
      } else {
        const lv = +v.split('-')[0], n = +v.split('-')[1];
        const had = marks.some(m => m.lv === lv && m.n === n);
        marks = marks.filter(m => m.re || m.lv !== lv);   // 同じ階層の番号は付け替え
        if (!had) marks.push({ lv, n });
      }
      userMarks[selected] = marks;
      lastResult = null;
      $('result').className = '';
      render();
    });
  });

  $('btn-grade').addEventListener('click', () => {
    if (!problem) return;
    lastResult = K.grade(userMarks, problem);
    const r = $('result');
    if (lastResult.status === 'ok'){
      r.className = 'ok';
      r.textContent = '○ クリア！ 読み順が正解と一致しました。';
    } else if (lastResult.status === 'variant'){
      r.className = 'ok';
      r.textContent = '○ クリア！ 登録と違う打ち方ですが、読み順は正しい別解です（原則: 表記ではなく読み順で判定します）。';
    } else {
      r.className = 'wrong';
      r.textContent = '× ' + lastResult.message;
    }
    render();
  });

  $('btn-reset').addEventListener('click', () => {
    if (!problem) return;
    userMarks = problem.tokens.map(() => []);
    lastResult = null;
    $('result').className = '';
    render();
  });

  $('btn-answer').addEventListener('click', () => {
    showAnswer = !showAnswer;
    $('btn-answer').classList.toggle('toggled', showAnswer);
    render();
  });

  $('btn-yomi').addEventListener('click', () => {
    showYomi = !showYomi;
    $('btn-yomi').classList.toggle('toggled', showYomi);
    render();
  });
})();
