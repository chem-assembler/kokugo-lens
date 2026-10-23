---
id: vocabulary
unit: vocabulary
unitLabel: 漢文
group: 10章
title: 語の使い方一覧
source:
  - docs/DESIGN_reference.md §2・§3
  - docs/DRAFT_pitfalls.md・例解漢和辞典 第4版 p.33（乃）p.491（是）
  - 漢文の語法 p.32〜34（為・以為）p.122〜128（以）p.148〜155（謂）・例解漢和辞典 第4版 p.500（曰）
singleSource: true
why: 設計書で決めた各語の見出しと既存問題への対応を保ち、乃・是の読み分けと日本語の感覚で誤りやすい点を自分のことばで説明するため。
---

:::section
anchor: word-4ee5
title: 以
codes:
  - kbn.goi.motte
:::

「以」は、何を使うか、何を理由にするかを示す。後ろの語を先に読み、その語と次の動作のつながりを確かめる。

:::table
caption: 以の読みと働き
source: qa/questions.json kbn.goi.motte・漢文の語法 p.122〜128をもとに作成
head:
  - 読み・形
  - 働き
  - 見分け方
rows:
  - もつて（以て） | 動作に使う道具や手段を示す。「〜で」と訳す。 | 以の後ろの語が、何を使うかを答えているかを見る。
  - もつて（以て） | 理由や原因を示す。「〜のために」と訳す。 | 何を理由に喜ぶ、悲しむなどの動作が起こるかを見る。
  - Aを以てBと為す | AをBと考える。Aは判断の対象である。 | 以だけで区切らず、後ろの為と、何を何と考えるかを確かめる。
  - 以為 | 「おもへらく」と読み、考えの内容を導く。 | 二字がまとまって「思うことには」という意味になるかを見る。
:::

:::contrast
left: 一字の以は「もつて」と読み、手段・理由・判断の対象を示す。
right: 二字の以為には「おもへらく」という熟語の読みがある。「以て〜と為す」と返って読む場合もある。
why: 字の並びだけで読みを一つに決めない。以と為の間に対象があるか、後ろに考えの内容が続くかを確かめる。
:::

最初の問題は道具、次は喜びや悲しみの理由を示す。最後の問題は、虎が相手を神のような存在と考える場面である。「以て神と為す」と読む。

:::example
id: mujun-ikan
:::

:::example
id: gakuyo-yorokobazu
:::

:::example
id: kenro-kami
:::

:::section
anchor: word-70ba
title: 為
codes:
  - kbn.goi.nasu
:::

「為」は、動作・変化・判断などを表す。「する」のか、「なる」のか、「である」のかを文の中で確かめる。

:::table
caption: 為の読みと働き
source: qa/questions.json kbn.goi.nasu・漢文の語法 p.32〜34をもとに作成
head:
  - 読み・形
  - 働き
  - 見分け方
rows:
  - す・なす・つくる | 何かを行ったり、作ったりする。 | 為の後ろに、することや作る物が続くかを見る。
  - なる（為る） | ある状態や立場に変わる。 | 「何に変わるか」を表す語を先に読み、「〜と為る」とする。
  - たり | 「〜である」と、立場や状態を述べる。 | 変化や動作ではなく、何であるかを述べているかを見る。書き下しはひらがなにする。
  - ために（為に） | 相手の利益や、動作の目的を示す。 | 誰のために、何のためにするのかを確かめる。
  - AをBと為す | AをBとみなす。 | AとBを結ぶ判断を述べているかを見る。
  - 為A所B | AからBという動作を受ける。「AのBする所と為る」と読む。 | 為・所だけでなく、動作を受けるものと、動作をするAを確かめる。
:::

:::contrast
left: 「たり」は「〜である」という説明であり、書き下しでは為の字を残さない。
right: 「為る」は「なる」と読み、状態の変化を表す。受身の「為A所B」でも「為る」と書く。
why: 同じ字でも働きが違う。「である」「変わる」「動作を受ける」のどれが文意に合うかを見る。
:::

次の問題は順に、「人のために」、判断の「〜と為す」、説明の「たり」、動作を受ける「為る」の例である。

:::example
id: rongo-hakarite
:::

:::example
id: rongo-shiruwo
:::

:::example
id: koumon-toso
:::

:::example
id: mq-chihoku-taku
:::

:::section
anchor: word-8b02
title: 謂
codes:
  - kbn.goi.iu
:::

「謂」は、何について言うか、何と呼ぶかを表す。相手や対象と、言う内容を分けて読む。

