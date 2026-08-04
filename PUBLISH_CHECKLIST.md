# SchoolLenz アプリ公開チェックリスト（GitHub Pages ＋ 独自サブドメイン）

最終確認日: 2026-08-05 ／ 確認方法: 実リポジトリの `git remote -v`・`CNAME`、GitHub API（`gh api .../pages`）、
実 DNS 照会（`nslookup ... 8.8.8.8`）、GitHub Docs と Squarespace ヘルプの現行ページ。
**このファイルに書いた値は推測ではなく、上の方法で実在を確認したもの**（判断が要る箇所は「要判断」と明示）。

---

## 0. 先に読む「現状の訂正」

作業指示では InfoLens を「未公開その1」としていたが、**実機確認の結果 InfoLens はすでに公開済み**だった。

| 確認項目 | 実際の状態 |
|---|---|
| `git remote -v` | `https://github.com/chem-assembler/info-lens.git`（設定済み） |
| ローカルの push 状態 | `main` は `origin/main` と一致（未 push なし） |
| `CNAME` ファイル | あり・中身は `info.schoollenz.com` |
| GitHub Pages | `status: built` / `source: main /` / `cname: info.schoollenz.com` |
| HTTPS 証明書 | `approved`（有効期限 2026-10-27）・`https_enforced: true` |
| DNS | `info.schoollenz.com` → CNAME → `chem-assembler.github.io`（解決OK） |
| HTTP 応答 | `https://info.schoollenz.com/` が `200 OK`（`Server: GitHub.com`） |

つまり **今回あらためて公開作業が要るのは KokugoLens だけ**。
ただし「info を先に通し、同じ手順で koku を通す」という方針そのものは有効なので、
本チェックリストは **info を「すでに通った実例＝答え合わせ用の見本」として据え、koku を同じ形でなぞる**構成にした。
koku の手順で迷ったら、必ず info の実際の値（3章の表）と見比べること。

---

## 1. 全体像

### 何をどの順でやるか

```
[A] リポジトリ名を決める（要判断・ユーザー）
      ↓
[B] DNS レコードを先に追加する（Squarespace・ユーザー操作）★これだけは Claude が代行できない
      ↓
[C] GitHub リポジトリを作る（Claude が gh で代行可）
      ↓
[D] CNAME ファイルを置いて push（Claude 作業）
      ↓
[E] GitHub Pages を有効化＋カスタムドメイン設定（Claude が API で代行可 / UI 手順も併記）
      ↓
[F] DNS チェック通過を待って Enforce HTTPS を入れる（同上）
      ↓
[G] 動作確認（Claude 作業）
```

### 順序の理由（重要）

- **DNS（B）を GitHub 側の設定（E）より先に入れる。**
  カスタムドメインを入力した瞬間に GitHub が DNS チェックを走らせ、そこを通ってはじめて
  Let's Encrypt の証明書発行が始まる。DNS が未設定のまま E をやると、チェックに落ちて
  Enforce HTTPS がグレーアウトしたまま待たされ、結局 DNS を入れてから「解除→再設定」で
  やり直すはめになる。**先に DNS を入れておけば、E→F がほぼ待ち時間なしで通る。**
- **info→koku の順**は今回は実質「info の完成形を見本にして koku を作る」の意味になる。
  info の Pages 設定値・DNS レコードの形が正解なので、koku はそれを1文字だけ変えて再現する。

### 「ユーザーが触らないといけない」のはどこか

Claude は GitHub 側は `gh` CLI（認証済み・アカウント `o9o4oo78o42`、スコープ `repo` あり）で代行できるが、
**Squarespace の DNS 管理画面にはアクセス手段がない**。
したがって **必須のユーザー操作は「1つの DNS レコードを追加する」だけ**（＋リポジトリ名の判断1件）。
GitHub 側も自分で画面を触りたい場合のために、UI 手順を全ステップ併記してある。

---

## 2. 共通手順

