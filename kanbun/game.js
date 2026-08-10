'use strict';
/*
 * game.js — 訓点モードの UI（L1: 読む順にタップ / L2: 訓点を1つ選ぶ / L3: 訓点を打つ）
 * ロジックはすべて kanbun.js（DOM 非依存）に置く。ここは描画と入力だけ。
 * 誤答時は「ユーザーの読み方」を矢印で辿って食い違い位置で止める（設計原則2）。
 */
(function(){
  const K = window.Kanbun;
  const $ = id => document.getElementById(id);
  const sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  let problems = [];
  let problem = null;
  let mode = 'L1';
  let showAnswer = false;
  let showYomi = false;

  // L1 の状態
  let tapPos = 0;            // 正しくタップできた読みの数
  let l1Done = false;
  // L2 の状態
  let blankIdx = -1;         // 空欄にしたトークン番号
  let choices = [];          // {marks, label}
  let l2Attempt = null;      // 直前に選んだ誤答 {marks, order, message}
  let l2Solved = false;
  // L3 の状態
  let userMarks = [];
  let selected = -1;
  let lastResult = null;
  // アニメの状態
  let animTimer = null;

  const KUNTEN_CHAR = m => m.re ? 'レ'
    : (({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '?');
  function markSetLabel(marks){
    if (!marks || !marks.length) return 'なし';
    const nums = marks.filter(m => !m.re).sort((a, b) => a.lv - b.lv);
    return nums.map(KUNTEN_CHAR).join('') + (marks.some(m => m.re) ? 'レ' : '');
  }
  function withMarks(marksArr){
    return problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      c.mark = marksArr[i] || [];
      return c;
    });
  }
  const problemMarks = () => problem.tokens.map(t => t.mark || []);
  const expectedReads = () => problem.tokens.reduce(
    (s, t) => s + (t.role === 'placed' ? 0 : (t.reread ? 2 : 1)), 0);

  // ---- 問題の読み込み ----------------------------------------------------
  fetch('texts.json?v=5')
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
    $('btn-answer').classList.remove('toggled');
    resetModeState();
    render();
  }

  function resetModeState(){
    stopAnim();
    tapPos = 0; l1Done = false;
    l2Attempt = null; l2Solved = false;
    lastResult = null;
    hideResult();
    if (mode === 'L2') setupL2();
  }

  // ---- L2: 空欄と選択肢の生成 --------------------------------------------
  function setupL2(){
    const marked = problem.tokens
      .map((t, i) => ({ t, i }))
      .filter(x => (x.t.mark || []).length && x.t.role !== 'placed');
    blankIdx = marked[Math.floor(Math.random() * marked.length)].i;
    const correct = problem.tokens[blankIdx].mark;
    const pool = [
      [], [{ re: true }],
      [{ lv: 1, n: 1 }], [{ lv: 1, n: 2 }], [{ lv: 1, n: 3 }],
      [{ lv: 2, n: 1 }], [{ lv: 2, n: 2 }], [{ lv: 2, n: 3 }],
      [{ lv: 1, n: 1 }, { re: true }]
    ];
    const base = problemMarks();
    const wrongs = pool.filter(cand => {
      if (K.canonMarks(cand) === K.canonMarks(correct)) return false;
      const marks = base.slice();
      marks[blankIdx] = cand;
      return !sameArray(K.readOrder(withMarks(marks)), problem.order);  // 読み順が合う候補は誤答肢にしない
    });
    // シャッフルして3つ
    for (let i = wrongs.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]];
    }
    choices = wrongs.slice(0, 3).concat([correct])
      .map(m => ({ marks: m, label: markSetLabel(m) }));
    for (let i = choices.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
  }

  function chooseL2(ci){
    if (l2Solved || showAnswer) return;
    const marks = problemMarks();
    marks[blankIdx] = choices[ci].marks;
    const order = K.readOrder(withMarks(marks));
    if (sameArray(order, problem.order)){
      l2Solved = true;
      l2Attempt = null;
      showResult('ok', '○ クリア！ その訓点で読み順が正解と一致します。');
      render();
    } else {
      const r = K.grade(marks, problem);
      l2Attempt = { marks, order: r.order, divergeAt: r.divergeAt, message: r.message };
      showResult('wrong', '× ' + r.message);
      render();
      playOrder(r.order, r.divergeAt, false);   // 誤読を矢印で見せる
    }
  }

  // ---- 描画 --------------------------------------------------------------
  function displayState(){
    // 表示する訓点・読み順・書き下しをモードごとに決める
    if (showAnswer){
      return { marks: problemMarks(), order: problem.order, badges: true, kudashiOrder: problem.order };
    }
    if (mode === 'L1'){
      const done = problem.order.slice(0, tapPos);
      return { marks: problemMarks(), order: done, badges: true, kudashiOrder: done };
    }
    if (mode === 'L2'){
      const marks = problemMarks();
      if (l2Attempt) marks[blankIdx] = l2Attempt.marks[blankIdx];
      else if (!l2Solved) marks[blankIdx] = [];
      const order = l2Solved ? problem.order
        : K.readOrder(withMarks(marks));
      return { marks, order, badges: l2Solved, kudashiOrder: order };
    }
    // L3
    const order = K.readOrder(withMarks(userMarks));
    return { marks: userMarks, order, badges: true, kudashiOrder: order };
  }

  function render(){
    stopAnim();
    const st = displayState();

    const badge = new Map();
    if (st.badges){
      st.order.forEach((tokenIdx, pos) => {
        if (!badge.has(tokenIdx)) badge.set(tokenIdx, []);
        badge.get(tokenIdx).push(pos + 1);
      });
    }

    const sen = $('sentence');
    sen.innerHTML = '';
    problem.tokens.forEach((t, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.i = i;
      if (mode === 'L3' && i === selected) cell.classList.add('selected');
      if (mode === 'L3' && lastResult && lastResult.status === 'wrong' && !showAnswer
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
      const isBlank = (mode === 'L2' && i === blankIdx && !l2Solved && !showAnswer && !l2Attempt);
      const marks = st.marks[i] || [];
      if (isBlank){
        const kt = document.createElement('span');
        kt.className = 'kunten blank';
        kt.textContent = '？';
        cell.appendChild(kt);
      } else if (marks.length){
        const kt = document.createElement('span');
        kt.className = 'kunten';
        kt.textContent = markSetLabel(marks) === 'なし' ? '' : markSetLabel(marks);
        cell.appendChild(kt);
      }
      if (badge.has(i)){
        const b = document.createElement('span');
        b.className = 'order-badge';
        b.textContent = badge.get(i).join('・');
        cell.appendChild(b);
      }
      cell.addEventListener('click', () => onCellClick(i));
      sen.appendChild(cell);
    });

    // ライブ書き下し（間違った読み方でもそのまま出す = それ自体がフィードバック）
    const toks = withMarks(st.marks);
    const kud = K.toKakikudashi(toks, st.kudashiOrder);
    $('kudashi-live').textContent = kud ||
      (mode === 'L1' ? '（読む順に字をタップすると書き下しが伸びていきます）'
                     : '（訓点を打つとここに書き下しが出ます）');
    $('kudashi-note').textContent =
      (st.kudashiOrder.length < expectedReads() && st.kudashiOrder.length > 0 && mode !== 'L1')
        ? '（まだ読まれない字が残っています）' : '';

    // モードごとの操作パネル
    $('palette').style.display = (mode === 'L3') ? 'block' : 'none';
    $('choices').style.display = (mode === 'L2') ? 'block' : 'none';
    $('btn-grade').style.display = (mode === 'L3') ? 'inline-block' : 'none';
    $('mode-hint').textContent = ({
      L1: '訓点に従って、読む順に字をタップしてください（再読文字は2回タップ）',
      L3: '字をタップして、打つ訓点を選んでください（もう一度押すと消えます）'
    })[mode] || '';
    if (mode === 'L2') renderChoices();

    // 再生ボタンの活性
    const wrongOrder = currentWrongOrder();
    $('btn-replay').disabled = !wrongOrder;
    $('btn-replay-correct').disabled = !(showAnswer || cleared() || wrongOrder);

    renderMeta();
  }

  function renderChoices(){
    const keys = document.querySelector('#choices .keys');
    keys.innerHTML = '';
    choices.forEach((c, ci) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.disabled = l2Solved || showAnswer;
      b.addEventListener('click', () => chooseL2(ci));
      keys.appendChild(b);
    });
  }

  function cleared(){
    if (mode === 'L1') return l1Done;
    if (mode === 'L2') return l2Solved;
    return !!(lastResult && lastResult.status !== 'wrong');
  }
  function currentWrongOrder(){
    if (mode === 'L2' && l2Attempt) return l2Attempt;
    if (mode === 'L3' && lastResult && lastResult.status === 'wrong') return lastResult;
    return null;
  }

  function renderMeta(){
    let html = '出典: ' + problem.source.work + '（' + problem.source.chapter + '）';
    if (cleared() || showAnswer){
      html += '<br>書き下し: ' + problem.kakikudashi + '<br>意味: ' + problem.meaning;
      // note は「教科書の記述をそのまま事実と思わせない」ための注記（帰属の疑義・読みの落とし穴）
      if (problem.note) html += '<br><span class="note">※ ' + problem.note + '</span>';
    }
    $('meta').innerHTML = html;
  }

  function showResult(cls, text){
    const r = $('result');
    r.className = cls;
    r.textContent = text;
  }
  function hideResult(){
    const r = $('result');
    r.className = '';
    r.textContent = '';
  }

  // ---- セル操作 ----------------------------------------------------------
  function onCellClick(i){
    if (showAnswer) return;
    if (mode === 'L1'){
      if (l1Done) return;
      const expected = problem.order[tapPos];
      if (i === expected){
        tapPos++;
        if (tapPos >= problem.order.length){
          l1Done = true;
          showResult('ok', '○ 全部正しい順に読めました！');
        } else {
          hideResult();
        }
        render();
      } else {
        flashCell(i);
        const t = problem.tokens[i];
        showResult('info', t.role === 'placed'
          ? '「' + t.c + '」は置き字なので読みません'
          : '「' + t.c + '」はまだ読みません。返り点をヒントに次の字を探してください');
      }
      return;
    }
    if (mode === 'L3'){
      selected = (selected === i) ? -1 : i;
      render();
    }
  }

  function flashCell(i){
    const cell = document.querySelector('#sentence .cell[data-i="' + i + '"]');
    if (!cell) return;
    cell.classList.add('flash');
    setTimeout(() => cell.classList.remove('flash'), 500);
  }

  // ---- 訓点パレット（L3） -------------------------------------------------
  document.querySelectorAll('#palette .keys button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (mode !== 'L3' || selected < 0 || showAnswer) return;
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
      hideResult();
      render();
    });
  });

  // ---- 判定（L3） ---------------------------------------------------------
  $('btn-grade').addEventListener('click', () => {
    if (!problem || mode !== 'L3') return;
    lastResult = K.grade(userMarks, problem);
    if (lastResult.status === 'ok'){
      showResult('ok', '○ クリア！ 読み順が正解と一致しました。');
      render();
    } else if (lastResult.status === 'variant'){
      showResult('ok', '○ クリア！ 登録と違う打ち方ですが、読み順は正しい別解です（原則: 表記ではなく読み順で判定します）。');
      render();
    } else {
      showResult('wrong', '× ' + lastResult.message);
      render();
      playOrder(lastResult.order, lastResult.divergeAt, false);  // 誤読を矢印で見せる
    }
  });

  // ---- 読み順の再生アニメ（設計 §6.4。矢印レイヤーだけ SVG を使う） --------
  function stopAnim(){
    if (animTimer){ clearInterval(animTimer); animTimer = null; }
    const g = $('arrow-g');
    if (g) g.innerHTML = '';
    document.querySelectorAll('#sentence .cell.tracing')
      .forEach(c => c.classList.remove('tracing'));
  }

  function cellCenter(i, stageRect){
    const cell = document.querySelector('#sentence .cell[data-i="' + i + '"]');
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return { x: r.left + r.width / 2 - stageRect.left,
             y: r.top + r.height / 2 - stageRect.top };
  }

  // seq: 読み順（トークン番号の列）。stopAt: この位置まで再生して止める（-1 で全部）。
  function playOrder(seq, stopAt, isCorrect){
    stopAnim();
    const stage = $('stage');
    const svg = $('arrow-layer');
    const g = $('arrow-g');
    const stageRect = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + stageRect.width + ' ' + stageRect.height);
    const upto = (stopAt >= 0 && stopAt < seq.length) ? stopAt : seq.length - 1;
    const color = isCorrect ? '#b3410e' : '#b3231c';
    let step = 0;

    animTimer = setInterval(() => {
      if (step > upto){
        stopAnimTimerOnly();
        // 誤答再生は食い違いの字を強調したまま終わる
        if (!isCorrect && stopAt >= 0 && stopAt < seq.length){
          const cell = document.querySelector('#sentence .cell[data-i="' + seq[stopAt] + '"]');
          if (cell) cell.classList.add('diverge');
        }
        return;
      }
      document.querySelectorAll('#sentence .cell.tracing')
        .forEach(c => c.classList.remove('tracing'));
      const cur = document.querySelector('#sentence .cell[data-i="' + seq[step] + '"]');
      if (cur) cur.classList.add('tracing');
      if (step > 0){
        const a = cellCenter(seq[step - 1], stageRect);
        const b = cellCenter(seq[step], stageRect);
        if (a && b){
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const mx = (a.x + b.x) / 2 - 26;   // 返りの弧は訓点側（左）へ膨らませる
          const my = (a.y + b.y) / 2;
          path.setAttribute('d', 'M' + a.x + ',' + a.y + ' Q' + mx + ',' + my + ' ' + b.x + ',' + b.y);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', color);
          path.setAttribute('stroke-width', '2');
          path.setAttribute('opacity', '0.8');
          path.setAttribute('marker-end', isCorrect ? 'url(#ah-correct)' : 'url(#ah-wrong)');
          g.appendChild(path);
        }
      }
      step++;
    }, 600);
  }
  function stopAnimTimerOnly(){
    if (animTimer){ clearInterval(animTimer); animTimer = null; }
  }

  $('btn-replay').addEventListener('click', () => {
    const w = currentWrongOrder();
    if (w) playOrder(w.order, w.divergeAt, false);
  });
  $('btn-replay-correct').addEventListener('click', () => {
    playOrder(problem.order, -1, true);
  });

  // ---- ツールバー ---------------------------------------------------------
  $('problem-select').addEventListener('change', e => loadProblem(+e.target.value));
  $('mode-select').addEventListener('change', e => {
    mode = e.target.value;
    showAnswer = false;
    $('btn-answer').classList.remove('toggled');
    resetModeState();
    render();
  });
  $('btn-reset').addEventListener('click', () => {
    if (!problem) return;
    userMarks = problem.tokens.map(() => []);
    selected = -1;
    resetModeState();
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
