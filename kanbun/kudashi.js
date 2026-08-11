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
  const $ = id => document.getElementById(id);

  let problems = [];
  let problem = null;
  let showYomi = false;
  let graded = null;      // 直近の判定結果

  const isPlaced = t => t.role === 'placed';
  const expectedOrder = () => problem.order;

  // ---- 問題の読み込み ----------------------------------------------------
  fetch('texts.json?v=7')
    .then(r => r.json())
    .then(data => {
      problems = data.problems.slice()
        .sort((a, b) => K.difficulty(a) - K.difficulty(b));
      const sel = $('problem-select');
      problems.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = p.source.work + '「' + p.tokens.map(t => t.c).join('') + '」（難度 ' + K.difficulty(p) + '）';
        sel.appendChild(opt);
      });
      setupTrays();
      loadProblem(0);
    })
    .catch(e => { $('meta').textContent = 'texts.json の読み込みに失敗しました: ' + e; });

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
    graded = null;
    hideResult();
    $('tray-order').innerHTML = '';
    $('tray-drop').innerHTML = '';
    const src = $('tray-source');
    src.innerHTML = '';
    problem.tokens.forEach((t, i) => src.appendChild(makeCard(i, 1)));
    refresh();
  }

  // ---- 現在の並びを読む --------------------------------------------------
  const orderTrayIndices = () =>
    [...$('tray-order').querySelectorAll('.card')].map(c => +c.dataset.i);

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
      graded = { ok: true };
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
      r.innerHTML = '○ クリア！ 読み順が正解と一致しました。<span class="kudashi">'
        + K.toKakikudashi(problem.tokens, expectedOrder()) + '</span>';
    } else {
      if (graded.divergeAt >= 0 && cards[graded.divergeAt]) cards[graded.divergeAt].classList.add('bad');
      r.className = 'wrong';
      // 途中まででも書き下しを出す（変な文が出ること自体がフィードバックになる）
      const partial = K.toKakikudashi(problem.tokens, orderTrayIndices());
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
      if (problem.note) html += '<br><span class="note">※ ' + problem.note + '</span>';
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