チェックボックスは koku 用。info は「済」として横に実際の値を書いてある。

### [A] リポジトリ名を決める

- [ ] **[ユーザー判断]** GitHub のリポジトリ名を決める。
  - 組織アカウントは **`chem-assembler`**（GitHub API で `type: Organization` を確認済み）。
  - 命名の前例:
    - chem … `chem-assembler.github.io`（**組織の Pages サイト用の特別な名前**。1組織に1つだけ。すでに chem が使用中なので koku では使えない）
    - info … `info-lens`（プロジェクトリポジトリ。ハイフン区切り・小文字）
  - **推奨は `kokugo-lens`**（info-lens と同じ「教科の英字名 + `-lens`」の形）。
  - 2026-08-05 時点で `kokugo-lens` / `koku-lens` / `kokugolens` の3つとも **未使用（作成可能）** を確認済み。
  - 決めたら 3章の表の「（要判断）」を実際の名前で置き換えてから先へ進む。

> 補足: プロジェクトリポジトリでも、カスタムドメインを設定すればサイトは
> `https://koku.schoollenz.com/` の**ルート**で配信される（`/kokugo-lens/` は付かない）。
> KokugoLens の `index.html` は `href="kanbun/"` の相対リンクなのでそのまま動く。リンクの書き換えは不要。

---

### [B] Squarespace に DNS レコードを追加する ★ユーザー必須

- [ ] **[ユーザー操作]** ブラウザで以下をたどる。

  1. `https://account.squarespace.com/domains` を開く（Squarespace アカウントでログイン）
  2. **`schoollenz.com`** をクリック
  3. 左（サイドパネル）の **「DNS」** をクリック → **「DNS settings（DNS 設定）」**
  4. 下へスクロールして **「Custom records（カスタムレコード）」** の欄を出す
  5. **「Add record（レコードを追加）」** をクリック
  6. 各欄に次を入力する（**コピペ推奨**）

     Type（種別）:
     ```
     CNAME
     ```

     Host / Name（ホスト名）:
     ```
     koku
     ```

     Data / Value（値）:
     ```
     chem-assembler.github.io
     ```

     TTL: 既定のまま（4 hours）でよい

  7. **「Save（保存）」** をクリック（パスワードまたは2段階認証の確認が入ることがある）

- **入力時の注意**
  - Host は **`koku` だけ**。`koku.schoollenz.com` とフルで書かない（Squarespace はドメイン部を自動で補う）。
  - Value の末尾に **リポジトリ名を付けない**。`chem-assembler.github.io/kokugo-lens` は誤り。
    正しい値は組織の Pages ドメインそのもの＝`chem-assembler.github.io`。
    これは chem・info の**実際の DNS 応答**で確認済み（両方とも CNAME 先は `chem-assembler.github.io`）。
  - Value 末尾のドット（`chem-assembler.github.io.`）は付けても付けなくてよい。Squarespace 側で正規化される。
  - **A レコードではなく CNAME**。サブドメインなので GitHub の 185.199.108–111.153 を直接書く必要はない。

- [ ] **[Claude作業]** 反映を確認する。
  ```bash
  nslookup koku.schoollenz.com 8.8.8.8
  ```
  `canonical name = chem-assembler.github.io` と GitHub の IP が返れば OK。
  返らなければ 5章「つまずきポイント」の DNS 伝播を参照。

---

### [C] GitHub リポジトリを作る

- [ ] **[Claude作業]**（推奨・`gh` で1コマンド）
  ```bash
  gh repo create chem-assembler/kokugo-lens --public \
    --description "国語レンズ（KokugoLenz）— SchoolLenz の国語系サブブランド。返り点を打つと書き下し文が生まれる漢文学習アプリ。https://koku.schoollenz.com"
  ```
  - `--public` は必須。**Free プランでは非公開リポジトリの Pages は使えない。**
  - 実行前に**ユーザーの承認を取ること**（公開リポジトリの作成＝公開行為のため）。

