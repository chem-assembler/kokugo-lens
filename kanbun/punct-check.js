'use strict';
/*
 * 白文の句読点と返読の境界を検査する。
 * node kanbun/punct-check.js          形の不備は1、返読の候補だけなら0
 * node kanbun/punct-check.js --strict 返読の候補があっても1
 * --json は同じ検査結果を機械で読むための出力。
 * 句読点をまたぐ読みが誤りとは限らない。修正せず、原典と読みを見直す候補にする。
 */
(function(){
  const isNode = typeof module !== 'undefined' && typeof require === 'function';
  const K = isNode ? require('./kanbun.js') : window.Kanbun;

  function checkValues(problems){
    const errors = [];
    for (const problem of problems){
      problem.tokens.forEach((token, index) => {
        if (Object.prototype.hasOwnProperty.call(token, 'p')
            && token.p !== '、' && token.p !== '。'){
          errors.push({ id: problem.id, index, value: token.p });
        }
      });
    }
    return errors;
  }

  function findCrossings(problem){
    // 正解帳簿の order を流用せず、返り点から実際の読み順を計算する。
    // join の後続字は順方向に出力される。再読文字は2回目への返読も調べる。
    // 置き字は読み順には現れないが、その字の p は境界として残す。
    const order = K.readOrder(problem.tokens);
    const jumps = [];
    for (let step = 1; step < order.length; step++){
      const from = order[step - 1], to = order[step];
      if (from <= to) continue;
      const boundaries = [];
      // p は字の「直後」。戻り先の p は含み、戻り元の p は含まない。
      // 例: 読二書一。の「書→読」は句点をまたいでいない。
      for (let i = to; i < from; i++){
        const p = problem.tokens[i].p;
        if (p === '、' || p === '。') boundaries.push({ index: i, p });
      }
      if (boundaries.length) jumps.push({ step, from, to, boundaries });
    }
    return jumps;
  }

  function check(problems){
    const crossings = [];
    for (const problem of problems){
      const jumps = findCrossings(problem);
      if (jumps.length) crossings.push({
        id: problem.id,
        plain: problem.tokens.map(t => t.c + (t.p || '')).join(''),
        kakikudashi: problem.kakikudashi,
        jumps
      });
    }
    return { checked: problems.length, errors: checkValues(problems), crossings };
  }

  const api = { checkValues, findCrossings, check };
  if (isNode){
    module.exports = api;
    if (require.main === module){
      const problems = require('./texts.json').problems;
      const result = check(problems);
      if (process.argv.includes('--json')){
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const e of result.errors)
          console.error(e.id + ': ' + (e.index + 1) + '字目の p が不正: ' + String(e.value));
        for (const c of result.crossings){
          const problem = problems.find(p => p.id === c.id);
          console.log('\n' + c.id + '\n白文: ' + c.plain + '\n書き下し: ' + c.kakikudashi);
          for (const j of c.jumps){
            const label = i => (i + 1) + '字目「' + problem.tokens[i].c + '」';
            console.log('  ' + label(j.from) + ' → ' + label(j.to) + ': '
              + j.boundaries.map(b => label(b.index) + 'の後の「' + b.p + '」').join('、'));
          }
        }
        console.log('\n' + result.checked + '問 / 形の不備 ' + result.errors.length
          + '件 / 句読点を越える返読の候補 ' + result.crossings.length + '問');
      }
      process.exitCode = result.errors.length ||
        (process.argv.includes('--strict') && result.crossings.length) ? 1 : 0;
    }
  } else {
    window.KanbunPunct = api;
  }
})();
