# 国語レンズ（返り点でみる漢文）に録画モードを入れる — 調査結果と手順書

作成: 2026-08-12 ／ 調査のみ（コードは1行も変更していない）
対象: `C:/Users/maequ/マイドライブ/Antigravity/KokugoLens/kanbun/`

**この文書の読み方**: 見出しに【事実】と付いた節は、実際にコードを読んで確かめたこと
（行番号を添えてある）。【判断】は事実からの推測・提案。【未確認】はブラウザで動かして
いないため確かめられなかったこと。混ぜて書かない。

---

## 1. 収録CLIがアプリに要求しているもの【事実】

読んだファイル: `OrganicChemistryPuzzle/tools/record/record.mjs`（147行・全文）、
`mux.mjs`（先頭90行＋オプション部）、`timing.js`、`probe.mjs`、`DESIGN_recording_mode.md`。

### 1-1. 開く URL の形（record.mjs:57-58）

```
<base>?rec=<デモID>&format=<short|wide>&speed=<倍率>&caption=<0|1>&cursor=<touch|mouse|none>&delay=1200
```

- `base` は `--base=` で差し替えられる。既定は `http://localhost:8125/assembler/`。
- **`base` に `?` を足すだけ**なので、末尾はディレクトリでもファイルでもよい。
  `--base=http://localhost:8138/kanbun/` でも `--base=http://localhost:8138/kanbun/kuho.html`
  でも成立する（ページ別に台本を持てる、ということ）。
- `delay=1200` は固定で付く（CLI から変えられない）。

### 1-2. アプリが満たすべき約束（これが「受け口」の正体）

| 何 | どこで要求されるか | 満たさないとどうなるか |
|---|---|---|
| `window.__recState` を `'done'`（または `'error'`）にする | record.mjs:91-94 `waitForFunction`・timeout 180秒 | 180秒で例外。動画は残らない |
| `state !== 'done'` なら異常終了 | record.mjs:146 `process.exit(2)` | mux へ進まない |
| `window.__recEvents` = `[{t: Date.now(), type}]` | record.mjs:99・119-124 | 無くても空配列で通る（SE を置く位置が出ないだけ） |
| `console.log('[rec] …')` | record.mjs:86 | ログに出ないだけ。必須ではない |
| **`window.game` を定義しない**（定義するなら `computeMolecularFormula()` を持つこと） | record.mjs:97 `window.game ? window.game.computeMolecularFormula() : null` | `page.evaluate` の中で TypeError。**動画を撮り終えたあとに落ちる** |
| `#compound-name` は無くてよい | record.mjs:98（`|| {}` で保護済み） | — |

**`window.game` の件は国語にとって実害のある地雷**。`kanbun/game.js` は現在いっさい
グローバルを作らない IIFE（game.js:7 `(function(){` 〜 678 `})();`）なので今は安全だが、
録画用の受け口を足すときに **`window.game` という名前を選んではいけない**。
`window.kanbunApp` のような別名にする。

### 1-3. 収録の画面サイズ（record.mjs:44-55, 75-82）

- `short` = **810×1440 CSS px**、`hasTouch: true`、`isMobile: true`、`deviceScaleFactor: 1`
- `wide` = 1920×1080
- 810 という数字は **chem のモバイル判定（max-width: 899px）を下回る最大値**として選ばれている。
  最終的な 1080×1920 への拡大は `mux.mjs --size=1080x1920`（lanczos）で行う。
- **CLI から viewport を変える口は無い**。つまりアプリ側の CSS が 810px 幅で
  望みの配置になっていなければならない。→ 国語では問題になる。§4-1。

### 1-4. 収録が吐くもの（record.mjs:108-141）

- `<out>/<demo>-<format>.webm`（`--out` 既定 `video-scripts/out`。**cwd 基準**）
- `<demo>-<format>.events.json` … `__recEvents` を収録開始からの秒に直したもの
- `<demo>-<format>.recinfo.json` … **cwd の `assembler/index.html` から版を読む**（record.mjs:136）

**既知の誤り**: 国語のアプリを撮っても recinfo.json には chem の版が入る。
`--base` を見ていないため。実害は「在庫の版が古いかを `tools/videos.js` で見られない」だけ。
chem 側 CLI の改修が要るので、今回は **手順書に注意として書くにとどめる**（chem は別レーンが作業中）。

