---
id: kunten
unit: kunten
unitLabel: 漢文
group: 2章
title: 訓点
source:
  - docs/DESIGN_reference.md §2・§3
  - README.md 有識者レビューで確定した書き方・2回目の回答で確定したこと
  - qa/questions.json・kanbun/kuho.json・kanbun/texts.json
  - 漢文の語法 p.26（於）p.106（不）p.196〜204（宜・当・応・須・将・且）
singleSource: true
why: 語順を示す訓点の役割を説明し、仮名書き・置き字・再読文字を働きに応じて区別するため。
---

:::section
anchor: forms
title: 白文・訓読文・書き下し文
codes:
  - kbn.kun.hakubun
  - kbn.kun.kundokubun
  - kbn.kun.kakikudashi
  - kbn.kun.kutouten
:::

白文・訓読文・書き下し文は、同じ内容を異なる形で表したものである。訓読文では原文の漢字の並びを保ち、訓点を添える。書き下し文では、日本語で読む順に書き改める。句読点は、読み手が文の切れ目を判断して付けたものである。

:::table
caption: 三つの文の形
source: qa/questions.json・kanbun/kuho.json・kanbun/texts.jsonをもとに作成
head:
  - 形・見る箇所
  - 読み・書き下し
  - 意味・確かめること
rows:
  - 白文 | 訓点のない原文から語の関係を取る。 | 原文の語順を確かめる。
  - 訓読文 | 原文に句読点・送り仮名・返り点などを添えて読む。 | 漢字の並びは原文のままである。
  - 書き下し文 | 日本語で読む順に、漢字とひらがなで書く。 | 日本語の文語文にする。返り点の記号は書かない。
  - 現代語訳 | 文の意味を現代の日本語で述べる。 | 主語や指示語の内容も、前後に基づいて明らかにする。
:::

:::contrast
left: 訓読文には、原文の語順のまま返り点を付ける。
right: 書き下し文には、日本語で読む順に語を並べ、返り点は書かない。
why: 原文の位置に印を付ける作業と、読む順に文を書き改める作業を区別する。
:::

:::mistake
wrong: 書き下し文とは、漢字をすべてひらがなにした文である。
right: 実質的な意味を表す漢字を残し、送り仮名と助詞・助動詞をひらがなにする。
why: すべて平仮名で答える形式には、そのように指定する設問がある。通常の書き下し文とは区別する。
:::

次の問題では、原文の漢字の並びと、書き下しの故き・温ねて・新しき・知るという順を比べる。

:::example
id: rongo-onko
:::

:::section
anchor: return-marks
title: 語順を返り点で示す
codes:
  - kbn.kun.kaeriten
  - kbn.kun.reten
  - kbn.kun.ichini
  - kbn.kun.jouge
  - kbn.kun.kaiso
  - kbn.kun.hyphen
  - kbn.kun.kouotsu
  - kbn.kun.gouji
  - kbn.kun.hyphen-adv
  - kbn.kun.jouge-joken
  - kbn.kun.futakumi
  - kbn.kun.re-renzoku
  - kbn.kun.uchikata
:::

返り点は漢字の左下に付け、下から上へ返って読む順序を示す。まず語の関係から読み順を決め、返る箇所に印を付ける。内側のまとまりを読み終えてから、外側へ返る。置き字は読まずに飛ばし、読む字どうしの返りを見る。

:::table
caption: 返り点の読み方
source: qa/questions.json・kanbun/kuho.json・kanbun/texts.jsonをもとに作成
head:
  - 形・見る箇所
  - 読み・書き下し
  - 意味・確かめること
rows:
  - レ点 | すぐ下の読む字を先に読み、上へ返る。 | 隣り合う読む字の順を逆にする。続けて打てば一字ずつ返る。
  - 一二三点 | 一、二、三の順に返る。 | 二字以上のまとまりから返るときなどに使う。
  - 上中下点 | 上、中、下の順に返る。 | 一二点の返りをまたぐ外側で使う。二段なら上下で足りる。
  - 甲乙丙点・天地人点 | 甲、乙、丙、さらに外側では天、地、人の順に返る。 | 上中下点の外側が甲乙丙点、その外側が天地人点である。
  - 一レ・上レなど | まずレ点の返りを処理し、番号や上下の返りへ続く。 | レ点とほかの返り点を組み合わせた合字である。
  - 連読符で結ぶ熟語 | 二字をひとまとまりにして返って読む。 | 熟語の先頭字に返り点を付ける。二字を分けない。