- [ ] **[ユーザー操作]**（自分でやる場合）
  1. `https://github.com/organizations/chem-assembler/repositories/new` を開く
  2. Owner が **`chem-assembler`** になっていることを確認
  3. Repository name に決めた名前を入力
  4. **Public** を選択
  5. README / .gitignore / license は**すべて追加しない**（ローカルにすでに履歴があるため）
  6. **「Create repository」**

---

### [D] CNAME ファイルを置いて push

- [ ] **[Claude作業]** リポジトリルートに `CNAME` ファイルを作る。
  ```bash
  cd "C:/Users/maequ/マイドライブ/Antigravity/KokugoLens"
  printf 'koku.schoollenz.com\n' > CNAME
  ```
  - 中身は**サブドメイン1行のみ**（`https://` もパスも書かない）。改行コードは LF
    （このリポジトリは `.gitattributes` で `* text=auto eol=lf`）。
  - 前例の中身: chem → `chem.schoollenz.com` ／ info → `info.schoollenz.com`（実ファイルで確認済み）。

- [ ] **[Claude作業]** remote を設定して push。
  ```bash
  cd "C:/Users/maequ/マイドライブ/Antigravity/KokugoLens"
  git remote add origin https://github.com/chem-assembler/kokugo-lens.git
  git add CNAME
  git commit -m "chore: koku.schoollenz.com で公開するための CNAME を追加"
  git push -u origin main
  ```
  - **push 前の条件**（リポジトリ規約より）: `kanbun/test.html` の全テスト合格・実機確認済み・
    作りかけを出さない。現在 `kanbun/index.html` に未コミットの変更があるので、
    **別レーンの作業が片付いてから**この手順に入ること。
  - commit / push は**ユーザーの承認を取ってから**実行する。

---

### [E] GitHub Pages を有効化してカスタムドメインを設定する

- [ ] **[Claude作業]**（推奨・API で代行）
  ```bash
  # Pages を有効化（main ブランチのルートを配信）
  gh api -X POST repos/chem-assembler/kokugo-lens/pages \
    -f "source[branch]=main" -f "source[path]=/"

  # カスタムドメインを設定
  gh api -X PUT repos/chem-assembler/kokugo-lens/pages -f cname=koku.schoollenz.com
  ```
  権限エラーが出たら下の UI 手順に切り替える（`gh` のトークンは `repo` スコープあり・
  `admin:org` はなし。組織設定によっては UI が必要）。

- [ ] **[ユーザー操作]**（自分でやる場合）
  1. `https://github.com/chem-assembler/kokugo-lens/settings/pages` を開く
     （リポジトリ → **Settings** → 左サイドバー「Code and automation」の中の **Pages**）
  2. **「Build and deployment」** の **Source** で **「Deploy from a branch」** を選ぶ
  3. **Branch** で **`main`** ／ フォルダは **`/ (root)`** を選び、**「Save」**
  4. **「Custom domain」** の入力欄に次を貼って **「Save」**
     ```
     koku.schoollenz.com
     ```
  5. 「DNS check in progress」と出るので、緑のチェック（**DNS check successful**）になるまで待つ
     （[B] を先にやっていれば数十秒〜数分）

> 注: 手順 4 で保存すると GitHub がリポジトリに `CNAME` ファイルを自動コミットする。
> [D] で自分で置いた場合は同じ内容なので競合しないが、**push 後に `git pull` して
> ローカルを合わせておく**と後の作業で衝突しない。

---

### [F] Enforce HTTPS を入れる

- [ ] **[Claude作業]**（API）
  ```bash
  gh api -X PUT repos/chem-assembler/kokugo-lens/pages -F https_enforced=true
  ```
  証明書が未発行だとエラーになる。その場合は状態を見る:
  ```bash
  gh api repos/chem-assembler/kokugo-lens/pages --jq '{status,cname,https_certificate,https_enforced}'
  ```
  `https_certificate.state` が `approved` になってから再実行する。

