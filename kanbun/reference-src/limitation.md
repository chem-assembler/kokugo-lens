---
id: limitation
unit: limitation
unitLabel: 漢文
group: 9章
title: 限定・抑揚・累加
source:
  - docs/DESIGN_reference.md §2・§3
  - kanbun/kuho.json 限定・累加・抑揚の6型・qa/questions.json 限定・抑揚・kanbun/texts.json
  - 漢文の語法 p.95〜97（猶・尚・且）p.99（又）p.143（唯）p.530（非独）p.629〜631（況）
singleSource: true
why: 範囲を限る表現と、さらに加える表現を区別し、抑揚の前提と結論をつないで読むため。
---

限定は「それだけ」と範囲を限る。累加は「それだけでなく」と範囲を広げる。抑揚は「それでさえそうなのだから、まして」と、先の事柄を根拠に次の事柄を強める。

:::section
anchor: gentei-tada
title: 唯・惟・但の「ただ」
codes:
  - gentei-tada
  - kbn.kuho.gentei-tada
:::

唯・惟・但などは、後ろのどの語を取り立てるかを確かめる。人を限るのか、物を限るのか、動作全体を限るのかで訳し方が変わる。

:::table
caption: 範囲を限る副詞
source: kanbun/kuho.json gentei-tada・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 唯A耳・惟A耳 | 唯だAのみ・惟だAのみ | ただAだけである。
  - 唯A・惟A・但A | 唯だA・惟だA・但だA | Aだけに範囲を限る。耳がなくても限定になる。
  - 独A | 独りA | 人や物を取り立てる場合、「ただAだけ」という意味になる。
:::

:::contrast
left: 唯A耳は「唯だAのみ」と読み、Aだけに範囲を限る。
right: 不唯A亦Bは「唯だにAのみならず、亦たB」と読み、AにBを加える。
why: 不が打ち消すのは、Aという内容ではなく、Aだけに限ることである。限定か、その限定を広げる文かを見る。
:::

:::mistake
wrong: 文末に耳がないので、唯・惟・但を訳に表さない。
right: 上の副詞だけでも、何を「だけ」と限るかを訳に表す。
why: 上下の字が必ずそろうわけではない。書き下しに「のみ」を補う場合もある。
:::

最初は聞こえるものを人の声に限る。次は仁者を取り立てる。最後は但と文末の爾を組み合わせ、手が慣れているだけだと述べる。

:::example
id: gentei-tada
:::

:::example
id: rongo-tadajinsha
:::

:::example
id: baiyu-nomi
:::

:::section
anchor: gentei-nomi
title: 耳・爾・而已の「のみ」
codes:
  - gentei-nomi
  - kbn.kuho.gentei-nomi
:::

文末の耳・爾などを「のみ」と読み、前の内容に範囲を限る。上に唯・惟がなくても、文末だけで限定を表す。

:::table
caption: 文末の限定の形
source: kanbun/kuho.json gentei-nomi・qa/questions.json kbn.kuho.gentei-nomiをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A耳・A爾 | Aのみ・Aするのみ | Aだけである。Aするだけである。
  - A而已・A而已矣 | Aのみ・Aするのみ | Aだけである。Aするだけである。
:::

:::contrast
left: 文末の耳・爾・而已は、「のみ」と読んで範囲を限る。
right: 動作の前の已は「已に」、動詞の已は「已む」と読む場合がある。
why: 而已の二字を、接続の而と「すでに」の已に分けない。文中の位置と、どこまでを限るかを確かめる。
:::

:::mistake
wrong: 文末の耳を、読まない置き字として落とす。
right: 「のみ」と読み、書き下しではひらがなにする。
why: 「のみ」を落とすと、限られた内容であることが伝わらない。「耳」と漢字のまま残して「みみ」と読むのでもない。
:::

最初は耳、次は而已、最後は爾の例である。前のどの内容を「だけ」と限っているかを見比べる。

:::example
id: kenro-nomi
:::

:::example
id: mq-mukei-nomi
:::

:::example
id: baiyu-warehata
:::

:::section
anchor: gentei-ruika
title: 累加
codes:
  - gentei-ruika
  - kbn.kuho.gentei-ruika
:::

累加では、Aだけに限ることを打ち消し、Bもそうであると加える。前半の否定語と、後半の亦・又をつないで読む。

:::table
caption: 限定を広げる形
source: kanbun/kuho.json gentei-ruika・qa/questions.json kbn.kuho.gentei-ruikaをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 不唯A亦B・不惟A亦B | 唯だにAのみならず、亦たB・惟だにAのみならず、亦たB | Aだけでなく、Bもそうである。
  - 非徒A而又B | 徒だAのみにあらず、而も又たB | Aだけでなく、そのうえBでもある。
  - 非独A、亦B | 独りAのみに非ず、亦たB | Aだけでなく、Bもそうである。
:::

:::contrast
left: 唯A耳は、Aだけであると述べる限定である。
right: 不唯A亦Bは、Aに加えてBも成り立つと述べる累加である。
why: 否定されるのは「Aだけ」という範囲である。Aの内容を打ち消してBに置き換える文ではない。
:::

:::mistake
wrong: 不唯Aを「Aではなく」と訳し、Aを否定する。
right: 「Aだけでなく」と訳し、AとBの両方を述べる。
why: 「だけ」の否定と、内容そのものの否定を区別する。後ろで何が加えられるかまで確かめる。
:::

