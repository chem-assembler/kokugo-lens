---
id: hitei
unit: hitei
unitLabel: 漢文
group: 3章
title: 否定
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json・qa/questions.json 否定の10項目・kanbun/texts.json
  - README.md 有識者レビューで確定した書き方（2026-10-06）
  - 漢文の語法 p.106〜109（不・非）p.417〜420（未・無・莫・勿）p.432〜434（二重否定）p.447〜449（部分否定）
singleSource: true
why: 否定語より下のまとまりと副詞の位置を確かめ、否定の範囲を保って書き下しと訳を作るため。例は既存問題の読みと訳を照合して選んだ。
---

:::section
anchor: hitei-fu
title: 単純否定
codes:
  - hitei-fu
  - kbn.kuho.hitei-fu
:::

否定語を見つけたら、その下のどの動作や状態を打ち消すかを確かめる。動作を先に読み、否定語に返って「ず」と結ぶ。

:::table
caption: 動作や状態を打ち消す形
source: kanbun/kuho.json hitei-fu・漢文の語法 p.106をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 不A | Aせず | Aしない。
  - 弗A | Aせず | Aしない。不と同じく打ち消しを表す。
  - 不A則B | Aせざれば則ちBす | AしなければBする。ずが条件に応じて変化する。
:::

:::contrast
left: 不Aは、Aという動作や状態を打ち消す。
right: 未Aは「未だAせず」であり、今の時点ではまだ実現していないことを述べる。
why: 不だけに「まだ」という意味を足さない。時点に関わる未の働きと区別する。
:::

:::mistake
wrong: 不の字を残し、「Aせ不」と書く。
right: 打ち消しの助動詞に当たる不・弗は、書き下しでは「ず」「ざる」などとひらがなにする。
why: 文末なら「ず」、後ろにつながる形なら「ざれば」などになる。文のつながりも確かめる。
:::

最初は夜明けに気づかないという否定である。次は、考えなければどうなるかを述べる条件の形である。

:::example
id: shungyo-1
:::

:::example
id: rongo-manabite
:::

:::section
anchor: hitei-mizu
title: 再読文字の否定
codes:
  - hitei-mizu
  - kbn.kuho.hitei-mizu
:::

「未」は、一字を二度読む再読文字である。まず「いまだ」と読み、下の動作を読んだ後に「ず」と読む。

:::table
caption: まだ実現していないことを述べる形
source: kanbun/kuho.json hitei-mizu・漢文の語法 p.417〜418・433をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 未A | 未だAせず | まだAしていない。
  - 未嘗A | 未だ嘗てAせず | これまで一度もAしたことがない。
  - 未能A | 未だAすること能はず | まだAすることができない。
:::

:::contrast
left: 未嘗Aは、これまでAしたことがないと述べる。
right: 未嘗不Aは「未だ嘗てAせずんばあらず」と読み、これまでAしなかったことがないと述べる。
why: 嘗の後ろの不を見落とさない。未が何を否定するかで、経験の否定と、例外のない肯定に分かれる。
:::

:::mistake
wrong: 未を一度だけ「いまだ」と読み、後ろを肯定のままにする。
right: 「未だ」と「ず」をそろえ、まだ実現していない動作をひとまとまりにする。
why: 未に否定の働きも含まれている。「まだ」だけでは意味が完成しない。後で必ず実現する、とまでは述べていない。
:::

最初は生についてまだ知らないこと、次はこれまで一度も将帥を別に置かなかったことを述べる。

:::example
id: rongo-misei
:::

:::example
id: gaishi-imada
:::

:::section
anchor: hitei-nashi
title: 存在の否定
codes:
  - hitei-nashi
  - kbn.kuho.hitei-nashi
:::

「無」は、物や人、事柄が存在しないことを表す。下に動作があるときは、その動作をする人や物がないという意味かを確かめる。

