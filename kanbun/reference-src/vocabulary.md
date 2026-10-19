---
id: vocabulary
unit: vocabulary
unitLabel: 漢文
group: 10章
title: 語の使い方一覧
source:
  - docs/DESIGN_reference.md §2・§3
  - docs/DRAFT_pitfalls.md・例解漢和辞典 第4版 p.33（乃）p.491（是）
singleSource: true
why: 設計書で決めた各語の見出しと既存問題への対応を保ち、乃・是の読み分けと日本語の感覚で誤りやすい点を自分のことばで説明するため。
---

:::section
anchor: word-4ee5
title: 以
codes:
  - kbn.goi.motte
:::

:::section
anchor: word-70ba
title: 為
codes:
  - kbn.goi.nasu
:::

:::section
anchor: word-8b02
title: 謂
codes:
  - kbn.goi.iu
:::

:::section
anchor: word-5df2
title: 已
codes:
  - kbn.goi.sudeni
:::

:::section
anchor: word-66f0
title: 曰
codes:
  - kbn.goi.iwaku
:::

:::section
anchor: word-65bc
title: 於
:::

:::section
anchor: word-4f55
title: 何
:::

:::section
anchor: word-53ef
title: 可
codes:
  - kbn.goi.beshi
:::

:::section
anchor: word-904e
title: 過
codes:
  - kbn.goi.ayamachi
:::

:::section
anchor: word-84cb
title: 蓋
codes:
  - kbn.goi.kedashi
:::

:::section
anchor: word-5176
title: 其
codes:
  - kbn.goi.sono
:::

:::section
anchor: word-898b
title: 見
codes:
  - kbn.goi.miru
:::

:::section
anchor: word-6545
title: 故
codes:
  - kbn.goi.yue
:::

:::section
anchor: word-543e
title: 吾
codes:
  - kbn.goi.ninshou
:::

:::section
anchor: word-5f8c
title: 後
codes:
  - kbn.goi.nochi
:::

:::section
anchor: word-6b64
title: 此
codes:
  - kbn.goi.kaku
:::

:::section
anchor: word-4f7f
title: 使
codes:
  - kbn.goi.shimu
:::

:::section
anchor: word-4e4b
title: 之
codes:
  - kbn.goi.kore
:::

:::section
anchor: word-81ea
title: 自
codes:
  - kbn.goi.yori
:::

:::section
anchor: word-8005
title: 者
codes:
  - kbn.goi.mono
:::

:::section
anchor: word-82e5
title: 若
:::

:::section
anchor: word-5b70
title: 孰
codes:
  - kbn.goi.jukugo-kubetsu
:::

:::section
anchor: word-6240
title: 所
codes:
  - kbn.goi.tokoro
  - kbn.goi.yuen
:::

:::section
anchor: word-5982
title: 如
codes:
  - kbn.goi.gotoshi
:::

:::section
anchor: word-662f
title: 是
codes:
  - kbn.goi.setsuzoku
:::

「是」は、何を指すかだけでなく、文をどう組み立てているかを見る。同じ「これ」という読みでも、前の内容を指す場合と、「〜である」と述べる場合がある。

:::table
caption: 是の形と読み分け
source: docs/DRAFT_pitfalls.md §1「是」をもとに作成
head:
  - 形
  - 読み
  - 働き
  - 見分け方
rows:
  - 是＋名詞 | この（是の） | 後ろの名詞を指し示す。 | 「この〜」と名詞に続くかを見る。
  - 前の内容を受ける是 | これ（是れ） | 「それこそが」と前の内容を指す。 | 何を受けているか、前の文に戻って確かめる。
  - A 是 B | これ（是れ） | 「AはBである」という結びつきを表す。 | 何が何であると述べているかを見る。
  - 若是・如是 | かくの（是くの） | 全体で「このようだ」という意味になる。 | 若・如の後ろに是がある形を確かめ、「是くのごとし」と返って読む。
  - 於是 | ここにおいて（是に於いて） | 「そこで」と前の出来事を受け、話を進める。 | 二字のまとまりを見て、是から於へ返って読む。
  - 是非・以為是 | ぜ | 正しいことを表す。「是とする」は、正しいと認める意味である。 | 指し示す語ではなく、正しいかどうかを述べているかを見る。
:::

:::contrast
left: 前の内容を指す「是れ」は、「それこそが」という意味である。
right: 「A 是 B」の「是れ」は、「AはBである」の「である」にあたる。
why: 読みだけでは区別できない。前の内容を指す語か、AとBを結びつける語かを文の中で確かめる。
:::

:::mistake
wrong: 「是れ」と読むところを、書き下しで「是」とだけ書く。
right: 「これ」と読む是には「れ」を送り、「是れ」と書く。
why: 「是の」「是くの」とは読みが違う。指し示す働きでも、「〜である」の働きでも、「これ」と読むところの「れ」を落とさない。
:::

次の四つの問題で使い方を比べる。最初は名詞に続く「是の」である。次は前の内容を受ける「是れ」、後の二つは「〜である」の働きをする「是れ」である。

