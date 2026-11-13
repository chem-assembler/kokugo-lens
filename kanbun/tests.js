'use strict';
/*
 * tests.js — 「返り点でみる漢文」回帰テスト
 * ブラウザ（test.html）と Node（node kanbun/tests.js）の両方で走る。
 * 訓読は例外が多く机上で完全性を保証できないため、テストが仕様の正（設計書 §4.1）。
 */
(function(){
  const isNode = (typeof module !== 'undefined') && (typeof require === 'function');
  const K = isNode ? require('./kanbun.js') : window.Kanbun;
  const P = isNode ? require('./progress.js') : window.Progress;
  const PC = isNode ? require('./punct-check.js') : window.KanbunPunct;
  const G = isNode ? require('./gojun.js') : window.KanbunGojun;
  const R = isNode ? require('./reference.js') : window.KanbunReference;
  const Q = isNode ? require('./kuho.js') : window.KanbunKuho;

  const results = [];
  function test(name, fn){
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, msg: String((e && e.message) || e) }); }
  }
  function eq(got, want, label){
    const jg = JSON.stringify(got), jw = JSON.stringify(want);
    if (jg !== jw) throw new Error((label ? label + ': ' : '') + '期待 ' + jw + ' 実際 ' + jg);
  }
  function ok(cond, label){ if (!cond) throw new Error(label || '条件が偽'); }

  // mark 短縮記法: 'レ' / '一'〜'三' / '上中下' / '甲乙丙' を配列にする（テスト専用）
  const M = {
    'レ': { re: true },
    '一': { lv: 1, n: 1 }, '二': { lv: 1, n: 2 }, '三': { lv: 1, n: 3 },
    '上': { lv: 2, n: 1 }, '中': { lv: 2, n: 2 }, '下': { lv: 2, n: 3 },
    '甲': { lv: 3, n: 1 }, '乙': { lv: 3, n: 2 }, '丙': { lv: 3, n: 3 }
  };
  function tk(c, marks, extra){
    const t = Object.assign({ c }, extra || {});
    if (marks) t.mark = marks.split('').map(ch => M[ch]);
    return t;
  }

  function run(problems, referenceData){
    results.length = 0;
    const data = referenceData || (isNode ? {
      pages: require('./reference.json'), kuho: require('./kuho.json'), qa: require('../qa/questions.json')
    } : null);
    if (!data) throw new Error('参考書の検査データがありません');
    // ---- 句法クイズ: 実際の出題器で全型・全 examples を検査する ----
    const typeById = new Map(data.kuho.types.map(t => [t.id, t]));
    const textById = new Map(problems.map(p => [p.id, p]));
    for (const t of data.kuho.types) {
      test('句法 ' + t.id + ': katachi の文は examples の全問題から選び、他の正解を誤答にしない', () => {
        const ids = t.examples || [];
        for (let i = 0; i < ids.length; i++) {
          // 最初の乱数で実例を指定し、その後は誤答の補充順を変えて両端を確認する。
          for (const tail of [0, 0.999999]) {
            let first = true;
            const quiz = Q.createQuiz(data.kuho, problems, () => {
              if (first) { first = false; return (i + 0.5) / ids.length; }
              return tail;
            });
            const q = quiz.buildQuestion('katachi', t);
            const p = textById.get(ids[i]);
            ok(p, ids[i]);
            eq(q.example.id, ids[i], '全 examples を選べる');
            ok(ids.includes(q.example.id), 'この型の examples から出す');
            eq(q.prompt, 'この文の句形はどれですか。');
            eq(q.example.hakubun, p.tokens.map(k => k.c + (k.p || '')).join(''), ids[i] + ' の句読点');
            eq(q.example.kakikudashi, p.kakikudashi);
            eq(q.example.meaning, p.meaning, '解答後に出す訳');
            eq([q.example.work, q.example.chapter], [(p.source || {}).work || '', (p.source || {}).chapter || '']);
            eq(q.answer, t.label);
            eq(q.choices.length, 4, ids[i] + ' の四択');
            eq(new Set(q.choices.map(K.normalizeKana)).size, 4, '重複しない');
            ok(q.choices.includes(q.answer), '正解を残す');
            const wrong = q.choices.filter(c => K.normalizeKana(c) !== K.normalizeKana(q.answer)).map(K.normalizeKana);
            for (const id of p.kuho || []) {
              const other = typeById.get(id);
              if (other && other.id !== t.id) {
                ok(!wrong.includes(K.normalizeKana(other.label)), ids[i] + ' の別解 ' + id + ' を誤答にしない');
              }
            }
          }
        }
      });
    }
    test('句法: confuse と補充候補の両方から、同一文の別解と同じラベルを除く', () => {
      const target = {id:'a', label:'正解', markers:['乎'], examples:['p'], confuse:['b']};
      const other = {id:'b', label:'別解'};
      const alias = {id:'c', label:'別解'};
      const fillers = ['甲', '乙', '丙', '丁'].map((label, i) => ({id:'x' + i, label}));
      const fixture = {types:[target, other, alias].concat(fillers)};
      for (const random of [() => 0, () => 0.999999]) {
        const q = Q.createQuiz(fixture, [{id:'p', kuho:['分類', 'a', 'b'], tokens:[{c:'乎', p:'。'}]}], random)
          .buildQuestion('katachi', target);
        ok(!q.choices.includes('別解'), 'confuse の id と補充候補の同名 id をともに除く');
        eq(q.choices.length, 4);
        ok(q.choices.includes('正解'));
      }
    });
    test('句法: examples が無い型は従来の型・目印の出題を保つ', () => {
      const target = Object.assign({}, data.kuho.types[0], {examples:[]});
      const q = Q.createQuiz(data.kuho, problems).buildQuestion('katachi', target);
      eq(q.example, null);
      eq(q.prompt, 'この型は何の句形ですか。');
      eq(q.sub, '目印になる字: ' + target.markers.join('・'));
      ok(q.choices.includes(target.label));
    });
    test('句法: 空欄と意味の形式には実例を加えず、従来の正解を保つ', () => {
      const quiz = Q.createQuiz(data.kuho, problems);
      for (const t of data.kuho.types) {
        const blank = quiz.buildQuestion('blank', t), imi = quiz.buildQuestion('imi', t);
        eq(blank.answer, t.blank);
        eq(imi.answer, t.meaning);
        eq(blank.example, undefined);
        eq(imi.example, undefined);
        eq(blank.choices.length, 4);
        eq(imi.choices.length, 4);
        ok(blank.choices.includes(t.blank));
        ok(imi.choices.includes(t.meaning));
      }
    });

    const book = new R.ReferenceBook(data.pages, problems, data.kuho.types, data.qa.patterns);

    test('参考書: 目次から12章すべてへ進める', () => {
      eq(book.pages.length, 12);
      const html = book.indexHtml();
      for (const page of book.pages) ok(html.includes('page=' + page.id), page.id);
    });
    for (const page of book.pages) {
      test('参考書 ' + page.id + ': 全節と節末の問題を描ける', () => {
        const html = book.pageHtml(page);
        for (const section of page.blocks.filter(b => b.kind === 'section')) {
          ok(html.includes('id="' + R.anchorId(section.anchor) + '"'), section.anchor);
          for (const code of section.codes || []) {
            eq(book.sectionByCode(code).section.anchor, section.anchor, code);
            if (book.patterns.has(code)) ok(html.includes('code=' + encodeURIComponent(code)), code);
          }
          const expected = problems.filter(p => (p.kuho || []).some(c =>
            book.types.has(c) && (section.codes || []).includes(c))).map(p => p.id);
          eq(book.sectionProblems(section).map(p => p.id), expected, section.anchor);
          for (const id of expected) ok(html.includes('p=' + id + '&amp;from=reference&amp;page=' + page.id), id);
        }
        if (!isNode) {
          const box = document.createElement('div');
          box.innerHTML = html;
          eq(box.querySelectorAll('.ref-section').length, page.blocks.filter(b => b.kind === 'section').length);
          for (const a of box.querySelectorAll('.section-toc a')) {
            ok(box.querySelector(new URL(a.href).hash), a.href);
          }
        }
      });
      for (const block of page.blocks.filter(b => b.kind === 'example')) {
        test('参考書の例 ' + page.id + '/' + block.id + ': 白文・訓点・書き下し・意味を問題から描く', () => {
          const p = problems.find(p => p.id === block.id);
          ok(p, block.id);
          const html = book.exampleHtml(block.id, page);
          for (const text of [R.hakubun(p), p.kakikudashi, p.meaning]) ok(html.includes(R.inline(text)), text);
          eq((html.match(/class="ref-cell"/g) || []).length, p.tokens.length);
          for (const t of p.tokens) if (t.mark && t.mark.length) ok(html.includes(R.marksText(t.mark)), p.id);
          ok(html.includes('この問題を解く'));
          if (!isNode) {
            const box = document.createElement('div');
            box.innerHTML = html;
            eq(box.querySelector('figure').dataset.example, p.id);
            eq(box.querySelector('.ref-hakubun').textContent, '白文 ' + R.hakubun(p));
            eq(Array.from(box.querySelectorAll('dd')).map(el => el.textContent), [p.kakikudashi, p.meaning]);
            eq(Array.from(box.querySelectorAll('.ref-kanji')).map(el => el.textContent).join(''), p.tokens.map(t => t.c).join(''));
          }
        });
      }
    }
    test('参考書: 全句法の型は実在する節へ解決でき、リンクの anchor が実在する', () => {
      for (const type of data.kuho.types) {
        const target = book.sectionByCode(type.id);
        ok(target, type.id);
        ok(book.pageHtml(target.page).includes('id="' + R.anchorId(target.section.anchor) + '"'), type.id);
        const linked = problems.filter(p => (p.kuho || []).includes(type.id)).map(p => p.id).sort();
        eq(linked, type.examples.slice().sort(), type.id + ' の双方向の対応');
        ok(linked.length > 0, type.id + ' の練習問題が空でない');
      }
      for (const page of book.pages) for (const block of page.blocks.filter(b => b.kind === 'link' && !b.soon)) {
        const target = book.pageById(block.to);
        ok(target, block.to);
        if (block.sec) ok(target.blocks.some(b => b.kind === 'section' && b.anchor === block.sec), block.sec);
      }
    });
    test('参考書: 全種類のブロックと強調を描き、準備中はリンクにしない', () => {
      const page = {id:'synthetic', title:'検査', blocks:[]};
      const fixtures = [
        {kind:'text', text:'説明<b>強調</b>'}, {kind:'heading', title:'小見出し'},
        {kind:'list', ordered:true, items:['甲', '乙']},
        {kind:'table', head:['甲', '乙'], rows:[['丙', '丁']], align:['left', 'right'], caption:'表'},
        {kind:'callout', tone:'caution', text:'確かめましょう。'},
        {kind:'link', to:'intro', sec:'step-1', text:'読む手順へ'},
        {kind:'mistake', wrong:'誤り', right:'正しい読み', why:'読み方を比べましょう。'},
        {kind:'contrast', left:'左の読み', right:'右の読み', why:'違いを確かめましょう。'}
      ];
      for (const block of fixtures) ok(book.blockHtml(block, page).length > 10, block.kind);
      ok(book.blockHtml(fixtures[0], page).includes('<b>強調</b>'));
      ok(book.blockHtml(fixtures[2], page).startsWith('<ol>'));
      ok(!book.blockHtml({kind:'link', to:'future', text:'次の解説', soon:true}, page).includes('href='));
      eq(R.inline('<script>悪いコード</script>'), '&lt;script&gt;悪いコード&lt;/script&gt;');
      eq(book.sectionByCode('存在しない型'), null);
      let threw = false;
      try { book.exampleHtml('存在しない例', page); } catch (_) { threw = true; }
      ok(threw, '不明な例文を黙って省略しない');
    });
    test('参考書: category タグは型 id の代わりに集めない・型の重複は検出する', () => {
      const pages = [{id:'test', blocks:[{kind:'section', anchor:'a', title:'節', codes:['型']}]}];
      const b = new R.ReferenceBook(pages, [{id:'type', kuho:['型']}, {id:'category', kuho:['分類']}], [{id:'型'}]);
      eq(b.sectionProblems(pages[0].blocks[0]).map(p => p.id), ['type']);
      pages[0].blocks.push({kind:'section', anchor:'b', codes:['型']});
      let threw = false;
      try { new R.ReferenceBook(pages, [], []); } catch (_) { threw = true; }
      ok(threw, '型を複数の節に置くと検出する');
    });
    test('参考書: 型 id を足しても、既存のカテゴリによる難度は変わらない', () => {
      for (const p of problems) {
        const categories = (p.kuho || []).filter(c => Object.prototype.hasOwnProperty.call(data.kuho.categories, c));
        eq(K.difficulty(p), K.difficulty(Object.assign({}, p, {kuho:categories})), p.id);
      }
    });

    // ---- 白文の句読点（読み順・採点とは独立） ----
    test('句読点: p は省略するか読点・句点を1つ持つ', () => {
      for (const p of problems) for (const t of p.tokens){
        if (!Object.prototype.hasOwnProperty.call(t, 'p')) continue;
        ok(typeof t.p === 'string' && /^[、。]$/.test(t.p), p.id + '「' + t.c + '」');
      }
    });
    test('句読点: punct-check の形の検査を全問に通す', () => {
      eq(PC.checkValues(problems), []);
    });
    test('句読点: 不正な p と、明示した空値を検出する', () => {
      eq(PC.checkValues([{ id: 'ok', tokens: [tk('甲'), tk('乙', null, {p:'、'}), tk('丙', null, {p:'。'})] }]), []);
      for (const value of ['', null, undefined, false, 1, [], {}, '，', '、。']){
        const bad = { id:'bad', tokens:[tk('甲', null, {p:value})] };
        const errors = PC.checkValues([bad]);
        eq(errors.length, 1);
        eq([errors[0].id, errors[0].index], ['bad', 0]);
      }
    });
    test('句読点: 返読の途中の読点・句点を検出する', () => {
      for (const p of ['、', '。']){
        const problem = { tokens:[tk('読', '二'), tk('漢', null, {p}), tk('文', '一')] };
        eq(PC.findCrossings(problem), [{step:2, from:2, to:0, boundaries:[{index:1, p}]}]);
      }
    });
    test('句読点: 戻り先の直後は境界、戻り元の直後は越えない', () => {
      eq(PC.findCrossings({tokens:[tk('読', '二', {p:'、'}), tk('書', '一')]}).length, 1);
      eq(PC.findCrossings({tokens:[tk('読', '二'), tk('書', '一', {p:'。'})]}), []);
      eq(PC.findCrossings({tokens:[tk('甲', null, {p:'、'}), tk('乙', null, {p:'。'})]}), []);
    });
    test('句読点: 熟語返りは後続字と続けて読み、外の境界だけを調べる', () => {
      const tokens = [tk('撃', '二', {join:true}), tk('破'), tk('敵'), tk('軍', '一', {p:'。'})];
      eq(PC.findCrossings({tokens}), []);
      tokens[2].p = '、';
      eq(PC.findCrossings({tokens}), [{step:2, from:3, to:0, boundaries:[{index:2, p:'、'}]}]);
    });
    test('句読点: 再読文字の1回目を誤検出せず、2回目の返読を検査する', () => {
      const tokens = [tk('未', '二', {reread:{first:{}, second:{}}}), tk('嘗'), tk('見', '一', {p:'。'})];
      eq(PC.findCrossings({tokens}), []);
      tokens[1].p = '、';
      eq(PC.findCrossings({tokens}), [{step:3, from:2, to:0, boundaries:[{index:1, p:'、'}]}]);
    });
    test('句読点: 読まない置き字に付いた境界も検査する', () => {
      const tokens = [tk('読', '二'), tk('之', null, {role:'placed', p:'、'}), tk('書', '一', {p:'。'})];
      eq(PC.findCrossings({tokens}), [{step:1, from:2, to:0, boundaries:[{index:1, p:'、'}]}]);
    });
    test('句読点: 複数の境界を返り点から調べ、order の帳簿には頼らない', () => {
      const tokens = [tk('読', '二', {p:'、'}), tk('漢', null, {p:'。'}), tk('文', '一')];
      const report = PC.check([{id:'probe', tokens, order:[0,1,2], kakikudashi:'検査用'}]);
      eq(report.errors, []);
      eq(report.crossings[0].plain, '読、漢。文');
      eq(report.crossings[0].jumps[0].boundaries, [{index:0,p:'、'}, {index:1,p:'。'}]);
    });
    test('句読点: 鴻門之会は節内で返り、句読点は生成・採点に影響しない', () => {
      const p = problems.find(p => p.id === 'koumon-toso');
      eq(PC.findCrossings(p), []);
      const without = {...p, tokens:p.tokens.map(t=>{const c={...t}; delete c.p; return c;})};
      eq(K.readOrder(p.tokens), K.readOrder(without.tokens));
      eq(K.toKakikudashi(p.tokens, p.order), p.kakikudashi);
      eq(K.grade(p.tokens.map(t=>t.mark || []), p), K.grade(without.tokens.map(t=>t.mark || []), without));
      eq(K.matchesKakikudashi(p.kakikudashi, p), true);
    });

    // ---- readOrder 単体（設計書 §4.1 の検算例＋各機構） ----
    test('一二: 読二書一', () => {
      eq(K.readOrder([tk('読', '二'), tk('書', '一')]), [1, 0]);
    });
    test('レ点: 読レ書', () => {
      eq(K.readOrder([tk('読', 'レ'), tk('書')]), [1, 0]);
    });
    test('挟み: 不二敢食一', () => {
      eq(K.readOrder([tk('不', '二'), tk('敢'), tk('食', '一')]), [1, 2, 0]);
    });
    test('置き字: 学而不二思一則罔', () => {
      eq(K.readOrder([
        tk('学'), tk('而', null, { role: 'placed' }),
        tk('不', '二'), tk('思', '一'), tk('則'), tk('罔')
      ]), [0, 3, 2, 4, 5]);
    });
    test('レ点の連鎖: 不レ覚レ暁', () => {
      eq(K.readOrder([tk('不', 'レ'), tk('覚', 'レ'), tk('暁')]), [2, 1, 0]);
    });
    test('解放された字にレ点が続く: 不レ如二一見一', () => {
      eq(K.readOrder([tk('不', 'レ'), tk('如', '二'), tk('一'), tk('見', '一')]), [2, 3, 1, 0]);
    });
    test('一レ（合字）: 鬻二盾与一レ矛', () => {
      eq(K.readOrder([tk('鬻', '二'), tk('盾'), tk('与', '一レ'), tk('矛')]), [1, 3, 2, 0]);
    });
    test('三二一: 使三我長二百獣一', () => {
      eq(K.readOrder([tk('使', '三'), tk('我'), tk('長', '二'), tk('百'), tk('獣', '一')]), [1, 3, 4, 2, 0]);
    });
    test('上下と一二の入れ子: 使下人読二漢文一上', () => {
      // 「文」が 一 と 上 を兼ねる合字。内側（一二）から解放して外側（上下）へ
      eq(K.readOrder([
        tk('使', '下'), tk('人'), tk('読', '二'), tk('漢'), tk('文', '一上')
      ]), [1, 3, 4, 2, 0]);
    });
    test('甲乙をまたぐ三層', () => {
      eq(K.readOrder([
        tk('A'), tk('B', '乙'), tk('C', '二'), tk('D'), tk('E', '一'), tk('F', '甲')
      ]), [0, 3, 4, 2, 5, 1]);
    });
    test('再読文字（レ点）: 未レ知', () => {
      const mi = tk('未', 'レ', { reread: { first: { yomi: 'いま', okuri: 'ダ' }, second: { yomi: '', okuri: 'ズ', kana: true } } });
      eq(K.readOrder([mi, tk('知')]), [0, 1, 0]);
    });
    test('再読文字（二一）: 未二嘗見一', () => {
      const mi = tk('未', '二', { reread: { first: { yomi: 'いま', okuri: 'ダ' }, second: { yomi: '', okuri: 'ズ', kana: true } } });
      eq(K.readOrder([mi, tk('嘗'), tk('見', '一')]), [0, 1, 2, 0]);
    });
    test('熟語返り（ハイフン）: 撃二-破敵軍一', () => {
      eq(K.readOrder([
        tk('撃', '二', { join: true }), tk('破'), tk('敵'), tk('軍', '一')
      ]), [2, 3, 0, 1]);
    });

    // ---- 書き下し生成 ----
    test('書き下し: 学びて思はざれば則ち罔し', () => {
      const p = problems.find(p => p.id === 'rongo-manabite');
      eq(K.toKakikudashi(p.tokens, p.order), p.kakikudashi);
    });
    test('書き下し: 再読文字は1回目と2回目で読みが変わる', () => {
      const p = problems.find(p => p.id === 'rongo-misei');
      eq(K.toKakikudashi(p.tokens, p.order), '未だ生を知らず');
    });

    // ---- 仮名の正規化 ----
    test('仮名: 歴史的・現代仮名遣いの同一視', () => {
      ok(K.kanaEquals('学びて思はざれば則ち罔し', '学びて思わざれば則ち罔し'), 'ハ行転呼');
      ok(K.kanaEquals('ゐど', 'いど'), 'ゐ');
      ok(K.kanaEquals('たづねて', 'たずねて'), 'づ');
      ok(!K.kanaEquals('学びて', '学ばず'), '別の文は不一致');
    });

    // ---- 採点 ----
    test('採点: 登録どおりの訓点 → ok', () => {
      const p = problems.find(p => p.id === 'shungyo-2');
      const marks = p.tokens.map(t => t.mark || []);
      eq(K.grade(marks, p).status, 'ok');
    });
    test('採点: 読み順が同じ別の打ち方 → variant（原則1）', () => {
      // 聞二啼鳥一 をレ点連鎖 聞レ啼レ鳥 とは書けないので、一二をレで代用できる隣接例を使う
      const p = {
        tokens: [tk('読', '二'), tk('書', '一')],
        order: [1, 0], kakikudashi: '', acceptable: []
      };
      const user = [[M['レ']], []];
      eq(K.grade(user, p).status, 'variant');
    });
    test('採点: 訓点なし → wrong と食い違い位置', () => {
      const p = problems.find(p => p.id === 'shungyo-2');
      const r = K.grade(p.tokens.map(() => []), p);
      eq(r.status, 'wrong');
      eq(r.divergeAt, 2, '3番目（啼を聞と読む）で食い違う');
    });
    test('採点: 読まれない字が残る打ち方 → wrong', () => {
      const p = { tokens: [tk('読', '二'), tk('書')], order: [1, 0], kakikudashi: '' };
      const r = K.grade([[M['二']], []], p);
      eq(r.status, 'wrong');
    });

    // ---- 難易度 ----
    test('難易度: 単純なレ点 < 上下・合字入り（矛盾）', () => {
      const easy = { tokens: [tk('読', 'レ'), tk('書')], kuho: [] };
      const hard = problems.find(p => p.id === 'mujun-1');
      ok(K.difficulty(easy) < K.difficulty(hard));
    });

    // ---- 学習履歴（progress.js） ----
    // ブラウザでは実際の localStorage を触るので、テストの前後で必ず reset する
    test('進捗: 記録前はすべて未着手', () => {
      P.reset();
      const ps = [{ id: 'test-a' }, { id: 'test-b' }];
      const s = P.summary(ps);
      eq([s.total, s.touched, s.complete], [2, 0, 0]);
      // モードが増減しても壊れないよう、期待値は MODES から作る
      eq(Object.keys(s.byMode).sort(), P.MODES.slice().sort());
      ok(P.MODES.every(m => s.byMode[m] === 0), 'どのモードも 0');
      eq(P.stateOf('test-a'), 'none');
      P.reset();
    });
    test('進捗: モードごとに記録され、全モード揃うと all', () => {
      P.reset();
      const first = P.MODES[0], second = P.MODES[1];
      P.markClear('test-a', first, 100);
      eq(P.stateOf('test-a'), 'some');
      ok(P.isClear('test-a', first), first + ' はクリア済み');
      ok(!P.isClear('test-a', second), second + ' はまだ');
      P.MODES.slice(1).forEach(m => P.markClear('test-a', m, 100));
      eq(P.stateOf('test-a'), 'all');
      P.reset();
    });
    test('進捗: 未知のモードは弾く', () => {
      P.reset();
      let threw = false;
      try { P.markClear('test-a', 'L9', 0); } catch (e) { threw = true; }
      ok(threw, '未知のモードで例外が出る');
      P.reset();
    });
    test('進捗: 次の未クリアを一周して探す', () => {
      P.reset();
      const ps = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
      eq(P.nextUnclear(ps, 'L1', 0), 1);
      P.markClear('t2', 'L1', 100);
      eq(P.nextUnclear(ps, 'L1', 0), 2, 't2 は済みなので t3 へ');
      P.markClear('t3', 'L1', 100);
      eq(P.nextUnclear(ps, 'L1', 0), 0, '末尾まで行ったら先頭へ回る');
      P.markClear('t1', 'L1', 100);
      eq(P.nextUnclear(ps, 'L1', 0), -1, '全部クリアなら -1');
      P.reset();
    });

    // ---- 送り仮名の候補と採点（書き下し練習 K2・docs/DESIGN_kudashi_input.md） ----
    const byId = id => problems.find(p => p.id === id);

    test('送り仮名: 候補生成は決定的（同じ引数なら同じ並び）', () => {
      const p = byId('rongo-manabite');
      const a = K.okuriChoices(problems, p, 0, 1);
      const b = K.okuriChoices(problems, p, 0, 1);
      eq(a.choices, b.choices);
      eq(a.answer, b.answer);
    });
    test('送り仮名: 問えるカードに置き字は入らない', () => {
      const p = byId('rongo-manabite');   // 「而」が置き字
      const ask = K.askableOkuri(p.tokens);
      ok(ask.every(x => p.tokens[x.i].role !== 'placed'), '置き字は問わない');
      ok(ask.every(x => K.okuriOf(p.tokens[x.i], x.nth) !== ''), '送り仮名を持つものだけ');
    });
    test('送り仮名: 再読文字は1回目と2回目の2キーに分かれる', () => {
      const p = byId('rongo-misei');      // 「未」が再読文字
      const ask = K.askableOkuri(p.tokens);
      const mi = ask.filter(x => p.tokens[x.i].c === '未');
      eq(mi.map(x => x.nth), [1, 2]);
      const c1 = K.okuriChoices(problems, p, mi[0].i, 1);
      const c2 = K.okuriChoices(problems, p, mi[0].i, 2);
      ok(c1.answer !== c2.answer, '1回目と2回目で正解が違う');
    });
    test('送り仮名: 問うカードは5枚までに絞る', () => {
      for (const p of problems){
        const n = K.pickAskable(p).length;
        ok(n >= 0 && n <= 5, p.id + ' の出題枚数が ' + n + ' 枚');
      }
      const jocho = byId('jocho');
      if (jocho) ok(K.askableOkuri(jocho.tokens).length > 5 && K.pickAskable(jocho).length === 5,
        '問える枚数が多い問題でも5枚に絞られる');
    });

    // 【総当たり】この3本が本設計の中心的な保証
    test('送り仮名【総当たり】候補に正解がちょうど1つ含まれる', () => {
      for (const p of problems){
        for (const { i, nth } of K.askableOkuri(p.tokens)){
          const r = K.okuriChoices(problems, p, i, nth);
          const hit = r.choices.filter(c => K.normalizeKana(c) === K.normalizeKana(r.answer)).length;
          if (hit !== 1) throw new Error(p.id + ':' + i + ':' + nth + ' の正解が ' + hit + ' 個');
        }
      }
    });
    test('送り仮名【総当たり】候補は正規化しても重複しない', () => {
      for (const p of problems){
        for (const { i, nth } of K.askableOkuri(p.tokens)){
          const norm = K.okuriChoices(problems, p, i, nth).choices.map(c => K.normalizeKana(c));
          if (new Set(norm).size !== norm.length) throw new Error(p.id + ':' + i + ' に重複');
        }
      }
    });
    test('送り仮名【総当たり】偶然正解になる誤答肢が1つも無い', () => {
      // L2 の誤答肢生成と同じ原則（読み順で偶然当たる肢を除く）を仮名の層に移したもの
      for (const p of problems){
        for (const { i, nth } of K.askableOkuri(p.tokens)){
          const r = K.okuriChoices(problems, p, i, nth);
          for (const c of r.choices){
            if (K.normalizeKana(c) === K.normalizeKana(r.answer)) continue;
            const inputs = {}; inputs[i + ':' + nth] = c;
            const g = K.gradeReadings(p, inputs);
            if (g.status !== 'wrong'){
              throw new Error(p.id + ':' + i + ' の誤答肢「' + c + '」が ' + g.status + ' になる');
            }
          }
        }
      }
    });

    test('送り仮名: 正解どおりに入れると ok', () => {
      const p = byId('rongo-manabite');
      const inputs = {};
      for (const { i, nth } of K.askableOkuri(p.tokens)) inputs[i + ':' + nth] = K.okuriOf(p.tokens[i], nth);
      eq(K.gradeReadings(p, inputs).status, 'ok');
    });
    test('送り仮名: 未入力のカードはデータの値で埋まる', () => {
      const p = byId('rongo-manabite');
      const g = K.gradeReadings(p, {});   // 何も入れない
      eq(g.status, 'ok');
      eq(g.kakikudashi, p.kakikudashi);
    });
    test('送り仮名: 現代仮名遣いで書いても落とさない（カード単位で採点しない根拠）', () => {
      // ukemi-utagau の「見」はデータが「ハレ」。カード単体では kanaEquals('はれ','われ')=false だが、
      // 文全体で見れば ハ行転呼が効いて一致する。決定事項 U5（歴史的・現代の両方を正解にする）を守るため、
      // 合否は必ず文全体で判定する。
      // 返るのは ok ではなく **variant**（＝正解だが登録と表記が違う）。
      // これは訓点モードの「レ点でも一二点でも読み順が合えば variant」と同じ扱いで、
      // UI 側は「正解です。歴史的仮名遣いでは『疑はれ』と書きます」と併記できる＝そのほうが教材として良い
      const p = byId('ukemi-utagau');
      ok(!!p, 'ukemi-utagau がある');
      const mi = p.tokens.findIndex(t => t.c === '見');
      ok(!K.kanaEquals('はれ', 'われ'), 'カード単体では一致しない');
      const inputs = {}; inputs[mi + ':1'] = 'ワレ';
      const g = K.gradeReadings(p, inputs);
      ok(g.status !== 'wrong', '現代仮名遣いを落とさない（実際は ' + g.status + '）');
      eq(g.status, 'variant');
      eq(g.via, 'kana', '表記だけの違いは via=kana（別解の via=acceptable と区別する）');
    });
    test('送り仮名: 1枚だけ違うと wrong になり、食い違い位置を返す', () => {
      const p = byId('rongo-manabite');
      const ask = K.askableOkuri(p.tokens);
      const target = ask[0];
      const inputs = {}; inputs[target.i + ':' + target.nth] = 'ゾ';   // まず正解にならない形
      const g = K.gradeReadings(p, inputs);
      eq(g.status, 'wrong');
      ok(g.divergeAt >= 0, '食い違い位置が返る（実際は ' + g.divergeAt + '）');
      eq(p.order[g.divergeAt], target.i, '食い違い位置は入れ替えたカード');
    });
    test('送り仮名: acceptable の別解は variant になる', () => {
      // matchesKakikudashi 単体の挙動を見る合成データ。
      // （実データの acceptable は validateProblem の形状検査を通す必要があり、
      //   漢字を仮名書きした別解は登録できない＝K3 で到達できないため）
      const p = {
        id: 'synth', source: { work: 'テスト', chapter: '合成' },
        tokens: [tk('読', '二'), tk('書', '一')],
        order: [1, 0], kakikudashi: '書を読む', acceptable: ['書をよむ']
      };
      p.tokens[0].yomi = 'よ'; p.tokens[0].okuri = 'ム';
      p.tokens[1].yomi = 'しょ'; p.tokens[1].okuri = 'ヲ';
      eq(K.gradeReadings(p, {}).status, 'ok');
      // 「読む」を仮名書きした別解を acceptable が拾う
      const alt = Object.assign({}, p, { kakikudashi: '書をXX' });
      eq(K.matchesKakikudashi('書をよむ', p), true);
      void alt;
    });
    test('別解: 訓読の流派差（温ねて/温めて）は variant via=acceptable', () => {
      // K3（自由入力）の核心。標準形と違う送り仮名でも、流派として正しい読みは落とさない。
      const p = byId('rongo-onko');
      const g = K.gradeReadings(p, { '0:1': 'メテ' });        // 温ネテ → 温めて
      eq(g.status, 'variant');
      eq(g.via, 'acceptable');
      eq(g.kakikudashi, '故きを温めて新しきを知る');
      // ひらがなで打っても同じ（K3 の入力欄はどちらも受ける）
      eq(K.gradeReadings(p, { '0:1': 'めて' }).status, 'variant');
      // でたらめは wrong のまま
      eq(K.gradeReadings(p, { '0:1': 'ゾ' }).status, 'wrong');
    });
    test('別解: 登録した流派差が全部 variant で通る（施す勿かれ・同じくせ・於て）', () => {
      const cases = [
        ['rongo-hodokosu', { '5:1': 'ス' }],          // 施すこと勿かれ → 施す勿かれ
        ['mq-ryosai-onaji', { '7:1': 'ジクセ' }],     // 同にせ → 同じくせ
        ['mq-ryosai-onaji', { '7:1': 'ジウセ' }],     // 同にせ → 同じうせ（ウ音便）
        ['mujun-3', { '0:1': 'テ' }]                  // 於いて → 於て
      ];
      for (const [id, inputs] of cases){
        const g = K.gradeReadings(byId(id), inputs);
        eq(g.status, 'variant', id + ' ' + JSON.stringify(inputs) + ' が ' + g.status);
        eq(g.via, 'acceptable');
      }
    });
    test('別解: validateProblem が壊れた acceptable を弾く', () => {
      const mk = acc => {
        const p = {
          id: 'synth-acc', source: { work: 'テスト', chapter: '合成' },
          tokens: [tk('読', '二'), tk('書', '一')],
          order: [1, 0], kakikudashi: '書を読む', acceptable: acc
        };
        p.tokens[0].yomi = 'よ'; p.tokens[0].okuri = 'ム';
        p.tokens[1].yomi = 'しょ'; p.tokens[1].okuri = 'ヲ';
        return K.validateProblem(p);
      };
      eq(mk([]).length, 0, '空はよい');
      eq(mk(['書は読まん']).length, 0, '送り仮名だけ違う別解はよい');
      ok(mk(['書を読む']).length > 0, '標準形と同じものは弾く（登録不要）');
      ok(mk(['書ヲ読ム']).length > 0, '標準形と仮名で同一視されるものも弾く');
      ok(mk(['読み書きす']).length > 0, 'カードの並びと合わない語順は弾く');
      ok(mk(['書をよむ']).length > 0, '漢字を仮名書きした別解は弾く（K3 で到達できない）');
      ok(mk(['']).length > 0, '空文字列は弾く');
    });
    test('送り仮名: 再読文字の2枚目に1枚目の読みを入れると wrong', () => {
      const p = byId('rongo-misei');
      const mi = p.tokens.findIndex(t => t.reread);
      const inputs = {};
      inputs[mi + ':2'] = p.tokens[mi].reread.first.okuri;   // 2枚目に1回目の送り仮名
      eq(K.gradeReadings(p, inputs).status, 'wrong');
    });
    test('置き字: prevReadable が置き字を飛ばして直前の読み字を返す', () => {
      const p = byId('rongo-manabite');            // 学・而(置き字)・不・思・則・罔
      eq(K.prevReadable(p.tokens, 2), 0, '「不」の直前の読み字は「学」（「而」を飛ばす）');
    });

    // ---- 語順を組み立てる ----
    test('語順: 同じ字のカードを交換しても字の並びで正解にする', () => {
      const p = {tokens: [tk('不'), tk('知'), tk('不'), tk('慍')]};
      const cards = [2, 1, 0, 3].map(i => p.tokens[i].c);
      eq(G.grade(G.chars(p), cards), {correct: true, firstMismatch: -1});
      eq(G.grade(G.chars(p), ['不', '不', '知', '慍']), {correct: false, firstMismatch: 1});
      eq(G.grade(G.chars(p), ['不', '知']), {correct: false, firstMismatch: 2});
      eq(G.grade(G.chars(p), ['不', '知', '不', '慍', '知']), {correct: false, firstMismatch: 4});
      eq(G.grade(G.chars(p), []), {correct: false, firstMismatch: 0});
    });
    test('語順: 候補は1問以上、全候補でカードが2枚以上あり置き字も残る', () => {
      const pool = G.candidates(problems);
      ok(pool.length > 0);
      for (const p of pool) {
        ok(G.chars(p).length >= 2, p.id);
        eq(G.chars(p), p.tokens.map(t => t.c), p.id);
        ok(!G.exclusionReason(p), p.id);
      }
      const p = problems.find(p => p.tokens.some(t => t.role === 'placed'));
      eq(G.chars(p).length, p.tokens.length);
      ok(G.chars(p).every(c => !/[、。？！]/.test(c)), '句読点はカードにしない');
    });
    test('語順: 詩形注記・注記なしの漢詩を外し、詩についての散文は残す', () => {
      for (const id of ['shungyo-1', 'shonen-1', 'rokusai-1', 'keirin-1', 'mq-riennso-myonichi', 'shiki-sui', 'gaika-chikara', 'gaika-sui', 'gaika-gu']) {
        eq(G.exclusionReason(problems.find(p => p.id === id)), 'poetry', id);
      }
      eq(G.exclusionReason({source: {work: '未収録の作品・七絶'}, tokens: [tk('甲'), tk('乙')]}), 'poetry');
      eq(G.exclusionReason({source: {chapter: '作者・五律'}, tokens: [tk('甲'), tk('乙')]}), 'poetry');
      ok(G.candidates(problems).some(p => p.id === 'suiko-roba'));
      eq(G.exclusionReason({tokens: [tk('甲')]}), 'too-short');
      eq(G.exclusionReason({tokens: [tk('甲'), tk('甲')]}), 'identical');
    });
    test('語順: 句法カテゴリと字数の絞り込みは両方を満たす', () => {
      for (const category of ['', ...Object.keys(data.kuho.categories)]) {
        for (const length of ['', 'short', 'medium', 'long']) {
          const want = G.candidates(problems).filter(p =>
            (!category || G.categoriesFor(p, data.kuho).includes(category))
            && (!length || (length === 'short' ? p.tokens.length <= 6
              : length === 'medium' ? p.tokens.length >= 7 && p.tokens.length <= 12 : p.tokens.length >= 13)));
          eq(G.filterCandidates(problems, data.kuho, category, length).map(p => p.id), want.map(p => p.id));
        }
      }
      eq(G.filterCandidates(problems, data.kuho, 'unknown', ''), []);
    });
    test('語順: 重複字があってもシャッフル後は別の並びで、カードを失わない', () => {
      for (const p of G.candidates(problems)) {
        const expected = G.chars(p);
        // 常に同じ乱数を返し、再シャッフルが必要な経路も確かめる。
        const result = G.shuffled(expected, () => 0.999999);
        ok(!G.grade(expected, result).correct, p.id);
        eq(result.slice().sort(), expected.slice().sort(), p.id);
        eq(G.chars(p), expected, '原データを変更しない');
      }
    });

    // ---- 版の同期（.js の中の ?v= は HTML だけ見る検査の死角になる） ----
    if (isNode){
      test('読み仮名: 歴史的仮名づかいと熟語の不備・候補を区別する', () => {
        require('child_process').execFileSync(process.execPath,
          [require('path').join(__dirname, 'yomi-rules-tests.js')], {encoding:'utf8'});
      });
      // 生成器はファイルの過不足も見るので Node で呼ぶ。ブラウザに別実装を持たない。
      test('参考書: 原稿・参照先・生成物と、壊した原稿の検出が一致する', () => {
        const path = require('path');
        const { execFileSync } = require('child_process');
        const root = path.join(__dirname, '..');
        for (const args of [
          ['tools/gen-reference.mjs', '--check'],
          ['tools/reference-md-check.js'],
          ['tools/reference-check.mjs']
        ]) execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30000 });
      });
      test('参考書: 型と問題を結ぶ道具が両側を更新する', () => {
        const fs = require('fs'), path = require('path'), os = require('os');
        const {execFileSync} = require('child_process');
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanbun-links-'));
        try {
          fs.mkdirSync(path.join(tmp, 'kanbun/tools'), {recursive:true});
          const tool = path.join(tmp, 'kanbun/tools/link-verify.js');
          fs.copyFileSync(path.join(__dirname, 'tools/link-verify.js'), tool);
          const write = (f, data) => fs.writeFileSync(path.join(tmp, f), JSON.stringify(data));
          write('kanbun/kuho.json', {types:[{id:'type', name:'検査の型', category:'hitei', markers:['不'], examples:[]}]});
          write('kanbun/texts.json', {problems:[{id:'sample', tokens:[{c:'不'}], kuho:['hitei'], kakikudashi:'ず'}]});
          write('plan.json', {type:['sample']});
          execFileSync(process.execPath, [tool, path.join(tmp, 'plan.json'), '--write'], {encoding:'utf8'});
          const read = f => JSON.parse(fs.readFileSync(path.join(tmp, f), 'utf8'));
          eq(read('kanbun/kuho.json').types[0].examples, ['sample']);
          eq(read('kanbun/texts.json').problems[0].kuho, ['hitei', 'type']);
        } finally {
          const target = fs.realpathSync(tmp), tempRoot = fs.realpathSync(os.tmpdir());
          if (path.dirname(target) !== tempRoot || !path.basename(target).startsWith('kanbun-links-')) throw new Error('検査用フォルダーの削除先が想定外です');
          fs.rmSync(target, {recursive:true});
        }
      });

      test('版: js 内の fetch(?v=) が HTML の script の ?v= と一致する', () => {
        const fs = require('fs'), path = require('path');
        const pairs = [['kudashi.js', 'kudashi.html'], ['game.js', 'index.html'], ['kuho.js', 'kuho.html'], ['guide.js', 'guide.html'],
                       ['rec.js', 'index.html'], ['reference.js', 'reference.html'], ['gojun.js', 'gojun.html']];   // rec.js の中の demos.json?v= も同じ版に揃える
        const versions = new Set();
        for (const [js, html] of pairs){
          const jsSrc = fs.readFileSync(path.join(__dirname, js), 'utf8');
          const htmlSrc = fs.readFileSync(path.join(__dirname, html), 'utf8');
          const inJs = (jsSrc.match(/\?v=(\d+)/g) || []).map(s => s.slice(3));
          const inHtml = (htmlSrc.match(/\?v=(\d+)/g) || []).map(s => s.slice(3));
          const all = inJs.concat(inHtml);
          all.forEach(v => versions.add(v));
          if (!all.length) continue;
          const uniq = [...new Set(all)];
          if (uniq.length !== 1){
            throw new Error(js + ' と ' + html + ' の版が食い違う: ' + uniq.join(','));
          }
        }
        for (const html of ['index.html', 'test.html', 'guide.html', 'kudashi.html', 'kuho.html', 'reference.html', 'gojun.html']) {
          const text = fs.readFileSync(path.join(__dirname, html), 'utf8');
          for (const m of text.matchAll(/(?:\?v=|>v)(\d+)/g)) versions.add(m[1]);
        }
        eq(versions.size, 1, '漢文の全ページの版と表示を揃える');
      });
    }

    // ---- 収録済みの白文に旧字が残っていないか ----
    // 台帳から素材を写すとき、対応表（§8.1）に抜けがあると旧字がそのまま入る。
    // 実際に「啟」（S-28 不憤不啟不悱不発）が1件すり抜けた。表の抜けは別途
    // 「字体欄の 舊→新 を集めて表と突き合わせる」検査で洗うが、こちらは
    // **投入されたデータ側**を見張る（表を直しても既に入ったものは直らないため）。
    if (isNode){
      test('字体: 収録済みの白文に §8.1 の変換対象の旧字が残っていない', () => {
        const { MAP } = require('./tools/kyujitai.js');
        const bad = [];
        for (const p of problems)
          for (const t of p.tokens)
            if (MAP[t.c]) bad.push(p.id + '「' + t.c + '」→' + MAP[t.c]);
        if (bad.length) throw new Error(bad.join(' ／ '));
      });
    }

    // 連読符は「字と字の境をまたぐ縦棒」として描く（game.js）。置き字を挟んで
    // 離れた字に join すると棒の引きようがなく、画面と読み順が食い違う。
    // いまのデータは4問5トークンとも隣り合っているので、その前提を固定する。
    test('熟語返り: join の相手は隣の字（連読符を引ける形になっている）', () => {
      for (const p of problems)
        p.tokens.forEach((t, i) => {
          if (!t.join) return;
          const nx = K.nextReadable(p.tokens, i);
          if (nx !== i + 1)
            throw new Error(p.id + ' の「' + t.c + '」が離れた字に join している（' + i + '→' + nx + '）');
        });
    });

    // note は innerHTML に差し込まれるので、**強調** がそのまま画面に出ていた（55問が該当）。
    test('note: **強調** が <strong> になり、記号が画面に残らない', () => {
      eq(K.noteHtml('ふつうの注記'), 'ふつうの注記');
      eq(K.noteHtml('**返り点が1つも要らない文**で、上から順に読めばよい'),
         '<strong>返り点が1つも要らない文</strong>で、上から順に読めばよい');
      eq(K.noteHtml('**A**と**B**が同居'), '<strong>A</strong>と<strong>B</strong>が同居');
      eq(K.noteHtml('<script>&'), '&lt;script&gt;&amp;');   // 先に逃がしてから強調に変える
      eq(K.noteHtml(undefined), '');
      for (const p of problems)
        if (p.note && K.noteHtml(p.note).indexOf('**') >= 0)
          throw new Error(p.id + ' の note にアスタリスクが残る');
    });

    // 返り点の階層は内側から順に使う。上下点は一二点をまたぐときの印なので、
    // **一二点がひとつも無いのに上下点を使う**のは訓点として誤り。読み順は正しく出るため
    // 二重帳簿（validateProblem）を素通りし、実際に shiki-taiha-shingun が
    // 「大＝下・阿＝上」で入っていた（一二点で足りる形だった。2026-08-13 に修正）。
    test('返り点: 内側の階層を飛ばして外側の階層を使っていない', () => {
      const bad = [];
      for (const p of problems){
        const lvs = new Set();
        for (const t of p.tokens)
          for (const m of (t.mark || [])) if (typeof m.lv === 'number') lvs.add(m.lv);
        for (const lv of lvs)
          if (lv > 1 && !lvs.has(lv - 1)) bad.push(p.id + '（lv' + lv + ' があるのに lv' + (lv - 1) + ' が無い）');
      }
      if (bad.length) throw new Error(bad.join(' ／ '));
    });

    // ---- データ総当たり（二重帳簿・設計書 §4.2） ----
    for (const p of problems){
      test('データ ' + p.id + ': 訓点→読み順→書き下しの二重帳簿', () => {
        const errs = K.validateProblem(p);
        if (errs.length) throw new Error(errs.join(' ／ '));
      });
    }

    return results;
  }

  // 実ページを1枚ずつ開く。iframe を非表示にはせず、携帯幅で描画する。
  async function runBrowser(problems, data){
    const rs = [];
    let savedProgress = null, canRestore = false;
    try { savedProgress = localStorage.getItem(P.KEY); canRestore = true; } catch (_) { /* 保存できない環境でも検査する */ }
    const frame = document.createElement('iframe');
    frame.title = '参考書と問題の往復を確かめる';
    frame.style.cssText = 'position:absolute;left:-10000px;width:375px;height:812px;border:0;';
    document.body.appendChild(frame);
    const wait = async fn => {
      const until = Date.now() + 20000;
      while (Date.now() < until) {
        if (fn()) return;
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      throw new Error('画面の読み込みが終わりませんでした: ' + frame.src);
    };
    const open = async (url, ready) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ページを開けません: ' + url)), 20000);
        frame.onload = () => { clearTimeout(timer); resolve(); };
        frame.src = url;
      });
      await wait(() => ready(frame.contentWindow));
      return frame.contentWindow;
    };
    const refReady = w => w.document.documentElement.dataset.referenceReady === 'true';
    const gameReady = w => w.kanbunApp && w.kanbunApp.ready;
    const check = async (name, fn) => {
      try { await fn(); rs.push({name, ok:true}); }
      catch (e) { rs.push({name, ok:false, msg:String(e.message || e)}); }
    };
    try {
      const gojunReady = w => w.document.documentElement.dataset.gojunReady === 'true';
      await check('語順の画面: タップ・ヒント・正誤判定・参考書との往復', async () => {
        const p = problems.find(p => p.id === 'rongo-manabite');
        let w = await open('gojun.html?p=' + p.id, gojunReady);
        let doc = w.document;
        ok(doc.documentElement.scrollWidth <= w.innerWidth, '375px幅でページの横はみ出しがない');
        eq(doc.getElementById('meaning').textContent, p.meaning);
        ok(doc.getElementById('hint-text').hidden);
        eq(doc.querySelectorAll('#tray-source .card').length, p.tokens.length);
        ok(!G.grade(G.chars(p), [...doc.querySelectorAll('#tray-source .card')].map(el => el.textContent)).correct);
        doc.getElementById('btn-hint').click();
        eq(doc.getElementById('hint-text').textContent, '書き下し：' + p.kakikudashi);
        ok(doc.getElementById('btn-hint').disabled);
        const first = doc.querySelector('#tray-source .card');
        first.click();
        eq(doc.querySelectorAll('#tray-order .card').length, 1);
        first.click();
        eq(doc.querySelectorAll('#tray-order .card').length, 0);
        doc.getElementById('btn-grade').click();
        eq(doc.getElementById('result').className, 'wrong');
        ok(doc.getElementById('result').textContent.includes(p.kakikudashi));
        ok(doc.getElementById('result').textContent.includes(p.tokens.map(t => t.c + (t.p || '')).join('')));
        const href = doc.querySelector('#result a').href;
        eq(new URL(href).searchParams.get('code'), 'hitei-fu', 'カテゴリIDを飛ばして最初の型IDを使う');
        eq(new URL(href).searchParams.get('mode'), 'gojun');
        for (const c of G.chars(p)) [...doc.querySelectorAll('#tray-source .card')].find(el => el.textContent === c).click();
        doc.getElementById('btn-grade').click();
        eq(doc.getElementById('result').className, 'ok');
        eq(doc.querySelectorAll('#tray-source .card').length, 0, '置き字も答え欄に使う');
        const order = doc.getElementById('tray-order');
        order.children[0].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
        eq(order.children[1].textContent, p.tokens[0].c);
        doc.getElementById('btn-grade').click();
        eq(doc.querySelectorAll('.card.bad').length, p.tokens.length);
        order.children[1].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
        doc.getElementById('btn-grade').click();
        eq(doc.getElementById('result').className, 'ok');
        w = await open(href, refReady);
        eq(w.location.hash, '#ref-sec-hitei-fu');
        const back = w.document.querySelector('#ref-back a').href;
        eq(new URL(back).pathname.split('/').pop(), 'gojun.html');
        w = await open(back, gojunReady);
        eq(new URLSearchParams(w.location.search).get('p'), p.id);
      });
      await check('語順の画面: 型が未登録の問題は語順の基本へ案内する', async () => {
        const ids = new Set(data.kuho.types.map(t => t.id));
        const p = G.candidates(problems).find(p => !(p.kuho || []).some(code => ids.has(code)));
        ok(p);
        const w = await open('gojun.html?p=' + p.id, gojunReady);
        w.document.getElementById('btn-grade').click();
        const href = w.document.querySelector('#result a').href;
        const query = new URL(href).searchParams;
        eq(query.get('page'), 'word-order');
        eq(query.get('p'), p.id);
        eq(query.get('mode'), 'gojun');
        eq(new URL(href).hash, '#ref-sec-order-2');
      });
      await check('語順の画面: 絞り込みの空集合・次の問題・対象外IDを扱う', async () => {
        let w = await open('gojun.html?p=shungyo-1', gojunReady);
        const doc = w.document;
        ok(doc.getElementById('notice').textContent.includes('出題対象外'));
        ok(!doc.getElementById('exercise').hidden);
        const category = doc.getElementById('category-select'), length = doc.getElementById('length-select');
        category.value = 'yokuyo'; category.dispatchEvent(new w.Event('change'));
        length.value = 'short'; length.dispatchEvent(new w.Event('change'));
        ok(doc.getElementById('exercise').hidden);
        ok(doc.getElementById('btn-next').disabled);
        length.value = 'medium'; length.dispatchEvent(new w.Event('change'));
        ok(!doc.getElementById('exercise').hidden);
        const id = new URLSearchParams(w.location.search).get('p');
        const p = problems.find(p => p.id === id);
        ok(G.categoriesFor(p, data.kuho).includes('yokuyo'));
        eq(G.lengthGroup(p), 'medium');
        doc.getElementById('btn-next').click();
        ok(new URLSearchParams(w.location.search).get('p') !== id);
        doc.getElementById('btn-hint').click();
        doc.getElementById('btn-reset').click();
        ok(doc.getElementById('hint-text').hidden);
        eq(doc.querySelectorAll('#tray-order .card').length, 0);
      });
      await check('句法の画面: 初回から実例を示し、訳は回答後だけ表示し、次問で消す', async () => {
        const w = await open('kuho.html', w => w.document.querySelector('#choices button'));
        const d = w.document;
        const select = d.getElementById('kind-select');
        select.value = 'katachi';
        select.dispatchEvent(new w.Event('change'));
        const pattern = d.getElementById('q-pattern').textContent;
        const haku = d.getElementById('q-haku').textContent;
        const kd = d.getElementById('q-kd').textContent;
        const p = problems.find(p => p.tokens.map(t => t.c + (t.p || '')).join('') === haku && '書き下し: ' + p.kakikudashi === kd);
        ok(p, '表示した文が texts.json にある');
        ok(data.kuho.types.some(t => t.pattern === pattern && t.examples.includes(p.id)), '型と examples が対応する');
        eq(d.getElementById('q-text').textContent, 'この文の句形はどれですか。');
        ok(!d.getElementById('q-example').hidden);
        eq(d.getElementById('q-source').textContent, [p.source.work, p.source.chapter].filter(Boolean).join('・'));
        ok(!d.getElementById('quiz').textContent.includes(p.meaning), '回答前は訳を DOM に含めない');
        eq(d.getElementById('explain').textContent, '');
        ok(d.documentElement.scrollWidth <= w.innerWidth, '375px 幅で横にはみ出さない');
        d.querySelector('#choices button').click();
        ok(d.getElementById('explain').textContent.includes(p.meaning), '示した文の訳');
        ok(d.getElementById('explain').textContent.includes('この文を読む手がかり:'), '型の note による説明');
        const labels = data.kuho.types.filter(t => t.pattern === pattern && t.examples.includes(p.id)).map(t => t.note);
        ok(labels.some(note => d.getElementById('explain').textContent.includes(note)), 'この型の note を表示');
        d.getElementById('btn-next').click();
        eq(d.getElementById('explain').textContent, '', '前問の訳を残さない');
        for (const kind of ['blank', 'imi']) {
          select.value = kind;
          select.dispatchEvent(new w.Event('change'));
          ok(d.getElementById('q-example').hidden, kind + ' では実例を隠す');
          eq(d.getElementById('q-haku').textContent, '');
          eq(d.getElementById('q-kd').textContent, '');
          eq(d.getElementById('q-source').textContent, '');
        }
      });
      await check('参考書の画面: 型 id から節へ着地し、375px幅で読める', async () => {
        const w = await open('reference.html?code=hitei-fu', refReady);
        eq(w.location.hash, '#ref-sec-hitei-fu');
        eq(new URLSearchParams(w.location.search).get('page'), 'hitei');
        ok(w.document.getElementById('ref-sec-hitei-fu'));
        ok(w.document.documentElement.scrollWidth <= w.innerWidth, 'ページの横はみ出し');
        const details = w.document.querySelector('.section-exercises');
        details.open = true;
        ok(details.querySelector('a[href*="from=reference"]'), '練習問題がある');
      });
      await check('参考書の画面: クリア後の全型チップから解説へ進み、元の問題へ戻れる', async () => {
        const ids = new Set(data.kuho.types.map(t => t.id));
        const p = problems.find(p => (p.kuho || []).filter(c => ids.has(c)).length > 1);
        ok(p, '複数の型を持つ実際の問題を使う');
        let w = await open('index.html?p=' + p.id + '&mode=L1', gameReady);
        eq(w.document.querySelectorAll('.reference-links a').length, 0, '解答前にチップを出さない');
        for (const i of p.order) w.document.querySelector('.cell[data-i="' + i + '"]').click();
        const chips = Array.from(w.document.querySelectorAll('.reference-links a'));
        eq(chips.map(a => a.dataset.kuho), p.kuho.filter(c => ids.has(c)));
        const chipHrefs = chips.map(a => a.href);
        for (const href of chipHrefs) {
          w = await open(href, refReady);
          const code = new URL(href).searchParams.get('code');
          const section = w.kanbunReference.book.sectionByCode(code);
          eq(w.location.hash, '#' + R.anchorId(section.section.anchor));
          ok(w.document.getElementById('ref-back').hidden === false);
          const back = new URL(w.document.querySelector('#ref-back a').href);
          eq(back.searchParams.get('p'), p.id);
          eq(back.searchParams.get('mode'), 'L1');
        }
        const back = w.document.querySelector('#ref-back a').href;
        w = await open(back, gameReady);
        eq(w.kanbunApp.problem.id, p.id);
        eq(w.kanbunApp.mode, 'L1');
        ok(w.document.getElementById('reference-back').hidden, 'from の名乗りがなければ帯を出さない');
      });
      await check('参考書の画面: 例文と節末から問題へ進み、読んでいた節に戻れる', async () => {
        let w = await open('reference.html?page=vocabulary', refReady);
        const example = w.document.querySelector('[data-example]');
        const id = example.dataset.example;
        const href = example.querySelector('.practice-link').href;
        const query = new URL(href).searchParams;
        eq(query.get('from'), 'reference');
        w = await open(href, gameReady);
        eq(w.kanbunApp.problem.id, id);
        ok(!w.document.getElementById('reference-back').hidden);
        w = await open(w.document.querySelector('#reference-back a').href, refReady);
        eq(w.location.hash, '#ref-sec-' + query.get('sec'));
        ok(w.document.getElementById(w.location.hash.slice(1)));
        w = await open('reference.html?code=hitei-fu', refReady);
        const exerciseHref = w.document.querySelector('.section-exercises a[href*="from=reference"]').href;
        w = await open(exerciseHref, gameReady);
        eq(w.kanbunApp.problem.id, new URL(exerciseHref).searchParams.get('p'));
        ok(!w.document.getElementById('reference-back').hidden);
      });
      await check('参考書の画面: 未知のコード・章でも目次へ戻れ、別の来訪者に帯を出さない', async () => {
        for (const q of ['?code=missing', '?page=missing']) {
          const w = await open('reference.html' + q, refReady);
          ok(!w.document.getElementById('ref-notice').hidden);
          eq(w.document.querySelectorAll('.chapter-index a').length, data.pages.length);
        }
        const w = await open('index.html?p=rongo-manabite&page=hitei&from=other', gameReady);
        ok(w.document.getElementById('reference-back').hidden);
      });
    } finally {
      frame.remove();
      if (canRestore) {
        if (savedProgress === null) localStorage.removeItem(P.KEY);
        else localStorage.setItem(P.KEY, savedProgress);
      }
    }
    return rs;
  }

  if (isNode){
    const fs = require('fs'), path = require('path');
    const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
    const rs = run(texts.problems);
    const fails = rs.filter(r => !r.ok);
    for (const r of rs) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' — ' + r.msg));
    console.log('----');
    console.log(rs.length + ' 件中 ' + (rs.length - fails.length) + ' 件合格 / ' + fails.length + ' 件失敗');
    process.exit(fails.length ? 1 : 0);
  } else {
    window.KanbunTests = { run, runBrowser };
  }
})();
