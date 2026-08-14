'use strict';
/*
 * kudashi.js — 書き下し練習（カードのドラッグ＆ドロップ）
 *
 * 設計書 §6.3。訓点モード（game.js）との違いは「訓点を与えないこと」で、
 * 白文だけを見て読み順を組み立てる ＝ 設計書 §5 の L5 に対応する。
 * 入試では東北大 第四問②（訓点を省略した白文の書き下し）と
 * 早稲田 文・法（設問箇所が白文）がこの形。docs/exam-kanbun-sources.md §2-7-2 を参照。
 *
 * 判定は読み順の一致で行う（原則1）。カードの並び＝ DOM の並びを正とする。
 */
(function(){
  const K = window.Kanbun;
  const PR = window.Progress;
  const $ = id => document.getElementById(id);

  let problems = [];
  let problem = null;
  let showYomi = false;
  let graded = null;      // 直近の判定結果

  // K2（送り仮名を選ぶ段）/ K3（自由入力の段）の状態
  let step = 'K1';
  let stepLocked = false; // ユーザーが段を手で選んだら、自動の出し分けをやめる
  let inputs = {};        // { 'i:nth': 送り仮名 }
  let askList = [];       // この問題で問うカード [{i,nth}]（最大5枚）
  let sheetKey = null;    // シートで開いているカード
  let sheetHints = false; // K3: プリセット候補を開いているか（カードを移るたび閉じる）

  const isPlaced = t => t.role === 'placed';
  const expectedOrder = () => problem.order;
  const isAskable = (i, nth) =>
    step !== 'K1' && askList.some(a => a.i === i && a.nth === nth);

  // ---- 問題の読み込み ----------------------------------------------------
  fetch('texts.json?v=53')
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
      setupTrays();
      loadProblem(0);
    })
    .catch(e => { $('meta').textContent = 'texts.json の読み込みに失敗しました: ' + e; });

  // ---- 学習履歴（訓点モードと同じ localStorage を共有する） ----------------
  // 印は訓点モードと同じ意味。◎=全モード制覇 / ○=どれか / 無印=未着手。
  // 「書き下し」列だけは、このページでクリアしたかどうかを ✓ で別に出す
  function refreshOptionLabels(){
    const sel = $('problem-select');
    const MARK = { all: '◎ ', some: '○ ', none: '' };
    problems.forEach((p, idx) => {
      sel.options[idx].textContent = MARK[PR.stateOf(p.id)]
        + (PR.isClear(p.id, 'K') ? '✓' : '　')
        + p.source.work + '「' + p.tokens.map(t => t.c).join('') + '」（難度 ' + K.difficulty(p) + '）';
    });
  }

  // ---- K2: 送り仮名のボトムシート ----------------------------------------
  const keyOf = a => a.i + ':' + a.nth;
  const labelOf = k => {
    const [i, nth] = k.split(':').map(Number);
    const t = problem.tokens[i];
    return t.c + (t.reread ? '（' + nth + '回目）' : '');
  };

  function openSheet(key){
    sheetKey = key;
    sheetHints = false;    // 候補はカードごとに開き直す（見ないで考えるのが既定）
    renderSheet();
    $('sheet').hidden = false;
    $('sheet-back').hidden = false;
  }
  function closeSheet(){
    sheetKey = null;
    $('sheet').hidden = true;
    $('sheet-back').hidden = true;
  }
  function stepSheet(d){
    const pos = askList.findIndex(a => keyOf(a) === sheetKey);
    if (pos < 0) return;
    const next = (pos + d + askList.length) % askList.length;
    openSheet(keyOf(askList[next]));
  }

  // K2 のプリセット候補ボタン群。K3 でも「候補を見る」の奥で同じものを使う
  function appendChoices(host, i, nth){
    const { choices } = K.okuriChoices(problems, problem, i, nth);
    for (const c of choices){
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c === '' ? '（なし）' : c;
      if (inputs[sheetKey] === c) b.classList.add('chosen');
      b.addEventListener('click', () => {
        inputs[sheetKey] = c;
        graded = null; hideResult();
        refresh();
        renderSheet();
      });
      host.appendChild(b);
    }
  }

  function renderSheet(){
    if (!sheetKey) return;
    const [i, nth] = sheetKey.split(':').map(Number);
    const pos = askList.findIndex(a => keyOf(a) === sheetKey);
    $('sheet-title').textContent = (step === 'K3' ? '送り仮名を入力する（' : '送り仮名を選ぶ（')
      + (pos + 1) + ' / ' + askList.length + '）';
    $('sheet-char').textContent = labelOf(sheetKey);

    const host = $('sheet-choices');
    host.innerHTML = '';
    if (step === 'K3'){
      // K3: 自由入力。候補（K2 と同じプリセット）は「候補を見る」の奥に置く（設計 論点3）
      const row = document.createElement('div');
      row.className = 'free-row';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'free';
      inp.placeholder = 'カタカナかひらがな';
      const cur = inputs[sheetKey];
      inp.value = cur === undefined ? '' : cur;
      const warn = document.createElement('span');
      warn.className = 'warn';
      const apply = () => {
        const v = inp.value.replace(/\s+/g, '');
        // 仮名以外は書き下しに混ざっても採点不能な文を作るだけなので、その場で知らせる
        if (/[^ぁ-ゖァ-ヶー]/.test(v)){
          warn.textContent = '仮名で入力してください（漢字・英数字は使えません）';
          return;
        }
        warn.textContent = '';
        inputs[sheetKey] = v;   // 空文字 ＝ 送り仮名なし
        graded = null; hideResult();
        refresh();
        renderSheet();
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
      const bApply = document.createElement('button');
      bApply.type = 'button';
      bApply.textContent = '決める';
      bApply.addEventListener('click', apply);
      const bNone = document.createElement('button');
      bNone.type = 'button';
      bNone.textContent = 'なし';
      bNone.title = '送り仮名を付けない';
      bNone.addEventListener('click', () => { inp.value = ''; apply(); });
      const bHint = document.createElement('button');
      bHint.type = 'button';
      bHint.textContent = sheetHints ? '候補を隠す' : '候補を見る';
      bHint.addEventListener('click', () => { sheetHints = !sheetHints; renderSheet(); });
      row.appendChild(inp);
      row.appendChild(bApply);
      row.appendChild(bNone);
      row.appendChild(bHint);
      row.appendChild(warn);
      host.appendChild(row);
      if (sheetHints) appendChoices(host, i, nth);
    } else {
      appendChoices(host, i, nth);
    }
    // いま選んでいる送り仮名で書き下しがどうなるかを、その場で見せる
    $('sheet-kudashi').textContent = K.gradeReadings(problem, inputs).kakikudashi;
  }

  $('sheet-close').addEventListener('click', closeSheet);
  $('sheet-back').addEventListener('click', closeSheet);
  $('sheet-prev').addEventListener('click', () => stepSheet(-1));
  $('sheet-next').addEventListener('click', () => stepSheet(1));
  document.addEventListener('keydown', e => {
    if ($('sheet').hidden) return;
    if (e.key === 'Escape') closeSheet();
    // K3 の入力欄で ←→ を打つのはカーソル移動。カード送りに横取りしない
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') stepSheet(-1);
    if (e.key === 'ArrowRight') stepSheet(1);
  });

  // ---- トレイ（3つとも同じグループなので相互に行き来できる） --------------
  function setupTrays(){
    ['tray-source', 'tray-order', 'tray-drop'].forEach(id => {
      new Sortable($(id), {
        itemSelector: '.card',
        group: { name: 'kanbun-cards' },
        ghostClass: 'sortable-ghost',
        delay: 180,
        delayOnTouchOnly: true,
        touchStartThreshold: 6,
        onEnd: () => { graded = null; hideResult(); refresh(); }
      });
    });
  }

  // ---- カードの生成 ------------------------------------------------------
  function makeCard(i, nth){
    const t = problem.tokens[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.i = String(i);
    card.dataset.nth = String(nth || 1);
    if (t.reread) card.classList.add('reread');
    if (nth === 2) card.classList.add('nth2');
    if (isPlaced(t)) card.classList.add('placed-hint');

    const k = document.createElement('span');
    k.className = 'kanji';
    k.textContent = t.c;
    card.appendChild(k);

    const seq = document.createElement('span');
    seq.className = 'seq';
    card.appendChild(seq);

    const y = document.createElement('span');
    y.className = 'yomi';
    card.appendChild(y);

    // K2: 送り仮名を入れるボタン。
    // **span ではなく button にする**のは、sortable-lite が pointerdown の時点で
    // input/button/select/textarea/a を掴まないため。span のままだと
    // ドラッグ直後に click が誤発火してシートが開いてしまう
    if (isAskable(i, nth || 1)){
      const r = document.createElement('button');
      r.className = 'reading';
      r.type = 'button';
      r.dataset.key = i + ':' + (nth || 1);
      r.addEventListener('click', ev => { ev.stopPropagation(); openSheet(r.dataset.key); });
      card.appendChild(r);
    }

    // 再読文字は2枚目を出す（「2回読む＝カードが2枚になる」を操作で理解させる）
    if (t.reread && (nth || 1) === 1){
      const dup = document.createElement('button');
      dup.className = 'dup';
      dup.type = 'button';
      dup.textContent = '＋';
      dup.title = '再読文字：2回目のカードを出す';
      dup.addEventListener('click', ev => {
        ev.stopPropagation();
        if (document.querySelector('.card[data-i="' + i + '"][data-nth="2"]')) return;
        const second = makeCard(i, 2);
        card.parentElement.insertBefore(second, card.nextSibling);
        graded = null; hideResult(); refresh();
      });
      card.appendChild(dup);
    }
    return card;
  }

  function loadProblem(idx){
    problem = problems[idx];
    // 設計（論点3）: 段の既定値は「一度クリアした問題は次に開いたとき一段上がる」。
    // ユーザーが段を手で選んだあとは、その選択を尊重して自動では変えない
    if (!stepLocked){
      step = PR.isClear(problem.id, 'K') ? 'K2' : 'K1';
      $('step-select').value = step;
    }
    graded = null;
    inputs = {};
    askList = (step === 'K1') ? [] : K.pickAskable(problem);
    closeSheet();
    hideResult();
    $('tray-order').innerHTML = '';
    $('tray-drop').innerHTML = '';
    const src = $('tray-source');
    src.innerHTML = '';
    problem.tokens.forEach((t, i) => src.appendChild(makeCard(i, 1)));
    updateHint();
    refresh();
  }

  function updateHint(){
    const el = document.querySelector('main .hint');
    if (!el) return;
    el.innerHTML = (step === 'K3')
      ? '<strong>訓点はありません。</strong>白文のカードを読む順に並べ、'
        + '<strong>「送り仮名？」を押して送り仮名を自分で考えて入力してください</strong>（この問題では '
        + askList.length + ' 枚ぶん。迷ったら「候補を見る」）。<br>'
        + '読まない字（置き字）は「読まない箱」へ。再読文字は ［＋］ でカードが2枚になります。'
        + '訓読の流派差として登録した別解も正解になります。'
      : (step === 'K2')
      ? '<strong>訓点はありません。</strong>白文のカードを読む順に並べ、'
        + '<strong>「送り仮名？」を押して送り仮名も選んでください</strong>（この問題では '
        + askList.length + ' 枚ぶん）。<br>'
        + '読まない字（置き字）は「読まない箱」へ。再読文字は ［＋］ でカードが2枚になります。'
      : '<strong>訓点はありません。</strong>白文のカードを、読む順に「読む順」へ並べてください。'
        + '読まない字（置き字）は「読まない箱」へ。<br>'
        + '一字を二度読む再読文字は <strong>［＋］</strong> を押すとカードが2枚になります。'
        + 'ドラッグで並べ替えられます（スマホは長押ししてから動かす）。';
  }

  // ---- 現在の並びを読む --------------------------------------------------
  const orderTrayIndices = () =>
    [...$('tray-order').querySelectorAll('.card')].map(c => +c.dataset.i);

  // ユーザーが選んだ送り仮名を反映したトークン列（表示用。採点は kanbun.js 側で行う）
  function withInputs(){
    if (step === 'K1') return problem.tokens;
    return problem.tokens.map((t, i) => {
      const c = Object.assign({}, t);
      if (c.reread){
        c.reread = Object.assign({}, c.reread);
        [1, 2].forEach(n => {
          const key = i + ':' + n;
          if (!(key in inputs)) return;
          const side = (n === 2) ? 'second' : 'first';
          c.reread[side] = Object.assign({}, c.reread[side], { okuri: inputs[key] });
        });
      } else if ((i + ':1') in inputs){
        c.okuri = inputs[i + ':1'];
      }
      return c;
    });
  }

  function refresh(){
    // 読む順トレイに番号を振り、読み仮名の表示を更新する
    document.querySelectorAll('.card').forEach(c => {
      c.querySelector('.seq').textContent = '';
      c.classList.remove('bad', 'good');
    });
    [...$('tray-order').querySelectorAll('.card')].forEach((c, pos) => {
      c.querySelector('.seq').textContent = String(pos + 1);
    });
    document.querySelectorAll('.card').forEach(c => {
      const t = problem.tokens[+c.dataset.i];
      const nth = +c.dataset.nth;
      let y = '';
      if (showYomi){
        if (t.reread) y = (nth === 2 ? t.reread.second.yomi : t.reread.first.yomi) || '';
        else y = t.yomi || '';
      }
      c.querySelector('.yomi').textContent = y;

      // K2: 送り仮名ボタンの表示と、未入力の強調
      const btn = c.querySelector('.reading');
      if (btn){
        const v = inputs[btn.dataset.key];
        btn.textContent = (v === undefined) ? '送り仮名？' : (v === '' ? '（なし）' : v);
        btn.classList.toggle('filled', v !== undefined);
        c.classList.toggle('needs-input', v === undefined);
      } else {
        c.classList.remove('needs-input');
      }
    });
    renderMeta();
  }

  // ---- 判定 --------------------------------------------------------------
  function grade(){
    const got = orderTrayIndices();
    const want = expectedOrder();

    // 置き字が読む順に混ざっていないか（先に見てやると理由が分かりやすい）
    const strayPlaced = got.find(i => isPlaced(problem.tokens[i]));
    if (strayPlaced !== undefined){
      graded = { ok: false, divergeAt: got.indexOf(strayPlaced),
        message: '「' + problem.tokens[strayPlaced].c + '」は置き字なので読みません。「読まない箱」へ移してください。' };
      return paint();
    }
    // 白文トレイに残りがないか
    const left = $('tray-source').querySelectorAll('.card').length;
    if (left){
      graded = { ok: false, divergeAt: -1,
        message: 'まだ白文に ' + left + ' 枚残っています。読む字は「読む順」へ、読まない字は「読まない箱」へ入れてください。' };
      return paint();
    }
    // 再読文字の枚数
    for (let i = 0; i < problem.tokens.length; i++){
      const t = problem.tokens[i];
      if (!t.reread) continue;
      const n = got.filter(x => x === i).length;
      if (n !== 2){
        graded = { ok: false, divergeAt: -1,
          message: '「' + t.c + '」は一字を二度読む再読文字です。［＋］でカードを2枚にして、両方を読む順に置いてください（現在 ' + n + ' 枚）。' };
        return paint();
      }
    }

    let k = 0;
    while (k < got.length && k < want.length && got[k] === want[k]) k++;
    if (k === got.length && k === want.length){
      // 並びが正しければ、K2/K3 では続けて送り仮名を採点する（並びが違う間は読みを見ない）
      if (step !== 'K1'){
        const blanks = askList.filter(a => !(keyOf(a) in inputs));
        if (blanks.length){
          graded = { ok: false, divergeAt: -1,
            message: '送り仮名がまだ ' + blanks.length + ' 枚ぶん決まっていません。'
              + 'カードの「送り仮名？」を押して' + (step === 'K3' ? '入力' : '選択') + 'してください。' };
          return paint();
        }
        const g = K.gradeReadings(problem, inputs);
        if (g.status === 'wrong'){
          graded = { ok: false, divergeAt: g.divergeAt,
            message: '並べ方は正しいですが、送り仮名が違います。'
              + (g.divergeAt >= 0 ? (g.divergeAt + 1) + '番目のカードを見直してください。' : '')
              // K3 は自由入力なので、流派差の読みが未登録のせいで×になる可能性を正直に伝える
              + (step === 'K3'
                ? '<br><span class="aside">※ 訓読には流派差があります。自分の読みが正しいと思うときは'
                  + '「正解を見る」で標準の形と見比べてください。</span>'
                : '') };
          return paint();
        }
        graded = { ok: true, variant: g.status === 'variant', via: g.via };
        PR.markClear(problem.id, 'K', Date.now());
        refreshOptionLabels();
        return paint();
      }
      graded = { ok: true };
      PR.markClear(problem.id, 'K', Date.now());   // 学習履歴（訓点モードと共有）
      refreshOptionLabels();
      return paint();
    }
    let message;
    if (k >= got.length){
      message = (k + 1) + '番目以降が足りません（次に読むのは「' + problem.tokens[want[k]].c + '」です）';
    } else if (k >= want.length){
      message = (k + 1) + '番目の「' + problem.tokens[got[k]].c + '」は読みすぎです';
    } else {
      message = (k + 1) + '番目に「' + problem.tokens[got[k]].c + '」を読んでいますが、正しくは「' + problem.tokens[want[k]].c + '」です';
    }
    graded = { ok: false, divergeAt: k, message };
    paint();
  }

  function paint(){
    refresh();   // 番号・読み仮名を現在の並びに合わせ、前回の色を消してから塗る
    const cards = [...$('tray-order').querySelectorAll('.card')];
    const r = $('result');
    if (graded.ok){
      cards.forEach(c => c.classList.add('good'));
      r.className = 'ok';
      const body = graded.variant
        ? (graded.via === 'acceptable'
            ? '○ クリア！ 標準として登録している読み方とは別の、正しい読み方です'
              + '（訓読の流派差）。標準の形は次のとおりです。'
            : '○ クリア！ 現代仮名遣いで書かれていますが正解にしています。'
              + '歴史的仮名遣いでは次のように書きます。')
        : '○ クリア！ 読み順が正解と一致しました。';
      r.innerHTML = body + '<span class="kudashi">'
        + K.toKakikudashi(problem.tokens, expectedOrder()) + '</span>';
    } else {
      if (graded.divergeAt >= 0 && cards[graded.divergeAt]) cards[graded.divergeAt].classList.add('bad');
      r.className = 'wrong';
      // 途中まででも書き下しを出す（変な文が出ること自体がフィードバックになる）。
      // **ユーザーの並び順と、ユーザーが選んだ送り仮名の両方を反映する**。
      // 正解の文を出してしまうと、「違う」と言われた本人が何を書いたのか確かめられない
      const partial = K.toKakikudashi(withInputs(), orderTrayIndices());
      r.innerHTML = '× ' + graded.message
        + (partial ? '<span class="kudashi">' + partial + '</span>' : '');
    }
    renderMeta();
  }

  function hideResult(){
    const r = $('result');
    r.className = '';
    r.innerHTML = '';
  }

  function renderMeta(){
    let html = '出典: ' + problem.source.work + '（' + problem.source.chapter + '）';
    if (graded && graded.ok){
      html += '<br>意味: ' + problem.meaning;
      if (problem.note) html += '<br><span class="note">※ ' + K.noteHtml(problem.note) + '</span>';
    }
    $('meta').innerHTML = html;
  }

  // ---- 正解を見る（カードを正解の並びに置き直す） ------------------------
  function showAnswer(){
    const order = expectedOrder();
    $('tray-order').innerHTML = '';
    $('tray-drop').innerHTML = '';
    $('tray-source').innerHTML = '';
    const seen = new Map();
    for (const i of order){
      const nth = (seen.get(i) || 0) + 1;
      seen.set(i, nth);
      $('tray-order').appendChild(makeCard(i, nth));
    }
    problem.tokens.forEach((t, i) => {
      if (isPlaced(t)) $('tray-drop').appendChild(makeCard(i, 1));
    });
    graded = { ok: true };
    paint();
  }

  // ---- ツールバー ---------------------------------------------------------
  $('problem-select').addEventListener('change', e => loadProblem(+e.target.value));
  $('step-select').addEventListener('change', e => {
    step = e.target.value;
    stepLocked = true;   // 手で選んだら、問題を替えても自動で段を変えない
    loadProblem(+$('problem-select').value);
  });
  $('btn-grade').addEventListener('click', () => { if (problem) grade(); });
  $('btn-reset').addEventListener('click', () => {
    if (!problem) return;
    loadProblem(+$('problem-select').value);
  });
  $('btn-answer').addEventListener('click', () => { if (problem) showAnswer(); });
  $('btn-yomi').addEventListener('click', () => {
    showYomi = !showYomi;
    $('btn-yomi').classList.toggle('toggled', showYomi);
    refresh();
  });
})();
