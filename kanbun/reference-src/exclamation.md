---
id: exclamation
unit: exclamation
unitLabel: 漢文
group: 5章
title: 詠嘆
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json・qa/questions.json 詠嘆の4項目・kanbun/texts.json
  - README.md 2回目の回答で確定したこと（2026-10-14）
  - 漢文の語法 p.535（文意による判別）p.547〜552（反語と詠嘆・不亦・何其・夫）
singleSource: true
why: 疑問や反語と同じ字を使う形を比べ、何に驚き、どのような感慨を述べるかを文意から取るため。既存問題の書き下しと訳を照合し、例を選んだ。
---

:::section
anchor: context
title: 文意から感嘆を捉える
:::

詠嘆は、ある事柄への驚きや感慨を表す。何を知りたいのかではなく、何をどう感じているのかを、前後の話から読む。喜びだけでなく、悲しみや嘆きも含む。

:::table
caption: 感慨を表す形と読み
source: kanbun/kuho.json eitan・kanbun/texts.json・漢文の語法 p.535・550〜552をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 嗚呼・嗟夫 | 嗚呼・ああ | ああ、と感慨を表す。嗟夫は二字で「ああ」と読む。
  - 豈不A哉・不亦A乎 | 豈にAせずや・亦たAならずや | 詠嘆なら、なんとAではないかと感慨を述べる。
  - A哉・A夫 | Aなるかな | 詠嘆なら、Aだなあと感慨を添える。
:::

:::contrast
left: 疑問は、分からない内容について答えを求める。
right: 詠嘆は、すでに捉えた事柄への驚きや思いを述べる。問いと同じ形を使うこともある。
why: 疑問・反語・詠嘆は文意で決まる。乎・哉や「ずや」という語尾だけでは決められない。
:::

:::mistake
wrong: 詠嘆なら、すべて「すばらしい」と褒めていると考える。
right: 喜び、痛ましさ、驚きなど、何にどのような思いを述べているかを取る。
why: 感慨の強さと、その事柄をよいと評価することは別である。
:::

最初は文頭の「嗟夫」が嘆きを表し、後半は国史に見るべきものがないという反語になる。次は川の流れへの感慨を「かな」で結ぶ。一つの文にも、異なる表現が組み合わさる。

:::example
id: mq-gozasso-kokushi
:::

:::example
id: eitan-yukumono
:::

:::section
anchor: eitan-anizuya
title: 詠嘆
codes:
  - eitan-anizuya
  - kbn.kuho.eitan-anizuya
:::

「豈不A哉」を詠嘆と取るときは、Aであることへの強い感慨を述べる。豈は「あに」と読み、不を含めて「〜ずや」と結ぶ。

:::table
caption: 豈不を用いる詠嘆
source: kanbun/kuho.json eitan-anizuya・qa/questions.json kbn.kuho.eitan-anizuya・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 豈不A哉 | 豈にAせずや | なんとAではないか。詠嘆としてAであることを認める。
  - 豈不A乎 | 豈にAならずや | なんとAではないか。Aの語の働きに合わせて活用させる。
:::

:::contrast
left: 「豈にAせんや」を反語と取れば、Aではないという否定を述べる。
right: 「豈にAせずや」を詠嘆と取れば、Aであるという肯定に感慨を添える。
why: 不の有無と文末の読みを確かめる。そのうえで、前後の内容から反語か詠嘆かを判断する。
:::

:::mistake
wrong: 豈があるので、後ろのAを必ず否定して訳す。
right: 豈不A哉を詠嘆と取る文では、「なんとAではないか」と感慨を表す。
why: 不を含むまとまりを読み落とさない。何が痛ましいのか、何が誤っているのかという内容を保つ。
:::

最初は痛ましさ、次は誤りへの強い思いを述べる。どちらもAであることを否定しているのではない。

:::example
id: rantei-itamashi
:::

:::example
id: shiki-ayamari
:::

:::section
anchor: eitan-mata
title: 詠嘆
codes:
  - eitan-mata
  - kbn.kuho.eitan-mata
:::

「不亦A乎」は、「亦たAならずや」などと読む。詠嘆では、Aだという思いを、相手にも認めてもらうように述べる。

:::table
caption: 不亦を用いる詠嘆
source: kanbun/kuho.json eitan-mata・qa/questions.json kbn.kuho.eitan-mata・漢文の語法 p.547をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 不亦A乎 | 亦たAならずや | なんとAではないか。Aであることへの感慨を述べる。
  - 不亦A哉 | 亦たAならずや | なんとAではないか。文末の字が哉になる形である。
:::

