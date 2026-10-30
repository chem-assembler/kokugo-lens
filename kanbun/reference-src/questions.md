---
id: questions
unit: questions
unitLabel: 漢文
group: 4章
title: 疑問と反語
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json・qa/questions.json 疑問と反語の8項目・kanbun/texts.json
  - README.md 2回目の回答で確定したこと（2026-10-14）
  - 漢文の語法 p.535〜540（文意と疑問詞）p.547〜550（反語）p.553〜560（何如・如何・奈何）
singleSource: true
why: 白文の疑問詞と文末を手がかりにし、答えを求める疑問か、反対の判断を述べる反語かを文意から決めるため。既存問題の読みと訳を確かめ、似た形を比べる。
---

:::section
anchor: context
title: 文意から問いの意味を取る
:::

まず、誰が何を述べているかを読む。答えを求めているのか、問いの形で自分の判断を強く述べているのかを、前後の話から確かめる。

:::table
caption: 問いの形から意味を取る
source: README.md 2回目の回答・漢文の語法 p.535・547〜550をもとに作成
head:
  - 形の例
  - 書き下しの例
  - 文意から取る意味
rows:
  - 何A | 何ぞAする | 疑問なら、どうしてAするのかと理由を尋ねる。
  - 豈A乎 | 豈にAせんや | 反語なら、Aするだろうか、いやAしないと判断を述べる。
  - 不A乎 | Aせざるか・Aせざらんや | 疑問ならAしないのかと尋ね、反語ならAしないはずがあろうかと肯定する。
:::

:::contrast
left: 疑問は、まだ分からない内容について答えを求める。
right: 反語は、問いの形を使い、そのまま肯定した内容とは反対の判断を述べる。
why: 白文の同じ字が、疑問・反語・詠嘆のいずれにも使われる。文末の読みは判断の手がかりになるが、文意を読まずに決めてはいけない。
:::

:::mistake
wrong: 乎があれば疑問、哉があれば反語と、文末の一字で決める。
right: 文全体で何を言おうとしているかを確かめ、その意味に合う読みと訳を作る。
why: 乎・哉などの字は、文の種類と一対一に対応していない。否定語があるときは、何が否定されているかも見る。
:::

最初は数が足りるかという質問、次は急に泳げるようにはならないという反語である。

:::example
id: sokou-taruka
:::

:::example
id: hango-ani
:::

:::section
anchor: gimon-nanzo
title: 疑問
codes:
  - gimon-nanzo
  - kbn.kuho.gimon-nanzo
:::

「何」などを「なんぞ」と読むときは、どの動作の理由を尋ねているかを見る。下に不があれば、「しない理由」を尋ねる形にもなる。

:::table
caption: 理由を尋ねる形
source: kanbun/kuho.json gimon-nanzo・qa/questions.json kbn.kuho.gimon-nanzo・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 何A | 何ぞAする | どうしてAするのか。
  - 奚A・胡A・曷A | 奚ぞAする・胡ぞAする・曷ぞAする | どうしてAするのか。いずれも「なんぞ」と読む形がある。
  - 何不A | 何ぞAせざる | どうしてAしないのか。
  - 何為不A也 | 何為れぞAせざるや | どういうわけでAしないのか。何為れぞは「なんすれぞ」と読む。
:::

:::contrast
left: 何Aは、Aする理由を尋ねる形になる。
right: 何不Aは、Aしない理由を尋ねる形になる。文意によっては、Aするよう勧める意味も含む。
why: 不を落とすと、尋ねている内容が逆になる。実際に理由を聞く場面か、行動を促す場面かも確かめる。
:::

:::mistake
wrong: 何をすべて「なに」と読み、物の名前を尋ねる文にする。
right: 理由を尋ねるときは「なんぞ」などと読む。何を問う語なのかを、後ろの語とのつながりから取る。
why: 「何をするか」と「どうしてするか」は、求めている答えが違う。
:::

最初は土地を去らない理由、次は悲しそうに泣く理由を尋ねる。