### 1-5. 実行の前提

- `record.mjs` は **chem リポジトリのルートから実行する**（Playwright は `tools/record/node_modules` にある）。
- 静的サーバーは対象リポジトリ側で立てる（国語なら KokugoLens ルートで `python -m http.server 8138`）。
- `mux.mjs` の ffmpeg は Playwright 同梱ではなく `pip install imageio-ffmpeg` のフルビルドを使う（mux.mjs:30-53）。
- **chem / InfoLens で既に動いている環境なので、新規セットアップは不要**。

---

## 2. 情報レンズ（InfoLens）がどう受けたか【事実】

読んだファイル: `InfoLens/docs/NEXT_dncl_recording.md`、`dncl/rec.js`（374行・全文）、
`dncl/demos.json`、`dncl/verify_demos.js`、`dncl/style.css` の録画ブロック（1622-1740 付近）、
`dncl/index.html` の script タグ、`git log -S "window.dnclApp"`。

### 2-1. 足したもの（4点だけ）

| ファイル | 中身 | 規模 |
|---|---|---|
| `dncl/rec.js` **新規** | `?rec=` があるときだけ動く自動再生層。パラメータ解釈・`__recState` 管理・クラス付与・**自前の最小再生器**（`RecPlayer`） | 374行 |
| `dncl/demos.json` **新規** | 台本4本 | 242行 |
| `dncl/verify_demos.js` **新規** | 台本↔問題データの機械照合（ブラウザ不要） | 176行 |
| `dncl/style.css` **追記** | `.recording` のクリーン画面＋`#rec-overlay` / `#rec-cursor` / `#rec-caption` / `.rec-short` | 約120行 |
| `dncl/index.html` **追記** | `<script src="rec.js"></script>` 1行（279行目・最後） | 1行 |

**`dncl/app.js` には手を入れていない**。`window.dnclApp = new DNCLApp()`（app.js:1505）は
`git log -S` で確かめたところ **ブランド再編のコミット de60f40 で既に入っていた**もので、
録画のために足したものではない。rec.js はその既存グローバルの内部
（`switchMode` / `loadProblem` / `handleCardTap` / `adjustIndent` / `traceResults` /
`currentStepIndex` / `isPlaying` / `playbackSpeed`）を直接叩いている。

→ **国語との差はここ**。国語の `game.js` はグローバルを一切公開していないので、
InfoLens が「ただで持っていたもの」を国語は自分で足す必要がある。§5-3。

### 2-2. 共通規約として実装した点（rec.js:38-55）

- `?rec=` が無ければ **即 return**（通常利用・回帰テストに影響ゼロ）
- `documentElement` に `.recording` を付ける（**スクリプト評価の時点で**。ヘッダーの映り込み防止）
- `format=short` → `.rec-short` / `cursor=none` → `.rec-no-cursor` / `caption=0` → `.rec-no-caption`
- `speed` は 0.25〜4 にクランプ、`delay` 既定1000
- `__recState` を `loading → playing → done|error`、`__recEvents` / `__recOnAction(type)`

### 2-3. 自前再生器のアクション（9種・rec.js:200-260）

`wait` / `card` / `indent` / `click(selector)` / `select(selector,value)` /
`step(times,pause)` / `speed(ms)` / `run(stall)` / `scroll(selector)`。
**座標は1つも使っていない**（すべてカードID かセレクタ）。

台本の `state` は `{mode, problem, difficulty, place:[カードID…]}`。
`place` は「演技前にエディタへ置いておくカード」＝頭出し。台本直下の `showPreview: true` で
隠しペインを出す。

### 2-4. 実装で判明したこと（記録に残っている）

- `run` の打ち切りは**経過時間ではなく「進まなくなったら」**で見る（rec.js:268-289）
- 字幕位置を vh で決めると実行シートとぶつかる → **実測値を `--rec-sheet-h` に流し込み**、CSS が追従（rec.js:89-96）
- **`scroll-behavior: smooth` に頼らない**（収録環境でアニメが走らず座標がずれる）→ 自前補間（rec.js:144-160）
- **`position: fixed` の中の要素はスクロール対象から外す**（rec.js:134-136）
- クリーン画面で消したもの: header / footer / ガイド / 難易度タブ / 速度スライダ / 答えを見る /
  リセット / 解説 / プレビュー、空のトレイ枠

