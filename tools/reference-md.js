/* 漢文参考書の原稿書式。化学レンズの前書き・囲み・ブロック単位の生成を流用する。
 * 原稿の正は kanbun/reference-src/*.md。Node とブラウザで同じ parser を使う。
 * 一般の YAML/Markdown ではない。本文の記法は **強調** だけ。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReferenceMd = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGE_KEYS = ['id', 'unit', 'unitLabel', 'group', 'title', 'summary', 'codes', 'source', 'singleSource', 'why'];
  var PAGE_REQUIRED = ['id', 'title', 'source', 'why'];
  // 化学の section は lead 必須。本文を書かない骨組みも置けるよう、漢文では省略できる。
  var BLOCK_SPECS = {
    section: { order: ['anchor', 'title', 'lead', 'codes'], req: ['anchor', 'title'], list: ['codes'], prose: ['lead'] },
    heading: { order: ['title', 'advanced', 'fold'], req: ['title'], prose: ['title'], bool: ['advanced', 'fold'] },
    list: { order: ['ordered', 'items'], req: ['items'], list: ['items'], prose: ['items'], bool: ['ordered'] },
    table: { order: ['caption', 'source', 'head', 'align', 'rows'], req: ['source', 'head', 'rows'], list: ['head', 'rows'], prose: ['caption', 'head', 'rows'] },
    callout: { order: ['tone', 'text'], req: ['tone', 'text'], prose: ['text'], enums: { tone: ['caution', 'confusing', 'memorize', 'skip', 'note', 'mnemonic'] } },
    link: { order: ['to', 'sec', 'text'], req: ['to', 'text'], prose: ['text'] },
    mistake: { order: ['wrong', 'right', 'why'], req: ['wrong', 'right'], prose: ['wrong', 'right', 'why'] },
    example: { order: ['id'], req: ['id'] },
    contrast: { order: ['left', 'right', 'why'], req: ['left', 'right', 'why'], prose: ['left', 'right', 'why'] }
  };
  var ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  function fail(where, message) { throw new Error(where + ': ' + message); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function includes(a, k) { return (a || []).indexOf(k) >= 0; }
  function plain(s, where) {
    if (/[*~<>&]/.test(s)) fail(where, 'この欄には記法や生 HTML を書けません');
    return s;
  }
  function inline(s, where) {
    // 先に記法を取り除いて検査する。HTML を後から除くと、手書きの <b> も通ってしまう。
    var bare = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    if (/[*~<>&]/.test(bare)) fail(where, '使える記法は **強調** だけです（閉じ忘れ・生 HTML も確かめてください）');
    return s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  // chem の splitPacked / parseKV と同じ、小さな key: 値 の文法。
  // 未知のキー・重複キーは捨てずにエラーにする。値の中のコロンはそのまま残す。
  function parseKV(lines, where, allowed) {
    var out = {}, current = null;
    lines.forEach(function (line, i) {
      var at = where + ':' + (i + 1), m;
      if (!line.trim()) return;
      m = /^\s*-\s+(\S.*)$/.exec(line);
      if (m) {
        if (!current) fail(at, '配列の前に key: が必要です');
        out[current].push(m[1].trim());
        return;
      }
      var re = /(^|\s)([A-Za-z][A-Za-z0-9]*):(?=\s|$)/g, cuts = [];
      while ((m = re.exec(line))) {
        if (includes(allowed, m[2])) cuts.push({ key: m[2], at: m.index + m[1].length, from: re.lastIndex });
      }
      if (!cuts.length || line.slice(0, cuts[0].at).trim()) fail(at, '知らないキー、または key: 値 でない行です → ' + line.trim());
      cuts.forEach(function (c, j) {
        if (has(out, c.key)) fail(at, 'キー「' + c.key + '」が重複しています');
        var v = line.slice(c.from, j + 1 < cuts.length ? cuts[j + 1].at : line.length).trim();
        out[c.key] = v || [];
        current = v ? null : c.key;
      });
    });
    Object.keys(out).forEach(function (k) {
      if (Array.isArray(out[k]) && !out[k].length) fail(where, '「' + k + ':」の値が空です。任意の欄はキーごと省略します');
    });
    return out;
  }

  function convert(kv, spec, where) {
    var out = {};
    spec.req.forEach(function (k) { if (!has(kv, k)) fail(where, '「' + k + '」がありません'); });
    spec.order.forEach(function (k) {
      if (!has(kv, k)) return;
      var v = kv[k], at = where + ' の ' + k;
      var conv = includes(spec.prose, k) ? inline : plain;
      if (includes(spec.list, k)) {
        if (!Array.isArray(v)) fail(at, '1件でも - 値 の配列で書きます');
        out[k] = v.map(function (s) { return conv(s, at); });
      } else if (Array.isArray(v)) fail(at, '配列ではなく1行で書きます');
      else if (includes(spec.bool, k)) {
        if (v !== 'true' && v !== 'false') fail(at, 'true か false で書きます');
        out[k] = v === 'true';
      } else {
        if (spec.enums && spec.enums[k] && !includes(spec.enums[k], v)) fail(at, spec.enums[k].join(' / ') + ' のどれかで書きます');
        out[k] = conv(v, at);
      }
    });
    return out;
  }

  function buildBlock(kind, lines, where) {
    var spec = BLOCK_SPECS[kind];
    if (!spec) fail(where, '使えないブロック :::' + kind);
    var b = Object.assign({ kind: kind }, convert(parseKV(lines, where, spec.order), spec, where));
    if ((kind === 'section' && !ID_RE.test(b.anchor)) || (kind === 'link' && (!ID_RE.test(b.to) || (b.sec && !ID_RE.test(b.sec)))) || (kind === 'example' && !ID_RE.test(b.id))) {
      fail(where, 'id と anchor は英小文字・数字・ハイフンで書きます');
    }
    if (kind === 'table') {
      b.rows = b.rows.map(function (row) { return row.split('|').map(function (cell) { return cell.trim(); }); });
      if (b.rows.some(function (row) { return row.length !== b.head.length; })) fail(where, '表の head と rows の列数が違います');
      if (b.align) {
        b.align = b.align.split('|').map(function (s) { return s.trim(); });
        if (b.align.length !== b.head.length || b.align.some(function (s) { return !includes(['left', 'center', 'right'], s); })) fail(where, 'align は列ごとに left / center / right を | で区切ります');
      }
    }
    return b;
  }

  function parsePage(text, where) {
    where = where || '(reference-src)';
    // 出力を常に LF に保ち、BOM・CRLF の原稿は黙って補正しない。
    if (/\r|\uFEFF/.test(text)) fail(where, 'UTF-8（BOMなし）・LF で保存してください');
    var lines = String(text).split('\n');
    if (lines[0] !== '---') fail(where, '1行目に前書きの --- が必要です');
    var end = lines.indexOf('---', 1);
    if (end < 0) fail(where, '前書きの終わりの --- がありません');
    var page = convert(parseKV(lines.slice(1, end), where + ' の前書き', PAGE_KEYS), {
      order: PAGE_KEYS, req: PAGE_REQUIRED, list: ['codes', 'source'], bool: ['singleSource']
    }, where);
    if (!ID_RE.test(page.id)) fail(where, 'ページ id は英小文字・数字・ハイフンで書きます');
    if (page.why.length < 20) fail(where, 'why に、このページを立てた理由を20字以上で書きます');
    var blocks = [], anchors = Object.create(null);
    for (var i = end + 1; i < lines.length; i++) {
      var line = lines[i].trim(), at = where + ':' + (i + 1);
      if (!line) continue;
      var m = /^:::([A-Za-z][A-Za-z0-9]*)(?:\s+|$)(.*)$/.exec(line), b;
      if (m) {
        var body = [], rest = m[2], closed = false;
        while (true) {
          if (/:::\s*$/.test(rest)) { body.push(rest.replace(/:::\s*$/, '')); closed = true; break; }
          body.push(rest);
          i++;
          if (i >= lines.length) break;
          rest = lines[i];
        }
        if (!closed) fail(at, ':::' + m[1] + ' の終わりの ::: がありません');
        b = buildBlock(m[1], body, at);
      } else if (/^##+\s+\S/.test(line)) b = { kind: 'heading', title: inline(line.replace(/^#+\s+/, ''), at) };
      else {
        if (/^(:::|#\s)/.test(line)) fail(at, '節は :::section、小見出しは ## で書きます');
        b = { kind: 'text', text: inline(line, at) };
      }
      if (i + 1 < lines.length && lines[i + 1].trim()) fail(at, 'ブロックの間に空行が必要です（1段落は1行）');
      if (b.kind === 'section') {
        if (has(anchors, b.anchor)) fail(at, '節の anchor「' + b.anchor + '」が重複しています');
        anchors[b.anchor] = true;
      }
      blocks.push(b);
    }
    if (!blocks.length) fail(where, '本文または節の見出しが必要です');
    page.blocks = blocks;
    return page;
  }

  // TOC は chem と同じ「科目・編・節・ページ」のタブ4列。科目は kanbun。
  function parseToc(text) {
    return contentLines(text).map(function (line, i) {
      var cols = line.split('\t');
      if (cols.length !== 4 || cols[0] !== 'kanbun' || cols.some(function (c) { return !c.trim(); })) fail('TOC.txt:' + (i + 1), 'kanbun・編・節・ページのタブ4列で書きます');
      var pages = cols[3].trim().split(/\s+/);
      if (pages.some(function (id) { return !ID_RE.test(id); })) fail('TOC.txt', 'ページ id の形が違います');
      return { course: cols[0], part: cols[1], section: cols[2], pages: pages };
    });
  }
  function contentLines(text) {
    return String(text).split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s && s.charAt(0) !== '#'; });
  }
  // 化学と同じく1ブロック1行。行末だけ漢文の規約どおり LF にする。
  function serialize(pages) {
    var out = ['['];
    pages.forEach(function (p, pi) {
      var head = PAGE_KEYS.filter(function (k) { return k !== 'why' && has(p, k); }).map(function (k) { return JSON.stringify(k) + ':' + JSON.stringify(p[k]); }).join(',');
      out.push('{' + head + ',');
      out.push('"why":' + JSON.stringify(p.why) + ',');
      out.push('"blocks":[');
      p.blocks.forEach(function (b, bi) { out.push(JSON.stringify(b) + (bi < p.blocks.length - 1 ? ',' : '')); });
      out.push(']}' + (pi < pages.length - 1 ? ',' : ''));
    });
    out.push(']');
    return out.join('\n') + '\n';
  }
  return { parsePage: parsePage, parseToc: parseToc, contentLines: contentLines, serialize: serialize, inline: inline, BLOCK_SPECS: BLOCK_SPECS };
});
