---
id: condition
unit: condition
unitLabel: 漢文
group: 7章
title: 仮定
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json 仮定の3型・qa/questions.json 仮定・kanbun/texts.json
  - 漢文の語法 p.305（如・若）p.311〜314（雖・縦・使・苟）
singleSource: true
why: 条件を置く部分と、その条件を受けた結論を分け、順接の仮定と譲歩の読み方を確かめるため。
---

仮定の文では、どこまでが条件で、どこからが結論かを分ける。「もしそうなら」と続くのか、「たとえそうでも」と続くのかで、二つの部分のつながりが変わる。

:::section
anchor: katei-moshi
title: 如・若の「もし」
codes:
  - katei-moshi
  - kbn.kuho.katei-moshi
:::

如・若を「もし」と読み、後ろの事柄を仮に置く。その条件を受けた結論が、則などに導かれて続くことがある。

:::table
caption: 条件と結論をつなぐ形
source: kanbun/kuho.json katei-moshi・qa/questions.json kbn.kuho.katei-moshiをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 如A、B・若A、B | 如しAせば、B・若しAせば、B | もしAするならば、Bである。
  - 如A則B・若A則B | 如しAせば則ちB・若しAせば則ちB | もしAするならば、その場合はBである。
  - 使A、B | 使しAせば、B | もしAするならば、Bである。
:::

:::contrast
left: 仮定の如・若は「もし」と読み、条件の内容より前に置く。
right: 比況の如・若は「ごとし」と読み、たとえる相手を先に読んで返る。
why: 条件と結論の関係か、二つのものを似ていると述べる関係かを見る。白文の同じ字に、いつも同じ読みを当てない。
:::

:::contrast
left: 使を使役で読むときは、「AをしてBせしむ」となる。
right: 使を仮定で読むときは「もし」となり、後ろに仮の条件が続く。
why: 誰かに動作をさせる文か、ある場合を仮に考える文かを確かめる。使の字だけで使役と決めない。
:::

:::mistake
wrong: 「もし」があるのに、後ろをすべて既に起きた事実として訳す。
right: 条件の終わりを探し、「もし〜ならば」と結論につなぐ。
why: 条件を事実と取り違えると、話し手が何を仮に置いたかが分からなくなる。条件の否定も落とさない。
:::

最初は如、次は使を「もし」と読む。最後は否定を含む条件であり、「詩が完成しないならば」と取る。

:::example
id: katei-moshi
:::

:::example
id: mq-riennso-moshi
:::

:::example
id: toriden-batsu
:::

:::section
anchor: katei-iyashikumo
title: 苟の「いやしくも」
codes:
  - katei-iyashikumo
  - kbn.kuho.katei-iyashikumo
:::

苟は「いやしくも」と読み、「かりにも〜ならば」と条件を置く。後ろの結論を述べるために、どの条件を取り上げているかを確かめる。

:::table
caption: 苟で条件を示す形
source: kanbun/kuho.json katei-iyashikumo・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 苟A、B | 苟くもAせば、B | かりにもAするならば、Bである。
  - 苟非A、B | 苟くもAに非ざれば、B | かりにもAでないならば、Bである。
:::

:::contrast
left: 如・若の「もし」は、ある事柄を仮の条件として示す。
right: 苟の「いやしくも」も条件を示し、とくに「かりにもそうであるなら」と、その条件を取り立てる。
why: 読みの違いだけでなく、何を条件に結論を述べるかを見る。苟を使う文でも、条件と結論を分ける手順は同じである。
:::

:::mistake
wrong: 苟くもを「卑しいことに」と訳す。
right: 仮定を表す場合は「かりにも〜ならば」と訳す。
why: この形は人や行いの卑しさを述べていない。「いやしくも」という日本語の響きから意味を決めない。
:::

最初は仁を目指すことを条件とする。次は自分の持ち物ではないことを条件にして、取ってはならないと述べる。後半の「一毫と雖も」は、ほんの少しでも、という譲歩である。

:::example
id: katei-iyashikumo
:::

:::example
id: sekiheki-iyashikumo
:::

:::section
anchor: katei-iedomo
title: 逆接の仮定（譲歩）
codes:
  - katei-iedomo
  - kbn.kuho.katei-iedomo
:::

譲歩は、前半の事柄を認めたうえで、それでも変わらない結論を述べる。実際の事実を認める場合と、仮のこととして認める場合がある。

:::table
caption: 雖・縦で譲歩を表す形
source: kanbun/kuho.json katei-iedomo・漢文の語法 p.311〜312をもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 雖A、B | Aと雖も、B | Aであるけれども、それでもBである。仮定なら「たとえAでも」と取る。
  - 縦A、B | 縦ひAとも、B | たとえAであっても、Bである。
:::

:::contrast
left: 如A、Bは「もしAならばB」と、条件を受けて結論を述べる。
right: 雖A、Bは「たとえAでもB」「AではあるがB」と、Aを認めても結論は変わらないことを述べる。
why: Aからふつう予想する内容と、Bの内容を比べる。雖があるから必ず未来の仮定になる、とは決めない。
:::

:::mistake
wrong: 雖を文頭で先に読み、その直後の一語だけを受ける。
right: 雖の下のどこまでが譲歩の内容かをまとめ、その後で「といへども」と返って読む。
why: 一語を受ける場合も、主語と述語を含む長い部分を受ける場合もある。文のまとまりに合わせて返る。
:::

最初は死を仮に置いても子が残るという文である。次は骨董を小事と認めたうえで、良し悪しの区別はあると述べる。最後は命令しても従われないという譲歩である。

:::example
id: gukou-iedomo
:::

:::example
id: mq-zaien-kottou
:::

:::example
id: katei-iedomo
:::
