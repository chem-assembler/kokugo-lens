---
id: comparison
unit: comparison
unitLabel: 漢文
group: 8章
title: 比較と選択
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json 比較・選択の6型・qa/questions.json 比較・選択・kanbun/texts.json
  - README.md 有識者レビューで確定した書き方・2回目の回答で確定したこと
  - 漢文の語法 p.355（於）p.358〜359（不如・不若）p.364〜365（莫如・莫若）p.374〜376（寧・与其）p.380〜383（孰与・孰若）
singleSource: true
why: 比べる二つのものと比較の基準を見つけ、優劣・たとえ・選択を区別して読み下すため。
---

比較では、何と何を、どの点で比べるかを確かめる。選択では、それに加えて、どちらを選ぶのか、どちらがよいかを尋ねるのかを見る。

:::section
anchor: hikaku-shikazu
title: 不如・不若の比較
codes:
  - hikaku-shikazu
  - kbn.kuho.hikaku-shikazu
:::

「A不如B」は、AがBに及ばないことを表す。下にあるBを先に読み、「AはBに如かず」とする。

:::table
caption: どちらがまさるかを読む
source: kanbun/kuho.json hikaku-shikazu・qa/questions.json kbn.kuho.hikaku-shikazuをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A不如B | AはBに如かず | AはBに及ばない。Bのほうがまさる。
  - A不若B | AはBに若かず | AはBに及ばない。Bのほうがまさる。
:::

:::contrast
left: A不如Bは「AはBに如かず」と読み、AとBの優劣を述べる。
right: 莫如Bは「Bに如くは莫し」と読み、Bに及ぶものがないと述べる。
why: 不はAが及ばないことを、莫は及ぶものがないことを表す。どちらもBを高く評価するが、比べる範囲が違う。
:::

:::mistake
wrong: A不如Bを「BはAに及ばない」と訳す。
right: 及ばないのはAであり、まさるのはBである。
why: 書き下しではBを先に読むが、白文のAとBの関係は変わらない。訳す前に、どちらが上かを確かめる。
:::

最初は聞くことと見ること、次は天の時と地の利を比べる。いずれも、後ろに置かれたほうがまさるという文である。

:::example
id: hyakubun
:::

:::example
id: hikaku-tenji
:::

:::section
anchor: hikaku-shikuhanashi
title: 最上
codes:
  - hikaku-shikuhanashi
  - kbn.kuho.hikaku-shikuhanashi
:::

莫・無で「及ぶものはない」と述べると、比べる範囲の中で最もすぐれていることを表す。何の点で最上なのかは、前後の説明から取る。

:::table
caption: 最上を表す形
source: kanbun/kuho.json hikaku-shikuhanashi・qa/questions.json kbn.kuho.hikaku-shikuhanashiをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 莫如A・無如A | Aに如くは莫し・Aに如くは無し | Aに及ぶものはない。
  - 莫若A・無若A | Aに若くは莫し・Aに若くは無し | Aに及ぶものはない。
  - 莫過A・無過A | Aに過ぐるは莫し・Aに過ぐるは無し | Aを超えるものはない。
:::

:::contrast
left: 不如Aは「Aに如かず」であり、あるものがAに及ばないことを表す。
right: 莫如Aは「Aに如くは莫し」であり、Aに及ぶものがないことを表す。
why: 如・若はどちらも「しく」と読むが、上の否定語の働きが違う。不と莫を取り違えない。
:::

:::mistake
wrong: 最上の形なので、必ず「いちばんよい」と訳す。
right: 何の程度を比べているかを確かめ、「最も詳しい」「最もひどい」などと取る。
why: 程度が上であることと、よい評価であることは別である。悪い行いの程度を比べる文もある。
:::

最初は書物の説明の詳しさを、次は物を粗末にする程度を比べる。同じ最上の形でも、評価の向きは異なる。

:::example
id: mq-bunkan-honzou
:::

:::example
id: mq-riennso-sugiru
:::

:::section
anchor: hikaku-oite
title: 於・于による比較
codes:
  - hikaku-oite
  - kbn.kuho.hikaku-oite
:::

性質や程度を表す語の後ろに於・于が続くと、比べる相手を示すことがある。その相手に「より」「よりも」を添えて読む。

:::table
caption: 比較の基準を読む形
source: kanbun/kuho.json hikaku-oite・qa/questions.json kbn.kuho.hikaku-oiteをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A、C於B・A、C于B | AはBよりもC | AはBと比べて、Cの程度が上である。
  - A不必C於B | Aは必ずしもBよりCならず、など | AがBよりCであるとは限らない。
:::

:::contrast
left: 比較の於は、比べる基準を「より」に表す。
right: 受身の於は、動作をする側を「に」に表す。場所や出所を示す於もある。
why: 於の一字だけでは働きは決まらない。前の動詞や性質を表す語と、後ろの語の関係を確かめる。
:::

:::mistake
wrong: 於をすべて「に於いて」と読み、場所として訳す。
right: 赤さ・強さなどの程度を比べているなら、「より」と読む。
why: 比較の基準を場所に変えると、何と何を比べる文かが分からなくなる。
:::

最初は紅葉と花の赤さ、次は政治と虎の恐ろしさを比べる。最後の問題では、前の於は染料の出所、後ろの於は青さの比較を示す。

