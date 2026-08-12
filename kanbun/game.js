'use strict';
/*
 * game.js — 訓点モードの UI（L1: 読む順にタップ / L2: 訓点を1つ選ぶ / L3: 訓点を打つ）
 * ロジックはすべて kanbun.js（DOM 非依存）に置く。ここは描画と入力だけ。
 * 誤答時は「ユーザーの読み方」を矢印で辿って食い違い位置で止める（設計原則2）。
 */
(function(){
  const K = window.Kanbun;
  const PR = window.Progress;
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
  // L4 の状態（返り点に加えて送り仮名も自分で入れる）
  let askList = [];          // [{i, nth}] 送り仮名を伏せた字
  let okuriInputs = {};      // 'i:nth' -> 選んだ送り仮名
  let okuriResult = null;    // 送り仮名の判定結果（K.gradeReadings の戻り）
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
  // L4 のライブ書き下し用。まだ選んでいない送り仮名は空にして、穴が見えるようにする
  function withOkuri(toks){
    if (mode !== 'L4' || showAnswer || cleared()) return toks;
    return toks.map((t, i) => {
      const a = askedAt(i)[0];
      if (!a) return t;
      const v = okuriInputs[askKey(a)];
      return Object.assign({}, t, { okuri: (v === undefined) ? '' : v });
    });
  }
  // 訓点を自分で打つ段。L3（白文＋送り仮名）・L4（送り仮名も伏せる）・L6（書き下し文だけ）
  const isMarkMode = () => mode === 'L3' || mode === 'L4' || mode === 'L6';
  const askKey = a => a.i + ':' + a.nth;
  // 送り仮名を伏せる字。再読文字は1つのセルに2つの読みが乗るが、訓点モードのセルは
  // 1つ目の送り仮名しか描けないので、L4 では問わない（書き下し練習の K2/K3 が受け持つ）
  function buildAskList(){
    if (mode !== 'L4' || !problem) return [];
    return K.pickAskable(problem).filter(a => !problem.tokens[a.i].reread);
  }
  const askedAt = i => askList.filter(a => a.i === i);
  const problemMarks = () => problem.tokens.map(t => t.mark || []);
  const expectedReads = () => problem.tokens.reduce(
    (s, t) => s + (t.role === 'placed' ? 0 : (t.reread ? 2 : 1)), 0);

  // ---- 問題の読み込み ----------------------------------------------------
  fetch('texts.json?v=24')
    .then(r => r.json())
    .then(data => {
      problems = data.problems.slice()
        .sort((a, b) => K.difficulty(a) - K.difficulty(b));
      const sel = $('problem-select');
      problems.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        sel.appendChild(opt);
      });
      refreshOptionLabels();
      // 志望校の案内（guide.html）から ?mode=L3 のように指定して開ける
      const params = new URLSearchParams(location.search);
      const want = params.get('mode');
      if (want && [...$('mode-select').options].some(o => o.value === want)){
        mode = want;
        $('mode-select').value = want;
      }
      // 句法クイズの解説（kuho.html）から ?p=<問題ID> でその問題を開ける。
      // 型の解説から実例の練習へ渡すための入口
      let start = 0;
      const wantP = params.get('p');
      if (wantP){
        const i = problems.findIndex(p => p.id === wantP);
        if (i >= 0) start = i;
      }
      sel.value = String(start);
      loadProblem(start);
    })
    .catch(e => { $('meta').textContent = 'texts.json の読み込みに失敗しました: ' + e; });

  // ---- 学習履歴の表示 ----------------------------------------------------
  // 選択肢の頭に印を出す。◎=全モード制覇 / ○=どれか / 無印=未着手
  const STATE_MARK = { all: '◎ ', some: '○ ', none: '' };

  function refreshOptionLabels(){
    const sel = $('problem-select');
    problems.forEach((p, idx) => {
      const plain = p.tokens.map(t => t.c).join('');
      sel.options[idx].textContent = STATE_MARK[PR.stateOf(p.id)]
        + p.source.work + '「' + plain + '」（難度 ' + K.difficulty(p) + '）';
    });
  }

  function renderProgress(){
    if (!problems.length) return;
    const s = PR.summary(problems);
    const per = PR.MODES.map(m => PR.MODE_NAME[m] + ' ' + s.byMode[m]).join('　');
    $('progress-text').innerHTML =
      '学習の記録: <span class="done">' + s.touched + '</span> / ' + s.total + ' 問に着手'
      + '（全' + PR.MODES.length + 'モード制覇 <span class="done">' + s.complete + '</span> 問）　' + per;
  }

  function loadProblem(idx){
    problem = problems[idx];
    userMarks = problem.tokens.map(() => []);
    selected = -1;
    showAnswer = false;
    $('btn-answer').classList.remove('toggled');
    resetModeState();
    render();
    renderProgress();
  }

  function resetModeState(){
    stopAnim();
    tapPos = 0; l1Done = false;
    l2Attempt = null; l2Solved = false;
    lastResult = null;
    okuriInputs = {}; okuriResult = null;
    askList = buildAskList();
    hideResult();
    if (mode === 'L2') setupL2();
  }

  // ---- L2: 空欄と選択肢の生成 --------------------------------------------
  function setupL2(){
    const marked = problem.tokens
      .map((t, i) => ({ t, i }))
      .filter(x => (x.t.mark || []).length && x.t.role !== 'placed');
    // 返り点が1つも無い文（上から素直に読む文）は L2 の問題にできない。
    // 「賢哉回也」のような例は実在するので、落ちずに理由を出して他のモードへ促す。
    if (!marked.length){
      blankIdx = -1;
      choices = [];
      return;
    }
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
      recordClear('L2');
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
      // blankIdx < 0 ＝ 返り点が無い文。空欄を作らずそのまま見せる
      if (blankIdx >= 0){
        if (l2Attempt) marks[blankIdx] = l2Attempt.marks[blankIdx];
        else if (!l2Solved) marks[blankIdx] = [];
      }
      const order = l2Solved ? problem.order
        : K.readOrder(withMarks(marks));
      return { marks, order, badges: l2Solved, kudashiOrder: order };
    }
    // L3 / L6（自分で打った訓点で読む）
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
      if (isMarkMode() && i === selected) cell.classList.add('selected');
      if (isMarkMode() && lastResult && lastResult.status === 'wrong' && !showAnswer
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
      // L6 は「書き下し文だけを見て訓点を復元する」課題なので送り仮名を隠す。
      // 送り仮名が見えていると読み順がほぼ割れてしまい、逆問題にならない
      const hideOkuri = (mode === 'L6' && !showAnswer && !cleared());
      const asked = (mode === 'L4' && !showAnswer && !cleared()) ? askedAt(i) : [];
      if (asked.length){
        // L4 で問う字。まだ選んでいなければ「？」を出し、押すと候補が下に並ぶ
        const chosen = okuriInputs[askKey(asked[0])];
        const ok = document.createElement('span');
        ok.className = 'okuri ask' + (chosen === undefined ? '' : ' filled');
        ok.textContent = (chosen === undefined) ? '？' : (chosen || 'なし');
        cell.appendChild(ok);
      } else if (!hideOkuri && (t.okuri || (t.reread && t.reread.first.okuri))){
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
    const toks = withOkuri(withMarks(st.marks));
    const kud = K.toKakikudashi(toks, st.kudashiOrder);
    if (mode === 'L6'){
      // L6 は与えられた書き下し文が「問題文」。これに合うよう訓点を打つ
      $('kudashi-live').textContent = problem.kakikudashi;
      $('kudashi-col').querySelector('.label').textContent = 'この書き下しになるよう訓点を打つ';
    } else {
      $('kudashi-col').querySelector('.label').textContent = '書き下し（あなたの読み方から自動生成）';
      $('kudashi-live').textContent = kud ||
        (mode === 'L1' ? '（読む順に字をタップすると書き下しが伸びていきます）'
                       : '（訓点を打つとここに書き下しが出ます）');
    }
    $('kudashi-note').textContent =
      (st.kudashiOrder.length < expectedReads() && st.kudashiOrder.length > 0 && mode !== 'L1')
        ? '（まだ読まれない字が残っています）' : '';

    // モードごとの操作パネル
    $('palette').style.display = isMarkMode() ? 'block' : 'none';
    $('choices').style.display = (mode === 'L2') ? 'block' : 'none';
    $('btn-grade').style.display = isMarkMode() ? 'inline-block' : 'none';
    $('mode-hint').textContent = ({
      L1: '訓点に従って、読む順に字をタップしてください（再読文字は2回タップ）',
      L3: '字をタップして、打つ訓点を選んでください（もう一度押すと消えます）',
      L4: '返り点を打ち、「？」の字は送り仮名も選んでください（両方そろって正解）',
      L6: '上の書き下し文のとおりに読めるよう、返り点を打ってください（送り仮名は隠してあります）'
    })[mode] || '';
    if (mode === 'L2') renderChoices();
    renderOkuriPanel();

    // 再生ボタンの活性
    const wrongOrder = currentWrongOrder();
    $('btn-replay').disabled = !wrongOrder;
    $('btn-replay-correct').disabled = !(showAnswer || cleared() || wrongOrder);

    renderMeta();
  }

  function renderChoices(){
    const keys = document.querySelector('#choices .keys');
    keys.innerHTML = '';
    if (blankIdx < 0){
      const p = document.createElement('span');
      p.className = 'hint';
      p.textContent = 'この文には返り点がありません（上から順に読む文です）。'
        + 'L1 で読み順を確かめるか、別の問題を選んでください。';
      keys.appendChild(p);
      return;
    }
    choices.forEach((c, ci) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.disabled = l2Solved || showAnswer;
      b.addEventListener('click', () => chooseL2(ci));
      keys.appendChild(b);
    });
  }

  // 送り仮名が標準形と違っても通った場合に、その事情を添える（書き下し練習の K3 と同じ扱い）
  function okuriNote(){
    if (!okuriResult || okuriResult.status !== 'variant') return '';
    return (okuriResult.via === 'acceptable')
      ? '（登録している標準の形とは別の、正しい読み方です。標準は「' + problem.kakikudashi + '」）'
      : '（仮名遣いは標準の形と違いますが、同じ読みとして扱います）';
  }

  // L4: 選んだ字が送り仮名を問う字なら、その候補を並べる
  function renderOkuriPanel(){
    const panel = $('okuri-panel');
    const ask = (mode === 'L4' && !showAnswer && !cleared() && selected >= 0)
      ? askedAt(selected)[0] : null;
    if (!ask){
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    const t = problem.tokens[ask.i];
    $('okuri-hint').textContent = '「' + t.c + '」に付く送り仮名はどれ？';
    const keys = panel.querySelector('.keys');
    keys.innerHTML = '';
    const key = askKey(ask);
    K.okuriChoices(problems, problem, ask.i, ask.nth).choices.forEach(v => {
      const b = document.createElement('button');
      b.textContent = (v === '') ? '（なし）' : v;
      if (okuriInputs[key] !== undefined && K.kanaEquals(okuriInputs[key], v)) b.classList.add('chosen');
      b.addEventListener('click', () => {
        okuriInputs[key] = v;
        okuriResult = null;
        hideResult();
        render();
      });
      keys.appendChild(b);
    });
  }

  function cleared(){
    if (mode === 'L1') return l1Done;
    if (mode === 'L2') return l2Solved;
    const orderOk = !!(lastResult && lastResult.status !== 'wrong');
    // L4 は読み順と送り仮名の両方がそろって初めてクリア。読み順だけで
    // クリア扱いにすると、送り仮名の「？」が消えて直せなくなる
    if (mode === 'L4') return orderOk && !!(okuriResult && okuriResult.status !== 'wrong');
    return orderOk;
  }
  function currentWrongOrder(){
    if (mode === 'L2' && l2Attempt) return l2Attempt;
    if (isMarkMode() && lastResult && lastResult.status === 'wrong') return lastResult;
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
          recordClear('L1');
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
    if (isMarkMode()){
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
      if (!isMarkMode() || selected < 0 || showAnswer) return;
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

  // ---- 判定（L3 / L4 / L6） -----------------------------------------------
  $('btn-grade').addEventListener('click', () => {
    if (!problem || !isMarkMode()) return;
    // L4 は送り仮名も自分で入れる段。空欄が残っていたら読み順の判定へ進まない
    if (mode === 'L4'){
      const blanks = askList.filter(a => okuriInputs[askKey(a)] === undefined);
      if (blanks.length){
        showResult('info', '送り仮名がまだ ' + blanks.length + ' か所えらばれていません。'
          + '「？」の字をタップして選んでください。');
        return;
      }
    }
    lastResult = K.grade(userMarks, problem);
    // 読み順が合っていても送り仮名が違えば訓読は完成していない（L4 のねらい）
    if (mode === 'L4' && lastResult.status !== 'wrong'){
      okuriResult = K.gradeReadings(problem, okuriInputs);
      if (okuriResult.status === 'wrong'){
        showResult('wrong', '× 読み順は合っています。送り仮名が違います。'
          + 'あなたの読み方: ' + okuriResult.kakikudashi);
        render();
        return;
      }
    }
    if (lastResult.status === 'ok'){
      recordClear(mode);
      showResult('ok', (mode === 'L4')
        ? '○ クリア！ 読み順も送り仮名も正解です。' + okuriNote()
        : '○ クリア！ 読み順が正解と一致しました。');
      render();
    } else if (lastResult.status === 'variant'){
      recordClear(mode);
      showResult('ok', '○ クリア！ 登録と違う打ち方ですが、読み順は正しい別解です（原則: 表記ではなく読み順で判定します）。'
        + (mode === 'L4' ? okuriNote() : ''));
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

  // ---- 学習履歴の記録 -----------------------------------------------------
  // 「正解を見る」で答えを表示したあとのクリアは記録しない（自力で解いたときだけ数える）
  function recordClear(mode){
    if (showAnswer) return;
    PR.markClear(problem.id, mode, Date.now());
    refreshOptionLabels();
    renderProgress();
  }

  $('btn-next-unclear').addEventListener('click', () => {
    if (!problems.length) return;
    const cur = +$('problem-select').value;
    const next = PR.nextUnclear(problems, mode, cur);
    if (next < 0){
      showResult('info', '今のモード（' + PR.MODE_NAME[mode] + '）は全問クリア済みです。'
        + '別のモードに切り替えるか、書き下し練習へ進んでください。');
      return;
    }
    $('problem-select').value = String(next);
    loadProblem(next);
  });

  $('btn-progress-reset').addEventListener('click', () => {
    if (!confirm('この端末に保存された学習の記録をすべて消します。よろしいですか？')) return;
    PR.reset();
    refreshOptionLabels();
    renderProgress();
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