- [ ] **[ユーザー操作]**（自分でやる場合）
  1. 同じ Pages 設定画面で、下の **「Enforce HTTPS」** のチェックボックスを入れる
  2. **最初はグレーアウトしていて押せない**のが正常（証明書発行前）。5章参照

---

### [G] 動作確認

- [ ] **[Claude作業]** 4章の確認コマンドを順に実行し、結果をユーザーに報告する。

---

## 3. アプリ別の値の表

### 3-1. リポジトリとドメイン

| | chem（前例・公開済み） | info（前例・公開済み） | **koku（今回）** |
|---|---|---|---|
| 表示名 | パズルでみる有機化学 ほか（化学レンズ） | 情報レンズ（InfoLenz） | 国語レンズ（KokugoLenz） |
| GitHub 組織 | `chem-assembler` | `chem-assembler` | `chem-assembler` |
| リポジトリ名 | `chem-assembler.github.io` | `info-lens` | **（要判断／推奨 `kokugo-lens`）** |
| リポジトリ種別 | 組織 Pages サイト | プロジェクトサイト | プロジェクトサイト |
| リモート URL | `https://github.com/chem-assembler/chem-assembler.github.io.git` | `https://github.com/chem-assembler/info-lens.git` | `https://github.com/chem-assembler/<決めた名前>.git` |
| 公開ブランチ / パス | `main` / `/` | `main` / `/` | `main` / `/` |
| サブドメイン | `chem.schoollenz.com` | `info.schoollenz.com` | `koku.schoollenz.com` |
| `CNAME` ファイルの中身 | `chem.schoollenz.com` | `info.schoollenz.com` | `koku.schoollenz.com` |
| ローカルパス | `C:\Users\maequ\マイドライブ\Antigravity\OrganicChemistryPuzzle` | `C:\Users\maequ\マイドライブ\Antigravity\InfoLens` | `C:\Users\maequ\マイドライブ\Antigravity\KokugoLens` |
| 状態 | 公開済み・証明書 2026-10-21 まで | 公開済み・証明書 2026-10-27 まで | **未公開（DNS も未登録）** |

### 3-2. Squarespace に追加する DNS レコード

親ドメイン `schoollenz.com` のネームサーバは `nsb1〜nsb4.squarespacedns.com`（実照会で確認）。
＝ **DNS の編集場所は Squarespace で正しい**。

| アプリ | Type | Host（Name） | Data（Value） | TTL | 状態 |
|---|---|---|---|---|---|
| chem | `CNAME` | `chem` | `chem-assembler.github.io` | 既定 | 登録済み |
| info | `CNAME` | `info` | `chem-assembler.github.io` | 既定 | 登録済み |
| **koku** | **`CNAME`** | **`koku`** | **`chem-assembler.github.io`** | 既定 | **未登録＝今回追加する1件** |

- **追加するのはこの1行だけ。** 既存のレコードは触らない。
- 特に **apex（`schoollenz.com` 本体）のレコードは絶対に触らない**。
  現在 apex は Vercel（`216.198.79.1`）を向いている（`Server: Vercel` を確認）。
  ここを書き換えるとポータル側が壊れる。今回の作業と apex は無関係。

---

## 4. 動作確認手順

### 4-1. DNS が引けるか（[B] の直後）

```bash
nslookup koku.schoollenz.com 8.8.8.8
```
期待する出力: `koku.schoollenz.com  canonical name = chem-assembler.github.io` と
`185.199.108.153` などの GitHub Pages の IP（`.108` `.109` `.110` `.111` の4つ）。

CNAME レコードだけを見たいとき:
```bash
nslookup -type=CNAME koku.schoollenz.com 8.8.8.8
```

**目安時間**: Squarespace で保存してから **5〜30分**で引けることが多い。
公式の案内は「24〜48時間かかることがある」。30分たっても `Non-existent domain` なら
入力（Host に `koku` だけ入っているか）を見直す。

