#!/usr/bin/env node
/* 隔離した一時原稿を壊して、生成器の終了コードと検出理由を確かめる。
 * 実際の原稿・問題データには書き込まない。Node の回帰テストからも呼ぶ。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'tools/gen-reference.mjs');
const src = 'kanbun/reference-src/';
const inputFiles = [
  ...fs.readdirSync(path.join(root, src)).map(f => src + f),
  'kanbun/texts.json', 'kanbun/kuho.json', 'qa/questions.json', 'kanbun/reference.json'
];
const baseline = new Map(inputFiles.map(f => [f, fs.readFileSync(path.join(root, f))]));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kanbun-ref-check-'));
const write = (f, s) => fs.writeFileSync(path.join(tmp, f), s);
const read = f => fs.readFileSync(path.join(tmp, f), 'utf8');
const edit = (f, fn) => write(f, fn(read(f)));
const add = (id, block) => edit(src + id + '.md', s => s.trimEnd() + '\n\n' + block + '\n');
const section = (anchor, code) => ':::section\nanchor: ' + anchor + '\ntitle: 検査用の見出し\ncodes:\n  - ' + code + '\n:::';
const link = (to, sec = '') => ':::link\nto: ' + to + '\n' + (sec ? 'sec: ' + sec + '\n' : '') + 'text: 行き先を確かめましょう。\n:::';
function reset() {
  // この検査が足す余分な原稿だけを除く。原稿一式はバイト列から戻す。
  for (const file of ['extra.md']) {
    const f = path.join(tmp, src, file);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  for (const [f, bytes] of baseline) {
    fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
    write(f, bytes);
  }
}
function run(check = true) {
  const before = new Map(inputFiles.filter(f => fs.existsSync(path.join(tmp, f))).map(f => [f, fs.readFileSync(path.join(tmp, f))]));
  const r = spawnSync(process.execPath, [cli, '--root', tmp, ...(check ? ['--check'] : [])], { encoding: 'utf8' });
  if (r.error) throw r.error;
  assert.equal(r.signal, null, '生成器がシグナルで停止した');
  if (check) for (const [f, bytes] of before) assert.ok(fs.readFileSync(path.join(tmp, f)).equals(bytes), '--check が書き換えた: ' + f);
  return { code: r.status, text: r.stdout + r.stderr };
}
let count = 0;
try {
  reset();
  assert.equal(run().code, 0, '正常な原稿の検査');
  const cases = [
    ['ORDER の重複', () => edit(src + 'ORDER.txt', s => s + 'intro\n'), /ORDER.txt.*重複/],
    ['原稿の不足', () => fs.unlinkSync(path.join(tmp, src, 'intro.md')), /原稿の過不足/],
    ['原稿の余剰', () => write(src + 'extra.md', read(src + 'intro.md')), /原稿の過不足/],
    ['前書き id の重複', () => edit(src + 'word-order.md', s => s.replace('id: word-order', 'id: intro')), /前書きの id/],
    ['TOC の順序', () => edit(src + 'TOC.txt', s => s.replace(/\tintro\n/, '\tword-order\n').replace(/語順\tword-order\n/, '語順\tintro\n')), /TOC.txt と ORDER.txt/],
    ['TOC の不足', () => edit(src + 'TOC.txt', s => s.split('\n').filter(l => !l.endsWith('\tintro')).join('\n')), /TOC.txt と ORDER.txt/],
    ['TOC の重複', () => edit(src + 'TOC.txt', s => s + 'kanbun\t読む手順\t仮の章\tintro\n'), /TOC.txt.*重複/],
    ['リンク先の不存在', () => add('intro', link('missing')), /行き先.*原稿にも PLANNED/],
    ['リンク先の節の不存在', () => add('intro', link('hitei', 'missing')), /link の節/],
    ['PLANNED の重複', () => write(src + 'PLANNED.txt', 'future 仮のページ\nfuture 別の題\n'), /PLANNED.txt.*重複/],
    ['PLANNED の実装済みページ', () => write(src + 'PLANNED.txt', 'intro 序\n'), /原稿のあるページ/],
    ['example の不存在', () => add('intro', ':::example\nid: no-such-text\n:::'), /example の id.*texts.json/],
    ['型 id の不存在', () => add('intro', section('unknown', 'no-such-type')), /codes.*句法の型 id/],
    ['qa code の不存在', () => add('intro', section('unknown', 'kbn.goi.no-such-code')), /codes.*一問一答の code/],
    ['同じ節で型 id が重複', () => edit(src + 'hitei.md', s => s.replace('  - hitei-fu\n', '  - hitei-fu\n  - hitei-fu\n')), /codes.*重複/],
    ['別ページで型 id が重複', () => add('intro', section('duplicate', 'hitei-fu')), /codes.*重複/],
    ['別ページで qa code が重複', () => add('intro', section('duplicate', 'kbn.goi.iwaku')), /codes.*重複/],
    ['同じページの別節で qa code が重複', () => add('vocabulary', section('duplicate', 'kbn.goi.iwaku')), /codes.*重複/],
    ['前書き codes の不存在', () => edit(src + 'intro.md', s => s.replace('source:', 'codes:\n  - missing\nsource:')), /前書きの codes.*実在/],
    ['前書きと節の不一致', () => edit(src + 'intro.md', s => s.replace('source:', 'codes:\n  - hitei-fu\nsource:')), /前書きの codes と節/],
    ['生成物の1バイト改変', () => edit('kanbun/reference.json', s => s + ' '), /1バイト一致/],
    ['生成物の CRLF 化', () => edit('kanbun/reference.json', s => s.replace(/\n/g, '\r\n')), /1バイト一致/],
    ['生成物の BOM', () => edit('kanbun/reference.json', s => '\uFEFF' + s), /1バイト一致/],
    ['生成物の欠落', () => fs.unlinkSync(path.join(tmp, 'kanbun/reference.json')), /1バイト一致/],
    ['原稿の BOM', () => edit(src + 'intro.md', s => '\uFEFF' + s), /BOMなし/],
    ['索引の CRLF', () => edit(src + 'ORDER.txt', s => s.replace(/\n/g, '\r\n')), /BOMなし/],
    ['原稿の不正な UTF-8', () => write(src + 'intro.md', Buffer.from([0xff])), /UTF-8 として/]
  ];
  for (const [name, mutate, reason] of cases) {
    reset();
    mutate();
    const r = run();
    assert.equal(r.code, 1, name + ': 終了コードが1ではない\n' + r.text);
    assert.match(r.text, reason, name + ': 別の理由で止まった');
    console.log('PASS 否定対照: ' + name);
    count++;
  }
  reset();
  const actualId = JSON.parse(read('kanbun/texts.json')).problems[0].id;
  add('intro', ':::example\nid: ' + actualId + '\n:::');
  add('intro', link('hitei', 'hitei-fu'));
  write(src + 'PLANNED.txt', 'future 仮のページ\n');
  add('intro', link('future'));
  assert.equal(run(false).code, 0);
  assert.equal(run().code, 0);
  const intro = JSON.parse(read('kanbun/reference.json'))[0];
  assert.deepEqual(intro.blocks.find(b => b.kind === 'example'), { kind: 'example', id: actualId });
  assert.equal(intro.blocks.find(b => b.kind === 'link' && b.to === 'future').soon, true);
  console.log('PASS 正常対照: 実在する example・節リンク・PLANNED リンクを生成して再検査');
  reset();
  edit(src + 'hitei.md', s => s.replace('  - hitei-fu\n', ''));
  assert.equal(run(false).code, 0);
  const warning = run();
  assert.equal(warning.code, 0, warning.text);
  assert.match(warning.text, /🟡.*hitei-fu/);
  console.log('PASS 警告対照: 未配置の型は黄色で知らせ、終了コード0');
  console.log('生成器の対照検査: 否定対照 ' + count + ' 件・正常対照・警告対照が合格（--check の無変更も確認）');
} finally {
  // この検査が作った一時フォルダーだけを削除する。実体が一時領域内かを先に確認する。
  const resolved = fs.realpathSync(tmp);
  const tempRoot = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('kanbun-ref-check-')) throw new Error('一時フォルダーの削除先が想定外です: ' + resolved);
  fs.rmSync(resolved, { recursive: true });
}