---

## 3. 化学と情報で作りが違う点と、その理由【事実＋判断】

|  | 化学（assembler） | 情報（dncl） |
|---|---|---|
| 描画の土台 | SVG キャンバス | DOM（カード） |
| 再生エンジン | **既存の TutorialPlayer を駆動するだけ**（rec.js は196行の薄い層） | **rec.js の中に自前の最小再生器**（374行） |
| アクションDSL | 14種・**SVG 論理座標ベース**（`{type:'click', x:420, y:294}`） | 9種・**セレクタ／IDベース**（座標ゼロ） |
| 台本ファイル | `demos*.json` **8本に分割**（rec.js:33-42 の `DEMO_FILES`） | `demos.json` 1本 |
| 台本の検査 | 回帰テスト（tests.js の N2）＋ `probe.mjs`（下見） | `verify_demos.js`（node） |

**理由（判断）**:

1. **エンジンの差は「既存資産があったか」だけ**。chem にはチュートリアル機構
   （ゴーストカーソル・実 PointerEvent・字幕・14種DSL）が先にあったので、設計書 §1 が
   「新しい再生エンジンは作らない」と決めた。DNCL には無かったので書いた。
   `NEXT_dncl_recording.md` にもそう書いてある。
2. **DSL の差は描画の土台に由来する**。SVG キャンバスは「盤面のどこを押したか」を
   座標でしか表せない（原子は動的に生成され、安定した DOM セレクタが無い）。
   DOM アプリはカードID とセレクタで指せるので座標が要らない。
   結果として `probe.mjs`（「クリックした座標に原子が落ちない」問題の下見ツール）は
   **chem 固有の道具**になっていて、DOM アプリには要らない。
3. **台本の分割は技術ではなく運用の都合**。rec.js:33-42 のコメントに
   「1つの demos.json に全レーンが末尾追記して毎回コンフリクトする」と理由が書いてある。
   InfoLens は1レーンなので1本のまま。
4. **共通しているのは URL パラメータ・`__recState`・クラス名の3つだけ**。
   これがレンズ共通規約の実体で、`record.mjs` / `mux.mjs` はこの3つしか見ていない。
   だから InfoLens は CLI を1行も触らずに済んだ。国語も同じにできる。

---

## 4. 国語レンズに移すときの差分【事実＋判断＋未確認】

読んだファイル: `kanbun/index.html`（273行・全文）、`kanbun/game.js`（678行・全文）、
`kanbun/tests.js`（版検査の節）、`kanbun/kanbun.js` の export、`kanbun/texts.json`（node で集計）、
`kudashi.js` / `kuho.js` のグローバル有無。

### 4-1. **縦書きそのものは録画に影響しない。効くのはブレークポイント**【事実】

縦書きが平気な理由:
- `writing-mode: vertical-rl` が掛かっているのは **`#stage` だけ**（index.html:64-72）。
  `body` は既定の横書きなので、`position: fixed` のカーソル／字幕オーバーレイは
  InfoLens とまったく同じに置ける。
- `getBoundingClientRect()` は writing-mode に関係なくビューポート座標を返す。
  InfoLens の `moveCursor` / `ensureVisible` の計算はそのまま使える。

効くのはこちら:

| ブレークポイント | 810px 幅のとき |
|---|---|
| InfoLens `@media (max-width: 992px)` | **当たる** → 自動でモバイル1列配置になる |
| 漢文 `@media (max-width: 700px)`（index.html:173） | **当たらない** → PC の2カラムのまま |

`main` は `flex-wrap: wrap`、`#stage` が `flex: 1 1 24em`、`#side` が `flex: 1 1 18em`。
810px から padding 2em を引いた約778px に対し、基準幅の合計は 24em+18em+gap ≒ 688px なので
**折り返さず横に並ぶ**。さらに `#stage` は `max-height: 34em`（≒544px）で頭打ちなので、
**1440px の縦に対して下 800px 前後が空の紙になる**（計算値。実収録での目視は【未確認】）。