### 4-2. Pages の状態（[E] の直後）

```bash
gh api repos/chem-assembler/kokugo-lens/pages \
  --jq '{status, cname, html_url, source, https_certificate, https_enforced}'
```
見るところ:
- `status` … `built`（`building` なら少し待つ）
- `cname` … `koku.schoollenz.com`
- `https_certificate.state` … `new` → `authorization_created` → `issued` → **`approved`** と進む
- `https_enforced` … [F] のあと `true`

info の完成形（実測値）と同じ形になっていれば正解:
```
{"status":"built","cname":"info.schoollenz.com","source":{"branch":"main","path":"/"},
 "https_certificate":{"state":"approved",...},"https_enforced":true}
```

### 4-3. HTTPS 証明書の待ち時間の目安

| 段階 | 目安 |
|---|---|
| DNS チェック通過 → 証明書発行開始 | 数分 |
| 証明書発行完了（`approved`）→ Enforce HTTPS が押せる | **通常 15分〜1時間**。GitHub の公式説明は「**最大24時間**かかることがある」 |
| 24〜48時間たっても `approved` にならない | 自力では直らない領域。Custom domain を一度削除→再保存で再試行、それでもダメなら GitHub Support |

### 4-4. サイトが見えるか

ブラウザで開く URL:
```
https://koku.schoollenz.com/
https://koku.schoollenz.com/kanbun/
```

コマンドで確認する場合:
```bash
curl -sI https://koku.schoollenz.com/ | head -8
```
期待: `HTTP/1.1 200 OK` と `Server: GitHub.com`。

HTTP からのリダイレクトも確認（Enforce HTTPS 有効後）:
```bash
curl -sI http://koku.schoollenz.com/ | head -5
```
期待: `301` で `https://koku.schoollenz.com/` へ。

- [ ] ハブの「返り点でみる漢文」カードから `/kanbun/` へ遷移できる
- [ ] `/kanbun/` で `texts.json` の fetch が成功している（問題文が出る）
- [ ] `https://koku.schoollenz.com/kanbun/test.html` で回帰テストが全合格する

---

## 5. つまずきポイント

### 5-1. DNS 伝播待ち

- Squarespace で保存しても**すぐには引けない**。5〜30分が普通、最大48時間。
- **ローカルの DNS キャッシュに古い「存在しない」が残る**ことがある。
  確認は必ず `nslookup ... 8.8.8.8` のように**公開 DNS を明示**して行う。
  手元のキャッシュを消すなら PowerShell で `Clear-DnsClientCache`。
- ブラウザは特にしつこくキャッシュする。うまく出ないときはシークレットウィンドウで開く。

### 5-2. Enforce HTTPS が最初グレーアウトする

- **これは異常ではなく正常**。証明書がまだ発行されていない間は押せない仕様。
  GitHub Docs も「この選択肢が使えるようになるまで最大24時間かかることがある」と明記している。
- **やってはいけないこと**: グレーアウトを見て慌てて Custom domain を消す・入れ直すを連打する。
  そのたびに証明書発行が最初からやり直しになり、かえって遅くなる。
- **正しい対処**: [B] の DNS を先に入れておく → Pages 画面に「DNS check successful」が出ているのを
  確認する → あとは待つ。1時間たっても押せなければ一度だけ Custom domain を削除→再保存する。

### 5-3. CNAME の値にリポジトリ名を付けてしまう

- 誤: `chem-assembler.github.io/kokugo-lens`
- 正: `chem-assembler.github.io`
- CNAME レコードは**ホスト名しか書けない**（パスは書けない）。プロジェクトサイトでも値は組織の
  Pages ドメインのままで、どのリポジトリに割り当てるかは GitHub 側の Custom domain 設定が決める。

### 5-4. Host 欄にフルドメインを書いてしまう

- 誤: Host = `koku.schoollenz.com`（`koku.schoollenz.com.schoollenz.com` になってしまう）
- 正: Host = `koku`
- 保存後に Squarespace の一覧で表示が `koku.schoollenz.com` になっていれば正しい。

