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

  function run(problems){

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

    // ---- 版の同期（.js の中の ?v= は HTML だけ見る検査の死角になる） ----
    if (isNode){
      test('版: js 内の fetch(?v=) が HTML の script の ?v= と一致する', () => {
        const fs = require('fs'), path = require('path');
        const pairs = [['kudashi.js', 'kudashi.html'], ['game.js', 'index.html'], ['kuho.js', 'kuho.html']];
        for (const [js, html] of pairs){
          const jsSrc = fs.readFileSync(path.join(__dirname, js), 'utf8');
          const htmlSrc = fs.readFileSync(path.join(__dirname, html), 'utf8');
          const inJs = (jsSrc.match(/\?v=(\d+)/g) || []).map(s => s.slice(3));
          const inHtml = (htmlSrc.match(/\?v=(\d+)/g) || []).map(s => s.slice(3));
          const all = inJs.concat(inHtml);
          if (!all.length) continue;
          const uniq = [...new Set(all)];
          if (uniq.length !== 1){
            throw new Error(js + ' と ' + html + ' の版が食い違う: ' + uniq.join(','));
          }
        }
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

    // ---- データ総当たり（二重帳簿・設計書 §4.2） ----
    for (const p of problems){
      test('データ ' + p.id + ': 訓点→読み順→書き下しの二重帳簿', () => {
        const errs = K.validateProblem(p);
        if (errs.length) throw new Error(errs.join(' ／ '));
      });
    }

    return results;
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
    window.KanbunTests = { run };
  }
})();
