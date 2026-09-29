#!/usr/bin/env node
/**
 * 公開してよいファイルだけを `_site/` に集める（Cloudflare Pages の組み立て・2026-09-29）。
 *
 *   node tools/build-site.mjs            … _site/ を作り直す
 *   node tools/build-site.mjs --list     … 集めるファイルの一覧だけ出す（書かない）
 *
 * ★ なぜ要るか: Cloudflare Pages は置いたものを全部配信する。リポジトリには設計書・引き継ぎ・
 *   台本などの内部文書（.md・docs/・video-scripts/）が入っているので、配信する前に外す。
 *   （GitHub Pages のころは CLAUDE.md・README.md・docs の一部がそのまま読めていた）
 * 外すもの:
 *   ① どの階層の .md も（設計書・引き継ぎ・README）
 *   ② 下の EXCLUDE_DIRS の名前のフォルダの中（どの階層でも。kanbun/tools/ なども）
 *   ③ 道の途中に `_` か `.` で始まる名前がある（.claude/・.gitignore など）
 *   ④ git が追跡していないもの（Cloudflare は clone したものから組み立てる）
 * ⚠ 公開したい .md が出てきたら、html にして置くこと（.md は配信しない決まり）。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXCLUDE_DIRS = ['docs', 'video-scripts', 'tools'];   // どの階層でも、この名前のフォルダの中は外す

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const LIST_ONLY = process.argv.includes('--list');

function excluded(file) {
    if (file.split('/').some(s => s.startsWith('_') || s.startsWith('.'))) return true;
    if (file.toLowerCase().endsWith('.md')) return true;
    return file.split('/').slice(0, -1).some(s => EXCLUDE_DIRS.includes(s));
}

const tracked = execSync('git ls-files -z', { cwd: ROOT }).toString('utf8').split('\0').filter(Boolean);
const files = tracked.filter(f => !excluded(f));

if (LIST_ONLY) { for (const f of files) console.log(f); console.error(`${files.length} / ${tracked.length} 件`); process.exit(0); }

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
    const dst = path.join(OUT, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), dst);
}
if (!files.includes('404.html')) console.warn('⚠ 404.html が無い —— Cloudflare Pages は存在しないパスにトップを 200 で返す');
console.log(`✅ _site/ に ${files.length} 件（追跡 ${tracked.length} 件のうち）`);
