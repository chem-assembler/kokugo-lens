---
id: passive-causative
unit: passive-causative
unitLabel: 漢文
group: 6章
title: 受身と使役
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json 使役・受身の6型・qa/questions.json 使役・受身・kanbun/texts.json
  - 漢文の語法 p.330〜331（見・被）p.335〜336（為・所）p.388〜391（使・令）
singleSource: true
why: 動作をさせる側・する側・受ける側を分け、白文の形から使役と受身の読み方を確かめるため。
---

使役では「誰が誰に何をさせるか」、受身では「誰が誰から何をされるか」を確かめる。同じ動詞でも、主語がする側か受ける側かで訳が変わる。

:::section
anchor: shieki-shimu
title: 使・令による使役
codes:
  - shieki-shimu
  - kbn.kuho.shieki-shimu
:::

「使」「令」の後ろに、動作をする相手と、させる内容が続く。相手を先に読み、内容を読んでから「しむ」で結ぶ。

:::table
caption: 使・令の形と読み
source: kanbun/kuho.json shieki-shimu・qa/questions.json kbn.kuho.shieki-shimuをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 使AB | AをしてBせしむ | AにBさせる。
  - 令AB | AをしてBせしむ | AにBさせる。
:::

:::contrast
left: 使ABも令ABも、使役の助字として使うときは「AをしてBせしむ」と読む。
right: 命ABは「Aに命じてBせしむ」と読み、命令する動詞そのものを残す。
why: 使役を表す助字か、命令などの動作を表す動詞かを分ける。使・令をいつでも「つかふ」「れいす」と読むわけではない。
:::

:::mistake
wrong: 「AをしてBせしむ」を、AがBをさせるという意味に取る。
right: AはBをする側である。Aにそうさせる人物は、使・令より前や前後の文から探す。
why: 「をして」は動作をさせる相手に付く。「させる人」と「する人」を取り違えない。
:::

最初は鑑定させる文、次は璧を持って帰らせる文である。使と令の字は違っても、相手に「をして」、動作に「しむ」が付く。

:::example
id: shieki-reiou
:::

:::example
id: shieki-heki
:::

:::section
anchor: shieki-doushi
title: 命令などの動詞による使役
codes:
  - shieki-doushi
  - kbn.kuho.shieki-doushi
:::

「命」「召」などを動詞として読み、その後ろの動作に「しむ」を添える。命じること、呼ぶことと、相手にさせることを分けて取る。

:::table
caption: 動詞を読む使役
source: kanbun/kuho.json shieki-doushi・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 命AB | Aに命じてBせしむ | Aに命じてBさせる。
  - 召AB | Aを召してBせしむ | Aを呼んでBさせる。
  - 遣AB | Aを遣はしてBせしむ | Aを派遣してBさせる。
:::

:::contrast
left: 使役の助字としての使・令は、「しむ」として書き下す。
right: 命・召・遣を動詞として読む場合は、「命じて」「召して」「遣はして」という動作も書き下す。
why: どちらも相手に動作をさせるが、動詞で述べられた命令や派遣の意味を落とさない。遣などには、助字として読む場合もある。
:::

:::mistake
wrong: 命・召を読んだところで区切り、後ろは同じ主語の動作として訳す。
right: 命じられた人・呼ばれた人が、次の動作をするのかを確かめる。
why: 文末の「しむ」まで含めて使役である。命じる人と、命じられた動作をする人は別になる。
:::

最初は記録係を呼んで書かせる文、次は子封に命じて戦車を率いさせ、攻めさせる文である。

:::example
id: shiki-goshi
:::

:::example
id: saden-shifu
:::

:::section
anchor: shieki-woshite
title: 使役字を伴わない使役
codes:
  - shieki-woshite
  - kbn.kuho.shieki-woshite
:::

使・令がなくても、動詞を「人や物をそうさせる」という意味で使うことがある。主語と動作の対象を見て、誰が動くのかを確かめる。

:::table
caption: 使役字がないときの読み
source: kanbun/kuho.json shieki-woshite・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 動詞＋A（使・令なし） | AをBせしむ・AをしてBせしむ | Aにその動作をさせる。
  - 状態を表す語＋A（使・令なし） | Aを苦しめ、など | Aをその状態にする。
:::

:::contrast
left: 使ABでは、使が使役の手がかりになる。
right: 使役字のない形では、動詞と対象の関係から「そうさせる」と読む。「をして」を必ず添えるわけではない。
why: 「AをBせしむ」のほか、「Aを苦しめる」のように他動詞で表す読みもある。書き下しの字数だけでは判定できない。
:::