→ **`.rec-short` に縦型レイアウトの上書きを書く**のが正しい対処。
`@media (max-width: 700px)` の中身（`main { flex-direction: column }` /
`#stage { max-height: none; width: 100% }` / `#side { max-width: none }`）を
`.rec-short` セレクタで再掲する。CLI 側は触らない。

### 4-2. CSS の置き場所が違う【事実】

`kanbun/` に **`style.css` が無い**。全ページ、HTML の `<style>` に直書き（index.html:7-178）。
→ `.recording` / `#rec-overlay` / `#rec-cursor` / `#rec-caption` / `.rec-short` は
**`index.html` の `<style>` の末尾に足す**。InfoLens のように別ファイルへは書けない。

### 4-3. 誤答アニメ（SVG）で気をつける2点【事実】

`game.js` の `playOrder`（567-610）:

- **`stageRect` を再生開始時に1回だけ取る**（572行）。以降 `cellCenter` は
  毎フレーム新しいセル矩形からこの**古い** `stageRect` を引く（558-564）。
  → **再生中にページがスクロールすると矢印がずれる**。
  台本は「スクロールを終えてから判定・再生する」構成にすること。
- **`setInterval(..., 600)` が固定**（609行）。`?speed=` は rec.js 側の待ち時間にしか効かないので、
  **矢印アニメだけは `--speed=2` でも等速**。6手の再生は常に約3.6秒。尺の計算に効く。
  （speed を効かせたいなら game.js に間隔の注入口を足すことになるが、今回は不要と判断）

`#arrow-layer` の viewBox は再生のたびに実測から設定されるので、`.rec-short` でステージの
大きさを変えても矢印の座標は破綻しない（573行）。

### 4-4. `#stage` の溢れは横方向【事実＋判断】

縦書きなので、字が増えると**列が左へ伸びる**＝溢れは横方向。`#stage` に `overflow` 指定は無い。
InfoLens 流の `ensureVisible` は **ウィンドウの縦スクロール**しかしないので、
はみ出した列を画面へ運べない。
→ 対処は2つ、どちらも簡単: (a) 台本は **8字以内の問題を選ぶ**、(b) `.rec-short #stage { max-height: none }`
で縦に伸ばす。133問中、8字以下は十分にある（§7の3本はすべて7字以下）。

### 4-5. 学習履歴が画面に出る【事実】

`#progress-bar`（index.html:207-210）に「学習の記録: 0 / 133 問に着手」が出る。
Playwright は毎回まっさらな context なので中身は常に 0 だが、**画に映ると格好が悪い**。
`.recording` で隠す。localStorage への書き込み自体は捨てられるので害はない。

### 4-6. 他ページも同じ構造【事実】

`kudashi.js` / `kuho.js` も IIFE でグローバルを公開していない（`window.Kanbun` を読むだけ）。
書き下し練習・句法クイズを撮るなら、同じ受け口をそれぞれに足すことになる。
**第1段は `index.html`（訓点モード）だけにする**のが妥当【判断】。

---

## 5. アプリ側に足す最小の受け口【提案】

**新規3ファイル・既存3ファイルに追記＝合計6か所**。

### 5-1. `kanbun/rec.js`（新規・約300〜350行）

`InfoLens/dncl/rec.js` を土台にする。骨組みはそのまま流用でき、
差し替えるのは `RecPlayer` の `doAction` と `applyState` だけ。

流用できる部分（ほぼ無改造）:
- パラメータ解釈・クラス付与・`__recState` / `__recEvents`（rec.js:38-55）
- `buildOverlay` / `setCaption` / `pulse` / `moveCursor` / `sleep` / `tap` / `scrollBySmooth`
- `play(demo)` のループ（caption → actions → hold）
- `start()` の「アプリの初期化を待つ → demos.json を fetch → 見つからなければ error」

書き直す部分:
- `syncSheetOffset` / `visibleBottom`（DNCL の実行シート専用）は**削除**。漢文に下部シートは無い
- `doAction` を漢文用に。提案する **8種**:

