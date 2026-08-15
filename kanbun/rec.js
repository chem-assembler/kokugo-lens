/*
 * rec.js — 録画モード（SNS素材の自動収録層）
 *
 * URL に ?rec=<デモID> があるときだけ動く。無ければ即 return するので、
 * 通常利用にも回帰テストにも影響しない。
 *
 * 収録ツールは chem の tools/record/record.mjs をそのまま使う（--base を差し替えるだけ）。
 * CLI が見ているのは URL パラメータ・window.__recState・クラス名の3つだけで、
 * これが「レンズ共通規約」の実体。設計は chem 側 DESIGN_recording_mode.md、
 * 国語への移し方は docs/PLAN_kanbun_recording.md。
 *
 * パラメータ（レンズ共通）:
 *   rec     デモID（demos.json の id）                     必須
 *   format  wide | short（short = 縦型9:16向け）           既定 wide
 *   speed   再生速度倍率（0.25〜4）                        既定 1
 *   cursor  mouse | touch | none                           既定 touch
 *   caption 1 | 0                                          既定 1
 *   delay   ロード完了から再生開始までの猶予 ms            既定 1000
 *
 * 台本のアクション（漢文用の8種。座標は1つも使わない）:
 *   {type:'wait',   ms}                 待つ
 *   {type:'cell',   i}                  i 番目の字をタップ
 *   {type:'read',   from, count, pause} 正しい読み順に沿ってタップ（L1用・既定は全部）
 *   {type:'mark',   i, key}             字を選んで訓点を打つ（key は re / 1-1〜1-3 / 2-1〜2-3 / erase）
 *   {type:'choice', n}                  L2 の選択肢を n 番目（1始まり）
 *   {type:'okuri',  i, value}           L4 の送り仮名を選ぶ（'' は「（なし）」）
 *   {type:'button', selector}           任意のボタンを押す
 *   {type:'scroll', selector}           要素が見えるところまで送る
 *
 * chem の run（実行の完了待ち）に当たるものは要らない。誤答アニメの完走は
 * 600ms 固定 × 手数なので wait で足りる（?speed= はアニメには効かない。
 * game.js の setInterval が固定値のため。docs/PLAN_kanbun_recording.md §4-3）。
 */
