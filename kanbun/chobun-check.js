/* 長文ステージのデータ検査。Node と test.html で同じ検査を使う。 */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KanbunChobunCheck = factory();
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  function check(data, texts, kuho){
    const errors = [], fail = message => errors.push(message);
    const nonempty = value => typeof value === 'string' && value.trim().length > 0;
    const byId = new Map((texts.problems || []).map(p => [p.id, p]));
    const types = new Set((kuho.types || []).map(t => t.id));
    const categories = kuho.categories || {};
    if (!data || !Array.isArray(data.stages) || !data.stages.length) return ['stages は空でない配列にしてください'];
    const ids = new Set();
    for (const s of data.stages){
      const name = 'stage ' + s.id;
      for (const key of ['id', 'category', 'title', 'work', 'intro']) if (!nonempty(s[key])) fail(name + ': ' + key + ' が空です');
      if (ids.has(s.id)) fail(name + ': id が重複しています');
      ids.add(s.id);
      if (!Object.prototype.hasOwnProperty.call(categories, s.category)) fail(name + ': 未知の category ' + s.category);
      if (!Array.isArray(s.problems) || !s.problems.length){ fail(name + ': problems が空です'); continue; }
      if (new Set(s.problems).size !== s.problems.length) fail(name + ': problems が重複しています');
      for (const id of s.problems) if (!byId.has(id)) fail(name + ': 実在しない problem ' + id);
      for (const [id, note] of Object.entries(s.breaks || {})){
        if (!s.problems.includes(id) || !nonempty(note)) fail(name + ': 区切りの対象または説明が不正 ' + id);
      }
      if (!Array.isArray(s.questions) || s.questions.length < 4 || s.questions.length > 6){
        fail(name + ': questions は4〜6問にしてください'); continue;
      }
      let content = false;
      const kinds = new Set();
      s.questions.forEach((q, i) => {
        const label = name + ' Q' + (i + 1);
        if (!['kuho', 'yaku', 'naiyou'].includes(q.type)) fail(label + ': 未知の type');
        kinds.add(q.type);
        if (content && q.type !== 'naiyou') fail(label + ': 内容説明は句法・訳の後に置いてください');
        if (q.type === 'naiyou') content = true;
        if (!byId.has(q.p) || !s.problems.includes(q.p)) fail(label + ': 対象 p が本文にありません');
        for (const key of ['ask', 'explain']) if (!nonempty(q[key])) fail(label + ': ' + key + ' が空です');
        if (!Array.isArray(q.choices) || q.choices.length !== 4 || !q.choices.every(nonempty)) fail(label + ': choices は空でない4択にしてください');
        if (Array.isArray(q.choices)){
          const normalized = q.choices.map(c => String(c).normalize('NFKC').replace(/\s/g, ''));
          if (new Set(normalized).size !== q.choices.length) fail(label + ': choices が重複しています');
          if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) fail(label + ': answer が choices の範囲外です');
        }
        if (q.code && !types.has(q.code)) fail(label + ': 未知の句法 code ' + q.code);
      });
      if (kinds.size < 2 || !kinds.has('yaku') || !kinds.has('naiyou')) fail(name + ': 訳と内容説明を混ぜてください');
    }
    return errors;
  }
  return {check};
});
if (typeof module === 'object' && require.main === module){
  const fs = require('fs'), path = require('path');
  try {
    const read = name => {
      const bytes = fs.readFileSync(path.join(__dirname, name));
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(name + ': BOM があります');
      return JSON.parse(bytes.toString('utf8'));
    };
    const data = read('chobun.json');
    const errors = module.exports.check(data, read('texts.json'), read('kuho.json'));
    if (errors.length){ errors.forEach(e => console.error(e)); process.exitCode = 1; }
    else console.log('長文ステージ: ' + data.stages.length + 'ステージ・' + data.stages.reduce((n, s) => n + s.questions.length, 0) + '問 合格');
  } catch(e){ console.error(e.message); process.exitCode = 1; }
}