| type | 意味 | 実装 |
|---|---|---|
| `wait {ms}` | 待つ | 共通 |
| `cell {i}` | 字をタップ | `#sentence .cell[data-i="i"]` を `tap` |
| `read {count}` | **正しい読み順に count 手ぶんタップ**（L1用・省略で全部） | `app.problem.order` を順に `tap`。再読文字は order に2回出るので自然に2回押せる |
| `mark {i, key}` | 字を選んで訓点を打つ | `cell(i)` → `#palette .keys button[data-mark="<key>"]` を `tap`。key は `re` / `1-1`〜`1-3` / `2-1`〜`2-3` / `erase`（index.html:236-243 の実値） |
| `choice {n}` | L2 の選択肢 n 番目 | `#choices .keys button:nth-child(n)` |
| `okuri {i, value}` | L4 の送り仮名 | `cell(i)` → `#okuri-panel .keys button` からテキスト一致で選ぶ |
| `button {selector}` | 任意のボタン | `#btn-grade` / `#btn-answer` / `#btn-yomi` / `#btn-replay` / `#btn-replay-correct` |
| `scroll {selector}` | 見える位置まで送る | 共通（自前補間版） |

矢印アニメの完走待ちは `wait` で足りる（600ms × 手数 ＋ 余裕）。
`run` に相当する「終わるまで待つ」は不要【判断】。

### 5-2. `kanbun/demos.json`（新規）

§6 参照。

### 5-3. `kanbun/game.js`（追記・**ここが InfoLens との最大の差**）

**なぜ必要か【事実】**: `#problem-select` の `option.value` は
**`texts.json` を難度順に並べ替えたあとの配列添字**（game.js:80-87）で、`option` に問題ID は
入っていない。つまり **DOM だけでは「百聞不如一見を開く」ことができない**。
問題が増えれば添字は動くので、台本に添字を書くのは論外。

**足すもの（IIFE の末尾に1か所）**:

```js
// 録画モード（rec.js）の受け口。?rec= が無くても定義してよい（副作用なし）
window.kanbunApp = {
  get ready(){ return problems.length > 0; },
  get problems(){ return problems; },
  get problem(){ return problem; },
  get mode(){ return mode; },
  loadProblemById(id){
    const i = problems.findIndex(p => p.id === id);
    if (i < 0) throw new Error('問題が見つかりません: ' + id);
    document.getElementById('problem-select').value = String(i);
    loadProblem(i);
  },
  setMode(m){
    const sel = document.getElementById('mode-select');
    sel.value = m;
    sel.dispatchEvent(new Event('change'));
  },
  setShowYomi(on){ if (showYomi !== on) document.getElementById('btn-yomi').click(); }
};
```

**注意**: 名前を `window.game` にしない（§1-2 の地雷）。

これ以外の操作（セル・パレット・判定・再生）は **DOM のセレクタで足りる**ので公開しない
＝ 受け口は最小の6メンバーで済む。

### 5-4. `kanbun/index.html`（追記2か所）

1. `<style>` の末尾に録画用 CSS（§4-1・§4-2・§4-5）。骨子:
   - `.recording header, .recording footer, .recording #progress-bar { display: none !important; }`
   - `#toolbar` は **`label`（問題・モードのセレクト）だけ隠し、ボタンは残す**【判断・要目視】。
     全部隠すと `#btn-grade` が矩形ゼロになり、ゴーストカーソルが左上へ飛ぶ
   - `#rec-overlay` / `#rec-cursor` / `#rec-caption`（InfoLens からほぼそのまま。色は
     国語の `--accent: #b3410e` / `--ink: #322a20` に合わせる）
   - `.rec-short` で縦1列レイアウト＋字を大きく
2. `</body>` 直前に `<script src="rec.js?v=NN"></script>`（game.js の**後**）

### 5-5. `kanbun/verify_demos.js`（新規・node）

`InfoLens/dncl/verify_demos.js` の思想をそのまま移す。漢文では**もっと強い検査ができる**
（`kanbun.js` が node で読める＝`module.exports` 済み。kanbun.js 末尾で確認）:

