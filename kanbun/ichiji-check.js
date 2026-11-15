#!/usr/bin/env node
'use strict';
/* 一字ちがいの構造・参照・4択を検査する。漢文の自然さや訳の妥当性は人の確認が必要。 */
/* 可／能 の組は外した（レビュアー4回目 B9「可は可能でとる」と食い違う「可＝許可」の説明だったため・2026-11-16）。 */
const requiredThemes = ['不必／必不', '不常／常不', '不俱／俱不', '不復／復不', '不甚／甚不',
  '未／不', '使A／見', '為A所Bの有無', '無不／不無', '豈／何', '莫如／不如',
  '猶／如', '将／当', '非／不', '而の有無'];
const clean = s => [...s.replace(/[\p{P}\p{Z}\s]/gu, '')];
function smallDifference(a, b) {
  const x = clean(a), y = clean(b);
  if (x.join('') === y.join('')) return false;
  if (x.length === y.length) {
    const diff = x.map((c, i) => c === y[i] ? -1 : i).filter(i => i >= 0);
    return diff.length === 1 || (diff.length === 2 && x[diff[0]] === y[diff[1]] && x[diff[1]] === y[diff[0]]);
  }
  if (Math.abs(x.length - y.length) !== 1) return false;
  const [longer, shorter] = x.length > y.length ? [x, y] : [y, x];
  return longer.some((_, i) => longer.filter((_, j) => i !== j).join('') === shorter.join(''));
}
function validate(data, texts, kuho) {
  const errors = [], counts = {}, ids = new Set();
  const nonempty = v => typeof v === 'string' && v.trim().length > 0;
  const types = new Set(kuho.types.map(t => t.id));
  const byId = new Map(texts.problems.map(p => [p.id, p]));
  const normalized = require('./ichiji.js').normalized;
  const pairs = data && data.pairs;
  if (!Array.isArray(pairs)) return {errors:['pairs は配列が必要です'], counts, sourceCount:0, exceptions:[]};
  if (pairs.length < 40) errors.push('40組以上が必要です: ' + pairs.length);
  let sourceCount = 0;
  const exceptions = [];
  for (const p of pairs) {
    const fail = msg => errors.push((p && p.id || '(idなし)') + ': ' + msg);
    if (!p || typeof p !== 'object') { fail('組はオブジェクトが必要'); continue; }
    if (!nonempty(p.id) || !/^[a-z0-9-]+$/.test(p.id)) fail('id は英小文字・数字・ハイフン');
    if (ids.has(p.id)) fail('id重複'); ids.add(p.id);
    if (!nonempty(p.theme)) fail('theme が空');
    counts[p.theme] = (counts[p.theme] || 0) + 1;
    if (!Array.isArray(p.kuho)) fail('kuho は配列が必要');
    else {
      if (new Set(p.kuho).size !== p.kuho.length) fail('kuho 重複');
      for (const code of p.kuho) if (!types.has(code)) fail('未知の句法id: ' + code);
    }
    if (!nonempty(p.point)) fail('point が空');
    else if (p.point.split('。').filter(s => s.trim()).length > 2) fail('point は2文以内');
    if (p.note !== undefined && !nonempty(p.note)) fail('note は理由を記載');
    if (p.context !== undefined && !nonempty(p.context)) fail('context が空');
    for (const key of ['a', 'b']) {
      const s = p[key];
      if (!s || typeof s !== 'object') { fail(key + ' がない'); continue; }
      for (const field of ['hakubun', 'kakikudashi', 'meaning']) if (!nonempty(s[field])) fail(key + '.' + field + ' が空');
      if (typeof s.from !== 'string') fail(key + '.from は問題idまたは空文字列');
      else if (s.from) {
        sourceCount++;
        const ref = byId.get(s.from);
        if (!ref) fail(key + ': 未知の問題id: ' + s.from);
        else {
          const hakubun = ref.tokens.map(t => t.c + (t.p || '')).join('');
          if (s.hakubun !== hakubun) fail(key + ': from の白文と不一致');
          if (s.kakikudashi !== ref.kakikudashi) fail(key + ': from の書き下しと不一致');
        }
      }
    }
    if (p.a && p.b && nonempty(p.a.hakubun) && nonempty(p.b.hakubun)) {
      if (clean(p.a.hakubun).join('') === clean(p.b.hakubun).join('')) fail('白文が同一');
      else if (!smallDifference(p.a.hakubun, p.b.hakubun)) {
        if (!nonempty(p.note)) fail('一字差・二字の入れ替えを超える理由がない');
        exceptions.push(p.id);
      }
      if (nonempty(p.a.kakikudashi) && nonempty(p.b.kakikudashi) && normalized(p.a.kakikudashi) === normalized(p.b.kakikudashi)) fail('相手の書き下しが正解と重複');
    }
    if (!Array.isArray(p.ng) || p.ng.length !== 3 || p.ng.some(s => !nonempty(s))) fail('ng は空でない3つの誤答が必要');
    else if (nonempty(p.point) && new Set([p.point, ...p.ng].map(normalized)).size !== 4) fail('意味の正解・誤答に重複');
  }
  for (const theme of requiredThemes) if ((counts[theme] || 0) < 2) errors.push(theme + ' は2組以上が必要');
  if (!errors.length) {
    const ui = require('./ichiji.js');
    for (const p of pairs) {
      try {
        for (const side of ['a', 'b']) ui.readingChoices(p, side, pairs, () => 0.5);
        ui.meaningChoices(p, () => 0.5);
      } catch (e) { errors.push(e.message); }
    }
  }
  return {errors, counts, sourceCount, exceptions};
}
if (require.main === module) {
  const result = validate(require('./ichiji.json'), require('./texts.json'), require('./kuho.json'));
  console.log('ichiji.json 検査: ' + require('./ichiji.json').pairs.length + '組、元の問題の文 ' + result.sourceCount + '件');
  for (const [theme, count] of Object.entries(result.counts)) console.log('  ' + theme + ': ' + count + '組');
  console.log('一字差を超える注記済みの組: ' + result.exceptions.join(', '));
  for (const error of result.errors) console.error('ERROR ' + error);
  console.log(result.errors.length ? result.errors.length + '件の不備' : 'すべて合格');
  process.exitCode = result.errors.length ? 1 : 0;
}
module.exports = {validate, smallDifference};