最初は役に立たないことに加えて害もあると述べる。次は政だけでなく、その姉もまたすぐれた人物だと述べる。読みの細部が違っても、限定を否定して後ろを加える関係は共通する。

:::example
id: gentei-ruika
:::

:::example
id: shiki-hitorisei
:::

:::section
anchor: gentei-sugizu
title: 不過の「過ぎず」
codes:
  - gentei-sugizu
  - kbn.kuho.gentei-sugizu
:::

不過は「〜に過ぎず」と読み、それ以上ではないと範囲を限る。数量だけでなく、物事の内容や程度を限る場合もある。

:::table
caption: 上限を示す形
source: kanbun/kuho.json gentei-sugizu・qa/questions.json kbn.kuho.gentei-sugizuをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - 不過A | Aに過ぎず | A以上ではない。Aだけである。
  - 不過A也 | Aに過ぎざるなり | Aに過ぎないのである。
:::

:::contrast
left: 不過Aは「Aに過ぎず」と読み、内容や量がAを超えないことを表す。
right: 莫過Aは「Aに過ぐるは莫し」と読み、Aを超えるものがないという最上を表す。
why: 不は過ぎることを打ち消し、莫は超えるものの存在を打ち消す。同じ過の字でも、否定されるものが違う。
:::

:::mistake
wrong: 不過を、過失を表す「過ちがない」という意味で取る。
right: この形では過を「すぐ」と読み、「それ以上ではない」と訳す。
why: どの語が範囲の上限になるかを見る。過の一字の別の意味を、形を確かめずに当てはめない。
:::

最初は、鳥が使う枝の数を一本に限る。次は、学問を科挙に受かる手段に限る言い方である。数量と内容の違いを見比べる。

:::example
id: soshi-shoryo
:::

:::example
id: mq-gozasso-madoi
:::

:::section
anchor: yokuyo-iwanya
title: 且・況の抑揚
codes:
  - yokuyo-iwanya
  - kbn.kuho.yokuyo-iwanya
:::

「Aでさえそうなのだから、ましてCはなおさらだ」と、二つの事柄をつなぐ。後半に省かれた動作や判断があれば、前半から補って取る。

:::table
caption: 前提から強い結論へ進む形
source: kanbun/kuho.json yokuyo-iwanya・qa/questions.json kbn.kuho.yokuyo-iwanyaをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A且B、況C乎 | Aすら且つB、況んやCをや | AでさえBなのだから、ましてCはなおさらである。
  - A、而況C乎 | A、而るを況んやCをや、など | Aなのだから、ましてCはなおさらである。
:::

:::contrast
left: 且には「かつ」と、事柄を加える読みがある。
right: 且と況がつながる抑揚では、「すら」「でさえ」という前提を取り、後ろを「まして」と強める。
why: 且だけを見て決めず、後ろの況と、二つの事柄の程度の関係を見る。且がない抑揚の文もある。
:::

:::mistake
wrong: 「況んやCをや」を、Cも同じだという並列だけで訳す。
right: 前半がそうである以上、Cならなおさらそうであると訳す。
why: 前半は後半を強める根拠になる。後半に動詞がなくても、前半の肯定・否定を含む内容を補って読む。
:::

最初は死んだ馬から生きた馬へ話を進める。次は二つの始まりさえ認められないのだから、十数の始まりはなおさら認められないという文である。

:::example
id: senju-shiba
:::

:::example
id: mq-gozasso-iwanya
:::

:::section
anchor: yokuyo-nao
title: 猶・尚と況の抑揚
codes:
  - yokuyo-nao
  - kbn.kuho.yokuyo-nao
:::

抑揚の前半に猶・尚を使うときは、「なほ」と一度読む。「AでさえなおBだ」と認めたうえで、後半を「まして」と強める。

:::table
caption: なほといはんやをつなぐ形
source: kanbun/kuho.json yokuyo-nao・kanbun/texts.jsonをもとに作成
head:
  - 白文の型
  - 書き下しの形
  - 意味
rows:
  - A猶B、況C乎 | Aすら猶ほB、況んやCをや | AでさえなおBなのだから、ましてCはなおさらである。
  - A尚B、況C乎 | Aすら尚ほB、況んやCをや | AでさえなおBなのだから、ましてCはなおさらである。
:::

:::contrast
left: 比況の猶は、再読して「なほ〜のごとし」と読み、たとえを表す。
right: 抑揚の猶は、「なほ」と一度だけ読み、後ろの況とつながる。
why: 同じ猶でも読み方が違う。抑揚の文末に、比況の「ごとし」を勝手に補わない。
:::

:::mistake
wrong: 前半が「できない」「しない」でも、後半だけ肯定に変えて訳す。
right: 前半の否定を受け、「ましてCはなおさらできない・しない」と取る。
why: 抑揚は前半の判断を後半へ強める。何がいっそう成り立つのかを、否定の範囲も含めて確かめる。
:::

最初は普通の人と将軍・大臣、次は蔓草と君主の弟、最後は庶民の交わりと大国を比べる。とくに後の二つでは、前半の否定が後半にも続くことを確かめる。

:::example
id: shiki-yojin
:::

:::example
id: saden-mansou
:::

:::example
id: kanpeki-fui
:::