:::example
id: sanko-momiji
:::

:::example
id: kasei-takeshi
:::

:::example
id: junshi-aoku
:::

:::section
anchor: hikaku-gotoshi
title: 比況
codes:
  - hikaku-gotoshi
  - kbn.kuho.hikaku-gotoshi
:::

比況は、あるものを別のものにたとえる言い方である。如・若は「ごとし」と読み、たとえる相手を先に読む。

:::table
caption: 如・若・猶の比況
source: kanbun/kuho.json hikaku-gotoshi・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A如B・A若B | AはBのごとし | AはBのようである。
  - A猶B | Aは猶ほBのごとし | AはちょうどBのようである。
:::

:::contrast
left: 如・若を「ごとし」と読む形は、似ているものにたとえる。
right: 不如・不若を「しかず」と読む比較は、一方がもう一方に及ばないことを述べる。
why: たとえなのか、優劣を述べるのかを見る。如・若という字が共通するだけで意味まで同じにはならない。
:::

:::contrast
left: 比況の猶は「なほ〜のごとし」と二度読む再読文字である。
right: 抑揚の猶は「なほ」と一度読み、後ろの「況んや〜をや」とつながる。
why: 「ごとし」でたとえを結ぶのか、「まして」と程度を進めるのかを確かめる。
:::

:::mistake
wrong: 助動詞として読む如・若を、書き下しに漢字のまま残す。
right: 「ごとし」「ごとき」など、ひらがなで書く。
why: 「如かず」「若かず」の如・若は「しく」という動詞だが、たとえを表す「ごとし」は助動詞である。
:::

最初は霜を雪にたとえる。次は、やり過ぎることを足りないことにたとえ、猶を「なほ〜のごとし」と読む。

:::example
id: keirin-3
:::

:::example
id: rongo-sugitaru
:::

:::section
anchor: sentaku-yoriha
title: 与其・寧による選択
codes:
  - sentaku-yoriha
  - kbn.kuho.sentaku-yoriha
:::

選択の文は、二つのあり方を並べて、どちらを取るかを述べる。与其で先に挙げたものを退けて後ろを選ぶ形と、寧で先に選ぶものを示す形がある。

:::table
caption: 選ぶ側と退ける側
source: kanbun/kuho.json sentaku-yoriha・漢文の語法 p.374〜376をもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 与其A寧B | 其のAせんよりは寧ろBせよ | Aするよりは、むしろBせよ。Bを選ぶ。
  - 寧A無B | 寧ろAするともBする無かれ | むしろAしても、Bしてはならない。Aを選ぶ。
  - 寧A不B | 寧ろAするともBせず | むしろAしても、Bしない。Aを選ぶ。
:::

:::contrast
left: 与其A寧Bでは、Aを退けてBを取る。
right: 寧A無Bでは、Aを取ってBを退ける。
why: 寧がどちらに付くかを確かめる。文字の順にA・Bを置いたからといって、いつでも後ろを選ぶわけではない。
:::

:::mistake
wrong: 与其を「其と」と読み、二つを並べただけの文として訳す。
right: 「其の〜んよりは」と読み、避けるほうを示すまとまりとして取る。
why: 与其は選択の形を作る。寧の付く側と、否定・禁止を表す側を最後まで見て、何を勧める文かを決める。
:::

最初は奢ることより倹約を選ぶ。次は牛後になることを退け、鶏口になることを選ぶ。選ぶ側が白文の前か後ろかを比べる。

:::example
id: sentaku-ken
:::

:::example
id: keiko-gyugo
:::

:::section
anchor: sentaku-izureka
title: 孰与・孰若の「いづれぞ」
codes:
  - sentaku-izureka
  - kbn.kuho.sentaku-izureka
:::

孰与・孰若は、二字をまとめて「いづれぞ」と読む熟字訓である。基本は、比べる相手を先に読む「AはBに孰与ぞ」という形になる。

:::table
caption: 二字をまとめて読む形
source: kanbun/kuho.json sentaku-izureka・README.md 有識者レビューで確定した書き方をもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A孰与B | AはBに孰与ぞ | AはBと比べてどうか。
  - A孰若B | AはBに孰若ぞ | AはBと比べてどうか。
:::

:::contrast
left: 孰与・孰若は二字で「いづれぞ」と読み、返り点も二字をつなぐ熟語返りにする。
right: 一字の与は、「と」「ともに」などと読み、相手や並列を示す。
why: 孰与の与を一字の前置詞に分けない。「AとBといづれぞ」を基本の読みとして当てはめない。
:::

:::mistake
wrong: 「孰与君少長」を「君と少長孰与ぞ」と読む。
right: 「君の少長に孰与ぞ」と読む。君少長は「あなたの年齢」というまとまりである。
why: 君が少長を修飾する。修飾語が先、修飾される語が後という順序を保ち、君だけを取り出して「と」を付けない。
:::

疑問・反語・詠嘆のどれとして取るかは、文意から判断する。孰与・孰若の字だけで、話し手が本当に答えを求めていると決めない。

最初は項伯と相手の年齢を比べる文で、項伯は省かれている。次は廉将軍と秦王を比べる。どちらも、比較の相手を読んでから孰与に返る。

:::example
id: sentaku-izureka
:::

:::example
id: shiki-izureka
:::