:::example
id: raiki-nanisure
:::

:::example
id: kanpi-nanzo
:::

:::section
anchor: gimon-tare
title: 疑問
codes:
  - gimon-tare
  - kbn.kuho.gimon-tare
:::

「誰」「孰」は、人や、いくつかの対象のうちどれかを問う。人を表す語でも、答えを求めず「誰もいない」と述べる反語になることがある。

:::table
caption: 人や対象を問う語と読み
source: kanbun/kuho.json gimon-tare・README.md 有識者レビュー・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 誰A | 誰かAする | 誰がAするのか。誰は「たれ」と読む。
  - 孰A | 孰かAする | 誰が、またはどれがAするのか。孰は「たれ」「いづれ」と読む。
  - 孰能A | 孰か能くAせん | 誰がAできようか。反語なら、誰もできないという意味になる。
  - 孰与B | Bに孰与ぞ | Bと比べてどうか。孰与の二字で「いづれぞ」と読む。
:::

:::contrast
left: 一字の孰は、「たれ」「いづれ」と読む疑問の語である。
right: 孰与・孰若は、二字をまとめて「いづれぞ」と読む熟語である。
why: 孰与を「孰」と「与」に分け、与を一字の「と」で読まない。比較する相手は「Bに」と受ける。
:::

:::mistake
wrong: 孰があるので、必ず誰かの名前を答えればよい質問だと考える。
right: 文意を読み、実際に人を尋ねているか、誰にもできないと述べる反語かを分ける。
why: 「孰か能く〜ん」は、できる人がいないという判断を強く表すことがある。
:::

最初は、迷いのない者など誰もいないという反語である。次は二字の孰与を使い、項伯と相手の年齢を比べる。「君少長」は相手の年齢を指し、「君の少長に」と読む。

:::example
id: shisetsu-tareka
:::

:::example
id: sentaku-izureka
:::

:::section
anchor: gimon-ikan
title: 疑問
codes:
  - gimon-ikan
  - kbn.kuho.gimon-ikan
:::

「何如」「如何」「奈何」は、二字のまとまりを確かめる。様子を尋ねるのか、どう処置するかを尋ねるのかは、対象と前後の話から取る。

:::table
caption: 様子や処置を尋ねる形
source: kanbun/kuho.json gimon-ikan・漢文の語法 p.553〜560をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - A何如 | Aは何如 | Aはどうであるか。何如は「いかん」と読む。
  - A如何・A奈何 | Aを如何せん・Aを奈何せん | Aをどうしようか。如何・奈何は「いかん」と読む。
  - 如A何・奈A何 | Aを如何せん・Aを奈何せん | Aをどうしようか。二字の間に対象Aが置かれる。
:::

:::contrast
left: 何如は、様子や結果を「どうか」と尋ねる形に使う。
right: 如何・奈何は、対処を「どうしようか」と尋ねる形にも使う。
why: 字の順は手がかりになるが、それだけで意味を固定しない。対象が何か、方法と状態のどちらを尋ねているかを見る。
:::

:::mistake
wrong: 如何・奈何の「せん」を見て、必ず反語と考える。
right: 「どうしようか」と処置を尋ねる疑問でも「いかんせん」と読む。
why: 「ん」だけでは反語と決まらない。Aをどうすればよいか、という問いが文意に合うかを確かめる。
:::

最初は矛で盾を突いたらどうなるかを尋ねる。次はどう処置すべきかを尋ね、最後は奈と何の間に「若」が入り、相手をどうしようかと嘆く。

:::example
id: mujun-ikan
:::

:::example
id: shiki-ikanisen
:::

:::example
id: gaika-gu
:::

:::section
anchor: gimon-ka
title: 文末の疑問
codes:
  - gimon-ka
  - kbn.kuho.gimon-ka
:::

何・誰などがなくても、文末の助字によって問いの形になる。述語が何を表すかを読み、何について答えを求めているかを見る。

