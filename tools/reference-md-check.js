/* 原稿書式の対照検査。書籍の本文・例文を使わない、書式専用の仮データ。 */
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const RM = require('./reference-md.js');
const head = '---\nid: probe\ntitle: 書式の検査\nsource:\n  - docs/DESIGN_reference.md §4\nsingleSource: false\nwhy: 原稿の書式を確かめるための仮データで、学習用の本文には含めない。\n---\n\n';
const section = ':::section\nanchor: start\ntitle: 見出し\ncodes:\n  - type-a\n:::\n\n';
const sample = head + section + [
  '**強調**を含む段落。',
  '## 小見出し',
  ':::heading\ntitle: **囲みの見出し**\nadvanced: true\nfold: false\n:::',
  ':::list\nordered: true\nitems:\n  - **項目**\n  - 項目: 値\n:::',
  ':::table\nsource: 書式の仮データ\nhead:\n  - 左\n  - 右\nalign: left | right\nrows:\n  - **甲** | 乙\n:::',
  ':::callout\ntone: caution\ntext: **注意**の文。\n:::',
  ':::link\nto: other\nsec: next\ntext: **別の節**へ\n:::',
  ':::mistake\nwrong: 誤りの読み\nright: 正しい読み\nwhy: **違い**の説明。\n:::',
  ':::example\nid: probe-text\n:::',
  ':::contrast\nleft: 読み甲\nright: 読み乙\nwhy: **違い**の説明。\n:::'
].join('\n\n') + '\n';
const page = RM.parsePage(sample, '書式の仮データ');
assert.equal(page.singleSource, false);
assert.equal(page.blocks.length, 11);
assert.deepEqual(page.blocks.find(b => b.kind === 'example'), { kind: 'example', id: 'probe-text' });
assert.deepEqual(page.blocks.find(b => b.kind === 'table').rows, [['<b>甲</b>', '乙']]);
assert.equal(RM.parsePage(head + ':::section anchor: start title: 見出し :::\n').blocks[0].anchor, 'start');
assert.deepEqual(JSON.parse(RM.serialize([page])), [page]);
assert.ok(!/[\r\uFEFF]/.test(RM.serialize([page])));
// ブラウザ向けの公開口も Node と同じ結果になる。
const context = { self: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('./reference-md.js'), 'utf8'), context);
assert.equal(JSON.stringify(context.self.ReferenceMd.parsePage(sample)), JSON.stringify(page));
const bad = [
  ['強調の閉じ忘れ', head + '**閉じ忘れ。\n'],
  ['生 HTML', head + '<b>手書き</b>\n'],
  ['下付き記法', head + '~下付き~\n'],
  ['段落の途中の改行', head + '段落の前半。\n後半。\n'],
  ['未知のキー', head.replace('title:', 'unknown:') + section],
  ['重複キー', head.replace('title:', 'id: second\ntitle:') + section],
  ['空の配列', head + section.replace('  - type-a\n', '')],
  ['文字列の codes', head + section.replace('codes:\n  - type-a', 'codes: type-a')],
  ['不正な真偽値', sample.replace('ordered: true', 'ordered: yes')],
  ['未閉鎖の囲み', head + ':::example\nid: probe-text\n'],
  ['同じ anchor', head + section + section],
  ['表の列数', sample.replace('**甲** | 乙', '**甲**')],
  ['表の寄せ', sample.replace('left | right', 'left | bottom')],
  ['未知の tone', sample.replace('tone: caution', 'tone: unknown')],
  ['CRLF', sample.replace(/\n/g, '\r\n')],
  ['BOM', '\uFEFF' + sample],
  ['example に本文', head + ':::example\nid: probe-text\ntext: 複製してはいけない例文\n:::\n'],
  ['example の stages', head + ':::example\nstages: probe\n:::\n'],
  ['contrast の不足', head + ':::contrast\nleft: 甲\nright: 乙\n:::\n']
];
for (const kind of ['reaction', 'stageTable', 'mechanismTable', 'dehydrationTable', 'figure']) bad.push([kind, head + ':::' + kind + '\ntext: 仮データ\n:::\n']);
for (const [name, source] of bad) assert.throws(() => RM.parsePage(source, name), Error, name);
console.log('原稿書式: 正常な全ブロック・ブラウザ共用・LF の生成を確認、否定対照 ' + bad.length + ' 件を拒否しました');