:::contrast
left: 不亦A乎は、不と亦の組み合わせを保ち、「亦たAならずや」と読む。
right: 豈不A哉は、「豈にAせずや」などと読む。豈と亦では、白文の字も読みも異なる。
why: どちらも感慨を表す場合があるが、読みを混ぜない。Aが形容詞なら「〜からずや」など、活用にも注意する。
:::

:::mistake
wrong: 亦たを「また」と読んだので、必ず同じ出来事をもう一度するという意味にする。
right: 不亦A乎の詠嘆では、まず「なんとAではないか」と文全体の意味を取る。
why: 日本語の「また」から、繰り返しの出来事を勝手に補わない。喜ばしさだけでなく、迷いや愚かさを嘆く場合もある。
:::

最初は学ぶ喜び、次はその評価がもっともだという思い、最後は学問への向き合い方の迷いを述べる。いずれも「不亦」を含むが、感慨の内容は異なる。

:::example
id: hango-mata
:::

:::example
id: mq-gozasso-mube
:::

:::example
id: mq-gozasso-madoi
:::

:::section
anchor: eitan-nanzosore
title: 詠嘆
codes:
  - eitan-nanzosore
  - kbn.kuho.eitan-nanzosore
:::

「何其A也」は、「何ぞ其れAするや」などと読む。何ぞは「なんぞ」、其れは「それ」である。程度や状態の甚だしさへの驚きを文意から取る。

:::table
caption: 何其を用いる詠嘆
source: kanbun/kuho.json eitan-nanzosore・qa/questions.json kbn.kuho.eitan-nanzosore・漢文の語法 p.551をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 何其A也 | 何ぞ其れAするや | 詠嘆なら、なんとAすることかという意味になる。
  - 何其A哉 | 何ぞ其れAなるや | 詠嘆なら、なんとAであることかという意味になる。
:::

:::contrast
left: 何Aは、Aする理由を尋ねる疑問や、Aしないと述べる反語にもなる。
right: 何其A也を詠嘆と取るときは、Aという状態の甚だしさを述べる。
why: 其は形の手がかりになるが、それだけで詠嘆と決まるわけではない。理由の答えを求める文か、驚きを述べる文かを見る。
:::

:::mistake
wrong: 「何ぞ其れ」をいつも「なぜそれが」と訳し、理由と物を尋ねる文にする。
right: 詠嘆として使われるまとまりなら、「なんと〜なことか」と訳す。
why: 其れを指示語の意味だけで処理しない。何其という形と、その後ろの状態を合わせて読む。
:::

最初は衰えへの驚き、次は世間の騒がしさへの感慨を述べる。どちらも理由への答えを求めていない。

:::example
id: reikan-otoroe
:::

:::example
id: soshi-gougou
:::

:::section
anchor: eitan-kana
title: 文末の詠嘆
codes:
  - eitan-kana
  - kbn.kuho.eitan-kana
:::

「哉」「夫」などを「かな」と読むと、前のことばに感慨を添える。感動の中心になる語が先に出て、主語が後ろに続く場合もある。

:::table
caption: かなで感慨を添える形
source: kanbun/kuho.json eitan-kana・qa/questions.json kbn.kuho.eitan-kana・漢文の語法 p.550〜551をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - A哉・A夫 | Aなるかな | Aだなあ。語の働きに応じて活用させる。
  - 如A夫 | Aのごときかな | Aのようであるなあ。助動詞の「ごとし」はひらがなにする。
  - A哉B也 | AなるかなBや | なんとAだなあ、Bは。感慨を先に置く形である。
  - A矣B | AかなBや | なんとAだなあ、Bは。Aは語に合わせて活用させる。矣を「かな」と読む場合もある。
:::

:::contrast
left: 文末の夫を「かな」と読めば、前の内容への感慨を添える。
right: 文頭の夫を「それ」と読む形や、嗟夫を二字で「ああ」と読む形もある。
why: 同じ夫でも、置かれた位置と語のまとまりが異なる。字を見ただけで一つの読みに決めない。
:::

:::mistake
wrong: 哉・夫はすべて「かな」と読み、後ろにある主語は新しい文にする。
right: 文意に合う読みを選び、後ろの語が何を感慨深く述べているのかも確かめる。
why: 哉は疑問や反語にも使う。また「賢なるかな回や」では、賢いと評されているのは後ろの回である。
:::

最初は川の流れへの感慨、次は回の賢さへの感嘆である。最後は相手の物分かりの悪さを強く嘆き、「甚だしいかな」を先に置く。

:::example
id: eitan-yukumono
:::

:::example
id: rongo-kenkai
:::

:::example
id: gukou-hanahadashi
:::