:::table
caption: 文の終わりで問いを表す形
source: kanbun/kuho.json gimon-ka・qa/questions.json kbn.kuho.gimon-ka・漢文の語法 p.535〜537をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - A乎 | Aするか | Aするのか。
  - A与・A邪・A耶 | Aするか・Aするや | Aするのか。文の調子に合わせて読む。
  - 不A乎 | Aせざるか | Aしないのか。疑問なら、否定を含む内容を確かめる。
:::

:::contrast
left: A乎を「Aするか」と読み、答えを求めていれば疑問である。
right: 同じ文末の助字でも、「Aせんや」と読んで反対の判断を述べる反語になることがある。
why: 助字の前の否定語と、前後の話も合わせて見る。乎を見た時点で、訳を一つに決めない。
:::

:::mistake
wrong: 乎・与・邪を置き字として消し、問いの意味も落とす。
right: 疑問の助字は、書き下しでは「か」「や」とひらがなにし、問いの意味を残す。
why: 漢字を残さないことと、働きを無視することは違う。
:::

最初は数が足りるか、次は弓の心得があるかを相手に尋ねる。

:::example
id: sokou-taruka
:::

:::example
id: baiyu-shiruka
:::

:::section
anchor: hango-ani
title: 反語
codes:
  - hango-ani
  - kbn.kuho.hango-ani
:::

「豈に〜んや」と読む反語では、問いの形で強い否定を述べる。豈は「あに」と読む。否定する内容を最後まで確かめて訳す。

:::table
caption: 豈を用いる反語
source: kanbun/kuho.json hango-ani・qa/questions.json kbn.kuho.hango-ani・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 豈A乎 | 豈にAせんや | どうしてAするだろうか、いやAしない。
  - 豈A哉 | 豈にAせんや | どうしてAだろうか、いやAではない。
  - 豈特A而已 | 豈に特だAのみならんや | どうしてただAだけだろうか、いやAだけではない。
:::

:::contrast
left: 豈A乎を反語と取れば、「Aするだろうか、いやしない」と訳す。
right: 豈不A哉を詠嘆と取れば、「なんとAではないか」とAを認める意味になる。
why: 豈があるという共通点だけで同じ訳にしない。不の有無、文末の読み、述べている内容を合わせて確かめる。
:::

:::mistake
wrong: 豈があるので、後ろの内容は何でも「できない」と訳す。
right: 文中の動作や判断に合わせ、「しない」「そうではない」「それだけではない」などと取る。
why: 反語が常に能力の不足を表すわけではない。何を否定しているかを保つ。
:::

最初は急に泳ぎが上手になるはずがないという文、次は遠いとは思わないという文である。

:::example
id: hango-ani
:::

:::example
id: hango-senri
:::

:::section
anchor: hango-izukunzo
title: 反語
codes:
  - hango-izukunzo
  - kbn.kuho.hango-izukunzo
:::

「安」「焉」などを「いづくんぞ」と読むときも、反語かどうかを文意から決める。反語では、どうしてそういえようかという否定を表す。

:::table
caption: 安・焉などを用いる反語
source: kanbun/kuho.json hango-izukunzo・漢文の語法 p.539・549をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 安A・焉A | 安くんぞAせん・焉くんぞAせん | どうしてAするだろうか、いやAしない。
  - 安能A・焉能A | 安くんぞ能くAせん・焉くんぞ能くAせん | どうしてAできようか、いやできない。
  - 安A乎・焉A乎 | 安くんぞAせんや・焉くんぞAせんや | 文末にやを添える反語の形である。
  - 寧不能A耶 | 寧ぞAすること能はざらんや | どうしてAできないだろうか、いやできる。寧ぞは「なんぞ」と読む。
:::

:::contrast
left: 安などが場所を尋ねるときは、「いづくにか」などと読み、どこかという答えを求める。
right: 「いづくんぞ〜ん」を反語と取るときは、後ろの内容を強く否定する。
why: 同じ字でも、場所についての問いか、ある判断を否定する文かで読みが違う。安をいつも「安らか」と読まない。
:::