:::table
caption: 存在しないことを述べる形
source: kanbun/kuho.json hitei-nashi・漢文の語法 p.419〜420をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 無A | A無し | Aがない。
  - 無A者 | Aする者無し | Aする人がいない。
  - 莫A | Aするもの莫し | Aする人や物がない。莫は「なし」と読む。
:::

:::contrast
left: 無Aを「A無し」と読めば、存在を否定する。
right: 無Aを「Aすること無かれ」と読めば、行為を禁じる。
why: 白文ではどちらも無が動作の前にある。字の位置だけで決めず、人や物の説明か、相手への戒めかを文意から判断する。
:::

:::mistake
wrong: 無があれば、いつも相手に「するな」と命じていると考える。
right: 何がないのかを先に確かめ、存在の否定と禁止を分ける。
why: 「者無し」は人がいないという説明であり、その人に命令する文ではない。
:::

最初はロバの不在、次は声を立てる者の不在を述べる。

:::example
id: kenro-roba
:::

:::example
id: mq-gusho-sawagu
:::

:::section
anchor: hitei-kinshi
title: 禁止
codes:
  - hitei-kinshi
  - kbn.kuho.hitei-kinshi
:::

禁止は、行為をしないように戒める表現である。起こらないという説明と、してはいけないという戒めを分けて訳す。

:::table
caption: 行為を禁じる形
source: kanbun/kuho.json hitei-kinshi・漢文の語法 p.420・430〜431をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 勿A | Aすること勿かれ | Aしてはいけない。勿は「なかれ」と読む。
  - 無A・莫A・毋A | Aすること無かれ・莫かれ・毋かれ | Aしてはいけない。禁止なら「なかれ」と読む。
  - 不可A | Aすべからず | Aしてはいけない。文意によっては不可能も表す。
  - 休A | Aするを休めよ | Aするのをやめなさい。休は「やめよ」と読む。
:::

:::contrast
left: 不可Aを禁止と取れば、「Aしてはいけない」と訳す。
right: 不可Aを不可能と取れば、「Aすることができない」と訳す。
why: 書き下しはどちらも「べからず」になる。相手の行為を戒めているか、実現できない事情を説明しているかを見る。
:::

:::mistake
wrong: 「なかれ」を「ない」と訳し、実際に行われていないことにする。
right: 禁止では「してはいけない」と訳す。
why: 行為を止める文であり、すでに行ったかどうかの報告ではない。
:::

次の問題は「勿かれ」「べからず」「休めよ」を比べる。いずれも行為を戒める文である。

:::example
id: rongo-hodokosu
:::

:::example
id: shonen-2
:::

:::example
id: keirin-1
:::

:::section
anchor: hitei-nijuu
title: 二重否定
codes:
  - hitei-nijuu
  - kbn.kuho.hitei-nijuu
:::

否定語は**自分より下にだけ**かかる。「無不A」は、まず不が「Aしない」というまとまりを作り、無が「Aしないものはない」と述べる。下から順に意味を組み立てる。

:::table
caption: 否定されるまとまりを重ねて読む形
source: kanbun/kuho.json hitei-nijuu・README.md 有識者レビュー・漢文の語法 p.432〜434をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 無不A・莫不A | Aせざるは無し・莫し | Aしないものはない。みなAする。
  - 非不A | Aせざるに非ず | Aしないわけではない。
  - 不可不A | Aせざるべからず | Aしないことは許されない。Aしなければならない。
  - 不能不A | Aせざる能はず | Aしないではいられない。
  - 未嘗不A | 未だ嘗てAせずんばあらず | これまでAしなかったことはない。いつもAしてきた。
:::

:::contrast
left: 不能Aは「Aすること能はず」であり、Aできないと述べる。
right: 不能不Aは、下の不が「Aしない」を作り、上の不が「Aしないことができる」を否定する。
why: 不能不Aでは、できないのは「Aしないこと」である。不の数だけでなく、それぞれが否定する範囲を見る。
:::