:::example
id: moshi-tairin
:::

:::example
id: rongo-shiruwo
:::

:::example
id: seiyashi-2
:::

:::example
id: zekku-4
:::

:::contrast
left: 「是れ」は「これ」と読み、指し示す語や「〜である」の働きをする語になる。
right: 「若是」「如是」の是は「かくの」と読み、「是くのごとし」と書き下す。
why: 若・如と是がまとまって「このようだ」という意味になる。是をいつも「これ」と読むわけではない。
:::

:::mistake
wrong: 若是を「これのごとし」と読む。
right: 「かくのごとし」と読み、「是くのごとし」と書く。
why: 「このようだ」という決まった言い方である。助動詞として使う「若」は、書き下しでは「ごとし」とひらがなで書く。
:::

:::example
id: kenro-kanashii
:::

:::contrast
left: 「是に於いて」は「ここにおいて」と読み、「そこで」と話をつなぐ。
right: 「是とする」は「ぜとする」と読み、正しいと認めることを表す。
why: 「於是」という二字の形と、正しさを表す「是」を区別する。「是とする」を「これとする」と読んで、物を指す意味に取らない。
:::

次の問題の「是に於いて」は、前の出来事を受ける「そこで」である。

:::example
id: mq-gusho-henshoku
:::

「是とする」の是は、正しいという意味である。次の問題では「是か非か」と対にして、正しいのか、正しくないのかを述べている。

:::example
id: hakui-zehi
:::

:::section
anchor: word-7136
title: 然
codes:
  - kbn.goi.shikari
:::

:::section
anchor: word-76f8
title: 相
codes:
  - kbn.goi.ai
:::

:::section
anchor: word-5247
title: 則
:::

:::section
anchor: word-5373
title: 即
:::

:::section
anchor: word-8db3
title: 足
codes:
  - kbn.goi.taru
:::

:::section
anchor: word-9053
title: 道
codes:
  - kbn.goi.michi
:::

:::section
anchor: word-72ec
title: 独
codes:
  - kbn.goi.hitori
:::

:::section
anchor: word-5948
title: 奈
:::

:::section
anchor: word-4e43
title: 乃
codes:
  - kbn.goi.sunawachi
:::

「乃」は、前の出来事を受けるときと、人を指すときで読みが変わる。前後のつながりと、後ろに続く語を見る。

:::table
caption: 乃の読みと働き
source: docs/DRAFT_pitfalls.md §1「乃」をもとに作成
head:
  - 読み
  - 働き
  - 見分け方
rows:
  - すなはち | 「そこで」「やっと」「意外にも」というつながりを表す。 | 文の初めや主語の後ろで、前の出来事を受ける。どの意味かは前後の文から決める。
  - なんぢ | 相手を指す。「あなた」「おまえ」の意味である。 | 名詞の前で「あなたの〜」という意味になるかを見る。
:::

:::contrast
left: 乃の「すなはち」は、前の出来事を受けて「そこで」「やっと」などと訳す。
right: 則の「すなはち」は、条件を受けて「そうであれば」と訳す。
why: 前の文と後の文がどうつながるかを見る。出来事が進むのか、条件に対する結果を述べるのかを確かめる。
:::

:::contrast
left: 乃の「すなはち」は、そこに至ったことに目を向ける。「やっと」や「意外にも」と訳す場合もある。
right: 即の「すなはち」は、間を置かず「すぐに」という意味を表す。
why: 同じ読みでも、乃をいつも「すぐに」と訳してはいけない。そこに至るまでの経過や、意外さが述べられていないかを見る。
:::

:::contrast
left: 乃の「すなはち」は、前の出来事を受けて、その先を述べる。
right: 輒の「すなはち」は、「そのたびに」という繰り返しを表す。
why: 何かが起こるたびに同じことが起こる文かどうかを見る。読みが同じという理由で意味までそろえない。
:::

:::mistake
wrong: 乃を「すなはち」と読んだので、「言いかえると」と訳す。
right: 「そこで」「やっと」「意外にも」など、前後のつながりに合う意味を取る。
why: 日本語の「すなわち」には言いかえの意味がある。漢文の乃・則・即・輒に、その意味を持ち込まない。
:::

次の問題の「乃ち」は「意外にも」の意味である。漢の時代があったことすら知らない、という驚きを述べている。

:::example
id: touka-gishin
:::

:::section
anchor: word-5be7
title: 寧
codes:
  - kbn.goi.mushiro
:::

:::section
anchor: word-80fd
title: 能
codes:
  - kbn.goi.yoku
:::

:::section
anchor: word-767d
title: 白
:::

:::section
anchor: word-4e0d
title: 不
:::

:::section
anchor: word-592b
title: 夫
codes:
  - kbn.goi.fu
:::

:::section
anchor: word-6709
title: 有
codes:
  - kbn.goi.arimono
:::

:::section
anchor: word-4e0e
title: 与
codes:
  - kbn.goi.to
:::

:::section
anchor: word-6b32
title: 欲
codes:
  - kbn.goi.hossu
:::
