#!/usr/bin/env node
/* 漢文の原稿 → kanbun/reference.json。正は reference-src/、生成物は編集しない。
 * node tools/gen-reference.mjs          生成
 * node tools/gen-reference.mjs --check  原稿・参照先・生成物を検査するだけ
 * --root <dir> は検査用の隔離した原稿一式を指定するときに使う。
 * chem の ORDER/TOC/PLANNED と --check を流用し、問題・コードの照合は漢文用に作り直した。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import RM from './reference-md.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
function fail(message) { throw new Error(message); }
function read(file) {
  const bytes = fs.readFileSync(file);
  let text;
  // TextDecoder は通常 BOM を取り除くので、検査のために残す。
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail(file + ': UTF-8 として読めません'); }
  if (/[\r\uFEFF]/.test(text)) fail(file + ': UTF-8（BOMなし）・LF で保存してください');
  return text;
}
function unique(values, where) {
  const seen = new Set();
  for (const v of values) {
    if (seen.has(v)) fail(where + ': 「' + v + '」が重複しています');
    seen.add(v);
  }
  return seen;
}

export function buildReference(root = ROOT) {
  const src = path.join(root, 'kanbun', 'reference-src');
  const ids = RM.contentLines(read(path.join(src, 'ORDER.txt')));
  if (!ids.length) fail('ORDER.txt が空です');
  if (ids.some(id => !ID_RE.test(id))) fail('ORDER.txt の id は英小文字・数字・ハイフンで書きます');
  const live = unique(ids, 'ORDER.txt');
  const files = fs.readdirSync(src).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
  const missing = ids.filter(id => !files.includes(id));
  const extra = files.filter(id => !live.has(id));
  if (missing.length || extra.length) fail('ORDER.txt と原稿の過不足: 原稿なし [' + missing.join(', ') + '] / ORDER にない原稿 [' + extra.join(', ') + ']');
  const pages = ids.map(id => {
    const p = RM.parsePage(read(path.join(src, id + '.md')), 'kanbun/reference-src/' + id + '.md');
    if (p.id !== id) fail(id + '.md: 前書きの id「' + p.id + '」とファイル名が違います');
    return p;
  });
  unique(pages.map(p => p.id), 'ページの id');

  const toc = RM.parseToc(read(path.join(src, 'TOC.txt')));
  const tocIds = toc.flatMap(row => row.pages);
  unique(tocIds, 'TOC.txt');
  if (JSON.stringify(tocIds) !== JSON.stringify(ids)) fail('TOC.txt と ORDER.txt のページと順序が一致しません');
  const planned = new Map();
  for (const line of RM.contentLines(read(path.join(src, 'PLANNED.txt')))) {
    const m = /^([a-z0-9][a-z0-9-]*)\s+(\S.*)$/.exec(line);
    if (!m) fail('PLANNED.txt は id と表示名を空白で区切ります → ' + line);
    if (planned.has(m[1])) fail('PLANNED.txt の id が重複しています: ' + m[1]);
    if (live.has(m[1])) fail('PLANNED.txt に原稿のあるページが残っています: ' + m[1]);
    planned.set(m[1], m[2]);
  }

  const texts = JSON.parse(read(path.join(root, 'kanbun', 'texts.json')));
  const kuho = JSON.parse(read(path.join(root, 'kanbun', 'kuho.json')));
  const qa = JSON.parse(read(path.join(root, 'qa', 'questions.json')));
  const textIds = unique(texts.problems.map(p => p.id), 'texts.json の問題 id');
  const typeIds = unique(kuho.types.map(t => t.id), 'kuho.json の型 id');
  const qaCodes = unique(qa.patterns.map(p => p.code), 'questions.json の code');
  const knownCodes = new Set([...typeIds, ...qaCodes]);
  const byId = new Map(pages.map(p => [p.id, p]));
  const owners = new Map();
  for (const p of pages) {
    const pageCodes = [];
    for (const b of p.blocks) {
      if (b.kind === 'section') for (const code of b.codes || []) {
        const at = p.id + '#ref-sec-' + b.anchor;
        if (!knownCodes.has(code)) fail(at + ': codes の「' + code + '」は句法の型 id にも一問一答の code にもありません');
        if (owners.has(code)) fail('codes の「' + code + '」が重複しています: ' + owners.get(code) + ' / ' + at + '（1コードは1つの節だけ）');
        owners.set(code, at);
        pageCodes.push(code);
      }
      if (b.kind === 'example' && !textIds.has(b.id)) fail(p.id + ': example の id「' + b.id + '」は texts.json にありません');
      if (b.kind === 'link') {
        const target = byId.get(b.to);
        if (!target && !planned.has(b.to)) fail(p.id + ': link の行き先「' + b.to + '」は原稿にも PLANNED.txt にもありません');
        if (target && b.sec && !target.blocks.some(s => s.kind === 'section' && s.anchor === b.sec)) fail(p.id + ': link の節「' + b.to + '#' + b.sec + '」がありません');
        if (!target) b.soon = true;
      }
    }
    // 問題の着地先の正は節。ページの一覧は節から機械で集め、二重管理しない。
    if (p.codes) {
      unique(p.codes, p.id + ' の前書き codes');
      for (const c of p.codes) if (!knownCodes.has(c)) fail(p.id + ': 前書きの codes「' + c + '」が実在しません');
      if (p.codes.length !== pageCodes.length || p.codes.some(c => !pageCodes.includes(c))) fail(p.id + ': 前書きの codes と節の codes が一致しません。節だけに書けばページ分は自動で集めます');
    }
    if (pageCodes.length) p.codes = pageCodes;
  }
  const uncovered = [...typeIds].filter(id => !owners.has(id));
  return { pages, owners, uncovered, text: RM.serialize(pages) };
}

export function generate({ root = ROOT, check = false, log = console.log } = {}) {
  const result = buildReference(root);
  if (result.uncovered.length) log('🟡 節に置かれていない句法の型 ' + result.uncovered.length + ' 件: ' + result.uncovered.join('・'));
  const out = path.join(root, 'kanbun', 'reference.json');
  const expected = Buffer.from(result.text, 'utf8');
  // 改行・BOM も含めて1バイト一致。正規化してから比べない。
  const same = fs.existsSync(out) && fs.readFileSync(out).equals(expected);
  if (check && !same) fail('kanbun/reference.json が原稿から生成したものと1バイト一致しません。原稿を直して node tools/gen-reference.mjs を実行してください');
  if (!check && !same) fs.writeFileSync(out, expected);
  log('✅ 漢文参考書 ' + result.pages.length + ' ページ・' + result.pages.reduce((n, p) => n + p.blocks.filter(b => b.kind === 'section').length, 0) + ' 節・' + result.owners.size + ' コード: ' + (check ? '原稿・参照先・生成物が一致しています' : same ? '変更なし' : '生成しました'));
  return result;
}

export function main(args = process.argv.slice(2)) {
  try {
    let root = ROOT, check = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--check') check = true;
      else if (args[i] === '--root' && args[i + 1]) root = path.resolve(args[++i]);
      else fail('知らない引数です: ' + args[i]);
    }
    generate({ root, check });
    return 0;
  } catch (e) {
    console.error('❌ ' + e.message);
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
