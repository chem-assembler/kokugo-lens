/*
 * present.js — 提示モード（先生が授業で文章を示す画面）。
 *
 * 同じ出典・同じ篇の問題を一つの「文章」として並べ、
 * 白文 → 訓点 → 書き下し → 現代語訳 の順に一段ずつ出す。
 * 字を押すと、その字の読みと「この文での意味」（imi.json）を横の欄に出す。
 * レビュアー4回目の回答（A6）による。
 */
(function(){
  const $ = id => document.getElementById(id);
  const K = window.Kanbun;
  const STEPS = ['白文', '訓点', '書き下し', '現代語訳'];
  const KATA2HIRA = s => String(s || '').replace(/[ァ-ヶ]/g,
    c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const KUNTEN_CHAR = m => m.re ? 'レ'
    : (({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '?');
  function markLabel(marks){
    if (!marks || !marks.length) return '';
    const nums = marks.filter(m => !m.re).sort((a, b) => a.lv - b.lv);
    return nums.map(KUNTEN_CHAR).join('') + (marks.some(m => m.re) ? 'レ' : '');
  }

  let groups = [];      // [{ key, label, problems: [...] }]
  let imi = {};
  let group = null;
  let step = 0;
  let picked = null;    // { id, i }
  let zoom = 1.2;

  Promise.all(['texts.json?v=117', 'imi.json?v=117'].map(url => fetch(url).then(r => {
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }))).then(([texts, imiData]) => {
    imi = imiData;
    const map = new Map();
    for (const p of texts.problems){
      const key = p.source.work + '・' + (p.source.chapter || '');
      if (!map.has(key)) map.set(key, { key, label: key, problems: [] });
      map.get(key).problems.push(p);
    }
    groups = [...map.values()];
    const sel = $('text-select');
    groups.forEach((g, k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = g.label + '（' + g.problems.length + '文）';
      sel.appendChild(opt);
    });
    // ?t=<文章名> または ?p=<問題id> で開ける
    const params = new URLSearchParams(location.search);
    let k = 0;
    if (params.get('p')) k = Math.max(0, groups.findIndex(g => g.problems.some(p => p.id === params.get('p'))));
    else if (params.get('t')) k = Math.max(0, groups.findIndex(g => g.key === params.get('t')));
    sel.value = k;
    choose(k);
  }).catch(e => {
    $('stage').textContent = '問題データを読み込めませんでした（' + e.message + '）';
  });

  function choose(k){
    group = groups[k];
    step = 0;
    picked = null;
    renderCharInfo();
    render();
  }

  function render(){
    const showMarks = step >= 1, showKudashi = step >= 2, showMeaning = step >= 3;
    const stage = $('stage');
    stage.innerHTML = '';
    for (const p of group.problems){
      const sent = document.createElement('div');
      sent.className = 'sent';
      const line = document.createElement('div');
      line.className = 'line';
      p.tokens.forEach((t, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (picked && picked.id === p.id && picked.i === i) cell.classList.add('picked');
        const kanji = document.createElement('span');
        kanji.className = 'kanji';
        kanji.textContent = t.c;
        cell.appendChild(kanji);
        if (t.p){
          const punct = document.createElement('span');
          punct.className = 'punct';
          punct.textContent = t.p;
          cell.appendChild(punct);
        }
        if (showMarks){
          const okuri = t.reread ? t.reread.first.okuri : t.okuri;
          if (okuri){
            const ok = document.createElement('span');
            ok.className = 'okuri';
            ok.textContent = okuri;
            cell.appendChild(ok);
          }
          const label = markLabel(K.marksOf(t));
          if (label){
            const kt = document.createElement('span');
            kt.className = 'kunten';
            kt.textContent = label;
            cell.appendChild(kt);
          }
          if (t.join && K.nextReadable(p.tokens, i) === i + 1){
            const j = document.createElement('span');
            j.className = 'joiner';
            cell.appendChild(j);
          }
        }
        cell.addEventListener('click', () => { picked = { id: p.id, i }; renderCharInfo(); render(); });
        line.appendChild(cell);
      });
      sent.appendChild(line);
      if (showKudashi){
        const kd = document.createElement('div');
        kd.className = 'kudashi';
        kd.textContent = p.kakikudashi;
        sent.appendChild(kd);
      }
      stage.appendChild(sent);
    }

    const box = $('meaning');
    box.innerHTML = '<h2>現代語訳</h2>';
    if (showMeaning){
      const ol = document.createElement('ol');
      for (const p of group.problems){
        const li = document.createElement('li');
        li.textContent = p.meaning;
        ol.appendChild(li);
      }
      box.appendChild(ol);
    } else {
      box.insertAdjacentHTML('beforeend', '<p class="hidden-note">「現代語訳」の段で表示します。</p>');
    }

    $('steps').innerHTML = STEPS.map((s, k) => '<span' + (k <= step ? ' class="on"' : '') + '>' + s + '</span>').join('');
    $('btn-prev').disabled = step === 0;
    $('btn-next').disabled = step === STEPS.length - 1;
  }

  function reading(t, tokens, i){
    if (t.role === 'placed') return '（置き字・読まない）';
    // 熟語（孰与・何如 など）は二字で一つの読みなので、二字分をまとめて示す
    const prev = K.prevReadable(tokens, i);
    const head = t.join ? i : (prev >= 0 && tokens[prev].join ? prev : -1);
    if (head >= 0){
      const a = tokens[head], b = tokens[K.nextReadable(tokens, head)];
      return KATA2HIRA((a.yomi || '') + (a.okuri || '') + (b.yomi || '') + (b.okuri || ''))
        + '（' + a.c + b.c + 'の二字で）';
    }
    if (t.reread){
      const a = t.reread.first, b = t.reread.second;
      const one = r => r.kana ? KATA2HIRA((r.yomi || '') + (r.okuri || ''))
                              : KATA2HIRA(r.yomi || '') + KATA2HIRA(r.okuri || '');
      return one(a) + '〜' + one(b) + '（再読文字）';
    }
    const y = KATA2HIRA((t.yomi || '') + (t.okuri || ''));
    return y || '—';
  }

  function renderCharInfo(){
    const box = $('char-info');
    if (!picked){
      box.innerHTML = '<h2>字の説明</h2><p class="hint">本文の字を押すと、読みと、この文での意味が出ます。</p>';
      return;
    }
    const p = group.problems.find(q => q.id === picked.id);
    const t = p.tokens[picked.i];
    const m = (imi[p.id] || [])[picked.i] || '—';
    box.innerHTML = '<h2>字の説明</h2>';
    const big = document.createElement('div');
    big.className = 'big';
    big.textContent = t.c;
    box.appendChild(big);
    const dl = document.createElement('dl');
    for (const [k, v] of [['読み', reading(t, p.tokens, picked.i)], ['この文での意味', m]]){
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.append(dt, dd);
    }
    box.appendChild(dl);
  }

  function go(d){
    const s = Math.min(STEPS.length - 1, Math.max(0, step + d));
    if (s !== step){ step = s; render(); }
  }
  $('btn-next').addEventListener('click', () => go(1));
  $('btn-prev').addEventListener('click', () => go(-1));
  $('text-select').addEventListener('change', e => choose(+e.target.value));
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); }
  });
  const setZoom = z => { zoom = Math.min(2.4, Math.max(0.8, z)); $('stage').style.setProperty('--zoom', zoom + 'em'); };
  $('btn-small').addEventListener('click', () => setZoom(zoom - 0.2));
  $('btn-large').addEventListener('click', () => setZoom(zoom + 0.2));
})();