:::

:::contrast
left: レ点は、隣り合う読む字の返りを示す。
right: 一二点は、ひとまとまりを読み終え、その下端から上へ返る順を示す。
why: 返る箇所がいくつあるかと、返りが入れ子になっているかは別である。前の組が閉じた後なら、一二点を繰り返して使える。
:::

:::mistake
wrong: 返る幅が広いので、内側に一二点がなくても上中下点を使う。
right: 一二点をまたぐ返りがあるときに上中下点を使う。
why: 符号の階層は距離でなく、返りがほかの返りを含むかどうかで決まる。内側の階層を飛ばさない。
:::

順に、レ点が続く返り、一二点の返り、孰与を二字まとめて読む熟語返りを確かめる。

:::example
id: shungyo-1
:::

:::example
id: shungyo-2
:::

:::example
id: shiki-izureka
:::

:::section
anchor: kana
title: 送り仮名と仮名書きを確かめる
codes:
  - kbn.kun.okurigana
  - kbn.kun.kanagaki
  - kbn.kun.kanaji
  - kbn.kun.kudashi-junjo
:::

送り仮名は、漢字の右下に歴史的仮名づかいのカタカナで添える。書き下しではひらがなに直す。漢字を残すかどうかは、その字が文中でどんな働きをするかで決める。助詞・助動詞にあたる字はひらがなにする。

:::table
caption: 書き下しでの仮名書き
source: qa/questions.json・kanbun/kuho.json・kanbun/texts.jsonをもとに作成
head:
  - 形・見る箇所
  - 読み・書き下し
  - 意味・確かめること
rows:
  - 不 | ず・ざる、など | 打ち消しの助動詞として読む。
  - 可 | べし・べき、など | 可能・当然などを表す助動詞として読む。
  - 如・若 | ごとし・ごとき、など | たとえの助動詞にあたる読みをひらがなにする。
  - 為 | たり | 「〜である」という助動詞の読みは、為の字を残さない。
  - 之・也・乎・耳 | の・なり・か／や・のみ、など | 助詞・助動詞にあたる働きなら、ひらがなにする。
  - 再読文字・置き字 | 再読は二度の読みを表し、置き字は書かない。 | 原文の字数と書き下しの字数をそろえない。
:::

:::contrast
left: 如・若を比況の「ごとし」と読むときは、ひらがなで書く。
right: 不如の「如かず」は比較の「しかず」であり、如の字を残す。
why: 同じ漢字に一つの表記を固定しない。読みと働きを一緒に確かめる。
:::

:::mistake
wrong: 為は漢字だから、助動詞の「たり」と読む場合も為と書く。
right: 助動詞の「たり」はひらがなにする。動詞の「為す」「為る」と区別する。
why: 漢字の形ではなく、文中の品詞と働きに応じて表記する。歴史的仮名づかいも保つ。
:::

順に、比況のごとし、比較の如かず、判断のたりを比べる。

:::example
id: rongo-sugitaru
:::

:::example
id: hyakubun
:::

:::example
id: koumon-toso
:::

:::section
anchor: placed
title: 置き字の働きを捉える
codes:
  - kbn.oki.def
  - kbn.oki.ji
  - kbn.oki.o
  - kbn.oki.bunmatsu
  - kbn.oki.kei
  - kbn.oki.caution
  - kbn.oki.o-adv
  - kbn.oki.miwake
  - kbn.oki.nari
  - kbn.oki.ji-yomu
  - kbn.oki.o-yomu
  - kbn.oki.nomi
  - kbn.oki.kaeriten
  - kbn.oki.fukusuu
:::

置き字は、訓読では声に出して読まず、書き下しにもその字を書かない。ただし意味や語の関係を示す働きは残る。而は前後の動作や判断をつなぎ、於・于・乎は場所や相手などとの関係を示す。同じ字でも読む場合がある。

:::table
caption: 置き字と、読む場合の区別
source: qa/questions.json・kanbun/kuho.json・kanbun/texts.jsonをもとに作成
head:
  - 形・見る箇所
  - 読み・書き下し
  - 意味・確かめること