:::mistake
wrong: 使・令がないので、主語自身が舞ったり泣いたりすると訳す。
right: 動作の後ろの人や物が、舞わされたり泣かされたりする関係かを見る。
why: 使役字の有無と、使役の意味の有無は同じではない。前後の文から、何がその動作を引き起こすかを確かめる。
:::

最初は心を苦しませる意味を「苦しめ」で表す。次は笛の音の力を述べ、竜を舞わせ、女性を泣かせる意味を「舞はしめ」「泣かしむ」で表す。

:::example
id: moshi-kokorozashi
:::

:::example
id: sekiheki-mau
:::

:::section
anchor: ukemi-ru
title: 見・被による受身
codes:
  - ukemi-ru
  - kbn.kuho.ukemi-ru
:::

受身の見・被は、動作を受けることを示す助字である。下の動詞を先に読み、「る」「らる」を添える。

:::table
caption: 見・被の形と読み
source: kanbun/kuho.json ukemi-ru・qa/questions.json kbn.kuho.ukemi-ruをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 見A・被A | Aせらる・Aさる、など | Aという動作を受ける。
  - 見A於B | BにAせらる、など | BからAという動作を受ける。
:::

:::contrast
left: 見Aの見は、受身の助字なら「る・らる」と書き下す。
right: 為A所Bは「AのBする所と為る」と読み、為・所の字を残す。
why: 意味はどちらも受身だが、書き下しの形は違う。見を「見る」と読んだり、為・所を消したりしない。
:::

:::mistake
wrong: 見があるので、主語がその動作を見ると訳す。
right: 見が受身の助字か、見る動作を表す動詞かを確かめる。
why: 疑う・謗るなどの動作を主語が受けているなら受身である。「る・らる」の形は、下の動詞の活用に合わせる。
:::

最初の問題で、見と被のどちらも受身になることを確かめる。次の問題では、於の後ろの王が欺く側であり、臣が欺かれる側である。

:::example
id: ukemi-utagau
:::

:::example
id: kanpeki-azamukare
:::

:::section
anchor: ukemi-oite
title: 於・于で動作の主を示す受身
codes:
  - ukemi-oite
  - kbn.kuho.ukemi-oite
:::

動詞の後ろの於・于が、動作をする側を示すことがある。主語がその動作を受けるなら、「BにAせらる」などと読む。

:::table
caption: 動作をする側と受ける側
source: kanbun/kuho.json ukemi-oite・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A於B・A于B | BにAせらる、など | 主語がBからAという動作を受ける。
  - 見A於B | BにAせらる、など | 見も受身を示し、Bが動作をする側になる。
:::

:::contrast
left: 受身のA於Bでは、Bは動作をする側であり、「Bに」と読む。
right: 比較のA於Bでは、Bは比べる基準であり、「Bより」と読む。
why: 於の下が人だから必ず受身、とは決められない。主語が何をされるのか、何の程度を比べるのかを文全体で見る。
:::

:::mistake
wrong: 於を読まないので、その後ろの語と動詞の関係も省く。
right: 動作をする側の語に「に」を添え、動詞を受身で読む。
why: 置き字にも働きがある。於の字を声に出さなくても、誰から動作を受けるかは訳に表す。
:::

最初は他人に治められる文、次は他人に養われる文である。どちらも、於の後ろの人が動作をする側になる。

:::example
id: ukemi-osamu
:::

:::example
id: ukemi-yashinaharu
:::

:::section
anchor: ukemi-tokoro
title: 為A所Bの受身
codes:
  - ukemi-tokoro
  - kbn.kuho.ukemi-tokoro
:::

「為A所B」では、AがBという動作をする。主語はその動作を受ける側であり、「AのBする所と為る」と読む。

:::table
caption: 為と所を組み合わせる受身
source: kanbun/kuho.json ukemi-tokoro・qa/questions.json kbn.kuho.ukemi-tokoroをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 為A所B | AのBする所と為る | AにBされる。
:::

:::contrast
left: 為A所Bは「AのBする所と為る」と読み、Aから動作を受けることを表す。
right: 所Bだけなら、「Bする所」というまとまりであり、為と組む受身とは限らない。
why: 所の字だけで受身と決めない。為とのつながりと、主語が動作を受ける関係を確かめる。
:::

:::mistake
wrong: 「所」を建物や場所、「為る」をそこへ移ることとして訳す。
right: 全体を「AにBされる」と取る。
why: この所は具体的な場所を指していない。誰が誰に何をされるかに置き換えると、受身の関係が分かる。
:::

最初は家が奪われる文である。次は前半の「人を制す」と後半の受身を比べ、する側とされる側が変わることを確かめる。

:::example
id: mq-chihoku-taku
:::

:::example
id: shiki-sakinzureba
:::
