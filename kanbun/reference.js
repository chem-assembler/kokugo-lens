/* 参考書の描画。本文は reference.json、例文は texts.json だけを正とする。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KanbunReference = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  // 生成器が出す <b> だけを通す。原稿の文字列からタグを増やさない。
  const inline = value => esc(value).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
  const anchorId = anchor => 'ref-sec-' + anchor;
  const hakubun = problem => problem.tokens.map(t => t.c + (t.p || '')).join('');
  function marksText(marks) {
    const nums = (marks || []).filter(m => !m.re).sort((a, b) => a.lv - b.lv);
    return nums.map(m => (({1:'一二三', 2:'上中下', 3:'甲乙丙', 4:'天地人'}[m.lv] || '')[m.n - 1] || '')).join('')
      + ((marks || []).some(m => m.re) ? 'レ' : '');
  }
  function referenceHref(page, anchor, context) {
    const q = new URLSearchParams({page});
    for (const key of ['from', 'p', 'mode']) if (context && context[key]) q.set(key, context[key]);
    return 'reference.html?' + q + (anchor ? '#' + anchorId(anchor) : '');
  }
  function problemHref(id, page, anchor) {
    const q = new URLSearchParams({p:id, from:'reference', page});
    if (anchor) q.set('sec', anchor);
    return 'index.html?' + q;
  }

  class ReferenceBook {
    constructor(pages, problems, types, patterns) {
      this.pages = pages;
      this.problems = problems;
      this.byProblem = new Map(problems.map(p => [p.id, p]));
      this.types = new Map((types || []).map(t => [t.id, t]));
      this.patterns = new Map((patterns || []).map(p => [p.code, p]));
      this.byCode = new Map();
      for (const page of pages) for (const section of page.blocks.filter(b => b.kind === 'section')) {
        for (const code of section.codes || []) {
          if (this.byCode.has(code)) throw new Error('参考書の節でコードが重複しています: ' + code);
          this.byCode.set(code, {page, section});
        }
      }
    }
    pageById(id) { return this.pages.find(p => p.id === id) || null; }
    sectionByCode(code) { return this.byCode.get(code) || null; }
    sectionProblems(section) {
      const codes = new Set((section.codes || []).filter(c => this.types.has(c)));
      return this.problems.filter(p => (p.kuho || []).some(c => codes.has(c)));
    }
    indexHtml(context) {
      return this.pages.map(p => '<li><a href="' + esc(referenceHref(p.id, '', context)) + '">'
        + '<span class="chapter-label">' + esc(p.group) + '</span>' + esc(p.title) + '</a></li>').join('');
    }
    tocHtml(page, context) {
      return '<nav class="section-toc" aria-label="この章の目次"><details open><summary>この章で読むこと</summary><ul>'
        + page.blocks.filter(b => b.kind === 'section').map(s => '<li><a href="'
          + esc(referenceHref(page.id, s.anchor, context)) + '">' + esc(s.title) + '</a></li>').join('')
        + '</ul></details></nav>';
    }
    exampleHtml(id, page, section) {
      const p = this.byProblem.get(id);
      if (!p) throw new Error('参考書の例文が見つかりません: ' + id);
      const cells = p.tokens.map(t => {
        const first = t.reread ? t.reread.first : t;
        const second = t.reread ? t.reread.second : null;
        const reading = (r, cls) => r ? '<span class="ref-yomi ' + cls + '">' + esc(r.yomi)
          + '</span><span class="ref-okuri ' + cls + '">' + esc(r.okuri) + '</span>' : '';
        return '<span class="ref-cell"><span class="ref-kanji">' + esc(t.c) + '</span>'
          + (t.p ? '<span class="ref-punct">' + esc(t.p) + '</span>' : '')
          + reading(first, '') + reading(second, 'second')
          + '<span class="ref-mark">' + esc(marksText(t.mark)) + '</span>'
          + (t.join ? '<span class="ref-join" title="熟語返り"></span>' : '') + '</span>';
      }).join('');
      return '<figure class="ref-example" data-example="' + esc(id) + '"><figcaption>'
        + esc(p.source.work) + (p.source.chapter ? '（' + esc(p.source.chapter) + '）' : '') + '</figcaption>'
        + '<p class="ref-hakubun"><b>白文</b> ' + esc(hakubun(p)) + '</p>'
        + '<div class="ref-kunten-scroll" role="region" aria-label="訓点を確かめる" tabindex="0">'
        + '<div class="ref-kunten">' + cells + '</div></div>'
        + '<dl><dt>書き下し</dt><dd>' + esc(p.kakikudashi) + '</dd><dt>意味</dt><dd>' + esc(p.meaning) + '</dd></dl>'
        + '<a class="practice-link" href="' + esc(problemHref(id, page.id, section && section.anchor))
        + '">この問題を解く</a></figure>';
    }
    exercisesHtml(page, section) {
      const problems = this.sectionProblems(section);
      const qa = (section.codes || []).filter(c => this.patterns.has(c));
      if (!problems.length && !qa.length) return '';
      return '<details class="section-exercises"><summary>この節の問題</summary>'
        + (problems.length ? '<ul>' + problems.map(p => '<li><a href="'
          + esc(problemHref(p.id, page.id, section.anchor)) + '">' + esc(hakubun(p))
          + '<small>' + esc(p.source.work) + '</small></a></li>').join('') + '</ul>' : '')
        + (qa.length ? '<h3>一問一答で確かめる</h3><ul>' + qa.map(code => '<li><a href="'
          + esc('../qa/?from=kanbun&code=' + encodeURIComponent(code)) + '">'
          + esc(this.patterns.get(code).knowledge || code) + '</a></li>').join('') + '</ul>' : '') + '</details>';
    }
    blockHtml(block, page, section, context) {
      switch (block.kind) {
        case 'text': return '<p>' + inline(block.text) + '</p>';
        case 'heading': return '<h3>' + inline(block.title) + '</h3>';
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          return '<' + tag + '>' + block.items.map(s => '<li>' + inline(s) + '</li>').join('') + '</' + tag + '>';
        }
        case 'table': return '<div class="ref-table-scroll" role="region" aria-label="'
          + esc(block.caption || '表を読む') + '" tabindex="0"><table>'
          + (block.caption ? '<caption>' + inline(block.caption) + '</caption>' : '')
          + '<thead><tr>' + block.head.map(s => '<th scope="col">' + inline(s) + '</th>').join('') + '</tr></thead><tbody>'
          + block.rows.map(row => '<tr>' + row.map((s, i) => '<td style="text-align:'
            + (['left', 'center', 'right'].includes((block.align || [])[i]) ? block.align[i] : 'left') + '">'
            + inline(s) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        case 'callout': return '<aside class="ref-callout tone-' + esc(block.tone) + '"><p>' + inline(block.text) + '</p></aside>';
        case 'link': return '<p class="ref-link">' + (block.soon ? inline(block.text) + '（準備中）'
          : '<a href="' + esc(referenceHref(block.to, block.sec, context)) + '">' + inline(block.text) + '</a>') + '</p>';
        case 'mistake': return '<aside class="ref-mistake"><p class="ref-wrong"><b>×</b> ' + inline(block.wrong)
          + '</p><p><b>○</b> ' + inline(block.right) + '</p>' + (block.why ? '<p>' + inline(block.why) + '</p>' : '') + '</aside>';
        case 'contrast': return '<div class="ref-contrast"><div><p>' + inline(block.left) + '</p></div><div><p>'
          + inline(block.right) + '</p></div><p class="contrast-why">' + inline(block.why) + '</p></div>';
        case 'example': return this.exampleHtml(block.id, page, section);
        default: throw new Error('参考書のブロックを描けません: ' + block.kind);
      }
    }
    pageHtml(page, context) {
      let section = null;
      let html = '<header class="chapter-heading"><p>' + esc(page.group) + '</p><h1>' + esc(page.title) + '</h1>'
        + (page.summary ? '<p>' + esc(page.summary) + '</p>' : '') + '</header>' + this.tocHtml(page, context);
      const close = () => section ? this.exercisesHtml(page, section) + '</section>' : '';
      for (const b of page.blocks) {
        if (b.kind === 'section') {
          html += close();
          section = b;
          html += '<section class="ref-section" id="' + esc(anchorId(b.anchor)) + '"><h2>' + esc(b.title) + '</h2>'
            + (b.lead ? '<p class="section-lead">' + inline(b.lead) + '</p>' : '');
        } else html += this.blockHtml(b, page, section, context);
      }
      html += close();
      const i = this.pages.indexOf(page);
      return html + '<nav class="chapter-turn" aria-label="前後の章">' + [this.pages[i - 1], this.pages[i + 1]].map((p, n) => p
        ? '<a rel="' + (n ? 'next' : 'prev') + '" href="' + esc(referenceHref(p.id, '', context)) + '">'
          + (n ? '次の章へ：' : '前の章へ：') + esc(p.title) + '</a>' : '').join('') + '</nav>';
    }
  }

  async function mount(doc, location) {
    const content = doc.getElementById('ref-content');
    const load = async url => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
      return r.json();
    };
    try {
      const [pages, texts, kuho, qa] = await Promise.all([
        load('reference.json?v=104'), load('texts.json?v=104'), load('kuho.json?v=104'), load('../qa/questions.json')
      ]);
      const book = new ReferenceBook(pages, texts.problems, kuho.types, qa.patterns);
      const params = new URLSearchParams(location.search);
      const context = {};
      for (const key of ['from', 'p', 'mode']) if (params.get(key)) context[key] = params.get(key);
      const homeQuery = new URLSearchParams(context).toString();
      doc.getElementById('ref-home').href = 'reference.html' + (homeQuery ? '?' + homeQuery : '');
      doc.getElementById('chapter-list').innerHTML = book.indexHtml(context);
      const target = book.sectionByCode(params.get('code'));
      const requested = params.get('page');
      const page = target ? target.page : book.pageById(requested);
      const notice = doc.getElementById('ref-notice');
      if ((requested && !page) || (params.get('code') && !target)) {
        notice.hidden = false;
        notice.textContent = '指定された解説が見つかりませんでした。目次から読みたい章を選んでください。';
      }
      if (page) {
        content.innerHTML = book.pageHtml(page, context);
        if (window.matchMedia('(max-width:760px)').matches) content.querySelector('.section-toc details').open = false;
        doc.title = page.title + '｜漢文の参考書｜国語レンズ';
        for (const a of doc.querySelectorAll('#chapter-list a')) {
          if (new URL(a.href).searchParams.get('page') === page.id) a.setAttribute('aria-current', 'page');
        }
      } else {
        content.innerHTML = '<h1>漢文の参考書</h1><p>読みたい章を目次から選びましょう。</p><ol class="chapter-index">'
          + book.indexHtml(context) + '</ol>';
      }
      // 問題側は型 id だけを渡す。どの章・節へ着くかは参考書側で決める。
      if (target) {
        const url = new URL(location.href);
        url.searchParams.delete('code');
        url.searchParams.set('page', target.page.id);
        url.hash = anchorId(target.section.anchor);
        history.replaceState(null, '', url);
      }
      const scrollToSection = () => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const el = doc.getElementById(id);
        if (el) el.scrollIntoView();
      };
      scrollToSection();
      window.addEventListener('hashchange', scrollToSection);
      if (context.from === 'kanbun' && book.byProblem.has(context.p)) {
        const band = doc.getElementById('ref-back');
        const q = new URLSearchParams({p:context.p});
        if (['L1', 'L2', 'L3', 'L4', 'L6'].includes(context.mode)) q.set('mode', context.mode);
        band.hidden = false;
        band.innerHTML = '<span>訓点の問題から来ました。</span> <a href="' + esc('index.html?' + q) + '">問題に戻る</a>';
      }
      const result = {book, page};
      window.kanbunReference = result;
      doc.documentElement.dataset.referenceReady = 'true';
      return result;
    } catch (error) {
      content.textContent = '参考書を読み込めませんでした。ページを開き直してみてください。';
      doc.documentElement.dataset.referenceReady = 'error';
      console.error(error);
      return null;
    }
  }
  if (typeof document !== 'undefined' && document.getElementById('ref-content')) mount(document, window.location);
  return {ReferenceBook, anchorId, hakubun, marksText, referenceHref, problemHref, inline};
});