### 5-5. `CNAME` ファイルの置き場所・中身

- 置き場所は**リポジトリのルート**（`main` ブランチの `/`）。`kanbun/` の中ではない。
- 中身は1行だけ。`https://` もパスも末尾スラッシュも書かない。
- ファイル名は**すべて大文字の `CNAME`**（拡張子なし）。`cname` や `CNAME.txt` は効かない。
- Pages 設定画面で Custom domain を保存すると GitHub が自動でこのファイルを作る／上書きする。
  push 後にローカルとずれることがあるので、作業再開前に `git pull` する。

### 5-6. リポジトリが Private だと Pages が動かない

- Free プランでは Public 必須。`gh repo create` に `--public` を付け忘れないこと。

### 5-7. `.nojekyll` は不要だが、アンダースコア始まりのファイルを置くなら必要

- 現状 KokugoLens にアンダースコア始まりのディレクトリ／ファイルはないので不要。
- 将来 `_data/` のようなものを置くと Jekyll に無視されるので、その時点でルートに空の
  `.nojekyll` を追加する。

### 5-8. 既存レコードを壊さない

- Squarespace の DNS 画面には apex（`@`）や `www`、メール関連の MX / TXT が並んでいる。
  **追加するのは Custom records の CNAME 1行だけ**で、既存行の編集・削除はしない。
- apex は現在 Vercel を向いている（別系統）。ここを触ると `schoollenz.com` 本体が落ちる。

### 5-9. push 前の品質条件を飛ばさない

- 本リポジトリの規約: **`kanbun/test.html` 全合格・実機確認済み・作りかけを出さない**の3条件が
  そろってはじめて push してよい。公開作業を急いで未完成を出さないこと。
- 2026-08-05 時点で `kanbun/index.html` に未コミットの変更あり。**別レーンの作業完了を待つ**。

---

## 6. 作業後にやること（任意・忘れやすい）

- [ ] **[Claude作業]** `README.md` の「公開予定 URL: **koku.schoollenz.com**（DNS・Pages は未設定）」を
      公開済みの記述に直す。
- [ ] **[ユーザー判断]** ポータル（`chem-assembler/portal` ＝ `schoollenz.com`）のアプリ一覧に
      国語レンズを載せるか決める。載せるなら別作業として起票する。
- [ ] **[ユーザー判断]** GitHub の repo 説明欄と homepage に `https://koku.schoollenz.com` を入れるか
      （info-lens は description に URL を入れている）。

---

## 付録: ユーザー操作の総数

| 区分 | 件数 | 内訳 |
|---|---|---|
| **ユーザーの判断が必要** | **1件** | [A] リポジトリ名の決定（推奨 `kokugo-lens`） |
| **ユーザーの画面操作が必須** | **1件** | [B] Squarespace に CNAME レコードを1行追加（Claude は Squarespace に入れない） |
| ユーザーの承認が必要（実行は Claude） | 3件 | [C] 公開リポジトリ作成 ／ [D] commit・push ／ [E] Pages 公開設定 |
| Claude が単独で実行可 | 4件 | [D] CNAME ファイル作成 ／ [F] Enforce HTTPS ／ [G] 動作確認 ／ [6] README 更新 |

**要するに、ユーザーが手を動かすのは「リポジトリ名を1つ決める」と
「Squarespace で CNAME を1行足す」の2つだけ**。残りは承認さえもらえれば Claude 側で完了できる。

---

## 付録: 参照した現行ドキュメント

- GitHub Docs「Managing a custom domain for your GitHub Pages site」
  https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- GitHub Docs「Securing your GitHub Pages site with HTTPS」
  https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- Squarespace Help「Pointing a Squarespace domain」
  https://support.squarespace.com/hc/en-us/articles/215744668-Pointing-a-Squarespace-domain
- Squarespace Help「DNS records for web hosting」
  https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting
