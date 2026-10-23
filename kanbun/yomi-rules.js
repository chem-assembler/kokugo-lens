'use strict';
// 歴史的仮名づかいと熟語の検査。判定できない形は候補として返す。
// 相は例解漢和辞典第4版 p.705、道は同 p.978、ほかは指示書Aと既存の同字例。
const HISTORICAL = {
  相: ['あひ', 'さう', 'しやう'],
  自: ['', 'おのづか', 'みづか', 'より'],
  道: ['い', 'だう', 'みち'],
  臥: ['ぐわ', 'が']
};
// 一字に複数の訓がある場合は、確認した音・語形だけを照合する。
// 上p.14、小p.316、少p.318、常p.343、江p.579、忠p.390、中p.26、
// 高p.1085、長p.1018、光p.101は例解漢和辞典第4版でも照合した。
// それ以外は texts.json 内の同字・同じ読みの歴史的表記と照合した。
const SPELLINGS = {
  上: [['じょう','じやう'], ['うえ','うへ']], 小: [['しょう','せう']],
  少: [['しょう','せう']], 常: [['じょう','じやう']], 江: [['こう','かう']],
  忠: [['ちゅう','ちう']], 中: [['ちゅう','ちう']], 高: [['こう','かう']],
  長: [['ちょう','ちやう']], 光: [['こう','くわう']], 鳥: [['ちょう','てう']],
  老: [['ろう','らう']], 郷: [['きょう','きやう']], 葉: [['よう','えふ']],
  牛: [['ぎゅう','ぎう']], 趙: [['ちょう','てう']], 流: [['りゅう','りう']],
  十: [['じゅう','じふ']], 急: [['きゅう','きふ']], 労: [['ろう','らう']],
  刀: [['とう','たう']], 良: [['りょう','りやう']], 宵: [['しょう','せう']],
  堂: [['どう','だう']], 亡: [['ぼう','ばう']], 草: [['そう','さう']],
  堯: [['ぎょう','げう']], 両: [['りょう','りやう']], 孟: [['もう','まう']],
  九: [['きゅう','きう']], 衆: [['しゅう','しう']], 舟: [['しゅう','しう']],
  朽: [['きゅう','きう']], 浩: [['こう','かう']], 鮑: [['ほう','はう']],
  桃: [['とう','たう']], 黄: [['こう','くわう']]
};
const hira = s => String(s || '').replace(/[ァ-ヶ]/g,
  c => String.fromCharCode(c.charCodeAt(0) - 0x60));
// 拗音の大小だけはそろえる。新旧仮名づかいの正規化はしない。
const large = s => hira(s).replace(/[ゃゅょ]/g, c => ({ゃ:'や',ゅ:'ゆ',ょ:'よ'})[c]);
const MODERN = /あい|みずか|おのずか|ぐあ|[ゅょ]う|[ちじし]よう|[こごそぞとどのほぼぽもよろ]う/;
const COMPOUNDS = {
  如何:'いかん', 何如:'いかん', 奈何:'いかん', 所以:'ゆゑん',
  嗟夫:'ああ', 孰与:'いづれ', 孰若:'いづれ', 所謂:'いはゆる'
};

function checkReadings(problems){
  const errors = [], candidates = [];
  function candidate(p, i, field, value, reason){
    candidates.push({id:p.id, index:i, c:p.tokens[i].c, field, value, reason});
  }
  for (const p of problems){
    p.tokens.forEach((t, i) => {
      if (t.role === 'placed') return;
      const pairs = t.reread
        ? [['first', t.reread.first], ['second', t.reread.second]].filter(([,r]) => r)
        : [['', t]];
      for (const [side, r] of pairs){
        for (const field of ['yomi', 'okuri']){
          const value = hira(r[field]);
          const known = HISTORICAL[t.c];
          const wrong = (SPELLINGS[t.c] || []).find(([from]) =>
            field === 'yomi' ? large(value) === large(from) : large(value).includes(large(from)));
          if (wrong){
            errors.push(p.id + ' [' + i + ']「' + t.c + '」' + side + ': ' + field + '「' + value + '」は歴史的仮名づかい「' + wrong[1] + '」と照合');
            continue;
          }
          if (field === 'yomi' && known){
            if (!known.some(v => large(v) === large(value)))
              errors.push(p.id + ' [' + i + ']「' + t.c + '」' + side + ': 歴史的仮名づかい yomi「' + value + '」を確認（表: ' + known.join('・') + '）');
          } else if (MODERN.test(value)) candidate(p, i, (side ? side + '.' : '') + field, value,
            '現代仮名づかいらしい形。字・用法による確認が必要');
        }
      }
    });
    for (let i = 0; i < p.tokens.length - 1; i++){
      const a = p.tokens[i], b = p.tokens[i + 1], word = a.c + b.c;
      const stem = COMPOUNDS[word];
      if (!stem && !['以為', '是以', '於是'].includes(word)) continue;
      // 所以の末字と次の為は別の熟語として二重に扱わない。
      if (word === '以為' && i > 0 && p.tokens[i - 1].c === '所') continue;
      const full = hira((a.yomi || '') + (a.okuri || '') + (b.yomi || '') + (b.okuri || ''));
      const pos = p.order.indexOf(i);
      if (!stem || pos < 0 || p.order[pos + 1] !== i + 1 || a.reread || b.reread){
        candidate(p, i, '熟語 ' + word, full,
          '一続きの熟字訓か、分けて読む用法かを読み順・文意から確認');
        continue;
      }
      // 本体を末字の活用・助詞から分け、重複と欠落を検出する。
      const gotStem = hira((a.yomi || '') + (a.okuri || '') + (b.yomi || ''));
      if (large(gotStem) !== large(stem))
        errors.push(p.id + ' [' + i + ']「' + word + '」: 二字の読み「' + full + '」が「' + stem + hira(b.okuri) + '」と一致しない');
    }
  }
  return {errors, candidates};
}
module.exports = {checkReadings};