:::mistake
wrong: 末尾に「や」がないので、反語ではないと考える。
right: 「焉くんぞ〜ん」のように、「や」を伴わない反語も読む。
why: 「や」の有無だけで決めない。答えを求める場面か、できないことなどを述べる場面かを見る。
:::

最初は死について分かるはずがないという文、次は鶏をさばくのに大きな包丁は不要だという文である。最後は否定を含み、取り上げることもできるという肯定になる。

:::example
id: rongo-izukunzo
:::

:::example
id: hango-gyuto
:::

:::example
id: mq-ryosai-ubau
:::

:::section
anchor: hango-nanzo
title: 反語
codes:
  - hango-nanzo
  - kbn.kuho.hango-nanzo
:::

「何ぞ」を使う反語は、理由を尋ねる疑問と字の形が重なる。Aする理由がない、Aする必要がないなど、文意に合う判断を取る。

:::table
caption: 何を用いる反語
source: kanbun/kuho.json hango-nanzo・qa/questions.json kbn.kuho.hango-nanzo・kanbun/texts.jsonをもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - 何A乎・何A哉 | 何ぞAせんや | どうしてAするだろうか、いやAしない。
  - 何A | 何ぞAせん | どうしてAするだろうか。反語なら、しないという意味を取る。
  - 何A為 | 何ぞAせんや・何ぞAすることを為さん | どうしてAする必要があろうか、いや必要はない。
:::

:::contrast
left: 「何ぞAする」を疑問と取れば、Aする理由を尋ねる。
right: 「何ぞAせんや」を反語と取れば、Aする理由や必要がないと述べる。
why: 書き下しでは文末の違いを見る。白文を読むときは、前後の話からどちらの意味かを判断して読みを選ぶ。
:::

:::mistake
wrong: 何不Aのように不を含む形も、反語なら必ずAを否定する。
right: 反語では、問いの内容全体と反対の判断を取る。不Aを否定するなら、Aを認める意味になる。
why: 否定語を途中で落とすと意味が逆になる。まず、何についての問いかをひとまとまりにする。
:::

最初はためらう必要がないという文、次は礼を言われるには及ばないという文である。後者は「何ぞ謝せん」で終わり、「や」を伴わない。

:::example
id: gaishi-omomuku
:::

:::example
id: mq-etsubi-sukuu
:::

:::section
anchor: hango-nya
title: 文末の反語
codes:
  - hango-nya
  - kbn.kuho.hango-nya
:::

豈・何などがなくても、文末の助字を伴う文が反語になることがある。肯定の内容を否定するのか、否定の内容を退けて肯定するのかを確かめる。

:::table
caption: 疑問詞を伴わない反語の形
source: kanbun/kuho.json hango-nya・漢文の語法 p.547〜548をもとに作成
head:
  - 形
  - 書き下し
  - 意味
rows:
  - A乎・A哉 | Aせんや | Aするだろうか、いやAしない。
  - 不A乎 | Aせざらんや | Aしないだろうか、いやAする。
  - 非A乎 | Aに非ずや | Aではないか。反語ならAだと強く認める。
:::

:::contrast
left: 「Aするか」は、答えを求める疑問の読みになる。
right: 「Aせんや」「Aせざらんや」は、反語として判断を強める読みになる。「Aに非ずや」は確認にも使う。
why: 同じ字の組み合わせでも、疑問・反語・詠嘆は文意で決まる。「ずや」という語尾だけで種類を固定しない。
:::

:::mistake
wrong: 反語はすべて「いや、〜ない」で終わる否定の訳にする。
right: 否定を含む問いなら、その否定を退けることで肯定を表す場合がある。
why: 「逃げないでいられようか」は、逃げるという意味になる。文中の不や非を落とさずに読む。
:::

最初は、人が鳥にも及ばないでよいはずがないという文である。次は獣がみな逃げるという肯定、最後は曹操が苦しめられた場所だと認める文である。

:::example
id: mq-riennso-tori
:::

:::example
id: kobyu-hashiru
:::

:::example
id: sekiheki-moutoku
:::
