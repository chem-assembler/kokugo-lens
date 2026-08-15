# 動画の作業場（国語レンズ）

短尺動画（SNS用）の**台本メモ・ナレーション原稿・投稿文**を置く。
仕組みは化学レンズと同じで、**収録CLI は chem の `tools/record/` をそのまま使う**
（`--base` を差し替えるだけ。国語側に道具は持たない ＝ 二重帳簿を作らない）。

設計と実装の記録は `docs/PLAN_kanbun_recording.md`。SNS の方針は chem の `SNS_PLAN.md` が正。

## 何を版に入れるか

| | 版に入れる | 理由 |
|---|---|---|
| `V-K*.md` | **入れる** | 何をどう撮ったか・尺の実測・踏んだ穴。次に撮る人が読む |
| `narration/*.json` | **入れる** | 読み上げ原稿。差分で推敲の跡が追える |
| `narration/READINGS.md` | **入れる** | 誤読しやすい語の目録 |
| `meta/*.json` | **入れる** | 投稿文・ハッシュタグ・チェックリスト |
| `audio/` | **入れない** | 生成した wav と DOVA の BGM。重いうえ版に入れる意味が無い |
| `out/` | **入れない** | 収録した webm と完成 mp4 |

> **なぜ厳しく分けるか**: KokugoLens は GitHub Pages の**ルート配信**なので、
> リポジトリに置いたものは **そのまま公開物になる**。テキストは公開されて困らない
> （むしろ作り方が読めるのは良いこと）が、動画と音は配信する理由が無く、
> リポジトリを重くするだけ。`.gitignore` で機械的に止めてある。

## 音の素材

| 何 | 置き場所 | 出どころ |
|---|---|---|
| ナレーション | `audio/<ID>/*.wav` ＋ `full.wav` | VOICEVOX ずんだもん（`narrate.py` が生成） |
| BGM | `audio/bgm/のんきな日常.mp3` | DOVA-SYNDROME / Regu。**規約上クレジット不要** |
| 効果音 | `audio/se/tap.wav` | 操作のたびに鳴らす。`--events` が位置を決める |

**`VOICEVOX:ずんだもん` のクレジットは全媒体の本文に必須**（利用規約）。
`meta/*.json` の `credits` に書いておけば `mux.mjs` が投稿文へ入れる。

## 手順

```bash
# 0) 静的サーバー（KokugoLens のルートで）
python -m http.server 8151 --directory "C:/Users/maequ/マイドライブ/Antigravity/KokugoLens"

# 1) 収録（chem のルートで。--base だけ差し替える）
node tools/record/record.mjs --demo=kaeriten-hyakubun --format=short --base=http://localhost:8151/kanbun/

# 2) ナレーション（VOICEVOX を起動しておく。**KokugoLens のルートで**走らせる
#    ＝ narrate.py は CWD 基準で video-scripts/audio/<ID>/ に書き出すため）
python "../OrganicChemistryPuzzle/video-scripts/narrate.py" video-scripts/narration/V-K1.json

# 3) 仕上げ（chem のルートで。入力のパスだけ国語側を指す）
node tools/record/mux.mjs \
  --video=<KokugoLens>/video-scripts/out/kaeriten-hyakubun-short.webm \
  --audio=<KokugoLens>/video-scripts/audio/V-K1/full.wav \
  --bgm=<KokugoLens>/video-scripts/audio/bgm/のんきな日常.mp3 \
  --se=<KokugoLens>/video-scripts/audio/se/tap.wav \
  --events=<KokugoLens>/video-scripts/out/kaeriten-hyakubun-short.events.json \
  --meta=<KokugoLens>/video-scripts/meta/V-K1.json \
  --trim=auto --lead=0.3 --size=1080x1920 \
  --out=<KokugoLens>/video-scripts/out/V-K1-final.mp4
```

## 尺の合わせ方（ここに時間が溶ける）

**ナレーションを先に作り、画をそれに合わせる。** 逆にすると必ず溢れる。

`narrate.py` は行ごとの秒数と通しの合計を出す。台本（`kanbun/demos.json`）の
各ステップは**ナレーション1行と1対1**にしてあるので、
「その行の秒数 ＋ 行間の無音 0.6秒」に `hold` を合わせる。

> chem には `tools/record/timing.js`（実測から直し値を出す道具）があるが、
> **`assembler/demos*.json` 決め打ち**で、しかも**間を `wait` アクションで取る前提**。
> 国語は `hold` で取っているので、そのままでは使えない。
> 本数が増えて手で合わせるのが辛くなったら、国語版を書く。

## 既知の粗

- **`recinfo.json` に入る版番号が chem のものになる**（`record.mjs` が `--base` を見ず
  `assembler/index.html` から読むため）。国語の動画を chem の `tools/videos.js` で
  管理できないのはこのため。本数が増えたら国語側の台帳を作る