- `demo.id` の重複・`steps` 空
- `state.problem` が `texts.json` に実在するか
- `state.mode` が L1/L2/L3/L4/L6 のいずれか
- `cell` / `mark` / `okuri` の `i` が `tokens.length` 未満か
- `mark.key` がパレットの実値（`re`/`1-1`…/`erase`）か
- `button` / `scroll` の `selector` が `index.html` に実在するか
- **台本の `mark` を積み上げて `K.grade()` に通し、狙いどおり `ok`/`wrong` になるか**
  （＝ InfoLens の「組み上がりが模範解答と一致するか」に当たる。**誤答デモは
  わざと wrong になることまで検査できる**のが漢文の利点）

### 5-6. `kanbun/tests.js`（1行追記）

tests.js:373 の版ペア表に `['rec.js', 'index.html']` を足す。
これで `rec.js` の中の `demos.json?v=NN` が HTML の版とずれたら `node kanbun/tests.js` が落ちる
（README の規約どおり、`.js` の中の `?v=` は HTML だけ見る検査の死角なので、この一行が要る）。

---

## 6. 台本の置き場所と形式

### 6-1. 化学と情報の実際【事実】

| | 化学 | 情報 |
|---|---|---|
| 台本 | `assembler/demos.json` ＋ `demos-{isomer,fg,reaction,stereo,longform,quiz,build}.json` の**8本**（rec.js:33-42。ファイルが無くても 404 を無視して続行） | `dncl/demos.json` **1本**・4台本 |
| ナレーション | `video-scripts/narration/<ID>.json` = `[{name, text}]` の行リスト。音声は `video-scripts/audio/<ID>/<name>.wav` | 無し（無音で撮っている） |
| メタ | `video-scripts/meta/<ID>.json`（title / credits など。mux が出力ファイル名に使う） | 無し |
| 出力 | `video-scripts/out/`（**chem の .gitignore 済み**） | 同じ（chem のツリーに落ちる） |

### 6-2. 国語での案【判断】

- **`kanbun/demos.json` 1本から始める**。分割はレーンが並行し始めてから、chem の
  `DEMO_FILES` 方式（rec.js に配列を持って 404 を無視）に倣えばよい。
- **動画の出力先は chem の `video-scripts/out/` のまま**にする（InfoLens と同じ）。
  KokugoLens は GitHub Pages の**ルート配信**なので、リポジトリに動画を置くと
  そのまま公開物になってしまう。`--out` を指定しないのが正解。
- スキーマ（InfoLens 互換）:

```json
[
  {
    "id": "kaeriten-hyakubun",
    "title": "V-K1: 百聞は一見に如かず — 漢文は上から順に読まない",
    "note": "所要 25秒前後（speed=1）。L1。台本の意図と実測メモをここに書く",
    "state": { "problem": "hyakubun", "mode": "L1" },
    "steps": [
      { "caption": "この6字、上から読める？", "actions": [ { "type": "wait", "ms": 1200 } ] },
      { "caption": "正しい順はこう。", "actions": [ { "type": "read" } ], "hold": 1500 }
    ]
  }
]
```

- `state` に持たせるもの: `problem`（**問題ID**）・`mode`（L1〜L6）・
  任意で `marks`（頭出しで打っておく訓点 `{ "2": "re" }` 形式）・`showYomi`。
  chem の `readStereo` に当たる「演技前に入れる表示設定」が `showYomi`【判断】。
- ナレーションは第2段。**まず `caption` だけの無音で撮って構図と尺を固める**。
  読み上げが要るようになったら chem の `video-scripts/narration/` にそのまま相乗りできる
  （`timing.js` は `assembler/demos-build.json` 決め打ちなので、そのときは分岐が要る【事実】）。

---

## 7. 最初に撮る3本【提案】

題材は `texts.json` を node で集計して選んだ（133問・字数と訓点の実測つき）。
**共通の狙い: 30秒以内・7字以下・「返り点」の一点だけを見せる**。

### V-K1 「百聞不如一見」× L1（読む順にタップ）

- **データ**（実測）: `hyakubun`／漢書・趙充国伝／6字／`order = [0,1,4,5,3,2]`／
  訓点は `不[レ]` `如[二]` `見[一]`／書き下し「百聞は一見に如かず」