:::table
caption: 謂の読みと働き
source: qa/questions.json kbn.goi.iu・漢文の語法 p.148〜155をもとに作成
head:
  - 読み・形
  - 働き
  - 見分け方
rows:
  - いふ（謂ふ） | 相手に言ったり、ある事柄について述べたりする。 | 誰に、何について、何と言うのかを確かめる。
  - AをBと謂ふ | AをBと呼ぶ。また、AをBだと評する。 | 呼ばれる対象Aと、名前や評価Bを探す。
  - おもふ（謂ふ） | ある事柄をそのように考える。 | 声に出すことより、判断の内容を述べているかを見る。「いふ」と読んでも文意が合う場合がある。
:::

:::contrast
left: 一字の謂は「いふ」などと読み、対象や内容を伴う。
right: 所謂は二字で「いはゆる」と読み、「世間でいう」という説明を名詞に添える。
why: 所と謂のまとまりを確かめる。所謂を、一字の謂と同じ読みのまま処理しない。
:::

:::contrast
left: 曰は、後ろに発言の内容を導く。
right: 謂は、言う相手・話題・名づける対象を伴う。「AをBと謂ふ」という形にもなる。
why: 「言う」と訳せることだけで同じ語順にしない。何が対象で、何が内容かを見分ける。
:::

最初の問題は前のことばが指す内容を確かめる文、次は「物化」と呼ぶ文である。最後は二字の「所謂」を使っている。

:::example
id: mq-etsubi-yokai
:::

:::example
id: soshi-bukka
:::

:::example
id: hakui-zehi
:::

:::section
anchor: word-5df2
title: 已
codes:
  - kbn.goi.sudeni
:::

「已」は、動作より前に置く場合、動作そのものを表す場合、文の終わりに置く場合で読みを分ける。

:::table
caption: 已の読みと働き
source: qa/questions.json kbn.goi.sudeni・kanbun/texts.jsonをもとに作成
head:
  - 読み・形
  - 働き
  - 見分け方
rows:
  - すでに（已に） | もう起こっていることを示す。 | 後ろに動作や状態が続き、それがもう成立しているかを見る。
  - やむ（已む） | 動作が終わる、または動作をやめる。 | 已自体が動詞になっているかを見る。何が終わるか、何をやめるかを確かめる。
  - のみ | 「〜だけだ」と範囲を限る。 | 文末で前の内容を締めくくっているかを見る。「而已」という形もある。
:::

:::contrast
left: 「已に」は「すでに」と読み、後ろの動作や状態を説明する。
right: 文末の「而已」は、二字をまとめて「のみ」と読む。書き下しではひらがなにする。
why: 而已を「しこうしてすでに」と読んではいけない。文末で内容を限るまとまりかどうかを確かめる。
:::

次の問題で、「已に」「已む」「のみ」を比べる。最初は舟がもう進んだこと、次は学問をやめてはならないこと、最後は葦の音だけが聞こえることを述べている。

:::example
id: kokushu-fune
:::

:::example
id: junshi-yamubekarazu
:::

:::example
id: mq-etsubi-roteki
:::

:::section
anchor: word-66f0
title: 曰
codes:
  - kbn.goi.iwaku
:::

「曰」は、話す人と発言の内容を分ける手がかりになる。誰が言い、どこからその内容が始まるかを見る。

:::table
caption: 曰の読みと働き
source: qa/questions.json kbn.goi.iwaku・例解漢和辞典 第4版 p.500をもとに作成
head:
  - 読み
  - 働き
  - 見分け方
rows:
  - いはく（曰はく・曰く） | 「言うことには」と、発言や引用を導く。 | 曰の前の話し手と、後ろに続く発言の内容を確かめる。
  - いふ（曰ふ） | ことばを口にする。文に応じて「曰はん」などと活用する。 | 引用を導く形に限らず、何を言うかを述べる動詞になっているかを見る。
:::

:::mistake
wrong: 曰を、日本語の「いわく付き」と同じく「わけ・事情」と訳す。
right: 漢文では、まず「言うことには」「言う」という発言の意味で読む。
why: 「わけ・事情」という意味は日本語で生じた用法である。字が同じでも、その意味を漢文に持ち込まない。
:::

最初の問題は、猿飼いの発言を「曰はく」で導く。次の問題は「曰はん」と活用し、利益のことを言うべきかを述べる文である。

:::example
id: chosan-kubaru
:::

:::example
id: moshi-nanzokanarazu
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
