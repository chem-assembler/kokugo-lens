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
      eq(P.summary(ps), { total: 2, touched: 0, complete: 0,
        byMode: { L1: 0, L2: 0, L3: 0, K: 0 } });
      eq(P.stateOf('test-a'), 'none');
      P.reset();
    });
    test('進捗: モードごとに記録され、4モード揃うと all', () => {
      P.reset();
      P.markClear('test-a', 'L1', 100);
      eq(P.stateOf('test-a'), 'some');
      ok(P.isClear('test-a', 'L1'), 'L1 はクリア済み');
      ok(!P.isClear('test-a', 'L2'), 'L2 はまだ');
      ['L2', 'L3', 'K'].forEach(m => P.markClear('test-a', m, 100));
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