- **なぜ**: 読み順が **百→聞→一→見→如→不** と最後に2つ戻る。
  読み順バッジ 1〜6 が飛んで付き、左の列に書き下しが伸びていく画が、
  **「漢文は上から順に読まない」という一点だけ**を説明ぬきで見せる。
  誰でも知っている慣用句なので、冒頭でフックの説明が要らない（Shorts は最初の1秒が勝負）。
- **台本の骨**: `wait` →「上から読むと『百聞不如一見』」→ `read` で6手 →
  書き下しを見せて `hold`。**操作はタップだけ＝失敗要素がほぼ無い**ので、1本目の
  実収録テストを兼ねられる。

### V-K2 「温故而知新」× L3（訓点を打つ）

- **データ**（実測）: `rongo-onko`／論語・為政／5字／`order = [1,0,4,3]`（**2 が入っていない**）／
  訓点は `温[レ]` `知[レ]`、`而` は置き字／書き下し「故きを温ねて新しきを知る」
- **なぜ**:
  1. **レ点2つだけ＝返り点の最小教材**。「打つ → 読み順が入れ替わる → 書き下しが出る」の
     因果が5字で完結する。
  2. **「而」を読まない**（order に 2 が無い）のが画で分かる。置き字は初学者が必ず驚く点で、
     短尺の「へえ」を1つ稼げる。
  3. **見ているだけでなく操作するアプリだ**と伝わる。V-K1（見る）との対で構成する。
- **台本の骨**: `mark{i:0,key:"re"}` → `mark{i:3,key:"re"}` → `button{#btn-grade}` → ○ の `hold`。

### V-K3 「少年易老学難成」× L3 わざと間違える → 誤答アニメ

- **データ**（実測）: `shonen-1`／偶成（朱熹・伝）／7字／`order = [0,1,3,2,4,6,5]`／
  訓点は `易[レ]` `難[レ]`／書き下し「少年老い易く学成り難し」
- **なぜ**: **このアプリにしか無い機能**（ユーザーの誤った読み順を矢印で1字ずつ辿り、
  食い違った字で止めて赤く強調する）を見せる回。SNS では「正解を教える」より
  **「間違いが動いて見える」**ほうが強い【判断】。
  レ点が2つなので「片方を打ち忘れる」という**自然でありがちな誤答**が作れる。
  漢詩なので出典としても有名（「少年老い易く学成り難し」）。
- **注意**（§4-3 の事実から）:
  - 判定・再生の**前にスクロールを終える**（`stageRect` が古くなると矢印がずれる）
  - 矢印は 600ms 固定・`speed` に連動しない。7手なら約4秒を尺に確保する
- **台本の骨**: `mark`（片方だけ打つ）→ `button{#btn-grade}` → `wait 4500`（矢印再生）→
  キャプション「ここで読み違えた」→ `mark`（正しく打ち直す）→ `button{#btn-grade}` → ○。

### 4本目以降の候補（順位づけの根拠だけ残す）

- **再読文字**: `rongo-misei`「未知生」3字（`order = [0,2,1,0]` ＝ **同じ字に「1・4」の二重バッジ**）、
  `rongo-sugitaru`「過猶不及」4字。**最短でフックが最強**だが、「返り点」ではなく
  「二度読み」の話になるので、返り点の3本を出したあとに置く。
- **上下点の入れ子**: `mujun-1`「楚人有鬻盾与矛者」8字（下・二・一レ・上）。矛盾の話は有名だが
  8字＋4種の訓点で30秒には重い。ロング向き。
- **L6（書き下し→訓点の逆問題）**: アプリの最上級モード。単体で映えるが、
  「返り点とは何か」を知っている人向けなので4本目以降。

---

## 8. 見積もり【判断】

**1コミットに押し込まず、3つに割る**のを勧める（README の「1修正=1コミット」に沿う形で、
「受け口」「見た目」「台本」は独立して検証できるため）。