:::mistake
wrong: 二つの否定語が互いに打ち消し合って消えるので、どの形も同じ肯定になる。
right: 下の否定でできたまとまりを、上の否定語がどう打ち消すかを読む。
why: 「みなする」「しないわけではない」「しなければならない」では意味が違う。二重否定を一律に「必ずする」と訳さない。
:::

最初は突き通せない物がないこと、次は年齢を知らずにはすませられないこと、最後は読むたびに腹が立つことを述べる。

:::example
id: mujun-3
:::

:::example
id: rongo-fubo
:::

:::example
id: mq-bunkan-hasshi
:::

:::section
anchor: hitei-bubun
title: 部分否定
codes:
  - hitei-bubun
  - kbn.kuho.hitei-bubun
:::

否定語が常・必などより上にあるときは、「いつもそう」「必ずそう」というまとまりを否定する。すべての場面でAしない、と決めつけない。

:::table
caption: 範囲や確かさを限って打ち消す形
source: kanbun/kuho.json hitei-bubun・漢文の語法 p.107〜108・447〜449をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 不常A | 常にはAせず | いつもAするとは限らない。
  - 不必A | 必ずしもAせず | 必ずAするとは限らない。
  - 不倶A | 倶にはAせず | 両方ともAするわけではない。
  - 未必A | 未だ必ずしもAせず | 必ずAするとはいえない。
:::

:::contrast
left: 不常Aは「常にはAせず」であり、Aする場合があっても、いつもとはいえない。
right: 常不Aは「常にAせず」であり、いつもAしない。
why: 不常では常を含むまとまりを否定し、常不では常が否定のまとまりにかかる。白文の字の順を確かめる。
:::

:::mistake
wrong: 不が副詞より上にあれば、すべて部分否定として訳す。
right: 副詞の意味と文全体を確かめる。不復Aの「復たAせず」は「もうAしない」などの意味になる。
why: 「復た」は、常や必と同じく範囲を表す語ではない。字の位置だけで、訳を「とは限らない」にそろえない。
:::

最初は師が弟子にいつも勝るとは限らないという文、次は名馬を見抜く人がいつの時代にもいるわけではないという文である。

:::example
id: shisetsu-fuhitsu
:::

:::example
id: bakusetsu-tsune
:::

:::section
anchor: hitei-zenbu
title: 全部否定
codes:
  - hitei-zenbu
  - kbn.kuho.hitei-zenbu
:::

常・必などが否定語より上にあるときは、「Aしない」というまとまりを副詞が説明する。部分否定と字の順を比べる。

:::table
caption: 副詞で否定全体を説明する形
source: kanbun/kuho.json hitei-zenbu・漢文の語法 p.107〜108をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 常不A | 常にAせず | いつもAしない。
  - 必不A | 必ずAせず | きっとAしない。
  - 倶不A | 倶にAせず | 両方ともAしない。
:::

:::contrast
left: 不倶Aは、両方そろってAすることを否定する。
right: 倶不Aは、両方それぞれがAしないと述べる。
why: 前者なら一方がAする可能性がある。後者では、どちらもAしない。否定の範囲が違う。
:::

:::mistake
wrong: 必不Aを「必ずしもAしない」と訳す。
right: 「必ずAしない」「きっとAしない」と、否定する判断を強めて訳す。
why: 「必ずしも」は不必Aの読みである。副詞と不の前後を入れ替えない。
:::

次の問題では、他国がきっと救援しないという見通しを述べている。

:::example
id: heigen-kanarazu
:::

:::section
anchor: hitei-arazu
title: 断定の否定
codes:
  - hitei-arazu
  - kbn.kuho.hitei-arazu
:::

「非」は、「Aである」という判断を打ち消す。下の名詞や句を先に読み、「Aにあらず」とつなぐ。