rows:
  - 動作＋而＋動作 | 〜て〜する、〜ども〜する、など | 前後のつながりを送り仮名に表す。順接か逆接かは文意を見る。
  - 動詞＋於／于／乎＋場所・相手 | 場所・相手に〜する、など | 於などを置き字にする場合、名詞と動作の関係を助詞で表す。
  - 性質を表す語＋於＋比較の相手 | 比較の相手より〜 | 於が示す比較の向きを保つ。
  - 文末の矣・焉、詩の兮など | 置き字のときは、その字を書かない。 | 語調を添えたり、詩の調子を整えたりする。
  - 文頭の而 | 而して・而るに、など | 前の文を受けて読む用法がある。
  - 於是・況於A乎 | 是に於いて・況んやAに於いてをや | 於を読む形もある。
  - 文末の也・乎、文頭などの焉 | なり／や・か／や・焉くんぞ、など | 読む字の用法である。置き字と決めつけない。
  - 而已・而已矣 | のみ | まとまりで限定を表す。すべてを消すわけではない。
:::

:::contrast
left: 於は、場所・相手・比較の基準などを示す。置き字にしても、その関係を助詞で表す。
right: 而は、前後をつなぐ。置き字にする場合、その関係を前の語の送り仮名などに表す。
why: どちらも読まないことがあるが、示す関係は違う。読まない字の働きも訳に生かす。
:::

:::mistake
wrong: 於・而・乎・焉・也があれば、いつでも書き下しから消す。
right: その文で置き字か、読む字かを確かめる。置き字には返り点や送り仮名を付けず、読む字どうしの順を示す。
why: 同じ字に異なる用法がある。一文に置き字がいくつあっても、それぞれの役割を確かめる。
:::

最初の於は動作の相手、次の於は比較の基準を示す置き字である。最後の於は「於いて」と読み、乎も「や」として書き下しに表す。

:::example
id: rongo-hodokosu
:::

:::example
id: shisetsu-fuhitsu
:::

:::example
id: shiki-yojin
:::

:::section
anchor: reread
title: 再読文字を二度読む
codes:
  - kbn.sai.def
  - kbn.sai.kunten
  - kbn.sai.mi
  - kbn.sai.masani-su
  - kbn.sai.masani-beshi
  - kbn.sai.yoroshiku
  - kbn.sai.subekaraku
  - kbn.sai.nao
  - kbn.sai.nanzo
  - kbn.sai.kyuji
  - kbn.sai.kaeriten-adv
:::

再読文字は、一字を二度読む。一度目は副詞などとしてその場で読み、下のまとまりを読んだ後、二度目の読みへ返る。再読文字の返り点は、二度目の読みに働く。書き下しでは、一度目を漢字、二度目をひらがなにする形が多い。

:::table
caption: 再読文字の形・読み・意味
source: qa/questions.json・kanbun/kuho.json・kanbun/texts.jsonをもとに作成
head:
  - 形・見る箇所
  - 読み・書き下し
  - 意味・確かめること
rows:
  - 未A | 未だAせず | まだAしていない。
  - 将A・且A | 将にAせんとす・且にAせんとす | 今にもAしようとする。Aになりそうである。
  - 当A | 当にAすべし | Aするのが当然だ、Aするべきだ。
  - 応A | 応にAすべし | きっとAするだろう。Aするはずだ。
  - 宜A | 宜しくAすべし | Aするのがよい。
  - 須A | 須らくAすべし | Aする必要がある。
  - 猶A・由A | 猶ほAのごとし・由ほAのごとし | ちょうどAのようである。
  - 盍A | 盍ぞAせざる | どうしてAしないのか。Aしたらどうかと勧める形になる。
:::

:::contrast
left: 将・且の「まさに〜んとす」は、これから起こる動作や変化を述べる。
right: 当・応の「まさに〜べし」は、当然・推量などを述べる。
why: 一度目の読みが同じでも、二度目と意味が違う。当と応も、当然か推量かを文の中で確かめる。
:::

:::mistake
wrong: 将・且・応・猶を見つけたら、使い方を見ずに二度読む。
right: 再読の形と意味になっているかを見る。将は「ひきゐる」、応は「こたふ」、且は「かつ」、猶は一度だけの「なほ」になる場合もある。
why: 再読文字という分類は、その用法で読むときの呼び名である。普通の動詞や副詞として使う文もある。
:::

順に、未の「まだ〜ない」、将の「〜しようとする」、応の「〜するはずだ」を比べる。再読文字の送り仮名は、一度目を右下、二度目を左下に添えて区別する。

:::example
id: rongo-misei
:::

:::example
id: sokou-masani
:::

:::example
id: kokyo-oni
:::