| # | 内容 | 触るファイル | 目安 | 検証 |
|---|---|---|---|---|
| C1 | 録画モードの受け口 | `rec.js`(新)・`demos.json`(新・台本1本)・`verify_demos.js`(新)・`index.html`(script＋CSS)・`game.js`(公開)・`tests.js`(版ペア1行) | **半日（3〜4時間）** | `node kanbun/tests.js` 全合格／`node kanbun/verify_demos.js` 合格／`?rec=` 無しで通常動作が無傷／実収録で `state=done` |
| C2 | `.rec-short` の縦型レイアウト | `index.html` の `<style>` のみ | 1〜2時間 | **C1 の収録フレームを目で見てから**直す。810×1440 で紙が余る問題（§4-1）の解消 |
| C3 | 台本2本目・3本目 | `demos.json` のみ | 1本あたり30分〜1時間＋収録の往復 | 実収録＋フレーム目視 |

**合計おおよそ1日**。ただし chem 側の記録（`timing.js` の冒頭コメント、`demos-build.json` の
`note`）を読むかぎり、**実装よりも「尺と字幕位置の合わせ込み」に時間が溶ける**。
最初の1本は尺を気にせず「完走すること」だけを目標にするのがよい。

**前提として新規に用意するものは無い**: Playwright も ffmpeg も chem 側に入っており、
InfoLens が同じ経路で動いている実績がある。

**実行コマンド（決定形）**:

```bash
# KokugoLens のルートで
python -m http.server 8138

# chem リポジトリのルートで
node tools/record/record.mjs --demo=kaeriten-hyakubun --format=short --base=http://localhost:8138/kanbun/
node tools/record/mux.mjs --video=video-scripts/out/kaeriten-hyakubun-short.webm \
                          --size=1080x1920 --out=video-scripts/out/V-K1.mp4
```

---

## 9. やらなくてよいこと【判断】

化学にはあるが、国語（少なくとも第1段）には要らないもの。

| 化学の機能 | 国語で不要な理由 |
|---|---|
| **`?rec=live`**（OBS 用の手動収録支援・タップ波紋・WebAudio のタップ音・`.rec-live`） | 台本で撮れる範囲しかまだ無い。手で操作して撮りたくなってから |
| **座標ベースのアクション**（`click{x,y}`・`frame`（パン/ズーム）） | 全部セレクタと `data-i` で指せる。`frame` は SVG キャンバスの構図作り用で、漢文は1画面に収まる |
| **`probe.mjs`（下見）** | 「クリックした座標に原子が落ちない」問題への対処で chem 専用（`window.game` 依存）。漢文は `verify_demos.js` が node だけで同等以上のことをやれる |
| **`demos-*.json` の複数分割** | 並行レーンのコンフリクト回避が理由。1レーンのうちは1ファイル |
| **`timing.js`（尺の実測直し）** | ナレーション音声（wav）が前提。無音・字幕だけの段階では出番が無い |
| **`readStereo` のような表示設定の宣言** | 該当なし（`showYomi` が同じ役割になるが、既定 OFF のままでよい） |
| **`--events` / `--se` の効果音合成** | `__recEvents` さえ出しておけば後から無料で乗れる。第1段では使わない |
| **回帰テストからの台本全件再生**（chem の N2） | 漢文の `tests.js` は DOM 非依存（iframe を駆動しない）。`verify_demos.js` を CLI で回すほうが構造に合う |

---

## 10. 未確認のこと（実装時に必ずブラウザで確かめる）

1. **810×1440 での実際の見え方**。§4-1 は CSS を読んだ計算値であって、目視していない。
   `.rec-short` にどれだけ上書きが要るかは1本目の収録フレームを見て決める。
2. **`isMobile: true` / `hasTouch: true` が漢文の UI に与える影響**。
   `#stage` に `:hover` 前提の表示（`.cell:hover`）があるが、操作の可否には効かないはず（未検証）。
3. **縦書きで `el.click()` と実 PointerEvent の差**。`game.js` はすべて `addEventListener('click')`
   なので `el.click()` で足りるはずだが、実収録で確かめる。
4. **長い問題での `#stage` 横溢れ**。§4-4 は「そうなるはず」であって再現していない。
   8字以下の題材を選べば当面回避できる。
5. **ゴーストカーソルの色**。InfoLens の紫（`#a78bfa`）は情報レンズの配色。
   国語の和紙色（`--paper: #faf6ec`）の上でどう見えるかは未確認。朱（`--accent: #b3410e`）系を試す。
6. **`recinfo.json` の版が chem のものになる件**（§1-4）。実害の大小は運用してみないと分からない。