:::table
caption: 何であるかという判断を打ち消す形
source: kanbun/kuho.json hitei-arazu・漢文の語法 p.108〜109をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 非A・匪A | Aに非ず・匪ず | Aではない。「あらず」と読む。
  - 非A者 | Aする者に非ず | Aする者ではない。
  - 非A也 | Aに非ざるなり | Aではないのである。
:::

:::contrast
left: 不Aは、動作や状態そのものを打ち消す。
right: 非Aは、「Aである」という判断を打ち消す。下が動作を述べる句なら「Aするに非ず」とも読む。
why: 非の下が一字の名詞とは限らない。どこまでが判断される内容なのかを確かめる。
:::

:::mistake
wrong: 非を見たので、必ず相手の行為を責める意味にする。
right: まず「〜ではない」という否定の意味を取る。
why: 日本語の「非難」の意味を、そのまま非Aに当てはめない。何と何を区別する文かを見る。
:::

最初は生まれつき知っている者ではないという文、次は悲しんでいる事柄を区別する文である。

:::example
id: rongo-umarenagara
:::

:::example
id: kanpi-etsu
:::

:::section
anchor: hitei-atawazu
title: 不可能
codes:
  - hitei-atawazu
  - kbn.kuho.hitei-atawazu
:::

不可能では、動作をしないことよりも、動作をする力や条件がないことを述べる。できない動作を先にひとまとまりにする。

:::table
caption: できないことを述べる形
source: kanbun/kuho.json hitei-atawazu・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 不能A・弗能A | Aすること能はず | Aすることができない。能は「あたはず」と読む。
  - 不得A | Aすることを得ず | Aすることができない。得は「えず」と読む。
  - 不可A | Aすべからず | Aできない。文意によっては禁止にもなる。
:::

:::contrast
left: 不Aは、Aしないと述べる。
right: 不能Aは、Aできないと述べる。不能不Aなら、Aしないことができず、Aしないではいられないという意味になる。
why: 能の有無と、その下にもう一つ不があるかを確かめる。行為の否定と、可能性の否定を分ける。
:::

:::mistake
wrong: 不能Aを「Aしてはいけない」と訳す。
right: 能力や状況から「Aすることができない」と訳す。
why: 行為を止める命令ではない。「能はず」の前で、何ができないのかを確かめる。
:::

最初は人には見ることができないという文、次は問いに答えられなかったという文である。

:::example
id: mq-etsubi-kishin
:::

:::example
id: mujun-kotafuru
:::

:::section
anchor: hitei-hizunba
title: 否定条件
codes:
  - hitei-hizunba
  - kbn.kuho.hitei-hizunba
:::

「非A不B」は、AでなければBしないという条件を述べる。前半の条件と、後半の結果を分けて読む。

:::table
caption: 否定を含む条件と結果
source: kanbun/kuho.json hitei-hizunba・qa/questions.json kbn.kuho.hitei-hizunba・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 非A不B | Aに非ずんばBせず | AでなければBしない。
  - 非A不B | Aに非ざればBせず | AでなければBしない。条件の読み方が異なる。
  - 非A不能B | Aに非ざればBすること能はず | AでなければBできない。
:::

:::contrast
left: 非不Aは、非が「Aしない」という一つの内容を否定する二重否定である。
right: 非A不Bでは、非はAについての条件、不はBについての結果を作る。
why: 否定語が二つあるという共通点だけでまとめない。条件と結果に分かれるかを確かめる。
:::

:::mistake
wrong: AでなければBしないので、Aなら必ずBすると考える。
right: BするにはAが必要だと読む。Aさえあれば必ずBする、とまではいえない。
why: 条件の向きを逆にしない。「有利でなければ動かない」は、有利ならどんな場合も動くという意味ではない。
:::

最初は行動を起こす条件を並べる。次は、仙人でなければそのようには言えないという文である。

:::example
id: sonshi-hiri
:::

:::example
id: mq-chihoku-senja
:::