(function(){
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const demoId = params.get('rec');
  if (!demoId) return;

  window.__recState = 'loading';
  // 操作の発生時刻。収録ツールが効果音を置く位置に使う
  window.__recEvents = [];
  window.__recOnAction = type => window.__recEvents.push({ t: Date.now(), type });

  // クリーン画面はスクリプト評価の時点で立てる（ヘッダー等の映り込みを防ぐ）
  document.documentElement.classList.add('recording');
  if (params.get('format') === 'short') document.documentElement.classList.add('rec-short');
  const cursorKind = params.get('cursor') || 'touch';
  if (cursorKind === 'none') document.documentElement.classList.add('rec-no-cursor');
  if (params.get('caption') === '0') document.documentElement.classList.add('rec-no-caption');

  const speed = Math.max(0.25, Math.min(4, parseFloat(params.get('speed')) || 1));
  const delay = Math.max(0, parseInt(params.get('delay'), 10) || 1000);

  class RecPlayer {
    constructor(app, speedScale){
      this.app = app;
      this.speed = speedScale;
      this.buildOverlay();
    }

    // ---- 画面演出 --------------------------------------------------------

    buildOverlay(){
      const ov = document.createElement('div');
      ov.id = 'rec-overlay';
      const cursor = document.createElement('div');
      cursor.id = 'rec-cursor';
      if (cursorKind === 'touch') cursor.classList.add('touch');
      const caption = document.createElement('div');
      caption.id = 'rec-caption';
      // 最初の字幕が来るまでは出さない。付けておかないと、演技が始まるまでの
      // 1〜2秒のあいだ「文字の無い黒帯」が映る（v54 の実収録で見つけた）
      caption.className = 'empty';
      ov.appendChild(cursor);
      ov.appendChild(caption);
      document.body.appendChild(ov);
      this.cursorEl = cursor;
      this.captionEl = caption;
    }

    setCaption(text){
      if (!this.captionEl) return;
      this.captionEl.textContent = text || '';
      this.captionEl.classList.toggle('empty', !text);
    }

    pulse(){
      if (!this.cursorEl) return;
      this.cursorEl.animate(
        [{ boxShadow: '0 0 0 0 rgba(179,65,14,0.9)' },
         { boxShadow: '0 0 0 26px rgba(179,65,14,0)' }],
        { duration: 450 });
    }

    /**
     * 要素を画面の中央付近まで運ぶ。
     * scroll-behavior: smooth に頼らず自前で補間する（収録環境では
     * アニメーションが走らず、座標がずれたままクリックすることがある）
     */
    async ensureVisible(el){
      for (let p = el; p && p !== document.body; p = p.parentElement){
        if (getComputedStyle(p).position === 'fixed') return;
      }
      const r = el.getBoundingClientRect();
      if (r.top >= 8 && r.bottom <= window.innerHeight - 8) return;
      await this.scrollBySmooth(r.top + r.height / 2 - window.innerHeight / 2);
    }

    scrollBySmooth(dy, ms = 340){
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const from = window.scrollY;
      const to = Math.max(0, Math.min(max, from + dy));
      if (Math.abs(to - from) < 2) return Promise.resolve();
      const dur = Math.max(1, ms / this.speed);
      const t0 = performance.now();
      return new Promise(resolve => {
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / dur);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          window.scrollTo(0, from + (to - from) * e);
          if (p < 1) requestAnimationFrame(tick); else resolve();
        };
        tick();
      });
    }

    async moveCursor(el, durationMs = 350){
      if (!this.cursorEl) return;
      const r = el.getBoundingClientRect();
      const ms = durationMs / this.speed;
      this.cursorEl.style.transition = 'left ' + ms + 'ms ease, top ' + ms + 'ms ease';
      this.cursorEl.style.left = (r.left + r.width / 2) + 'px';
      this.cursorEl.style.top = (r.top + r.height / 2) + 'px';
      await this.sleep(durationMs + 40);
    }

    sleep(ms){
      if (ms <= 0) return Promise.resolve();
      return new Promise(r => setTimeout(r, ms / this.speed));
    }

    // ---- 操作 ------------------------------------------------------------

    /** 要素まで画面を送り、カーソルを運んでからタップする */
    async tap(el, after = 450){
      await this.ensureVisible(el);
      await this.moveCursor(el);
      this.pulse();
      el.click();
      await this.sleep(after);
    }

    query(selector){
      const el = document.querySelector(selector);
      if (!el) throw new Error('要素が見つかりません: ' + selector);
      return el;
    }

    cell(i){
      const el = document.querySelector('#sentence .cell[data-i="' + i + '"]');
      if (!el) throw new Error('字が見つかりません: ' + i);
      return el;
    }

    /** 訓点パレットのボタン。key は index.html の data-mark の実値 */
    markKey(key){
      const el = document.querySelector('#palette .keys button[data-mark="' + key + '"]');
      if (!el) throw new Error('訓点のキーが見つかりません: ' + key);
      return el;
    }

    async doAction(a){
      if (window.__recOnAction) window.__recOnAction(a.type);
      switch (a.type){
        case 'wait':
          await this.sleep(a.ms || 500);
          break;
        case 'cell':
          await this.tap(this.cell(a.i));
          break;
        case 'read': {
          // 正しい読み順に沿ってタップする（L1）。再読文字は order に2回出るので、
          // 同じ字を自然に2回押すことになる
          const ord = this.app.problem.order;
          const from = a.from || 0;
          const to = (a.count == null) ? ord.length : Math.min(ord.length, from + a.count);
          for (let k = from; k < to; k++) await this.tap(this.cell(ord[k]), a.pause || 420);
          break;
        }
        case 'mark':
          await this.tap(this.cell(a.i), 260);
          await this.tap(this.markKey(a.key));
          break;
        case 'choice': {
          const btns = document.querySelectorAll('#choices .keys button');
          const el = btns[(a.n || 1) - 1];
          if (!el) throw new Error('選択肢が見つかりません: ' + a.n);
          await this.tap(el);
          break;
        }
        case 'okuri': {
          await this.tap(this.cell(a.i), 260);
          const want = (a.value === '') ? '（なし）' : a.value;
          const btns = [...document.querySelectorAll('#okuri-panel .keys button')];
          const el = btns.find(b => b.textContent === want);
          if (!el) throw new Error('送り仮名の候補が見つかりません: ' + want
            + '（候補: ' + btns.map(b => b.textContent).join('/') + '）');
          await this.tap(el);
          break;
        }
        case 'button':
          await this.tap(this.query(a.selector));
          break;
        case 'scroll':
          await this.ensureVisible(this.query(a.selector));
          await this.sleep(300);
          break;
        default:
          throw new Error('未知のアクション: ' + a.type);
      }
    }

    // ---- 開始状態 --------------------------------------------------------

    /**
     * 台本の state を適用する。{ problem, mode, marks, showYomi }
     * marks は「演技を始める前に打っておく訓点」＝頭出し。
     * ここだけはカーソルを動かさず即座に当てる（尺に入れない操作なので）
     */
    applyState(state){
      if (!state) return;
      const app = this.app;
      if (state.mode) app.setMode(state.mode);
      if (state.problem) app.loadProblemById(state.problem);
      if (state.showYomi !== undefined) app.setShowYomi(!!state.showYomi);
      Object.keys(state.marks || {}).forEach(i => {
        this.cell(i).click();
        this.markKey(state.marks[i]).click();
        this.cell(i).click();       // 選択を外して、演技の始めに枠が残らないようにする
      });
    }

    async play(demo){
      this.applyState(demo.state);
      await this.sleep(400);
      for (const step of demo.steps || []){
        this.setCaption(step.caption);
        for (const a of step.actions || []) await this.doAction(a);
        await this.sleep(step.hold || 1100);   // 字幕を読む時間
      }
    }
  }

  async function start(){
    // アプリの初期化（texts.json の fetch 完了）を待つ
    while (!(window.kanbunApp && window.kanbunApp.ready)){
      await new Promise(r => setTimeout(r, 100));
    }
    const app = window.kanbunApp;

    let demos = [];
    try {
      const res = await fetch(new URL('demos.json?v=54', window.location.href).href, { cache: 'no-cache' });
      if (res.ok) demos = await res.json();
    } catch (e){
      console.warn('[rec] demos.json のロードに失敗:', e);
    }
    const demo = demos.find(d => d.id === demoId && d.steps);
    if (!demo){
      console.error('[rec] demo not found: ' + demoId);
      window.__recState = 'error';
      return;
    }

    const player = new RecPlayer(app, speed);
    await new Promise(r => setTimeout(r, delay));
    window.__recState = 'playing';
    console.log('[rec] playing ' + demoId);
    try {
      await player.play(demo);
      window.__recState = 'done';
      console.log('[rec] done ' + demoId);
    } catch (e){
      console.error('[rec] error:', e);
      window.__recState = 'error';
    }
  }

  start();
})();
